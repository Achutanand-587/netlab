import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart2,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  FileQuestion,
  Filter,
  Flag,
  HelpCircle,
  History,
  Layers,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Sliders,
  Sparkles,
  Trophy,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  assessmentService,
  AssessmentDetail,
  AssessmentMeta,
  AssessmentResult,
  AttemptSummary,
  CustomTestRequest,
  Difficulty,
  QuestionOut,
  QuestionReview,
} from '../services/assessmentService';
import { toast } from '../components/Toaster';

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'text-green-400 border-green-500/30 bg-green-500/10',
  intermediate: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  advanced: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  mixed: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
};

const TOPIC_NAMES: Record<string, string> = {
  intro: 'Introduction & Topologies',
  osi: 'OSI & TCP/IP Models',
  devices: 'Network Devices & Addressing',
  subnetting: 'IP Addressing & Subnetting',
  vlsm: 'FLSM & VLSM Design',
  protocols: 'Network Protocols',
  packets: 'Packet Analysis & PCAP',
  bandwidth: 'Bandwidth & Performance',
  errors: 'Error Detection & CRC',
  security: 'Basic Network Security',
};

export default function Assessments() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation & mode
  const [view, setView] = useState<'dashboard' | 'taking' | 'result'>('dashboard');

  // Dashboard state
  const [tests, setTests] = useState<AssessmentMeta[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [tab, setTab] = useState<'all' | 'topic' | 'difficulty' | 'mixed' | 'practical' | 'custom' | 'history'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [diffFilter, setDiffFilter] = useState<'all' | Difficulty>('all');

  // Attempt history state
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Active test state
  const [activeTest, setActiveTest] = useState<AssessmentDetail | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [practiceRevealed, setPracticeRevealed] = useState<Record<string, boolean>>({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const timerRef = useRef<any>(null);
  const testStartTimeRef = useRef<number>(Date.now());

  // Result state
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');

  // Custom generator state
  const [customTopics, setCustomTopics] = useState<string[]>([]);
  const [customDifficulty, setCustomDifficulty] = useState<Difficulty | 'all'>('all');
  const [customCount, setCustomCount] = useState<number>(10);
  const [customTimed, setCustomTimed] = useState<boolean>(true);
  const [generatingCustom, setGeneratingCustom] = useState<boolean>(false);

  // Load assessments on mount
  const loadAssessments = useCallback(async () => {
    setLoadingTests(true);
    try {
      const data = await assessmentService.listAssessments();
      setTests(data);
    } catch (err: any) {
      toast(`Failed to load assessments: ${err.message}`);
    } finally {
      setLoadingTests(false);
    }
  }, []);

  const loadAttempts = useCallback(async () => {
    setLoadingAttempts(true);
    try {
      const res = await assessmentService.listAttempts(1, 30);
      setAttempts(res.items || []);
    } catch {
      // quiet fallback
    } finally {
      setLoadingAttempts(false);
    }
  }, []);

  useEffect(() => {
    loadAssessments();
    loadAttempts();
  }, [loadAssessments, loadAttempts]);

  // Check URL query for test auto-launch (e.g. /assessments?test=test-topic-subnetting)
  useEffect(() => {
    const testId = searchParams.get('test');
    if (testId && tests.length > 0 && view === 'dashboard') {
      startAssessment(testId);
    }
  }, [searchParams, tests, view]);

  // Timer hook
  useEffect(() => {
    if (view === 'taking' && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view, timeRemaining]);

  const handleTimeExpired = useCallback(() => {
    toast('Time has expired! Submitting your answers automatically.');
    performSubmission();
  }, [answers, activeTest]);

  // Start assessment handler
  const startAssessment = async (testId: string, practice = false) => {
    try {
      const detail = await assessmentService.getAssessment(testId);
      setActiveTest(detail);
      setCurrentIdx(0);
      setAnswers({});
      setFlagged(new Set());
      setIsPracticeMode(practice);
      setPracticeRevealed({});
      setShowSubmitModal(false);
      setTimeRemaining(detail.duration_mins > 0 ? detail.duration_mins * 60 : 0);
      testStartTimeRef.current = Date.now();
      setView('taking');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast(`Error loading test: ${err.message}`);
    }
  };

  // Generate Custom Test handler
  const handleGenerateCustom = async () => {
    setGeneratingCustom(true);
    try {
      const req: CustomTestRequest = {
        topics: customTopics.length > 0 ? customTopics : undefined,
        difficulty: customDifficulty,
        question_count: customCount,
        timed: customTimed,
      };
      const detail = await assessmentService.generateCustom(req);
      setActiveTest(detail);
      setCurrentIdx(0);
      setAnswers({});
      setFlagged(new Set());
      setIsPracticeMode(false);
      setPracticeRevealed({});
      setShowSubmitModal(false);
      setTimeRemaining(detail.duration_mins > 0 ? detail.duration_mins * 60 : 0);
      testStartTimeRef.current = Date.now();
      setView('taking');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast(`Failed to generate custom test: ${err.message}`);
    } finally {
      setGeneratingCustom(false);
    }
  };

  // Submit test to backend
  const performSubmission = async () => {
    if (!activeTest || isSubmitting) return;
    setIsSubmitting(true);
    setShowSubmitModal(false);

    const timeSpent = Math.max(
      1,
      Math.round((Date.now() - testStartTimeRef.current) / 1000)
    );

    try {
      const payload = {
        test_id: activeTest.id,
        test_title: activeTest.title,
        test_type: activeTest.category,
        time_taken_seconds: timeSpent,
        answers,
        question_ids: activeTest.questions.map((q) => q.id),
      };

      const evalResult = await assessmentService.submitAssessment(payload);
      setResult(evalResult);
      setView('result');
      loadAttempts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast(evalResult.passed ? '🎉 Assessment Passed!' : 'Assessment completed. Check your score & weak areas below.');
    } catch (err: any) {
      toast(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // View past attempt
  const viewAttempt = async (attemptId: number) => {
    try {
      const detail = await assessmentService.getAttempt(attemptId);
      setResult(detail);
      setView('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast(`Could not load attempt details: ${err.message}`);
    }
  };

  // Current question helpers
  const currentQuestion: QuestionOut | undefined = activeTest?.questions[currentIdx];

  const handleSelectAnswer = (ans: any) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: ans,
    }));
  };

  const handleToggleMultipleAnswer = (optIndex: number) => {
    if (!currentQuestion) return;
    const existing: number[] = Array.isArray(answers[currentQuestion.id])
      ? answers[currentQuestion.id]
      : [];
    const updated = existing.includes(optIndex)
      ? existing.filter((i) => i !== optIndex)
      : [...existing, optIndex].sort();
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: updated,
    }));
  };

  const handleMatchingAnswer = (leftItem: string, rightItem: string) => {
    if (!currentQuestion) return;
    const existing: Record<string, string> =
      typeof answers[currentQuestion.id] === 'object' && answers[currentQuestion.id] !== null
        ? { ...answers[currentQuestion.id] }
        : {};
    existing[leftItem] = rightItem;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: existing,
    }));
  };

  const handleClearAnswer = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestion.id];
      return copy;
    });
  };

  const toggleFlagged = (qid: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  // Filtered tests on dashboard
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const matchesTab =
        tab === 'all' ||
        (tab === 'topic' && t.category === 'topic') ||
        (tab === 'difficulty' && t.category === 'difficulty') ||
        (tab === 'mixed' && t.category === 'mixed') ||
        (tab === 'practical' && t.category === 'practical');

      const matchesSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.topics.some((top) => top.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDiff = diffFilter === 'all' || t.difficulty === diffFilter;

      return matchesTab && matchesSearch && matchesDiff;
    });
  }, [tests, tab, searchQuery, diffFilter]);

  // Overall attempts statistics
  const stats = useMemo(() => {
    if (attempts.length === 0) {
      return { total: 0, passed: 0, avgScore: 0, passRate: 0 };
    }
    const passed = attempts.filter((a) => a.passed).length;
    const totalScore = attempts.reduce((acc, a) => acc + a.percentage, 0);
    return {
      total: attempts.length,
      passed,
      avgScore: Math.round(totalScore / attempts.length),
      passRate: Math.round((passed / attempts.length) * 100),
    };
  }, [attempts]);

  // Format countdown
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ─────────────────────────────────────────────────────────────────
  // VIEW: TAKING TEST
  // ─────────────────────────────────────────────────────────────────
  if (view === 'taking' && activeTest && currentQuestion) {
    const totalQ = activeTest.questions.length;
    const answeredCount = Object.keys(answers).length;
    const isCurrentFlagged = flagged.has(currentQuestion.id);
    const currentVal = answers[currentQuestion.id];
    const isTimeUrgent = timeRemaining > 0 && timeRemaining <= 120;

    return (
      <div className="space-y-6">
        {/* Top examination toolbar */}
        <div className="card sticky top-3 z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 border-cyan-500/30 bg-slate-900/95 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to exit this assessment? Your unsaved progress will be lost.')) {
                  setView('dashboard');
                }
              }}
              className="btn-ghost !px-2.5 !py-1.5 text-xs flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Exit
            </button>
            <div className="h-4 w-px bg-slate-700" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100">{activeTest.title}</h1>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${DIFFICULTY_COLORS[activeTest.difficulty]}`}>
                  {activeTest.difficulty}
                </span>
                {isPracticeMode && (
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                    Practice Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {answeredCount} of {totalQ} answered &bull; {flagged.size} flagged
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {timeRemaining > 0 && (
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-mono font-bold transition-all ${
                  isTimeUrgent
                    ? 'border-red-500/60 bg-red-500/20 text-red-300 animate-pulse'
                    : 'border-slate-700 bg-slate-800 text-cyan-300'
                }`}
              >
                <Clock size={14} />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            )}

            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn flex items-center gap-2 !py-2 text-xs font-semibold shadow-md shadow-cyan-500/20"
            >
              <Award size={14} />
              Submit Assessment
            </button>
          </div>
        </div>

        {/* Question palette drawer / grid */}
        <div className="card">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question Navigator</span>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-500" /> Answered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Flagged
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-700" /> Unanswered
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeTest.questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '' && (Array.isArray(answers[q.id]) ? answers[q.id].length > 0 : true);
              const isFlag = flagged.has(q.id);
              const isCurrent = idx === currentIdx;

              let btnCls = 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500';
              if (isCurrent) {
                btnCls = 'border-cyan-400 bg-cyan-500/20 text-cyan-300 ring-2 ring-cyan-400/40 font-bold';
              } else if (isFlag) {
                btnCls = 'border-amber-500/50 bg-amber-500/20 text-amber-300 font-semibold';
              } else if (isAnswered) {
                btnCls = 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 font-semibold';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition-all ${btnCls}`}
                  title={`Question ${idx + 1} (${q.topic_name})`}
                >
                  {idx + 1}
                  {isFlag && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 ring-1 ring-slate-900" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Question Display Card */}
        <div className="card space-y-5">
          {/* Question metadata header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-xs font-bold text-cyan-400 border border-cyan-500/30">
                Question {currentIdx + 1} of {totalQ}
              </span>
              <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 border border-slate-700">
                {currentQuestion.topic_name}
              </span>
              <span className="rounded-lg bg-slate-800/80 px-2 py-1 text-[11px] text-slate-400">
                {currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''}
              </span>
            </div>

            <button
              onClick={() => toggleFlagged(currentQuestion.id)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                isCurrentFlagged
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flag size={13} className={isCurrentFlagged ? 'fill-amber-400' : ''} />
              {isCurrentFlagged ? 'Flagged for Review' : 'Mark for Review'}
            </button>
          </div>

          {/* Scenario block if present */}
          {currentQuestion.scenario && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wide mb-1.5">
                <FileQuestion size={14} /> Diagnostic Scenario
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-mono">
                {currentQuestion.scenario}
              </p>
            </div>
          )}

          {/* Question Text */}
          <h2 className="text-base font-semibold text-slate-100 leading-relaxed">
            {currentQuestion.text}
          </h2>

          {/* Question Options Input Area */}
          <div className="pt-2">
            {/* 1. Single Choice MCQ */}
            {currentQuestion.type === 'single' && currentQuestion.options && (
              <div className="space-y-2.5">
                {currentQuestion.options.map((opt, oIdx) => {
                  const isSelected = currentVal === oIdx;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectAnswer(oIdx)}
                      className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-mono font-bold ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                            : 'border-slate-600 bg-slate-800 text-slate-400'
                        }`}
                      >
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Multiple-Correct Questions */}
            {currentQuestion.type === 'multiple' && currentQuestion.options && (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-400 italic mb-2">
                  (Select all correct choices that apply)
                </p>
                {currentQuestion.options.map((opt, oIdx) => {
                  const arr: number[] = Array.isArray(currentVal) ? currentVal : [];
                  const isChecked = arr.includes(oIdx);
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleToggleMultipleAnswer(oIdx)}
                      className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition-all ${
                        isChecked
                          ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-mono font-bold ${
                          isChecked
                            ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                            : 'border-slate-600 bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isChecked ? '✓' : ''}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. True / False Boolean */}
            {currentQuestion.type === 'boolean' && (
              <div className="grid grid-cols-2 gap-4 max-w-md">
                {[
                  { label: 'True', val: 0 },
                  { label: 'False', val: 1 },
                ].map(({ label, val }) => {
                  const isSelected = currentVal === val;
                  return (
                    <button
                      key={label}
                      onClick={() => handleSelectAnswer(val)}
                      className={`rounded-xl border p-4 text-center text-sm font-semibold transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 4. Matching Pairs */}
            {currentQuestion.type === 'matching' &&
              currentQuestion.matching_left &&
              currentQuestion.matching_right && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 italic mb-2">
                    Match each item on the left with its corresponding match on the right:
                  </p>
                  <div className="grid gap-3">
                    {currentQuestion.matching_left.map((item) => {
                      const selectedRight =
                        typeof currentVal === 'object' && currentVal !== null
                          ? currentVal[item] || ''
                          : '';
                      return (
                        <div
                          key={item}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3"
                        >
                          <span className="text-sm font-semibold text-slate-200 sm:w-1/2">
                            {item}
                          </span>
                          <select
                            value={selectedRight}
                            onChange={(e) => handleMatchingAnswer(item, e.target.value)}
                            className="input sm:w-1/2 text-xs"
                          >
                            <option value="">-- Select Match --</option>
                            {currentQuestion.matching_right!.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* 5. Scenario & Numerical options */}
            {(currentQuestion.type === 'scenario' || currentQuestion.type === 'numerical') &&
              currentQuestion.options && (
                <div className="space-y-2.5">
                  {currentQuestion.options.map((opt, oIdx) => {
                    const isSelected = currentVal === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectAnswer(oIdx)}
                        className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition-all ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30'
                            : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-mono font-bold ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                              : 'border-slate-600 bg-slate-800 text-slate-400'
                          }`}
                        >
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}
          </div>

          {/* Bottom navigation controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <div className="flex gap-2">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="btn-ghost flex items-center gap-1.5 disabled:opacity-30 text-xs"
              >
                <ArrowLeft size={14} /> Previous
              </button>
              {currentVal !== undefined && (
                <button
                  onClick={handleClearAnswer}
                  className="btn-ghost !text-red-400 hover:!bg-red-500/10 text-xs"
                >
                  Clear Answer
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {currentIdx < totalQ - 1 ? (
                <button
                  onClick={() => setCurrentIdx((i) => Math.min(totalQ - 1, i + 1))}
                  className="btn flex items-center gap-1.5 text-xs font-semibold"
                >
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="btn flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
                >
                  <Award size={14} /> Review & Submit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="card max-w-md w-full border-cyan-500/40 bg-slate-900 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Award size={18} className="text-cyan-400" />
                  Submit Assessment
                </h3>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="btn-ghost !p-1 text-slate-400"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 py-2 text-sm text-slate-300">
                <p>Are you ready to submit your assessment for scoring?</p>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Questions:</span>
                    <span className="font-mono font-bold text-slate-200">{totalQ}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Answered:</span>
                    <span className="font-mono font-bold text-emerald-400">{answeredCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Unanswered:</span>
                    <span className={`font-mono font-bold ${totalQ - answeredCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {totalQ - answeredCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Flagged for Review:</span>
                    <span className="font-mono font-bold text-amber-300">{flagged.size}</span>
                  </div>
                </div>

                {totalQ - answeredCount > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <span>
                      You have <strong>{totalQ - answeredCount}</strong> unanswered questions. Unanswered questions will receive 0 marks.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="btn-ghost text-xs"
                >
                  Return to Test
                </button>
                <button
                  onClick={performSubmission}
                  disabled={isSubmitting}
                  className="btn flex items-center gap-1.5 text-xs font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Evaluating...
                    </>
                  ) : (
                    <>Confirm & Submit</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // VIEW: RESULTS & PERFORMANCE ANALYSIS
  // ─────────────────────────────────────────────────────────────────
  if (view === 'result' && result) {
    const filteredReviews = result.reviews.filter((r) => {
      if (reviewFilter === 'correct') return r.is_correct;
      if (reviewFilter === 'incorrect') return !r.is_correct && r.student_answer !== null && r.student_answer !== undefined;
      if (reviewFilter === 'unanswered') return r.student_answer === null || r.student_answer === undefined || r.student_answer === '';
      return true;
    });

    return (
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <button
            onClick={() => setView('dashboard')}
            className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <ChevronRight size={14} />
          <span className="text-slate-300">{result.test_title}</span>
          <ChevronRight size={14} />
          <span className="text-cyan-400">Assessment Evaluation</span>
        </div>

        {/* Scorecard Hero Banner */}
        <div
          className={`card relative overflow-hidden border p-6 md:p-8 ${
            result.passed
              ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950'
              : 'border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    result.passed
                      ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                      : 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {result.passed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  {result.passed ? 'PASSED CERTIFICATION' : 'NEEDS IMPROVEMENT'}
                </span>
                <span className="text-xs text-slate-500">Attempt #{result.attempt_id}</span>
              </div>
              <h1 className="text-2xl font-bold text-white">{result.test_title}</h1>
              <p className="text-xs text-slate-400">
                Completed on {new Date(result.created_at).toLocaleString()} &bull; Duration:{' '}
                {Math.round(result.time_taken_seconds / 60)} min {result.time_taken_seconds % 60} sec
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-slate-400">Final Score</p>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-extrabold ${
                      result.passed ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {result.percentage}%
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400">
                  {result.marks_obtained} / {result.total_marks} Marks
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-800/80 pt-4">
            <div className="rounded-lg bg-slate-900/60 p-2.5 text-center border border-slate-800">
              <p className="text-xs text-slate-500">Questions</p>
              <p className="text-base font-bold text-slate-200">{result.total_questions}</p>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-2.5 text-center border border-slate-800">
              <p className="text-xs text-slate-500">Correct</p>
              <p className="text-base font-bold text-emerald-400">{result.correct_answers}</p>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-2.5 text-center border border-slate-800">
              <p className="text-xs text-slate-500">Incorrect</p>
              <p className="text-base font-bold text-red-400">{result.incorrect_answers}</p>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-2.5 text-center border border-slate-800">
              <p className="text-xs text-slate-500">Unanswered</p>
              <p className="text-base font-bold text-amber-400">{result.unanswered_questions}</p>
            </div>
          </div>
        </div>

        {/* Topic-wise Breakdown & Learning Recommendations */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Topic Performance Bars */}
          <div className="card space-y-4">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <BarChart2 size={16} className="text-cyan-400" /> Topic-wise Performance
            </h2>
            <div className="space-y-3">
              {Object.values(result.topic_breakdown).map((t) => {
                let barColor = 'bg-emerald-500';
                let textColor = 'text-emerald-400';
                if (t.percentage < 60) {
                  barColor = 'bg-red-500';
                  textColor = 'text-red-400';
                } else if (t.percentage < 80) {
                  barColor = 'bg-amber-400';
                  textColor = 'text-amber-400';
                }

                return (
                  <div key={t.topic} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">{t.topic_name}</span>
                      <span className={`font-mono font-bold ${textColor}`}>
                        {t.score}/{t.max_score} ({t.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800">
                      <div
                        className={`h-2 rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(100, t.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weak Topics & Next Steps */}
          <div className="card space-y-4">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" /> Actionable Recommendations
            </h2>

            {result.weak_topics.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  You scored under 60% on these topics. Revisit the corresponding Learning Center modules or hands-on labs:
                </p>
                {result.weak_topics.map((tName) => {
                  const match = Object.values(result.topic_breakdown).find((t) => t.topic_name === tName);
                  return (
                    <div
                      key={tName}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-red-300">{tName}</p>
                        <p className="text-[11px] text-slate-400">
                          Score: {match ? `${match.percentage}%` : 'Low'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          to="/learn"
                          className="btn-ghost !px-2.5 !py-1 text-xs text-cyan-300 border border-cyan-500/30 flex items-center gap-1"
                        >
                          <BookOpen size={12} /> Lesson
                        </Link>
                        {match?.recommended_route && (
                          <Link
                            to={match.recommended_route}
                            className="btn !px-2.5 !py-1 text-xs flex items-center gap-1"
                          >
                            <ExternalLink size={12} /> Lab
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-2">
                <Award size={32} className="mx-auto text-emerald-400" />
                <p className="text-sm font-bold text-emerald-300">Exceptional Mastery!</p>
                <p className="text-xs text-slate-400">
                  You achieved over 60% across every evaluated networking domain. You are well-prepared for practical lab configurations.
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => startAssessment(result.test_id)}
                className="btn text-xs flex items-center gap-1.5"
              >
                <RotateCcw size={13} /> Retake Assessment
              </button>
              <Link
                to="/reports"
                className="btn-ghost text-xs flex items-center gap-1.5"
              >
                <BarChart3 size={13} /> View in Reports
              </Link>
              <button
                onClick={() => setView('dashboard')}
                className="btn-ghost text-xs flex items-center gap-1.5 ml-auto"
              >
                <ArrowLeft size={13} /> Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Question Review */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <FileQuestion size={16} className="text-cyan-400" /> Question-by-Question Review
            </h2>

            {/* Filter Pills */}
            <div className="flex gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
              {(['all', 'correct', 'incorrect', 'unanswered'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setReviewFilter(mode)}
                  className={`rounded-md px-2.5 py-1 capitalize font-medium transition-all ${
                    reviewFilter === mode
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredReviews.map((rev, idx) => {
              const isUnans = rev.student_answer === null || rev.student_answer === undefined || rev.student_answer === '';
              return (
                <div
                  key={rev.id}
                  className={`rounded-xl border p-4 space-y-3 transition-all ${
                    rev.is_correct
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : isUnans
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          rev.is_correct
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isUnans
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {rev.is_correct ? '✓' : isUnans ? '—' : '✕'}
                      </span>
                      <span className="text-xs font-bold text-slate-300">
                        Question #{idx + 1}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                        {rev.topic_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {rev.marks_obtained} / {rev.max_marks} Mark{rev.max_marks > 1 ? 's' : ''}
                      </span>
                      {rev.practical_route && (
                        <Link
                          to={rev.practical_route}
                          className="rounded px-2 py-0.5 text-[10px] font-semibold text-cyan-400 hover:underline border border-cyan-500/30"
                        >
                          Lab Link
                        </Link>
                      )}
                    </div>
                  </div>

                  {rev.scenario && (
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs text-slate-300 font-mono">
                      {rev.scenario}
                    </div>
                  )}

                  <p className="text-sm font-medium text-slate-100">{rev.text}</p>

                  {/* Answers display */}
                  <div className="grid gap-2 text-xs sm:grid-cols-2 pt-1">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">Your Answer:</span>
                      <p
                        className={`font-semibold ${
                          rev.is_correct
                            ? 'text-emerald-400'
                            : isUnans
                            ? 'text-amber-400 italic'
                            : 'text-red-400'
                        }`}
                      >
                        {isUnans
                          ? 'Unanswered'
                          : rev.options && typeof rev.student_answer === 'number'
                          ? `${String.fromCharCode(65 + rev.student_answer)}. ${rev.options[rev.student_answer]}`
                          : JSON.stringify(rev.student_answer)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 space-y-1">
                      <span className="text-[11px] font-semibold text-emerald-400 uppercase">Correct Answer:</span>
                      <p className="font-semibold text-emerald-300">
                        {rev.options && typeof rev.correct_answer === 'number'
                          ? `${String.fromCharCode(65 + rev.correct_answer)}. ${rev.options[rev.correct_answer]}`
                          : JSON.stringify(rev.correct_answer)}
                      </p>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-300 space-y-1">
                    <span className="font-bold text-cyan-400">Networking Concept Explanation:</span>
                    <p className="leading-relaxed text-slate-300">{rev.explanation}</p>
                  </div>
                </div>
              );
            })}

            {filteredReviews.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                No questions match the "{reviewFilter}" filter.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // VIEW: DASHBOARD
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="text-cyan-400" size={24} />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Quizzes & Assessments
            </h1>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
              Phase 9 Active
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Topic-wise exams, mixed certifications, practical diagnostic challenges, and custom question generators.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
          {[
            { id: 'all', label: 'All Tests' },
            { id: 'topic', label: 'Topic-wise' },
            { id: 'difficulty', label: 'Difficulty' },
            { id: 'mixed', label: 'Mixed / Grand' },
            { id: 'practical', label: 'Practical Labs' },
            { id: 'custom', label: 'Custom Practice' },
            { id: 'history', label: `Attempts (${attempts.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`rounded-md px-3 py-1.5 font-semibold transition-all ${
                tab === t.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Assessments',
            value: tests.length.toString(),
            sub: 'Predefined + Custom',
            icon: BookOpen,
          },
          {
            label: 'Attempts Completed',
            value: stats.total.toString(),
            sub: 'Persisted in Database',
            icon: History,
          },
          {
            label: 'Passing Rate',
            value: `${stats.passRate}%`,
            sub: `${stats.passed} passed of ${stats.total}`,
            icon: Trophy,
          },
          {
            label: 'Average Score',
            value: `${stats.avgScore}%`,
            sub: 'Across all modules',
            icon: BarChart3,
          },
        ].map((s) => (
          <div key={s.label} className="card group flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-500/15 text-cyan-500 transition group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-navy-950">
              <s.icon size={20} />
            </span>
            <div>
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className="stat-val text-2xl font-semibold">{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* TAB CONTENT: CUSTOM PRACTICE GENERATOR */}
      {tab === 'custom' && (
        <div className="card space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sliders size={18} className="text-cyan-400" />
              Custom Practice Test Generator
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select specific networking topics, set your target difficulty, and generate a dynamic assessment from the question bank.
            </p>
          </div>

          {/* Topics selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Topics ({customTopics.length === 0 ? 'All Topics' : `${customTopics.length} selected`})
              </span>
              <button
                onClick={() =>
                  setCustomTopics((prev) =>
                    prev.length === Object.keys(TOPIC_NAMES).length ? [] : Object.keys(TOPIC_NAMES)
                  )
                }
                className="text-xs text-cyan-400 hover:underline"
              >
                {customTopics.length === Object.keys(TOPIC_NAMES).length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {Object.entries(TOPIC_NAMES).map(([tId, tLabel]) => {
                const isSelected = customTopics.includes(tId);
                return (
                  <button
                    key={tId}
                    type="button"
                    onClick={() =>
                      setCustomTopics((prev) =>
                        prev.includes(tId) ? prev.filter((i) => i !== tId) : [...prev, tId]
                      )
                    }
                    className={`rounded-lg border p-2 text-left text-xs transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {tLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Difficulty</label>
              <select
                value={customDifficulty}
                onChange={(e) => setCustomDifficulty(e.target.value as any)}
                className="input text-xs"
              >
                <option value="all">All Difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Number of Questions ({customCount})
              </label>
              <div className="flex gap-2">
                {[5, 10, 15, 20, 25].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCustomCount(c)}
                    className={`flex-1 rounded-md border py-1.5 text-xs font-semibold transition-all ${
                      customCount === c
                        ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Timer Mode</label>
              <button
                type="button"
                onClick={() => setCustomTimed((t) => !t)}
                className={`w-full rounded-md border py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  customTimed
                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <Clock size={14} />
                {customTimed ? `Timed (${customCount * 2} min)` : 'Untimed Practice'}
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleGenerateCustom}
              disabled={generatingCustom}
              className="btn flex items-center gap-2 text-sm font-semibold !py-2.5 !px-6 shadow-lg shadow-cyan-500/20"
            >
              {generatingCustom ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Play size={14} /> Start Custom Assessment
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ATTEMPT HISTORY */}
      {tab === 'history' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <History size={18} className="text-cyan-400" />
              Previous Assessment Attempts
            </h2>
            <button
              onClick={loadAttempts}
              className="btn-ghost flex items-center gap-1.5 text-xs text-slate-400"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {loadingAttempts ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <RefreshCw size={20} className="mx-auto animate-spin mb-2" /> Loading attempts...
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Award size={36} className="mx-auto opacity-30" />
              <p className="font-semibold text-sm">No Assessment Attempts Yet</p>
              <p className="text-xs">Take any assessment from the dashboard to track your performance history.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-left">
                    <th className="pb-2.5 px-3">#</th>
                    <th className="pb-2.5 px-3">Assessment Name</th>
                    <th className="pb-2.5 px-3">Date & Time</th>
                    <th className="pb-2.5 px-3">Score</th>
                    <th className="pb-2.5 px-3">Correct / Total</th>
                    <th className="pb-2.5 px-3">Duration</th>
                    <th className="pb-2.5 px-3">Status</th>
                    <th className="pb-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {attempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-500">#{att.id}</td>
                      <td className="py-3 px-3 font-semibold text-slate-200">{att.test_name}</td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(att.created_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-cyan-300">
                        {att.percentage}%
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {att.correct} correct
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {Math.round(att.time_seconds / 60)}m {att.time_seconds % 60}s
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            att.passed
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {att.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => viewAttempt(att.id)}
                          className="btn-ghost !px-2.5 !py-1 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 ml-auto"
                        >
                          <Eye size={12} /> Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ASSESSMENT CARDS LISTING (ALL, TOPIC, DIFFICULTY, MIXED, PRACTICAL) */}
      {tab !== 'custom' && tab !== 'history' && (
        <div className="space-y-4">
          {/* Search and Filters toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                className="input pl-8"
                placeholder="Search assessments by title, topic, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <Filter size={14} className="mt-2.5 text-slate-400 shrink-0" />
              {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDiffFilter(d)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all capitalize ${
                    diffFilter === d
                      ? 'bg-cyan-500 text-white'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {loadingTests ? (
            <div className="card text-center py-12 text-slate-400 text-xs">
              <RefreshCw size={24} className="mx-auto animate-spin mb-3 text-cyan-400" />
              Loading question bank and assessments...
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="card text-center py-12 text-slate-400 space-y-2">
              <FileQuestion size={36} className="mx-auto opacity-30" />
              <p className="font-semibold text-sm">No assessments match your filters</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDiffFilter('all');
                }}
                className="btn text-xs mt-2"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTests.map((test) => {
                const pastAttempt = attempts.find((a) => a.test_id === test.id);
                return (
                  <div
                    key={test.id}
                    className="card flex flex-col justify-between hover:border-cyan-500/40 transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                            DIFFICULTY_COLORS[test.difficulty]
                          }`}
                        >
                          {test.difficulty}
                        </span>
                        {pastAttempt && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              pastAttempt.passed
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                            }`}
                          >
                            Best: {pastAttempt.percentage}%
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                          {test.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {test.description}
                        </p>
                      </div>

                      {/* Topics badges */}
                      <div className="flex flex-wrap gap-1">
                        {test.topics.slice(0, 3).map((top) => (
                          <span
                            key={top}
                            className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-400 border border-slate-700/50"
                          >
                            {TOPIC_NAMES[top] || top}
                          </span>
                        ))}
                        {test.topics.length > 3 && (
                          <span className="text-[10px] text-slate-500">
                            +{test.topics.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 border-t border-slate-800/80 pt-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <FileQuestion size={12} /> {test.question_count} Questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {test.duration_mins} min
                        </span>
                        <span className="font-mono text-slate-400">
                          {test.max_marks} Marks
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => startAssessment(test.id)}
                          className="btn flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold !py-2"
                        >
                          <Play size={13} />
                          {pastAttempt ? 'Retake Exam' : 'Start Exam'}
                        </button>
                        <button
                          onClick={() => startAssessment(test.id, true)}
                          className="btn-ghost !px-2.5 text-xs text-slate-400 hover:text-cyan-300"
                          title="Practice Mode (untimed exploration)"
                        >
                          Practice
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
