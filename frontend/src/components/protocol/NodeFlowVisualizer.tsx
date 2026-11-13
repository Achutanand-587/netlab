import React, { useMemo } from 'react';
import { ArrowLeft, ArrowRight, Laptop, Network, Server, Zap } from 'lucide-react';
import { ProtocolNode, ProtocolStep } from '../../services/protocolService';

interface NodeFlowVisualizerProps {
  nodes: ProtocolNode[];
  currentStep: ProtocolStep | null;
  isPlaying?: boolean;
}

export const NodeFlowVisualizer: React.FC<NodeFlowVisualizerProps> = ({
  nodes,
  currentStep,
  isPlaying,
}) => {
  const getNodeIcon = (kind: string, id: string) => {
    if (id === 'client' || kind === 'pc') return <Laptop size={22} className="text-cyan-400" />;
    if (id === 'router' || kind === 'router') return <Network size={22} className="text-amber-400" />;
    return <Server size={22} className="text-purple-400" />;
  };

  // Sort nodes so Client is consistently on the LEFT and Server on the RIGHT
  const orderedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      const getPriority = (id: string, kind: string) => {
        if (id === 'client' || kind === 'pc') return 0;
        if (id === 'router' || kind === 'router') return 1;
        if (id === 'server') return 2;
        if (id === 'destination') return 3;
        return 2;
      };
      return getPriority(a.id, a.kind) - getPriority(b.id, b.kind);
    });
  }, [nodes]);

  const fromNode = currentStep ? orderedNodes.find(n => n.id === currentStep.from) : null;
  const toNode = currentStep ? orderedNodes.find(n => n.id === currentStep.to) : null;

  const fromIdx = currentStep ? orderedNodes.findIndex(n => n.id === currentStep.from) : -1;
  const toIdx = currentStep ? orderedNodes.findIndex(n => n.id === currentStep.to) : -1;
  const isOutbound = fromIdx <= toIdx;

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-900 to-navy-950 p-6 text-white dark:border-white/10 shadow-sm">
      {/* Top Diagram Legend */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-cyan-400">Network Node Topology</span>
          <span className="rounded bg-navy-900 px-2 py-0.5 font-mono text-[10px] text-slate-400 border border-white/10">
            Client (Left) &bull; Server (Right)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" /> Sender (Active)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-400" /> Target Receiver
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Hop / Gateway
          </span>
        </div>
      </div>

      {/* Node Strip */}
      <div className="relative my-6 flex flex-wrap items-center justify-around gap-4">
        {orderedNodes.map((node, index) => {
          const isSender = currentStep?.from === node.id;
          const isReceiver = currentStep?.to === node.id;
          const isVia = currentStep?.via.includes(node.id);

          let roleTag = 'INTERMEDIATE HOP';
          if (index === 0) {
            roleTag = 'CLIENT (LEFT)';
          } else if (index === orderedNodes.length - 1) {
            if (node.id === 'router' || node.kind === 'router') roleTag = 'GATEWAY (RIGHT)';
            else if (node.id === 'destination') roleTag = 'DESTINATION (RIGHT)';
            else roleTag = 'SERVER (RIGHT)';
          } else if (node.id === 'router' || node.kind === 'router') {
            roleTag = 'GATEWAY (HOP)';
          } else if (node.id === 'server') {
            roleTag = 'RESOLVER / SERVER';
          }

          return (
            <div key={node.id} className="relative z-10 flex flex-col items-center">
              {/* Role Header */}
              <span className="mb-1 text-[9px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                {roleTag}
              </span>

              {/* Active Node Pulse Ring */}
              <div
                className={`relative grid h-16 w-16 place-items-center rounded-2xl border transition-all duration-300 ${
                  isSender
                    ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_20px_#22d3ee50] ring-2 ring-cyan-400'
                    : isReceiver
                    ? 'border-purple-400 bg-purple-500/20 shadow-[0_0_20px_#a855f750] ring-2 ring-purple-400'
                    : isVia
                    ? 'border-amber-400/60 bg-amber-500/15'
                    : 'border-white/10 bg-navy-900/80 text-slate-400'
                }`}
              >
                {getNodeIcon(node.kind, node.id)}

                {/* Sender / Receiver Badge */}
                {isSender && (
                  <span className="absolute -top-2 rounded-full bg-cyan-400 px-1.5 py-0.2 font-mono text-[9px] font-bold text-navy-950 uppercase shadow-sm">
                    Sender
                  </span>
                )}
                {isReceiver && (
                  <span className="absolute -top-2 rounded-full bg-purple-400 px-1.5 py-0.2 font-mono text-[9px] font-bold text-white uppercase shadow-sm">
                    Target
                  </span>
                )}
              </div>

              {/* Node Labels */}
              <div className="mt-2 text-center">
                <p className="text-xs font-semibold text-slate-200">{node.label}</p>
                <p className="font-mono text-[11px] text-slate-400">{node.ip}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Transmission Flow Ribbon with Moving Packet Animation */}
      {currentStep && (
        <div className="mt-6 rounded-lg border border-cyan-500/30 bg-navy-900/90 p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono font-bold text-cyan-300">
                Step {currentStep.index}
              </span>
              <span className="font-semibold text-white">{currentStep.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isOutbound ? 'bg-cyan-500/20 text-cyan-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {isOutbound ? 'Outbound →' : '← Inbound'}
              </span>
            </div>

            {/* Path indicator */}
            <div className="flex items-center gap-1.5 font-mono text-slate-300">
              <span className="font-bold text-cyan-400">{fromNode?.label || currentStep.from}</span>
              <ArrowRight size={13} className="text-slate-500" />
              {currentStep.via.length > 0 && (
                <>
                  <span className="text-amber-400">
                    via {currentStep.via.map(v => orderedNodes.find(n => n.id === v)?.label || v).join(', ')}
                  </span>
                  <ArrowRight size={13} className="text-slate-500" />
                </>
              )}
              <span className="font-bold text-purple-400">{toNode?.label || currentStep.to}</span>
            </div>
          </div>

          <p className="mt-2 text-slate-300 leading-relaxed">{currentStep.explanation}</p>
        </div>
      )}
    </div>
  );
};
