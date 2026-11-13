from tests.conftest import API


def test_list_interfaces(client):
    r = client.get(f"{API}/capture/interfaces")
    assert r.status_code == 200
    ifaces = r.json()
    assert isinstance(ifaces, list)
    if ifaces:
        first = ifaces[0]
        assert "id" in first and "name" in first and "description" in first


def test_capture_status_idle_initially(client):
    r = client.get(f"{API}/capture/status")
    assert r.status_code == 200
    data = r.json()
    assert data["is_running"] is False


def test_capture_start_and_stop_lifecycle(client):
    # Use loopback or the first available working interface
    r = client.get(f"{API}/capture/interfaces")
    ifaces = r.json()
    if not ifaces:
        return

    # Pick an interface (prefer Wi-Fi or Ethernet if present)
    target_iface = ifaces[0]["id"]
    for iface in ifaces:
        if iface.get("status") == "up":
            target_iface = iface["id"]
            break

    # Start capture
    start_res = client.post(f"{API}/capture/start", json={
        "interface": target_iface,
        "packet_limit": 100,
    })

    if start_res.status_code == 201:
        sdata = start_res.json()
        assert sdata["status"] == "started"
        assert sdata["interface"] == target_iface
        session_id = sdata["session_id"]
        capture_id = sdata["capture_id"]

        # Check status is running
        st_res = client.get(f"{API}/capture/status")
        assert st_res.status_code == 200
        assert st_res.json()["is_running"] is True

        # Duplicate start should fail with 409
        dup_res = client.post(f"{API}/capture/start", json={"interface": target_iface})
        assert dup_res.status_code == 409

        # Stop capture
        stop_res = client.post(f"{API}/capture/stop")
        assert stop_res.status_code == 200
        stop_data = stop_res.json()
        assert stop_data["status"] == "stopped"
        assert stop_data["session_id"] == session_id
        assert stop_data["capture_id"] == capture_id

        # Verify status is now idle
        final_st = client.get(f"{API}/capture/status")
        assert final_st.json()["is_running"] is False


def test_invalid_bpf_filter_fails_fast(client):
    r = client.get(f"{API}/capture/interfaces")
    ifaces = r.json()
    if not ifaces:
        return

    target = ifaces[0]["id"]
    # Provide an illegal BPF filter syntax
    res = client.post(f"{API}/capture/start", json={
        "interface": target,
        "bpf_filter": "not a valid bpf syntax &&&&%",
        "packet_limit": 50,
    })
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "invalid_filter_or_interface"
