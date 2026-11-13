import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Code2,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { get, del } from '../services/api';
import { toast } from '../components/Toaster';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Experiment {
  id: number;
  module: string;
  name: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  metrics: Record<string, number | string>;
  notes: string;
  created_at: string;
}

interface PagedResponse {
  items: Experiment[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

const MODULE_COLORS: Record<string, string> = {
  subnetting: '#06b6d4',
  packets: '#3b82f6',
  error_detection: '#f43f5e',
  bandwidth: '#10b981',
  protocols: '#8b5cf6',
  topology: '#f59e0b',
  assessments: '#eab308',
  other: '#94a3b8',
};

const MODULE_LABELS: Record<string, string> = {
  subnetting: 'Subnetting',
  packets: 'Packet Analysis',
  error_detection: 'Error Detection',
  bandwidth: 'Bandwidth',
  protocols: 'Protocol Lab',
  topology: 'Topology',
  assessments: 'Assessments',
  other: 'Other',
};

const BASE = '/api/v1';

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function Badge({ module }: { module: string }) {
  const color = MODULE_COLORS[module] ?? '#94a3b8';
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ color, backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
    >
      {MODULE_LABELS[module] ?? module}
    </span>
  );
}

// ── Experiment Row ────────────────────────────────────────────────────────────

function ExperimentRow({
  exp,
  selected,
  onToggle,
  onDelete,
}: {
  exp: Experiment;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={`border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer transition-colors ${selected ? 'bg-cyan-500/5' : ''}`}
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-3 py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            onClick={e => e.stopPropagation()}
            className="rounded border-slate-600 bg-slate-800 accent-cyan-500"
          />
        </td>
        <td className="px-3 py-3 font-mono text-xs text-slate-500">#{exp.id}</td>
        <td className="px-3 py-3">
          <Badge module={exp.module} />
        </td>
        <td className="px-3 py-3 text-sm text-slate-200 max-w-[200px] truncate">{exp.name}</td>
        <td className="px-3 py-3">
          {Object.entries(exp.metrics).slice(0, 3).map(([k, v]) => (
            <span key={k} className="mr-2 text-xs text-slate-400">
              <span className="text-slate-500">{k.replace(/_/g, ' ')}:</span>{' '}
              <span className="font-mono text-slate-300">{typeof v === 'number' ? v.toFixed(typeof v === 'number' && v < 10 ? 2 : 0) : String(v)}</span>
            </span>
          ))}
          {Object.keys(exp.metrics).length === 0 && <span className="text-xs text-slate-600">—</span>}
        </td>
        <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(exp.created_at)}</td>
        <td className="px-3 py-3">
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            title="Delete experiment"
          >
            <Trash2 size={13} />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-slate-800 bg-slate-900/60">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Inputs</p>
                <pre className="rounded-lg bg-slate-950 p-3 text-[10px] text-slate-300 overflow-auto max-h-40">{JSON.stringify(exp.inputs, null, 2)}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Results</p>
                <pre className="rounded-lg bg-slate-950 p-3 text-[10px] text-slate-300 overflow-auto max-h-40">{JSON.stringify(exp.results, null, 2)}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Metrics</p>
                <div className="space-y-1">
                  {Object.entries(exp.metrics).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-slate-400">{k.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-slate-200">{String(v)}</span>
                    </div>
                  ))}
                  {Object.keys(exp.metrics).length === 0 && <span className="text-xs text-slate-600">No metrics recorded.</span>}
                </div>
                {exp.notes && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Notes</p>
                    <p className="text-xs text-slate-400">{exp.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Compare View ──────────────────────────────────────────────────────────────

function ComparePanel({ ids, onClose }: { ids: number[]; onClose: () => void }) {
  const [result, setResult] = useState<{ experiments: { id: number; name: string; module: string }[]; metrics: { name: string; values: (number | string | null)[]; delta_vs_first: (number | null)[] }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${window.location.origin}${BASE}/experiments/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then(r => r.json())
      .then(d => { setResult(d); setLoading(false); })
      .catch(e => { setErr(String(e)); setLoading(false); });
  }, [ids]);

  if (loading) return <div className="card text-center py-8 text-slate-400"><RefreshCw size={18} className="mx-auto animate-spin" /></div>;
  if (err || !result) return <div className="card text-center py-8 text-red-400"><AlertCircle size={18} className="mx-auto mb-2" />{err ?? 'Compare failed'}</div>;

  const chartData = result.metrics
    .filter(m => result.experiments.every((_, i) => typeof m.values[i] === 'number'))
    .slice(0, 6)
    .map(m => {
      const row: Record<string, unknown> = { name: m.name.replace(/_/g, ' ') };
      result.experiments.forEach((e, i) => { row[`#${e.id}`] = m.values[i]; });
      return row;
    });

  const expKeys = result.experiments.map(e => `#${e.id}`);
  const barColors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e'];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2"><BarChart3 size={16} /> Comparison</h3>
        <button onClick={onClose} className="btn-ghost p-1"><X size={14} /></button>
      </div>

      {/* Experiment labels */}
      <div className="flex flex-wrap gap-2 mb-4">
        {result.experiments.map((e, i) => (
          <div key={e.id} className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: barColors[i % barColors.length] }} />
            <span className="font-mono text-slate-400">#{e.id}</span>
            <span className="text-slate-300">{e.name}</span>
            <Badge module={e.module} />
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="h-64 mb-4">
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid stroke="#94a3b822" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
              <Legend />
              {expKeys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={barColors[i % barColors.length]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="pb-2 text-left font-medium">Metric</th>
              {result.experiments.map(e => (
                <th key={e.id} className="pb-2 text-right font-medium">#{e.id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.metrics.map(m => (
              <tr key={m.name} className="border-b border-slate-800/50">
                <td className="py-1.5 text-slate-400">{m.name.replace(/_/g, ' ')}</td>
                {m.values.map((v, i) => (
                  <td key={i} className="py-1.5 text-right font-mono text-slate-200">
                    {v !== null ? String(typeof v === 'number' ? v.toFixed(2) : v) : '—'}
                    {i > 0 && m.delta_vs_first[i] !== null && (
                      <span className={`ml-1 text-[9px] ${(m.delta_vs_first[i] ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(m.delta_vs_first[i] ?? 0) >= 0 ? '+' : ''}{m.delta_vs_first[i]?.toFixed(2)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  const fetchExperiments = useCallback(async (pg = 1, mod?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({ page: String(pg), page_size: String(PAGE_SIZE) });
      if (mod && mod !== 'all') params.set('module', mod);
      const data = await get<PagedResponse>(`/experiments?${params}`);
      setExperiments(data.items ?? []);
      setTotal(data.total ?? 0);
      setPage(pg);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExperiments(1, moduleFilter); }, [fetchExperiments, moduleFilter]);

  const handleDelete = async (id: number) => {
    try {
      await del(`/experiments/${id}`);
      toast(`Experiment #${id} deleted`);
      setSelected(s => { const n = new Set(s); n.delete(id); return n; });
      fetchExperiments(page, moduleFilter);
    } catch (e) { toast(`Delete failed: ${e}`); }
  };

  const handleDeleteSelected = async () => {
    for (const id of selected) await handleDelete(id);
    setSelected(new Set());
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (moduleFilter !== 'all') params.set('module', moduleFilter);
    const url = `${window.location.origin}${BASE}/experiments/export.csv?${params}`;
    const a = document.createElement('a');
    a.href = url; a.download = 'experiments.csv'; a.click();
  };

  const toggleSelect = (id: number) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selected.size === experiments.length) setSelected(new Set());
    else setSelected(new Set(experiments.map(e => e.id)));
  };

  const filtered = useMemo(() =>
    experiments.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase())),
    [experiments, search]
  );

  // Module distribution for chart
  const moduleDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    experiments.forEach(e => { counts[e.module] = (counts[e.module] ?? 0) + 1; });
    return Object.entries(counts).map(([mod, count]) => ({ name: MODULE_LABELS[mod] ?? mod, value: count, color: MODULE_COLORS[mod] ?? '#94a3b8' }));
  }, [experiments]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="text-cyan-400" size={24} />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Research & Reports</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Experiment history from all labs — compare results, export data, and track your progress.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={handleExportCSV} className="btn-ghost flex items-center gap-1.5 text-sm">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => fetchExperiments(page, moduleFilter)} className="btn-ghost flex items-center gap-1.5 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-500/15 text-cyan-500"><FileText size={20} /></span>
          <div>
            <p className="text-sm text-slate-500">Total Experiments</p>
            <p className="text-2xl font-semibold stat-val">{total}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/15 text-blue-500"><BarChart3 size={20} /></span>
          <div>
            <p className="text-sm text-slate-500">Modules Used</p>
            <p className="text-2xl font-semibold stat-val">{moduleDistribution.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-green-500/15 text-green-500"><CheckCircle2 size={20} /></span>
          <div>
            <p className="text-sm text-slate-500">Most Active</p>
            <p className="text-lg font-semibold stat-val truncate">
              {moduleDistribution.sort((a, b) => b.value - a.value)[0]?.name ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Distribution chart */}
      {moduleDistribution.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2"><BarChart3 size={16} /> Experiment Distribution by Module</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={moduleDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {moduleDistribution.map((m, i) => <Cell key={i} fill={m.color} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center space-y-2">
              {moduleDistribution.map(m => (
                <div key={m.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: m.color }} />
                  <span className="flex-1 text-slate-300">{m.name}</span>
                  <span className="font-mono text-slate-400">{m.value} exp.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compare panel */}
      {showCompare && selected.size >= 2 && (
        <ComparePanel ids={[...selected]} onClose={() => setShowCompare(false)} />
      )}

      {/* Table toolbar */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input className="input pl-8" placeholder="Search experiment names..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"><X size={14} /></button>}
          </div>

          {/* Module filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={moduleFilter}
              onChange={e => { setModuleFilter(e.target.value); setPage(1); }}
              className="input text-sm"
            >
              <option value="all">All modules</option>
              {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Actions for selected */}
          {selected.size > 0 && (
            <div className="flex gap-2">
              {selected.size >= 2 && (
                <button
                  onClick={() => setShowCompare(true)}
                  className="btn flex items-center gap-1.5 text-sm"
                >
                  <BarChart3 size={13} /> Compare ({selected.size})
                </button>
              )}
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={13} /> Delete ({selected.size})
              </button>
            </div>
          )}
        </div>

        {/* Error state */}
        {err && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle size={16} /> {err}
            <button onClick={() => fetchExperiments(page, moduleFilter)} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-10 text-slate-400"><RefreshCw size={20} className="mx-auto animate-spin mb-2" />Loading experiments…</div>
        )}

        {/* Empty state */}
        {!loading && !err && filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            <Code2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium mb-1">No experiments yet</p>
            <p className="text-xs">Run experiments in the Subnetting Lab, Protocol Lab, Error Detection Lab, or Bandwidth Monitor to see results here.</p>
          </div>
        )}

        {/* Table */}
        {!loading && !err && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
                  <th className="pb-2 px-3">
                    <input type="checkbox" checked={selected.size === experiments.length && experiments.length > 0} onChange={toggleAll} className="rounded border-slate-600 bg-slate-800 accent-cyan-500" />
                  </th>
                  <th className="pb-2 px-3">#</th>
                  <th className="pb-2 px-3">Module</th>
                  <th className="pb-2 px-3">Name</th>
                  <th className="pb-2 px-3">Metrics</th>
                  <th className="pb-2 px-3 whitespace-nowrap"><Clock size={11} className="inline mr-1" />Created</th>
                  <th className="pb-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(exp => (
                  <ExperimentRow
                    key={exp.id}
                    exp={exp}
                    selected={selected.has(exp.id)}
                    onToggle={() => toggleSelect(exp.id)}
                    onDelete={() => handleDelete(exp.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Showing page {page} of {totalPages} ({total} total)</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => fetchExperiments(page - 1, moduleFilter)} className="btn-ghost px-2 py-1 disabled:opacity-30 text-xs">← Prev</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button key={p} onClick={() => fetchExperiments(p, moduleFilter)} className={`px-2 py-1 rounded text-xs transition-colors ${p === page ? 'bg-cyan-600 text-white' : 'hover:bg-slate-700'}`}>{p}</button>
                );
              })}
              <button disabled={page >= totalPages} onClick={() => fetchExperiments(page + 1, moduleFilter)} className="btn-ghost px-2 py-1 disabled:opacity-30 text-xs">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
