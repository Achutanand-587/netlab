from tests.conftest import API


def test_health_matches_frontend_expectation(client):
    r = client.get(f"{API}/health").json()
    assert r["status"] == "ok" and r["database"] == "ok" and r["live_capture_enabled"] is True


def test_consistent_error_envelope(client):
    r = client.post(f"{API}/subnetting/calculate", json={"ip": "bad", "prefix": 99})
    e = r.json()["error"]
    assert r.status_code == 422 and e["code"] == "validation_error"
    assert {d["field"] for d in e["details"]} == {"ip", "prefix"} and all("message" in d for d in e["details"])
    nf = client.get(f"{API}/nope")
    assert nf.status_code == 404 and nf.json()["error"]["code"] == "not_found"
    assert client.post(f"{API}/subnetting/calculate", content="{not json", headers={"content-type": "application/json"}).status_code == 422


def test_cors_allows_vite_origin_only(client):
    ok = client.options(f"{API}/health", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.options(f"{API}/health", headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in bad.headers


def test_openapi_docs_and_versioned_paths(client):
    spec = client.get("/openapi.json").json()
    assert all(p.startswith("/api/v1/") for p in spec["paths"]) and "/api/v1/research/experiments" not in spec["paths"]
    assert client.get("/docs").status_code == 200
