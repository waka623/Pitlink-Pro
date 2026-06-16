"""Seed demo data aligned with frontend mock customers."""

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Customer, Reservation, ServiceType, Visit

MOCK_CUSTOMERS = [
    {
        "external_id": "C-1042",
        "full_name": "山田 太郎",
        "email": "yamada@example.com",
        "phone": "090-1234-5678",
        "car_model": "トヨタ プリウス",
        "visit_count": 12,
    },
    {
        "external_id": "C-1108",
        "full_name": "佐藤 美咲",
        "email": "sato@example.com",
        "phone": "080-9876-5432",
        "car_model": "ホンダ N-BOX",
        "visit_count": 3,
    },
    {
        "external_id": "C-1199",
        "full_name": "髙橋 健一",
        "email": "takahashi@example.com",
        "phone": "070-1111-2222",
        "car_model": "スバル フォレスター",
        "visit_count": 8,
    },
    {
        "external_id": "C-1245",
        "full_name": "中村 由香",
        "email": "nakamura@example.com",
        "phone": "090-3333-4444",
        "car_model": "ダイハツ タント",
        "visit_count": 6,
    },
]


async def seed_if_empty(db: AsyncSession) -> None:
    result = await db.execute(select(Customer.id).limit(1))
    if result.scalar_one_or_none() is not None:
        return

    now = datetime.now()
    customers: list[Customer] = []

    for row in MOCK_CUSTOMERS:
        customer = Customer(**row)
        db.add(customer)
        customers.append(customer)

    await db.flush()

    for i, customer in enumerate(customers):
        for offset in range(0, customer.visit_count, 3):
            visit = Visit(
                customer_id=customer.id,
                visit_date=now - timedelta(days=offset + i * 2, hours=14),
                service_menu="タイヤ交換",
                revenue_jpy=8800,
            )
            db.add(visit)

    # 既存予約システムの埋まり枠（デモ: 平日の一部が予約済み）
    monday = now - timedelta(days=now.weekday())
    booked_demo = [
        (0, 10), (0, 14), (1, 12), (2, 10), (2, 16), (3, 14), (4, 10), (4, 18),
    ]
    for day_offset, hour in booked_demo:
        dt = (monday + timedelta(days=day_offset)).replace(hour=hour, minute=0, second=0, microsecond=0)
        db.add(
            Reservation(
                customer_id=customers[day_offset % len(customers)].id,
                reservation_datetime=dt,
                service_type=ServiceType.OIL_CHANGE,
            )
        )

    await db.commit()
