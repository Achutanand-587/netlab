import { useEffect, useState } from 'react';
const nodes = [[40, 90], [110, 30], [110, 150], [190, 90]];
export default function Splash() {
  const [out, setOut] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOut(true), 1500); return () => clearTimeout(t); }, []);
  return (<div className={`splash ${out ? 'out' : ''}`} aria-hidden={out}><div className="flex flex-col items-center gap-5">
    <svg width="230" height="180" viewBox="0 0 230 180">{[[0, 1], [0, 2], [1, 3], [2, 3], [1, 2]].map(([a, b], i) => (
      <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="200" strokeDashoffset="200"
        style={{ animation: `draw .7s ${0.2 + i * 0.12}s forwards` }} />))}
      {nodes.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" fill="#06b6d4" style={{ transformOrigin: `${x}px ${y}px`, animation: `pop .4s ${i * 0.15}s both` }} />)}</svg>
    <p className="text-2xl font-semibold tracking-wide text-white">NetLab</p><div className="bar"><i /></div></div></div>);
}
