from typing import Literal
from pydantic import BaseModel, Field

Algorithm = Literal["parity", "parity-even", "parity-odd", "checksum", "crc"]
Bits = Field(min_length=1, max_length=4096, pattern=r"^[01]+$")
Generator = Field(default="1011", pattern=r"^1[01]{1,32}$", description="CRC generator polynomial as bits, MSB first, must start with 1")


class EncodeRequest(BaseModel):
    data: str = Bits
    algorithm: Algorithm
    parity_type: Literal["even", "odd"] = "even"
    generator: str = Generator
    flip_positions: list[int] = Field(default_factory=list, max_length=64, description="0-based indexes into transmitted_bits to flip")


class VerifyRequest(BaseModel):
    received_bits: str = Bits
    algorithm: Algorithm
    parity_type: Literal["even", "odd"] = "even"
    generator: str = Generator


class Step(BaseModel):
    step: int
    description: str
    value: str | None = None


class Verification(BaseModel):
    passed: bool
    error_detected: bool
    detail: str
    errors_injected: bool = False
    undetected_error: bool = False


class VerifyResult(BaseModel):
    algorithm: str
    received_bits: str
    steps: list[Step]
    steps_truncated: bool = False
    verification: Verification


class EncodeResult(BaseModel):
    algorithm: str
    parity_type: str | None
    generator: str | None
    data_bits: str
    padded_data_bits: str
    redundant_bits: str
    transmitted_bits: str
    flipped_positions: list[int]
    received_bits: str
    steps: list[Step]
    steps_truncated: bool
    verification: Verification


# ---------------------------------------------------------------------------
# Enhancements for 2D Parity & Simulation Experiment
# ---------------------------------------------------------------------------

class TwoDParityRequest(BaseModel):
    data: str = Bits
    row_width: int = Field(default=8, ge=2, le=32)
    parity_type: Literal["even", "odd"] = "even"
    flip_positions: list[int] = Field(default_factory=list, max_length=64)


class TwoDParityResult(BaseModel):
    row_width: int
    num_rows: int
    parity_type: str
    original_matrix: list[list[str]]
    row_parities: list[str]
    col_parities: list[str]
    transmitted_bits: str
    flipped_positions: list[int]
    received_matrix: list[list[str]]
    received_row_parities: list[str]
    received_col_parities: list[str]
    row_error_indices: list[int]
    col_error_indices: list[int]
    passed: bool
    error_detected: bool
    can_correct_single_bit: bool
    corrected_position: tuple[int, int] | None
    detail: str


class ExperimentStats(BaseModel):
    algorithm: str
    trials: int
    detected: int
    undetected: int
    detection_rate_pct: float
    missed_rate_pct: float


class ErrorExperimentRequest(BaseModel):
    data_length: int = Field(default=32, ge=8, le=512)
    trials: int = Field(default=200, ge=10, le=2000)
    flip_count: int = Field(default=2, ge=1, le=16)
    algorithms: list[str] = Field(
        default=["parity-even", "checksum", "crc-8", "crc-16"]
    )
    seed: int = Field(default=42, ge=0)


class ErrorExperimentResult(BaseModel):
    trials: int
    flip_count: int
    data_length: int
    stats: list[ExperimentStats]
    explanation: str
