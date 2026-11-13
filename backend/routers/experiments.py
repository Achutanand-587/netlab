from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from database import get_db
from schemas.common import Page, paginate
from schemas.experiments import CompareRequest, CompareResult, ExperimentCreate, ExperimentOut, Module
from services import experiments as svc

router = APIRouter(tags=["experiments"])


@router.post("", response_model=ExperimentOut, status_code=201)
def create(req: ExperimentCreate, db: Session = Depends(get_db)) -> dict:
    return svc.create(db, req.model_dump())


@router.get("", response_model=Page[ExperimentOut])
def list_(module: Module | None = None, page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=200), db: Session = Depends(get_db)) -> dict:
    items, total = svc.list_(db, module, page, page_size)
    return paginate(items, total, page, page_size)


@router.get("/export.csv")
def export(module: Module | None = None, db: Session = Depends(get_db)) -> Response:
    return Response(svc.export_csv(db, module), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="experiments.csv"'})


@router.post("/compare", response_model=CompareResult)
def compare(req: CompareRequest, db: Session = Depends(get_db)) -> dict:
    return svc.compare(db, req.ids)


@router.get("/{eid}", response_model=ExperimentOut)
def read(eid: int, db: Session = Depends(get_db)) -> dict:
    from services.experiments import _out
    return _out(svc.get(db, eid))


@router.delete("/{eid}", status_code=204)
def delete(eid: int, db: Session = Depends(get_db)) -> Response:
    svc.delete(db, eid)
    return Response(status_code=204)


@router.get("/{eid}/report", response_model=None)
def report(eid: int, format: str = Query("json", pattern="^(json|markdown)$"), db: Session = Depends(get_db)) -> Response | dict:
    r = svc.report(db, eid)
    return Response(r["markdown"], media_type="text/markdown") if format == "markdown" else r
