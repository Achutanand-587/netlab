import pytest
from tests.conftest import API


@pytest.mark.parametrize("name", ["tcp", "udp", "dns", "dhcp", "arp", "http", "icmp"])
def test_each_protocol(client, name):
    r = client.get(f"{API}/protocols/{name}").json()
    ids = {n["id"] for n in r["nodes"]}
    assert [s["index"] for s in r["steps"]] == list(range(1, len(r["steps"]) + 1)) and r["educational"]
    for s in r["steps"]:
        assert {s["from"], s["to"], *s["via"]} <= ids and s["explanation"] and s["packet"]["src_ip"]


def test_tcp_handshake_order_and_alias(client):
    steps = client.get(f"{API}/protocols/tcp-handshake").json()["steps"]
    assert [s["title"] for s in steps[:3]] == ["SYN", "SYN-ACK", "ACK"] and steps[1]["packet"]["fields"]["ack"] == 1001


def test_list_and_unknown(client):
    assert len(client.get(f"{API}/protocols").json()) == 7
    r = client.get(f"{API}/protocols/gopher")
    assert r.status_code == 404 and r.json()["error"]["code"] == "protocol_not_found"
