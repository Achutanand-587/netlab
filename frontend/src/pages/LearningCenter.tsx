import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  ExternalLink,
  Filter,
  GraduationCap,
  HelpCircle,
  Layers,
  LayoutGrid,
  Search,
  Shield,
  Star,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  Difficulty,
  getOverallProgress,
  getTopicCompletion,
  LearningProgress,
  Lesson,
  loadProgress,
  markLessonComplete,
  markLessonVisited,
  QuizQuestion,
  saveProgress,
  Topic,
  TOPICS,
} from '../services/learningService';

// ── Visual components ─────────────────────────────────────────────────────────

function OsiDiagram() {
  const layers = [
    { n: 7, name: 'Application', proto: 'HTTP · DNS · FTP · SMTP', color: 'bg-cyan-500/20 border-cyan-500/40', text: 'text-cyan-300' },
    { n: 6, name: 'Presentation', proto: 'SSL/TLS · JPEG · ASCII', color: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-300' },
    { n: 5, name: 'Session', proto: 'NetBIOS · RPC · PPTP', color: 'bg-violet-500/20 border-violet-500/40', text: 'text-violet-300' },
    { n: 4, name: 'Transport', proto: 'TCP · UDP', color: 'bg-purple-500/20 border-purple-500/40', text: 'text-purple-300' },
    { n: 3, name: 'Network', proto: 'IP · ICMP · ARP', color: 'bg-pink-500/20 border-pink-500/40', text: 'text-pink-300' },
    { n: 2, name: 'Data Link', proto: 'Ethernet · Wi-Fi · PPP', color: 'bg-rose-500/20 border-rose-500/40', text: 'text-rose-300' },
    { n: 1, name: 'Physical', proto: 'Cables · Fibre · Radio', color: 'bg-orange-500/20 border-orange-500/40', text: 'text-orange-300' },
  ];
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="mb-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-widest">OSI Seven-Layer Model</p>
      <div className="space-y-1">
        {layers.map(l => (
          <div key={l.n} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${l.color}`}>
            <span className={`w-6 text-center text-xs font-bold ${l.text}`}>{l.n}</span>
            <span className={`w-28 text-sm font-semibold ${l.text}`}>{l.name}</span>
            <span className="text-xs text-slate-400">{l.proto}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-slate-500">
        <span>← Sending (encapsulate 7→1)</span>
        <span>Receiving (decapsulate 1→7) →</span>
      </div>
    </div>
  );
}

function EncapsulationDiagram() {
  const layers = [
    { label: 'Application Data', color: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300', extra: '' },
    { label: 'TCP Segment', color: 'bg-blue-500/20 border-blue-500/40 text-blue-300', extra: '[TCP Header | Data]' },
    { label: 'IP Packet', color: 'bg-violet-500/20 border-violet-500/40 text-violet-300', extra: '[IP Header | TCP Header | Data]' },
    { label: 'Ethernet Frame', color: 'bg-pink-500/20 border-pink-500/40 text-pink-300', extra: '[ETH Header | IP | TCP | Data | FCS]' },
    { label: 'Bits on Wire', color: 'bg-orange-500/20 border-orange-500/40 text-orange-300', extra: '10110100 11010010 ...' },
  ];
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="mb-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-widest">Encapsulation</p>
      <div className="space-y-2">
        {layers.map((l, i) => (
          <div key={i} className={`rounded-lg border px-3 py-2 ${l.color}`}>
            <p className="text-sm font-semibold">{l.label}</p>
            {l.extra && <p className="mt-0.5 font-mono text-[10px] opacity-70">{l.extra}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TcpHandshakeDiagram() {
  const steps = [
    { from: 'Client', to: 'Server', msg: 'SYN (seq=0)', color: 'text-cyan-400' },
    { from: 'Server', to: 'Client', msg: 'SYN-ACK (seq=0, ack=1)', color: 'text-green-400' },
    { from: 'Client', to: 'Server', msg: 'ACK (seq=1, ack=1)', color: 'text-cyan-400' },
    { from: 'Client', to: 'Server', msg: 'DATA (HTTP GET)', color: 'text-blue-400' },
  ];
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="mb-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-widest">TCP Three-Way Handshake</p>
      <div className="flex justify-around mb-3">
        {['Client', 'Server'].map(n => (
          <div key={n} className="flex flex-col items-center gap-1">
            <div className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200">{n}</div>
            <div className="h-32 w-px bg-slate-600" />
          </div>
        ))}
      </div>
      <div className="space-y-2 -mt-28">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-2 text-xs ${s.color}`}>
            <span className="w-14 text-right font-mono text-[10px] text-slate-500">{s.from}</span>
            <div className="flex flex-1 items-center gap-1">
              {s.from === 'Client' ? (
                <><div className="h-px flex-1 bg-current opacity-50" /><span className="text-[10px]">▶</span></>
              ) : (
                <><span className="text-[10px]">◀</span><div className="h-px flex-1 bg-current opacity-50" /></>
              )}
            </div>
            <span className="font-mono text-[10px]">{s.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubnetDiagram() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="mb-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-widest">Subnet Anatomy: 192.168.1.0/24</p>
      <div className="font-mono text-xs space-y-2">
        <div className="flex gap-2">
          <span className="w-32 text-slate-400">IP Address:</span>
          <span className="text-cyan-300">11000000.10101000.00000001.00000001</span>
        </div>
        <div className="flex gap-2">
          <span className="w-32 text-slate-400">Subnet Mask:</span>
          <span className="text-green-300">11111111.11111111.11111111.00000000</span>
        </div>
        <div className="flex gap-2">
          <span className="w-32 text-slate-400">Network Addr:</span>
          <span className="text-blue-300">192.168.1.<strong>0</strong> (all host bits = 0)</span>
        </div>
        <div className="flex gap-2">
          <span className="w-32 text-slate-400">Broadcast:</span>
          <span className="text-pink-300">192.168.1.<strong>255</strong> (all host bits = 1)</span>
        </div>
        <div className="flex gap-2">
          <span className="w-32 text-slate-400">Usable Range:</span>
          <span className="text-yellow-300">192.168.1.1 – 192.168.1.254</span>
        </div>
        <div className="flex gap-2">
          <span className="w-32 text-slate-400">Usable Hosts:</span>
          <span className="text-orange-300">2⁸ − 2 = <strong>254</strong></span>
        </div>
      </div>
    </div>
  );
}

function TopologyDiagram() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="mb-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-widest">Network Topologies</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { name: 'Bus', desc: 'Shared cable, one break = network down' },
          { name: 'Star', desc: 'Central switch, most common today' },
          { name: 'Ring', desc: 'Loop, mostly historical' },
          { name: 'Mesh', desc: 'All-to-all, highest fault tolerance' },
        ].map(t => (
          <div key={t.name} className="rounded-lg border border-slate-700 bg-slate-800/60 p-2 text-center">
            <p className="text-sm font-bold text-cyan-300">{t.name}</p>
            <p className="mt-1 text-[10px] text-slate-400">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArpDiagram() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="mb-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-widest">ARP Resolution Flow</p>
      <div className="space-y-2 text-xs">
        {[
          { step: 1, msg: 'PC-A broadcasts: "Who has 192.168.1.5? Tell 192.168.1.1"', color: 'text-yellow-300' },
          { step: 2, msg: 'All devices receive the broadcast; only 192.168.1.5 replies', color: 'text-slate-400' },
          { step: 3, msg: 'PC-B unicasts: "192.168.1.5 is at AA:BB:CC:DD:EE:FF"', color: 'text-cyan-300' },
          { step: 4, msg: 'PC-A caches the mapping and sends the frame directly to that MAC', color: 'text-green-300' },
        ].map(s => (
          <div key={s.step} className="flex gap-2">
            <span className="font-bold text-slate-500">{s.step}.</span>
            <span className={s.color}>{s.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BandwidthDiagram() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="mb-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-widest">Bandwidth vs Throughput</p>
      <div className="space-y-3">
        {[
          { label: 'Bandwidth (100 Mbps)', pct: 100, color: 'bg-cyan-500', note: 'Theoretical maximum capacity' },
          { label: 'Throughput (65 Mbps)', pct: 65, color: 'bg-blue-500', note: 'Actual achieved rate (after overhead, retransmits)' },
          { label: 'Useful data (~58 Mbps)', pct: 58, color: 'bg-green-500', note: 'After removing protocol headers' },
        ].map(r => (
          <div key={r.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">{r.label}</span>
              <span className="text-slate-500 text-[10px]">{r.note}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-800">
              <div className={`h-3 rounded-full ${r.color}`} style={{ width: `${r.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CrcDiagram() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="mb-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-widest">Error Detection Comparison</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400">
            <th className="text-left pb-2">Method</th>
            <th className="text-left pb-2">Overhead</th>
            <th className="text-left pb-2">Detects</th>
            <th className="text-left pb-2">Used In</th>
          </tr>
        </thead>
        <tbody className="space-y-1">
          {[
            { m: 'Parity', o: '1 bit', d: 'Single-bit errors only', u: 'Old serial links' },
            { m: 'Checksum', o: '16 bits', d: 'Most errors, not all bursts', u: 'TCP, UDP, IP headers' },
            { m: 'CRC-32', o: '32 bits', d: 'All bursts ≤ 32 bits', u: 'Ethernet, Wi-Fi frames' },
          ].map(r => (
            <tr key={r.m} className="border-t border-slate-700/50">
              <td className="py-1.5 font-semibold text-cyan-300">{r.m}</td>
              <td className="py-1.5 text-slate-300">{r.o}</td>
              <td className="py-1.5 text-slate-400">{r.d}</td>
              <td className="py-1.5 text-slate-500">{r.u}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VisualBlock({ type }: { type?: string }) {
  if (!type || type === 'none') return null;
  return (
    <div className="my-4">
      {type === 'osi' && <OsiDiagram />}
      {type === 'encapsulation' && <EncapsulationDiagram />}
      {type === 'tcp-handshake' && <TcpHandshakeDiagram />}
      {type === 'subnet' && <SubnetDiagram />}
      {type === 'topology' && <TopologyDiagram />}
      {type === 'arp' && <ArpDiagram />}
      {type === 'bandwidth' && <BandwidthDiagram />}
      {type === 'crc' && <CrcDiagram />}
    </div>
  );
}

// ── Quiz Component ────────────────────────────────────────────────────────────

function QuizSection({
  questions,
  onComplete,
}: {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    if (!submitted) return 0;
    const correct = questions.filter(q => answers[q.id] === q.correct).length;
    return Math.round((correct / questions.length) * 100);
  }, [submitted, questions, answers]);

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) return;
    setSubmitted(true);
    onComplete(score);
  };

  return (
    <div className="space-y-5">
      {questions.map(q => (
        <div key={q.id} className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
          <p className="mb-3 text-sm font-medium text-slate-200">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, idx) => {
              const chosen = answers[q.id] === idx;
              const isCorrect = idx === q.correct;
              let cls = 'border-slate-700 bg-slate-800/50 hover:border-cyan-500/50 cursor-pointer';
              if (submitted) {
                if (isCorrect) cls = 'border-green-500/60 bg-green-500/10 cursor-default';
                else if (chosen) cls = 'border-red-500/60 bg-red-500/10 cursor-default';
                else cls = 'border-slate-700/50 bg-slate-800/30 opacity-50 cursor-default';
              } else if (chosen) {
                cls = 'border-cyan-500/70 bg-cyan-500/10 cursor-pointer';
              }
              return (
                <button
                  key={idx}
                  disabled={submitted}
                  onClick={() => setAnswers(a => ({ ...a, [q.id]: idx }))}
                  className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-all ${cls}`}
                >
                  <span className="mr-2 text-slate-500 text-xs font-mono">{String.fromCharCode(65 + idx)}.</span>
                  {opt}
                </button>
              );
            })}
          </div>
          {submitted && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${answers[q.id] === q.correct ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}`}>
              <span className="font-semibold">Explanation: </span>{q.explanation}
            </div>
          )}
        </div>
      ))}
      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length}
          className="btn w-full disabled:opacity-40"
        >
          Submit Answers ({Object.keys(answers).length}/{questions.length} answered)
        </button>
      ) : (
        <div className={`rounded-xl border p-4 text-center ${score >= 80 ? 'border-green-500/40 bg-green-500/10' : score >= 50 ? 'border-yellow-500/40 bg-yellow-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
          <p className={`text-2xl font-bold ${score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{score}%</p>
          <p className="text-sm text-slate-400 mt-1">
            {score === 100 ? '🎉 Perfect score!' : score >= 80 ? '✅ Well done!' : score >= 50 ? '📖 Review the concept and try again.' : '🔄 Re-read this lesson before continuing.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Lesson Viewer ─────────────────────────────────────────────────────────────

function LessonView({
  topic,
  lesson,
  lessonIndex,
  totalLessons,
  lessonProgress,
  onNext,
  onPrev,
  onComplete,
  onBack,
}: {
  topic: Topic;
  lesson: Lesson;
  lessonIndex: number;
  totalLessons: number;
  lessonProgress: { completed: boolean; quizScore: number | null } | undefined;
  onNext: () => void;
  onPrev: () => void;
  onComplete: (score: number | null) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<'lesson' | 'quiz'>('lesson');
  const [quizDone, setQuizDone] = useState(lessonProgress?.quizScore !== null && lessonProgress?.quizScore !== undefined);

  const handleQuizComplete = (score: number) => {
    setQuizDone(true);
    onComplete(score);
  };

  const handleMarkComplete = () => {
    if (!lessonProgress?.completed) onComplete(lessonProgress?.quizScore ?? null);
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <button onClick={onBack} className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
          <ArrowLeft size={14} />
          Back to topics
        </button>
        <ChevronRight size={14} />
        <span className="text-slate-300">{topic.title}</span>
        <ChevronRight size={14} />
        <span className="text-cyan-400">{lesson.title}</span>
      </div>

      {/* Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{topic.icon}</span>
              <span className="text-xs text-slate-500">Lesson {lessonIndex + 1} of {totalLessons}</span>
              {lessonProgress?.completed && (
                <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] text-green-400 border border-green-500/20">
                  <CheckCircle2 size={10} /> Completed
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-100">{lesson.title}</h2>
          </div>
          <div className="flex gap-2 shrink-0">
            {/* Tab switcher */}
            <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setTab('lesson')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === 'lesson' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <BookOpen size={12} /> Lesson
              </button>
              <button
                onClick={() => setTab('quiz')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === 'quiz' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <HelpCircle size={12} /> Quiz
                {quizDone && <CheckCircle2 size={10} className="text-green-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar within lesson */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800">
          <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${((lessonIndex + 1) / totalLessons) * 100}%` }} />
        </div>
      </div>

      {/* Lesson content */}
      {tab === 'lesson' && (
        <div className="space-y-4">
          {/* Concept */}
          <div className="card">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wide mb-2 flex items-center gap-2"><Star size={14} /> Concept</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{lesson.concept}</p>
          </div>

          {/* Working Principle */}
          <div className="card">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-2"><Layers size={14} /> How It Works</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{lesson.workingPrinciple}</p>
            <VisualBlock type={lesson.visualType} />
          </div>

          {/* Key Points */}
          <div className="card">
            <h3 className="text-sm font-bold text-green-400 uppercase tracking-wide mb-2 flex items-center gap-2"><CheckCircle2 size={14} /> Key Points</h3>
            <ul className="space-y-1.5">
              {lesson.keyPoints.map((pt, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                  {pt}
                </li>
              ))}
            </ul>
          </div>

          {/* Real World */}
          <div className="card border-amber-500/20 bg-amber-500/5">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-2"><Zap size={14} /> Real-World Example</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{lesson.realWorldExample}</p>
          </div>

          {/* Practical Link */}
          {lesson.practicalLink && (
            <div className="card border-cyan-500/20 bg-cyan-500/5">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wide mb-2 flex items-center gap-2"><ExternalLink size={14} /> Practical Activity</h3>
              <p className="text-sm text-slate-400 mb-3">Apply what you've learned in an interactive lab:</p>
              <Link
                to={lesson.practicalLink.route}
                className="inline-flex items-center gap-2 btn text-sm"
              >
                {lesson.practicalLink.label}
                <ExternalLink size={13} />
              </Link>
            </div>
          )}

          {/* Topic Assessment Link */}
          <div className="card border-amber-500/20 bg-amber-500/5">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Award size={14} /> Topic Assessment
            </h3>
            <p className="text-sm text-slate-400 mb-3">
              Ready to test your knowledge? Take the formal assessment for {topic.title}:
            </p>
            <Link
              to={`/assessments?test=test-topic-${topic.id}`}
              className="inline-flex items-center gap-2 btn-ghost text-amber-300 border border-amber-500/30 text-sm hover:bg-amber-500/10"
            >
              Take {topic.title} Assessment
              <ChevronRight size={13} />
            </Link>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex gap-2">
              <button onClick={onPrev} disabled={lessonIndex === 0} className="btn-ghost flex items-center gap-1.5 disabled:opacity-30 text-sm">
                <ArrowLeft size={14} /> Previous
              </button>
            </div>
            <div className="flex gap-2">
              {!lessonProgress?.completed && (
                <button
                  onClick={handleMarkComplete}
                  className="flex items-center gap-1.5 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-500/20 transition-colors"
                >
                  <CheckCircle2 size={14} /> Mark Complete
                </button>
              )}
              <button onClick={onNext} disabled={lessonIndex === totalLessons - 1} className="btn flex items-center gap-1.5 disabled:opacity-30 text-sm">
                Next <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz */}
      {tab === 'quiz' && (
        <div className="card">
          <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wide mb-4 flex items-center gap-2"><HelpCircle size={14} /> Knowledge Check</h3>
          {lessonProgress?.quizScore !== null && lessonProgress?.quizScore !== undefined && (
            <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-green-400">
              Previous score: {lessonProgress.quizScore}% — answer again to update.
            </div>
          )}
          <QuizSection questions={lesson.quiz} onComplete={handleQuizComplete} />
        </div>
      )}
    </div>
  );
}

// ── Topic Card ────────────────────────────────────────────────────────────────

function TopicCard({
  topic,
  completion,
  onClick,
}: {
  topic: Topic;
  completion: number;
  onClick: () => void;
}) {
  const diffColor: Record<Difficulty, string> = {
    beginner: 'text-green-400 border-green-500/30 bg-green-500/10',
    intermediate: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    advanced: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  };

  return (
    <button
      onClick={onClick}
      className="card text-left hover:border-cyan-500/40 transition-all group w-full"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-2xl">{topic.icon}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${diffColor[topic.difficulty]}`}>
          {topic.difficulty}
        </span>
      </div>
      <h3 className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors mb-1">{topic.title}</h3>
      <p className="text-xs text-slate-400 mb-3 line-clamp-2">{topic.description}</p>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span className="flex items-center gap-1"><BookOpen size={11} /> {topic.lessons.length} lessons</span>
        <span className="flex items-center gap-1"><Clock size={11} /> {topic.estimatedMinutes} min</span>
        <span className="flex items-center gap-1">
          {completion === 100 ? <CheckCircle2 size={11} className="text-green-400" /> : <Circle size={11} />}
          {completion}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-800">
        <div
          className={`h-1.5 rounded-full transition-all ${completion === 100 ? 'bg-green-500' : 'bg-cyan-500'}`}
          style={{ width: `${completion}%` }}
        />
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LearningCenter() {
  const [progress, setProgress] = useState<LearningProgress>(() => loadProgress());
  const [view, setView] = useState<'dashboard' | 'topic' | 'lesson'>('dashboard');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);
  const [search, setSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState<Difficulty | 'all'>('all');

  // Persist on change
  useEffect(() => { saveProgress(progress); }, [progress]);

  // Resume last visited
  useEffect(() => {
    if (progress.lastVisited) {
      const t = TOPICS.find(t => t.id === progress.lastVisited!.topicId);
      if (t) {
        const idx = t.lessons.findIndex(l => l.id === progress.lastVisited!.lessonId);
        if (idx >= 0) {
          setSelectedTopic(t);
          setSelectedLessonIdx(idx);
          setView('lesson');
        }
      }
    }
    // Only run on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTopics = useMemo(() => TOPICS.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    const matchDiff = diffFilter === 'all' || t.difficulty === diffFilter;
    return matchSearch && matchDiff;
  }), [search, diffFilter]);

  const overall = useMemo(() => getOverallProgress(TOPICS, progress), [progress]);

  const openTopic = useCallback((topic: Topic) => {
    setSelectedTopic(topic);
    setSelectedLessonIdx(0);
    setView('lesson');
    setProgress(p => markLessonVisited(p, topic.id, topic.lessons[0].id));
  }, []);

  const openLesson = useCallback((topic: Topic, idx: number) => {
    setSelectedTopic(topic);
    setSelectedLessonIdx(idx);
    setView('lesson');
    setProgress(p => markLessonVisited(p, topic.id, topic.lessons[idx].id));
  }, []);

  const handleLessonComplete = useCallback((score: number | null) => {
    if (!selectedTopic) return;
    const lesson = selectedTopic.lessons[selectedLessonIdx];
    setProgress(p => markLessonComplete(p, selectedTopic.id, lesson.id, score));
  }, [selectedTopic, selectedLessonIdx]);

  const handleNext = useCallback(() => {
    if (!selectedTopic) return;
    if (selectedLessonIdx < selectedTopic.lessons.length - 1) {
      const nextIdx = selectedLessonIdx + 1;
      setSelectedLessonIdx(nextIdx);
      setProgress(p => markLessonVisited(p, selectedTopic.id, selectedTopic.lessons[nextIdx].id));
    }
  }, [selectedTopic, selectedLessonIdx]);

  const handlePrev = useCallback(() => {
    if (selectedLessonIdx > 0) {
      const prevIdx = selectedLessonIdx - 1;
      setSelectedLessonIdx(prevIdx);
    }
  }, [selectedLessonIdx]);

  const completedTopics = useMemo(() =>
    TOPICS.filter(t => getTopicCompletion(t, progress) === 100).length,
    [progress]
  );

  const totalLessons = TOPICS.reduce((s, t) => s + t.lessons.length, 0);
  const completedLessons = TOPICS.reduce((s, t) => {
    const tp = progress.topics[t.id];
    return s + (tp ? t.lessons.filter(l => tp.lessons[l.id]?.completed).length : 0);
  }, 0);

  // ── Lesson view ───────────────────────────────────────────────
  if (view === 'lesson' && selectedTopic) {
    const lesson = selectedTopic.lessons[selectedLessonIdx];
    const lp = progress.topics[selectedTopic.id]?.lessons[lesson.id];
    return (
      <div className="space-y-4">
        {/* Lesson selector sidebar-like top nav */}
        <div className="card">
          <div className="flex items-center justify-between gap-2 mb-3">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors">
              <ArrowLeft size={13} /> Dashboard
            </button>
            <h2 className="text-sm font-semibold text-slate-200">{selectedTopic.icon} {selectedTopic.title}</h2>
            <span className="text-xs text-slate-500">{getTopicCompletion(selectedTopic, progress)}% complete</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {selectedTopic.lessons.map((l, i) => {
              const lDone = progress.topics[selectedTopic.id]?.lessons[l.id]?.completed;
              return (
                <button
                  key={l.id}
                  onClick={() => openLesson(selectedTopic, i)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    i === selectedLessonIdx
                      ? 'bg-cyan-600 text-white'
                      : lDone
                      ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lDone ? <CheckCircle2 size={10} /> : <span className="text-[10px]">{i + 1}</span>}
                  <span className="hidden sm:inline max-w-[12ch] truncate">{l.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <LessonView
          topic={selectedTopic}
          lesson={lesson}
          lessonIndex={selectedLessonIdx}
          totalLessons={selectedTopic.lessons.length}
          lessonProgress={lp}
          onNext={handleNext}
          onPrev={handlePrev}
          onComplete={handleLessonComplete}
          onBack={() => setView('dashboard')}
        />
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="text-cyan-400" size={24} />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Learning Center</h1>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">Phase 8 Active</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Structured networking theory with interactive exercises and links to practical labs.
          </p>
        </div>

        {/* Overall progress */}
        <div className="shrink-0 w-full md:w-64">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Overall progress</span>
            <span className="font-mono font-bold text-cyan-400">{overall}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${overall}%` }} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Topics', value: `${completedTopics} / ${TOPICS.length}`, icon: LayoutGrid, sub: 'completed' },
          { label: 'Lessons', value: `${completedLessons} / ${totalLessons}`, icon: BookOpen, sub: 'completed' },
          { label: 'Overall Progress', value: `${overall}%`, icon: Trophy, sub: 'done' },
          { label: 'Practicals Available', value: '8', icon: Shield, sub: 'linked labs' },
        ].map(s => (
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

      {/* Resume banner */}
      {progress.lastVisited && (() => {
        const t = TOPICS.find(t => t.id === progress.lastVisited!.topicId);
        const l = t?.lessons.find(l => l.id === progress.lastVisited!.lessonId);
        if (!t || !l) return null;
        return (
          <div className="card border-cyan-500/30 bg-cyan-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wide mb-0.5">Resume where you left off</p>
              <p className="text-sm font-medium text-slate-200">{t.icon} {t.title} → <span className="text-slate-400">{l.title}</span></p>
            </div>
            <button
              onClick={() => openLesson(t, t.lessons.indexOf(l))}
              className="btn flex items-center gap-1.5 shrink-0 text-sm"
            >
              Continue <ArrowRight size={14} />
            </button>
          </div>
        );
      })()}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            className="input pl-8"
            placeholder="Search topics..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-200">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Filter size={14} className="mt-2.5 text-slate-400 shrink-0" />
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(d => (
            <button
              key={d}
              onClick={() => setDiffFilter(d)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all capitalize ${
                diffFilter === d
                  ? d === 'all' ? 'bg-cyan-500 text-white' : d === 'beginner' ? 'bg-green-500 text-white' : d === 'intermediate' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Topic grid grouped by difficulty */}
      {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(diff => {
        const topics = filteredTopics.filter(t => t.difficulty === diff);
        if (!topics.length) return null;
        const diffLabel = { beginner: '🟢 Beginner', intermediate: '🔵 Intermediate', advanced: '🟣 Advanced' }[diff];
        return (
          <div key={diff}>
            <h2 className="mb-3 text-sm font-semibold text-slate-400 uppercase tracking-widest">{diffLabel}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {topics.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  completion={getTopicCompletion(topic, progress)}
                  onClick={() => openTopic(topic)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {filteredTopics.length === 0 && (
        <div className="card text-center py-10 text-slate-400">
          <Search size={32} className="mx-auto mb-3 opacity-30" />
          <p>No topics match "{search}".</p>
          <button onClick={() => { setSearch(''); setDiffFilter('all'); }} className="btn mt-3 text-sm">Clear filters</button>
        </div>
      )}

      {/* Quick links to labs */}
      <div className="card">
        <h2 className="font-semibold text-slate-200 mb-3 flex items-center gap-2"><ExternalLink size={16} /> Go to Practical Labs</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'PCAP Analyzer', route: '/packets', color: 'border-cyan-500/40 text-cyan-400' },
            { label: 'Protocol Lab', route: '/protocols', color: 'border-blue-500/40 text-blue-400' },
            { label: 'Topology Lab', route: '/topology', color: 'border-violet-500/40 text-violet-400' },
            { label: 'Bandwidth Monitor', route: '/bandwidth', color: 'border-green-500/40 text-green-400' },
            { label: 'Subnetting Lab', route: '/subnetting', color: 'border-orange-500/40 text-orange-400' },
            { label: 'Error Detection Lab', route: '/errors', color: 'border-pink-500/40 text-pink-400' },
            { label: 'Assessments & Certification', route: '/assessments', color: 'border-amber-500/40 text-amber-400' },
          ].map(l => (
            <Link
              key={l.route}
              to={l.route}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80 ${l.color}`}
            >
              {l.label} <ExternalLink size={10} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
