from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Module = Literal["subnetting", "packets", "error_detection", "bandwidth", "protocols", "topology", "assessments", "other"]
Metric = float | int | str


class ExperimentCreate(BaseModel):
    module: Module
    name: str = Field(min_length=1, max_length=120)
    inputs: dict = Field(default_factory=dict)
    results: dict = Field(default_factory=dict)
    metrics: dict[str, Metric] = Field(default_factory=dict, description="Evaluation metrics, e.g. {'detection_rate': 0.97}")
    notes: str = Field(default="", max_length=2000)


class ExperimentOut(ExperimentCreate):
    id: int
    created_at: datetime


class CompareRequest(BaseModel):
    ids: list[int] = Field(min_length=2, max_length=10)


class MetricRow(BaseModel):
    name: str
    values: list[Metric | None]
    delta_vs_first: list[float | None]


class CompareResult(BaseModel):
    experiments: list[dict]
    metrics: list[MetricRow]
