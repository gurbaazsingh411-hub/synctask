import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/contexts/SupabaseContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { CanvasControls } from '@/components/CanvasControls';

interface CanvasNode {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  parentId: string | null;
  expanded: boolean;
  status: 'not_started' | 'in_progress' | 'done';
  checklist: { id: string; title: string; completed: boolean }[];
}

interface CanvasData {
  id: string;
  eventId: string;
  nodes: CanvasNode[];
  createdAt: string;
  updatedAt: string;
}

interface PresenceState {
  user: string;
  email: string;
  color: string;
  cursor?: { x: number; y: number };
}

export default function CanvasPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, signOut } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [presence, setPresence] = useState<Record<string, PresenceState>>({});
  const [eventName, setEventName] = useState<string>('');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean }>({ x: 0, y: 0, visible: false });

  const canvasRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const selectedNode = canvasData?.nodes.find(n => n.id === selectedNodeId) || null;

  // Initialize canvas data and event details
  useEffect(() => {
    if (!id || !user) return;

    const initCanvas = async () => {
      try {
        setLoading(true);

        // Fetch event name for breadcrumbs
        const event = await api.events.getById(id as string);
        if (event) setEventName(event.name);

        // Try to get existing canvas data from Supabase
        let existingCanvas = await api.canvas.getByEvent(id as string);

        if (!existingCanvas) {
          const initialNodes = [{
            id: `node_root_${id}`,
            title: event?.name || `Event: ${id as string}`,
            description: 'Root node for the event',
            x: 400,
            y: 300,
            parentId: null,
            expanded: true,
            status: 'not_started' as const,
            checklist: [],
          }];

          existingCanvas = await api.canvas.create(id as string, initialNodes);
        }

        const formattedCanvas: CanvasData = {
          id: existingCanvas.id,
          eventId: existingCanvas.event_id,
          createdAt: existingCanvas.created_at,
          updatedAt: existingCanvas.updated_at,
          nodes: existingCanvas.nodes.nodes || [],
        };

        setCanvasData(formattedCanvas);
        setInitialLoadComplete(true);
      } catch (error) {
        console.error('Error initializing canvas:', error);
      } finally {
        setLoading(false);
      }
    };

    initCanvas();
  }, [id, user]);

  // Real-time subscription and Presence
  useEffect(() => {
    if (!id || !initialLoadComplete || !user) return;

    const colors = ['#f87171', '#fb923c', '#fbbf24', '#4ade80', '#22d3ee', '#818cf8', '#c084fc', '#f472b6'];
    const myColor = colors[Math.floor(Math.random() * colors.length)];

    const channel = supabase.channel(`canvas-${id}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas',
          filter: `event_id=eq.${id}`,
        },
        (payload: any) => {
          // Only update if we are not the ones dragging
          if (payload.new && !saveTimeoutRef.current) {
            setCanvasData(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                nodes: payload.new.nodes.nodes || [],
                updatedAt: payload.new.updated_at,
              };
            });
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const formattedPresence: Record<string, PresenceState> = {};
        Object.keys(state).forEach((key) => {
          const presenceEntry = state[key][0] as any;
          if (presenceEntry) {
            formattedPresence[key] = presenceEntry;
          }
        });
        setPresence(formattedPresence);
      })
      .on('broadcast', { event: 'cursor' }, (payload) => {
        if (payload.payload.userId !== user.id) {
          setPresence(prev => {
            const current = prev[payload.payload.userId];
            if (!current) return prev;
            // Only update if cursor actually moved significantly to save renders
            return {
              ...prev,
              [payload.payload.userId]: {
                ...current,
                cursor: payload.payload.cursor
              }
            };
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user: user.id,
            email: user.email || 'Anonymous',
            color: myColor,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [id, initialLoadComplete, user]); // Removed draggingNode to prevent recreation loop

  const debouncedSave = useCallback((nodes: CanvasNode[]) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!id) return;
      try {
        await api.canvas.updateByEvent(id as string, nodes);
      } catch (err: any) {
        // Supabase returns 406 if the data is identical, which is fine.
        // Only log other errors.
        if (err.code !== '406') {
          console.error('Failed to save canvas:', err);
        }
      } finally {
        saveTimeoutRef.current = null;
      }
    }, 1000);
  }, [id]);

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = canvasData?.nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNodeId(nodeId);
      setDraggingNode(nodeId);
      setDragOffset({
        x: e.clientX / scale - node.x,
        y: e.clientY / scale - node.y
      });
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setContextMenu({ ...contextMenu, visible: false });
    if (e.button === 0) { // Left click
      setSelectedNodeId(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true
    });
  };

  const handleAddIndependentNode = async () => {
    if (!canvasData) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    const mouseX = contextMenu.x - (rect?.left || 0);
    const mouseY = contextMenu.y - (rect?.top || 0);

    const newNode: CanvasNode = {
      id: `node_ind_${Date.now()}`,
      title: 'New Note',
      description: '',
      x: (mouseX - offset.x) / scale,
      y: (mouseY - offset.y) / scale,
      parentId: null,
      expanded: true,
      status: 'not_started',
      checklist: []
    };

    const updatedNodes = [...canvasData.nodes, newNode];
    setCanvasData({ ...canvasData, nodes: updatedNodes });
    await api.canvas.updateByEvent(canvasData.eventId, updatedNodes);
    setSelectedNodeId(newNode.id);
    setContextMenu({ ...contextMenu, visible: false });
  };

  // Throttle cursor broadcast
  const lastBroadcastRef = useRef<number>(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNode && canvasData) {
      const updatedNodes = canvasData.nodes.map(node => {
        if (node.id === draggingNode) {
          return {
            ...node,
            x: e.clientX / scale - dragOffset.x,
            y: e.clientY / scale - dragOffset.y
          };
        }
        return node;
      });

      setCanvasData({ ...canvasData, nodes: updatedNodes });
      debouncedSave(updatedNodes);
    } else if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }

    // Broadcast cursor position with throttling (every 50ms)
    const now = Date.now();
    if (channelRef.current && user && id && now - lastBroadcastRef.current > 50) {
      lastBroadcastRef.current = now;
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          userId: user.id,
          cursor: {
            x: (e.clientX - offset.x) / scale,
            y: (e.clientY - offset.y) / scale
          }
        }
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
    setIsPanning(false);
  };

  // Fix: Use native event listener for wheel to avoid "passive" error
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = 0.1;
      const delta = e.deltaY < 0 ? 1 + scaleFactor : 1 - scaleFactor;

      setScale(s => {
        const newScale = Math.min(Math.max(s * delta, 0.2), 2);

        // Offset also needs to update based on mouse position
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setOffset(prev => {
          const newOffsetX = mouseX - (mouseX - prev.x) * (newScale / s);
          const newOffsetY = mouseY - (mouseY - prev.y) * (newScale / s);
          return { x: newOffsetX, y: newOffsetY };
        });

        return newScale;
      });
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  const handleCenter = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleUpdateNode = async (updatedNode: CanvasNode) => {
    if (!canvasData) return;
    const updatedNodes = canvasData.nodes.map(n => n.id === updatedNode.id ? updatedNode : n);
    setCanvasData({ ...canvasData, nodes: updatedNodes });
    await api.canvas.updateByEvent(canvasData.eventId, updatedNodes);
  };

  const handleAddChild = async (parentId: string) => {
    if (!canvasData) return;
    const parent = canvasData.nodes.find(n => n.id === parentId);
    if (!parent) return;

    const newNode: CanvasNode = {
      id: `node_${Date.now()}`,
      title: 'New Idea',
      description: '',
      x: parent.x + 250,
      y: parent.y + (Math.random() * 100 - 50),
      parentId: parentId,
      expanded: true,
      status: 'not_started',
      checklist: []
    };

    const updatedNodes = [...canvasData.nodes, newNode];
    setCanvasData({ ...canvasData, nodes: updatedNodes });
    await api.canvas.updateByEvent(canvasData.eventId, updatedNodes);
    setSelectedNodeId(newNode.id);
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!canvasData) return;
    // Don't delete root
    if (canvasData.nodes.find(n => n.id === nodeId)?.parentId === null) return;

    const toDelete = new Set([nodeId]);
    // Also delete children (recursive)
    const findChildren = (pid: string) => {
      canvasData.nodes.forEach(n => {
        if (n.parentId === pid) {
          toDelete.add(n.id);
          findChildren(n.id);
        }
      });
    };
    findChildren(nodeId);

    const updatedNodes = canvasData.nodes.filter(n => !toDelete.has(n.id));
    setCanvasData({ ...canvasData, nodes: updatedNodes });
    await api.canvas.updateByEvent(canvasData.eventId, updatedNodes);
    setSelectedNodeId(null);
  };

  const getConnectorPath = (start: { x: number, y: number }, end: { x: number, y: number }) => {
    const dx = end.x - start.x;
    const curvature = Math.abs(dx) * 0.5;
    return `M ${start.x} ${start.y} C ${start.x + curvature} ${start.y}, ${end.x - curvature} ${end.y}, ${end.x} ${end.y}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-gray-400 font-medium animate-pulse">Entering Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-gray-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Premium Header */}
      <header className="h-16 flex justify-between items-center px-6 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 cursor-pointer hover:text-gray-300 transition-colors" onClick={() => router.push('/dashboard')}>Dashboard</span>
            <span className="text-gray-700">/</span>
            <span className="text-gray-500 cursor-pointer hover:text-gray-300 transition-colors" onClick={() => router.push(`/events/${id}`)}>{eventName}</span>
            <span className="text-gray-700">/</span>
            <span className="text-white font-medium">Canvas</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex -space-x-2">
            {Object.values(presence).map((p, i) => {
              if (!p.email) return null;
              return (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                  style={{ backgroundColor: p.color || '#374151' }}
                  title={p.email}
                >
                  {p.email.charAt(0).toUpperCase()}
                </div>
              );
            })}
          </div>
          <button
            onClick={() => router.push(`/events/${id}`)}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            Exit Canvas
          </button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden"
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        {/* Grid Background */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
            transformOrigin: '0 0'
          }}
        />

        {/* Collaborative Cursors */}
        {Object.entries(presence).map(([userId, p]) => (
          userId !== user?.id && p.cursor && p.email && (
            <motion.div
              key={userId}
              className="absolute pointer-events-none z-40"
              animate={{ x: p.cursor.x * scale + offset.x, y: p.cursor.y * scale + offset.y }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5.65376 12.3155L15.2459 3.63376C15.9791 2.96914 17.1432 3.48911 17.1432 4.47953V18.232C17.1432 19.3366 15.8087 19.889 15.027 19.1072L5.65376 12.3155Z" fill={p.color || '#374151'} stroke="white" strokeWidth="1.5" />
              </svg>
              <div
                className="ml-4 px-2 py-1 rounded text-[10px] font-bold text-white shadow-xl whitespace-nowrap"
                style={{ backgroundColor: p.color || '#374151' }}
              >
                {p.email.split('@')[0]}
              </div>
            </motion.div>
          )
        ))}

        {/* Connections Layer */}
        <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible">
          <g style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
            {canvasData?.nodes.map(node => {
              if (!node.parentId) return null;
              const parent = canvasData.nodes.find(n => n.id === node.parentId);
              // Draw connection if both nodes exist (removed visibility check based on parent expanded state)
              if (!parent) return null;

              const strokeColor = node.status === 'done' ? 'rgba(34, 197, 94, 0.4)' :
                node.status === 'in_progress' ? 'rgba(245, 158, 11, 0.4)' :
                  'rgba(99, 102, 241, 0.2)';

              return (
                <motion.path
                  key={`edge-${node.id}`}
                  d={getConnectorPath({ x: parent.x + 180, y: parent.y + 24 }, { x: node.x, y: node.y + 24 })}
                  stroke={strokeColor}
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                />
              );
            })}
          </g>
        </svg>

        {/* Nodes Layer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}
        >
          {canvasData?.nodes.map((node) => {
            // Nodes are no longer hidden based on parent's expanded state

            return (
              <motion.div
                key={node.id}
                className={`absolute pointer-events-auto bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl transition-all duration-300 ${selectedNodeId === node.id
                  ? 'ring-2 ring-indigo-500/50 border-indigo-500/50 shadow-indigo-500/20'
                  : 'hover:border-white/20'
                  }`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: '220px',
                  cursor: draggingNode === node.id ? 'grabbing' : 'grab',
                  zIndex: 10,
                  opacity: 1,
                  display: 'block'
                }}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
              >
                <div className="flex justify-between items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${node.status === 'done' ? 'bg-green-500' :
                      node.status === 'in_progress' ? 'bg-amber-500' : 'bg-gray-500'
                      }`} />
                    <h3 className="text-sm font-semibold truncate text-white/90">{node.title}</h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateNode({ ...node, expanded: !node.expanded });
                    }}
                    className="p-1 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
                  >
                    <svg className={`w-4 h-4 transition-transform duration-300 ${node.expanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {node.checklist.length > 0 && (
                  <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${(node.checklist.filter(i => i.completed).length / node.checklist.length) * 100}%` }}
                    />
                  </div>
                )}

                {node.expanded && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                      {node.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddChild(node.id); }}
                      className="text-[10px] bg-white/5 hover:bg-white/10 text-indigo-400 px-2 py-1 rounded-md transition-colors"
                    >
                      + Branch
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Node Details Side Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-24 bottom-8 right-8 w-96 bg-[#111111]/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl flex flex-col z-[60] overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/10 p-2 rounded-xl">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold">Node Details</h2>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Title Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Title</label>
                  <div className="flex items-center gap-1">
                    {['not_started', 'in_progress', 'done'].map(s => (
                      <button
                        key={s}
                        onClick={() => handleUpdateNode({ ...selectedNode, status: s as any })}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${selectedNode.status === s
                          ? s === 'done' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : s === 'in_progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : 'bg-white/5 text-gray-600 hover:text-gray-400'
                          }`}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => handleUpdateNode({ ...selectedNode, title: e.target.value })}
                  className="w-full bg-white/5 text-xl font-bold text-white px-4 py-3 rounded-2xl border border-white/5 focus:border-indigo-500/50 outline-none transition-all"
                  placeholder="Task Name"
                />
              </div>

              {/* Description Section */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Notes</label>
                <textarea
                  value={selectedNode.description}
                  onChange={(e) => handleUpdateNode({ ...selectedNode, description: e.target.value })}
                  className="w-full bg-white/5 text-gray-300 px-4 py-3 rounded-2xl border border-white/5 focus:border-indigo-500/50 outline-none transition-all min-h-[120px] text-sm leading-relaxed"
                  placeholder="Add details about this task..."
                />
              </div>

              {/* Checklist Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tasks</label>
                  <button
                    onClick={() => {
                      const newItem = { id: `item_${Date.now()}`, title: 'New task', completed: false };
                      handleUpdateNode({ ...selectedNode, checklist: [...selectedNode.checklist, newItem] });
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                  >
                    + Add Step
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedNode.checklist.map((item, idx) => (
                    <div key={item.id} className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 transition-colors">
                      <button
                        onClick={() => {
                          const newChecklist = [...selectedNode.checklist];
                          newChecklist[idx].completed = !newChecklist[idx].completed;
                          handleUpdateNode({ ...selectedNode, checklist: newChecklist });
                        }}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all ${item.completed ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'
                          }`}
                      >
                        {item.completed && <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                      </button>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const newChecklist = [...selectedNode.checklist];
                          newChecklist[idx].title = e.target.value;
                          handleUpdateNode({ ...selectedNode, checklist: newChecklist });
                        }}
                        className={`bg-transparent flex-1 outline-none text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-300'}`}
                      />
                      <button
                        onClick={() => {
                          const newChecklist = selectedNode.checklist.filter(i => i.id !== item.id);
                          handleUpdateNode({ ...selectedNode, checklist: newChecklist });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded transition-all"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 grid grid-cols-2 gap-4">
              <button
                onClick={() => handleDeleteNode(selectedNode.id)}
                className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl text-sm font-bold transition-all border border-red-500/20"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                Save & Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CanvasControls
        scale={scale}
        onZoomIn={() => setScale(s => Math.min(s + 0.1, 2))}
        onZoomOut={() => setScale(s => Math.max(s - 0.1, 0.2))}
        onCenter={handleCenter}
      />

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[100] bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 min-w-[160px] overflow-hidden"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={handleAddIndependentNode}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <div className="w-5 h-5 flex items-center justify-center bg-indigo-500/10 text-indigo-400 rounded-md">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              New Node
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
