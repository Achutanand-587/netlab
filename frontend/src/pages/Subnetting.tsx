import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Binary,
  BookOpen,
  Calculator,
  CheckCircle2,
  Copy,
  FolderTree,
  Globe,
  HelpCircle,
  Layers,
  Network,
  Plus,
  RotateCcw,
  ShieldCheck,
  Split,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  SplitResult,
  SubnetResult,
  subnettingService,
  VlsmRequirement,
  VlsmResult,
} from '../services/subnettingService';
import { toast } from '../components/Toaster';

export default function Subnetting() {
  const [activeTab, setActiveTab] = useState<'calc' | 'flsm' | 'vlsm' | 'learn'>('calc');

  // Tab 1: Calculator State
  const [ip, setIp] = useState<string>('192.168.10.37');
  const [prefix, setPrefix] = useState<number>(24);
  const [calcResult, setCalcResult] = useState<SubnetResult | null>(null);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Tab 2: FLSM Split State
  const [splitParentIp, setSplitParentIp] = useState<string>('192.168.1.0');
  const [splitPrefix, setSplitPrefix] = useState<number>(24);
  const [splitNewPrefix, setSplitNewPrefix] = useState<number>(26);
  const [splitResult, setSplitResult] = useState<SplitResult | null>(null);
  const [splitLoading, setSplitLoading] = useState<boolean>(false);

  // Tab 3: VLSM State
  const [vlsmParent, setVlsmParent] = useState<string>('192.168.1.0/24');
  const [vlsmReqs, setVlsmReqs] = useState<VlsmRequirement[]>([
    { name: 'Engineering LAN', needed_hosts: 50 },
    { name: 'Sales LAN', needed_hosts: 25 },
    { name: 'Support LAN', needed_hosts: 12 },
    { name: 'Point-to-Point WAN', needed_hosts: 2 },
  ]);
  const [vlsmResult, setVlsmResult] = useState<VlsmResult | null>(null);
  const [vlsmLoading, setVlsmLoading] = useState<boolean>(false);
  const [vlsmError, setVlsmError] = useState<string | null>(null);

  // Tab 4: Practice Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Trigger calculation when ip or prefix changes
  useEffect(() => {
    runCalculate();
  }, [ip, prefix]);

  const handleIpChange = (val: string) => {
    if (val.includes('/')) {
      const parts = val.split('/');
      setIp(parts[0].trim());
      const parsedPfx = parseInt(parts[1].trim(), 10);
      if (!isNaN(parsedPfx) && parsedPfx >= 0 && parsedPfx <= 32) {
        setPrefix(parsedPfx);
      }
    } else {
      setIp(val);
    }
  };

  const runCalculate = async () => {
    if (!ip.trim()) return;
    setCalcLoading(true);
    setCalcError(null);
    try {
      const res = await subnettingService.calculate(ip.trim(), prefix);
      setCalcResult(res);
    } catch (err) {
      setCalcError((err as Error).message);
      setCalcResult(null);
    } finally {
      setCalcLoading(false);
    }
  };

  const handleRunSplit = async () => {
    if (splitNewPrefix <= splitPrefix) {
      toast('New prefix must be greater than current prefix');
      return;
    }
    setSplitLoading(true);
    try {
      const res = await subnettingService.split(splitParentIp, splitPrefix, splitNewPrefix, 256);
      setSplitResult(res);
      toast(`Divided into ${res.subnet_count} subnets!`);
    } catch (err) {
      toast(`Split failed: ${(err as Error).message}`);
    } finally {
      setSplitLoading(false);
    }
  };

  // Live VLSM capacity validation
  const parentPrefixMatch = vlsmParent.trim().match(/\/(\d{1,2})$/);
  const parentPrefix = parentPrefixMatch ? parseInt(parentPrefixMatch[1], 10) : null;
  const parentCapacity =
    parentPrefix !== null && parentPrefix >= 0 && parentPrefix <= 32
      ? Math.pow(2, 32 - parentPrefix)
      : null;

  let totalBlockSizeNeeded = 0;
  let totalHostsNeeded = 0;
  let singleReqOverflowMsg: string | null = null;
  let hasInvalidReqValue = false;

  vlsmReqs.forEach((req) => {
    const n = Number(req.needed_hosts);
    if (isNaN(n) || n <= 0) {
      hasInvalidReqValue = true;
    } else {
      totalHostsNeeded += n;
      const h = n === 1 ? 1 : Math.max(2, Math.ceil(Math.log2(n + 2)));
      const bSize = Math.pow(2, h);
      totalBlockSizeNeeded += bSize;
      if (parentCapacity !== null && bSize > parentCapacity && !singleReqOverflowMsg) {
        singleReqOverflowMsg = `Subnet '${req.name || 'Unnamed'}' requests ${n} hosts (requires a /${32 - h} block of ${bSize} addresses), which exceeds the entire parent network capacity (${parentCapacity} addresses).`;
      }
    }
  });

  const isTotalOverflow =
    parentCapacity !== null && totalBlockSizeNeeded > parentCapacity;
  const deficit =
    parentCapacity !== null ? totalBlockSizeNeeded - parentCapacity : 0;
  const minPrefixNeeded =
    totalBlockSizeNeeded > 0
      ? Math.max(0, 32 - Math.ceil(Math.log2(totalBlockSizeNeeded)))
      : null;

  const handleRunVlsm = async () => {
    if (hasInvalidReqValue) {
      const msg = 'Please enter valid positive host counts (>= 1) for all subnets.';
      setVlsmError(msg);
      toast(msg);
      return;
    }
    setVlsmLoading(true);
    setVlsmError(null);
    try {
      const res = await subnettingService.vlsm(vlsmParent, vlsmReqs);
      setVlsmResult(res);
      toast(`Successfully allocated ${res.allocated.length} VLSM subnets!`);
    } catch (err) {
      const msg = (err as Error).message;
      setVlsmError(msg);
      toast(`VLSM error: ${msg}`);
    } finally {
      setVlsmLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast(`Copied ${label} to clipboard`);
  };

  const renderColorBinary = (binStr: string, pLen: number) => {
    const raw = binStr.replace(/\./g, '');
    const netBits = raw.slice(0, pLen);
    const hostBits = raw.slice(pLen);

    // format back into octets with dots
    let full = '';
    for (let i = 0; i < raw.length; i++) {
      if (i > 0 && i % 8 === 0) full += '.';
      full += raw[i];
    }

    return (
      <div className="font-mono text-xs tracking-wider">
        <span className="text-cyan-400 font-bold" title="Network Bits">
          {netBits}
        </span>
        <span className="text-slate-500 font-bold" title="Host Bits">
          {hostBits}
        </span>
        <span className="ml-3 text-[10px] text-slate-400 font-sans">
          ({pLen} net bits · {32 - pLen} host bits)
        </span>
      </div>
    );
  };

  const quizQuestions = [
    {
      id: 1,
      q: 'For the host IP 172.16.45.14/20, what is the valid Network Address?',
      options: ['172.16.45.0', '172.16.32.0', '172.16.40.0', '172.16.0.0'],
      correct: 1,
      explanation: 'In /20, the 3rd octet block size is 2^(24-20) = 16. Multiples of 16 are 0, 16, 32, 48. Since 45 falls between 32 and 48, the network is 172.16.32.0.',
    },
    {
      id: 2,
      q: 'How many usable host IP addresses are available in a /28 subnet?',
      options: ['16', '14', '30', '12'],
      correct: 1,
      explanation: 'Total addresses = 2^(32 - 28) = 16. Subtracting network and broadcast yields 14 usable hosts.',
    },
    {
      id: 3,
      q: 'According to RFC 3021, how many usable hosts exist in a point-to-point /31 subnet?',
      options: ['0', '1', '2', '4'],
      correct: 2,
      explanation: 'RFC 3021 defines /31 for point-to-point links where neither network nor broadcast addresses are wasted, providing exactly 2 usable host addresses.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="text-cyan-400" size={24} />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Subnetting & Addressing Lab
            </h1>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
              IPv4 & VLSM
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Interactive CIDR calculation, FLSM subnet division, VLSM variable allocation, and step-by-step addressing guides.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('calc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'calc'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator size={14} /> Subnet Calculator
          </button>
          <button
            onClick={() => setActiveTab('flsm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'flsm'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Split size={14} /> Subnet Division
          </button>
          <button
            onClick={() => setActiveTab('vlsm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'vlsm'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree size={14} /> VLSM Allocator
          </button>
          <button
            onClick={() => setActiveTab('learn')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'learn'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen size={14} /> Guide & Quiz
          </button>
        </div>
      </div>

      {/* Tab 1: Subnet Calculator */}
      {activeTab === 'calc' && (
        <div className="space-y-4">
          {/* Input Controls Card */}
          <div className="card p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  IPv4 Host Address
                </label>
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => handleIpChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-slate-200 focus:ring-1 focus:ring-cyan-500"
                  placeholder="e.g. 192.168.1.10 or 192.168.1.10/26"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  CIDR Prefix (/{prefix})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={prefix}
                    onChange={(e) => setPrefix(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="32"
                    value={prefix}
                    onChange={(e) => setPrefix(Math.min(32, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                    className="w-16 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs font-mono text-center text-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Common Subnet Masks
                </label>
                <select
                  value={prefix}
                  onChange={(e) => setPrefix(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-slate-200 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value={8}>/8 — 255.0.0.0 (Class A)</option>
                  <option value={16}>/16 — 255.255.0.0 (Class B)</option>
                  <option value={24}>/24 — 255.255.255.0 (Class C LAN)</option>
                  <option value={25}>/25 — 255.255.255.128 (126 hosts)</option>
                  <option value={26}>/26 — 255.255.255.192 (62 hosts)</option>
                  <option value={27}>/27 — 255.255.255.224 (30 hosts)</option>
                  <option value={28}>/28 — 255.255.255.240 (14 hosts)</option>
                  <option value={29}>/29 — 255.255.255.248 (6 hosts)</option>
                  <option value={30}>/30 — 255.255.255.252 (2 hosts point-to-point)</option>
                  <option value={31}>/31 — 255.255.255.254 (RFC 3021 link)</option>
                  <option value={32}>/32 — 255.255.255.255 (Host route)</option>
                </select>
              </div>
            </div>

            {calcError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-900/50 p-2 text-xs text-red-300">
                <AlertCircle size={14} className="shrink-0" />
                <span>{calcError}</span>
              </div>
            )}
          </div>

          {/* Results Display */}
          {calcResult && (
            <>
              {/* Top Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="card p-3 bg-slate-900/60 border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Network CIDR</span>
                  <div className="mt-1 text-base font-bold font-mono text-cyan-400">
                    {calcResult.cidr}
                  </div>
                </div>
                <div className="card p-3 bg-slate-900/60 border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Usable Hosts</span>
                  <div className="mt-1 text-base font-bold font-mono text-emerald-400">
                    {calcResult.usable_hosts.toLocaleString()}{' '}
                    <span className="text-xs text-slate-500">hosts</span>
                  </div>
                </div>
                <div className="card p-3 bg-slate-900/60 border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Network Class</span>
                  <div className="mt-1 text-base font-bold text-slate-200">
                    {calcResult.network_class}
                  </div>
                </div>
                <div className="card p-3 bg-slate-900/60 border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Scope & Type</span>
                  <div className="mt-1 text-base font-bold text-slate-200">
                    {calcResult.ip_type}
                  </div>
                </div>
              </div>

              {/* Detailed Addressing Table */}
              <div className="card divide-y divide-slate-800 text-xs">
                {[
                  ['Network Address', calcResult.network, 'First address in block; identifies subnet.'],
                  ['Subnet Mask', calcResult.subnet_mask, 'Defines boundary between network and host bits.'],
                  ['Wildcard Mask', calcResult.wildcard_mask, 'Inverse of netmask; used in ACLs and OSPF.'],
                  ['Broadcast Address', calcResult.broadcast, calcResult.has_broadcast ? 'Sends packets to all hosts on this subnet.' : 'No broadcast in /31 and /32.'],
                  ['First Usable Host', calcResult.first_host, 'Lowest valid IP for assigning to network device.'],
                  ['Last Usable Host', calcResult.last_host, 'Highest valid IP for assigning to network device.'],
                  ['Usable Range', `${calcResult.first_host} — ${calcResult.last_host}`, 'Assignable host address block.'],
                  ['Total Addresses', `${calcResult.total_addresses.toLocaleString()} (2^${32 - prefix})`, 'Total physical IP slots in block.'],
                ].map(([label, val, desc]) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-1 hover:bg-slate-800/30">
                    <div>
                      <span className="font-semibold text-slate-200">{label}</span>
                      <p className="text-[10px] text-slate-500">{desc}</p>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-cyan-300">
                      <span>{val}</span>
                      <button
                        onClick={() => copyToClipboard(val, label)}
                        className="btn-ghost !p-1 text-slate-400 hover:text-white"
                        title="Copy to clipboard"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Binary Bitwise Decomposition */}
              <div className="card p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 font-sans font-semibold text-slate-200">
                  <Binary size={16} className="text-cyan-400" />
                  Bitwise Binary Breakdown (Network vs. Host Bits)
                </div>

                <div className="space-y-2 text-[11px] bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto">
                  <div className="flex items-center justify-between gap-4">
                    <span className="w-24 text-slate-500 font-sans">Host IP:</span>
                    {renderColorBinary(calcResult.binary.address, prefix)}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="w-24 text-slate-500 font-sans">Netmask:</span>
                    {renderColorBinary(calcResult.binary.mask, prefix)}
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-1.5">
                    <span className="w-24 text-cyan-400 font-sans font-semibold">Network ID:</span>
                    {renderColorBinary(calcResult.binary.network, prefix)}
                  </div>
                </div>

                <div className="text-[11px] font-sans text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Network Bits (Matching Prefix)
                  <span className="w-2 h-2 rounded-full bg-slate-500 ml-4" /> Host Bits (Assignable)
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: FLSM Subnet Division */}
      {activeTab === 'flsm' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Split size={16} className="text-cyan-400" />
              Fixed Length Subnet Masking (FLSM) Division
            </h3>
            <p className="text-xs text-slate-400">
              Divide a parent IPv4 network into equal-sized smaller subnets by borrowing host bits.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Parent Network IP
                </label>
                <input
                  type="text"
                  value={splitParentIp}
                  onChange={(e) => setSplitParentIp(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Parent Prefix (/{splitPrefix})
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={splitPrefix}
                  onChange={(e) => setSplitPrefix(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  New Subnet Prefix (/{splitNewPrefix})
                </label>
                <select
                  value={splitNewPrefix}
                  onChange={(e) => setSplitNewPrefix(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-slate-200"
                >
                  {Array.from({ length: 32 - splitPrefix }, (_, i) => splitPrefix + i + 1).map((p) => (
                    <option key={p} value={p}>
                      /{p} (Borrow {p - splitPrefix} bits ⟹ {Math.pow(2, p - splitPrefix)} subnets)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleRunSplit}
              disabled={splitLoading}
              className="mt-2 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm flex items-center gap-1.5"
            >
              <Split size={14} /> Calculate Subnet Division
            </button>
          </div>

          {/* Division Results Table */}
          {splitResult && (
            <div className="card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-200">Parent: {splitResult.parent_cidr}</span>
                  <span className="text-slate-400 ml-2">
                    Divided into <strong>{splitResult.subnet_count}</strong> subnets (showing {splitResult.returned})
                  </span>
                </div>
                <div className="font-mono text-cyan-400">
                  {splitResult.subnets[0]?.usable_hosts} usable hosts per subnet
                </div>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-900/60 sticky top-0">
                    <tr>
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">Subnet CIDR</th>
                      <th className="py-2 px-2">Network</th>
                      <th className="py-2 px-2">Usable Range</th>
                      <th className="py-2 px-2">Broadcast</th>
                      <th className="py-2 px-2 text-right">Hosts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {splitResult.subnets.map((sub, idx) => (
                      <tr key={sub.cidr} className="hover:bg-slate-800/40">
                        <td className="py-2 px-2 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-2 text-cyan-400 font-semibold">{sub.cidr}</td>
                        <td className="py-2 px-2 text-slate-300">{sub.network}</td>
                        <td className="py-2 px-2 text-emerald-400">
                          {sub.first_host} — {sub.last_host}
                        </td>
                        <td className="py-2 px-2 text-slate-400">{sub.broadcast}</td>
                        <td className="py-2 px-2 text-right text-slate-300">{sub.usable_hosts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: VLSM Allocator */}
      {activeTab === 'vlsm' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <FolderTree size={16} className="text-cyan-400" />
                  Variable Length Subnet Masking (VLSM) Allocator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Efficiently allocates varying subnet sizes based on exact host requirements to minimize IP waste.
                </p>
              </div>
              <button
                onClick={() =>
                  setVlsmReqs([...vlsmReqs, { name: `Subnet ${vlsmReqs.length + 1}`, needed_hosts: 10 }])
                }
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
              >
                <Plus size={13} /> Add Subnet
              </button>
            </div>

            {/* Parent Network Input */}
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Parent Address Block (CIDR)
              </label>
              <input
                type="text"
                value={vlsmParent}
                onChange={(e) => setVlsmParent(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-cyan-300 font-semibold"
                placeholder="192.168.1.0/24"
              />
            </div>

            {/* Subnet Requirements List */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">Subnet Requirements:</label>
              <div className="space-y-2">
                {vlsmReqs.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={req.name}
                      onChange={(e) => {
                        const copy = [...vlsmReqs];
                        copy[idx].name = e.target.value;
                        setVlsmReqs(copy);
                      }}
                      className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
                      placeholder="Department Name"
                    />
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        value={req.needed_hosts}
                        onChange={(e) => {
                          const val = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10);
                          const copy = [...vlsmReqs];
                          copy[idx].needed_hosts = val;
                          setVlsmReqs(copy);
                        }}
                        className={`w-24 rounded-md border ${
                          req.needed_hosts <= 0 || isNaN(req.needed_hosts)
                            ? 'border-red-500 bg-red-950/40 text-red-300'
                            : 'border-slate-700 bg-slate-800 text-cyan-400'
                        } px-2 py-1.5 text-xs font-mono`}
                      />
                      <span className="text-xs text-slate-400">hosts</span>
                    </div>
                    <button
                      onClick={() => setVlsmReqs(vlsmReqs.filter((_, i) => i !== idx))}
                      disabled={vlsmReqs.length <= 1}
                      className="p-1.5 text-red-400 hover:bg-red-950/40 rounded disabled:opacity-30"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Address Capacity Telemetry */}
            {parentCapacity !== null && (
              <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                isTotalOverflow || singleReqOverflowMsg || hasInvalidReqValue
                  ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
                  <span>Parent Capacity (/{parentPrefix}): <strong>{parentCapacity.toLocaleString()} addresses</strong></span>
                  <span>Required Space: <strong className={isTotalOverflow ? 'text-red-400' : 'text-cyan-400'}>{totalBlockSizeNeeded.toLocaleString()} addresses</strong> ({totalHostsNeeded} hosts)</span>
                </div>
                {singleReqOverflowMsg && (
                  <p className="text-xs text-red-300 font-sans font-medium flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" />
                    {singleReqOverflowMsg}
                  </p>
                )}
                {isTotalOverflow && !singleReqOverflowMsg && (
                  <p className="text-xs text-amber-300 font-sans font-medium flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>
                      Allocated power-of-2 blocks ({totalBlockSizeNeeded} addresses) exceed parent capacity ({parentCapacity}) by <strong>{deficit}</strong> addresses. Need at least a <strong>/{minPrefixNeeded}</strong> network, or adjust host requirements to fit into smaller power-of-2 block tiers.
                    </span>
                  </p>
                )}
                {hasInvalidReqValue && (
                  <p className="text-xs text-red-300 font-sans font-medium flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" />
                    Every subnet must require at least 1 usable host (positive integer).
                  </p>
                )}
              </div>
            )}

            {vlsmError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{vlsmError}</span>
              </div>
            )}

            <button
              onClick={handleRunVlsm}
              disabled={vlsmLoading}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm flex items-center gap-1.5"
            >
              <FolderTree size={14} /> Calculate VLSM Layout
            </button>
          </div>

          {/* VLSM Output Results */}
          {vlsmResult && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
                <span className="font-semibold text-slate-200">
                  Allocated Subnets (Sorted Largest to Smallest)
                </span>
                <span className="text-cyan-400 font-mono">
                  Remaining Space: {vlsmResult.remaining_addresses} addresses
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                    <tr>
                      <th className="py-2 px-2">Department</th>
                      <th className="py-2 px-2">Needed</th>
                      <th className="py-2 px-2">Allocated</th>
                      <th className="py-2 px-2">Subnet CIDR</th>
                      <th className="py-2 px-2">Usable Range</th>
                      <th className="py-2 px-2">Mask</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {vlsmResult.allocated.map((al) => (
                      <tr key={al.cidr} className="hover:bg-slate-800/40">
                        <td className="py-2 px-2 font-sans font-semibold text-slate-200">
                          {al.name}
                        </td>
                        <td className="py-2 px-2 text-slate-400">{al.needed_hosts}</td>
                        <td className="py-2 px-2 text-emerald-400 font-bold">{al.allocated_hosts}</td>
                        <td className="py-2 px-2 text-cyan-400 font-semibold">{al.cidr}</td>
                        <td className="py-2 px-2 text-slate-300">
                          {al.first_host} — {al.last_host}
                        </td>
                        <td className="py-2 px-2 text-slate-500">{al.subnet_mask}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Unallocated Space Info */}
              {vlsmResult.unallocated.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <span className="font-semibold text-slate-300">Unallocated Contiguous Blocks:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {vlsmResult.unallocated.map((block) => (
                      <span
                        key={block}
                        className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[11px]"
                      >
                        {block}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Step-by-Step Guide & Practice Quiz */}
      {activeTab === 'learn' && (
        <div className="space-y-6">
          {/* Concept Guide */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="card p-4 space-y-2 bg-slate-900/60 border-slate-800">
              <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                <Globe size={15} /> 1. How CIDR & Netmasks Work
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Classless Inter-Domain Routing (CIDR) replaces rigid Class A/B/C boundaries. A <code className="text-cyan-400 font-mono">/24</code> indicates that the first 24 bits of a 32-bit address represent the <strong>Network ID</strong>, leaving the remaining <code className="text-cyan-400 font-mono">32 - 24 = 8</code> bits for host addresses ($2^8 = 256$ slots).
              </p>
            </div>

            <div className="card p-4 space-y-2 bg-slate-900/60 border-slate-800">
              <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                <Binary size={15} /> 2. Bitwise Logic (AND & OR)
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Routers extract the Network Address by performing a bitwise AND between the Host IP and Subnet Mask:
                <br />
                <code className="text-blue-300 font-mono block mt-1">Network = IP & SubnetMask</code>
                The Broadcast Address is computed by ORing the Network Address with the inverted mask:
                <code className="text-blue-300 font-mono block mt-0.5">Broadcast = Network | (~SubnetMask)</code>
              </p>
            </div>

            <div className="card p-4 space-y-2 bg-slate-900/60 border-slate-800">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Split size={15} /> 3. Subnet Division (FLSM)
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Borrowing $N$ host bits creates $2^N$ equal-sized subnets. For example, borrowing 2 bits from a <code className="text-emerald-400 font-mono">/24</code> creates $2^2 = 4$ subnets of size <code className="text-emerald-400 font-mono">/26</code>, each with $2^6 - 2 = 62$ usable hosts.
              </p>
            </div>

            <div className="card p-4 space-y-2 bg-slate-900/60 border-slate-800">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                <FolderTree size={15} /> 4. VLSM Strategy (Largest First)
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Always allocate subnets in <strong>descending order of required hosts</strong>. This guarantees natural binary boundary alignment and prevents address fragmentation.
              </p>
            </div>
          </div>

          {/* Interactive DCN Practice Quiz */}
          <div className="card p-5 space-y-4 border-cyan-500/30 bg-gradient-to-br from-slate-900 to-navy-950">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  DCN Subnetting Practice Quiz (Interactive Evaluation)
                </h3>
              </div>
              <button
                onClick={() => {
                  setQuizAnswers({});
                  setQuizSubmitted(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <RotateCcw size={12} /> Reset Quiz
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {quizQuestions.map((q) => {
                const selected = quizAnswers[q.id];
                const isCorrect = selected === q.correct;
                return (
                  <div key={q.id} className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2.5">
                    <p className="font-semibold text-slate-200">{q.id}. {q.q}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => (
                        <button
                          key={opt}
                          onClick={() => {
                            if (!quizSubmitted) {
                              setQuizAnswers({ ...quizAnswers, [q.id]: optIdx });
                            }
                          }}
                          className={`p-2 rounded-md text-left font-mono text-xs border transition-all ${
                            selected === optIdx
                              ? quizSubmitted
                                ? isCorrect
                                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                                  : 'bg-red-950/60 border-red-500 text-red-300'
                                : 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                              : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {quizSubmitted && (
                      <div className={`p-2 rounded text-[11px] font-sans ${isCorrect ? 'bg-emerald-950/30 text-emerald-300' : 'bg-red-950/30 text-red-300'}`}>
                        {isCorrect ? '✓ Correct!' : '✗ Incorrect.'} {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!quizSubmitted ? (
              <button
                onClick={() => setQuizSubmitted(true)}
                disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
              >
                Submit Answers
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                Score:{' '}
                {quizQuestions.filter((q) => quizAnswers[q.id] === q.correct).length} / {quizQuestions.length} correct!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
