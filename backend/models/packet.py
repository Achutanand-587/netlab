from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from models.experiment import utcnow


class Capture(Base):
    __tablename__ = "captures"
    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(120))
    source: Mapped[str] = mapped_column(String(20))  # "upload" | "sample"
    size_bytes: Mapped[int] = mapped_column(Integer)
    packet_count: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Packet(Base):
    __tablename__ = "packets"
    __table_args__ = (Index("ix_packets_capture_idx", "capture_id", "idx"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    capture_id: Mapped[int] = mapped_column(ForeignKey("captures.id"), index=True)
    idx: Mapped[int] = mapped_column(Integer)
    timestamp: Mapped[float] = mapped_column(Float)
    src_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    dst_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    protocol: Mapped[str] = mapped_column(String(16), index=True)
    length: Mapped[int] = mapped_column(Integer)
    src_port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dst_port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tcp_flags: Mapped[str | None] = mapped_column(String(12), nullable=True)
    status: Mapped[str] = mapped_column(String(16))
    ttl: Mapped[int | None] = mapped_column(Integer, nullable=True)
    info: Mapped[str] = mapped_column(String(200), default="")
    headers: Mapped[dict] = mapped_column(JSON, default=dict)
