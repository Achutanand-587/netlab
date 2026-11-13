import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, Award, BarChart3, BookOpen, Calculator, FileText, GitBranch, LayoutDashboard, Menu, Moon, Network, Search, Settings, ShieldCheck, Sun, Workflow } from 'lucide-react';
import Toaster from './Toaster';
const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard }, { to: '/subnetting', label: 'Subnetting', icon: Calculator },
  { to: '/packets', label: 'Packet analyzer', icon: Network }, { to: '/errors', label: 'Error detection', icon: ShieldCheck },
  { to: '/bandwidth', label: 'Bandwidth monitor', icon: Activity }, { to: '/protocols', label: 'Protocol visualizer', icon: Workflow },
  { to: '/topology', label: 'Topology simulator', icon: GitBranch }, { to: '/learn', label: 'Learning center', icon: BookOpen },
  { to: '/assessments', label: 'Assessments', icon: Award },
  { to: '/reports', label: 'Research and reports', icon: FileText }, { to: '/settings', label: 'Settings', icon: Settings }];
function Clock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return <span className="hidden font-mono text-xs text-cyan-400/80 sm:inline">{t.toISOString().slice(11, 19)} UTC</span>;
}
export default function Layout() {
  const loc = useLocation();
  const [dark, setDark] = useState(true), [open, setOpen] = useState(true), [q, setQ] = useState('');
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  const items = nav.filter(n => n.label.toLowerCase().includes(q.toLowerCase()));
  return (<div className="flex min-h-screen" onMouseMove={e => { const c = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
    if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`); } }}>
    <aside className={`${open ? 'w-60' : 'w-16'} shrink-0 border-r border-slate-200 bg-white p-3 transition-all dark:border-white/10 dark:bg-navy-950`}>
      <div className="mb-4 flex items-center gap-2 px-2 font-semibold text-cyan-500"><BarChart3 size={22} className="drop-shadow-[0_0_8px_#22d3ee]" />{open && <span className="logo">NETLAB</span>}</div>
      <nav className="space-y-1" aria-label="Main">{items.map(({ to, label, icon: I }) => (
        <NavLink key={to} to={to} end title={label} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'bg-cyan-500/15 text-cyan-500 shadow-[inset_3px_0_0_#06b6d4]' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
          <I size={18} className="shrink-0" />{open && label}</NavLink>))}
        {!items.length && open && <p className="px-3 text-xs text-slate-500">No module matches “{q}”.</p>}</nav></aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <button className="btn-ghost" onClick={() => setOpen(!open)} aria-label="Toggle sidebar"><Menu size={16} /></button>
        <div className="relative max-w-sm flex-1"><Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input className="input pl-8" placeholder="Find a module" value={q} onChange={e => setQ(e.target.value)} aria-label="Find a module" /></div>
        <span className="ml-auto" /><Clock /><span className="flex items-center gap-2 rounded-full border border-cyan-400/30 px-3 py-1 text-xs text-cyan-300"><i className="pulse-dot" />SYSTEM ONLINE · DEMO MODE</span>
        <button className="btn-ghost" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
      </header>
      <main className="flex-1 p-4 md:p-6"><div key={loc.pathname} className="page-enter"><Outlet /></div></main></div><Toaster /></div>);
}
