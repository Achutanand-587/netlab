from tests.conftest import API

B = f"{API}/bandwidth"


def test_analyze_computes_throughput(client):
    s = [{"timestamp": 100.0, "bytes": 1000}, {"timestamp": 100.5, "bytes": 1000}, {"timestamp": 101.2, "bytes": 2000, "packets": 2}]
    r = client.post(f"{B}/analyze", json={"samples": s, "interval_seconds": 1}).json()
    assert r["simulated"] is False and r["source"] == "input" and len(r["points"]) == 2
    assert r["points"][0]["throughput_bps"] == 16000 and r["points"][0]["packets"] == 2
    assert r["summary"]["total_bytes"] == 4000 and r["summary"]["peak_throughput_bps"] == 16000 and r["summary"]["avg_packet_size"] == 1000


def test_analyze_fills_gaps_and_validates(client):
    r = client.post(f"{B}/analyze", json={"samples": [{"timestamp": 0, "bytes": 10}, {"timestamp": 3.5, "bytes": 10}]}).json()
    assert [p["bytes"] for p in r["points"]] == [10, 0, 0, 10]
    assert client.post(f"{B}/analyze", json={"samples": []}).status_code == 422
    assert client.post(f"{B}/analyze", json={"samples": [{"timestamp": 0, "bytes": -1}]}).status_code == 422
    assert client.post(f"{B}/analyze", json={"samples": [{"timestamp": 0, "bytes": 1}], "interval_seconds": 0}).status_code == 422
    huge = {"samples": [{"timestamp": 0, "bytes": 1}, {"timestamp": 1e9, "bytes": 1}], "interval_seconds": 0.001}
    assert client.post(f"{B}/analyze", json=huge).json()["error"]["code"] == "too_many_intervals"


def test_simulated_is_labelled_and_deterministic(client):
    a = client.get(B, params={"range": "15m", "seed": 7}).json()
    b = client.get(f"{B}/simulated", params={"range": "15m", "seed": 7}).json()
    assert a["simulated"] is True and a["source"] == "simulated" and "SIMULATED" in a["notice"] and len(a["points"]) == 90
    strip = lambda d: [{k: v for k, v in p.items() if k != "timestamp"} for p in d["points"]]  # noqa: E731
    assert strip(a) == strip(b)
    assert {"download_mbps", "upload_mbps", "throughput_mbps", "packets", "latency_ms", "packet_loss_pct"} <= set(a["points"][0])
    assert client.get(B, params={"range": "9y"}).json()["error"]["code"] == "invalid_range"


def test_from_capture_is_real_not_simulated(client, pcap_bytes):
    cid = client.post(f"{API}/packets/upload", files={"file": ("t.pcap", pcap_bytes)}).json()["id"]
    r = client.get(f"{B}/captures/{cid}", params={"interval_seconds": 1}).json()
    assert r["simulated"] is False and r["source"] == f"capture:{cid}" and r["summary"]["total_packets"] == 4
    assert "protocols" in r and "top_sources" in r
    assert client.get(f"{B}/captures/999").status_code == 404


def test_live_interfaces_discovery(client):
    r = client.get(f"{B}/live/interfaces")
    assert r.status_code == 200
    ifaces = r.json()
    assert isinstance(ifaces, list)
    if ifaces:
        first = ifaces[0]
        assert "name" in first and "is_up" in first and "bytes_recv" in first


def test_live_monitoring_lifecycle(client):
    r = client.get(f"{B}/live/interfaces")
    ifaces = r.json()
    if not ifaces:
        return

    target = ifaces[0]["name"]
    # Start
    start_res = client.post(f"{B}/live/start", json={"interface": target})
    assert start_res.status_code == 200
    s_data = start_res.json()
    assert s_data["active"] is True
    assert s_data["interface"] == target

    # Status
    status_res = client.get(f"{B}/live/status")
    assert status_res.status_code == 200
    assert status_res.json()["active"] is True

    # Stop
    stop_res = client.post(f"{B}/live/stop")
    assert stop_res.status_code == 200
    assert stop_res.json()["active"] is False


def test_simulate_experiment_tcp_and_udp(client):
    # Test TCP
    tcp_res = client.post(f"{B}/experiment", json={
        "link_bandwidth_mbps": 100.0,
        "latency_ms": 10.0,
        "router_hops": 2,
        "protocol": "TCP",
        "transfer_size_mb": 5.0,
        "packet_loss_pct": 0.5,
    })
    assert tcp_res.status_code == 200
    tcp_data = tcp_res.json()
    assert tcp_data["simulated"] is True
    assert tcp_data["protocol"] == "TCP"
    assert tcp_data["summary"]["configured_bandwidth_mbps"] == 100.0
    assert tcp_data["summary"]["achieved_avg_throughput_mbps"] > 0
    assert len(tcp_data["points"]) > 0

    # Test UDP
    udp_res = client.post(f"{B}/experiment", json={
        "link_bandwidth_mbps": 50.0,
        "latency_ms": 20.0,
        "router_hops": 4,
        "protocol": "UDP",
        "transfer_size_mb": 2.0,
        "packet_loss_pct": 2.0,
    })
    assert udp_res.status_code == 200
    udp_data = udp_res.json()
    assert udp_data["simulated"] is True
    assert udp_data["protocol"] == "UDP"
    assert udp_data["summary"]["achieved_avg_throughput_mbps"] > 0
