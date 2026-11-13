import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  HardDrive,
  Laptop,
  Network,
  Radio,
  Server,
  Share2,
  WifiOff,
  Zap,
} from 'lucide-react';
import { DeviceKind, TopologyLink, TopologyNode } from '../../services/topologyService';

interface TopologyCanvasProps {
  nodes: TopologyNode[];
  links: TopologyLink[];
  selectedNode: TopologyNode | null;
  selectedLink: TopologyLink | null;
  activePath: string[]; // Node IDs in sequence along the simulated path
  connectMode: boolean;
  connectSourceId: string | null;
  onSelectNode: (node: TopologyNode | null) => void;
  onSelectLink: (link: TopologyLink | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
  onNodeClick: (nodeId: string) => void;
  onCancelConnect: () => void;
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  nodes,
  links,
  selectedNode,
  selectedLink,
  activePath,
  connectMode,
  connectSourceId,
  onSelectNode,
  onSelectLink,
  onMoveNode,
  onNodeClick,
  onCancelConnect,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const getSvgCoordinates = useCallback(
    (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const CTM = svgRef.current.getScreenCTM();
      if (!CTM) return { x: 0, y: 0 };
      return {
        x: Math.round((e.clientX - CTM.e) / CTM.a),
        y: Math.round((e.clientY - CTM.f) / CTM.d),
      };
    },
    []
  );

  const handleMouseDownNode = (e: React.MouseEvent, node: TopologyNode) => {
    if (connectMode) {
      e.stopPropagation();
      onNodeClick(node.id);
      return;
    }
    e.stopPropagation();
    onSelectNode(node);
    onSelectLink(null);
    const coords = getSvgCoordinates(e);
    setDraggingNodeId(node.id);
    setDragOffset({
      x: coords.x - node.x,
      y: coords.y - node.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!svgRef.current) return;
      const coords = getSvgCoordinates(e);

      if (connectMode) {
        setMousePos(coords);
      }

      if (draggingNodeId) {
        const clampedX = Math.max(40, Math.min(940, coords.x - dragOffset.x));
        const clampedY = Math.max(40, Math.min(560, coords.y - dragOffset.y));
        onMoveNode(draggingNodeId, clampedX, clampedY);
      }
    },
    [draggingNodeId, dragOffset, connectMode, getSvgCoordinates, onMoveNode]
  );

  const handleMouseUp = useCallback(() => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
  }, [draggingNodeId]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'rect') {
      onSelectNode(null);
      onSelectLink(null);
      if (connectMode) {
        onCancelConnect();
      }
    }
  };

  const nodeMap = new Map<string, TopologyNode>(nodes.map((n) => [n.id, n]));

  // Check if link is part of active path
  const isLinkInActivePath = (source: string, target: string) => {
    if (activePath.length < 2) return false;
    for (let i = 0; i < activePath.length - 1; i++) {
      if (
        (activePath[i] === source && activePath[i + 1] === target) ||
        (activePath[i] === target && activePath[i + 1] === source)
      ) {
        return true;
      }
    }
    return false;
  };

  const isLinkSelected = (link: TopologyLink) => {
    if (!selectedLink) return false;
    return (
      (selectedLink.source === link.source && selectedLink.target === link.target) ||
      (selectedLink.source === link.target && selectedLink.target === link.source)
    );
  };

  const getNodeIcon = (kind: DeviceKind) => {
    switch (kind) {
      case 'router':
        return <Radio size={18} className="text-emerald-400" />;
      case 'switch':
        return <Network size={18} className="text-amber-400" />;
      case 'server':
        return <Server size={18} className="text-purple-400" />;
      case 'hub':
        return <Share2 size={18} className="text-rose-400" />;
      case 'pc':
      default:
        return <Laptop size={18} className="text-cyan-400" />;
    }
  };

  const getNodeColorBorder = (kind: DeviceKind, isSelected: boolean, isPathNode: boolean) => {
    if (isSelected) return 'stroke-cyan-400 stroke-[2.5]';
    if (isPathNode) return 'stroke-emerald-400 stroke-2';
    switch (kind) {
      case 'router':
        return 'stroke-emerald-500/50';
      case 'switch':
        return 'stroke-amber-500/50';
      case 'server':
        return 'stroke-purple-500/50';
      case 'hub':
        return 'stroke-rose-500/50';
      case 'pc':
      default:
        return 'stroke-sky-500/50';
    }
  };

  const connectSourceNode = connectSourceId ? nodeMap.get(connectSourceId) : null;

  return (
    <div className="relative w-full h-[580px] bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden select-none shadow-inner">
      {/* Visual background grid pattern */}
      <svg
        ref={svgRef}
        viewBox="0 0 980 580"
        className="w-full h-full cursor-default"
        onClick={handleCanvasClick}
      >
        <defs>
          <pattern id="grid-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#334155" opacity="0.35" />
          </pattern>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Grid */}
        <rect width="100%" height="100%" fill="url(#grid-dots)" />

        {/* Connect Mode In-progress Rubber-band Line */}
        {connectMode && connectSourceNode && mousePos && (
          <line
            x1={connectSourceNode.x}
            y1={connectSourceNode.y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="#22d3ee"
            strokeWidth="2"
            strokeDasharray="4,4"
            className="animate-pulse pointer-events-none"
          />
        )}

        {/* Links */}
        <g className="links-group">
          {links.map((link, idx) => {
            const src = nodeMap.get(link.source);
            const dst = nodeMap.get(link.target);
            if (!src || !dst) return null;

            const isPath = isLinkInActivePath(link.source, link.target);
            const isSelected = isLinkSelected(link);
            const isDown = link.status === 'down';

            const midX = (src.x + dst.x) / 2;
            const midY = (src.y + dst.y) / 2;

            let strokeColor = '#475569';
            let strokeWidth = 2;
            let strokeDash = undefined;

            if (isDown) {
              strokeColor = '#ef4444';
              strokeDash = '6,4';
              strokeWidth = 2;
            } else if (isPath) {
              strokeColor = '#10b981';
              strokeWidth = 3.5;
            } else if (isSelected) {
              strokeColor = '#38bdf8';
              strokeWidth = 3;
            }

            return (
              <g
                key={`link-${link.source}-${link.target}-${idx}`}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLink(link);
                  onSelectNode(null);
                }}
              >
                {/* Hitbox line for easy clicking */}
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={dst.x}
                  y2={dst.y}
                  stroke="transparent"
                  strokeWidth="16"
                />

                {/* Visible link line */}
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={dst.x}
                  y2={dst.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDash}
                  className="transition-all duration-200 group-hover:stroke-sky-400"
                  filter={isPath ? 'url(#glow-emerald)' : undefined}
                />

                {/* Midpoint metric badge */}
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-28"
                    y="-10"
                    width="56"
                    height="20"
                    rx="4"
                    fill={isDown ? '#7f1d1d' : isPath ? '#064e3b' : '#0f172a'}
                    stroke={isDown ? '#ef4444' : isPath ? '#10b981' : isSelected ? '#38bdf8' : '#334155'}
                    strokeWidth="1"
                    className="shadow-sm"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill={isDown ? '#fca5a5' : isPath ? '#6ee7b7' : '#94a3b8'}
                    fontSize="9"
                    fontFamily="monospace"
                    className="font-medium pointer-events-none"
                  >
                    {isDown ? 'DOWN' : `${link.latency_ms}ms`}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* Nodes */}
        <g className="nodes-group">
          {nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isConnectSource = connectSourceId === node.id;
            const isPathNode = activePath.includes(node.id);
            const pathIndex = activePath.indexOf(node.id);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-move group"
                onMouseDown={(e) => handleMouseDownNode(e, node)}
              >
                {/* Node Halo for selected or path */}
                {isSelected && (
                  <circle
                    r="32"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                    className="animate-spin-slow"
                  />
                )}
                {isConnectSource && (
                  <circle
                    r="34"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                )}

                {/* Node Outer Circle */}
                <circle
                  r="24"
                  fill="#0f172a"
                  className={`transition-colors duration-200 ${getNodeColorBorder(
                    node.kind,
                    isSelected,
                    isPathNode
                  )}`}
                  filter={isPathNode ? 'url(#glow-emerald)' : undefined}
                />

                {/* Foreign Object for Lucide Icon */}
                <foreignObject x="-12" y="-12" width="24" height="24" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center">
                    {getNodeIcon(node.kind)}
                  </div>
                </foreignObject>

                {/* Path sequence badge if node is along the active path */}
                {isPathNode && (
                  <g transform="translate(14, -18)">
                    <circle r="9" fill="#10b981" />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#042f2e"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {pathIndex + 1}
                    </text>
                  </g>
                )}

                {/* Node Label */}
                <text
                  x="0"
                  y="36"
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="11"
                  fontWeight="600"
                  className="pointer-events-none drop-shadow-sm"
                >
                  {node.label}
                </text>

                {/* Node IP Badge (if configured) */}
                {node.ip && (
                  <text
                    x="0"
                    y="48"
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize="9"
                    fontFamily="monospace"
                    className="pointer-events-none opacity-90"
                  >
                    {node.ip}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Connect mode banner overlay */}
      {connectMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500/90 text-slate-950 font-medium text-xs px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 backdrop-blur">
          <span className="inline-block w-2 h-2 rounded-full bg-slate-950 animate-ping" />
          {connectSourceId ? (
            <span>Click the destination device to create connection (or click canvas to cancel)</span>
          ) : (
            <span>Click the first device to connect</span>
          )}
          <button
            onClick={onCancelConnect}
            className="ml-2 underline text-[10px] uppercase font-bold hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Canvas Empty State Prompt */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none">
          <Network size={40} className="mb-3 opacity-40 text-cyan-400" />
          <p className="text-sm font-semibold text-slate-300">Workspace is empty</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
            Click a device button above to place nodes, or pick a Predefined Template from the dropdown.
          </p>
        </div>
      )}

      {/* Legend Footer */}
      <div className="absolute bottom-2 left-3 flex items-center gap-4 text-[10px] text-slate-400 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-md border border-slate-800">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> PC
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" /> Server
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Router
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Switch
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" /> Hub
        </span>
        <span className="text-slate-600">|</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Active Path
        </span>
        <span className="flex items-center gap-1 text-red-400">
          <span className="w-3 h-0.5 border-b border-dashed border-red-400 inline-block" /> Down Link
        </span>
      </div>
    </div>
  );
};
