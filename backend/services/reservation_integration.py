"""既存店舗予約システム連携アダプター

PitLink は空き枠を既存予約DB/APIから取得し、
ダイナミックプライシング適用後に予約を書き戻します。
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

import httpx
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models import Customer, Reservation, ServiceType

logger = logging.getLogger(__name__)

SLOT_HOURS = [10, 12, 14, 16, 18]
WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"]


def _slot_datetime(day_offset: int, slot_index: int, base: datetime | None = None) -> datetime:
    base = base or datetime.now()
    monday = base - timedelta(days=base.weekday())
    target_day = monday + timedelta(days=day_offset)
    hour = SLOT_HOURS[slot_index]
    return target_day.replace(hour=hour, minute=0, second=0, microsecond=0)


def _slot_key(day: int, slot: int) -> str:
    return f"{day}-{slot}"


async def _fetch_external_availability(week_start: datetime) -> list[dict] | None:
    """外部予約APIが設定されていれば空き状況を取得"""
    url = settings.RESERVATION_API_URL.strip()
    if not url:
        return None
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{url.rstrip('/')}/availability",
                params={"week_start": week_start.date().isoformat()},
                headers={"Authorization": f"Bearer {settings.RESERVATION_API_KEY}"}
                if settings.RESERVATION_API_KEY
                else {},
                timeout=10.0,
            )
            res.raise_for_status()
            data = res.json()
            return data.get("slots") if isinstance(data, dict) else data
    except Exception as exc:
        logger.warning("外部予約API取得失敗（ローカルDBにフォールバック）: %s", exc)
        return None


async def get_availability(db: AsyncSession, weeks_ahead: int = 0) -> dict[str, Any]:
    """今週の全枠と空き状況を返す（既存予約システム = DB + 任意の外部API）"""
    now = datetime.now()
    week_start = now - timedelta(days=now.weekday()) + timedelta(weeks=weeks_ahead)
    external = await _fetch_external_availability(week_start)

    booked_keys: set[str] = set()
    if external:
        for row in external:
            if row.get("status") == "booked":
                booked_keys.add(row.get("key") or _slot_key(row["day"], row["slot"]))
    else:
        window_start = week_start
        window_end = week_start + timedelta(days=7)
        stmt = select(Reservation).where(
            and_(
                Reservation.reservation_datetime >= window_start,
                Reservation.reservation_datetime < window_end,
                Reservation.status != "cancelled",
            )
        )
        result = await db.execute(stmt)
        for res in result.scalars().all():
            dt = res.reservation_datetime
            day = dt.weekday()
            hour = dt.hour
            if hour in SLOT_HOURS:
                booked_keys.add(_slot_key(day, SLOT_HOURS.index(hour)))

    slots: list[dict] = []
    for day in range(7):
        for slot_idx, hour in enumerate(SLOT_HOURS):
            key = _slot_key(day, slot_idx)
            is_weekend = day >= 5
            status = "closed" if is_weekend else ("booked" if key in booked_keys else "available")
            slots.append(
                {
                    "key": key,
                    "day": day,
                    "slot": slot_idx,
                    "hour": hour,
                    "time_label": f"{hour:02d}:00",
                    "weekday_label": WEEKDAY_LABELS[day],
                    "datetime": _slot_datetime(day, slot_idx, week_start).isoformat(),
                    "status": status,
                    "bookable": status == "available",
                }
            )

    available_count = sum(1 for s in slots if s["bookable"])
    return {
        "system_name": settings.RESERVATION_SYSTEM_NAME,
        "connected": True,
        "external_api": bool(settings.RESERVATION_API_URL.strip()),
        "week_start": week_start.date().isoformat(),
        "slots": slots,
        "available_count": available_count,
        "booked_count": sum(1 for s in slots if s["status"] == "booked"),
    }


async def _push_external_booking(payload: dict) -> bool:
    url = settings.RESERVATION_API_URL.strip()
    if not url:
        return True
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{url.rstrip('/')}/bookings",
                json=payload,
                headers={"Authorization": f"Bearer {settings.RESERVATION_API_KEY}"}
                if settings.RESERVATION_API_KEY
                else {},
                timeout=15.0,
            )
            res.raise_for_status()
            return True
    except Exception as exc:
        logger.error("外部予約API書き込み失敗: %s", exc)
        return False


async def create_booking(
    db: AsyncSession,
    *,
    day: int,
    slot: int,
    customer_external_id: Optional[str] = None,
    customer_name: str = "ゲスト",
    service_type: ServiceType = ServiceType.OIL_CHANGE,
    discount_percent: int = 0,
    notes: str = "",
) -> dict[str, Any]:
    """空き枠に予約を作成し、既存システム（DB + 外部API）へ反映"""
    if day >= 5:
        return {"success": False, "error": "weekend_closed"}
    if slot < 0 or slot >= len(SLOT_HOURS):
        return {"success": False, "error": "invalid_slot"}

    availability = await get_availability(db)
    key = _slot_key(day, slot)
    slot_info = next((s for s in availability["slots"] if s["key"] == key), None)
    if not slot_info or not slot_info["bookable"]:
        return {"success": False, "error": "slot_unavailable", "key": key}

    dt = datetime.fromisoformat(slot_info["datetime"])
    customer_id: int | None = None
    if customer_external_id:
        stmt = select(Customer).where(Customer.external_id == customer_external_id)
        result = await db.execute(stmt)
        customer = result.scalar_one_or_none()
        if customer:
            customer_id = customer.id

    reservation = Reservation(
        customer_id=customer_id,
        reservation_datetime=dt,
        service_type=service_type,
        status="confirmed",
    )
    db.add(reservation)
    await db.flush()

    external_ok = await _push_external_booking(
        {
            "datetime": dt.isoformat(),
            "customer_external_id": customer_external_id,
            "customer_name": customer_name,
            "service_type": service_type.value,
            "discount_percent": discount_percent,
            "notes": notes,
            "pitlink_reservation_id": reservation.id,
        }
    )

    await db.commit()

    return {
        "success": True,
        "reservation_id": reservation.id,
        "key": key,
        "datetime": dt.isoformat(),
        "weekday_label": WEEKDAY_LABELS[day],
        "time_label": slot_info["time_label"],
        "external_synced": external_ok,
        "message": f"{WEEKDAY_LABELS[day]}曜 {slot_info['time_label']} で予約を確定しました",
    }
