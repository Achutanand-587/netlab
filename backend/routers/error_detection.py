from fastapi import APIRouter

from schemas.error_detection import (
    EncodeRequest,
    EncodeResult,
    ErrorExperimentRequest,
    ErrorExperimentResult,
    TwoDParityRequest,
    TwoDParityResult,
    VerifyRequest,
    VerifyResult,
)
from services import error_detection as svc

router = APIRouter(prefix="/error-detection", tags=["error detection"])


@router.post("/encode", response_model=EncodeResult)
def encode(req: EncodeRequest) -> dict:
    """Encode, optionally flip bits in transit, then verify at the receiver."""
    return svc.simulate(req)


@router.post("/verify", response_model=VerifyResult)
def verify(req: VerifyRequest) -> dict:
    return svc.verify(req)


@router.post("/2d-parity", response_model=TwoDParityResult)
def two_d_parity(req: TwoDParityRequest) -> dict:
    """Calculates row and column parity matrix, verifies received bits, and locates correctable single-bit errors."""
    return svc.two_d_parity(
        data=req.data,
        row_width=req.row_width,
        parity_type=req.parity_type,
        flip_positions=req.flip_positions,
    )


@router.post("/experiment", response_model=ErrorExperimentResult)
def error_experiment(req: ErrorExperimentRequest) -> dict:
    """Simulates randomized transmission trials measuring detection rates across parity, checksum, and CRC."""
    return svc.run_detection_experiment(
        data_length=req.data_length,
        trials=req.trials,
        flip_count=req.flip_count,
        algorithms=req.algorithms,
        seed=req.seed,
    )
