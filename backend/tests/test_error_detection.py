from tests.conftest import API


def enc(c, **kw):
    return c.post(f"{API}/error-detection/encode", json=kw)


def test_parity(client):
    even = enc(client, data="1011001", algorithm="parity-even").json()
    assert even["redundant_bits"] == "0" and even["verification"]["passed"]  # four 1s
    odd = enc(client, data="1011001", algorithm="parity-odd").json()
    assert odd["redundant_bits"] == "1" and odd["verification"]["passed"]
    assert enc(client, data="1011000", algorithm="parity", parity_type="even").json()["redundant_bits"] == "1"


def test_parity_detects_single_flip_misses_double(client):
    one = enc(client, data="1011001", algorithm="parity", flip_positions=[2]).json()
    assert one["verification"]["error_detected"] and one["received_bits"] != one["transmitted_bits"]
    two = enc(client, data="1011001", algorithm="parity", flip_positions=[0, 1]).json()
    assert two["verification"]["undetected_error"]  # known limitation of parity


def test_internet_checksum_rfc1071_example(client):
    data = "".join(f"{b:08b}" for b in bytes.fromhex("0001f203f4f5f6f7"))
    r = enc(client, data=data, algorithm="checksum").json()
    assert r["redundant_bits"] == f"{0x220D:016b}" and r["verification"]["passed"]
    bad = enc(client, data=data, algorithm="checksum", flip_positions=[5]).json()
    assert bad["verification"]["error_detected"]


def test_checksum_pads_to_16_bits(client):
    r = enc(client, data="101", algorithm="checksum").json()
    assert r["padded_data_bits"] == "1010000000000000" and len(r["transmitted_bits"]) == 32


def test_crc_textbook_example(client):
    r = enc(client, data="1101011011", algorithm="crc", generator="10011").json()
    assert r["redundant_bits"] == "1110" and r["transmitted_bits"] == "11010110111110" and r["verification"]["passed"]
    flipped = enc(client, data="1101011011", algorithm="crc", generator="10011", flip_positions=[3]).json()
    assert flipped["verification"]["error_detected"]


def test_crc_burst_error_detected(client):
    r = enc(client, data="110101101101", algorithm="crc", generator="1011", flip_positions=[2, 3, 4]).json()
    assert r["verification"]["error_detected"]


def test_verify_endpoint(client):
    ok = client.post(f"{API}/error-detection/verify", json={"received_bits": "11010110111110", "algorithm": "crc", "generator": "10011"}).json()
    assert ok["verification"]["passed"]
    bad = client.post(f"{API}/error-detection/verify", json={"received_bits": "11010110111111", "algorithm": "crc", "generator": "10011"}).json()
    assert bad["verification"]["error_detected"]


def test_validation(client):
    assert enc(client, data="10201", algorithm="crc").status_code == 422
    assert enc(client, data="", algorithm="crc").status_code == 422
    assert enc(client, data="101", algorithm="md5").status_code == 422
    assert enc(client, data="101", algorithm="crc", generator="0011").status_code == 422
    r = enc(client, data="101", algorithm="parity", flip_positions=[99])
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_flip_position"
    assert client.post(f"{API}/error-detection/verify", json={"received_bits": "101", "algorithm": "checksum"}).status_code == 422


def test_two_d_parity_matrix(client):
    res = client.post(f"{API}/error-detection/2d-parity", json={
        "data": "10011011101101",
        "row_width": 7,
        "parity_type": "even",
        "flip_positions": [2],  # flip single bit in row 0, col 2
    })
    assert res.status_code == 200
    data = res.json()
    assert data["error_detected"] is True
    assert data["can_correct_single_bit"] is True
    assert data["corrected_position"] == [0, 2]


def test_error_detection_experiment(client):
    res = client.post(f"{API}/error-detection/experiment", json={
        "data_length": 32,
        "trials": 50,
        "flip_count": 2,
        "algorithms": ["parity-even", "checksum", "crc-8"],
        "seed": 42,
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["stats"]) == 3
    # With 2 bit flips, parity-even should miss 100% of errors
    par_stat = next(s for s in data["stats"] if s["algorithm"] == "parity-even")
    assert par_stat["detection_rate_pct"] == 0.0
    assert par_stat["missed_rate_pct"] == 100.0
