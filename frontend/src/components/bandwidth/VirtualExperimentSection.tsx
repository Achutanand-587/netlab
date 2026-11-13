import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  Gauge,
  HelpCircle,
  Layers,
  Network,
  Play,
  RotateCcw,
  Sliders,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  bandwidthService,
  VirtualExperimentParams,
  VirtualExperimentResult,
} from '../../services/bandwidthService';
import { toast } from '../Toaster';

export const VirtualExperimentSection: React.FC = () => {
  const [params, setParams] = useState<VirtualExperimentParams>({
    link_bandwidth_mbps: 100,
    latency_ms: 20,
    router_hops: 2,
    protocol: 'TCP',
    transfer_size_mb: 10,
    packet_loss_pct: 0.0,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<VirtualExperimentResult | null>(null);

  const bandwidthPresets = [1, 10, 100, 1000];
  const sizePresets = [5, 10, 25, 50, 100];

  const handleRunExperiment = async () => {
    setLoading(true);
    try {
      const res = await bandwidthService.runVirtualExperiment(params);
      setResult(res);
      toast(
        `Experiment complete: ${res.summary.achieved_avg_throughput_mbps} Mbps achieved (${res.summary.efficiency_pct}% efficiency)`
      );
    } catch (err) {
      toast(`Simulation failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Notice Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3.5 text-xs text-amber-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-amber-300 uppercase tracking-wide">
                VIRTUAL / SIMULATED BANDWIDTH LAB
              </span>
              <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                This module models mathematical network dynamics (TCP Slow-Start, Congestion Avoidance,
                BDP buffer constraints, RTT, and packet loss). It is strictly educational simulation and
                does NOT represent actual host network traffic.
              </p>
            </div>
          </div>
          <span className="rounded bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-mono text-[10px] text-amber-300 shrink-0 font-bold">
            SIMULATED
          </span>
        </div>
      </div>

      {/* Control Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Experiment Parameters Form */}
        <div className="lg:col-span-5 card p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sliders size={16} className="text-cyan-400" />
              Experiment Parameters
            </h3>
            <button
              onClick={() =>
                setParams({
                  link_bandwidth_mbps: 100,
                  latency_ms: 20,
                  router_hops: 2,
                  protocol: 'TCP',
                  transfer_size_mb: 10,
                  packet_loss_pct: 0.0,
                })
              }
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>

          {/* 1. Link Bandwidth Presets */}
          <div className="space-y-1.5 text-xs">
            <label className="block text-slate-400 font-medium">Theoretical Link Bandwidth</label>
            <div className="grid grid-cols-4 gap-2">
              {bandwidthPresets.map((bw) => (
                <button
                  key={bw}
                  onClick={() => setParams({ ...params, link_bandwidth_mbps: bw })}
                  className={`py-1.5 rounded-lg border font-mono text-xs font-semibold transition-all ${
                    params.link_bandwidth_mbps === bw
                      ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {bw >= 1000 ? `${bw / 1000} Gbps` : `${bw} Mbps`}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Protocol Selection */}
          <div className="space-y-1.5 text-xs">
            <label className="block text-slate-400 font-medium">Transport Protocol</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setParams({ ...params, protocol: 'TCP' })}
                className={`py-2 px-3 rounded-lg border text-left transition-all ${
                  params.protocol === 'TCP'
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold">TCP (Transmission Control)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Flow control, Slow-start, RTT-sensitive
                </div>
              </button>
              <button
                onClick={() => setParams({ ...params, protocol: 'UDP' })}
                className={`py-2 px-3 rounded-lg border text-left transition-all ${
                  params.protocol === 'UDP'
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold">UDP (User Datagram)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  No congestion control, line-rate blast
                </div>
              </button>
            </div>
          </div>

          {/* 3. Link Latency Slider */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <label className="text-slate-400 font-medium">One-Way Link Latency</label>
              <span className="font-mono text-cyan-400 font-bold">{params.latency_ms} ms</span>
            </div>
            <input
              type="range"
              min="1"
              max="200"
              step="1"
              value={params.latency_ms}
              onChange={(e) => setParams({ ...params, latency_ms: parseFloat(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1ms (Local LAN)</span>
              <span>50ms (National)</span>
              <span>200ms (Intercontinental)</span>
            </div>
          </div>

          {/* 4. Router Hops */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <label className="text-slate-400 font-medium">Intermediary Router Hops</label>
              <span className="font-mono text-cyan-400 font-bold">{params.router_hops} hops</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={params.router_hops}
              onChange={(e) => setParams({ ...params, router_hops: parseInt(e.target.value, 10) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1 hop (Direct)</span>
              <span>4 hops (Campus)</span>
              <span>8 hops (Internet Transit)</span>
            </div>
          </div>

          {/* 5. Transfer Size */}
          <div className="space-y-1.5 text-xs">
            <label className="block text-slate-400 font-medium">Transfer Payload Size</label>
            <div className="grid grid-cols-5 gap-1.5">
              {sizePresets.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setParams({ ...params, transfer_size_mb: sz })}
                  className={`py-1 rounded border font-mono text-[11px] font-semibold transition-all ${
                    params.transfer_size_mb === sz
                      ? 'bg-slate-700 text-cyan-400 border-cyan-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {sz} MB
                </button>
              ))}
            </div>
          </div>

          {/* 6. Packet Loss Slider */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <label className="text-slate-400 font-medium">Simulated Packet Loss</label>
              <span className="font-mono text-rose-400 font-bold">{params.packet_loss_pct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={params.packet_loss_pct}
              onChange={(e) =>
                setParams({ ...params, packet_loss_pct: parseFloat(e.target.value) })
              }
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Run Simulation Button */}
          <button
            onClick={handleRunExperiment}
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Play size={14} /> {loading ? 'Running Simulation...' : 'Simulate Transfer'}
          </button>
        </div>

        {/* Right: Simulation Results & Analytics */}
        <div className="lg:col-span-7 space-y-4">
          {/* Comparison KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-3 bg-slate-900/70 border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                Configured Link
              </span>
              <div className="mt-1 text-lg font-bold font-mono text-slate-200">
                {params.link_bandwidth_mbps} <span className="text-xs text-slate-500">Mbps</span>
              </div>
            </div>

            <div className="card p-3 bg-gradient-to-br from-emerald-950/30 to-slate-900 border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 uppercase font-mono">
                Achieved Throughput
              </span>
              <div className="mt-1 text-lg font-bold font-mono text-emerald-300">
                {result ? result.summary.achieved_avg_throughput_mbps : '—'}{' '}
                <span className="text-xs text-emerald-500">Mbps</span>
              </div>
            </div>

            <div className="card p-3 bg-slate-900/70 border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                Link Efficiency
              </span>
              <div className="mt-1 text-lg font-bold font-mono text-cyan-400">
                {result ? `${result.summary.efficiency_pct}%` : '—'}
              </div>
            </div>

            <div className="card p-3 bg-slate-900/70 border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                Transfer Duration
              </span>
              <div className="mt-1 text-lg font-bold font-mono text-slate-200">
                {result ? `${result.summary.duration_seconds}s` : '—'}
              </div>
            </div>
          </div>

          {/* Throughput Graph */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-cyan-400" />
                <h4 className="text-xs font-semibold text-slate-200">
                  Throughput Dynamics Over Time (Mbps)
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                RTT: ~{2 * params.latency_ms + params.router_hops * 1.5} ms
              </span>
            </div>

            <div className="h-64 w-full">
              {!result ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Activity size={32} className="mb-2 opacity-30 text-cyan-400" />
                  <p>Configure parameters on the left and click "Simulate Transfer"</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.points}>
                    <defs>
                      <linearGradient id="simThroughputGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="time_sec"
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(v) => `${v}s`}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      unit=" Mbps"
                      domain={[0, Math.max(params.link_bandwidth_mbps * 1.1, 10)]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                      formatter={(val: number) => [`${val.toFixed(2)} Mbps`, 'Throughput']}
                      labelFormatter={(lbl) => `Time: ${lbl}s`}
                    />
                    <Area
                      type="monotone"
                      dataKey="throughput_mbps"
                      name="Throughput"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#simThroughputGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Educational Explanation Box */}
          {result && (
            <div className="card p-3.5 bg-slate-900/80 border-slate-800 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-cyan-400">
                <HelpCircle size={14} /> Educational Analysis & Insight
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {result.summary.explanation}
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                <div>Total Packets: {result.summary.total_packets.toLocaleString()}</div>
                <div>
                  Retransmissions / Drops:{' '}
                  <span className={result.summary.retransmissions > 0 ? 'text-amber-400' : ''}>
                    {result.summary.retransmissions}
                  </span>
                </div>
                <div>Payload: {result.parameters.transfer_size_mb} MB</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
