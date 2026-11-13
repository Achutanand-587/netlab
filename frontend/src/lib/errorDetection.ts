export type Algo = 'parity-even' | 'parity-odd' | 'checksum' | 'crc';
const xorDiv = (bits: string, g: string) => { const a = bits.split('').map(Number), d = g.split('').map(Number);
  for (let i = 0; i <= a.length - d.length; i++) if (a[i]) d.forEach((b, j) => (a[i + j] ^= b));
  return a.slice(a.length - d.length + 1).join(''); };
const ones = (s: string) => [...s].filter(c => c === '1').length;
export function encode(data: string, algo: Algo, gen = '1011') {
  const steps: string[] = []; let d = data, red = '';
  if (algo.startsWith('parity')) { const odd = algo === 'parity-odd'; red = String((ones(data) + (odd ? 1 : 0)) % 2);
    steps.push(`Count the 1s in ${data}: ${ones(data)}`, `${odd ? 'Odd' : 'Even'} parity needs parity bit ${red}`); }
  else if (algo === 'checksum') { d = data.padStart(Math.ceil(data.length / 8) * 8, '0'); let s = 0;
    for (let i = 0; i < d.length; i += 8) { s += parseInt(d.slice(i, i + 8), 2); s = (s & 255) + (s >> 8);
      steps.push(`Add word ${d.slice(i, i + 8)} (carry wrapped) → ${s.toString(2).padStart(8, '0')}`); }
    red = (~s & 255).toString(2).padStart(8, '0'); steps.push(`One's complement of the sum → ${red}`); }
  else { const pad = data + '0'.repeat(gen.length - 1); red = xorDiv(pad, gen);
    steps.push(`Append ${gen.length - 1} zeros: ${pad}`, `XOR-divide by generator ${gen}; remainder = ${red}`); }
  return { code: d + red, red, steps };
}
export function verify(code: string, algo: Algo, gen = '1011') {
  if (algo.startsWith('parity')) return ones(code) % 2 === (algo === 'parity-odd' ? 1 : 0);
  if (algo === 'checksum') { let s = 0; for (let i = 0; i < code.length; i += 8) { s += parseInt(code.slice(i, i + 8), 2); s = (s & 255) + (s >> 8); } return s === 255; }
  return !xorDiv(code, gen).includes('1');
}
