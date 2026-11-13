import asyncio
import math
import random
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from errors import AppError
from models.packet import Capture, Packet
from services import packets as pkt_svc

SIM_NOTICE = "SIMULATED DATA: generated for demonstration. It is not measured from a real network."
RANGES = {"5m": (300, 5), "15m": (900, 10), "1h": (3600, 60), "6h": (21600, 300), "24h": (86400, 900)}
MAX_BINS = 20000


# ---------------------------------------------------------------------------
# 1. Existing Analysis & Historical Range Simulation (Preserved for compatibility)
# ---------------------------------------------------------------------------

def analyze(samples: list[dict], interval: float) -> dict:
    """samples: [{timestamp (epoch seconds), bytes, packets}] -> binned throughput series."""
    if not samples:
        return {
            "interval_seconds": interval,
            "points": [],
            "summary": {
                "total_bytes": 0,
                "total_packets": 0,
                "duration_seconds": 0.0,
                "avg_throughput_bps": 0.0,
                "peak_throughput_bps": 0.0,
                "avg_packet_size": 0.0,
            },
        }

    t0 = min(s["timestamp"] for s in samples)
    bins: dict[int, list[int]] = {}
    for s in samples:
        b = bins.setdefault(int((s["timestamp"] - t0) // interval), [0, 0])
        b[0] += s["bytes"]
        b[1] += s.get("packets", 1)
    last = max(bins)
    if last + 1 > MAX_BINS:
        raise AppError(422, "too_many_intervals", f"Input spans {last + 1} intervals (max {MAX_BINS}). Use a larger interval_seconds.")
    pts = []
    for k in range(last + 1):
        by, pk = bins.get(k, [0, 0])
        bps = by * 8 / interval
        pts.append({
            "timestamp": t0 + k * interval,
            "bytes": by,
            "packets": pk,
            "throughput_bps": round(bps, 2),
            "throughput_mbps": round(bps / 1e6, 6),
            "packets_per_sec": round(pk / interval, 3),
        })
    tb, tp = sum(p["bytes"] for p in pts), sum(p["packets"] for p in pts)
    dur = (last + 1) * interval
    return {
        "interval_seconds": interval,
        "points": pts,
        "summary": {
            "total_bytes": tb,
            "total_packets": tp,
            "duration_seconds": dur,
            "avg_throughput_bps": round(tb * 8 / dur, 2) if dur > 0 else 0.0,
            "peak_throughput_bps": max(p["throughput_bps"] for p in pts) if pts else 0.0,
            "avg_packet_size": round(tb / tp, 2) if tp else 0.0,
        },
    }


def simulate(range_key: str, seed: int) -> dict:
    """Deterministic simulated throughput range."""
    if range_key not in RANGES:
        raise AppError(422, "invalid_range", f"range must be one of {', '.join(RANGES)}.")
    span, step = RANGES[range_key]
    n, rng = span // step, random.Random(seed)
    end = datetime.now(timezone.utc).replace(microsecond=0)
    pts = []
    for i in range(n):
        wave = math.sin(2 * math.pi * i / max(n / 3, 1))
        down = max(1.0, 62 + 24 * wave + rng.uniform(-6, 6))
        up = max(0.5, 21 + 7 * math.cos(2 * math.pi * i / max(n / 4, 1)) + rng.uniform(-2, 2))
        tp = down + up
        pts.append({
            "timestamp": (end - timedelta(seconds=step * (n - 1 - i))).isoformat().replace("+00:00", "Z"),
            "download_mbps": round(down, 2),
            "upload_mbps": round(up, 2),
            "throughput_mbps": round(tp, 2),
            "packets": int(tp * 1e6 / 8 / 800 * step),
            "latency_ms": round(max(2, 18 + 5 * wave + rng.uniform(-2, 2)), 2),
            "packet_loss_pct": round(max(0, 0.4 + 0.3 * wave + rng.uniform(-0.15, 0.15)), 3),
        })
    avg = lambda k: round(sum(p[k] for p in pts) / n, 2)  # noqa: E731
    return {
        "source": "simulated",
        "simulated": True,
        "notice": SIM_NOTICE,
        "range": range_key,
        "interval_seconds": step,
        "seed": seed,
        "points": pts,
        "summary": {
            "avg_download_mbps": avg("download_mbps"),
            "avg_upload_mbps": avg("upload_mbps"),
            "peak_throughput_mbps": max(p["throughput_mbps"] for p in pts) if pts else 0.0,
            "avg_latency_ms": avg("latency_ms"),
            "avg_packet_loss_pct": avg("packet_loss_pct"),
            "total_packets": sum(p["packets"] for p in pts),
        },
    }


# ---------------------------------------------------------------------------
# 2. LIVE Network Monitoring (Actual Host psutil Statistics)
# ---------------------------------------------------------------------------

def get_live_interfaces() -> list[dict]:
    """Returns host interfaces with current psutil counters, IP, and status."""
    try:
        import psutil
    except ImportError:
        return []

    try:
        counters = psutil.net_io_counters(pernic=True)
    except Exception:
        counters = {}

    try:
        stats = psutil.net_if_stats()
    except Exception:
        stats = {}

    try:
        addrs = psutil.net_if_addrs()
    except Exception:
        addrs = {}

    interfaces = []
    for name, c in counters.items():
        st = stats.get(name)
        ad = addrs.get(name, [])

        ip = None
        mac = None
        for a in ad:
            fam = getattr(a.family, "name", str(a.family))
            if fam == "AF_INET" and not ip:
                ip = a.address
            elif fam in ("AF_LINK", "AF_PACKET") or getattr(a.family, "value", None) == -1:
                mac = a.address

        desc = name
        is_wireless = any(w in name.lower() for w in ("wi-fi", "wifi", "wireless", "wlan"))

        interfaces.append({
            "name": name,
            "description": desc,
            "ip": ip,
            "mac": mac,
            "is_up": bool(st.isup) if st else False,
            "speed_mbps": st.speed if st and st.speed > 0 else 0,
            "mtu": st.mtu if st else 1500,
            "is_wireless": is_wireless,
            "bytes_sent": c.bytes_sent,
            "bytes_recv": c.bytes_recv,
            "packets_sent": c.packets_sent,
            "packets_recv": c.packets_recv,
        })

    # Sort UP interfaces first, then by bytes_recv descending
    interfaces.sort(key=lambda x: (x["is_up"], x["bytes_recv"]), reverse=True)
    return interfaces


class LiveBandwidthMonitor:
    """Background engine that polls psutil interface counters every 1 second."""

    def __init__(self):
        self.lock = threading.Lock()
        self.active = False
        self.session_id: str | None = None
        self.interface: str | None = None
        self.thread: threading.Thread | None = None
        self.stop_event = threading.Event()

        self.started_at: float = 0.0
        self.last_poll_time: float = 0.0
        self.last_bytes_recv: int = 0
        self.last_bytes_sent: int = 0
        self.initial_bytes_recv: int = 0
        self.initial_bytes_sent: int = 0

        self.current_download_mbps: float = 0.0
        self.current_upload_mbps: float = 0.0
        self.peak_download_mbps: float = 0.0
        self.peak_upload_mbps: float = 0.0
        self.sum_download_mbps: float = 0.0
        self.sum_upload_mbps: float = 0.0
        self.poll_count: int = 0

        self.history: list[dict[str, Any]] = []
        self.subscribers: list[tuple[asyncio.AbstractEventLoop, asyncio.Queue]] = []

    def start(self, interface: str) -> dict:
        import psutil

        counters = psutil.net_io_counters(pernic=True)
        if interface not in counters:
            raise AppError(404, "interface_not_found", f"Network interface '{interface}' not found on host.")

        with self.lock:
            if self.active:
                if self.interface == interface:
                    return self.get_status()
                # Stop previous before starting new interface
                self._stop_internal()

            c = counters[interface]
            now = time.time()
            self.active = True
            self.session_id = uuid.uuid4().hex[:12]
            self.interface = interface
            self.started_at = now
            self.last_poll_time = now
            self.last_bytes_recv = c.bytes_recv
            self.last_bytes_sent = c.bytes_sent
            self.initial_bytes_recv = c.bytes_recv
            self.initial_bytes_sent = c.bytes_sent

            self.current_download_mbps = 0.0
            self.current_upload_mbps = 0.0
            self.peak_download_mbps = 0.0
            self.peak_upload_mbps = 0.0
            self.sum_download_mbps = 0.0
            self.sum_upload_mbps = 0.0
            self.poll_count = 0
            self.history = []

            self.stop_event.clear()
            self.thread = threading.Thread(target=self._poll_loop, daemon=True, name="BandwidthMonitorThread")
            self.thread.start()

            return self.get_status()

    def _poll_loop(self):
        import psutil

        while not self.stop_event.is_set():
            time.sleep(1.0)
            if self.stop_event.is_set():
                break

            try:
                now = time.time()
                counters = psutil.net_io_counters(pernic=True)
                c = counters.get(self.interface)
                if not c:
                    continue

                with self.lock:
                    dt = now - self.last_poll_time
                    if dt <= 0.001:
                        dt = 1.0

                    # Handle counter wrap-around or reset
                    d_recv = c.bytes_recv - self.last_bytes_recv
                    d_sent = c.bytes_sent - self.last_bytes_sent
                    if d_recv < 0:
                        d_recv = 0
                    if d_sent < 0:
                        d_sent = 0

                    down_mbps = round((d_recv * 8) / (dt * 1e6), 3)
                    up_mbps = round((d_sent * 8) / (dt * 1e6), 3)

                    self.last_poll_time = now
                    self.last_bytes_recv = c.bytes_recv
                    self.last_bytes_sent = c.bytes_sent

                    self.current_download_mbps = down_mbps
                    self.current_upload_mbps = up_mbps
                    self.peak_download_mbps = max(self.peak_download_mbps, down_mbps)
                    self.peak_upload_mbps = max(self.peak_upload_mbps, up_mbps)
                    self.sum_download_mbps += down_mbps
                    self.sum_upload_mbps += up_mbps
                    self.poll_count += 1

                    duration = round(now - self.started_at, 1)
                    avg_down = round(self.sum_download_mbps / self.poll_count, 3) if self.poll_count else 0.0
                    avg_up = round(self.sum_upload_mbps / self.poll_count, 3) if self.poll_count else 0.0
                    total_recv = max(0, c.bytes_recv - self.initial_bytes_recv)
                    total_sent = max(0, c.bytes_sent - self.initial_bytes_sent)

                    point = {
                        "time": duration,
                        "timestamp": now,
                        "download_mbps": down_mbps,
                        "upload_mbps": up_mbps,
                        "total_recv_bytes": total_recv,
                        "total_sent_bytes": total_sent,
                    }
                    self.history.append(point)
                    if len(self.history) > 120:
                        self.history.pop(0)

                    msg = {
                        "type": "metric",
                        "session_id": self.session_id,
                        "interface": self.interface,
                        "download_mbps": down_mbps,
                        "upload_mbps": up_mbps,
                        "avg_download_mbps": avg_down,
                        "avg_upload_mbps": avg_up,
                        "peak_download_mbps": self.peak_download_mbps,
                        "peak_upload_mbps": self.peak_upload_mbps,
                        "total_recv_bytes": total_recv,
                        "total_sent_bytes": total_sent,
                        "duration_seconds": duration,
                        "point": point,
                    }

                    self._broadcast(msg)
            except Exception:
                pass

    def _broadcast(self, msg: dict):
        dead = []
        for loop, queue in self.subscribers:
            try:
                if loop.is_running() and not queue.full():
                    loop.call_soon_threadsafe(queue.put_nowait, msg)
            except Exception:
                dead.append((loop, queue))
        for d in dead:
            if d in self.subscribers:
                self.subscribers.remove(d)

    def add_subscriber(self, loop: asyncio.AbstractEventLoop, queue: asyncio.Queue):
        with self.lock:
            self.subscribers.append((loop, queue))

    def remove_subscriber(self, queue: asyncio.Queue):
        with self.lock:
            self.subscribers = [(l, q) for l, q in self.subscribers if q != queue]

    def stop(self) -> dict:
        with self.lock:
            return self._stop_internal()

    def _stop_internal(self) -> dict:
        if not self.active:
            return self.get_status()

        self.active = False
        self.stop_event.set()
        status = self.get_status()
        self._broadcast({"type": "status", "status": "stopped", "session_id": self.session_id})
        return status

    def get_status(self) -> dict:
        duration = round(time.time() - self.started_at, 1) if self.active and self.started_at > 0 else 0.0
        avg_down = round(self.sum_download_mbps / self.poll_count, 3) if self.poll_count > 0 else 0.0
        avg_up = round(self.sum_upload_mbps / self.poll_count, 3) if self.poll_count > 0 else 0.0
        total_recv = max(0, self.last_bytes_recv - self.initial_bytes_recv) if self.started_at > 0 else 0
        total_sent = max(0, self.last_bytes_sent - self.initial_bytes_sent) if self.started_at > 0 else 0

        return {
            "active": self.active,
            "session_id": self.session_id,
            "interface": self.interface,
            "download_mbps": self.current_download_mbps,
            "upload_mbps": self.current_upload_mbps,
            "total_recv_bytes": total_recv,
            "total_sent_bytes": total_sent,
            "avg_download_mbps": avg_down,
            "avg_upload_mbps": avg_up,
            "peak_download_mbps": self.peak_download_mbps,
            "peak_upload_mbps": self.peak_upload_mbps,
            "duration_seconds": duration,
            "points": list(self.history),
        }


live_monitor = LiveBandwidthMonitor()


# ---------------------------------------------------------------------------
# 3. VIRTUAL Bandwidth Experiment Simulation
# ---------------------------------------------------------------------------

def simulate_experiment(
    link_bandwidth_mbps: float = 100.0,
    latency_ms: float = 20.0,
    router_hops: int = 2,
    protocol: str = "TCP",
    transfer_size_mb: float = 10.0,
    packet_loss_pct: float = 0.0,
) -> dict:
    """Simulates realistic network throughput dynamics for TCP and UDP data transfers."""
    protocol = protocol.upper()
    if protocol not in ("TCP", "UDP"):
        raise AppError(422, "invalid_protocol", "Protocol must be either 'TCP' or 'UDP'.")

    # Round trip time: propagation + router queuing/processing
    rtt_ms = round(2 * latency_ms + (router_hops * 1.5), 2)
    rtt_sec = max(0.001, rtt_ms / 1000.0)

    # Standard Ethernet MTU 1500 -> MSS 1460
    mss_bytes = 1460
    header_overhead = 54 if protocol == "TCP" else 42  # IP + TCP/UDP + Eth
    total_bytes = int(transfer_size_mb * 1024 * 1024)

    # Efficiency ratio of payload to wire frame
    frame_efficiency = mss_bytes / (mss_bytes + header_overhead)

    # Max wire rate in bytes per second
    wire_bytes_per_sec = (link_bandwidth_mbps * 1e6 / 8.0) * frame_efficiency

    # Bandwidth-delay product (BDP) in bytes
    bdp_bytes = wire_bytes_per_sec * rtt_sec

    points = []
    transferred_bytes = 0
    t = 0.0
    dt = 0.5  # 500ms time slice
    retransmissions = 0

    if protocol == "TCP":
        # TCP Reno simulation: Slow-start -> Congestion Avoidance -> Loss Recovery
        # Initial cwnd = 10 MSS (RFC 6928)
        cwnd_bytes = 10 * mss_bytes
        ssthresh_bytes = max(64 * 1024, bdp_bytes * 1.5)
        # Max socket buffer limit (typically 2-4 MB on modern OS)
        max_buffer_bytes = min(4 * 1024 * 1024, max(128 * 1024, bdp_bytes * 2.0))

        while transferred_bytes < total_bytes and t < 300.0:
            t = round(t + dt, 2)

            # Check if packet loss event occurs in this slice
            has_loss = (random.random() * 100 < packet_loss_pct) if packet_loss_pct > 0 else False

            if has_loss:
                # Congestion: halve cwnd (Multiplicative Decrease)
                retrans = int(cwnd_bytes / mss_bytes * (packet_loss_pct / 100.0 + 0.1))
                retransmissions += max(1, retrans)
                ssthresh_bytes = max(2 * mss_bytes, cwnd_bytes / 2)
                cwnd_bytes = ssthresh_bytes
            else:
                # Increase window: exponential in slow start, linear in congestion avoidance
                if cwnd_bytes < ssthresh_bytes:
                    # Slow start: double every RTT
                    step_growth = cwnd_bytes * (dt / rtt_sec)
                    cwnd_bytes = min(ssthresh_bytes, cwnd_bytes + step_growth)
                else:
                    # Congestion avoidance: 1 MSS per RTT
                    step_growth = (mss_bytes * (cwnd_bytes / mss_bytes)) * (dt / rtt_sec) * 0.5
                    cwnd_bytes = min(max_buffer_bytes, cwnd_bytes + step_growth)

            # Max throughput in this RTT limited by Window / RTT and physical Link Bandwidth
            window_limit_bps = (cwnd_bytes * 8) / rtt_sec
            current_mbps = min(link_bandwidth_mbps * frame_efficiency, window_limit_bps / 1e6)
            # Add small random jitter (0.95 to 1.02)
            current_mbps = max(0.1, round(current_mbps * (1.0 + random.uniform(-0.04, 0.02)), 2))

            bytes_this_step = int((current_mbps * 1e6 / 8) * dt)
            transferred_bytes = min(total_bytes, transferred_bytes + bytes_this_step)

            points.append({
                "time_sec": t,
                "throughput_mbps": current_mbps,
                "cwnd_kb": round(cwnd_bytes / 1024, 1),
                "cumulative_bytes": transferred_bytes,
                "rtt_ms": round(rtt_ms + random.uniform(-1, 2), 2),
            })
    else:
        # UDP: Sends at line rate or configured rate. No slow start. Packet loss drops directly without retransmission.
        achieved_rate_mbps = link_bandwidth_mbps * frame_efficiency * (1.0 - (packet_loss_pct / 100.0))

        while transferred_bytes < total_bytes and t < 300.0:
            t = round(t + dt, 2)
            current_mbps = max(0.1, round(achieved_rate_mbps * (1.0 + random.uniform(-0.02, 0.02)), 2))
            bytes_this_step = int((current_mbps * 1e6 / 8) * dt)
            transferred_bytes = min(total_bytes, transferred_bytes + bytes_this_step)

            points.append({
                "time_sec": t,
                "throughput_mbps": current_mbps,
                "cwnd_kb": 0.0,
                "cumulative_bytes": transferred_bytes,
                "rtt_ms": round(rtt_ms + random.uniform(-2, 3), 2),
            })

    total_packets = math.ceil(total_bytes / mss_bytes) + retransmissions
    duration_sec = t if t > 0 else 0.01
    avg_throughput_mbps = round((total_bytes * 8) / (duration_sec * 1e6), 2)
    efficiency_pct = round((avg_throughput_mbps / link_bandwidth_mbps) * 100, 1)

    # Educational explanation
    if protocol == "TCP":
        loss_text = f" Packet loss of {packet_loss_pct}% triggered window halving." if packet_loss_pct > 0 else ""
        explanation = (
            f"TCP achieved {avg_throughput_mbps} Mbps ({efficiency_pct}% of theoretical {link_bandwidth_mbps} Mbps link). "
            f"Throughput was shaped by Slow-Start ramp up, RTT ({rtt_ms} ms round-trip across {router_hops} router hops), "
            f"and TCP/IP/Ethernet header overhead.{loss_text}"
        )
    else:
        loss_text = f" {packet_loss_pct}% of packets were dropped because UDP does not retransmit." if packet_loss_pct > 0 else ""
        explanation = (
            f"UDP achieved {avg_throughput_mbps} Mbps ({efficiency_pct}% of {link_bandwidth_mbps} Mbps link). "
            f"Because UDP lacks flow control and congestion avoidance, it sends immediately at line rate.{loss_text}"
        )

    return {
        "source": "virtual_simulation",
        "simulated": True,
        "protocol": protocol,
        "parameters": {
            "link_bandwidth_mbps": link_bandwidth_mbps,
            "latency_ms": latency_ms,
            "router_hops": router_hops,
            "transfer_size_mb": transfer_size_mb,
            "packet_loss_pct": packet_loss_pct,
            "calculated_rtt_ms": rtt_ms,
        },
        "summary": {
            "configured_bandwidth_mbps": link_bandwidth_mbps,
            "achieved_avg_throughput_mbps": avg_throughput_mbps,
            "efficiency_pct": efficiency_pct,
            "duration_seconds": round(duration_sec, 2),
            "total_bytes": total_bytes,
            "total_packets": total_packets,
            "retransmissions": retransmissions,
            "explanation": explanation,
        },
        "points": points,
    }


# ---------------------------------------------------------------------------
# 4. IMPORTED PCAP Bandwidth Analysis
# ---------------------------------------------------------------------------

def analyze_pcap_bandwidth(db: Session, capture_id: int, interval_seconds: float = 1.0) -> dict:
    """Performs deep bandwidth analysis on an uploaded PCAP: throughput over time, protocol breakdown, and top talkers."""
    cap = pkt_svc.get_capture(db, capture_id)

    # 1. Query timestamps and packet lengths for throughput time-series
    time_samples = db.execute(
        select(Packet.timestamp, Packet.length).where(Packet.capture_id == capture_id).order_by(Packet.timestamp)
    ).all()

    samples = [{"timestamp": t, "bytes": b, "packets": 1} for t, b in time_samples if t is not None]
    time_analysis = analyze(samples, interval_seconds)

    # 2. Protocol-wise traffic distribution (bytes and packets)
    proto_stats = db.execute(
        select(
            Packet.protocol,
            func.count().label("packet_count"),
            func.sum(Packet.length).label("byte_count"),
        )
        .where(Packet.capture_id == capture_id)
        .group_by(Packet.protocol)
        .order_by(desc("byte_count"))
    ).all()

    total_bytes = sum(r[2] or 0 for r in proto_stats)
    total_packets = sum(r[1] or 0 for r in proto_stats)

    protocols = []
    for proto, p_cnt, b_cnt in proto_stats:
        b = int(b_cnt or 0)
        p = int(p_cnt or 0)
        protocols.append({
            "protocol": proto or "Unknown",
            "packets": p,
            "packet_pct": round((p / total_packets) * 100, 1) if total_packets else 0.0,
            "bytes": b,
            "byte_pct": round((b / total_bytes) * 100, 1) if total_bytes else 0.0,
            "avg_packet_size": round(b / p, 1) if p else 0.0,
        })

    # 3. Top Sources (by bytes and packets)
    top_src = db.execute(
        select(
            Packet.src_ip,
            func.count().label("packet_count"),
            func.sum(Packet.length).label("byte_count"),
        )
        .where(Packet.capture_id == capture_id, Packet.src_ip.is_not(None))
        .group_by(Packet.src_ip)
        .order_by(desc("byte_count"))
        .limit(10)
    ).all()

    top_sources = [
        {"ip": r[0], "packets": int(r[1] or 0), "bytes": int(r[2] or 0)} for r in top_src
    ]

    # 4. Top Destinations (by bytes and packets)
    top_dst = db.execute(
        select(
            Packet.dst_ip,
            func.count().label("packet_count"),
            func.sum(Packet.length).label("byte_count"),
        )
        .where(Packet.capture_id == capture_id, Packet.dst_ip.is_not(None))
        .group_by(Packet.dst_ip)
        .order_by(desc("byte_count"))
        .limit(10)
    ).all()

    top_destinations = [
        {"ip": r[0], "packets": int(r[1] or 0), "bytes": int(r[2] or 0)} for r in top_dst
    ]

    # 5. Top Conversations (Src -> Dst pairs)
    conv_rows = db.execute(
        select(
            Packet.src_ip,
            Packet.dst_ip,
            Packet.protocol,
            func.count().label("packet_count"),
            func.sum(Packet.length).label("byte_count"),
        )
        .where(Packet.capture_id == capture_id, Packet.src_ip.is_not(None), Packet.dst_ip.is_not(None))
        .group_by(Packet.src_ip, Packet.dst_ip, Packet.protocol)
        .order_by(desc("byte_count"))
        .limit(8)
    ).all()

    conversations = [
        {
            "src": r[0],
            "dst": r[1],
            "protocol": r[2],
            "packets": int(r[3] or 0),
            "bytes": int(r[4] or 0),
        }
        for r in conv_rows
    ]

    # Peak throughput in Mbps
    peak_bps = time_analysis["summary"]["peak_throughput_bps"]
    avg_bps = time_analysis["summary"]["avg_throughput_bps"]

    return {
        "source": f"capture:{capture_id}",
        "simulated": False,
        "filename": cap.filename,
        "capture_id": capture_id,
        "summary": {
            "total_bytes": total_bytes,
            "total_packets": total_packets,
            "duration_seconds": time_analysis["summary"]["duration_seconds"],
            "avg_throughput_mbps": round(avg_bps / 1e6, 4),
            "peak_throughput_mbps": round(peak_bps / 1e6, 4),
            "avg_packet_size": round(total_bytes / total_packets, 1) if total_packets else 0.0,
            **time_analysis["summary"],
        },
        "interval_seconds": interval_seconds,
        "points": time_analysis["points"],
        "protocols": protocols,
        "top_sources": top_sources,
        "top_destinations": top_destinations,
        "conversations": conversations,
    }
