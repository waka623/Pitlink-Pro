"""PitLink Pro FastAPI backend."""

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import SessionLocal, get_db, init_db
from models import ServiceType
from seed import seed_if_empty
from services.email_service import email_service
from services.line_service import line_service, register_line_link
from services.pricing_engine import price_scheduler, pricing_engine
from services.reservation_integration import create_booking, get_availability
from services.weather_service import fetch_fukui_regional_weather

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    async with SessionLocal() as db:
        await seed_if_empty(db)
    logger.info("PitLink backend ready")
    yield


app = FastAPI(title="PitLink Pro API", version="0.9.4", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EmailSendRequest(BaseModel):
    recipient_email: str
    subject: str
    body: str
    customer_id: int = 0


class BulkEmailRecipient(BaseModel):
    email: str
    name: str
    customer_id: int


class BulkEmailRequest(BaseModel):
    recipients: list[BulkEmailRecipient]
    subject: str
    body_template: str
    campaign_id: Optional[int] = None


class PricingCalculateRequest(BaseModel):
    service_type: ServiceType = ServiceType.OIL_CHANGE
    reservation_datetime: datetime
    customer_id: Optional[int] = None
    base_price_jpy: int = Field(default=4400, ge=0)


class IndividualMessage(BaseModel):
    customer_id: str
    customer_name: str
    channel: str  # "email" | "line"
    email: Optional[str] = None
    line_id: Optional[str] = None
    subject: Optional[str] = None
    email_body: Optional[str] = None
    line_body: Optional[str] = None


class DispatchRequest(BaseModel):
    messages: list[IndividualMessage]


class LineLinkRequest(BaseModel):
    customer_id: str
    line_user_id: str
    line_display_name: str


class CreateBookingRequest(BaseModel):
    day: int = Field(ge=0, le=6)
    slot: int = Field(ge=0, le=4)
    customer_external_id: Optional[str] = None
    customer_name: str = "ゲスト"
    service_type: ServiceType = ServiceType.OIL_CHANGE
    discount_percent: int = Field(default=0, ge=0, le=50)
    notes: str = ""


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "pitlink-pro-backend"}


@app.get("/api/weather")
async def get_weather():
    data = await fetch_fukui_regional_weather()
    if not data:
        return {"error": "weather_unavailable", "message": "気象データを取得できませんでした。"}
    return data


@app.post("/api/email/send")
async def send_email(payload: EmailSendRequest):
    ok = await email_service.send_email(
        recipient_email=payload.recipient_email,
        subject=payload.subject,
        body=payload.body,
        customer_id=payload.customer_id,
    )
    return {"success": ok}


@app.post("/api/email/bulk")
async def send_bulk_email(payload: BulkEmailRequest):
    results = await email_service.send_bulk_email(
        recipients=[r.model_dump() for r in payload.recipients],
        subject=payload.subject,
        body_template=payload.body_template,
        campaign_id=payload.campaign_id,
    )
    return results


@app.post("/api/pricing/calculate")
async def calculate_price(payload: PricingCalculateRequest, db: AsyncSession = Depends(get_db)):
    multiplier = await pricing_engine.calculate_optimal_price(
        db,
        payload.service_type,
        payload.reservation_datetime,
        payload.customer_id,
    )
    final_price = int(payload.base_price_jpy * float(multiplier))
    discount_percent = max(0, round((1 - float(multiplier)) * 100))
    return {
        "multiplier": float(multiplier),
        "base_price_jpy": payload.base_price_jpy,
        "final_price_jpy": final_price,
        "discount_percent": discount_percent,
    }


@app.post("/api/pricing/optimize-daily")
async def optimize_daily_prices(db: AsyncSession = Depends(get_db)):
    return await price_scheduler.optimize_daily_prices(db)


@app.get("/api/pricing/eco-slots")
async def get_eco_slots(discount: int = 20, new_customer: int = 0, db: AsyncSession = Depends(get_db)):
    slots = await pricing_engine.suggest_eco_slots(
        db, discount_percent=discount, new_customer_mode=bool(new_customer)
    )
    return {"slots": slots, "discount_percent": discount, "new_customer_mode": bool(new_customer)}


@app.post("/api/line/link")
async def link_line_account(payload: LineLinkRequest):
    record = register_line_link(
        payload.customer_id, payload.line_user_id, payload.line_display_name
    )
    return {"success": True, "link": record}


@app.get("/api/reservations/availability")
async def reservation_availability(db: AsyncSession = Depends(get_db)):
    """既存店舗予約システムから今週の空き枠を取得"""
    return await get_availability(db)


@app.post("/api/reservations/book")
async def reservation_book(payload: CreateBookingRequest, db: AsyncSession = Depends(get_db)):
    """空き枠に予約を作成（既存システムへ書き戻し）"""
    return await create_booking(
        db,
        day=payload.day,
        slot=payload.slot,
        customer_external_id=payload.customer_external_id,
        customer_name=payload.customer_name,
        service_type=payload.service_type,
        discount_percent=payload.discount_percent,
        notes=payload.notes,
    )


@app.post("/api/messages/dispatch")
async def dispatch_individual_messages(payload: DispatchRequest):
    """顧客ごとに個別文面をメールまたは公式LINEへ送信"""
    results = {"total": len(payload.messages), "success": 0, "failed": 0, "details": []}

    for msg in payload.messages:
        ok = False
        channel_used = msg.channel

        if msg.channel == "line" and msg.line_id and msg.line_body:
            ok = await line_service.send_message(msg.line_id, msg.line_body, msg.customer_id)
        elif msg.channel == "email" and msg.email and msg.subject and msg.email_body:
            ok = await email_service.send_email(
                recipient_email=msg.email,
                subject=msg.subject,
                body=msg.email_body,
                customer_id=0,
            )
        elif msg.line_id and msg.line_body:
            channel_used = "line"
            ok = await line_service.send_message(msg.line_id, msg.line_body, msg.customer_id)
        elif msg.email and msg.subject and msg.email_body:
            channel_used = "email"
            ok = await email_service.send_email(
                recipient_email=msg.email,
                subject=msg.subject,
                body=msg.email_body,
                customer_id=0,
            )

        if ok:
            results["success"] += 1
        else:
            results["failed"] += 1

        results["details"].append(
            {
                "customer_id": msg.customer_id,
                "customer_name": msg.customer_name,
                "channel": channel_used,
                "success": ok,
            }
        )

    logger.info("📨 個別送信完了: %s/%s", results["success"], results["total"])
    return results


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.API_HOST, port=settings.API_PORT, reload=True)
