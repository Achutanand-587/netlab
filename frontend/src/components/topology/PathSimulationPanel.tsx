import React from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Navigation,
  Percent,
  Play,
  Route,
  ShieldAlert,
} from 'lucide-react';
import { SimulationResult, TopologyNode } from '../../services/topologyService';

interface PathSimulationPanelProps {
  nodes: TopologyNode[];
  sourceId: string;
  targetId: string;
  protocol: string;
  loading: boolean;
  result: SimulationResult | null;
  onSelectSource: (id: string) => void;
  onSelectTarget: (id: string) => void;
  onSelectProtocol: (proto: string) => void;
  onRunSimulation: () => void;
}

export const PathSimulationPanel: React.FC<PathSimulationPanelProps> = ({
  nodes,
  sourceId,
  targetId,
  protocol,
  loading,
  result,
  onSelectSource,
  onSelectTarget,
  onSelectProtocol,
  onRunSimulation,
}) => {
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Route size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Connectivity & Path Routing Tester
          </h3>
        </div>
        <span className="font-mono text-[10px] text-slate-400">
          DIJKSTRA SHORTEST PATH
        </span>
      </div>

      {/* Source, Destination, and Protocol Selectors */}
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Source Device (Origin)
            </label>
            <select
              className="input !py-1 text-xs font-mono"
              value={sourceId}
              onChange={e => onSelectSource(e.target.value)}
              disabled={loading || nodes.length < 2}
            >
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.label} {n.ip ? `(${n.ip})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Destination Device (Target)
            </label>
            <select
              className="input !py-1 text-xs font-mono"
              value={targetId}
              onChange={e => onSelectTarget(e.target.value)}
              disabled={loading || nodes.length < 2}
            >
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.label} {n.ip ? `(${n.ip})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              Probe Protocol:
            </span>
            <select
              className="input !w-auto !py-1 text-xs font-mono"
              value={protocol}
              onChange={e => onSelectProtocol(e.target.value)}
            >
              <option value="ICMP">ICMP Echo (Ping)</option>
              <option value="TCP">TCP SYN Probe</option>
              <option value="UDP">UDP Datagram</option>
            </select>
          </div>

          <button
            className="btn flex items-center gap-1.5 !py-1.5 text-xs font-semibold"
            onClick={onRunSimulation}
            disabled={loading || nodes.length < 2 || sourceId === targetId}
          >
            <Play size={13} fill="currentColor" />
            <span>Send Packet / Ping</span>
          </button>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
          {/* Status banner */}
          <div
            className={`flex items-start gap-2.5 rounded-lg p-3 ${
              result.delivered
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
            }`}
          >
            {result.delivered ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />
            )}
            <div className="space-y-0.5">
              <span className="font-bold uppercase tracking-wider font-mono text-[11px]">
                {result.delivered ? 'REACHABLE · PATH ESTABLISHED' : 'UNREACHABLE · PACKET DROPPED'}
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed">{result.reason}</p>
            </div>
          </div>

          {/* Metrics summary */}
          {result.delivered && (
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="rounded-lg bg-slate-100 p-2 dark:bg-navy-900/60">
                <span className="text-[10px] text-slate-400">Total Latency</span>
                <p className="font-bold text-cyan-400">{result.total_latency_ms} ms</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-2 dark:bg-navy-900/60">
                <span className="text-[10px] text-slate-400">Hop Count</span>
                <p className="font-bold text-slate-200">{result.hops.length} hops</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-2 dark:bg-navy-900/60">
                <span className="text-[10px] text-slate-400">Delivery Prob</span>
                <p className="font-bold text-emerald-400">
                  {(result.delivery_probability * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Hop-by-Hop Breakdown */}
          {result.hops.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-400">Hop-by-Hop Route:</p>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white font-mono text-[11px] dark:divide-white/5 dark:border-white/5 dark:bg-navy-900/40">
                {result.hops.map(h => {
                  const fromNode = nodes.find(n => n.id === h.from);
                  const toNode = nodes.find(n => n.id === h.to);
                  return (
                    <div key={h.hop} className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-cyan-500/20 px-1.5 py-0.2 text-[10px] font-bold text-cyan-300">
                          Hop {h.hop}
                        </span>
                        <span className="text-slate-200">{fromNode?.label || h.from}</span>
                        <ArrowRight size={11} className="text-slate-500" />
                        <span className="text-slate-200">{toNode?.label || h.to}</span>
                      </div>
                      <span className="text-slate-400 font-medium">+{h.latency_ms} ms</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Network Graph Connectivity Info */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
            <span>Graph Components: {result.connectivity.component_count}</span>
            <span className={result.connectivity.connected ? 'text-emerald-400' : 'text-amber-400'}>
              {result.connectivity.connected ? 'Fully Connected Mesh' : 'Network Segmented / Disconnected'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
