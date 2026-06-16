"""OpenWeatherMap proxy — API key stays server-side."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from config import settings

logger = logging.getLogger(__name__)

FUKUI_WEATHER_AREAS = [
    {"name": "福井市", "lat": 36.0652, "lon": 136.2219},
    {"name": "鯖江市", "lat": 35.9564, "lon": 136.1849},
    {"name": "敦賀市", "lat": 35.6456, "lon": 136.0556},
    {"name": "越前市", "lat": 35.9034, "lon": 136.1667},
    {"name": "坂井市", "lat": 36.1667, "lon": 136.2333},
    {"name": "あわら市", "lat": 36.2111, "lon": 136.2292},
    {"name": "勝山市", "lat": 36.0656, "lon": 136.4878},
    {"name": "大野市", "lat": 35.9814, "lon": 136.4878},
]

SNOW_IDS = {600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622}

_cache: dict[str, Any] | None = None
_cache_expires: float = 0.0
CACHE_TTL_SEC = 180


def _parse_area(name: str, data: dict[str, Any]) -> dict[str, Any]:
    weather_id = data.get("weather", [{}])[0].get("id", 0)
    snow_1h = (data.get("snow") or {}).get("1h")
    has_snow = weather_id in SNOW_IDS or (snow_1h is not None and snow_1h > 0)
    temp = round(data["main"]["temp"])
    return {
        "name": name,
        "temp": temp,
        "humidity": data["main"]["humidity"],
        "status": data.get("weather", [{}])[0].get("description", "不明"),
        "isFreezing": temp < 2,
        "hasSnow": has_snow,
        "snowMm": round(snow_1h * 10) / 10 if snow_1h is not None else None,
        "weatherId": weather_id,
    }


def _build_payload(areas: list[dict[str, Any]]) -> dict[str, Any]:
    center = next((a for a in areas if a["name"] == "福井市"), areas[0])
    coldest = min(areas, key=lambda a: a["temp"])
    snow_areas = [a["name"] for a in areas if a["hasSnow"]]
    freezing_areas = [a["name"] for a in areas if a["isFreezing"]]
    regional_alert = any(a["isFreezing"] or a["hasSnow"] for a in areas)

    overview = f"福井市 {center['temp']}℃・{center['status']}。"
    if snow_areas:
        overview += f"降雪: {'・'.join(snow_areas)}。"
    elif freezing_areas:
        overview += f"凍結注意: {'・'.join(freezing_areas)}。"
    else:
        overview += f"県内最冷 {coldest['name']} {coldest['temp']}℃。"

    summary = (
        f"現在、福井エリア（福井市中心・県内主要8地点）は「{center['status']}」、"
        f"福井市の気温{center['temp']}℃"
    )
    if snow_areas:
        summary += f"。{'・'.join(snow_areas)}で降雪。積雪・路面滑りに十分ご注意ください。"
    elif regional_alert:
        summary += "。路面凍結の恐れがあり、走行には十分ご注意ください。"
    elif center["temp"] < 5:
        summary += "。気温低下に伴い、タイヤ性能が通常より低下しやすい状態です。"
    else:
        summary += "。今後の気温低下に備えた点検をおすすめします。"

    return {
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "center": center,
        "areas": areas,
        "summary": summary,
        "overview": overview,
        "temp": center["temp"],
        "humidity": center["humidity"],
        "status": center["status"],
        "isFreezing": center["isFreezing"],
        "hasSnow": center["hasSnow"] or bool(snow_areas),
        "snowMm": center["snowMm"],
        "weatherId": center["weatherId"],
        "regionalAlert": regional_alert,
        "coldestArea": {"name": coldest["name"], "temp": coldest["temp"]},
        "snowAreas": snow_areas,
    }


async def _fetch_area(client: httpx.AsyncClient, api_key: str, area: dict[str, Any]) -> dict[str, Any]:
    res = await client.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={
            "lat": area["lat"],
            "lon": area["lon"],
            "appid": api_key,
            "units": "metric",
            "lang": "ja",
        },
        timeout=15.0,
    )
    res.raise_for_status()
    return _parse_area(area["name"], res.json())


async def fetch_fukui_regional_weather() -> dict[str, Any] | None:
    global _cache, _cache_expires

    api_key = settings.WEATHER_API_KEY.strip()
    if not api_key:
        logger.error("WEATHER_API_KEY が設定されていません")
        return _cache

    now = asyncio.get_event_loop().time()
    if _cache and _cache_expires > now:
        return _cache

    try:
        async with httpx.AsyncClient() as client:
            areas = await asyncio.gather(
                *[_fetch_area(client, api_key, area) for area in FUKUI_WEATHER_AREAS]
            )
        payload = _build_payload(list(areas))
        _cache = payload
        _cache_expires = now + CACHE_TTL_SEC
        return payload
    except Exception as exc:
        logger.exception("気象データ取得エラー: %s", exc)
        return _cache
