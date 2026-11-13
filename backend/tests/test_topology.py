from database import SessionLocal
from models.topology import TopologyLink, TopologyNode
from tests.conftest import API

T = f"{API}/topology"


def node(i, kind="pc"):
    return {"id": i, "label": i.upper(), "kind": kind}


def diamond(c):
    """A-R1-B (2ms+2ms) and A-R2-B (1ms+1ms, faster) plus isolated node Z."""
    body = {"name": "diamond", "nodes": [node("a"), node("r1", "router"), node("r2", "router"), node("b", "server"), node("z")],
            "links": [{"source": "a", "target": "r1", "latency_ms": 2}, {"source": "r1", "target": "b", "latency_ms": 2},
                      {"source": "a", "target": "r2", "latency_ms": 1}, {"source": "r2", "target": "b", "latency_ms": 1}]}
    return c.post(T, json=body).json()


def test_shortest_path_and_journey(client):
    tid = diamond(client)["id"]
    p = client.get(f"{T}/{tid}/path", params={"source": "a", "target": "b"}).json()
    assert p["path"] == ["a", "r2", "b"] and p["total_latency_ms"] == 2 and p["hops"] == 2
    j = client.post(f"{T}/{tid}/simulate", params={"source": "a", "target": "b"}).json()
    assert j["delivered"] and [h["to"] for h in j["hops"]] == ["r2", "b"] and j["hops"][-1]["event"] == "deliver"


def test_reroute_when_link_down_and_no_path(client):
    d = diamond(client)
    tid, fast = d["id"], next(l for l in d["links"] if l["source"] == "a" and l["target"] == "r2")
    assert client.patch(f"{T}/{tid}/links/{fast['id']}", json={"status": "down"}).json()["status"] == "down"
    assert client.get(f"{T}/{tid}/path", params={"source": "a", "target": "b"}).json()["path"] == ["a", "r1", "b"]
    none = client.get(f"{T}/{tid}/path", params={"source": "a", "target": "z"}).json()
    assert none["reachable"] is False and none["path"] == []
    j = client.post(f"{T}/{tid}/simulate", params={"source": "a", "target": "z"}).json()
    assert j["delivered"] is False and "No route" in j["reason"] and j["delivery_probability"] == 0.0


def test_connectivity(client):
    tid = diamond(client)["id"]
    c = client.get(f"{T}/{tid}/connectivity").json()
    assert c["connected"] is False and c["component_count"] == 2 and c["isolated_nodes"] == ["z"]


def test_loss_compounds(client):
    body = {"name": "lossy", "nodes": [node("a"), node("r", "router"), node("b")],
            "links": [{"source": "a", "target": "r", "loss_pct": 10}, {"source": "r", "target": "b", "loss_pct": 10}]}
    tid = client.post(T, json=body).json()["id"]
    assert client.post(f"{T}/{tid}/simulate", params={"source": "a", "target": "b"}).json()["delivery_probability"] == 0.81


def test_reference_validation(client):
    tid = diamond(client)["id"]
    assert client.post(f"{T}/{tid}/links", json={"source": "a", "target": "ghost"}).json()["error"]["code"] == "unknown_node"
    assert client.post(f"{T}/{tid}/links", json={"source": "a", "target": "a"}).json()["error"]["code"] == "self_link"
    assert client.post(f"{T}/{tid}/links", json={"source": "b", "target": "r1"}).json()["error"]["code"] == "duplicate_link"
    assert client.post(f"{T}/{tid}/nodes", json=node("a")).status_code == 409
    assert client.get(f"{T}/{tid}/path", params={"source": "a", "target": "ghost"}).status_code == 404
    assert client.get(f"{T}/999").status_code == 404
    bad = client.post(T, json={"name": "x", "nodes": [node("a")], "links": [{"source": "a", "target": "nope"}]})
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "unknown_node"


def test_delete_node_removes_its_links_and_persists(client):
    tid = diamond(client)["id"]
    assert client.delete(f"{T}/{tid}/nodes/r1").status_code == 204
    t = client.get(f"{T}/{tid}").json()
    assert "r1" not in {n["id"] for n in t["nodes"]} and len(t["links"]) == 2
    with SessionLocal() as db:  # verify directly in the database
        assert db.query(TopologyNode).filter_by(topology_id=tid).count() == 4
        assert db.query(TopologyLink).filter_by(topology_id=tid).count() == 2


def test_add_update_delete_node_and_link(client):
    tid = client.post(T, json={"name": "empty"}).json()["id"]
    n = client.post(f"{T}/{tid}/nodes", json={"label": "PC", "kind": "pc", "x": 5, "y": 6}).json()
    assert len(n["id"]) == 8
    assert client.patch(f"{T}/{tid}/nodes/{n['id']}", json={"x": 50}).json()["x"] == 50
    client.post(f"{T}/{tid}/nodes", json=node("s", "switch"))
    link = client.post(f"{T}/{tid}/links", json={"source": n["id"], "target": "s"}).json()
    assert client.delete(f"{T}/{tid}/links/{link['id']}").status_code == 204
    assert client.delete(f"{T}/{tid}/links/{link['id']}").status_code == 404
    assert client.delete(f"{T}/{tid}").status_code == 204 and client.get(f"{T}/{tid}").status_code == 404


def test_stateless_simulate_used_by_frontend(client):
    body = {"nodes": [node("a"), node("r", "router"), node("b")], "links": [{"source": "a", "target": "r"}, {"source": "r", "target": "b"}], "source": "a", "target": "b"}
    r = client.post(f"{T}/simulate", json=body).json()
    assert r["delivered"] and r["path"] == ["a", "r", "b"] and r["connectivity"]["connected"]
    body["nodes"][0].pop("id")
    assert client.post(f"{T}/simulate", json=body).json()["error"]["code"] == "node_id_required"
