"""SQLAlchemy models for PitLink Pro backend."""

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class ServiceType(str, enum.Enum):
    TIRE_CHANGE = "tire_change"
    OIL_CHANGE = "oil_change"
    INSPECTION = "inspection"
    ALIGNMENT = "alignment"


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(128))
    email: Mapped[str | None] = mapped_column(String(256))
    phone: Mapped[str | None] = mapped_column(String(32))
    car_model: Mapped[str] = mapped_column(String(128))
    visit_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    visits: Mapped[list["Visit"]] = relationship(back_populates="customer")
    reservations: Mapped[list["Reservation"]] = relationship(back_populates="customer")


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    visit_date: Mapped[datetime] = mapped_column(DateTime, index=True)
    service_menu: Mapped[str] = mapped_column(String(128))
    revenue_jpy: Mapped[int | None] = mapped_column(Integer)

    customer: Mapped["Customer"] = relationship(back_populates="visits")


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    reservation_datetime: Mapped[datetime] = mapped_column(DateTime, index=True)
    service_type: Mapped[ServiceType] = mapped_column(Enum(ServiceType))
    status: Mapped[str] = mapped_column(String(32), default="confirmed")

    customer: Mapped["Customer | None"] = relationship(back_populates="reservations")


class DynamicPrice(Base):
    __tablename__ = "dynamic_prices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    service_type: Mapped[ServiceType] = mapped_column(Enum(ServiceType))
    hour_of_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    effective_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class DailyAnalytics(Base):
    __tablename__ = "daily_analytics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[datetime] = mapped_column(DateTime, index=True)
    total_visits: Mapped[int] = mapped_column(Integer, default=0)
    total_revenue_jpy: Mapped[int] = mapped_column(Integer, default=0)
    idle_hours: Mapped[int] = mapped_column(Integer, default=0)
