from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from schemas.assessments import (
    AssessmentDetail,
    AssessmentMeta,
    AssessmentResult,
    AttemptSummary,
    CustomTestRequest,
    SubmitAnswer,
)
from schemas.common import Page, paginate
from services import assessments as svc

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get("", response_model=list[AssessmentMeta])
@router.get("/tests", response_model=list[AssessmentMeta])
def list_tests() -> list[AssessmentMeta]:
    """List all available predefined assessments across topic, difficulty, mixed, and practical modes."""
    return svc.list_assessments()


@router.get("/tests/{test_id}", response_model=AssessmentDetail)
def get_test(test_id: str) -> AssessmentDetail:
    """Retrieve an assessment with sanitized questions (answers hidden)."""
    return svc.get_assessment(test_id)


@router.post("/custom", response_model=AssessmentDetail)
def generate_custom(req: CustomTestRequest) -> AssessmentDetail:
    """Dynamically generate a custom practice test from the question bank based on topic and difficulty."""
    return svc.generate_custom_assessment(req)


@router.post("/submit", response_model=AssessmentResult)
def submit_test(req: SubmitAnswer, db: Session = Depends(get_db)) -> AssessmentResult:
    """Submit answers for an assessment. Evaluates score, generates topic breakdown,

    and persists attempt history into the database.
    """
    return svc.evaluate_submission(db, req)


@router.get("/attempts", response_model=Page[AttemptSummary])
def list_attempts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    """List previous assessment attempts with scores, pass/fail status, and timestamps."""
    items, total = svc.list_attempts(db, page=page, page_size=page_size)
    return paginate([i.model_dump() for i in items], total, page, page_size)


@router.get("/attempts/{attempt_id}", response_model=AssessmentResult)
def get_attempt(attempt_id: int, db: Session = Depends(get_db)) -> AssessmentResult:
    """Retrieve full evaluation result and question-by-question review of a previous attempt."""
    return svc.get_attempt_detail(db, attempt_id)
