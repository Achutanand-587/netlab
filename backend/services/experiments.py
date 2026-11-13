import json
import math

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from errors import AppError
from models.experiment import Experiment
from services.csvutil import to_csv

MAX_JSON_BYTES = 100_000


def _out(e: Experiment) -> dict:
    return {"id": e.id, "module": e.module, "name": e.name, "inputs": e.inputs, "results": e.results, "metrics": e.metrics, "notes": e.notes, "created_at": e.created_at}


def create(db: Session, data: dict) -> dict:
    if len(json.dumps([data["inputs"], data["results"], data["metrics"]], default=str)) > MAX_JSON_BYTES:
        raise AppError(413, "payload_too_large", "inputs, results and metrics together must be under 100 KB.")
    e = Experiment(**data)
    db.add(e)
    db.commit()
    return _out(e)


def get(db: Session, eid: int) -> Experiment:
    e = db.get(Experiment, eid)
    if not e:
        raise AppError(404, "experiment_not_found", f"Experiment {eid} does not exist.")
    return e


def list_(db: Session, module: str | None, page: int, page_size: int) -> tuple[list[dict], int]:
    q = select(Experiment)
    if module:
        q = q.where(Experiment.module == module)
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    rows = db.execute(q.order_by(Experiment.created_at.desc(), Experiment.id.desc()).offset((page - 1) * page_size).limit(page_size)).scalars()
    return [_out(e) for e in rows], total


def delete(db: Session, eid: int) -> None:
    db.delete(get(db, eid))
    db.commit()


def compare(db: Session, ids: list[int]) -> dict:
    found = {e.id: e for e in db.execute(select(Experiment).where(Experiment.id.in_(ids))).scalars()}
    missing = [i for i in ids if i not in found]
    if missing:
        raise AppError(404, "experiment_not_found", f"Experiments not found: {missing}.", {"missing_ids": missing})
    exps = [found[i] for i in ids]
    rows = []
    for name in sorted({k for e in exps for k in e.metrics}):
        vals = [e.metrics.get(name) for e in exps]
        base = vals[0] if isinstance(vals[0], (int, float)) else None
        deltas = [round(v - base, 6) if base is not None and isinstance(v, (int, float)) and not math.isnan(v) else None for v in vals]
        rows.append({"name": name, "values": vals, "delta_vs_first": deltas})
    return {"experiments": [{"id": e.id, "name": e.name, "module": e.module, "created_at": e.created_at.isoformat()} for e in exps], "metrics": rows}


def export_csv(db: Session, module: str | None) -> str:
    q = select(Experiment).order_by(Experiment.id)
    if module:
        q = q.where(Experiment.module == module)
    exps = db.execute(q).scalars().all()
    keys = sorted({k for e in exps for k in e.metrics})
    header = ["id", "module", "name", "created_at", "notes", *[f"metric:{k}" for k in keys], "inputs_json", "results_json"]
    rows = [[e.id, e.module, e.name, e.created_at.isoformat(), e.notes, *[e.metrics.get(k) for k in keys], json.dumps(e.inputs), json.dumps(e.results)] for e in exps]
    return to_csv(header, rows)


def report(db: Session, eid: int) -> dict:
    e = get(db, eid)
    md = [f"# Experiment report: {e.name}", "", f"- **ID:** {e.id}", f"- **Module:** {e.module}", f"- **Created (UTC):** {e.created_at.isoformat()}", ""]
    if e.notes:
        md += ["## Notes", e.notes, ""]
    md += ["## Inputs", "```json", json.dumps(e.inputs, indent=2), "```", "", "## Results", "```json", json.dumps(e.results, indent=2), "```", ""]
    md += ["## Evaluation metrics", ""]
    md += ["| Metric | Value |", "|---|---|", *[f"| {k} | {v} |" for k, v in sorted(e.metrics.items())]] if e.metrics else ["No metrics recorded."]
    return {"id": e.id, "title": f"Experiment report: {e.name}", "markdown": "\n".join(md) + "\n"}
