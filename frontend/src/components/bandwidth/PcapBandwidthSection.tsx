import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Clock,
  Database,
  FileText,
  HardDrive,
  Layers,
  PieChart as PieIcon,
  RefreshCw,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  bandwidthService,
  CaptureSummaryItem,
  PcapAnalysisResult,
} from '../../services/bandwidthService';
import { toast } from '../Toaster';

const PROTO_COLORS = [
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#64748b', // Slate
];

export const PcapBandwidthSection: React.FC = () => {
  const [captures, setCaptures] = useState<CaptureSummaryItem[]>([]);
  const [selectedCaptureId, setSelectedCaptureId] = useState<number | null>(null);
  const [intervalSec, setIntervalSec] = useState<number>(1.0);
  const [analysis, setAnalysis] = useState<PcapAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadCaptures();
  }, []);

  const loadCaptures = async () => {
    try {
      const list = await bandwidthService.listCaptures();
      setCaptures(list);
      if (list.length > 0 && selectedCaptureId === null) {
        setSelectedCaptureId(list[0].id);
        fetchAnalysis(list[0].id, intervalSec);
      }
    } catch (err) {
      console.warn('Failed to load captures for bandwidth analysis:', err);
    }
  };

  const fetchAnalysis = async (capId: number, interval: number) => {
    setLoading(true);
    try {
      const res = await bandwidthService.analyzePcap(capId, interval);
      setAnalysis(res);
    } catch (err) {
      toast(`Analysis error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCapture = (id: number) => {
    setSelectedCaptureId(id);
    fetchAnalysis(id, intervalSec);
  };

  const handleIntervalChange = (val: number) => {
    setIntervalSec(val);
    if (selectedCaptureId !== null) {
      fetchAnalysis(selectedCaptureId, val);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-4">
      {/* Notice Banner */}
      <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-3.5 text-xs text-sky-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Database size={16} className="text-sky-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-sky-300 uppercase tracking-wide">
                IMPORTED PCAP BANDWIDTH RECONSTRUCTION
              </span>
              <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                Computes actual throughput and bandwidth consumption from packet timestamps and frame lengths
                recorded inside an imported capture file.
              </p>
            </div>
          </div>
          <span className="rounded bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 font-mono text-[10px] text-sky-300 shrink-0 font-bold">
            IMPORTED PCAP
          </span>
        </div>
      </div>

      {/* Toolbar: Capture Selection & Resolution Interval */}
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-cyan-400" />
            <span className="text-xs font-semibold text-slate-300">Selected Capture:</span>
          </div>

          <select
            value={selectedCaptureId || ''}
            onChange={(e) => handleSelectCapture(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-cyan-500 font-medium"
          >
            {captures.length === 0 ? (
              <option value="">No captures available in database</option>
            ) : (
              captures.map((c) => (
                <option key={c.id} value={c.id}>
                  📄 {c.filename} ({c.packet_count} packets · {formatBytes(c.total_bytes)})
                </option>
              ))
            )}
          </select>

          <button
            onClick={loadCaptures}
            className="btn-ghost !p-1.5 text-slate-400 hover:text-slate-200"
            title="Refresh Capture List"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Time Bins Interval Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Bin Window:</span>
          {[0.5, 1.0, 5.0].map((step) => (
            <button
              key={step}
              onClick={() => handleIntervalChange(step)}
              className={`px-2.5 py-1 rounded font-mono text-xs transition-colors ${
                intervalSec === step
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {step}s
            </button>
          ))}
        </div>
      </div>

      {/* Empty State when no captures */}
      {captures.length === 0 && (
        <div className="card p-8 text-center text-slate-500 text-xs space-y-2">
          <AlertCircle size={28} className="mx-auto text-slate-400 opacity-60" />
          <p className="font-semibold text-slate-300">No PCAP files imported yet</p>
          <p>
            Go to the <strong>Packet Analyzer</strong> tab to upload a <code className="text-cyan-400 font-mono">.pcap</code> file or load the built-in sample.
          </p>
        </div>
      )}

      {/* Analysis Metrics */}
      {analysis && (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="card p-3 bg-slate-900/60 border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total Bytes</span>
              <div className="mt-1.5 text-lg font-bold font-mono text-slate-200">
                {formatBytes(analysis.summary.total_bytes)}
              </div>
            </div>

            <div className="card p-3 bg-slate-900/60 border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total Packets</span>
              <div className="mt-1.5 text-lg font-bold font-mono text-slate-200">
                {analysis.summary.total_packets.toLocaleString()}
              </div>
            </div>

            <div className="card p-3 bg-slate-900/60 border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Duration</span>
              <div className="mt-1.5 text-lg font-bold font-mono text-slate-200">
                {analysis.summary.duration_seconds.toFixed(2)}s
              </div>
            </div>

            <div className="card p-3 bg-gradient-to-br from-cyan-950/30 to-slate-900 border-cyan-500/20">
              <span className="text-[10px] text-cyan-400 uppercase font-mono">Average Throughput</span>
              <div className="mt-1.5 text-lg font-bold font-mono text-cyan-300">
                {analysis.summary.avg_throughput_mbps.toFixed(3)}{' '}
                <span className="text-xs text-cyan-500">Mbps</span>
              </div>
            </div>

            <div className="card p-3 bg-gradient-to-br from-amber-950/30 to-slate-900 border-amber-500/20">
              <span className="text-[10px] text-amber-400 uppercase font-mono">Peak Throughput</span>
              <div className="mt-1.5 text-lg font-bold font-mono text-amber-300">
                {analysis.summary.peak_throughput_mbps.toFixed(3)}{' '}
                <span className="text-xs text-amber-500">Mbps</span>
              </div>
            </div>

            <div className="card p-3 bg-slate-900/60 border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Avg Packet Size</span>
              <div className="mt-1.5 text-lg font-bold font-mono text-slate-200">
                {analysis.summary.avg_packet_size.toFixed(0)}{' '}
                <span className="text-xs text-slate-500">Bytes</span>
              </div>
            </div>
          </div>

          {/* Throughput Over Time Chart */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-cyan-400" />
                <h4 className="text-xs font-semibold text-slate-200">
                  Throughput Over Time (Mbps, {intervalSec}s bins)
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {analysis.points.length} sample bins
              </span>
            </div>

            <div className="h-64 w-full">
              {analysis.points.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No timestamp samples found in this capture.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analysis.points}>
                    <defs>
                      <linearGradient id="pcapThroughputGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(val, i) => `${(i * intervalSec).toFixed(1)}s`}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      unit=" Mbps"
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                      }}
                      formatter={(val: number) => [`${val.toFixed(4)} Mbps`, 'Throughput']}
                      labelFormatter={(lbl, arr) => {
                        const pt = arr?.[0]?.payload;
                        return pt ? `Packets: ${pt.packets} · Bytes: ${formatBytes(pt.bytes)}` : '';
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="throughput_mbps"
                      name="Throughput"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fill="url(#pcapThroughputGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bottom Grid: Protocol Distribution & Top Talkers */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Protocol Distribution Donut & Table */}
            <div className="lg:col-span-6 card p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <PieIcon size={16} className="text-cyan-400" />
                <h4 className="text-xs font-semibold text-slate-200">
                  Protocol Bandwidth Distribution
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analysis.protocols}
                        dataKey="bytes"
                        nameKey="protocol"
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={64}
                        paddingAngle={3}
                      >
                        {analysis.protocols.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={PROTO_COLORS[idx % PROTO_COLORS.length]}
                            stroke="#0f172a"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                        formatter={(val: number) => [formatBytes(val), 'Volume']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Protocol breakdown table */}
                <div className="overflow-y-auto max-h-44 text-[11px] space-y-1.5 pr-1">
                  {analysis.protocols.map((pr, idx) => (
                    <div
                      key={pr.protocol}
                      className="flex items-center justify-between p-1.5 rounded bg-slate-800/40 border border-slate-800/60"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: PROTO_COLORS[idx % PROTO_COLORS.length] }}
                        />
                        <span className="font-semibold text-slate-200">{pr.protocol}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-cyan-400">{formatBytes(pr.bytes)}</span>{' '}
                        <span className="text-slate-500">({pr.byte_pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Network Talkers (Sources & Destinations) */}
            <div className="lg:col-span-6 card p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <Users size={16} className="text-cyan-400" />
                <h4 className="text-xs font-semibold text-slate-200">
                  Top Network Talkers (By Transferred Bytes)
                </h4>
              </div>

              <div className="space-y-3 text-xs">
                {/* Top Sources */}
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Top Source IPs</span>
                  <div className="mt-1 space-y-1">
                    {analysis.top_sources.slice(0, 3).map((s) => (
                      <div
                        key={s.ip}
                        className="flex items-center justify-between p-1.5 rounded bg-slate-800/40 font-mono text-[11px]"
                      >
                        <span className="text-slate-200">{s.ip}</span>
                        <span className="text-cyan-400">
                          {formatBytes(s.bytes)}{' '}
                          <span className="text-slate-500">({s.packets} pkts)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Destinations */}
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Top Destination IPs</span>
                  <div className="mt-1 space-y-1">
                    {analysis.top_destinations.slice(0, 3).map((d) => (
                      <div
                        key={d.ip}
                        className="flex items-center justify-between p-1.5 rounded bg-slate-800/40 font-mono text-[11px]"
                      >
                        <span className="text-slate-200">{d.ip}</span>
                        <span className="text-blue-400">
                          {formatBytes(d.bytes)}{' '}
                          <span className="text-slate-500">({d.packets} pkts)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
