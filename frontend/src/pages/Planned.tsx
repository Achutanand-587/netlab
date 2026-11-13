import { Hammer } from 'lucide-react';
export default function Planned({ title, features }: { title: string; features: string }) {
  return (<div className="card mx-auto mt-10 max-w-lg text-center"><Hammer className="mx-auto text-cyan-500" /><h1 className="mt-3 text-xl font-semibold">{title}</h1>
    <p className="mt-2 text-sm text-slate-500">This module isn’t built yet. Planned: {features}</p></div>);
}
