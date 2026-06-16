"""
ダイナミックプライシングエンジン
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models import Customer, DynamicPrice, Reservation, ServiceType, Visit

logger = logging.getLogger(__name__)


class DynamicPricingEngine:
    """
    AI/ML による価格最適化
    - アイドルタイム検出
    - 需要予測
    - 顧客セグメント別最適価格
    """

    async def calculate_optimal_price(
        self,
        db: AsyncSession,
        service_type: ServiceType,
        reservation_datetime: datetime,
        customer_id: Optional[int] = None,
        new_customer: bool = False,
    ) -> Decimal:
        base_multiplier = 1.0
        hour = reservation_datetime.hour
        day = reservation_datetime.weekday()

        stmt = select(DynamicPrice).where(
            and_(
                DynamicPrice.service_type == service_type,
                DynamicPrice.is_active.is_(True),
                or_(DynamicPrice.hour_of_day == hour, DynamicPrice.hour_of_day.is_(None)),
                or_(DynamicPrice.day_of_week == day, DynamicPrice.day_of_week.is_(None)),
            )
        )
        result = await db.execute(stmt)
        prices = result.scalars().all()

        if prices:
            prices.sort(
                key=lambda p: (p.hour_of_day is not None, p.day_of_week is not None),
                reverse=True,
            )
            base_multiplier = prices[0].price_multiplier

        idle_discount = await self._calculate_idle_discount(db, reservation_datetime, new_customer)
        base_multiplier *= idle_discount

        demand_multiplier = await self._estimate_demand(db, reservation_datetime)
        base_multiplier *= demand_multiplier

        if customer_id:
            loyalty_discount = await self._calculate_loyalty_discount(db, customer_id)
            base_multiplier *= loyalty_discount

        multiplier = max(settings.PRICING_MIN_DISCOUNT, base_multiplier)
        multiplier = min(settings.PRICING_MAX_PREMIUM, multiplier)

        return Decimal(str(round(multiplier, 2)))

    async def _calculate_idle_discount(
        self,
        db: AsyncSession,
        reservation_datetime: datetime,
        new_customer: bool = False,
    ) -> float:
        hour = reservation_datetime.hour
        day = reservation_datetime.weekday()

        if day >= 5:
            return 1.0

        since = datetime.now() - timedelta(days=30)
        stmt = select(func.count(Visit.id)).where(
            and_(
                Visit.visit_date >= since,
                func.strftime("%H", Visit.visit_date) == f"{hour:02d}",
            )
        )
        result = await db.execute(stmt)
        visit_count = result.scalar() or 0

        # 平日アイドル + 新規客向け深い割引（10〜14時を最優先）
        if visit_count < 3:
            multiplier = settings.PRICING_IDLE_MULTIPLIER
            if new_customer or day <= 3:
                multiplier = min(multiplier, settings.PRICING_NEW_CUSTOMER_WEEKDAY_MULTIPLIER)
            if 10 <= hour <= 14 and day <= 3:
                multiplier = min(multiplier, settings.PRICING_NEW_CUSTOMER_WEEKDAY_MULTIPLIER)
            return multiplier
        return 1.0

    async def _estimate_demand(
        self,
        db: AsyncSession,
        reservation_datetime: datetime,
    ) -> float:
        window_start = reservation_datetime - timedelta(hours=1)
        window_end = reservation_datetime + timedelta(hours=1)

        stmt = select(func.count(Reservation.id)).where(
            and_(
                Reservation.reservation_datetime >= window_start,
                Reservation.reservation_datetime < window_end,
            )
        )
        result = await db.execute(stmt)
        booking_count = result.scalar() or 0

        if booking_count > 5:
            return settings.PRICING_PEAK_MULTIPLIER
        return 1.0

    async def _calculate_loyalty_discount(
        self,
        db: AsyncSession,
        customer_id: int,
    ) -> float:
        stmt = select(Customer).where(Customer.id == customer_id)
        result = await db.execute(stmt)
        customer = result.scalar_one_or_none()

        if not customer:
            return 1.0

        if customer.visit_count >= 20:
            return 0.92
        if customer.visit_count >= 10:
            return 0.95
        if customer.visit_count >= 5:
            return 0.97
        return 1.0

    async def suggest_eco_slots(
        self,
        db: AsyncSession,
        discount_percent: int = 20,
        new_customer_mode: bool = False,
    ) -> list[dict]:
        """平日アイドルタイムにエコ枠候補を返す（新規客獲得モード対応）"""
        slots = []
        hours = [10, 12, 14, 16, 18]
        for day in range(5):
            for hour in hours:
                dt = datetime.now().replace(hour=hour, minute=0, second=0, microsecond=0)
                dt = dt + timedelta(days=(day - dt.weekday()) % 7)
                multiplier = await self.calculate_optimal_price(
                    db, ServiceType.OIL_CHANGE, dt, new_customer=new_customer_mode
                )
                if float(multiplier) < 1.0:
                    slot_index = hours.index(hour)
                    effective_discount = discount_percent
                    if new_customer_mode and day <= 3:
                        effective_discount = min(50, discount_percent + 10)
                    slots.append(
                        {
                            "day": day,
                            "slot": slot_index,
                            "key": f"{day}-{slot_index}",
                            "discount_percent": effective_discount,
                            "multiplier": float(multiplier),
                            "new_customer_bonus": new_customer_mode and day <= 3,
                        }
                    )
        if new_customer_mode:
            slots.sort(key=lambda s: (not s.get("new_customer_bonus"), s["multiplier"]))
        return slots


class PriceOptimizationScheduler:
    """毎日の価格最適化実行"""

    def __init__(self):
        self.engine = DynamicPricingEngine()

    async def optimize_daily_prices(self, db: AsyncSession) -> Dict:
        try:
            results = {"updated": 0, "timestamp": datetime.now().isoformat()}

            for service_type in ServiceType:
                for hour in range(8, 21):
                    optimal_multiplier = await self.engine.calculate_optimal_price(
                        db,
                        service_type,
                        datetime.now().replace(hour=hour, minute=0, second=0, microsecond=0),
                    )

                    new_price = DynamicPrice(
                        service_type=service_type,
                        hour_of_day=hour,
                        day_of_week=None,
                        price_multiplier=float(optimal_multiplier),
                        effective_date=datetime.now(),
                        is_active=True,
                    )
                    db.add(new_price)
                    results["updated"] += 1

            await db.commit()
            logger.info("✅ %s 件の価格ルール更新完了", results["updated"])
            return results

        except Exception as e:
            logger.error("❌ 価格最適化エラー: %s", str(e))
            await db.rollback()
            return {"error": str(e)}


pricing_engine = DynamicPricingEngine()
price_scheduler = PriceOptimizationScheduler()
