import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, Database, Radio, RefreshCw, Server, WifiOff } from 'lucide-react';
import { api, backendConfigured, HealthResponse } from '../services/api';
import { toast } from '../components/Toaster';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    backendConfigured ? 'Not checked yet' : 'Not configured (Demo Mode)'
  );

  const check = async (silent = false) => {
    setLoading(true);
    setError(null);
    setStatusMessage('Checking…');
    try {
      const data = await api.health();
      setHealthData(data);
      setStatusMessage('Connected');
      if (!silent) toast('Backend connected successfully');
    } catch (e) {
      const msg = (e as Error).message || 'Unreachable';
      setError(msg);
      setHealthData(null);
      setStatusMessage(`Unreachable: ${msg}`);
      if (!silent) toast(`Connection failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (backendConfigured) {
      check(true);
    }
  }, []);

  const isConnected = healthData !== null && !error;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings & Diagnostics</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Verify backend connectivity, database status, and subsystem capabilities.
        </p>
      </div>

      {/* Main Connection Status Card */}
      <div className="card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span
              className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                isConnected
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : loading
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'bg-rose-500/15 text-rose-400'
              }`}
            >
              <Server size={20} />
            </span>
            <div>
              <h2 className="font-medium text-slate-900 dark:text-white">FastAPI Backend Status</h2>
              <p className="text-xs font-mono text-slate-500">{api.getBaseUrl()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                isConnected
                  ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                  : loading
                  ? 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30'
                  : 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30'
              }`}
            >
              {isConnected ? (
                <>
                  <CheckCircle2 size={13} /> {statusMessage}
                </>
              ) : (
                <>
                  <AlertCircle size={13} /> {statusMessage}
                </>
              )}
            </span>
            <button
              className="btn flex items-center gap-2 !py-1.5 text-xs"
              onClick={() => check(false)}
              disabled={loading}
              aria-label="Recheck connection"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Recheck
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <span className="font-semibold">Connection Error: </span>
            {error}. Ensure your backend is running (`uvicorn main:app --reload --port 8000`).
          </div>
        )}

        {/* Detailed Metrics Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-navy-900/40">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Activity size={13} /> API Health
            </span>
            <p className="mt-1 font-mono text-sm font-semibold capitalize text-slate-800 dark:text-slate-200">
              {healthData?.status || 'Unknown'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-navy-900/40">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Server size={13} /> Version
            </span>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
              v{healthData?.version || '—'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-navy-900/40">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Database size={13} /> SQLite Database
            </span>
            <p className="mt-1 font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
              {healthData?.database === 'ok' ? (
                <span className="text-emerald-400">Active (OK)</span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-navy-900/40">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={13} /> Server UTC
            </span>
            <p className="mt-1 truncate font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
              {healthData?.time ? healthData.time.slice(11, 19) + ' UTC' : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Subsystem Capabilities Card */}
      <div className="card space-y-4">
        <h2 className="font-medium">Subsystem Capabilities</h2>

        <div className="divide-y divide-slate-200 dark:divide-white/10">
          <div className="flex items-start justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                PCAP & Capture File Analysis
              </p>
              <p className="text-xs text-slate-500">
                Supports .pcap, .pcapng, and .cap format parsing, multi-layer dissection, filtering and CSV export.
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
              Operational
            </span>
          </div>

          <div className="flex items-start justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Live Interface Packet Capture
              </p>
              <p className="text-xs text-slate-500">
                Direct Wi-Fi / Ethernet packet sniffing using Npcap and Scapy async streams.
              </p>
            </div>
            {healthData?.live_capture_enabled ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
                <CheckCircle2 size={11} /> Operational
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30">
                <WifiOff size={11} /> Disabled
              </span>
            )}
          </div>

          <div className="flex items-start justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Real-Time WebSocket Streaming
              </p>
              <p className="text-xs text-slate-500">
                Low-latency live packet push to the frontend browser interface.
              </p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30">
              <CheckCircle2 size={11} /> Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
