from typing import Any, Literal
from pydantic import BaseModel, Field


class Sample(BaseModel):
    timestamp: float = Field(ge=0, description="Unix epoch seconds")
    bytes: int = Field(ge=0, le=10**12)
    packets: int = Field(default=1, ge=0, le=10**9)


class AnalyzeRequest(BaseModel):
    samples: list[Sample] = Field(min_length=1, max_length=100_000)
    interval_seconds: float = Field(default=1.0, ge=0.001, le=3600)


class LiveInterfaceOut(BaseModel):
    name: str
    description: str
    ip: str | None = None
    mac: str | None = None
    is_up: bool
    speed_mbps: int = 0
    mtu: int = 1500
    is_wireless: bool = False
    bytes_sent: int = 0
    bytes_recv: int = 0
    packets_sent: int = 0
    packets_recv: int = 0


class LiveStartRequest(BaseModel):
    interface: str = Field(min_length=1, max_length=120)


class LiveStatusResponse(BaseModel):
    active: bool
    session_id: str | None = None
    interface: str | None = None
    download_mbps: float = 0.0
    upload_mbps: float = 0.0
    total_recv_bytes: int = 0
    total_sent_bytes: int = 0
    avg_download_mbps: float = 0.0
    avg_upload_mbps: float = 0.0
    peak_download_mbps: float = 0.0
    peak_upload_mbps: float = 0.0
    duration_seconds: float = 0.0
    points: list[dict[str, Any]] = Field(default_factory=list)


class SimulateExperimentRequest(BaseModel):
    link_bandwidth_mbps: float = Field(default=100.0, ge=1.0, le=10000.0)
    latency_ms: float = Field(default=20.0, ge=0.1, le=2000.0)
    router_hops: int = Field(default=2, ge=1, le=20)
    protocol: Literal["TCP", "UDP"] = "TCP"
    transfer_size_mb: float = Field(default=10.0, ge=0.1, le=500.0)
    packet_loss_pct: float = Field(default=0.0, ge=0.0, le=50.0)
