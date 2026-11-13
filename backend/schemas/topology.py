from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Kind = Literal["pc", "router", "switch", "server", "hub"]
Ident = Field(pattern=r"^[A-Za-z0-9_-]{1,40}$")


class NodeCreate(BaseModel):
    id: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{1,40}$")
    label: str = Field(min_length=1, max_length=60)
    kind: Kind
    x: float = 0.0
    y: float = 0.0


class NodeUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=60)
    kind: Kind | None = None
    x: float | None = None
    y: float | None = None


class LinkCreate(BaseModel):
    source: str = Ident
    target: str = Ident
    latency_ms: float = Field(default=1.0, gt=0, le=10000)
    loss_pct: float = Field(default=0.0, ge=0, le=100)
    status: Literal["up", "down"] = "up"


class LinkUpdate(BaseModel):
    latency_ms: float | None = Field(default=None, gt=0, le=10000)
    loss_pct: float | None = Field(default=None, ge=0, le=100)
    status: Literal["up", "down"] | None = None


class TopologyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    nodes: list[NodeCreate] = Field(default_factory=list, max_length=200)
    links: list[LinkCreate] = Field(default_factory=list, max_length=1000)


class NodeOut(BaseModel):
    id: str
    label: str
    kind: Kind
    x: float
    y: float


class LinkOut(BaseModel):
    id: int
    source: str
    target: str
    latency_ms: float
    loss_pct: float
    status: str


class TopologyOut(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime
    updated_at: datetime
    nodes: list[NodeOut]
    links: list[LinkOut]


class TopologySummary(BaseModel):
    id: int
    name: str
    description: str
    updated_at: datetime


class GraphSimulation(BaseModel):
    """Stateless request used by the existing frontend: POST /topology/simulate."""

    nodes: list[NodeCreate] = Field(max_length=200)
    links: list[LinkCreate] = Field(max_length=1000)
    source: str = Ident
    target: str = Ident
    size_bytes: int = Field(default=64, ge=1, le=65535)
    protocol: str = Field(default="ICMP", max_length=16)
