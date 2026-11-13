from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from models.experiment import utcnow


class Topology(Base):
    __tablename__ = "topologies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class TopologyNode(Base):
    __tablename__ = "topology_nodes"
    topology_id: Mapped[int] = mapped_column(ForeignKey("topologies.id"), primary_key=True)
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    label: Mapped[str] = mapped_column(String(60))
    kind: Mapped[str] = mapped_column(String(10))
    x: Mapped[float] = mapped_column(Float, default=0.0)
    y: Mapped[float] = mapped_column(Float, default=0.0)


class TopologyLink(Base):
    __tablename__ = "topology_links"
    id: Mapped[int] = mapped_column(primary_key=True)
    topology_id: Mapped[int] = mapped_column(ForeignKey("topologies.id"), index=True)
    source: Mapped[str] = mapped_column(String(40))
    target: Mapped[str] = mapped_column(String(40))
    latency_ms: Mapped[float] = mapped_column(Float, default=1.0)
    loss_pct: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(4), default="up")
