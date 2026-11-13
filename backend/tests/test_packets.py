from config import settings
from tests.conftest import API

P = f"{API}/packets"


def upload(c, data, name="t.pcap"):
    return c.post(f"{P}/upload", files={"file": (name, data, "application/octet-stream")})


def test_upload_and_list(client, pcap_bytes):
    r = upload(client, pcap_bytes)
    assert r.status_code == 201 and r.json()["packet_count"] == 4
    cid = r.json()["id"]
    page = client.get(f"{P}/captures/{cid}/packets", params={"page_size": 2, "page": 2}).json()
    assert page["total"] == 4 and page["pages"] == 2 and [p["index"] for p in page["items"]] == [2, 3]
    tcp = client.get(f"{P}/captures/{cid}/packets", params={"protocol": "tcp"}).json()
    assert tcp["total"] == 2 and tcp["items"][0]["tcp_flags"] == ["SYN"] and tcp["items"][0]["dst_port"] == 80
    desc = client.get(f"{P}/captures/{cid}/packets", params={"sort": "timestamp", "order": "desc"}).json()
    assert desc["items"][0]["index"] == 3


def test_detail_and_stats(client, pcap_bytes):
    cid = upload(client, pcap_bytes).json()["id"]
    d = client.get(f"{P}/captures/{cid}/packets/1").json()
    assert d["tcp_flags"] == ["SYN", "ACK"] and d["headers"]["tcp"]["sport"] == "80" and d["ttl"] == 64 and "ip" in d["headers"]
    s = client.get(f"{P}/captures/{cid}/stats").json()
    assert s["protocols"]["TCP"] == 2 and s["duration_seconds"] == 1.5
    assert client.get(f"{P}/captures/{cid}/packets/99").status_code == 404
    assert client.get(f"{P}/captures/999/packets").json()["error"]["code"] == "capture_not_found"


def test_search_is_escaped(client, pcap_bytes):
    cid = upload(client, pcap_bytes).json()["id"]
    assert client.get(f"{P}/captures/{cid}/packets", params={"search": "10.0.0.3"}).json()["total"] == 2
    assert client.get(f"{P}/captures/{cid}/packets", params={"search": "%"}).json()["total"] == 0
    assert client.get(f"{P}/captures/{cid}/packets", params={"sort": "bogus"}).status_code == 422


def test_sample_dataset(client):
    r = client.post(f"{P}/samples/sample-mixed/load")
    assert r.status_code == 201 and r.json()["source"] == "sample" and r.json()["packet_count"] == 14
    cid = r.json()["id"]
    protos = client.get(f"{P}/captures/{cid}/stats").json()["protocols"]
    assert {"ARP", "DNS", "TCP", "ICMP", "UDP"} <= set(protos)
    assert client.post(f"{P}/samples/../../etc/passwd/load").status_code in (404, 405)
    assert client.post(f"{P}/samples/nope/load").status_code == 404


def test_malformed_and_invalid_uploads(client, pcap_bytes):
    assert upload(client, b"this is not a pcap file at all").json()["error"]["code"] == "invalid_capture"
    assert upload(client, b"").status_code == 400
    assert upload(client, pcap_bytes, "evil.exe").status_code == 415
    assert upload(client, b"\xd4\xc3\xb2\xa1" + b"\x00" * 10).status_code == 422  # valid magic, truncated header
    truncated = upload(client, pcap_bytes[:-20])  # cut inside the last packet
    assert truncated.status_code in (201, 422)
    assert client.get(f"{P}/captures").status_code == 200


def test_upload_size_limit_and_filename_sanitised(client, pcap_bytes, monkeypatch):
    ok = upload(client, pcap_bytes, "../../etc/pass wd?.pcap")
    assert ok.status_code == 201 and "/" not in ok.json()["filename"] and "?" not in ok.json()["filename"]
    monkeypatch.setattr(settings, "max_upload_bytes", 100)
    big = upload(client, pcap_bytes)
    assert big.status_code == 413 and big.json()["error"]["code"] == "file_too_large"


def test_packet_limit(client, pcap_bytes, monkeypatch):
    monkeypatch.setattr(settings, "max_packets", 2)
    assert upload(client, pcap_bytes).json()["error"]["code"] == "too_many_packets"


def test_pcapng(client, tmp_path):
    from scapy.all import IP, TCP, Ether
    from scapy.utils import PcapNgWriter
    f = tmp_path / "t.pcapng"
    w = PcapNgWriter(str(f))
    w.write(Ether() / IP(src="1.1.1.1", dst="2.2.2.2") / TCP())
    w.close()
    r = upload(client, f.read_bytes(), "t.pcapng")
    assert r.status_code == 201 and r.json()["packet_count"] == 1


def test_export_csv_and_delete(client, pcap_bytes):
    cid = upload(client, pcap_bytes).json()["id"]
    csv_ = client.get(f"{P}/captures/{cid}/export.csv", params={"protocol": "TCP"})
    assert csv_.headers["content-type"].startswith("text/csv") and len(csv_.text.strip().splitlines()) == 3
    assert client.delete(f"{P}/captures/{cid}").status_code == 204
    assert client.get(f"{P}/captures/{cid}").status_code == 404


def test_dissection_works_in_a_fresh_process():
    """Regression: other tests import scapy.all, which can mask missing layer imports in the real server."""
    import subprocess
    import sys
    code = ("import os; os.environ['DATABASE_URL']='sqlite://'\n"
            "from services import packets as s\n"
            "rows = s.parse_bytes(open('sample_data/sample_mixed.pcap','rb').read())\n"
            "print(sorted({r['protocol'] for r in rows}))")
    out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, check=True).stdout
    assert out.strip() == "['ARP', 'DNS', 'ICMP', 'TCP', 'UDP']"
