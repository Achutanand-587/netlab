import { useEffect, useState } from 'react';
export const toast = (m: string) => window.dispatchEvent(new CustomEvent('toast', { detail: m }));
export default function Toaster() {
  const [m, setM] = useState('');
  useEffect(() => { let t: number; const h = (e: Event) => { setM((e as CustomEvent<string>).detail); clearTimeout(t); t = window.setTimeout(() => setM(''), 2200); };
    window.addEventListener('toast', h); return () => window.removeEventListener('toast', h); }, []);
  return m ? <div role="status" className="fixed bottom-4 right-4 z-50 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-navy-950 shadow-lg">{m}</div> : null;
}
