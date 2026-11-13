import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Layers,
  Network,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Shield,
  Workflow,
  Zap,
} from 'lucide-react';
import {
  ProtocolDetail,
  protocolService,
  ProtocolSummary,
} from '../services/protocolService';
import { NodeFlowVisualizer } from '../components/protocol/NodeFlowVisualizer';
import { SequenceDiagram } from '../components/protocol/SequenceDiagram';
import { ProtocolHeaderInspector } from '../components/protocol/ProtocolHeaderInspector';
import { toast } from '../components/Toaster';

export default function ProtocolLab() {
  const [protocols, setProtocols] = useState<ProtocolSummary[]>([]);
  const [selectedProtocolName, setSelectedProtocolName] = useState<string | null>(null);
  const [protocolDetail, setProtocolDetail] = useState<ProtocolDetail | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [visualizerMode, setVisualizerMode] = useState<'flow' | 'sequence'>('flow');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load protocol list
  useEffect(() => {
    const fetchProtocols = async () => {
      setLoading(true);
      try {
        const list = await protocolService.listProtocols();
        setProtocols(list);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchProtocols();
  }, []);

  // Load specific protocol detail when selected
  useEffect(() => {
    if (!selectedProtocolName) {
      setProtocolDetail(null);
      setCurrentStepIndex(0);
      setIsPlaying(false);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await protocolService.getProtocol(selectedProtocolName);
        setProtocolDetail(detail);
        setCurrentStepIndex(0);
        setIsPlaying(false);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [selectedProtocolName]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying || !protocolDetail) return;

    const timer = setInterval(() => {
      setCurrentStepIndex(curr => {
        if (curr >= protocolDetail.steps.length - 1) {
          setIsPlaying(false);
          toast(`Completed ${protocolDetail.title}`);
          return curr;
        }
        return curr + 1;
      });
    }, 2800);

    return () => clearInterval(timer);
  }, [isPlaying, protocolDetail]);

  const handleNextStep = () => {
    if (!protocolDetail) return;
    if (currentStepIndex < protocolDetail.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      toast('You have reached the final step of this experiment');
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
    toast('Experiment reset to Step 1');
  };

  const currentStep = protocolDetail ? protocolDetail.steps[currentStepIndex] || null : null;
  const isCompleted = protocolDetail ? currentStepIndex === protocolDetail.steps.length - 1 : false;

  return (
    <div className="space-y-6">
      {/* Top Banner: Title & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-cyan-500">NetLab Academy</span>
            <ChevronRight size={12} />
            <span>Interactive Protocol Lab</span>
            {selectedProtocolName && (
              <>
                <ChevronRight size={12} />
                <span className="font-mono text-cyan-400 uppercase">{selectedProtocolName}</span>
              </>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Protocol Learning Lab</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Interactive step-by-step visualizations, protocol header dissection, and hands-on networking experiments.
          </p>
        </div>

        {selectedProtocolName && (
          <button
            className="btn-ghost flex items-center gap-2 border border-slate-300 dark:border-white/10"
            onClick={() => setSelectedProtocolName(null)}
          >
            <ArrowLeft size={14} />
            <span>Back to All Protocols</span>
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          <span className="font-semibold">Error: </span>
          {error}
        </div>
      )}

      {/* Global Virtual / Simulated Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-950/20 to-navy-900/40 p-4 text-xs">
        <Shield size={16} className="mt-0.5 shrink-0 text-purple-400" />
        <div className="space-y-0.5">
          <span className="font-semibold text-purple-300">
            Controlled Virtual Protocol Experimentation
          </span>
          <p className="text-slate-400">
            Simulations execute deterministic educational state machines representing standard RFC protocol flows.
            No live packets are transmitted onto your host network.
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border border-purple-500/40 bg-purple-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-purple-400">
          DATA SOURCE: VIRTUAL
        </span>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: PROTOCOL CATALOG / DASHBOARD                           */}
      {/* ============================================================== */}
      {!selectedProtocolName && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {protocols.map(proto => (
              <div
                key={proto.name}
                onClick={() => setSelectedProtocolName(proto.name)}
                className="card group flex cursor-pointer flex-col justify-between space-y-4 transition-all duration-200 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                <div className="space-y-3">
                  {/* Top Bar: Protocol Acronym & Layer Badge */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-bold text-cyan-400 group-hover:text-cyan-300">
                      {proto.name.toUpperCase()}
                    </span>
                    <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-400">
                      {proto.layer}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                      {proto.full_name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {proto.description}
                    </p>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 border-t border-slate-100 pt-2.5 dark:border-white/5">
                    <div>
                      <span className="text-slate-500">Port: </span>
                      <b className="text-slate-300">{proto.port}</b>
                    </div>
                    <div>
                      <span className="text-slate-500">Steps: </span>
                      <b className="text-cyan-400">{proto.step_count}</b>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/5 text-xs">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-navy-900 dark:text-slate-400">
                    {proto.difficulty}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-cyan-400 group-hover:underline">
                    Start Lab <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Learning Tip */}
          <div className="card flex items-start gap-4 bg-slate-50/50 dark:bg-navy-900/30">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400">
              <BookOpen size={20} />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Recommended Learning Order</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                We recommend exploring <b>ARP</b> (Layer 2 address mapping) first, followed by <b>ICMP</b> (Layer 3 diagnostics), <b>TCP & UDP</b> (Layer 4 transport behaviors), and finally <b>DNS, DHCP, & HTTP</b> (Layer 7 application interactions).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: ACTIVE PROTOCOL INTERACTIVE WORKSPACE                  */}
      {/* ============================================================== */}
      {selectedProtocolName && protocolDetail && (
        <div className="space-y-6">
          {/* Top Experiment Header Card */}
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold text-cyan-400">
                    {protocolDetail.name.toUpperCase()}
                  </span>
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">
                    — {protocolDetail.full_name}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {protocolDetail.purpose}
                </p>
              </div>

              {/* View Switcher: Node Flow vs Sequence Diagram */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-navy-900 text-xs">
                <button
                  className={`flex items-center gap-1.5 rounded px-3 py-1 font-medium transition ${
                    visualizerMode === 'flow'
                      ? 'bg-cyan-500 text-navy-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  onClick={() => setVisualizerMode('flow')}
                >
                  <Network size={13} />
                  <span>Node Network Flow</span>
                </button>
                <button
                  className={`flex items-center gap-1.5 rounded px-3 py-1 font-medium transition ${
                    visualizerMode === 'sequence'
                      ? 'bg-cyan-500 text-navy-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  onClick={() => setVisualizerMode('sequence')}
                >
                  <Workflow size={13} />
                  <span>Ladder Sequence</span>
                </button>
              </div>
            </div>

            {/* Stepper Playback Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Stepper Buttons */}
              <div className="flex items-center gap-2">
                <button
                  className="btn-ghost flex items-center gap-1 !py-1.5 text-xs"
                  onClick={handleRestart}
                  title="Reset to Step 1"
                >
                  <RotateCcw size={13} />
                  <span>Restart</span>
                </button>

                <button
                  className="btn-ghost flex items-center gap-1 !py-1.5 text-xs"
                  onClick={handlePrevStep}
                  disabled={currentStepIndex <= 0}
                  title="Previous Step"
                >
                  <ArrowLeft size={13} />
                  <span>Previous</span>
                </button>

                <button
                  className="btn flex items-center gap-1 !py-1.5 text-xs"
                  onClick={handleNextStep}
                  disabled={currentStepIndex >= protocolDetail.steps.length - 1}
                  title="Next Step"
                >
                  <span>Next Step</span>
                  <ArrowRight size={13} />
                </button>

                <button
                  className={`btn-ghost flex items-center gap-1 !py-1.5 text-xs ${
                    isPlaying ? 'text-amber-400' : 'text-cyan-400'
                  }`}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                  <span>{isPlaying ? 'Pause Auto-Play' : 'Auto-Play'}</span>
                </button>
              </div>

              {/* Step indicator pills */}
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                {protocolDetail.steps.map((st, i) => (
                  <button
                    key={st.index}
                    onClick={() => {
                      setCurrentStepIndex(i);
                      setIsPlaying(false);
                    }}
                    className={`rounded-full px-2.5 py-0.5 font-mono text-xs transition ${
                      i === currentStepIndex
                        ? 'bg-cyan-500 text-navy-950 font-bold ring-2 ring-cyan-400/50'
                        : i < currentStepIndex
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-navy-900 dark:text-slate-400'
                    }`}
                  >
                    {st.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visualization Area: Node Flow or Sequence Diagram */}
          {visualizerMode === 'flow' ? (
            <NodeFlowVisualizer
              nodes={protocolDetail.nodes}
              currentStep={currentStep}
              isPlaying={isPlaying}
            />
          ) : (
            <SequenceDiagram
              nodes={protocolDetail.nodes}
              steps={protocolDetail.steps}
              currentStepIndex={currentStepIndex}
              onSelectStep={i => {
                setCurrentStepIndex(i);
                setIsPlaying(false);
              }}
              isPlaying={isPlaying}
            />
          )}

          {/* Header Inspector & Step Explanation */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Step Explanation Card */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-400 font-mono text-xs font-bold text-navy-950">
                    {currentStep?.index}
                  </span>
                  <h3 className="text-sm font-semibold">{currentStep?.title}</h3>
                </div>
                <span className="font-mono text-xs text-slate-500">
                  {currentStep?.protocol} Message
                </span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-navy-900/60 font-sans">
                  <span className="font-semibold text-cyan-400">Step Objective: </span>
                  {currentStep?.explanation}
                </div>

                {protocolDetail.real_world_example && (
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
                      Real-World Application:
                    </span>
                    <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                      {protocolDetail.real_world_example}
                    </p>
                  </div>
                )}
              </div>

              {/* Completion Banner */}
              {isCompleted && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} />
                    <span>Experiment Complete!</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-300">
                    You have observed the entire message sequence of {protocolDetail.title}. Compare these findings with real packets in the Packet Analyzer!
                  </p>
                </div>
              )}
            </div>

            {/* Protocol Header Inspector */}
            <ProtocolHeaderInspector step={currentStep} />
          </div>

          {/* Key Observations Panel */}
          {protocolDetail.key_observations && protocolDetail.key_observations.length > 0 && (
            <div className="card space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                <Zap size={15} className="text-amber-400" />
                Key Networking Concepts & Observations
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {protocolDetail.key_observations.map((obs, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cross-link to Packet Analyzer */}
          <div className="card flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-navy-900 to-navy-950 border-cyan-500/20">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-cyan-300">
                Ready to inspect real {protocolDetail.name.toUpperCase()} traffic?
              </h4>
              <p className="text-xs text-slate-400">
                Open the PCAP Analyzer to inspect real-world {protocolDetail.name.toUpperCase()} packets captured in Wireshark format, or capture live packets from your network interface.
              </p>
            </div>

            <Link
              to="/packets"
              className="btn flex items-center gap-2 text-xs shadow-md shadow-cyan-500/20"
            >
              <span>Inspect in Packet Analyzer</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
