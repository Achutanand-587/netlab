from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from config import settings
from database import get_db

router = APIRouter(tags=["health"])
VERSION = "1.0.0"


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    try:
        db.execute(text("SELECT 1"))
        database = "ok"
    except Exception:
        database = "unavailable"
    return {"status": "ok" if database == "ok" else "degraded", "version": VERSION, "database": database,
            "live_capture_enabled": settings.live_capture_enabled, "time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
