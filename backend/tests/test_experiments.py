from database import SessionLocal
from models.experiment import Experiment
from tests.conftest import API

E = f"{API}/experiments"


def make(c, name="CRC run", module="error_detection", **m):
    return c.post(E, json={"module": module, "name": name, "inputs": {"data": "1011"}, "results": {"ok": True}, "metrics": m or {"detection_rate": 0.9, "latency_ms": 12}, "notes": "n"})


def test_create_persists_in_database(client):
    r = make(client)
    assert r.status_code == 201 and r.json()["id"] == 1 and r.json()["created_at"]
    with SessionLocal() as db:  # a separate session proves the row was committed
        row = db.get(Experiment, 1)
        assert row.name == "CRC run" and row.metrics["detection_rate"] == 0.9 and row.inputs == {"data": "1011"}
    assert client.get(f"{E}/1").json()["results"] == {"ok": True}


def test_list_filter_paginate_delete(client):
    for i in range(3):
        make(client, f"e{i}")
    make(client, "s", module="subnetting")
    assert client.get(E, params={"module": "subnetting"}).json()["total"] == 1
    page = client.get(E, params={"page_size": 2}).json()
    assert page["total"] == 4 and page["pages"] == 2 and page["items"][0]["name"] == "s"  # newest first
    assert client.delete(f"{E}/1").status_code == 204 and client.get(f"{E}/1").status_code == 404


def test_compare(client):
    make(client, "a", detection_rate=0.90, latency_ms=12)
    make(client, "b", detection_rate=0.95, throughput=3)
    r = client.post(f"{E}/compare", json={"ids": [1, 2]}).json()
    rows = {m["name"]: m for m in r["metrics"]}
    assert rows["detection_rate"]["delta_vs_first"] == [0.0, 0.05] and rows["latency_ms"]["values"] == [12, None] and rows["throughput"]["values"] == [None, 3]
    miss = client.post(f"{E}/compare", json={"ids": [1, 99]})
    assert miss.status_code == 404 and miss.json()["error"]["details"]["missing_ids"] == [99]
    assert client.post(f"{E}/compare", json={"ids": [1]}).status_code == 422


def test_csv_export_neutralises_formulas(client):
    make(client, name="=HYPERLINK(\"http://x\")", rate=0.5)
    r = client.get(f"{E}/export.csv")
    assert r.headers["content-type"].startswith("text/csv") and "metric:rate" in r.text.splitlines()[0]
    assert "'=HYPERLINK" in r.text and ",=HYPERLINK" not in r.text


def test_report(client):
    make(client)
    j = client.get(f"{E}/1/report").json()
    assert "| detection_rate | 0.9 |" in j["markdown"] and j["title"].startswith("Experiment report")
    md = client.get(f"{E}/1/report", params={"format": "markdown"})
    assert md.headers["content-type"].startswith("text/markdown") and md.text.startswith("# Experiment report")
    assert client.get(f"{E}/99/report").status_code == 404


def test_validation_and_frontend_alias(client):
    assert client.post(E, json={"module": "nope", "name": "x"}).status_code == 422
    assert client.post(E, json={"module": "other", "name": ""}).status_code == 422
    assert client.post(E, json={"module": "other", "name": "x", "metrics": {"k": [1]}}).status_code == 422
    make(client)
    assert client.get(f"{API}/research/experiments").json()["total"] == 1  # path used by the existing frontend
