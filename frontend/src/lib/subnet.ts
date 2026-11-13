export const toInt = (ip: string) => ip.split('.').reduce((a, o) => (a << 8) + +o, 0) >>> 0;
export const toIp = (n: number) => [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.');
export const validIp = (ip: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) && ip.split('.').every(o => +o <= 255);
export const bin = (ip: string) => ip.split('.').map(o => (+o).toString(2).padStart(8, '0')).join('.');
export function calc(ip: string, p: number) {
  const mask = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
  const net = (toInt(ip) & mask) >>> 0, bc = (net | ~mask) >>> 0, small = p >= 31;
  return { network: toIp(net), mask: toIp(mask), broadcast: toIp(bc), first: toIp(small ? net : net + 1), last: toIp(small ? bc : bc - 1),
    usable: p === 32 ? 1 : p === 31 ? 2 : 2 ** (32 - p) - 2, net, p };
}
export function split(net: number, p: number, n: number) {
  const size = 2 ** (32 - p - n);
  return Array.from({ length: 2 ** n }, (_, i) => { const s = net + i * size, b = s + size - 1;
    return { cidr: `${toIp(s)}/${p + n}`, first: toIp(s + 1), last: toIp(b - 1), broadcast: toIp(b), hosts: size - 2 }; });
}
