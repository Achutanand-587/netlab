from fastapi import APIRouter

from services import protocols as svc

router = APIRouter(prefix="/protocols", tags=["protocols"])


@router.get("")
def list_protocols() -> list[dict]:
    return svc.list_protocols()


@router.get("/{name}")
def get_protocol(name: str) -> dict:
    return svc.get(name)
