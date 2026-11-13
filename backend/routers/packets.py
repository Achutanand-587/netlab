from fastapi import APIRouter, Depends, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from config import settings
from database import get_db
from errors import AppError
from schemas.common import paginate
from services import packets as svc
from services.csvutil import to_csv

router = APIRouter(prefix="/packets", tags=["packets"])


def _cap(c) -> dict:
    return {"id": c.id, "filename": c.filename, "source": c.source, "size_bytes": c.size_bytes, "packet_count": c.packet_count, "created_at": c.created_at}


async def _read_limited(file: UploadFile) -> bytes:
    buf = bytearray()
    while chunk := await file.read(1 << 20):
        buf += chunk
        if len(buf) > settings.max_upload_bytes:
            raise AppError(413, "file_too_large", f"File exceeds the {settings.max_upload_bytes // (1024 * 1024)} MB limit.")
    return bytes(buf)


@router.post("/upload", status_code=201)
async def upload(file: UploadFile, db: Session = Depends(get_db)) -> dict:
    name = svc.clean_filename(file.filename)
    data = await _read_limited(file)
    svc.validate_upload(name, data)
    return _cap(await run_in_threadpool(svc.ingest, db, name, "upload", data))


@router.get("/samples")
def samples() -> list[dict]:
    return [{"name": k, "title": v["title"]} for k, v in svc.SAMPLES.items()]


@router.post("/samples/{name}/load", status_code=201)
def load_sample(name: str, db: Session = Depends(get_db)) -> dict:
    return _cap(svc.load_sample(db, name))


@router.get("/captures")
def captures(db: Session = Depends(get_db)) -> list[dict]:
    from sqlalchemy import select

    from models.packet import Capture
    return [_cap(c) for c in db.execute(select(Capture).order_by(Capture.id.desc())).scalars()]


@router.get("/captures/{cid}")
def capture(cid: int, db: Session = Depends(get_db)) -> dict:
    return _cap(svc.get_capture(db, cid))


@router.delete("/captures/{cid}", status_code=204)
def delete_capture(cid: int, db: Session = Depends(get_db)) -> Response:
    svc.delete_capture(db, cid)
    return Response(status_code=204)


@router.get("/captures/{cid}/stats")
def stats(cid: int, db: Session = Depends(get_db)) -> dict:
    return svc.stats(db, cid)


@router.get("/captures/{cid}/packets")
def list_packets(cid: int, page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=500), protocol: str | None = Query(None, max_length=16),
                 src_ip: str | None = Query(None, max_length=64), dst_ip: str | None = Query(None, max_length=64), status: str | None = Query(None, max_length=16),
                 search: str | None = Query(None, max_length=100), sort: str = "index", order: str = Query("asc", pattern="^(asc|desc)$"), db: Session = Depends(get_db)) -> dict:
    items, total = svc.list_packets(db, cid, page, page_size, sort, order, protocol=protocol, src_ip=src_ip, dst_ip=dst_ip, status=status, search=search)
    return paginate(items, total, page, page_size)


@router.get("/captures/{cid}/export.csv")
def export(cid: int, protocol: str | None = Query(None, max_length=16), search: str | None = Query(None, max_length=100), db: Session = Depends(get_db)) -> Response:
    rows = svc.all_rows(db, cid, protocol=protocol, src_ip=None, dst_ip=None, status=None, search=search)
    cols = ["index", "timestamp_iso", "src_ip", "dst_ip", "protocol", "length", "src_port", "dst_port", "status", "info"]
    body = to_csv(cols, [[r[c] for c in cols] for r in rows])
    return Response(body, media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="capture-{cid}.csv"'})


@router.get("/captures/{cid}/packets/{index}")
def packet_detail(cid: int, index: int, db: Session = Depends(get_db)) -> dict:
    return svc.detail(db, cid, index)
