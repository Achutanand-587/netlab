import heapq
import uuid
from collections import defaultdict, deque

from sqlalchemy import select
from sqlalchemy.orm import Session

from errors import AppError
from models.topology import Topology, TopologyLink, TopologyNode


def _nd(n) -> dict:
    return {"id": n.id, "label": n.label, "kind": n.kind, "x": n.x, "y": n.y}


def _ld(l) -> dict:
    return {"id": l.id, "source": l.source, "target": l.target, "latency_ms": l.latency_ms, "loss_pct": l.loss_pct, "status": l.status}


# ---------- pure graph logic ----------
def validate_graph(nodes: list[dict], links: list[dict]) -> None:
    ids = [n.get("id") for n in nodes]
    if any(i is None for i in ids):
        raise AppError(422, "node_id_required", "Every node needs an id.")
    if len(set(ids)) != len(ids):
        raise AppError(422, "duplicate_node", "Node ids must be unique.")
    seen = set()
    for l in links:
        for end in (l["source"], l["target"]):
            if end not in ids:
                raise AppError(422, "unknown_node", f"Link references unknown node '{end}'.")
        if l["source"] == l["target"]:
            raise AppError(422, "self_link", "A link cannot connect a node to itself.")
        key = frozenset((l["source"], l["target"]))
        if key in seen:
            raise AppError(422, "duplicate_link", f"Duplicate link between {l['source']} and {l['target']}.")
        seen.add(key)


def _adj(links: list[dict]):
    adj = defaultdict(list)
    for l in links:
        if l["status"] == "up":
            adj[l["source"]].append((l["target"], l))
            adj[l["target"]].append((l["source"], l))
    return adj


def _require(nodes: list[dict], *ids: str) -> None:
    known = {n["id"] for n in nodes}
    for i in ids:
        if i not in known:
            raise AppError(404, "node_not_found", f"Node '{i}' does not exist.")


def shortest_path(nodes, links, src, dst) -> dict | None:
    _require(nodes, src, dst)
    adj, best, prev, tick = _adj(links), {src: 0.0}, {}, 0
    heap = [(0.0, 0, src)]
    while heap:
        cost, _, u = heapq.heappop(heap)
        if u == dst:
            break
        if cost > best.get(u, float("inf")):
            continue
        for v, l in adj[u]:
            c = cost + l["latency_ms"]
            if c < best.get(v, float("inf")):
                best[v], prev[v] = c, (u, l)
                tick += 1
                heapq.heappush(heap, (c, tick, v))
    if dst not in best:
        return None
    path, used, cur = [dst], [], dst
    while cur != src:
        cur, l = prev[cur]
        path.append(cur)
        used.append(l)
    return {"path": path[::-1], "links": used[::-1], "total_latency_ms": round(best[dst], 3), "hops": len(path) - 1}


def connectivity(nodes, links) -> dict:
    adj, seen, comps = _adj(links), set(), []
    for n in nodes:
        if n["id"] in seen:
            continue
        comp, q = [], deque([n["id"]])
        seen.add(n["id"])
        while q:
            u = q.popleft()
            comp.append(u)
            for v, _ in adj[u]:
                if v not in seen:
                    seen.add(v)
                    q.append(v)
        comps.append(sorted(comp))
    return {"connected": len(comps) <= 1, "component_count": len(comps), "components": comps, "isolated_nodes": [c[0] for c in comps if len(c) == 1 and len(nodes) > 1]}


def journey(nodes, links, src, dst, size_bytes=64, protocol="ICMP") -> dict:
    r = shortest_path(nodes, links, src, dst)
    base = {"source": src, "target": dst, "protocol": protocol, "size_bytes": size_bytes}
    if r is None:
        return {**base, "delivered": False, "reason": f"No route from '{src}' to '{dst}': no chain of links that are up connects them.", "path": [], "hops": [],
                "total_latency_ms": None, "delivery_probability": 0.0}
    cum, prob, hops = 0.0, 1.0, []
    for i, l in enumerate(r["links"]):
        cum += l["latency_ms"]
        prob *= 1 - l["loss_pct"] / 100
        hops.append({"hop": i + 1, "from": r["path"][i], "to": r["path"][i + 1], "link_id": l["id"], "latency_ms": l["latency_ms"],
                     "cumulative_latency_ms": round(cum, 3), "event": "deliver" if i == len(r["links"]) - 1 else "forward"})
    return {**base, "delivered": True, "reason": "Delivered along the lowest-latency path." if hops else "Source and target are the same node.", "path": r["path"],
            "hops": hops, "total_latency_ms": r["total_latency_ms"], "delivery_probability": round(prob, 6)}


# ---------- persistence ----------
def _load(db: Session, tid: int):
    t = db.get(Topology, tid)
    if not t:
        raise AppError(404, "topology_not_found", f"Topology {tid} does not exist.")
    nodes = db.execute(select(TopologyNode).where(TopologyNode.topology_id == tid).order_by(TopologyNode.id)).scalars().all()
    links = db.execute(select(TopologyLink).where(TopologyLink.topology_id == tid).order_by(TopologyLink.id)).scalars().all()
    return t, nodes, links


def graph(db: Session, tid: int) -> tuple[list[dict], list[dict]]:
    _, n, l = _load(db, tid)
    return [_nd(x) for x in n], [_ld(x) for x in l]


def out(db: Session, tid: int) -> dict:
    t, n, l = _load(db, tid)
    return {"id": t.id, "name": t.name, "description": t.description, "created_at": t.created_at, "updated_at": t.updated_at,
            "nodes": [_nd(x) for x in n], "links": [_ld(x) for x in l]}


def list_all(db: Session) -> list[dict]:
    return [{"id": t.id, "name": t.name, "description": t.description, "updated_at": t.updated_at} for t in db.execute(select(Topology).order_by(Topology.id.desc())).scalars()]


def create(db: Session, name: str, description: str, nodes: list[dict], links: list[dict]) -> dict:
    nodes = [{**n, "id": n.get("id") or uuid.uuid4().hex[:8]} for n in nodes]
    links = [{"status": "up", "latency_ms": 1.0, "loss_pct": 0.0, **l} for l in links]
    validate_graph(nodes, links)
    t = Topology(name=name, description=description)
    db.add(t)
    db.flush()
    db.add_all([TopologyNode(topology_id=t.id, **n) for n in nodes])
    db.add_all([TopologyLink(topology_id=t.id, **l) for l in links])
    db.commit()
    return out(db, t.id)


def delete(db: Session, tid: int) -> None:
    t, _, _ = _load(db, tid)
    db.query(TopologyLink).filter(TopologyLink.topology_id == tid).delete()
    db.query(TopologyNode).filter(TopologyNode.topology_id == tid).delete()
    db.delete(t)
    db.commit()


def add_node(db: Session, tid: int, data: dict) -> dict:
    t, nodes, _ = _load(db, tid)
    if len(nodes) >= 200:
        raise AppError(422, "too_many_nodes", "A topology can have at most 200 nodes.")
    nid = data.get("id") or uuid.uuid4().hex[:8]
    if any(n.id == nid for n in nodes):
        raise AppError(409, "duplicate_node", f"Node '{nid}' already exists.")
    n = TopologyNode(topology_id=tid, **{**data, "id": nid})
    db.add(n)
    t.name = t.name  # touch for updated_at
    db.commit()
    return _nd(n)


def _node(db: Session, tid: int, nid: str) -> TopologyNode:
    _load(db, tid)
    n = db.get(TopologyNode, (tid, nid))
    if not n:
        raise AppError(404, "node_not_found", f"Node '{nid}' does not exist in topology {tid}.")
    return n


def update_node(db: Session, tid: int, nid: str, data: dict) -> dict:
    n = _node(db, tid, nid)
    for k, v in data.items():
        setattr(n, k, v)
    db.commit()
    return _nd(n)


def delete_node(db: Session, tid: int, nid: str) -> None:
    n = _node(db, tid, nid)
    db.query(TopologyLink).filter(TopologyLink.topology_id == tid, (TopologyLink.source == nid) | (TopologyLink.target == nid)).delete(synchronize_session=False)
    db.delete(n)
    db.commit()


def add_link(db: Session, tid: int, data: dict) -> dict:
    _, nodes, links = _load(db, tid)
    validate_graph([_nd(n) for n in nodes], [_ld(l) for l in links] + [data])
    l = TopologyLink(topology_id=tid, **data)
    db.add(l)
    db.commit()
    return _ld(l)


def _link(db: Session, tid: int, lid: int) -> TopologyLink:
    _load(db, tid)
    l = db.get(TopologyLink, lid)
    if not l or l.topology_id != tid:
        raise AppError(404, "link_not_found", f"Link {lid} does not exist in topology {tid}.")
    return l


def update_link(db: Session, tid: int, lid: int, data: dict) -> dict:
    l = _link(db, tid, lid)
    for k, v in data.items():
        setattr(l, k, v)
    db.commit()
    return _ld(l)


def delete_link(db: Session, tid: int, lid: int) -> None:
    db.delete(_link(db, tid, lid))
    db.commit()
