import pytest
from errors import AppError
from services import subnetting as s


def test_calculate_boundaries_and_special_prefixes():
    # /0 - entire IPv4 internet
    res0 = s.calculate("0.0.0.0", 0)
    assert res0["total_addresses"] == 4294967296
    assert res0["usable_hosts"] == 4294967294
    assert res0["network"] == "0.0.0.0"
    assert res0["broadcast"] == "255.255.255.255"
    assert res0["first_host"] == "0.0.0.1"
    assert res0["last_host"] == "255.255.255.254"

    # /1
    res1 = s.calculate("10.0.0.0", 1)
    assert res1["total_addresses"] == 2147483648
    assert res1["usable_hosts"] == 2147483646

    # /8 Class A
    res8 = s.calculate("10.5.4.3", 8)
    assert res8["network"] == "10.0.0.0"
    assert res8["broadcast"] == "10.255.255.255"
    assert res8["total_addresses"] == 16777216
    assert res8["network_class"] == "Class A"
    assert res8["is_private"] is True

    # /16 Class B
    res16 = s.calculate("172.16.50.1", 16)
    assert res16["network"] == "172.16.0.0"
    assert res16["broadcast"] == "172.16.255.255"
    assert res16["usable_hosts"] == 65534
    assert res16["network_class"] == "Class B"

    # /24 Class C
    res24 = s.calculate("192.168.1.100", 24)
    assert res24["network"] == "192.168.1.0"
    assert res24["broadcast"] == "192.168.1.255"
    assert res24["usable_hosts"] == 254
    assert res24["has_broadcast"] is True

    # /30 Point-to-Point with broadcast
    res30 = s.calculate("192.168.1.5", 30)
    assert res30["network"] == "192.168.1.4"
    assert res30["broadcast"] == "192.168.1.7"
    assert res30["first_host"] == "192.168.1.5"
    assert res30["last_host"] == "192.168.1.6"
    assert res30["usable_hosts"] == 2
    assert res30["has_broadcast"] is True

    # /31 RFC 3021 Point-to-Point link (both IPs usable, no broadcast)
    res31 = s.calculate("192.168.1.0", 31)
    assert res31["total_addresses"] == 2
    assert res31["usable_hosts"] == 2
    assert res31["first_host"] == "192.168.1.0"
    assert res31["last_host"] == "192.168.1.1"
    assert res31["has_broadcast"] is False

    # /32 Host route (1 address, no broadcast)
    res32 = s.calculate("192.168.1.50", 32)
    assert res32["total_addresses"] == 1
    assert res32["usable_hosts"] == 1
    assert res32["first_host"] == "192.168.1.50"
    assert res32["last_host"] == "192.168.1.50"
    assert res32["has_broadcast"] is False

    # IP containing CIDR notation
    res_cidr = s.calculate("192.168.10.37/26", 24)
    assert res_cidr["prefix"] == 26
    assert res_cidr["network"] == "192.168.10.0"
    assert res_cidr["usable_hosts"] == 62


def test_calculate_invalid_inputs():
    # Octet > 255
    with pytest.raises(AppError) as exc:
        s.calculate("256.0.0.1", 24)
    assert exc.value.code == "invalid_ip"

    # Negative octet
    with pytest.raises(AppError) as exc:
        s.calculate("-1.0.0.1", 24)
    assert exc.value.code == "invalid_ip"

    # Incomplete octet count
    with pytest.raises(AppError) as exc:
        s.calculate("192.168.1", 24)
    assert exc.value.code == "invalid_ip"

    # Non-numeric
    with pytest.raises(AppError) as exc:
        s.calculate("invalid.host.address", 24)
    assert exc.value.code == "invalid_ip"

    # Prefix out of range
    with pytest.raises(AppError) as exc:
        s.calculate("192.168.1.1", 33)
    assert exc.value.code == "invalid_prefix"

    with pytest.raises(AppError) as exc:
        s.calculate("192.168.1.1", -1)
    assert exc.value.code == "invalid_prefix"


def test_split_flsm():
    # /24 into /26 gives 4 subnets with 62 usable hosts
    res = s.split("192.168.1.0", 24, 26, limit=256)
    assert res["subnet_count"] == 4
    assert len(res["subnets"]) == 4
    assert res["subnets"][0]["cidr"] == "192.168.1.0/26"
    assert res["subnets"][0]["usable_hosts"] == 62
    assert res["subnets"][1]["cidr"] == "192.168.1.64/26"
    assert res["subnets"][2]["cidr"] == "192.168.1.128/26"
    assert res["subnets"][3]["cidr"] == "192.168.1.192/26"

    # /32 cannot be subdivided
    with pytest.raises(AppError) as exc:
        s.split("192.168.1.1", 32, 33)
    assert exc.value.code == "impossible_split"

    # new_prefix <= prefix
    with pytest.raises(AppError) as exc:
        s.split("192.168.1.0", 24, 24)
    assert exc.value.code == "invalid_prefix"

    with pytest.raises(AppError) as exc:
        s.split("192.168.1.0", 24, 22)
    assert exc.value.code == "invalid_prefix"


def test_vlsm_success():
    reqs = [
        {"name": "Engineering", "needed_hosts": 50},
        {"name": "Sales", "needed_hosts": 25},
        {"name": "Support", "needed_hosts": 12},
        {"name": "WAN", "needed_hosts": 2},
    ]
    res = s.vlsm("192.168.1.0/24", reqs)
    assert len(res["allocated"]) == 4

    # Check largest to smallest allocation order
    allocs = res["allocated"]
    assert allocs[0]["name"] == "Engineering"
    assert allocs[0]["cidr"] == "192.168.1.0/26"
    assert allocs[0]["allocated_hosts"] == 62

    assert allocs[1]["name"] == "Sales"
    assert allocs[1]["cidr"] == "192.168.1.64/27"
    assert allocs[1]["allocated_hosts"] == 30

    assert allocs[2]["name"] == "Support"
    assert allocs[2]["cidr"] == "192.168.1.96/28"
    assert allocs[2]["allocated_hosts"] == 14

    assert allocs[3]["name"] == "WAN"
    assert allocs[3]["cidr"] == "192.168.1.112/30"
    assert allocs[3]["allocated_hosts"] == 2

    # Remaining space is 256 - (64 + 32 + 16 + 4) = 140 addresses
    assert res["remaining_addresses"] == 140


def test_vlsm_impossible_single_requirement_exceeds_parent():
    # 300 hosts requires /23 (512 addresses), parent is /24 (256 addresses)
    with pytest.raises(AppError) as exc:
        s.vlsm("192.168.1.0/24", [{"name": "MegaLAN", "needed_hosts": 300}])
    assert exc.value.code == "insufficient_space"
    msg = exc.value.message
    assert "MegaLAN" in msg
    assert "300" in msg
    assert "/23" in msg
    assert "192.168.1.0/24" in msg


def test_vlsm_impossible_total_capacity_overflow():
    # 120 hosts (/25=128), 120 hosts (/25=128), 30 hosts (/27=32) -> 288 addresses > 256 parent
    reqs = [
        {"name": "Subnet A", "needed_hosts": 120},
        {"name": "Subnet B", "needed_hosts": 120},
        {"name": "Subnet C", "needed_hosts": 30},
    ]
    with pytest.raises(AppError) as exc:
        s.vlsm("192.168.1.0/24", reqs)
    assert exc.value.code == "insufficient_space"
    msg = exc.value.message
    assert "288" in msg
    assert "256" in msg
    assert "32 addresses" in msg
    assert "/23" in msg


def test_vlsm_impossible_invalid_inputs():
    # Missing prefix in CIDR
    with pytest.raises(AppError) as exc:
        s.vlsm("192.168.1.0", [{"name": "A", "needed_hosts": 10}])
    assert exc.value.code == "invalid_cidr"

    # Parent is /31
    with pytest.raises(AppError) as exc:
        s.vlsm("192.168.1.0/31", [{"name": "A", "needed_hosts": 1}])
    assert exc.value.code == "insufficient_space"

    # Zero host requirement
    with pytest.raises(AppError) as exc:
        s.vlsm("192.168.1.0/24", [{"name": "ZeroHosts", "needed_hosts": 0}])
    assert exc.value.code == "invalid_host_requirement"

    # Negative host requirement
    with pytest.raises(AppError) as exc:
        s.vlsm("192.168.1.0/24", [{"name": "NegHosts", "needed_hosts": -5}])
    assert exc.value.code == "invalid_host_requirement"

    # Empty requirements
    with pytest.raises(AppError) as exc:
        s.vlsm("192.168.1.0/24", [])
    assert exc.value.code == "invalid_requirements"


def test_vlsm_power_of_two_recommendation_exact_example():
    """Regression test for user's exact example:
    Parent: 192.168.1.0/24
    - Engineering: 150 hosts (/24 = 256 addresses)
    - Sales: 120 hosts (/25 = 128 addresses)
    Total = 384 addresses > 256 parent capacity.
    The recommendation must NOT suggest simply reducing 128 hosts.
    Instead, it must explain the power-of-2 block tier constraint:
    reducing Engineering from 150 to 126 hosts allows it to fit into a /25 (128 addresses),
    bringing the total allocated addresses to 256, which fits in the /24.
    """
    reqs = [
        {"name": "Engineering", "needed_hosts": 150},
        {"name": "Sales", "needed_hosts": 120},
    ]
    with pytest.raises(AppError) as exc:
        s.vlsm("192.168.1.0/24", reqs)

    assert exc.value.code == "insufficient_space"
    msg = exc.value.message
    # Check that it identifies the total addresses needed (384) and deficit (128)
    assert "384 addresses" in msg
    assert "256 addresses" in msg
    assert "128 addresses" in msg
    # Check power-of-2 block breakdown
    assert "'Engineering' requires a /24 block (256 addresses for 150 hosts)" in msg
    assert "'Sales' requires a /25 block (128 addresses for 120 hosts)" in msg
    # Check that recommendation specifically explains reducing Engineering to 126 hosts
    assert "126 hosts" in msg
    assert "so it fits into a /25 block (128 addresses" in msg

    # Now verify that when Engineering IS reduced to 126 hosts, it actually succeeds!
    valid_reqs = [
        {"name": "Engineering", "needed_hosts": 126},
        {"name": "Sales", "needed_hosts": 120},
    ]
    res = s.vlsm("192.168.1.0/24", valid_reqs)
    assert len(res["allocated"]) == 2
    assert res["allocated"][0]["name"] == "Engineering"
    assert res["allocated"][0]["cidr"] == "192.168.1.0/25"
    assert res["allocated"][0]["allocated_hosts"] == 126
    assert res["allocated"][1]["name"] == "Sales"
    assert res["allocated"][1]["cidr"] == "192.168.1.128/25"
    assert res["allocated"][1]["allocated_hosts"] == 126
    assert res["remaining_addresses"] == 0
