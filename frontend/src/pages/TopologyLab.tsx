import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FolderOpen,
  HardDrive,
  Laptop,
  Layers,
  Network,
  Plus,
  Radio,
  RefreshCw,
  Route as RouteIcon,
  Save,
  Server,
  Share2,
  Trash2,
  Wifi,
  Zap,
} from 'lucide-react';
import {
  DeviceKind,
  PREDEFINED_TEMPLATES,
  PredefinedTemplate,
  SimulationResult,
  TopologyDetail,
  TopologyLink,
  TopologyNode,
  TopologySummary,
  topologyService,
} from '../services/topologyService';
import { TopologyCanvas } from '../components/topology/TopologyCanvas';
import { DeviceConfigPanel } from '../components/topology/DeviceConfigPanel';
import { PathSimulationPanel } from '../components/topology/PathSimulationPanel';
import { toast } from '../components/Toaster';

export default function TopologyLab() {
  // Topology state
  const [nodes, setNodes] = useState<TopologyNode[]>(PREDEFINED_TEMPLATES[0].nodes);
  const [links, setLinks] = useState<TopologyLink[]>(PREDEFINED_TEMPLATES[0].links);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<TopologyLink | null>(null);

  // Active tools
  const [connectMode, setConnectMode] = useState<boolean>(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);

  // Simulation state
  const [simSourceId, setSimSourceId] = useState<string>(nodes[0]?.id || '');
  const [simTargetId, setSimTargetId] = useState<string>(nodes[nodes.length - 1]?.id || '');
  const [simProtocol, setSimProtocol] = useState<string>('ICMP');
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  // Saved topologies modal state
  const [savedList, setSavedList] = useState<TopologySummary[]>([]);
  const [showLoadModal, setShowLoadModal] = useState<boolean>(false);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>('My Custom Network');
  const [saveDesc, setSaveDesc] = useState<string>('Student lab topology');

  // Sidebar active tab
  const [activeTab, setActiveTab] = useState<'config' | 'simulation' | 'guide'>('config');

  // Fetch saved topologies on mount
  useEffect(() => {
    refreshSavedList();
  }, []);

  const refreshSavedList = async () => {
    try {
      const list = await topologyService.listTopologies();
      setSavedList(list);
    } catch (err) {
      console.warn('Could not fetch saved topologies from backend:', err);
    }
  };

  // Add a new node to canvas
  const handleAddNode = (kind: DeviceKind) => {
    const counts = nodes.filter((n) => n.kind === kind).length + 1;
    const kindPrefix = kind.slice(0, 2).toLowerCase();
    const id = `${kindPrefix}${Date.now().toString().slice(-4)}`;
    const label = `${kind.toUpperCase()} ${counts}`;

    // Place randomly near canvas center
    const x = Math.floor(250 + Math.random() * 400);
    const y = Math.floor(150 + Math.random() * 250);

    const newNode: TopologyNode = {
      id,
      label,
      kind,
      x,
      y,
      ip: kind === 'switch' || kind === 'hub' ? undefined : `192.168.1.${10 + nodes.length}`,
      mask: kind === 'switch' || kind === 'hub' ? undefined : '255.255.255.0',
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
    setSelectedLink(null);
    setActiveTab('config');
    toast(`Added ${label}`);
  };

  // Update node
  const handleUpdateNode = (updated: Partial<TopologyNode>) => {
    if (!selectedNode) return;
    const nextNode = { ...selectedNode, ...updated };
    setSelectedNode(nextNode);
    setNodes((prev) => prev.map((n) => (n.id === nextNode.id ? nextNode : n)));
  };

  // Delete node
  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    // Also remove attached links
    setLinks((prev) => prev.filter((l) => l.source !== id && l.target !== id));
    if (selectedNode?.id === id) setSelectedNode(null);
    if (connectSourceId === id) setConnectSourceId(null);
    if (simSourceId === id) setSimSourceId('');
    if (simTargetId === id) setSimTargetId('');
    toast('Device removed');
  };

  // Move node on canvas
  const handleMoveNode = (id: string, x: number, y: number) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
    if (selectedNode?.id === id) {
      setSelectedNode((prev) => (prev ? { ...prev, x, y } : null));
    }
  };

  // Connect click handler
  const handleNodeClick = (nodeId: string) => {
    if (!connectMode) {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
        setSelectedLink(null);
        setActiveTab('config');
      }
      return;
    }

    if (!connectSourceId) {
      setConnectSourceId(nodeId);
      toast('First device selected. Now click destination device.');
    } else {
      if (connectSourceId === nodeId) {
        toast('Cannot connect a device to itself.');
        return;
      }

      // Check if link already exists
      const exists = links.some(
        (l) =>
          (l.source === connectSourceId && l.target === nodeId) ||
          (l.source === nodeId && l.target === connectSourceId)
      );

      if (exists) {
        toast('A link already exists between these two devices.');
      } else {
        const newLink: TopologyLink = {
          source: connectSourceId,
          target: nodeId,
          latency_ms: 1.0,
          loss_pct: 0.0,
          status: 'up',
        };
        setLinks((prev) => [...prev, newLink]);
        setSelectedLink(newLink);
        setSelectedNode(null);
        setActiveTab('config');
        toast('Connection created!');
      }

      setConnectSourceId(null);
      setConnectMode(false);
    }
  };

  // Update link
  const handleUpdateLink = (updated: Partial<TopologyLink>) => {
    if (!selectedLink) return;
    const nextLink = { ...selectedLink, ...updated };
    setSelectedLink(nextLink);
    setLinks((prev) =>
      prev.map((l) =>
        (l.source === selectedLink.source && l.target === selectedLink.target) ||
        (l.source === selectedLink.target && l.target === selectedLink.source)
          ? nextLink
          : l
      )
    );
  };

  // Delete link
  const handleDeleteLink = (source: string, target: string) => {
    setLinks((prev) =>
      prev.filter(
        (l) =>
          !(
            (l.source === source && l.target === target) ||
            (l.source === target && l.target === source)
          )
      )
    );
    setSelectedLink(null);
    toast('Connection removed');
  };

  // Load template
  const handleLoadTemplate = (template: PredefinedTemplate) => {
    setNodes(template.nodes.map((n) => ({ ...n })));
    setLinks(template.links.map((l) => ({ ...l })));
    setSelectedNode(null);
    setSelectedLink(null);
    setSimResult(null);
    if (template.nodes.length >= 2) {
      setSimSourceId(template.nodes[0].id);
      setSimTargetId(template.nodes[template.nodes.length - 1].id);
    }
    toast(`Loaded "${template.name}" template`);
  };

  // Run path simulation
  const handleRunSimulation = async () => {
    if (!simSourceId || !simTargetId) {
      toast('Select both a source and destination device.');
      return;
    }
    if (simSourceId === simTargetId) {
      toast('Source and destination devices must be distinct.');
      return;
    }

    setSimLoading(true);
    try {
      const result = await topologyService.simulateStateless(
        nodes,
        links,
        simSourceId,
        simTargetId,
        64,
        simProtocol
      );
      setSimResult(result);
      if (result.delivered) {
        toast(
          `Ping successful! ${result.hops.length} hops, ${result.total_latency_ms?.toFixed(1)} ms total.`
        );
      } else {
        toast(`Packet dropped: ${result.reason}`);
      }
    } catch (err) {
      toast(`Simulation failed: ${(err as Error).message}`);
    } finally {
      setSimLoading(false);
    }
  };

  // Save topology to backend
  const handleSaveTopology = async () => {
    if (!saveName.trim()) {
      toast('Topology name cannot be empty');
      return;
    }
    try {
      const saved = await topologyService.createTopology(saveName, saveDesc, nodes, links);
      toast(`Saved "${saved.name}" to database!`);
      setShowSaveModal(false);
      refreshSavedList();
    } catch (err) {
      toast(`Save failed: ${(err as Error).message}`);
    }
  };

  // Load topology from backend
  const handleLoadSavedTopology = async (id: number) => {
    try {
      const detail = await topologyService.getTopology(id);
      setNodes(detail.nodes || []);
      setLinks(detail.links || []);
      setSelectedNode(null);
      setSelectedLink(null);
      setSimResult(null);
      setShowLoadModal(false);
      toast(`Loaded "${detail.name}"`);
    } catch (err) {
      toast(`Load failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Header */}
      <div className="card flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Network className="text-cyan-400" size={24} />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Network Topology Lab
            </h1>
            <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
              Interactive Canvas
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Design Layer 2/3 network architectures, drag devices, toggle link failures, and test hop-by-hop packet routing.
          </p>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Predefined Templates Dropdown */}
          <div className="relative inline-block text-left">
            <select
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-cyan-500 cursor-pointer font-medium"
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                if (!isNaN(idx) && PREDEFINED_TEMPLATES[idx]) {
                  handleLoadTemplate(PREDEFINED_TEMPLATES[idx]);
                }
              }}
              defaultValue="0"
            >
              {PREDEFINED_TEMPLATES.map((tmpl, idx) => (
                <option key={tmpl.name} value={idx}>
                  📐 {tmpl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Connect Mode Toggle */}
          <button
            onClick={() => {
              setConnectMode(!connectMode);
              setConnectSourceId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              connectMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <RouteIcon size={14} />
            {connectMode ? 'Connecting Mode (Active)' : 'Connect Devices'}
          </button>

          {/* Load Modal Trigger */}
          <button
            onClick={() => {
              refreshSavedList();
              setShowLoadModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            <FolderOpen size={14} />
            Load Saved
          </button>

          {/* Save Modal Trigger */}
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-colors"
          >
            <Save size={14} />
            Save Topology
          </button>

          {/* Clear Canvas */}
          <button
            onClick={() => {
              if (window.confirm('Clear all devices and links from canvas?')) {
                setNodes([]);
                setLinks([]);
                setSelectedNode(null);
                setSelectedLink(null);
                setSimResult(null);
                toast('Canvas cleared');
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-950/40 text-red-400 border border-red-900/40 hover:bg-red-900/30 transition-colors"
            title="Clear Canvas"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Grid: Left is Palette + Canvas; Right is Inspector / Simulation / Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Canvas & Device Add Palette */}
        <div className="lg:col-span-8 space-y-3">
          {/* Quick Palette Bar */}
          <div className="card py-2 px-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Plus size={14} className="text-cyan-400" />
              Add Device:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleAddNode('pc')}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/20 text-xs font-medium transition-colors"
              >
                <Laptop size={13} /> PC / Host
              </button>
              <button
                onClick={() => handleAddNode('server')}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-400 border border-purple-500/20 text-xs font-medium transition-colors"
              >
                <Server size={13} /> Server
              </button>
              <button
                onClick={() => handleAddNode('router')}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/20 text-xs font-medium transition-colors"
              >
                <Radio size={13} /> Router (L3)
              </button>
              <button
                onClick={() => handleAddNode('switch')}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 text-xs font-medium transition-colors"
              >
                <Network size={13} /> Switch (L2)
              </button>
              <button
                onClick={() => handleAddNode('hub')}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors"
              >
                <Share2 size={13} /> Hub (L1)
              </button>
            </div>

            <span className="text-[11px] text-slate-500 font-mono">
              {nodes.length} nodes · {links.length} links
            </span>
          </div>

          {/* SVG Canvas */}
          <TopologyCanvas
            nodes={nodes}
            links={links}
            selectedNode={selectedNode}
            selectedLink={selectedLink}
            activePath={simResult?.path || []}
            connectMode={connectMode}
            connectSourceId={connectSourceId}
            onSelectNode={(node) => {
              setSelectedNode(node);
              if (node) {
                setSelectedLink(null);
                setActiveTab('config');
              }
            }}
            onSelectLink={(link) => {
              setSelectedLink(link);
              if (link) {
                setSelectedNode(null);
                setActiveTab('config');
              }
            }}
            onMoveNode={handleMoveNode}
            onNodeClick={handleNodeClick}
            onCancelConnect={() => {
              setConnectMode(false);
              setConnectSourceId(null);
            }}
          />

          {/* Notice Banner */}
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-2.5 text-xs text-cyan-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap size={14} className="text-cyan-400 shrink-0" />
              Tip: Drag any device to reposition it. Click "Connect Devices" and select two devices to link them.
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider opacity-70">
              VIRTUAL SIMULATION
            </span>
          </div>
        </div>

        {/* Right Column: Multi-tab Side Panel */}
        <div className="lg:col-span-4 space-y-3">
          {/* Side Panel Tabs Header */}
          <div className="flex border-b border-slate-800 bg-slate-900/60 rounded-t-lg p-1">
            <button
              onClick={() => setActiveTab('config')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'config'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HardDrive size={13} />
              Inspector
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'simulation'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <RouteIcon size={13} />
              Ping & Path
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'guide'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen size={13} />
              Device Guide
            </button>
          </div>

          {/* Tab 1: Inspector & Device / Link Config */}
          {activeTab === 'config' && (
            <DeviceConfigPanel
              selectedNode={selectedNode}
              selectedLink={selectedLink}
              allNodes={nodes}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              onUpdateLink={handleUpdateLink}
              onDeleteLink={handleDeleteLink}
            />
          )}

          {/* Tab 2: Path & Ping Tester */}
          {activeTab === 'simulation' && (
            <PathSimulationPanel
              nodes={nodes}
              sourceId={simSourceId}
              targetId={simTargetId}
              protocol={simProtocol}
              loading={simLoading}
              result={simResult}
              onSelectSource={setSimSourceId}
              onSelectTarget={setSimTargetId}
              onSelectProtocol={setSimProtocol}
              onRunSimulation={handleRunSimulation}
            />
          )}

          {/* Tab 3: Educational Device Reference */}
          {activeTab === 'guide' && (
            <div className="card space-y-3 text-xs">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-cyan-400" />
                  DCN Networking Hardware Guide
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Understanding OSI layer roles and device characteristics.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="rounded-md border border-sky-500/20 bg-sky-950/20 p-2">
                  <div className="flex items-center gap-1.5 font-semibold text-sky-400">
                    <Laptop size={13} /> Host / PC & Server (End Systems)
                  </div>
                  <p className="text-slate-300 mt-1 text-[11px]">
                    Operate up to Layer 7 (Application). Require an IP address, Subnet Mask, and Default Gateway to communicate outside their local broadcast domain.
                  </p>
                </div>

                <div className="rounded-md border border-amber-500/20 bg-amber-950/20 p-2">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                    <Network size={13} /> Network Switch (Layer 2)
                  </div>
                  <p className="text-slate-300 mt-1 text-[11px]">
                    Maintains a MAC address table. Forwards frames only to the designated port (micro-segmentation), separating collision domains while preserving a single broadcast domain.
                  </p>
                </div>

                <div className="rounded-md border border-rose-500/20 bg-rose-950/20 p-2">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                    <Share2 size={13} /> Repeater Hub (Layer 1)
                  </div>
                  <p className="text-slate-300 mt-1 text-[11px]">
                    Physical layer multi-port repeater. Does not inspect frames; blindly broadcasts bits to all connected ports, sharing one collision domain.
                  </p>
                </div>

                <div className="rounded-md border border-emerald-500/20 bg-emerald-950/20 p-2">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <Radio size={13} /> Network Router (Layer 3)
                  </div>
                  <p className="text-slate-300 mt-1 text-[11px]">
                    Interconnects distinct subnets and networks. Inspects IP packet headers, looks up routing tables (Dijkstra/OSPF/BGP), decrements TTL, and segments broadcast domains.
                  </p>
                </div>

                <div className="rounded-md border border-purple-500/20 bg-purple-950/20 p-2">
                  <div className="flex items-center gap-1.5 font-semibold text-purple-400">
                    <RouteIcon size={13} /> Shortest Path Routing (Dijkstra)
                  </div>
                  <p className="text-slate-300 mt-1 text-[11px]">
                    NetLab uses Dijkstra’s algorithm to evaluate lowest cumulative latency between devices. When a link state is toggled to <span className="text-red-400 font-mono">DOWN</span>, the graph dynamically re-routes traffic through alternate hops or flags an isolated partition!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="card w-full max-w-md space-y-4 border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Save size={18} className="text-cyan-400" /> Save Network Topology
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Topology Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:ring-1 focus:ring-cyan-500"
                  placeholder="e.g. Branch Office Setup"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200 focus:ring-1 focus:ring-cyan-500"
                  placeholder="e.g. Dual router topology with failover link"
                />
              </div>
              <div className="rounded bg-slate-800/80 p-2 text-slate-400 font-mono text-[11px]">
                Nodes: {nodes.length} | Links: {links.length}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTopology}
                className="px-4 py-1.5 rounded-md text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="card w-full max-w-lg space-y-4 border-slate-700 bg-slate-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FolderOpen size={18} className="text-cyan-400" /> Saved Topologies
              </h3>
              <button
                onClick={() => setShowLoadModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {savedList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No saved topologies found in database.
                </div>
              ) : (
                savedList.map((top) => (
                  <div
                    key={top.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">{top.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {top.description || 'No description'}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1 font-mono">
                        Updated: {new Date(top.updated_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoadSavedTopology(top.id)}
                        className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
                      >
                        Load
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Delete topology "${top.name}"?`)) {
                            try {
                              await topologyService.deleteTopology(top.id);
                              toast('Topology deleted');
                              refreshSavedList();
                            } catch (e) {
                              toast((e as Error).message);
                            }
                          }
                        }}
                        className="p-1 rounded text-red-400 hover:bg-red-950/40"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowLoadModal(false)}
                className="px-4 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
