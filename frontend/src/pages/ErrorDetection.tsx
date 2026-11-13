import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Binary,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Database,
  Grid,
  HelpCircle,
  Layers,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Type,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  EncodeResult,
  errorDetectionService,
  ErrorExperimentResult,
  TwoDParityResult,
} from '../services/errorDetectionService';
import { toast } from '../components/Toaster';

export default function ErrorDetection() {
  const [activeTab, setActiveTab] = useState<'interactive' | '2d' | 'experiment' | 'learn'>('interactive');

  // Tab 1: Interactive Codeword Lab
  const [inputMode, setInputMode] = useState<'text' | 'binary' | 'hex'>('text');
  const [textInput, setTextInput] = useState<string>('NET');
  const [binaryData, setBinaryData] = useState<string>('010011100100010101010100'); // 'NET'
  const [algorithm, setAlgorithm] = useState<'parity-even' | 'parity-odd' | 'checksum' | 'crc'>('crc');
  const [crcPreset, setCrcPreset] = useState<string>('crc-8');
  const [generator, setGenerator] = useState<string>('100000111'); // CRC-8
  const [flipPositions, setFlipPositions] = useState<number[]>([]);
  const [encodeResult, setEncodeResult] = useState<EncodeResult | null>(null);
  const [encodeLoading, setEncodeLoading] = useState<boolean>(false);
  const [encodeError, setEncodeError] = useState<string | null>(null);

  // Tab 2: 2D Matrix Parity Lab
  const [twoDData, setTwoDData] = useState<string>('10011011101101');
  const [twoDRowWidth, setTwoDRowWidth] = useState<number>(7);
  const [twoDParityType, setTwoDParityType] = useState<'even' | 'odd'>('even');
  const [twoDFlips, setTwoDFlips] = useState<number[]>([]);
  const [twoDResult, setTwoDResult] = useState<TwoDParityResult | null>(null);

  // Tab 3: Detection Rate Experiment
  const [expTrials, setExpTrials] = useState<number>(200);
  const [expDataLen, setExpDataLen] = useState<number>(32);
  const [expFlipCount, setExpFlipCount] = useState<number>(2);
  const [expResult, setExpResult] = useState<ErrorExperimentResult | null>(null);
  const [expLoading, setExpLoading] = useState<boolean>(false);

  // Tab 4: Practice Quiz
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Handle Text/Hex/Binary Conversion
  const handleTextInputChange = (val: string) => {
    setTextInput(val);
    let bin = '';
    for (let i = 0; i < val.length; i++) {
      bin += val.charCodeAt(i).toString(2).padStart(8, '0');
    }
    setBinaryData(bin || '0');
    setFlipPositions([]);
  };

  const handleCrcPresetChange = (preset: string) => {
    setCrcPreset(preset);
    if (preset === 'crc-8') setGenerator('100000111');
    else if (preset === 'crc-16') setGenerator('11000000000000101');
    else if (preset === 'crc-32') setGenerator('100000100110000010001110110110111');
    setFlipPositions([]);
  };

  // Run Encode / Verify
  useEffect(() => {
    runEncodeSimulation();
  }, [binaryData, algorithm, generator, flipPositions]);

  const runEncodeSimulation = async () => {
    if (!binaryData.trim() || !/^[01]+$/.test(binaryData.trim())) {
      setEncodeError('Data must contain only binary 0 and 1 bits.');
      setEncodeResult(null);
      return;
    }
    if (algorithm === 'crc' && (!generator.trim() || !/^1[01]+$/.test(generator.trim()))) {
      setEncodeError('CRC generator must be binary, start with 1, and have 2+ bits.');
      setEncodeResult(null);
      return;
    }

    setEncodeLoading(true);
    setEncodeError(null);
    try {
      const pType = algorithm === 'parity-odd' ? 'odd' : 'even';
      const alg = algorithm.startsWith('parity') ? 'parity' : algorithm;
      const res = await errorDetectionService.encode(
        binaryData.trim(),
        alg,
        pType,
        generator.trim(),
        flipPositions
      );
      setEncodeResult(res);
    } catch (err) {
      setEncodeError((err as Error).message);
      setEncodeResult(null);
    } finally {
      setEncodeLoading(false);
    }
  };

  // Run 2D Parity
  useEffect(() => {
    runTwoDParity();
  }, [twoDData, twoDRowWidth, twoDParityType, twoDFlips]);

  const runTwoDParity = async () => {
    if (!twoDData.trim() || !/^[01]+$/.test(twoDData.trim())) return;
    try {
      const res = await errorDetectionService.twoDParity(
        twoDData.trim(),
        twoDRowWidth,
        twoDParityType,
        twoDFlips
      );
      setTwoDResult(res);
    } catch (err) {
      console.warn('2D parity error:', err);
    }
  };

  // Run Experiment
  const handleRunExperiment = async () => {
    setExpLoading(true);
    try {
      const res = await errorDetectionService.runExperiment(
        expDataLen,
        expTrials,
        expFlipCount,
        ['parity-even', 'checksum', 'crc-8', 'crc-16'],
        42
      );
      setExpResult(res);
      toast(`Simulated ${expTrials} trials successfully!`);
    } catch (err) {
      toast(`Experiment failed: ${(err as Error).message}`);
    } finally {
      setExpLoading(false);
    }
  };

  const toggleBitFlip = (idx: number) => {
    setFlipPositions((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const injectRandomFlips = (count: number) => {
    if (!encodeResult) return;
    const len = encodeResult.transmitted_bits.length;
    const pool = Array.from({ length: len }, (_, i) => i);
    // Shuffle and pick count
    const chosen: number[] = [];
    for (let i = 0; i < Math.min(count, len); i++) {
      const idx = Math.floor(Math.random() * pool.length);
      chosen.push(pool.splice(idx, 1)[0]);
    }
    setFlipPositions(chosen);
    toast(`Injected ${chosen.length} bit error(s) at positions [${chosen.join(', ')}]`);
  };

  const quizQuestions = [
    {
      id: 1,
      q: 'Which error pattern will always go UNDETECTED by simple even parity?',
      options: ['Single-bit flip (1 error)', 'Two-bit flip (2 errors)', 'Three-bit flip (3 errors)', 'Odd burst errors'],
      correct: 1,
      explanation: 'Parity relies on the total count of 1s modulo 2. Any even number of bit inversions (2, 4, 6...) cancels out and leaves parity unchanged, going completely undetected.',
    },
    {
      id: 2,
      q: 'In CRC error detection with a generator of degree r (r+1 bits), how many redundant FCS bits are appended?',
      options: ['r + 1 bits', 'r bits', '16 bits', '8 bits'],
      correct: 1,
      explanation: 'The CRC remainder (FCS) has degree at most r - 1, which requires exactly r bits (length of generator minus 1).',
    },
    {
      id: 3,
      q: 'What is a major advantage of Two-Dimensional (Matrix) Parity over 1D Parity?',
      options: ['Uses fewer parity bits', 'Can detect AND correct a single-bit error', 'Works without binary data', 'Guarantees 100% burst detection'],
      correct: 1,
      explanation: 'When a single bit error occurs, exactly one row check and one column check fail. The intersection of that row and column uniquely pinpoints the inverted bit, enabling single-bit error correction.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-cyan-400" size={24} />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Error Detection & Correction Lab
            </h1>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
              Interactive Transmission
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Parity, 2D Matrix Parity, Internet Checksum (RFC 1071), CRC polynomials, error injection, and empirical detection rates.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('interactive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'interactive'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap size={14} /> Bit Injection Lab
          </button>
          <button
            onClick={() => setActiveTab('2d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === '2d'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid size={14} /> 2D Matrix Parity
          </button>
          <button
            onClick={() => setActiveTab('experiment')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'experiment'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity size={14} /> Detection Simulation
          </button>
          <button
            onClick={() => setActiveTab('learn')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'learn'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen size={14} /> Guide & Quiz
          </button>
        </div>
      </div>

      {/* Tab 1: Interactive Codeword Lab */}
      {activeTab === 'interactive' && (
        <div className="space-y-4">
          {/* Controls Card */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
              <span className="font-semibold text-slate-200">1. Data Input & Algorithm Selection</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Input Mode:</span>
                {(['text', 'binary'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setInputMode(m)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      inputMode === m
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m === 'text' ? 'Text String' : 'Raw Binary'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {inputMode === 'text' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    ASCII Message
                  </label>
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => handleTextInputChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-slate-200"
                    placeholder="e.g. NET"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Raw Binary Bits
                  </label>
                  <input
                    type="text"
                    value={binaryData}
                    onChange={(e) => {
                      setBinaryData(e.target.value.trim());
                      setFlipPositions([]);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-slate-200"
                    placeholder="e.g. 1011001"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Detection Algorithm
                </label>
                <select
                  value={algorithm}
                  onChange={(e) => {
                    setAlgorithm(e.target.value as any);
                    setFlipPositions([]);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200"
                >
                  <option value="parity-even">Single Parity (Even)</option>
                  <option value="parity-odd">Single Parity (Odd)</option>
                  <option value="checksum">Internet Checksum (16-bit RFC 1071)</option>
                  <option value="crc">Cyclic Redundancy Check (CRC)</option>
                </select>
              </div>

              {algorithm === 'crc' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    CRC Polynomial Preset
                  </label>
                  <select
                    value={crcPreset}
                    onChange={(e) => handleCrcPresetChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-slate-200"
                  >
                    <option value="crc-8">CRC-8 (100000111)</option>
                    <option value="crc-16">CRC-16-IBM (11000000000000101)</option>
                    <option value="crc-32">CRC-32 Ethernet (33 bits)</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-end">
                  <div className="p-2 rounded bg-slate-800/60 border border-slate-800 text-[11px] text-slate-400 w-full">
                    {algorithm.startsWith('parity')
                      ? 'Adds 1 parity bit matching odd/even count.'
                      : 'Folds 16-bit word carries with 1s complement.'}
                  </div>
                </div>
              )}
            </div>

            {encodeError && (
              <div className="flex items-center gap-2 p-2 rounded bg-red-950/40 border border-red-900/50 text-xs text-red-300">
                <AlertCircle size={14} className="shrink-0" />
                <span>{encodeError}</span>
              </div>
            )}
          </div>

          {/* Interactive Bit Stream Transmission & Injection */}
          {encodeResult && (
            <div className="card p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Zap size={16} className="text-cyan-400" />
                    2. Physical Transmission: Click any bit to inject bit error
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Transmitted Codeword = Payload Data (blue/white) + Redundancy Check Bits (cyan).
                  </p>
                </div>

                {/* Quick Error Injection Tools */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Inject:</span>
                  <button
                    onClick={() => injectRandomFlips(1)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700"
                  >
                    +1 Bit Flip
                  </button>
                  <button
                    onClick={() => injectRandomFlips(2)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700"
                  >
                    +2 Bit Flips
                  </button>
                  <button
                    onClick={() => {
                      setFlipPositions([]);
                      toast('Bit errors cleared');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-white border border-slate-700"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                </div>
              </div>

              {/* Bit Blocks Grid */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 max-h-56 overflow-y-auto">
                  {encodeResult.received_bits.split('').map((bit, idx) => {
                    const isFlipped = flipPositions.includes(idx);
                    const isRedundant =
                      idx >=
                      encodeResult.transmitted_bits.length - encodeResult.redundant_bits.length;

                    return (
                      <button
                        key={idx}
                        onClick={() => toggleBitFlip(idx)}
                        className={`w-8 h-9 rounded-md font-mono text-xs font-bold transition-all flex flex-col items-center justify-center border shadow-sm ${
                          isFlipped
                            ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                            : isRedundant
                            ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:border-cyan-400'
                            : 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:border-slate-500'
                        }`}
                        title={`Bit index ${idx} · ${isRedundant ? 'FCS/Check Bit' : 'Data Bit'} · Click to flip`}
                      >
                        <span className="text-[8px] opacity-50 font-normal leading-none mb-0.5">
                          {idx}
                        </span>
                        <span>{bit}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-700" /> Data Bits
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-cyan-950/60 border border-cyan-500/50" /> Check / FCS Bits ({encodeResult.redundant_bits.length}b)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-rose-600" /> Flipped Bit Error ({flipPositions.length})
                    </span>
                  </div>
                  <span className="font-mono text-slate-500">
                    Codeword length: {encodeResult.transmitted_bits.length} bits
                  </span>
                </div>
              </div>

              {/* Receiver Verification Result Banner */}
              <div
                className={`p-4 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                  encodeResult.verification.passed
                    ? flipPositions.length > 0
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                      : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}
              >
                {encodeResult.verification.passed ? (
                  flipPositions.length > 0 ? (
                    <ShieldAlert size={20} className="text-amber-400 mt-0.5 shrink-0" />
                  ) : (
                    <ShieldCheck size={20} className="text-emerald-400 mt-0.5 shrink-0" />
                  )
                ) : (
                  <AlertCircle size={20} className="text-rose-400 mt-0.5 shrink-0" />
                )}

                <div className="space-y-1">
                  <div className="font-bold text-sm">
                    {encodeResult.verification.passed
                      ? flipPositions.length > 0
                        ? 'CRITICAL: UNDETECTED ERROR! (Even Parity Limitation)'
                        : 'TRANSMISSION VERIFIED: NO ERRORS DETECTED'
                      : 'TRANSMISSION CORRUPTED: ERROR SUCCESSFULLY DETECTED'}
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    {encodeResult.verification.detail}
                  </p>
                </div>
              </div>

              {/* Mathematical Step-by-Step Execution */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                <span className="font-semibold text-slate-200">
                  Mathematical Execution Steps:
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1 text-[11px] font-mono pr-1">
                  {encodeResult.steps.map((st) => (
                    <div
                      key={st.step}
                      className="flex items-start justify-between p-1.5 rounded bg-slate-800/40 border border-slate-800/60"
                    >
                      <span className="text-slate-300">
                        {st.step}. {st.description}
                      </span>
                      {st.value && (
                        <span className="text-cyan-400 font-bold ml-2 shrink-0">{st.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: 2D Matrix Parity */}
      {activeTab === '2d' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Grid size={16} className="text-cyan-400" />
                  Two-Dimensional (Matrix) Parity & Error Correction Lab
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Computes row and column parity bits. A single bit error causes exactly 1 row error and 1 column error, enabling pinpoint bit location and correction!
                </p>
              </div>
              <button
                onClick={() => setTwoDFlips([])}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw size={12} /> Clear Flips
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Binary Stream</label>
                <input
                  type="text"
                  value={twoDData}
                  onChange={(e) => {
                    setTwoDData(e.target.value.trim());
                    setTwoDFlips([]);
                  }}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Row Width (Cols)</label>
                <select
                  value={twoDRowWidth}
                  onChange={(e) => {
                    setTwoDRowWidth(parseInt(e.target.value, 10));
                    setTwoDFlips([]);
                  }}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-slate-200"
                >
                  <option value={7}>7 bits (Standard 7-bit ASCII)</option>
                  <option value={8}>8 bits (1 Byte)</option>
                  <option value={4}>4 bits (Nibble)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Parity Scheme</label>
                <select
                  value={twoDParityType}
                  onChange={(e) => {
                    setTwoDParityType(e.target.value as any);
                    setTwoDFlips([]);
                  }}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-200"
                >
                  <option value="even">Even Parity</option>
                  <option value="odd">Odd Parity</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2D Matrix Display */}
          {twoDResult && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                <span className="font-semibold text-slate-200">
                  Received Matrix ({twoDResult.num_rows} Data Rows + Column Parity Row)
                </span>
                <span className="text-slate-400">Click any matrix cell to flip its bit!</span>
              </div>

              {/* Grid visualizer */}
              <div className="inline-block p-4 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto">
                <table className="border-collapse font-mono text-xs text-center">
                  <thead>
                    <tr>
                      <th className="p-1 text-[10px] text-slate-600">Row</th>
                      {Array.from({ length: twoDResult.row_width }, (_, c) => (
                        <th
                          key={c}
                          className={`p-2 ${
                            twoDResult.col_error_indices.includes(c)
                              ? 'text-rose-400 bg-rose-950/40 rounded'
                              : 'text-slate-500'
                          }`}
                        >
                          Col {c}
                        </th>
                      ))}
                      <th className="p-2 text-cyan-400 border-l border-slate-800">Row Parity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {twoDResult.received_matrix.map((row, r) => {
                      const hasRowErr = twoDResult.row_error_indices.includes(r);
                      return (
                        <tr key={r} className={hasRowErr ? 'bg-rose-950/20' : ''}>
                          <td className="p-1 text-[10px] text-slate-600 font-sans">R{r}</td>
                          {row.map((bit, c) => {
                            const flatIdx = r * (twoDResult.row_width + 1) + c;
                            const isFlipped = twoDFlips.includes(flatIdx);
                            const isCorrected =
                              twoDResult.can_correct_single_bit &&
                              twoDResult.corrected_position?.[0] === r &&
                              twoDResult.corrected_position?.[1] === c;

                            return (
                              <td key={c} className="p-1">
                                <button
                                  onClick={() =>
                                    setTwoDFlips((prev) =>
                                      prev.includes(flatIdx)
                                        ? prev.filter((x) => x !== flatIdx)
                                        : [...prev, flatIdx]
                                    )
                                  }
                                  className={`w-7 h-7 rounded font-bold transition-all ${
                                    isFlipped
                                      ? 'bg-rose-600 text-white animate-pulse'
                                      : isCorrected
                                      ? 'bg-amber-500/20 border border-amber-400 text-amber-300'
                                      : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700'
                                  }`}
                                  title={`Click to flip bit at Row ${r}, Col ${c}`}
                                >
                                  {bit}
                                </button>
                              </td>
                            );
                          })}
                          {/* Row Parity Cell */}
                          <td className="p-1 border-l border-slate-800">
                            <span
                              className={`inline-block w-7 h-7 leading-7 rounded font-bold ${
                                hasRowErr
                                  ? 'bg-rose-900/60 text-rose-300 border border-rose-500'
                                  : 'bg-cyan-950/40 text-cyan-300'
                              }`}
                            >
                              {twoDResult.received_row_parities[r]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Column Parity Row */}
                    <tr className="border-t border-slate-800">
                      <td className="p-1 text-[10px] text-cyan-400 font-sans">Col P</td>
                      {twoDResult.received_col_parities.map((cBit, c) => {
                        const hasColErr = twoDResult.col_error_indices.includes(c);
                        return (
                          <td key={c} className="p-1">
                            <span
                              className={`inline-block w-7 h-7 leading-7 rounded font-bold ${
                                hasColErr
                                  ? 'bg-rose-900/60 text-rose-300 border border-rose-500'
                                  : 'bg-cyan-950/40 text-cyan-300'
                              }`}
                            >
                              {cBit}
                            </span>
                          </td>
                        );
                      })}
                      <td className="p-1 border-l border-slate-800 text-slate-600">■</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status / Correction Box */}
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                  twoDResult.passed
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : twoDResult.can_correct_single_bit
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="font-bold">
                  {twoDResult.passed
                    ? '✓ All Row and Column Parities Match (No Errors)'
                    : twoDResult.can_correct_single_bit
                    ? '⚡ Single Bit Error Detected & Successfully Located!'
                    : '⚠ Multiple Bit Errors Detected (Correction Ambiguous)'}
                </div>
                <p className="text-[11px] opacity-90">{twoDResult.detail}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Detection Rate Experiment */}
      {activeTab === 'experiment' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Activity size={16} className="text-cyan-400" />
              Monte Carlo Detection Rate Experiment (Controlled Simulation)
            </h3>
            <p className="text-xs text-slate-400">
              Runs randomized transmissions with controlled bit inversions to compare the mathematical reliability of Parity, Checksum, and CRC.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Simulation Trials: {expTrials}
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={expTrials}
                  onChange={(e) => setExpTrials(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Injected Errors per Message: {expFlipCount} bit(s)
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={expFlipCount}
                  onChange={(e) => setExpFlipCount(parseInt(e.target.value, 10))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Try 2 bits to observe why simple parity drops to 0%!
                </span>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Payload Size</label>
                <select
                  value={expDataLen}
                  onChange={(e) => setExpDataLen(parseInt(e.target.value, 10))}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-200 font-mono"
                >
                  <option value={16}>16 bits (2 Bytes)</option>
                  <option value={32}>32 bits (4 Bytes)</option>
                  <option value={64}>64 bits (8 Bytes)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunExperiment}
              disabled={expLoading}
              className="mt-2 px-5 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm flex items-center gap-1.5"
            >
              <Play size={14} /> Run Detection Simulation
            </button>
          </div>

          {/* Results Comparison Chart */}
          {expResult && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
                <span className="font-semibold text-slate-200">
                  Detection Rate Comparison ({expResult.trials} Trials · {expResult.flip_count} Bit Flips)
                </span>
                <span className="font-mono text-cyan-400 text-[11px]">
                  Data length: {expResult.data_length} bits
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expResult.stats}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="algorithm" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                      formatter={(val: number) => [`${val}%`, 'Detection Rate']}
                    />
                    <Bar dataKey="detection_rate_pct" name="Detected %" radius={[4, 4, 0, 0]}>
                      {expResult.stats.map((s, idx) => (
                        <Cell
                          key={idx}
                          fill={
                            s.detection_rate_pct === 100
                              ? '#10b981'
                              : s.detection_rate_pct > 80
                              ? '#06b6d4'
                              : s.detection_rate_pct > 0
                              ? '#f59e0b'
                              : '#ef4444'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Statistical Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                    <tr>
                      <th className="py-2 px-2">Algorithm</th>
                      <th className="py-2 px-2">Trials</th>
                      <th className="py-2 px-2 text-emerald-400">Detected</th>
                      <th className="py-2 px-2 text-rose-400">Undetected (Missed)</th>
                      <th className="py-2 px-2 text-right">Detection Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {expResult.stats.map((st) => (
                      <tr key={st.algorithm} className="hover:bg-slate-800/40">
                        <td className="py-2 px-2 font-sans font-semibold text-slate-200">
                          {st.algorithm}
                        </td>
                        <td className="py-2 px-2 text-slate-400">{st.trials}</td>
                        <td className="py-2 px-2 text-emerald-400">{st.detected}</td>
                        <td className="py-2 px-2 text-rose-400 font-bold">{st.undetected}</td>
                        <td className="py-2 px-2 text-right font-bold text-cyan-300">
                          {st.detection_rate_pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-cyan-400">Educational Insight: </span>
                {expResult.explanation}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Guide & Practice Quiz */}
      {activeTab === 'learn' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="card p-4 space-y-2 bg-slate-900/60 border-slate-800">
              <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                <ShieldCheck size={15} /> 1. Single Parity Bits
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Adds 1 redundant bit to make the count of 1s even (or odd).
                Detects all 1-bit errors, but <strong>fails completely on any even number of bit inversions (2, 4, 6...)</strong> because $1 \oplus 1 = 0$.
              </p>
            </div>

            <div className="card p-4 space-y-2 bg-slate-900/60 border-slate-800">
              <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                <Grid size={15} /> 2. Two-Dimensional Parity
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Arranges data into a rectangular matrix. Computes parity for every row and every column.
                If a single bit flips, the intersection of the failed row and column reveals its exact coordinate, enabling <strong>Single Error Correction</strong>!
              </p>
            </div>

            <div className="card p-4 space-y-2 bg-slate-900/60 border-slate-800">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Binary size={15} /> 3. Internet Checksum (RFC 1071)
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Used in IPv4 headers, TCP, and UDP. Sums 16-bit words using one's complement arithmetic (end-around carry fold), then inverts all bits.
                Fast in software, but cannot catch compensating errors (e.g. one bit incrementing while another decrements in the same column).
              </p>
            </div>

            <div className="card p-4 space-y-2 bg-slate-900/60 border-slate-800">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <Zap size={15} /> 4. Cyclic Redundancy Check (CRC)
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Based on polynomial division in Galois Field GF(2) using XOR.
                Detects all single-bit, double-bit, and odd-numbered errors, plus all burst errors up to length $r$ (degree of generator polynomial).
              </p>
            </div>
          </div>

          {/* Interactive DCN Practice Quiz */}
          <div className="card p-5 space-y-4 border-cyan-500/30 bg-gradient-to-br from-slate-900 to-navy-950">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  DCN Error Detection Practice Quiz
                </h3>
              </div>
              <button
                onClick={() => {
                  setQuizAnswers({});
                  setQuizSubmitted(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw size={12} /> Reset Quiz
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {quizQuestions.map((q) => {
                const selected = quizAnswers[q.id];
                const isCorrect = selected === q.correct;
                return (
                  <div key={q.id} className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2.5">
                    <p className="font-semibold text-slate-200">{q.id}. {q.q}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => (
                        <button
                          key={opt}
                          onClick={() => {
                            if (!quizSubmitted) {
                              setQuizAnswers({ ...quizAnswers, [q.id]: optIdx });
                            }
                          }}
                          className={`p-2 rounded-md text-left font-mono text-xs border transition-all ${
                            selected === optIdx
                              ? quizSubmitted
                                ? isCorrect
                                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                                  : 'bg-red-950/60 border-red-500 text-red-300'
                                : 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                              : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {quizSubmitted && (
                      <div className={`p-2 rounded text-[11px] font-sans ${isCorrect ? 'bg-emerald-950/30 text-emerald-300' : 'bg-red-950/30 text-red-300'}`}>
                        {isCorrect ? '✓ Correct!' : '✗ Incorrect.'} {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!quizSubmitted ? (
              <button
                onClick={() => setQuizSubmitted(true)}
                disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
              >
                Submit Answers
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                Score:{' '}
                {quizQuestions.filter((q) => quizAnswers[q.id] === q.correct).length} / {quizQuestions.length} correct!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
