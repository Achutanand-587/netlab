from typing import Any, Literal
from pydantic import BaseModel, Field

QuestionFormat = Literal["single", "multiple", "boolean", "matching", "scenario", "numerical"]
Difficulty = Literal["beginner", "intermediate", "advanced"]
AssessmentCategory = Literal["topic", "difficulty", "mixed", "practical", "custom"]


class QuestionOut(BaseModel):
    id: str
    type: QuestionFormat
    text: str
    options: list[str] | None = None
    matching_left: list[str] | None = None
    matching_right: list[str] | None = None
    scenario: str | None = None
    marks: int = 1
    difficulty: Difficulty
    topic: str
    topic_name: str
    practical_route: str | None = None


class AssessmentMeta(BaseModel):
    id: str
    title: str
    description: str
    category: AssessmentCategory
    difficulty: Difficulty | Literal["mixed"]
    duration_mins: int
    question_count: int
    max_marks: int
    topics: list[str]
    pass_percentage: int = 60
    practical_route: str | None = None


class AssessmentDetail(AssessmentMeta):
    questions: list[QuestionOut]


class CustomTestRequest(BaseModel):
    topics: list[str] = Field(default_factory=list)
    difficulty: Difficulty | Literal["all"] = "all"
    question_count: int = Field(default=10, ge=5, le=30)
    timed: bool = True


class SubmitAnswer(BaseModel):
    test_id: str
    test_title: str
    test_type: str = "standard"
    time_taken_seconds: int = Field(ge=0)
    answers: dict[str, Any] = Field(default_factory=dict)
    question_ids: list[str] = Field(min_length=1)


class QuestionReview(BaseModel):
    id: str
    type: QuestionFormat
    text: str
    options: list[str] | None = None
    matching_left: list[str] | None = None
    matching_right: list[str] | None = None
    scenario: str | None = None
    student_answer: Any = None
    correct_answer: Any = None
    is_correct: bool
    marks_obtained: float
    max_marks: int
    explanation: str
    topic: str
    topic_name: str
    practical_route: str | None = None


class TopicScore(BaseModel):
    topic: str
    topic_name: str
    total_questions: int
    correct_questions: int
    score: float
    max_score: float
    percentage: float
    recommended_lesson: str | None = None
    recommended_route: str | None = None


class AssessmentResult(BaseModel):
    attempt_id: int
    test_id: str
    test_title: str
    total_questions: int
    answered_questions: int
    unanswered_questions: int
    correct_answers: int
    incorrect_answers: int
    total_marks: int
    marks_obtained: float
    percentage: float
    passed: bool
    pass_percentage: int
    time_taken_seconds: int
    topic_breakdown: dict[str, TopicScore]
    weak_topics: list[str]
    reviews: list[QuestionReview]
    created_at: str


class AttemptSummary(BaseModel):
    id: int
    test_id: str
    test_name: str
    created_at: str
    score: float
    total_marks: float
    percentage: float
    passed: bool
    time_seconds: int
    correct: int
    incorrect: int
