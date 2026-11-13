import React, { useEffect, useState, useRef } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  HardDrive,
  Info,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Wifi,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  bandwidthService,
  LiveInterface,
  LiveMetricPoint,
  LiveStatusResponse,
} from '../../services/bandwidthService';
import { toast } from '../Toaster';

export const LiveMonitorSection: React.FC = () => {
  const [interfaces, setInterfaces] = useState<LiveInterface[]>([]);
  const [selectedIface, setSelectedIface] = useState<string>('');
  const [active, setActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusData, setStatusData] = useState<LiveStatusResponse | null>(null);
  const [history, setHistory] = useState<LiveMetricPoint[]>([]);
  const [chartView, setChartView] = useState<'both' | 'down' | 'up'>('both');

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch available host interfaces on mount
  useEffect(() => {
    loadInterfaces();
    checkCurrentStatus();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const loadInterfaces = async () => {
    try {
      const list = await bandwidthService.getLiveInterfaces();
      setInterfaces(list);
      if (list.length > 0 && !selectedIface) {
        // Default to first UP interface or first in list
        const activeOne = list.find((i) => i.is_up) || list[0];
        setSelectedIface(activeOne.name);
      }
    } catch (err) {
      console.warn('Could not list network interfaces:', err);
    }
  };

  const checkCurrentStatus = async () => {
    try {
      const st = await bandwidthService.getLiveStatus();
      if (st.active) {
        setActive(true);
        setStatusData(st);
        if (st.interface) setSelectedIface(st.interface);
        if (st.points) setHistory(st.points);
        connectWebSocket();
      }
    } catch {
      // Ignored if server is starting
    }
  };

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      const ws = bandwidthService.connectLiveWebSocket({
        onMetric: (metric) => {
          setStatusData(metric);
          if (metric.point) {
            setHistory((prev) => {
              const updated = [...prev, metric.point!];
              return updated.length > 60 ? updated.slice(updated.length - 60) : updated;
            });
          }
        },
        onStatus: (st) => {
          if (st.status === 'stopped') {
            setActive(false);
          }
        },
        onError: () => {
          // Socket error
        },
      });
      wsRef.current = ws;
    } catch (e) {
      console.error('WebSocket connection failed:', e);
    }
  };

  const handleStart = async () => {
    if (!selectedIface) {
      toast('Please select a network interface first');
      return;
    }
    setLoading(true);
    try {
      const res = await bandwidthService.startLiveMonitoring(selectedIface);
      setActive(true);
      setStatusData(res);
      setHistory(res.points || []);
      connectWebSocket();
      toast(`Live monitoring started on ${selectedIface}`);
    } catch (err) {
      toast(`Failed to start: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const res = await bandwidthService.stopLiveMonitoring();
      setActive(false);
      setStatusData(res);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      toast('Live monitoring stopped');
    } catch (err) {
      toast(`Failed to stop: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const selectedIfaceObj = interfaces.find((i) => i.name === selectedIface);

  return (
    <div className="space-y-4">
      {/* Disclaimer / Clarification Banner */}
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3.5 text-xs text-cyan-200">
        <div className="flex items-start gap-2.5">
          <Info size={16} className="text-cyan-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <span className="font-semibold text-cyan-300">
              HOST NETWORK-INTERFACE STATISTICS (REAL TELEMETRY)
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Metrics are polled directly from your operating system's network adapter counters
              (via <span className="font-mono text-cyan-400">psutil.net_io_counters</span>). Throughput
              is computed as <span className="font-mono text-cyan-400">(Δbytes × 8) / Δtime</span>. This
              measures total aggregate interface traffic, not individual application processes.
            </p>
          </div>
        </div>
      </div>

      {/* Interface Selection & Controls Toolbar */}
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio size={16} className={active ? 'text-emerald-400 animate-pulse' : 'text-slate-400'} />
            <span className="text-xs font-semibold text-slate-300">Network Interface:</span>
          </div>
          <select
            value={selectedIface}
            onChange={(e) => setSelectedIface(e.target.value)}
            disabled={active}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-cyan-500 disabled:opacity-60 font-medium"
          >
            {interfaces.map((i) => (
              <option key={i.name} value={i.name}>
                {i.is_wireless ? '📶 ' : '🔌 '} {i.name} {i.is_up ? '· (UP)' : '· (DOWN)'}{' '}
                {i.ip ? `[${i.ip}]` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={loadInterfaces}
            disabled={active}
            className="btn-ghost !p-1.5 text-slate-400 hover:text-slate-200"
            title="Refresh Interfaces"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Start / Stop Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                active ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
              }`}
            />
            <span className="font-mono text-slate-300">
              {active ? 'MONITORING ACTIVE' : 'IDLE'}
            </span>
          </div>

          {!active ? (
            <button
              onClick={handleStart}
              disabled={loading || !selectedIface}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <Play size={14} /> Start Monitoring
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors"
            >
              <Pause size={14} /> Stop Monitoring
            </button>
          )}
        </div>
      </div>

      {/* Selected Interface Metadata Card */}
      {selectedIfaceObj && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="card p-3 bg-slate-900/60 border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-mono">Status & Type</span>
            <div className="mt-1 flex items-center gap-2 font-semibold text-slate-200">
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedIfaceObj.is_up ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
              {selectedIfaceObj.is_up ? 'Connected (UP)' : 'Disconnected (DOWN)'}
              <span className="text-slate-500 text-[11px]">
                ({selectedIfaceObj.is_wireless ? 'Wireless' : 'Wired'})
              </span>
            </div>
          </div>

          <div className="card p-3 bg-slate-900/60 border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-mono">Assigned IP</span>
            <div className="mt-1 font-mono font-semibold text-cyan-400">
              {selectedIfaceObj.ip || 'No IPv4 Assigned'}
            </div>
          </div>

          <div className="card p-3 bg-slate-900/60 border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-mono">Adapter Link Speed</span>
            <div className="mt-1 font-semibold text-slate-200">
              {selectedIfaceObj.speed_mbps > 0
                ? `${selectedIfaceObj.speed_mbps} Mbps`
                : 'Auto-negotiated'}
            </div>
          </div>

          <div className="card p-3 bg-slate-900/60 border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-mono">MTU (Max Frame)</span>
            <div className="mt-1 font-mono font-semibold text-slate-200">
              {selectedIfaceObj.mtu} bytes
            </div>
          </div>
        </div>
      )}

      {/* Real-time KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Current Download */}
        <div className="card p-3 bg-gradient-to-br from-cyan-950/30 to-slate-900 border-cyan-500/20">
          <div className="flex items-center justify-between text-cyan-400">
            <span className="text-[10px] font-mono uppercase">Current Download</span>
            <ArrowDownCircle size={14} />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-cyan-300">
            {statusData ? statusData.download_mbps.toFixed(2) : '0.00'}{' '}
            <span className="text-xs font-normal text-cyan-500">Mbps</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            {statusData ? (statusData.download_mbps / 8).toFixed(2) : '0.00'} MB/s
          </div>
        </div>

        {/* Current Upload */}
        <div className="card p-3 bg-gradient-to-br from-blue-950/30 to-slate-900 border-blue-500/20">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-[10px] font-mono uppercase">Current Upload</span>
            <ArrowUpCircle size={14} />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-blue-300">
            {statusData ? statusData.upload_mbps.toFixed(2) : '0.00'}{' '}
            <span className="text-xs font-normal text-blue-500">Mbps</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            {statusData ? (statusData.upload_mbps / 8).toFixed(2) : '0.00'} MB/s
          </div>
        </div>

        {/* Total Data Transferred */}
        <div className="card p-3 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase">Session Data</span>
            <HardDrive size={14} />
          </div>
          <div className="mt-2 text-base font-bold font-mono text-slate-200">
            {statusData
              ? formatBytes(statusData.total_recv_bytes + statusData.total_sent_bytes)
              : '0 B'}
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            ↓ {statusData ? formatBytes(statusData.total_recv_bytes) : '0 B'} · ↑{' '}
            {statusData ? formatBytes(statusData.total_sent_bytes) : '0 B'}
          </div>
        </div>

        {/* Average Download & Upload */}
        <div className="card p-3 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase">Average Speeds</span>
            <Activity size={14} />
          </div>
          <div className="mt-2 text-xs font-mono text-cyan-300 font-semibold">
            ↓ {statusData ? statusData.avg_download_mbps.toFixed(2) : '0.00'} Mbps
          </div>
          <div className="mt-1 text-xs font-mono text-blue-300 font-semibold">
            ↑ {statusData ? statusData.avg_upload_mbps.toFixed(2) : '0.00'} Mbps
          </div>
        </div>

        {/* Peak Download & Upload */}
        <div className="card p-3 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase">Peak Speeds</span>
            <Zap size={14} className="text-amber-400" />
          </div>
          <div className="mt-2 text-xs font-mono text-cyan-300 font-semibold">
            ↓ {statusData ? statusData.peak_download_mbps.toFixed(2) : '0.00'} Mbps
          </div>
          <div className="mt-1 text-xs font-mono text-blue-300 font-semibold">
            ↑ {statusData ? statusData.peak_upload_mbps.toFixed(2) : '0.00'} Mbps
          </div>
        </div>

        {/* Session Duration */}
        <div className="card p-3 bg-slate-900/60 border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono uppercase">Duration</span>
            <Clock size={14} />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-slate-200">
            {statusData ? `${statusData.duration_seconds.toFixed(0)}s` : '0s'}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">1-second sample rate</div>
        </div>
      </div>

      {/* Real-time Throughput Graph */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Real-Time Interface Throughput (Mbps)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {(['both', 'down', 'up'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setChartView(view)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  chartView === view
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {view === 'both' ? 'Both' : view === 'down' ? 'Download' : 'Upload'}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
              <Activity size={32} className="mb-2 opacity-30 text-cyan-400" />
              <p>No live data received yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Select an interface above and click "Start Monitoring" to observe live throughput.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="liveDownGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="liveUpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `${val}s`}
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
                  formatter={(val: number) => [`${val.toFixed(2)} Mbps`]}
                  labelFormatter={(lbl) => `Time: ${lbl}s`}
                />
                {(chartView === 'both' || chartView === 'down') && (
                  <Area
                    type="monotone"
                    dataKey="download_mbps"
                    name="Download"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#liveDownGrad)"
                    isAnimationActive={false}
                  />
                )}
                {(chartView === 'both' || chartView === 'up') && (
                  <Area
                    type="monotone"
                    dataKey="upload_mbps"
                    name="Upload"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#liveUpGrad)"
                    isAnimationActive={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
