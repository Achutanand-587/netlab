import { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { Activity, Boxes, Gauge, Pause, Play, Send, Zap } from 'lucide-react';
import { toast } from '../components/Toaster';
function Count({ to, dec = 0, suffix = '' }: { to: number; dec?: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => { const t = performance.now(); let id = 0; const f = (n: number) => { const k = Math.min(1, (n - t) / 1400); setV(to * (1 - (1 - k) ** 3)); if (k < 1) id = requestAnimationFrame(f); };
    id = requestAnimationFrame(f); return () => cancelAnimationFrame(id); }, [to]);
  return <>{v.toFixed(dec)}{suffix}</>;
}
const stats = [{ l: 'Packets processed', to: 1.24, dec: 2, s: 'M', i: Send }, { l: 'Virtual devices', to: 14, dec: 0, s: '', i: Boxes }, { l: 'Bandwidth', to: 86, dec: 0, s: ' Mbps', i: Gauge }, { l: 'Error rate', to: 0.8, dec: 1, s: '%', i: Activity }];
const proto = [{ n: 'TCP', v: 58 }, { n: 'UDP', v: 22 }, { n: 'ICMP', v: 8 }, { n: 'DNS', v: 12 }]; const col = ['#06b6d4', '#3b82f6', '#8b5cf6', '#14b8a6'];
const seed = () => Array.from({ length: 30 }, (_, i) => ({ t: i, down: 60 + Math.sin(i / 3) * 20 + Math.random() * 10, up: 25 + Math.cos(i / 4) * 8 + Math.random() * 6 }));
const links: [number, number, number, number][] = [[50, 100, 230, 50], [50, 100, 230, 150], [230, 50, 410, 100], [230, 150, 410, 100], [230, 50, 230, 150]];
const hub = [[50, 100, 'PC'], [230, 50, 'Router'], [230, 150, 'Switch'], [410, 100, 'Server']] as const;
export default function Dashboard() {
  const [data, setData] = useState(seed), [run, setRun] = useState(true), [show, setShow] = useState<'both' | 'down' | 'up'>('both');
  const spike = useRef(0);
  useEffect(() => { if (!run) return; const id = setInterval(() => setData(d => { const l = d[d.length - 1], b = spike.current; spike.current = 0;
    return [...d.slice(1), { t: l.t + 1, down: Math.max(10, l.down + (Math.random() - 0.5) * 14 + b), up: Math.max(5, l.up + (Math.random() - 0.5) * 6 + b / 3) }]; }), 1000); return () => clearInterval(id); }, [run]);
  const burst = () => { spike.current = 45; toast('Simulated packet burst injected'); };
  return (<div className="space-y-6">
    <section className="hero relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-navy-700 via-navy-800 to-navy-950 p-6 text-white md:p-8"><div className="radar" aria-hidden />
      <svg className="absolute right-0 top-0 hidden h-full w-[55%] opacity-90 md:block" viewBox="0 0 460 200" preserveAspectRatio="xMidYMid meet" aria-hidden>
        {links.map(([a, b, c, d], i) => <g key={i}><line x1={a} y1={b} x2={c} y2={d} stroke="#06b6d4" strokeOpacity=".35" /><line className="flow" x1={a} y1={b} x2={c} y2={d} stroke="#22d3ee" strokeWidth="1.5" />
          <circle r="3.5" fill="#67e8f9"><animateMotion dur={`${2 + i * 0.5}s`} repeatCount="indefinite" path={`M${a} ${b} L${c} ${d}`} /></circle></g>)}
        {hub.map(([x, y, n]) => <g key={n}><circle cx={x} cy={y} r="6" fill="#06b6d4" style={{ animation: 'ping2 2.4s infinite' }} /><circle cx={x} cy={y} r="9" fill="#0a1224" stroke="#22d3ee" strokeWidth="2" />
          <text x={x} y={y + 26} textAnchor="middle" fill="#94a3b8" fontSize="11">{n}</text></g>)}</svg>
      <div className="relative max-w-md"><h1 className="hero-title text-4xl font-bold leading-tight">Your virtual networking lab</h1><p className="mt-3 font-mono text-xs text-cyan-300">&gt; lab.status = READY<span className="caret" /></p>
        <p className="mt-2 text-sm text-slate-300">Calculate subnets, break CRC codes and watch simulated traffic move. Everything here runs in your browser.</p>
        <div className="mt-5 flex flex-wrap gap-2"><Link className="btn" to="/subnetting">Calculate a subnet</Link><Link className="btn-ghost !text-white" to="/errors">Try error detection</Link><Link className="btn-ghost !text-cyan-300 border border-cyan-500/30" to="/bandwidth">Bandwidth monitor</Link></div></div></section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ l, to, dec, s, i: I }) => <div key={l} className="card group flex items-center gap-4">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-500/15 text-cyan-500 transition group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-navy-950"><I size={20} /></span>
      <div><p className="text-sm text-slate-500">{l}</p><p className="stat-val text-2xl font-semibold"><Count to={to} dec={dec} suffix={s} /></p></div></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card lg:col-span-2"><div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="mr-auto font-medium">Live traffic <span className="text-xs font-normal text-amber-500">simulated, Mbps</span></h2>
        {(['both', 'down', 'up'] as const).map(k => <button key={k} onClick={() => setShow(k)} aria-pressed={show === k} className={`rounded-full px-3 py-1 text-xs transition ${show === k ? 'bg-cyan-500 text-navy-950' : 'bg-slate-200 dark:bg-white/10'}`}>{k === 'both' ? 'Both' : k === 'down' ? 'Download' : 'Upload'}</button>)}
        <button className="btn-ghost !px-2 !py-1" onClick={() => setRun(!run)} aria-label={run ? 'Pause' : 'Resume'}>{run ? <Pause size={14} /> : <Play size={14} />}</button>
        <button className="btn !px-2 !py-1" onClick={burst}><Zap size={14} />Burst</button></div>
        <div className="h-64"><ResponsiveContainer><AreaChart data={data}><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#06b6d4" stopOpacity=".5" /><stop offset="1" stopColor="#06b6d4" stopOpacity="0" /></linearGradient></defs>
          <CartesianGrid stroke="#94a3b822" /><XAxis dataKey="t" hide /><YAxis stroke="#94a3b8" fontSize={12} /><Tooltip formatter={(v: number) => v.toFixed(1)} labelFormatter={() => ''} />
          {show !== 'up' && <Area dataKey="down" stroke="#06b6d4" fill="url(#g1)" isAnimationActive={false} />}{show !== 'down' && <Area dataKey="up" stroke="#3b82f6" fill="#3b82f633" isAnimationActive={false} />}</AreaChart></ResponsiveContainer></div></div>
      <div className="card"><h2 className="mb-3 font-medium">Protocol distribution</h2><div className="h-64"><ResponsiveContainer><PieChart><Pie data={proto} dataKey="v" nameKey="n" innerRadius={50} outerRadius={85} paddingAngle={3}>
        {proto.map((_, i) => <Cell key={i} fill={col[i]} stroke="none" />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></div></div></div>);
}
