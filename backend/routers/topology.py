from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from database import get_db
from schemas.topology import GraphSimulation, LinkCreate, LinkOut, LinkUpdate, NodeCreate, NodeOut, NodeUpdate, TopologyCreate, TopologyOut, TopologySummary
from services import topology as svc

router = APIRouter(prefix="/topology", tags=["topology"])


@router.post("/simulate")
def simulate_stateless(req: GraphSimulation) -> dict:
    """Stateless packet-journey simulation for a graph sent in the request (used by the existing frontend)."""
    nodes = [n.model_dump() for n in req.nodes]
    links = [{**l.model_dump(), "id": i + 1} for i, l in enumerate(req.links)]
    svc.validate_graph(nodes, links)
    return {**svc.journey(nodes, links, req.source, req.target, req.size_bytes, req.protocol), "connectivity": svc.connectivity(nodes, links)}


@router.get("", response_model=list[TopologySummary])
def list_topologies(db: Session = Depends(get_db)) -> list[dict]:
    return svc.list_all(db)


@router.post("", response_model=TopologyOut, status_code=201)
def create(req: TopologyCreate, db: Session = Depends(get_db)) -> dict:
    return svc.create(db, req.name, req.description, [n.model_dump() for n in req.nodes], [l.model_dump() for l in req.links])


@router.get("/{tid}", response_model=TopologyOut)
def read(tid: int, db: Session = Depends(get_db)) -> dict:
    return svc.out(db, tid)


@router.delete("/{tid}", status_code=204)
def delete(tid: int, db: Session = Depends(get_db)) -> Response:
    svc.delete(db, tid)
    return Response(status_code=204)


@router.post("/{tid}/nodes", response_model=NodeOut, status_code=201)
def add_node(tid: int, req: NodeCreate, db: Session = Depends(get_db)) -> dict:
    return svc.add_node(db, tid, req.model_dump())


@router.patch("/{tid}/nodes/{nid}", response_model=NodeOut)
def update_node(tid: int, nid: str, req: NodeUpdate, db: Session = Depends(get_db)) -> dict:
    return svc.update_node(db, tid, nid, req.model_dump(exclude_unset=True))


@router.delete("/{tid}/nodes/{nid}", status_code=204)
def delete_node(tid: int, nid: str, db: Session = Depends(get_db)) -> Response:
    svc.delete_node(db, tid, nid)
    return Response(status_code=204)


@router.post("/{tid}/links", response_model=LinkOut, status_code=201)
def add_link(tid: int, req: LinkCreate, db: Session = Depends(get_db)) -> dict:
    return svc.add_link(db, tid, req.model_dump())


@router.patch("/{tid}/links/{lid}", response_model=LinkOut)
def update_link(tid: int, lid: int, req: LinkUpdate, db: Session = Depends(get_db)) -> dict:
    return svc.update_link(db, tid, lid, req.model_dump(exclude_unset=True))


@router.delete("/{tid}/links/{lid}", status_code=204)
def delete_link(tid: int, lid: int, db: Session = Depends(get_db)) -> Response:
    svc.delete_link(db, tid, lid)
    return Response(status_code=204)


@router.get("/{tid}/connectivity")
def connectivity(tid: int, db: Session = Depends(get_db)) -> dict:
    return svc.connectivity(*svc.graph(db, tid))


@router.get("/{tid}/path")
def path(tid: int, source: str = Query(max_length=40), target: str = Query(max_length=40), db: Session = Depends(get_db)) -> dict:
    nodes, links = svc.graph(db, tid)
    r = svc.shortest_path(nodes, links, source, target)
    return {"source": source, "target": target, "reachable": r is not None, **(r or {"path": [], "links": [], "total_latency_ms": None, "hops": 0})}


@router.post("/{tid}/simulate")
def simulate(tid: int, source: str = Query(max_length=40), target: str = Query(max_length=40), size_bytes: int = Query(64, ge=1, le=65535),
             protocol: str = Query("ICMP", max_length=16), db: Session = Depends(get_db)) -> dict:
    nodes, links = svc.graph(db, tid)
    return svc.journey(nodes, links, source, target, size_bytes, protocol)
