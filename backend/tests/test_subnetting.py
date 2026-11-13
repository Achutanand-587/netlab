import pytest
from tests.conftest import API


def calc(c, ip, p):
    return c.post(f"{API}/subnetting/calculate", json={"ip": ip, "prefix": p})


def test_standard_24(client):
    r = calc(client, "192.168.10.37", 24).json()
    assert (r["network"], r["broadcast"], r["subnet_mask"]) == ("192.168.10.0", "192.168.10.255", "255.255.255.0")
    assert (r["first_host"], r["last_host"], r["usable_hosts"], r["total_addresses"]) == ("192.168.10.1", "192.168.10.254", 254, 256)
    assert r["binary"]["mask"] == "11111111.11111111.11111111.00000000" and r["is_private"] and r["has_broadcast"]
    assert r["network_class"] == "Class C" and r["ip_type"] == "Private (RFC 1918)"


def test_boundary_prefixes(client):
    r0 = calc(client, "10.1.2.3", 0).json()
    assert (r0["network"], r0["usable_hosts"], r0["total_addresses"]) == ("0.0.0.0", 2**32 - 2, 2**32)
    r30 = calc(client, "10.0.0.5", 30).json()
    assert (r30["first_host"], r30["last_host"], r30["usable_hosts"]) == ("10.0.0.5", "10.0.0.6", 2)
    r31 = calc(client, "10.0.0.5", 31).json()
    assert (r31["first_host"], r31["last_host"], r31["usable_hosts"], r31["has_broadcast"]) == ("10.0.0.4", "10.0.0.5", 2, False)
    r32 = calc(client, "10.0.0.5", 32).json()
    assert (r32["first_host"], r32["last_host"], r32["usable_hosts"]) == ("10.0.0.5", "10.0.0.5", 1)


@pytest.mark.parametrize("ip,p", [("999.1.1.1", 24), ("1.2.3", 24), ("abc", 8), ("1.2.3.4", 33), ("1.2.3.4", -1), ("1.2.3.4", "x"), ("01.2.3.4", 8)])
def test_invalid_inputs(client, ip, p):
    r = calc(client, ip, p)
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


def test_split(client):
    r = client.post(f"{API}/subnetting/split", json={"ip": "192.168.1.0", "prefix": 24, "new_prefix": 26}).json()
    assert r["subnet_count"] == 4 and [s["cidr"] for s in r["subnets"]] == ["192.168.1.0/26", "192.168.1.64/26", "192.168.1.128/26", "192.168.1.192/26"]
    assert r["subnets"][1]["first_host"] == "192.168.1.65" and r["subnets"][1]["usable_hosts"] == 62 and not r["truncated"]


def test_split_limits(client):
    r = client.post(f"{API}/subnetting/split", json={"ip": "10.0.0.0", "prefix": 8, "new_prefix": 24, "limit": 10}).json()
    assert r["subnet_count"] == 65536 and r["returned"] == 10 and r["truncated"]
    bad = client.post(f"{API}/subnetting/split", json={"ip": "10.0.0.0", "prefix": 24, "new_prefix": 24})
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "invalid_prefix"


def test_vlsm_allocation_success(client):
    req = {
        "parent_cidr": "192.168.1.0/24",
        "requirements": [
            {"name": "Engineering", "needed_hosts": 50},
            {"name": "Sales", "needed_hosts": 25},
            {"name": "Support", "needed_hosts": 12},
            {"name": "Router Link", "needed_hosts": 2},
        ],
    }
    res = client.post(f"{API}/subnetting/vlsm", json=req)
    assert res.status_code == 200
    data = res.json()
    assert len(data["allocated"]) == 4
    # Highest needed hosts should be allocated first
    eng = data["allocated"][0]
    assert eng["name"] == "Engineering" and eng["prefix"] == 26 and eng["allocated_hosts"] == 62
    sales = data["allocated"][1]
    assert sales["name"] == "Sales" and sales["prefix"] == 27 and sales["allocated_hosts"] == 30
    link = data["allocated"][3]
    assert link["name"] == "Router Link" and link["prefix"] == 30 and link["allocated_hosts"] == 2
    assert data["remaining_addresses"] > 0


def test_vlsm_capacity_exceeded(client):
    req = {
        "parent_cidr": "192.168.1.0/28",  # only 16 addresses
        "requirements": [
            {"name": "Large Group", "needed_hosts": 50},
        ],
    }
    res = client.post(f"{API}/subnetting/vlsm", json=req)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "insufficient_space"
