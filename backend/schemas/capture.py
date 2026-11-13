from pydantic import BaseModel, Field


class InterfaceOut(BaseModel):
    id: str
    name: str
    description: str
    ip: str | None = None
    mac: str | None = None
    is_wireless: bool = False
    is_loopback: bool = False
    status: str = "ready"


class CaptureStartRequest(BaseModel):
    interface: str = Field(min_length=1, max_length=120, description="Network interface name or ID")
    bpf_filter: str | None = Field(default=None, max_length=200, description="Optional Berkeley Packet Filter (BPF) syntax")
    packet_limit: int = Field(default=5000, ge=1, le=50000, description="Maximum packets to capture before auto-stopping")


class CaptureStartResponse(BaseModel):
    session_id: str
    capture_id: int
    interface: str
    bpf_filter: str | None
    packet_limit: int
    status: str = "started"
    started_at: str


class CaptureStopResponse(BaseModel):
    session_id: str | None = None
    capture_id: int | None = None
    status: str = "stopped"
    packet_count: int = 0
    total_bytes: int = 0
    duration_seconds: float = 0.0
    message: str | None = None


class CaptureStatusResponse(BaseModel):
    is_running: bool
    session_id: str | None = None
    capture_id: int | None = None
    interface: str | None = None
    bpf_filter: str | None = None
    packet_count: int = 0
    total_bytes: int = 0
    duration_seconds: float = 0.0
    packet_limit: int = 5000
