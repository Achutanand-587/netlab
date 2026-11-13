import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Clock,
  Download,
  FileCode,
  FileUp,
  FolderOpen,
  HardDrive,
  Info,
  Network,
  PieChart as PieIcon,
  Play,
  Radio,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Wifi,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  CaptureInfo,
  CaptureStats,
  PacketDetail,
  PacketQueryParams,
  packetService,
  PacketSummary,
  SampleInfo,
} from '../services/packetService';
import {
  captureService,
  InterfaceInfo,
} from '../services/captureService';
import { PacketTable } from '../components/packet/PacketTable';
import { PacketDetailsModal } from '../components/packet/PacketDetailsModal';
import { toast } from '../components/Toaster';

export default function PCAPAnalyzer() {
  // Navigation mode: 'live' or 'pcap'
  const [activeTab, setActiveTab] = useState<'live' | 'pcap'>('live');

  // ---------- Live Capture States ----------
  const [interfaces, setInterfaces] = useState<InterfaceInfo[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>('');
  const [bpfFilter, setBpfFilter] = useState<string>('');
  const [packetLimit, setPacketLimit] = useState<number>(1000);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [liveCaptureId, setLiveCaptureId] = useState<number | null>(null);
  const [livePackets, setLivePackets] = useState<PacketSummary[]>([]);
  const [totalLiveCount, setTotalLiveCount] = useState<number>(0);
  const [totalLiveBytes, setTotalLiveBytes] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [loadingInterfaces, setLoadingInterfaces] = useState<boolean>(false);
  const [interfaceError, setInterfaceError] = useState<string | null>(null);

  // Live filter state (in-memory filtering for live table)
  const [liveSearch, setLiveSearch] = useState<string>('');
  const [liveProtocol, setLiveProtocol] = useState<string>('');
  const [liveStatus, setLiveStatus] = useState<string>('');

  const socketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<number | null>(null);
  const liveTableEndRef = useRef<HTMLTableRowElement>(null);

  // ---------- PCAP File States ----------
  const [captures, setCaptures] = useState<CaptureInfo[]>([]);
  const [activeCaptureId, setActiveCaptureId] = useState<number | null>(null);
  const [samples, setSamples] = useState<SampleInfo[]>([]);
  const [stats, setStats] = useState<CaptureStats | null>(null);

  // Packet data & pagination states for PCAP view
  const [packets, setPackets] = useState<PacketSummary[]>([]);
  const [totalPackets, setTotalPackets] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<PacketQueryParams>({
    page: 1,
    page_size: 50,
    sort: 'index',
    order: 'asc',
  });

  // Modal inspection states (shared by Live & PCAP views)
  const [selectedPacket, setSelectedPacket] = useState<PacketDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Loading & error states
  const [loadingCaptures, setLoadingCaptures] = useState(false);
  const [loadingPackets, setLoadingPackets] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const PROTOCOL_COLORS: Record<string, string> = {
    TCP: '#06b6d4',
    UDP: '#3b82f6',
    ICMP: '#a855f7',
    DNS: '#f59e0b',
    ARP: '#10b981',
    IP: '#64748b',
    Other: '#94a3b8',
  };

  const FILTER_PRESETS = [
    { label: 'All Traffic', value: '' },
    { label: 'TCP Only', value: 'tcp' },
    { label: 'UDP Only', value: 'udp' },
    { label: 'DNS (port 53)', value: 'port 53' },
    { label: 'HTTP / HTTPS', value: 'port 80 or port 443' },
    { label: 'ICMP (Ping)', value: 'icmp' },
  ];

  // 1. Initial Load: Fetch interfaces and existing captures
  useEffect(() => {
    loadInterfaces();
    refreshCaptures();
  }, []);

  const loadInterfaces = async () => {
    setLoadingInterfaces(true);
    setInterfaceError(null);
    try {
      const ifaces = await captureService.getInterfaces();
      setInterfaces(ifaces);
      if (ifaces.length > 0) {
        // Prefer an active 'up' interface (like Wi-Fi or Ethernet)
        const active = ifaces.find(i => i.status === 'up') || ifaces[0];
        setSelectedInterface(active.id);
      }
    } catch (e) {
      const msg = (e as Error).message || 'Failed to detect network interfaces.';
      setInterfaceError(msg);
    } finally {
      setLoadingInterfaces(false);
    }
  };

  const refreshCaptures = async () => {
    setLoadingCaptures(true);
    try {
      const [capsList, sampleList] = await Promise.all([
        packetService.getCaptures(),
        packetService.getSamples().catch(() => []),
      ]);
      setCaptures(capsList);
      setSamples(sampleList);
      if (capsList.length > 0 && !activeCaptureId) {
        setActiveCaptureId(capsList[0].id);
      }
    } catch (e) {
      console.error('Failed to load captures', e);
    } finally {
      setLoadingCaptures(false);
    }
  };

  // 2. PCAP View: Load stats & packets when active capture changes
  useEffect(() => {
    if (!activeCaptureId || activeTab !== 'pcap') return;

    const loadStats = async () => {
      try {
        const statsData = await packetService.getCaptureStats(activeCaptureId);
        setStats(statsData);
      } catch (e) {
        console.error('Failed to load stats', e);
      }
    };

    loadStats();
    setFilters(f => ({ ...f, page: 1 }));
  }, [activeCaptureId, activeTab]);

  useEffect(() => {
    if (!activeCaptureId || activeTab !== 'pcap') return;

    let isMounted = true;
    const fetchPackets = async () => {
      setLoadingPackets(true);
      setError(null);
      try {
        const res = await packetService.getPackets(activeCaptureId, filters);
        if (isMounted) {
          setPackets(res.items);
          setTotalPackets(res.total);
          setTotalPages(res.pages);
        }
      } catch (e) {
        if (isMounted) setError((e as Error).message);
      } finally {
        if (isMounted) setLoadingPackets(false);
      }
    };

    fetchPackets();
    return () => {
      isMounted = false;
    };
  }, [activeCaptureId, filters, activeTab]);

  // Clean up timer and socket on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  // Auto-scroll live packet view if enabled
  useEffect(() => {
    if (activeTab === 'live' && autoScroll && liveTableEndRef.current) {
      liveTableEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [livePackets, autoScroll, activeTab]);

  // ---------- Live Capture Start & Stop Handlers ----------
  const handleStartCapture = async () => {
    if (!selectedInterface) {
      toast('Please select a network interface first.');
      return;
    }

    setError(null);
    try {
      const res = await captureService.startCapture({
        interface: selectedInterface,
        bpf_filter: bpfFilter.trim() || null,
        packet_limit: packetLimit,
      });

      setLiveSessionId(res.session_id);
      setLiveCaptureId(res.capture_id);
      setIsCapturing(true);
      setLivePackets([]);
      setTotalLiveCount(0);
      setTotalLiveBytes(0);
      setElapsedSeconds(0);

      // Start elapsed timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);

      // Connect WebSocket for real-time packet push
      const ws = captureService.connectWebSocket(res.session_id, {
        onPacket: (newPacket) => {
          setTotalLiveCount(prev => prev + 1);
          setTotalLiveBytes(prev => prev + newPacket.length);
          setLivePackets(prev => {
            // Buffer up to 500 latest packets in memory
            const next = [...prev, newPacket];
            return next.length > 500 ? next.slice(next.length - 500) : next;
          });
        },
        onStatus: (statusMsg) => {
          if (statusMsg.status === 'stopped') {
            handleCaptureEnded(statusMsg.packet_count, statusMsg.reason);
          }
        },
        onError: () => {
          toast('Live capture stream disconnected.');
        },
      });

      socketRef.current = ws;
      toast(`Live capture started on '${selectedInterface}'`);
    } catch (e) {
      const msg = (e as Error).message || 'Failed to start capture';
      setError(msg);
      toast(`Error: ${msg}`);
    }
  };

  const handleStopCapture = async () => {
    if (!isCapturing) return;
    try {
      const res = await captureService.stopCapture(liveSessionId || undefined);
      handleCaptureEnded(res.packet_count, 'user_stopped');
    } catch (e) {
      toast(`Error stopping capture: ${(e as Error).message}`);
    }
  };

  const handleCaptureEnded = (finalCount?: number, reason?: string) => {
    setIsCapturing(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const countStr = finalCount !== undefined ? `${finalCount} packets` : 'complete';
    toast(`Live capture ended (${countStr})`);
    refreshCaptures();
  };

  // Inspect a live packet
  const handleSelectLivePacket = (index: number) => {
    const pkt = livePackets.find(p => p.index === index);
    if (!pkt) return;
    // Cast packet summary as PacketDetail (headers are embedded)
    setSelectedPacket(pkt as unknown as PacketDetail);
    setIsModalOpen(true);
  };

  // ---------- PCAP Upload & Sample Handlers ----------
  const handleFileUpload = async (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pcap', '.pcapng', '.cap'].includes(ext)) {
      toast('Invalid file type. Only .pcap, .pcapng, and .cap are supported.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const newCap = await packetService.uploadPCAP(file);
      toast(`Capture '${newCap.filename}' uploaded (${newCap.packet_count} packets)`);
      await refreshCaptures();
      setActiveCaptureId(newCap.id);
      setActiveTab('pcap');
    } catch (e) {
      const msg = (e as Error).message || 'Failed to upload PCAP';
      setError(msg);
      toast(`Upload error: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSample = async (sampleName = 'sample-mixed') => {
    setUploading(true);
    setError(null);
    try {
      const cap = await packetService.loadSample(sampleName);
      toast(`Loaded sample capture (${cap.packet_count} packets)`);
      await refreshCaptures();
      setActiveCaptureId(cap.id);
      setActiveTab('pcap');
    } catch (e) {
      const msg = (e as Error).message || 'Failed to load sample PCAP';
      setError(msg);
      toast(`Sample load error: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCapture = async (id: number) => {
    if (!confirm('Are you sure you want to delete this capture?')) return;
    try {
      await packetService.deleteCapture(id);
      toast('Capture deleted');
      const updated = captures.filter(c => c.id !== id);
      setCaptures(updated);
      if (activeCaptureId === id) {
        setActiveCaptureId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (e) {
      toast(`Failed to delete capture: ${(e as Error).message}`);
    }
  };

  const handleSelectPCAPPacket = async (index: number) => {
    if (!activeCaptureId) return;
    try {
      const detail = await packetService.getPacketDetail(activeCaptureId, index);
      setSelectedPacket(detail);
      setIsModalOpen(true);
    } catch (e) {
      toast(`Failed to fetch packet details: ${(e as Error).message}`);
    }
  };

  // Filtered live packets for table display
  const filteredLivePackets = livePackets.filter(pkt => {
    if (liveProtocol && pkt.protocol.toUpperCase() !== liveProtocol.toUpperCase()) return false;
    if (liveStatus && pkt.status !== liveStatus) return false;
    if (liveSearch) {
      const q = liveSearch.toLowerCase();
      const match =
        (pkt.src_ip && pkt.src_ip.toLowerCase().includes(q)) ||
        (pkt.dst_ip && pkt.dst_ip.toLowerCase().includes(q)) ||
        (pkt.protocol && pkt.protocol.toLowerCase().includes(q)) ||
        (pkt.info && pkt.info.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const pieData = stats?.protocols
    ? Object.entries(stats.protocols).map(([name, value]) => ({ name, value }))
    : [];

  const activeCapture = captures.find(c => c.id === activeCaptureId);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Network Packet Analyzer</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time live network interface sniffing and offline PCAP file header dissection.
          </p>
        </div>

        {/* Mode Toggle Pills */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-navy-900">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium transition ${
              activeTab === 'live'
                ? 'bg-cyan-500 text-navy-950 font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Radio size={14} className={isCapturing ? 'animate-pulse text-red-600' : ''} />
            Live Network Capture
            {isCapturing && (
              <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('pcap')}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium transition ${
              activeTab === 'pcap'
                ? 'bg-cyan-500 text-navy-950 font-semibold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <FolderOpen size={14} />
            PCAP File Analysis
            {captures.length > 0 && (
              <span className="rounded bg-slate-200 px-1.5 py-0.2 text-[10px] dark:bg-navy-800">
                {captures.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
          <button className="ml-auto font-semibold hover:underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 1: LIVE NETWORK PACKET CAPTURE VIEW                       */}
      {/* ============================================================== */}
      {activeTab === 'live' && (
        <div className="space-y-5">
          {/* Safety & Educational Authorization Banner */}
          <div className="flex items-start gap-3 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 to-navy-900/40 p-4 text-xs">
            <Shield size={16} className="mt-0.5 shrink-0 text-cyan-400" />
            <div className="space-y-1">
              <span className="font-semibold text-cyan-300">
                Active Physical / Wireless Interface Sniffer (Read-Only)
              </span>
              <p className="text-slate-400">
                NetLab captures real network frames arriving at your computer’s network interface in passive, read-only monitoring mode.
                Raw packet payloads are never stored. Only capture networks you own or have explicit authorization to inspect.
              </p>
            </div>
            <span className="ml-auto shrink-0 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-cyan-400">
              DATA SOURCE: LIVE
            </span>
          </div>

          {/* Interface & Capture Controls Card */}
          <div className="card space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Interface Picker */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Network Interface (NIC)</span>
                  <button
                    className="flex items-center gap-1 font-normal text-cyan-400 hover:underline"
                    onClick={loadInterfaces}
                    disabled={isCapturing || loadingInterfaces}
                  >
                    <RefreshCw size={11} className={loadingInterfaces ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </label>
                <select
                  className="input !py-1.5 text-xs font-mono"
                  value={selectedInterface}
                  onChange={e => setSelectedInterface(e.target.value)}
                  disabled={isCapturing || interfaces.length === 0}
                >
                  {interfaces.length === 0 ? (
                    <option value="">No interfaces found</option>
                  ) : (
                    interfaces.map(iface => (
                      <option key={iface.id} value={iface.id}>
                        {iface.name} {iface.ip ? `(${iface.ip})` : ''} - {iface.status.toUpperCase()}
                      </option>
                    ))
                  )}
                </select>

                {selectedInterface && (
                  <p className="truncate text-[11px] text-slate-500 font-mono">
                    {interfaces.find(i => i.id === selectedInterface)?.description}
                  </p>
                )}
              </div>

              {/* BPF Filter */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  BPF Capture Filter (Optional)
                </label>
                <input
                  type="text"
                  className="input !py-1.5 text-xs font-mono"
                  placeholder="e.g. tcp, port 53, icmp..."
                  value={bpfFilter}
                  onChange={e => setBpfFilter(e.target.value)}
                  disabled={isCapturing}
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {FILTER_PRESETS.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      disabled={isCapturing}
                      onClick={() => setBpfFilter(p.value)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition ${
                        bpfFilter === p.value
                          ? 'bg-cyan-500 text-navy-950 font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-900 dark:text-slate-400 dark:hover:bg-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Packet Limit & Action Button */}
              <div className="flex flex-col justify-between space-y-2 md:col-span-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Packet Limit
                  </label>
                  <select
                    className="input !w-auto !py-1 text-xs font-mono"
                    value={packetLimit}
                    onChange={e => setPacketLimit(Number(e.target.value))}
                    disabled={isCapturing}
                  >
                    <option value={200}>200 packets</option>
                    <option value={500}>500 packets</option>
                    <option value={1000}>1,000 packets</option>
                    <option value={5000}>5,000 packets</option>
                  </select>
                </div>

                {/* Primary Start / Stop Button */}
                {!isCapturing ? (
                  <button
                    className="btn flex w-full items-center justify-center gap-2 !py-2.5 font-semibold shadow-lg shadow-cyan-500/20"
                    onClick={handleStartCapture}
                    disabled={!selectedInterface || interfaces.length === 0}
                  >
                    <Play size={16} fill="currentColor" />
                    <span>Start Live Capture</span>
                  </button>
                ) : (
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white transition hover:bg-red-500 shadow-lg shadow-red-500/20"
                    onClick={handleStopCapture}
                  >
                    <Square size={16} fill="currentColor" />
                    <span>Stop Capture ({formatTimer(elapsedSeconds)})</span>
                  </button>
                )}
              </div>
            </div>

            {interfaceError && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
                <span className="font-semibold">Notice: </span>
                {interfaceError}. Ensure you run with appropriate capture permissions or have Npcap installed.
              </div>
            )}
          </div>

          {/* Live Metrics Ribbon */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card flex items-center gap-3 !py-3">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl ${
                  isCapturing
                    ? 'bg-red-500/15 text-red-500 animate-pulse'
                    : 'bg-cyan-500/15 text-cyan-400'
                }`}
              >
                <Activity size={18} />
              </span>
              <div>
                <p className="text-xs text-slate-500">Capture Status</p>
                <p className="font-mono text-sm font-bold uppercase text-slate-900 dark:text-white">
                  {isCapturing ? 'SNIFFING LIVE' : totalLiveCount > 0 ? 'STOPPED' : 'IDLE'}
                </p>
              </div>
            </div>

            <div className="card flex items-center gap-3 !py-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400">
                <Network size={18} />
              </span>
              <div>
                <p className="text-xs text-slate-500">Packets Captured</p>
                <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                  {totalLiveCount}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    / {packetLimit}
                  </span>
                </p>
              </div>
            </div>

            <div className="card flex items-center gap-3 !py-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15 text-blue-400">
                <Clock size={18} />
              </span>
              <div>
                <p className="text-xs text-slate-500">Elapsed Time</p>
                <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                  {formatTimer(elapsedSeconds)}
                </p>
              </div>
            </div>

            <div className="card flex items-center gap-3 !py-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/15 text-purple-400">
                <HardDrive size={18} />
              </span>
              <div>
                <p className="text-xs text-slate-500">Captured Volume</p>
                <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                  {(totalLiveBytes / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          </div>

          {/* Post-Capture Prompt Banner */}
          {!isCapturing && totalLiveCount > 0 && liveCaptureId && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <Shield size={16} />
                <span>
                  Capture complete! <b>{totalLiveCount} packets</b> successfully written to SQLite database (Capture #{liveCaptureId}).
                </span>
              </div>
              <button
                className="btn flex items-center gap-1.5 !py-1 text-xs"
                onClick={() => {
                  setActiveCaptureId(liveCaptureId);
                  setActiveTab('pcap');
                }}
              >
                <span>View Full PCAP Analytics & Export CSV</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Live Packet Table Controls */}
          <div className="card space-y-4 !p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-white/10">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                {/* Search */}
                <input
                  type="text"
                  className="input !w-auto !py-1.5 text-xs font-mono"
                  placeholder="Filter IP or protocol..."
                  value={liveSearch}
                  onChange={e => setLiveSearch(e.target.value)}
                />

                {/* Protocol filter */}
                <select
                  className="input !w-auto !py-1.5 text-xs font-mono"
                  value={liveProtocol}
                  onChange={e => setLiveProtocol(e.target.value)}
                >
                  <option value="">All Protocols</option>
                  <option value="TCP">TCP</option>
                  <option value="UDP">UDP</option>
                  <option value="ICMP">ICMP</option>
                  <option value="DNS">DNS</option>
                  <option value="ARP">ARP</option>
                </select>

                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-cyan-500"
                    checked={autoScroll}
                    onChange={e => setAutoScroll(e.target.checked)}
                  />
                  <span>Auto-scroll to latest</span>
                </label>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>In-Memory Buffer: {filteredLivePackets.length} packets</span>
                {livePackets.length > 0 && !isCapturing && (
                  <button
                    className="btn-ghost !py-1 !px-2 text-xs text-slate-400 hover:text-white"
                    onClick={() => {
                      setLivePackets([]);
                      setTotalLiveCount(0);
                    }}
                  >
                    Clear Stream
                  </button>
                )}
              </div>
            </div>

            {/* Live Table */}
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-navy-950">
                  <tr>
                    <th className="py-2.5 pl-4 pr-2">#</th>
                    <th className="px-2 py-2.5">Time (s)</th>
                    <th className="px-2 py-2.5">Source</th>
                    <th className="px-2 py-2.5">Destination</th>
                    <th className="px-2 py-2.5">Protocol</th>
                    <th className="px-2 py-2.5">Length</th>
                    <th className="px-2 py-2.5">Flags / Status</th>
                    <th className="px-3 py-2.5">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredLivePackets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-500 font-sans">
                        {isCapturing ? (
                          <div className="flex flex-col items-center gap-2">
                            <Radio size={24} className="animate-spin text-cyan-400" />
                            <span>Listening for network traffic on {selectedInterface}...</span>
                            <span className="text-xs text-slate-600">Open a website or generate network activity to see packets appear.</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Activity size={24} className="text-slate-600" />
                            <span>No live packets captured yet. Press "Start Live Capture" above.</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredLivePackets.map(pkt => (
                      <tr
                        key={pkt.index}
                        onClick={() => handleSelectLivePacket(pkt.index)}
                        className="cursor-pointer transition-colors hover:bg-cyan-500/10"
                      >
                        <td className="py-2 pl-4 pr-2 text-slate-500">{pkt.index}</td>
                        <td className="px-2 py-2 text-slate-500">{pkt.timestamp.toFixed(4)}</td>
                        <td className="px-2 py-2 font-medium text-slate-800 dark:text-slate-200">
                          {pkt.src_ip || '—'}
                          {pkt.src_port ? <span className="text-slate-400">:{pkt.src_port}</span> : null}
                        </td>
                        <td className="px-2 py-2 font-medium text-slate-800 dark:text-slate-200">
                          {pkt.dst_ip || '—'}
                          {pkt.dst_port ? <span className="text-slate-400">:{pkt.dst_port}</span> : null}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className="inline-block rounded border px-1.5 py-0.5 text-[11px] font-semibold"
                            style={{
                              borderColor: `${PROTOCOL_COLORS[pkt.protocol.toUpperCase()] || '#64748b'}50`,
                              color: PROTOCOL_COLORS[pkt.protocol.toUpperCase()] || '#94a3b8',
                              backgroundColor: `${PROTOCOL_COLORS[pkt.protocol.toUpperCase()] || '#64748b'}15`,
                            }}
                          >
                            {pkt.protocol}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-slate-400">{pkt.length} B</td>
                        <td className="px-2 py-2">
                          {pkt.tcp_flags && pkt.tcp_flags.length > 0 ? (
                            <span className="rounded bg-navy-800/80 px-1.5 py-0.5 text-[11px] font-bold text-cyan-300 border border-cyan-500/20">
                              {pkt.tcp_flags.join(',')}
                            </span>
                          ) : pkt.status && pkt.status !== 'ok' ? (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-300 capitalize">
                              {pkt.status}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 text-slate-600 dark:text-slate-300" title={pkt.info}>
                          {pkt.info || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr ref={liveTableEndRef} />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: OFFLINE PCAP FILE ANALYSIS VIEW (PHASE 2)               */}
      {/* ============================================================== */}
      {activeTab === 'pcap' && (
        <div className="space-y-5">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 font-mono text-xs font-bold text-blue-400">
              DATA SOURCE: IMPORTED FILE
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pcap,.pcapng,.cap"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
              />

              <button
                className="btn flex items-center gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload size={15} />
                <span>Upload PCAP</span>
              </button>

              <button
                className="btn-ghost flex items-center gap-2 border border-slate-300 dark:border-white/10"
                onClick={() => handleLoadSample(samples[0]?.name || 'sample-mixed')}
                disabled={uploading}
                title="Load the standard multi-protocol sample PCAP"
              >
                <Sparkles size={15} className="text-amber-400" />
                <span>Load Sample PCAP</span>
              </button>

              {activeCaptureId && (
                <a
                  href={packetService.getExportCsvUrl(activeCaptureId, filters.protocol, filters.search)}
                  download={`capture-${activeCaptureId}.csv`}
                  className="btn-ghost flex items-center gap-2 border border-slate-300 dark:border-white/10"
                  title="Download full filtered capture as CSV"
                >
                  <Download size={15} />
                  <span>Export CSV</span>
                </a>
              )}
            </div>
          </div>

          {/* Upload Drag & Drop Zone */}
          {captures.length === 0 && !loadingCaptures && (
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`card flex flex-col items-center justify-center border-2 border-dashed p-12 text-center transition ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/5'
                  : 'border-slate-300 dark:border-white/10 hover:border-cyan-500/50'
              }`}
            >
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-cyan-500/15 text-cyan-400">
                {uploading ? <RefreshCw size={28} className="animate-spin" /> : <FileUp size={28} />}
              </div>
              <h2 className="mt-4 text-lg font-semibold">
                {uploading ? 'Parsing packet capture...' : 'Drag & Drop your PCAP file here'}
              </h2>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                Supports standard Wireshark captures (<b>.pcap</b>, <b>.pcapng</b>, <b>.cap</b> up to 10 MB).
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  className="btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  Browse Files
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => handleLoadSample()}
                  disabled={uploading}
                >
                  Load Mixed Sample
                </button>
              </div>
            </div>
          )}

          {/* Active Capture Toolbar & Analytics Cards */}
          {captures.length > 0 && (
            <div className="space-y-4">
              {/* Capture Switcher Ribbon */}
              <div className="card flex flex-wrap items-center justify-between gap-3 !py-3">
                <div className="flex items-center gap-3">
                  <FolderOpen size={18} className="text-cyan-400" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Active Capture:
                    </span>
                    <select
                      className="input !w-auto !py-1 text-xs font-mono font-medium"
                      value={activeCaptureId || ''}
                      onChange={e => setActiveCaptureId(Number(e.target.value))}
                    >
                      {captures.map(c => (
                        <option key={c.id} value={c.id}>
                          #{c.id} - {c.filename} [{c.source.toUpperCase()}] ({c.packet_count} pkts, {(c.size_bytes / 1024).toFixed(1)} KB)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {activeCapture && (
                    <>
                      <span className="flex items-center gap-1 font-mono">
                        <HardDrive size={13} />
                        {(activeCapture.size_bytes / 1024).toFixed(1)} KB
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={13} />
                        {stats?.duration_seconds !== undefined
                          ? `${stats.duration_seconds.toFixed(3)}s span`
                          : '—'}
                      </span>
                      <button
                        className="btn-ghost !p-1 text-rose-400 hover:bg-rose-500/10"
                        onClick={() => activeCaptureId && handleDeleteCapture(activeCaptureId)}
                        title="Delete this capture"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Metrics */}
              {stats && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="card flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400">
                      <Network size={20} />
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">Total Packets</p>
                      <p className="font-mono text-xl font-bold text-slate-900 dark:text-white">
                        {stats.packet_count}
                      </p>
                    </div>
                  </div>

                  <div className="card flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/15 text-blue-400">
                      <BarChart3 size={20} />
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">Total Data Size</p>
                      <p className="font-mono text-xl font-bold text-slate-900 dark:text-white">
                        {(stats.total_bytes / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>

                  <div className="card flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-purple-500/15 text-purple-400">
                      <Clock size={20} />
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">Duration</p>
                      <p className="font-mono text-xl font-bold text-slate-900 dark:text-white">
                        {stats.duration_seconds.toFixed(3)} s
                      </p>
                    </div>
                  </div>

                  <div className="card flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
                      <PieIcon size={20} />
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">Protocols Detected</p>
                      <p className="font-mono text-xl font-bold text-slate-900 dark:text-white">
                        {Object.keys(stats.protocols).length}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Protocol Distribution & Top Talkers */}
              {stats && pieData.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="card">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Protocol Distribution</h3>
                      <span className="text-xs text-slate-500 font-mono">
                        {stats.packet_count} total
                      </span>
                    </div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={36}
                            outerRadius={65}
                            paddingAngle={3}
                          >
                            {pieData.map(entry => (
                              <Cell
                                key={entry.name}
                                fill={PROTOCOL_COLORS[entry.name.toUpperCase()] || '#64748b'}
                                stroke="none"
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {pieData.map(entry => (
                        <span
                          key={entry.name}
                          className="flex items-center gap-1.5 rounded bg-slate-100/50 px-2 py-1 font-mono dark:bg-navy-900/60"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor:
                                PROTOCOL_COLORS[entry.name.toUpperCase()] || '#64748b',
                            }}
                          />
                          <span className="text-slate-400">{entry.name}:</span>
                          <b className="text-slate-200">{entry.value}</b>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="card lg:col-span-2">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Top Talkers (Source IPs)</h3>
                      <span className="text-xs text-slate-500">Most active transmitting hosts</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 dark:border-white/10">
                            <th className="py-2">Source IP Address</th>
                            <th className="py-2">Packets Sent</th>
                            <th className="py-2">Traffic Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {stats.top_sources.length > 0 ? (
                            stats.top_sources.map(src => {
                              const pct = ((src.packets / stats.packet_count) * 100).toFixed(1);
                              return (
                                <tr key={src.ip}>
                                  <td className="py-2 text-cyan-400 font-semibold">{src.ip}</td>
                                  <td className="py-2">{src.packets}</td>
                                  <td className="py-2">
                                    <div className="flex items-center gap-2">
                                      <div className="h-1.5 w-24 rounded-full bg-slate-700 overflow-hidden">
                                        <div
                                          className="h-full bg-cyan-400"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      <span className="text-slate-400">{pct}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={3} className="py-4 text-center text-slate-500 font-sans">
                                No source IP information available.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Main PCAP Table */}
              <PacketTable
                packets={packets}
                total={totalPackets}
                page={filters.page || 1}
                pageSize={filters.page_size || 50}
                totalPages={totalPages}
                loading={loadingPackets}
                filters={filters}
                selectedPacketIndex={selectedPacket?.index ?? null}
                onFilterChange={newFilters => setFilters(prev => ({ ...prev, ...newFilters }))}
                onSelectPacket={handleSelectPCAPPacket}
                onResetFilters={() => {
                  setFilters({
                    page: 1,
                    page_size: filters.page_size || 50,
                    protocol: null,
                    src_ip: null,
                    dst_ip: null,
                    status: null,
                    search: null,
                    sort: 'index',
                    order: 'asc',
                  });
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Packet Inspection Modal (Shared across Live & PCAP) */}
      <PacketDetailsModal
        packet={selectedPacket}
        totalPackets={activeTab === 'live' ? livePackets.length : totalPackets}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNavigate={index => {
          if (activeTab === 'live') {
            handleSelectLivePacket(index);
          } else {
            handleSelectPCAPPacket(index);
          }
        }}
      />
    </div>
  );
}
