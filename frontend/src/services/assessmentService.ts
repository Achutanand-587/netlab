// ─────────────────────────────────────────────────────────────────
// NetLab – Assessments & Quizzes Service
// Handles fetching assessments, custom test generation,
// submitting answers for backend evaluation, and loading attempt history.
// ─────────────────────────────────────────────────────────────────

import { get, post } from './api';

export type QuestionFormat = 'single' | 'multiple' | 'boolean' | 'matching' | 'scenario' | 'numerical';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type AssessmentCategory = 'topic' | 'difficulty' | 'mixed' | 'practical' | 'custom';

export interface QuestionOut {
  id: string;
  type: QuestionFormat;
  text: string;
  options?: string[];
  matching_left?: string[];
  matching_right?: string[];
  scenario?: string;
  marks: number;
  difficulty: Difficulty;
  topic: string;
  topic_name: string;
  practical_route?: string;
}

export interface AssessmentMeta {
  id: string;
  title: string;
  description: string;
  category: AssessmentCategory;
  difficulty: Difficulty | 'mixed';
  duration_mins: number;
  question_count: number;
  max_marks: number;
  topics: string[];
  pass_percentage: number;
  practical_route?: string;
}

export interface AssessmentDetail extends AssessmentMeta {
  questions: QuestionOut[];
}

export interface CustomTestRequest {
  topics?: string[];
  difficulty: Difficulty | 'all';
  question_count: number;
  timed: boolean;
}

export interface SubmitAnswerPayload {
  test_id: string;
  test_title: string;
  test_type: string;
  time_taken_seconds: number;
  answers: Record<string, unknown>;
  question_ids: string[];
}

export interface QuestionReview {
  id: string;
  type: QuestionFormat;
  text: string;
  options?: string[];
  matching_left?: string[];
  matching_right?: string[];
  scenario?: string;
  student_answer: unknown;
  correct_answer: unknown;
  is_correct: boolean;
  marks_obtained: number;
  max_marks: number;
  explanation: string;
  topic: string;
  topic_name: string;
  practical_route?: string;
}

export interface TopicScore {
  topic: string;
  topic_name: string;
  total_questions: number;
  correct_questions: number;
  score: number;
  max_score: number;
  percentage: number;
  recommended_lesson?: string;
  recommended_route?: string;
}

export interface AssessmentResult {
  attempt_id: number;
  test_id: string;
  test_title: string;
  total_questions: number;
  answered_questions: number;
  unanswered_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  total_marks: number;
  marks_obtained: number;
  percentage: number;
  passed: boolean;
  pass_percentage: number;
  time_taken_seconds: number;
  topic_breakdown: Record<string, TopicScore>;
  weak_topics: string[];
  reviews: QuestionReview[];
  created_at: string;
}

export interface AttemptSummary {
  id: number;
  test_id: string;
  test_name: string;
  created_at: string;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  time_seconds: number;
  correct: number;
  incorrect: number;
}

export interface PagedAttempts {
  items: AttemptSummary[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export const assessmentService = {
  listAssessments: () => get<AssessmentMeta[]>('/assessments/tests'),

  getAssessment: (testId: string) => get<AssessmentDetail>(`/assessments/tests/${testId}`),

  generateCustom: (req: CustomTestRequest) => post<AssessmentDetail>('/assessments/custom', req),

  submitAssessment: (payload: SubmitAnswerPayload) =>
    post<AssessmentResult>('/assessments/submit', payload),

  listAttempts: (page = 1, pageSize = 20) =>
    get<PagedAttempts>(`/assessments/attempts?page=${page}&page_size=${pageSize}`),

  getAttempt: (attemptId: number) =>
    get<AssessmentResult>(`/assessments/attempts/${attemptId}`),
};
