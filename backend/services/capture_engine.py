import asyncio
import os
import re
import threading
import time
import uuid
from datetime import datetime, timezone

from config import settings
from database import SessionLocal
from errors import AppError
from models.packet import Capture, Packet
from services.packets import FLAG_NAMES, _load_layers, _summarize


def _clean_iface_name(name: str) -> str:
    base = re.sub(r"[^A-Za-z0-9._ -]", "_", name)[:60]
    return base or "interface"


def get_interfaces() -> list[dict]:
    """Discovers available network interfaces on the host (Wi-Fi, Ethernet, Virtual)."""
    _load_layers()
    from scapy.all import conf, get_working_ifaces

    interfaces = []
    seen = set()

    try:
        working = get_working_ifaces()
    except Exception:
        working = []

    for iface in working:
        name = getattr(iface, "name", "") or str(iface)
        if name in seen:
            continue
        desc = getattr(iface, "description", "") or name
        ip = getattr(iface, "ip", None) or ""
        mac = getattr(iface, "mac", None) or ""
        is_wireless = any(w in desc.lower() or w in name.lower() for w in ("wi-fi", "wifi", "wireless", "802.11"))
        is_loop = getattr(iface, "loopback", False) or "loopback" in desc.lower()

        # Status heuristic: has a non-APIPA IPv4 address -> UP
        status = "up" if (ip and not ip.startswith("169.254")) else "ready"

        interfaces.append({
            "id": name,
            "name": name,
            "description": desc,
            "ip": ip if ip else None,
            "mac": mac if mac else None,
            "is_wireless": is_wireless,
            "is_loopback": is_loop,
            "status": status,
        })
        seen.add(name)

    # Fallback to conf.ifaces if get_working_ifaces missed anything
    try:
        for k, iface in conf.ifaces.items():
            name = getattr(iface, "name", "") or str(iface)
            if not name or name in seen:
                continue
            desc = getattr(iface, "description", "") or name
            ip = getattr(iface, "ip", None) or ""
            mac = getattr(iface, "mac", None) or ""
            is_wireless = any(w in desc.lower() or w in name.lower() for w in ("wi-fi", "wifi", "wireless", "802.11"))
            is_loop = getattr(iface, "loopback", False) or "loopback" in desc.lower()
            status = "up" if (ip and not ip.startswith("169.254")) else "ready"

            interfaces.append({
                "id": name,
                "name": name,
                "description": desc,
                "ip": ip if ip else None,
                "mac": mac if mac else None,
                "is_wireless": is_wireless,
                "is_loopback": is_loop,
                "status": status,
            })
            seen.add(name)
    except Exception:
        pass

    return interfaces


class LiveCaptureSession:
    def __init__(self, session_id: str, capture_id: int, interface: str, bpf_filter: str | None, packet_limit: int, duration_seconds: int):
        self.session_id = session_id
        self.capture_id = capture_id
        self.interface = interface
        self.bpf_filter = bpf_filter
        self.packet_limit = packet_limit
        self.duration_seconds = duration_seconds

        self.start_time = time.time()
        self.packet_count = 0
        self.byte_count = 0
        self.is_running = False

        self.sniffer = None
        self._lock = threading.Lock()
        self._db_buffer: list[dict] = []
        self._last_flush = time.time()

        # Set of active WebSocket subscriber queues: (asyncio.AbstractEventLoop, asyncio.Queue)
        self.subscribers: set[tuple[asyncio.AbstractEventLoop, asyncio.Queue]] = set()

    def add_subscriber(self, loop: asyncio.AbstractEventLoop, queue: asyncio.Queue) -> None:
        with self._lock:
            self.subscribers.add((loop, queue))

    def remove_subscriber(self, queue: asyncio.Queue) -> None:
        with self._lock:
            self.subscribers = {s for s in self.subscribers if s[1] is not queue}

    def broadcast_safe(self, message: dict) -> None:
        with self._lock:
            dead = set()
            for loop, queue in self.subscribers:
                try:
                    if loop.is_closed():
                        dead.add((loop, queue))
                    else:
                        loop.call_soon_threadsafe(self._push_queue, queue, message)
                except Exception:
                    dead.add((loop, queue))
            if dead:
                self.subscribers -= dead

    @staticmethod
    def _push_queue(queue: asyncio.Queue, message: dict) -> None:
        try:
            queue.put_nowait(message)
        except asyncio.QueueFull:
            # Client queue full: discard oldest or drop message to protect memory
            pass

    def on_packet(self, pkt) -> None:
        if not self.is_running:
            return

        with self._lock:
            self.packet_count += 1
            idx = self.packet_count - 1
            self.byte_count += len(pkt)

            # Extract full layer headers and metadata using existing parser logic
            p_dict = _summarize(idx, pkt)
            p_dict["capture_id"] = self.capture_id

            # Prepare client-facing summary payload
            client_summary = {
                "index": idx,
                "timestamp": p_dict["timestamp"],
                "timestamp_iso": datetime.fromtimestamp(p_dict["timestamp"], timezone.utc).isoformat().replace("+00:00", "Z"),
                "src_ip": p_dict["src_ip"],
                "dst_ip": p_dict["dst_ip"],
                "protocol": p_dict["protocol"],
                "length": p_dict["length"],
                "src_port": p_dict["src_port"],
                "dst_port": p_dict["dst_port"],
                "tcp_flags": [FLAG_NAMES.get(c, c) for c in p_dict["tcp_flags"]] if p_dict["tcp_flags"] else [],
                "status": p_dict["status"],
                "ttl": p_dict["ttl"],
                "info": p_dict["info"],
                "headers": p_dict["headers"],
            }

            self._db_buffer.append(p_dict)
            should_flush = len(self._db_buffer) >= 50 or (time.time() - self._last_flush) >= 1.0

        # Broadcast packet to WebSocket clients
        self.broadcast_safe({"type": "packet", "data": client_summary})

        # Check limits
        if self.packet_count >= self.packet_limit:
            threading.Thread(target=self.stop, kwargs={"reason": "packet_limit_reached"}, daemon=True).start()
        elif (time.time() - self.start_time) >= self.duration_seconds:
            threading.Thread(target=self.stop, kwargs={"reason": "duration_limit_reached"}, daemon=True).start()

        if should_flush:
            self.flush_db()

    def flush_db(self) -> None:
        with self._lock:
            if not self._db_buffer:
                return
            batch = self._db_buffer[:]
            self._db_buffer.clear()
            self._last_flush = time.time()

        # Write batch to SQLite in worker thread
        try:
            db = SessionLocal()
            try:
                db.bulk_insert_mappings(Packet, batch)
                db.commit()
            finally:
                db.close()
        except Exception:
            pass

    def stop(self, reason: str = "user_stopped") -> None:
        with self._lock:
            if not self.is_running:
                return
            self.is_running = False

        if self.sniffer:
            try:
                self.sniffer.stop()
            except Exception:
                pass

        # Flush any remaining packets to database
        self.flush_db()

        # Update capture metadata in database
        try:
            db = SessionLocal()
            try:
                cap = db.get(Capture, self.capture_id)
                if cap:
                    cap.packet_count = self.packet_count
                    cap.size_bytes = self.byte_count
                    db.commit()
            finally:
                db.close()
        except Exception:
            pass

        # Broadcast stopped status
        self.broadcast_safe({
            "type": "status",
            "status": "stopped",
            "reason": reason,
            "packet_count": self.packet_count,
            "total_bytes": self.byte_count,
            "duration_seconds": round(time.time() - self.start_time, 2),
        })


class LiveCaptureEngine:
    """Singleton capture manager coordinating active live capture sessions."""

    def __init__(self):
        self._active_session: LiveCaptureSession | None = None
        self._lock = threading.Lock()

    @property
    def active_session(self) -> LiveCaptureSession | None:
        with self._lock:
            return self._active_session

    def start_capture(self, interface: str, bpf_filter: str | None = None, packet_limit: int = 5000, duration_seconds: int = 600) -> dict:
        _load_layers()
        from scapy.all import AsyncSniffer

        with self._lock:
            if self._active_session:
                if not self._active_session.is_running or (hasattr(self._active_session.sniffer, "thread") and not self._active_session.sniffer.thread.is_alive()):
                    self._active_session = None
                else:
                    raise AppError(409, "capture_already_running", "A live packet capture session is already in progress. Stop it before starting a new one.")

            # Validate interface existence
            available = get_interfaces()
            known = {i["id"].lower(): i["id"] for i in available}
            for iface_obj in available:
                known[iface_obj["name"].lower()] = iface_obj["id"]

            if interface.lower() not in known:
                raise AppError(404, "interface_not_found", f"Interface '{interface}' was not found on this system. Available interfaces: {', '.join([i['name'] for i in available])}.")
            
            canonical_interface = known[interface.lower()]

            session_id = uuid.uuid4().hex[:8]
            clean_name = _clean_iface_name(canonical_interface)
            ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

            # Create database Capture entry
            db = SessionLocal()
            try:
                cap = Capture(filename=f"live_{clean_name}_{ts}.pcap", source="live", size_bytes=0, packet_count=0)
                db.add(cap)
                db.commit()
                db.refresh(cap)
                capture_id = cap.id
            finally:
                db.close()

            # Enforce limits
            max_limit = getattr(settings, "max_live_packets", 10000)
            packet_limit = min(max(packet_limit, 1), max_limit)
            max_dur = getattr(settings, "max_capture_seconds", 900)
            duration_seconds = min(max(duration_seconds, 5), max_dur)

            session = LiveCaptureSession(
                session_id=session_id,
                capture_id=capture_id,
                interface=interface,
                bpf_filter=bpf_filter,
                packet_limit=packet_limit,
                duration_seconds=duration_seconds,
            )

            # Initialize AsyncSniffer
            filter_str = bpf_filter.strip() if bpf_filter and bpf_filter.strip() else None
            try:
                sniffer = AsyncSniffer(
                    iface=interface,
                    filter=filter_str,
                    prn=session.on_packet,
                    store=False,
                )
                session.sniffer = sniffer
                session.is_running = True
                sniffer.start()
            except Exception as e:
                session.is_running = False
                raise AppError(422, "capture_failed", f"Failed to start capture on '{interface}': {type(e).__name__} - {str(e)}")

            # Quick check if sniffer thread died immediately (e.g. invalid BPF filter)
            for _ in range(5):
                time.sleep(0.04)
                if hasattr(sniffer, "thread") and not sniffer.thread.is_alive():
                    break

            if hasattr(sniffer, "thread") and not sniffer.thread.is_alive():
                err = getattr(sniffer, "exception", None) or "Capture sniffer thread terminated immediately."
                session.is_running = False
                self._active_session = None
                raise AppError(422, "invalid_filter_or_interface", f"Cannot capture on '{interface}': {str(err)}")

            self._active_session = session

            return {
                "session_id": session_id,
                "capture_id": capture_id,
                "interface": interface,
                "bpf_filter": filter_str,
                "packet_limit": packet_limit,
                "status": "started",
                "started_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            }

    def stop_capture(self, session_id: str | None = None) -> dict:
        with self._lock:
            session = self._active_session
            if not session or not session.is_running:
                return {"status": "stopped", "message": "No active capture session running."}
            if session_id and session.session_id != session_id:
                raise AppError(404, "session_not_found", f"Active session is {session.session_id}, not {session_id}.")

        session.stop(reason="user_stopped")
        with self._lock:
            if self._active_session == session:
                self._active_session = None

        return {
            "session_id": session.session_id,
            "capture_id": session.capture_id,
            "status": "stopped",
            "packet_count": session.packet_count,
            "total_bytes": session.byte_count,
            "duration_seconds": round(time.time() - session.start_time, 2),
        }

    def get_status(self, session_id: str | None = None) -> dict:
        with self._lock:
            session = self._active_session
            if not session:
                return {"is_running": False, "status": "idle"}
            if session_id and session.session_id != session_id:
                return {"is_running": False, "status": "inactive"}

            return {
                "is_running": session.is_running,
                "session_id": session.session_id,
                "capture_id": session.capture_id,
                "interface": session.interface,
                "bpf_filter": session.bpf_filter,
                "packet_count": session.packet_count,
                "total_bytes": session.byte_count,
                "duration_seconds": round(time.time() - session.start_time, 2),
                "packet_limit": session.packet_limit,
            }


# Global singleton engine
engine = LiveCaptureEngine()
