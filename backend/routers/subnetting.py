from fastapi import APIRouter

from schemas.subnetting import (
    SplitRequest,
    SplitResult,
    SubnetRequest,
    SubnetResult,
    VlsmRequest,
    VlsmResult,
)
from services import subnetting as svc

router = APIRouter(prefix="/subnetting", tags=["subnetting"])


@router.post("/calculate", response_model=SubnetResult)
def calculate(req: SubnetRequest) -> dict:
    return svc.calculate(req.ip, req.prefix)


@router.post("/split", response_model=SplitResult)
def split(req: SplitRequest) -> dict:
    return svc.split(req.ip, req.prefix, req.new_prefix, req.limit)


@router.post("/vlsm", response_model=VlsmResult)
def vlsm(req: VlsmRequest) -> dict:
    return svc.vlsm(req.parent_cidr, [r.model_dump() for r in req.requirements])
