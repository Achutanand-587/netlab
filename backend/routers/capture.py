import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from errors import AppError
from schemas.capture import (
    CaptureStartRequest,
    CaptureStartResponse,
    CaptureStatusResponse,
    CaptureStopResponse,
    InterfaceOut,
)
from services.capture_engine import engine, get_interfaces

router = APIRouter(prefix="/capture", tags=["live capture"])


@router.get("/interfaces", response_model=list[InterfaceOut])
async def list_interfaces() -> list[dict]:
    """Lists available network interfaces (Wi-Fi, Ethernet, Loopback) on the host."""
    return await run_in_threadpool(get_interfaces)


@router.post("/start", response_model=CaptureStartResponse, status_code=201)
def start_capture(req: CaptureStartRequest) -> dict:
    """Starts live packet capture on the specified network interface with optional BPF filter."""
    return engine.start_capture(
        interface=req.interface,
        bpf_filter=req.bpf_filter,
        packet_limit=req.packet_limit,
    )


@router.post("/stop", response_model=CaptureStopResponse)
def stop_active_capture() -> dict:
    """Stops the currently running live packet capture session."""
    return engine.stop_capture()


@router.post("/{session_id}/stop", response_model=CaptureStopResponse)
def stop_session_capture(session_id: str) -> dict:
    """Stops a specific live packet capture session."""
    return engine.stop_capture(session_id)


@router.get("/status", response_model=CaptureStatusResponse)
def get_current_status() -> dict:
    """Gets real-time statistics and running state of the active capture session."""
    return engine.get_status()


@router.get("/status/{session_id}", response_model=CaptureStatusResponse)
def get_session_status(session_id: str) -> dict:
    """Gets status of a specific capture session."""
    return engine.get_status(session_id)


@router.websocket("/ws/{session_id}")
@router.websocket("/ws/capture/{session_id}")
async def websocket_capture_stream(websocket: WebSocket, session_id: str):
    """Streams live captured packet metadata to connected WebSocket clients in real time."""
    await websocket.accept()

    session = engine.active_session
    if not session or session.session_id != session_id:
        await websocket.send_json({
            "type": "status",
            "status": "error",
            "message": f"Capture session '{session_id}' not found or inactive.",
        })
        await websocket.close()
        return

    loop = asyncio.get_running_loop()
    queue = asyncio.Queue(maxsize=1000)
    session.add_subscriber(loop, queue)

    try:
        await websocket.send_json({
            "type": "status",
            "status": "connected",
            "session_id": session_id,
            "interface": session.interface,
            "packet_count": session.packet_count,
        })

        while True:
            msg = await queue.get()
            await websocket.send_json(msg)
            # If the session reported stopped, break after delivering the message
            if msg.get("type") == "status" and msg.get("status") == "stopped":
                break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        session.remove_subscriber(queue)
