import asyncio
import time

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from database import get_db
from schemas.bandwidth import (
    AnalyzeRequest,
    LiveInterfaceOut,
    LiveStartRequest,
    LiveStatusResponse,
    Sample,
    SimulateExperimentRequest,
)
from services import bandwidth as svc

router = APIRouter(prefix="/bandwidth", tags=["bandwidth"])


# ---------------------------------------------------------------------------
# 1. Existing Endpoints (Preserved for backwards compatibility)
# ---------------------------------------------------------------------------

@router.get("")
@router.get("/simulated")
def simulated(range: str = "1h", seed: int | None = Query(default=None, ge=0, le=2**31)) -> dict:
    """SIMULATED series (no real telemetry source exists). Always labelled simulated=true."""
    return svc.simulate(range, seed if seed is not None else int(time.time()) // 60)


@router.post("/analyze")
def analyze(req: AnalyzeRequest) -> dict:
    out = svc.analyze([s.model_dump() for s in req.samples], req.interval_seconds)
    return {"source": "input", "simulated": False, **out}


@router.get("/captures/{capture_id}")
def from_capture(
    capture_id: int,
    interval_seconds: float = Query(default=1.0, ge=0.001, le=3600),
    db: Session = Depends(get_db),
) -> dict:
    """Real throughput computed from an uploaded capture file."""
    return svc.analyze_pcap_bandwidth(db, capture_id, interval_seconds)


# ---------------------------------------------------------------------------
# 2. LIVE Network Monitoring
# ---------------------------------------------------------------------------

@router.get("/live/interfaces", response_model=list[LiveInterfaceOut])
async def list_live_interfaces() -> list[dict]:
    """Lists host network interfaces with current I/O counters and connection status."""
    return await run_in_threadpool(svc.get_live_interfaces)


@router.post("/live/start", response_model=LiveStatusResponse)
def start_live_monitoring(req: LiveStartRequest) -> dict:
    """Starts real-time host network interface bandwidth monitoring."""
    return svc.live_monitor.start(req.interface)


@router.post("/live/stop", response_model=LiveStatusResponse)
def stop_live_monitoring() -> dict:
    """Stops the active live network interface bandwidth monitoring session."""
    return svc.live_monitor.stop()


@router.get("/live/status", response_model=LiveStatusResponse)
def get_live_monitoring_status() -> dict:
    """Gets the current status and latest metrics of the live monitoring session."""
    return svc.live_monitor.get_status()


@router.websocket("/ws/live")
@router.websocket("/live/ws")
async def websocket_live_bandwidth(websocket: WebSocket):
    """Streams real-time per-second interface bandwidth metrics to connected clients."""
    await websocket.accept()

    loop = asyncio.get_running_loop()
    queue = asyncio.Queue(maxsize=100)
    svc.live_monitor.add_subscriber(loop, queue)

    try:
        # Send initial status
        await websocket.send_json({
            "type": "status",
            "status": "connected",
            **svc.live_monitor.get_status(),
        })

        while True:
            msg = await queue.get()
            await websocket.send_json(msg)
            if msg.get("type") == "status" and msg.get("status") == "stopped":
                break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        svc.live_monitor.remove_subscriber(queue)


# ---------------------------------------------------------------------------
# 3. VIRTUAL Bandwidth Experiment Simulation
# ---------------------------------------------------------------------------

@router.post("/experiment")
def run_experiment(req: SimulateExperimentRequest) -> dict:
    """Simulates realistic network data transfer throughput under specified latency, hops, and protocol."""
    return svc.simulate_experiment(
        link_bandwidth_mbps=req.link_bandwidth_mbps,
        latency_ms=req.latency_ms,
        router_hops=req.router_hops,
        protocol=req.protocol,
        transfer_size_mb=req.transfer_size_mb,
        packet_loss_pct=req.packet_loss_pct,
    )


# ---------------------------------------------------------------------------
# 4. IMPORTED PCAP Bandwidth Analysis
# ---------------------------------------------------------------------------

@router.get("/captures/{capture_id}/analysis")
def analyze_capture(
    capture_id: int,
    interval_seconds: float = Query(default=1.0, ge=0.001, le=3600),
    db: Session = Depends(get_db),
) -> dict:
    """Performs comprehensive bandwidth analysis on an uploaded PCAP capture."""
    return svc.analyze_pcap_bandwidth(db, capture_id, interval_seconds)
