import os
import re
import tempfile
from datetime import datetime, timezone

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.orm import Session

from config import settings
from errors import AppError
from models.packet import Capture, Packet

PCAP_MAGICS = {b"\xd4\xc3\xb2\xa1", b"\xa1\xb2\xc3\xd4", b"\x4d\x3c\xb2\xa1", b"\xa1\xb2\x3c\x4d", b"\x0a\x0d\x0d\x0a"}
ALLOWED_EXT = (".pcap", ".pcapng", ".cap")
SAMPLES = {"sample-mixed": {"file": "sample_mixed.pcap", "title": "Mixed sample: TCP handshake, HTTP, DNS, ICMP, ARP, UDP"}}
FLAG_NAMES = {"F": "FIN", "S": "SYN", "R": "RST", "P": "PSH", "A": "ACK", "U": "URG", "E": "ECE", "C": "CWR"}
SORTABLE = {"index": Packet.idx, "timestamp": Packet.timestamp, "length": Packet.length, "protocol": Packet.protocol, "src_ip": Packet.src_ip, "dst_ip": Packet.dst_ip}
SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_data")


def clean_filename(name: str | None) -> str:
    base = os.path.basename((name or "capture").replace("\\", "/"))
    return re.sub(r"[^A-Za-z0-9._ -]", "_", base)[:100] or "capture"


def validate_upload(filename: str, data: bytes) -> None:
    if not filename.lower().endswith(ALLOWED_EXT):
        raise AppError(415, "unsupported_file_type", "Only .pcap, .pcapng and .cap files are accepted.")
    if not data:
        raise AppError(400, "empty_file", "The uploaded file is empty.")
    if data[:4] not in PCAP_MAGICS:
        raise AppError(422, "invalid_capture", "File content is not a valid PCAP/PCAPNG capture (bad magic number).")


def _h(layer, names: list[str]) -> dict:
    return {n: str(getattr(layer, n)) for n in names if hasattr(layer, n)}


def _summarize(i: int, pkt) -> dict:
    from scapy.layers.dns import DNS
    from scapy.layers.inet import ICMP, IP, TCP, UDP
    from scapy.layers.inet6 import IPv6
    from scapy.layers.l2 import ARP, Ether

    src = dst = ttl = flags = sp = dp = None
    proto, headers = "Other", {}
    if pkt.haslayer(Ether):
        headers["ethernet"] = _h(pkt[Ether], ["src", "dst", "type"])
        src, dst = pkt[Ether].src, pkt[Ether].dst
    if pkt.haslayer(ARP):
        proto, a = "ARP", pkt[ARP]
        src, dst = a.psrc, a.pdst
        headers["arp"] = _h(a, ["op", "hwsrc", "psrc", "hwdst", "pdst"])
    if pkt.haslayer(IP):
        ip = pkt[IP]
        src, dst, ttl, proto = ip.src, ip.dst, ip.ttl, "IP"
        headers["ip"] = _h(ip, ["version", "ihl", "tos", "len", "id", "flags", "frag", "ttl", "proto", "chksum"])
    elif pkt.haslayer(IPv6):
        v6 = pkt[IPv6]
        src, dst, ttl, proto = v6.src, v6.dst, v6.hlim, "IPv6"
        headers["ipv6"] = _h(v6, ["version", "tc", "fl", "plen", "nh", "hlim"])
    if pkt.haslayer(TCP):
        t = pkt[TCP]
        proto, sp, dp, flags = "TCP", t.sport, t.dport, str(t.flags)
        headers["tcp"] = _h(t, ["sport", "dport", "seq", "ack", "dataofs", "flags", "window", "chksum", "urgptr"])
    elif pkt.haslayer(UDP):
        u = pkt[UDP]
        proto, sp, dp = "UDP", u.sport, u.dport
        headers["udp"] = _h(u, ["sport", "dport", "len", "chksum"])
    elif pkt.haslayer(ICMP):
        proto = "ICMP"
        headers["icmp"] = _h(pkt[ICMP], ["type", "code", "chksum", "id", "seq"])
    if pkt.haslayer(DNS):
        proto, d = "DNS", pkt[DNS]
        headers["dns"] = _h(d, ["id", "qr", "opcode", "rcode", "qdcount", "ancount"])
    status = "ok"
    if flags:
        status = "reset" if "R" in flags else "handshake" if "S" in flags else "closing" if "F" in flags else "ok"
    info = f"{sp} → {dp} [{','.join(FLAG_NAMES.get(c, c) for c in flags)}]" if proto == "TCP" and flags else f"{sp} → {dp}" if sp is not None else proto
    return {"idx": i, "timestamp": float(pkt.time), "src_ip": src, "dst_ip": dst, "protocol": proto, "length": len(pkt), "src_port": sp,
            "dst_port": dp, "tcp_flags": flags, "status": status, "ttl": ttl, "info": info[:200], "headers": headers}


def _load_layers() -> None:
    """Scapy only dissects a protocol if its layer module is imported BEFORE the capture is read."""
    from scapy.layers import dns, inet, inet6, l2  # noqa: F401


def parse_bytes(data: bytes) -> list[dict]:
    from scapy.error import Scapy_Exception
    from scapy.utils import PcapReader

    _load_layers()

    fd, path = tempfile.mkstemp(suffix=".pcap")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        rows: list[dict] = []
        try:
            with PcapReader(path) as reader:
                for i, pkt in enumerate(reader):
                    if i >= settings.max_packets:
                        raise AppError(413, "too_many_packets", f"Capture exceeds the {settings.max_packets} packet limit.")
                    rows.append(_summarize(i, pkt))
        except AppError:
            raise
        except (Scapy_Exception, OSError, EOFError, ValueError, IndexError, AttributeError) as e:
            raise AppError(422, "invalid_capture", f"The capture file could not be parsed: {type(e).__name__}.")
        if not rows:
            raise AppError(422, "no_packets", "The capture contains no readable packets.")
        return rows
    finally:
        try:
            os.unlink(path)
        except OSError:
            import gc
            gc.collect()
            try:
                os.unlink(path)
            except OSError:
                pass


def ingest(db: Session, filename: str, source: str, data: bytes) -> Capture:
    rows = parse_bytes(data)
    cap = Capture(filename=filename, source=source, size_bytes=len(data), packet_count=len(rows))
    db.add(cap)
    db.flush()
    for r in rows:
        r["capture_id"] = cap.id
    for i in range(0, len(rows), 1000):
        db.bulk_insert_mappings(Packet, rows[i:i + 1000])
    db.commit()
    return cap


def load_sample(db: Session, name: str) -> Capture:
    if name not in SAMPLES:
        raise AppError(404, "sample_not_found", f"Unknown sample '{name}'. Available: {', '.join(SAMPLES)}.")
    with open(os.path.join(SAMPLE_DIR, SAMPLES[name]["file"]), "rb") as f:  # allow-listed names only
        return ingest(db, SAMPLES[name]["file"], "sample", f.read())


def get_capture(db: Session, cid: int) -> Capture:
    cap = db.get(Capture, cid)
    if not cap:
        raise AppError(404, "capture_not_found", f"Capture {cid} does not exist.")
    return cap


def delete_capture(db: Session, cid: int) -> None:
    cap = get_capture(db, cid)
    db.query(Packet).filter(Packet.capture_id == cid).delete()
    db.delete(cap)
    db.commit()


def _out(p: Packet) -> dict:
    return {"index": p.idx, "timestamp": p.timestamp, "timestamp_iso": datetime.fromtimestamp(p.timestamp, timezone.utc).isoformat().replace("+00:00", "Z"),
            "src_ip": p.src_ip, "dst_ip": p.dst_ip, "protocol": p.protocol, "length": p.length, "src_port": p.src_port, "dst_port": p.dst_port,
            "tcp_flags": [FLAG_NAMES.get(c, c) for c in p.tcp_flags] if p.tcp_flags else [], "status": p.status, "info": p.info}


def detail(db: Session, cid: int, idx: int) -> dict:
    get_capture(db, cid)
    p = db.execute(select(Packet).where(Packet.capture_id == cid, Packet.idx == idx)).scalar_one_or_none()
    if not p:
        raise AppError(404, "packet_not_found", f"Packet {idx} not found in capture {cid}.")
    return {**_out(p), "ttl": p.ttl, "headers": p.headers}


def _filtered(cid: int, protocol, src_ip, dst_ip, status, search):
    q = select(Packet).where(Packet.capture_id == cid)
    if protocol:
        q = q.where(func.lower(Packet.protocol) == protocol.lower())
    if src_ip:
        q = q.where(Packet.src_ip == src_ip)
    if dst_ip:
        q = q.where(Packet.dst_ip == dst_ip)
    if status:
        q = q.where(Packet.status == status)
    if search:
        pat = "%" + search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        q = q.where(or_(*[c.ilike(pat, escape="\\") for c in (Packet.src_ip, Packet.dst_ip, Packet.protocol, Packet.info)]))
    return q


def list_packets(db: Session, cid: int, page: int, page_size: int, sort: str, order: str, **filters) -> tuple[list[dict], int]:
    get_capture(db, cid)
    if sort not in SORTABLE:
        raise AppError(422, "invalid_sort", f"sort must be one of {', '.join(SORTABLE)}.")
    q = _filtered(cid, **filters)
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    col = SORTABLE[sort]
    rows = db.execute(q.order_by(desc(col) if order == "desc" else asc(col), Packet.idx).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return [_out(p) for p in rows], total


def all_rows(db: Session, cid: int, **filters) -> list[dict]:
    get_capture(db, cid)
    return [_out(p) for p in db.execute(_filtered(cid, **filters).order_by(Packet.idx)).scalars()]


def stats(db: Session, cid: int) -> dict:
    cap = get_capture(db, cid)
    by_proto = dict(db.execute(select(Packet.protocol, func.count()).where(Packet.capture_id == cid).group_by(Packet.protocol)).all())
    lo, hi, total = db.execute(select(func.min(Packet.timestamp), func.max(Packet.timestamp), func.sum(Packet.length)).where(Packet.capture_id == cid)).one()
    top = db.execute(select(Packet.src_ip, func.count().label("n")).where(Packet.capture_id == cid, Packet.src_ip.is_not(None)).group_by(Packet.src_ip).order_by(desc("n")).limit(5)).all()
    return {"capture_id": cid, "filename": cap.filename, "packet_count": cap.packet_count, "total_bytes": int(total or 0),
            "duration_seconds": round((hi - lo), 6) if lo is not None else 0.0, "protocols": by_proto, "top_sources": [{"ip": ip, "packets": n} for ip, n in top]}


def timestamped_bytes(db: Session, cid: int) -> list[dict]:
    get_capture(db, cid)
    return [{"timestamp": t, "bytes": b, "packets": 1} for t, b in db.execute(select(Packet.timestamp, Packet.length).where(Packet.capture_id == cid))]
