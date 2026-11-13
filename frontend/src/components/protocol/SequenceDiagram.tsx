import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Network,
  Radio,
  Server,
  Workflow,
  Zap,
} from 'lucide-react';
import { ProtocolNode, ProtocolStep } from '../../services/protocolService';

interface SequenceDiagramProps {
  nodes: ProtocolNode[];
  steps: ProtocolStep[];
  currentStepIndex: number;
  onSelectStep: (stepIndex: number) => void;
  isPlaying?: boolean;
}

export const SequenceDiagram: React.FC<SequenceDiagramProps> = ({
  nodes,
  steps,
  currentStepIndex,
  onSelectStep,
  isPlaying = false,
}) => {
  // Animation key that resets on step change to retrigger the moving packet
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey(prev => prev + 1);
  }, [currentStepIndex]);

  // Identify participating nodes and order them canonically:
  // Client is ALWAYS on the LEFT, intermediate hops in the middle, Server ALWAYS on the RIGHT.
  const canonicalLifelines = useMemo(() => {
    // Find all node IDs actually involved in communication steps
    const activeIds = new Set<string>();
    steps.forEach(s => {
      activeIds.add(s.from);
      activeIds.add(s.to);
    });

    const activeNodes = nodes.filter(n => activeIds.has(n.id));

    // Sort canonically: 'client' first, intermediate hops in middle, 'destination'/'server' last
    const sorted = [...activeNodes].sort((a, b) => {
      const getPriority = (id: string, kind: string) => {
        if (id === 'client' || kind === 'pc') return 0;
        if (id === 'router' || kind === 'router') return 1;
        if (id === 'server') return 2;
        if (id === 'destination') return 3;
        return 2;
      };
      return getPriority(a.id, a.kind) - getPriority(b.id, b.kind);
    });

    return sorted.length > 0 ? sorted : nodes;
  }, [nodes, steps]);

  // Calculate percentage X coordinate for each lifeline
  // Gives comfortable margins on left and right for device labels
  const lifelinePositions = useMemo(() => {
    const N = canonicalLifelines.length;
    const positions: Record<string, number> = {};

    if (N === 1) {
      positions[canonicalLifelines[0].id] = 50;
    } else if (N === 2) {
      // 2 devices: Client at 22%, Server at 78%
      positions[canonicalLifelines[0].id] = 22;
      positions[canonicalLifelines[1].id] = 78;
    } else {
      // 3 or more devices: evenly distributed from 16% to 84%
      canonicalLifelines.forEach((node, idx) => {
        positions[node.id] = 16 + (idx / (N - 1)) * 68;
      });
    }

    return positions;
  }, [canonicalLifelines]);

  const getNodeIcon = (kind: string, id: string) => {
    if (id === 'client' || kind === 'pc') {
      return <Laptop size={18} className="text-cyan-400" />;
    }
    if (id === 'router' || kind === 'router') {
      return <Network size={18} className="text-amber-400" />;
    }
    return <Server size={18} className="text-purple-400" />;
  };

  const getRoleLabel = (node: ProtocolNode, index: number, total: number) => {
    if (index === 0) return 'CLIENT (LEFT)';
    if (index === total - 1) {
      if (node.id === 'router' || node.kind === 'router') return 'GATEWAY (RIGHT)';
      if (node.id === 'destination') return 'DESTINATION (RIGHT)';
      return 'SERVER (RIGHT)';
    }
    if (node.id === 'router' || node.kind === 'router') return 'GATEWAY (HOP)';
    if (node.id === 'server') return 'RESOLVER / SERVER';
    return 'INTERMEDIATE HOP';
  };

  const currentStep = steps[currentStepIndex];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-navy-950 shadow-sm space-y-4">
      {/* CSS Keyframes for smooth hardware-accelerated packet animation */}
      <style>{`
        @keyframes packetGlideRight {
          0% {
            left: 0%;
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.8;
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.06);
          }
          85% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.06);
          }
          100% {
            left: 100%;
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }

        @keyframes packetGlideLeft {
          0% {
            left: 100%;
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.8;
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.06);
          }
          85% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.06);
          }
          100% {
            left: 0%;
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }

        @keyframes packetPulseGlow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(34, 211, 238, 0.6);
          }
          50% {
            box-shadow: 0 0 20px rgba(34, 211, 238, 0.95);
          }
        }

        @keyframes arrivalPing {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          70% {
            transform: scale(1.8);
            opacity: 0;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>

      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Workflow size={16} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Protocol Sequence Ladder Diagram
            </h3>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
              Interactive Packet Animation
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Chronological sequence ladder. Client is consistently positioned on the <b>LEFT</b> and Server on the <b>RIGHT</b>.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-medium">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" /> Request (Outbound →)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" /> Response (Inbound ←)
          </span>
          <span className="rounded bg-slate-100 dark:bg-navy-900 px-2 py-0.5 font-mono text-slate-400 border border-slate-200 dark:border-white/10">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
        </div>
      </div>

      {/* Diagram Container */}
      <div className="relative overflow-x-auto select-none rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-navy-950/80 p-4">
        {/* ============================================================== */}
        {/* LIFELINE COLUMN HEADERS                                         */}
        {/* ============================================================== */}
        <div className="relative mb-6 pb-2 border-b border-slate-200 dark:border-white/10">
          <div className="relative flex w-full justify-between">
            {canonicalLifelines.map((node, idx) => {
              const posX = lifelinePositions[node.id] ?? 50;
              const role = getRoleLabel(node, idx, canonicalLifelines.length);
              const isCurrentSender = currentStep?.from === node.id;
              const isCurrentReceiver = currentStep?.to === node.id;

              return (
                <div
                  key={node.id}
                  className="absolute -translate-x-1/2 flex flex-col items-center text-center transition-all duration-300"
                  style={{ left: `${posX}%` }}
                >
                  {/* Role Header Badge */}
                  <span
                    className={`mb-1.5 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider uppercase border shadow-sm ${
                      idx === 0
                        ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-400'
                        : idx === canonicalLifelines.length - 1
                        ? 'border-purple-500/40 bg-purple-500/15 text-purple-400'
                        : 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {role}
                  </span>

                  {/* Device Box */}
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-sm transition-all duration-300 ${
                      isCurrentSender
                        ? 'border-cyan-400 bg-cyan-500/20 ring-2 ring-cyan-400/50 shadow-[0_0_15px_#22d3ee40]'
                        : isCurrentReceiver
                        ? 'border-purple-400 bg-purple-500/20 ring-2 ring-purple-400/50 shadow-[0_0_15px_#a855f740]'
                        : 'border-slate-300 dark:border-white/10 bg-white dark:bg-navy-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {getNodeIcon(node.kind, node.id)}
                    <div className="text-left">
                      <p className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100">
                        {node.label}
                      </p>
                      <p className="font-mono text-[10px] text-slate-400">
                        {node.ip}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  {isCurrentSender && (
                    <span className="mt-1 flex items-center gap-1 font-mono text-[9px] font-bold text-cyan-400 animate-pulse">
                      <Radio size={9} /> SENDER
                    </span>
                  )}
                  {isCurrentReceiver && (
                    <span className="mt-1 flex items-center gap-1 font-mono text-[9px] font-bold text-purple-400 animate-pulse">
                      <Radio size={9} /> RECEIVER
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Spacer for the header boxes */}
          <div className="h-16" />
        </div>

        {/* ============================================================== */}
        {/* LADDER STEPS WORKSPACE                                          */}
        {/* ============================================================== */}
        <div className="relative space-y-4 py-2">
          {/* Continuous Vertical Lifelines passing through all steps */}
          {canonicalLifelines.map(node => {
            const posX = lifelinePositions[node.id] ?? 50;
            return (
              <div
                key={`line-${node.id}`}
                className="pointer-events-none absolute top-0 bottom-0 -translate-x-1/2 border-l-2 border-dashed border-slate-300 dark:border-slate-700/70 z-0"
                style={{ left: `${posX}%` }}
              />
            );
          })}

          {/* Message Exchange Rows */}
          {steps.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isDone = idx < currentStepIndex;

            const fromPos = lifelinePositions[step.from] ?? 22;
            const toPos = lifelinePositions[step.to] ?? 78;
            const isLeftToRight = fromPos < toPos;

            const leftX = Math.min(fromPos, toPos);
            const widthPct = Math.abs(toPos - fromPos);

            // Direction of travel on screen: true = Left-to-Right (outbound/request), false = Right-to-Left (inbound/reply)
            const isOutbound = isLeftToRight;

            return (
              <div
                key={step.index}
                onClick={() => onSelectStep(idx)}
                className={`relative z-10 flex cursor-pointer items-center rounded-xl p-2.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-500/10 ring-1 ring-cyan-400/80 shadow-md shadow-cyan-500/5'
                    : 'hover:bg-slate-100/70 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
                }`}
              >
                {/* Left Step Header / Badge */}
                <div className="flex w-36 shrink-0 items-center gap-2 pr-3">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full font-mono text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-cyan-400 text-navy-950 ring-2 ring-cyan-400/50 font-extrabold shadow-sm'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-200 text-slate-600 dark:bg-navy-800 dark:text-slate-400'
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={13} /> : step.index}
                  </span>
                  <div className="truncate">
                    <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {step.title}
                    </p>
                    <p className={`text-[10px] font-semibold ${isOutbound ? 'text-cyan-500' : 'text-emerald-500'}`}>
                      {isOutbound ? 'Outbound →' : '← Inbound'}
                    </p>
                  </div>
                </div>

                {/* Ladder Rung Transmission Area */}
                <div className="relative flex-1 h-12 flex items-center">
                  {/* Transmission Horizontal Track */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-0.5"
                    style={{
                      left: `${leftX}%`,
                      width: `${widthPct}%`,
                    }}
                  >
                    {/* The Track Line */}
                    <div
                      className={`h-full w-full rounded transition-all duration-300 ${
                        isActive
                          ? isOutbound
                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_12px_#22d3ee]'
                            : 'bg-gradient-to-l from-emerald-400 to-teal-500 shadow-[0_0_12px_#10b981]'
                          : isDone
                          ? 'bg-slate-400 dark:bg-slate-600'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />

                    {/* Origin Port Dot */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 ${
                        isLeftToRight ? '-left-1' : '-right-1'
                      } ${
                        isActive
                          ? isOutbound
                            ? 'border-cyan-300 bg-cyan-400'
                            : 'border-emerald-300 bg-emerald-400'
                          : 'border-slate-400 bg-slate-200 dark:bg-navy-800'
                      }`}
                    />

                    {/* Destination Arrowhead */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 text-xs font-bold ${
                        isLeftToRight ? '-right-2 text-cyan-400' : '-left-2 text-emerald-400'
                      }`}
                    >
                      {isLeftToRight ? (
                        <span className="text-cyan-400 text-sm">▶</span>
                      ) : (
                        <span className="text-emerald-400 text-sm">◀</span>
                      )}
                    </div>

                    {/* Static Message Label (shown when not active or after transit) */}
                    {!isActive && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold border shadow-sm ${
                            isDone
                              ? 'bg-slate-100 dark:bg-navy-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10'
                              : 'bg-slate-200/80 dark:bg-navy-800/80 text-slate-500 border-transparent'
                          }`}
                        >
                          {step.summary}
                        </span>
                      </div>
                    )}

                    {/* ========================================================== */}
                    {/* MOVING PACKET BLOCK (Active Step Only)                     */}
                    {/* Visibly moves from sender to receiver lifeline!            */}
                    {/* ========================================================== */}
                    {isActive && (
                      <div
                        key={`packet-${animKey}`}
                        className="absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none"
                        style={{
                          animation: `${isLeftToRight ? 'packetGlideRight' : 'packetGlideLeft'} 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                        }}
                      >
                        <div
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold shadow-lg text-slate-950 border ${
                            isOutbound
                              ? 'bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 border-cyan-200 shadow-[0_0_18px_rgba(6,182,212,0.85)]'
                              : 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 border-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.85)]'
                          }`}
                        >
                          {!isLeftToRight && <span className="text-[10px]">◀</span>}
                          <Zap size={11} className="fill-current" />
                          <span className="whitespace-nowrap">{step.summary}</span>
                          {isLeftToRight && <span className="text-[10px]">▶</span>}
                        </div>
                      </div>
                    )}

                    {/* Destination Arrival Ping (Active Step) */}
                    {isActive && (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full ${
                          isLeftToRight ? 'right-0' : 'left-0'
                        } ${
                          isOutbound ? 'bg-cyan-400/40' : 'bg-emerald-400/40'
                        }`}
                        style={{ animation: 'arrivalPing 1.5s ease-out infinite' }}
                      />
                    )}
                  </div>
                </div>

                {/* Protocol Tag on Right */}
                <div className="shrink-0 pl-3">
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold border ${
                      isActive
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                        : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-navy-900 text-slate-500'
                    }`}
                  >
                    {step.protocol}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
