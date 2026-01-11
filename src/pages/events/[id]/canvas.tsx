import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/contexts/SupabaseContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

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

export default function CanvasPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, signOut } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize canvas data
  useEffect(() => {
    if (!id || !user) return;

    const initCanvas = async () => {
      try {
        setLoading(true);
        
        // Try to get existing canvas data from Supabase
        let existingCanvas = await api.canvas.getByEvent(id as string);
        
        if (!existingCanvas) {
          // If no canvas exists, create one with a root node
          const initialNodes = [{
            id: `node_root_${id}`,
            title: `Event: ${id as string}`,
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
        
        // Format the received data to match our CanvasData interface
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
  
  // Set up real-time subscription to canvas updates
  useEffect(() => {
    if (!id || !initialLoadComplete) return;
    
    const channel = supabase
      .channel(`canvas-updates-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas',
          filter: `event_id=eq.${id}`,
        },
        (payload: any) => {
          if (payload.new) {
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
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, initialLoadComplete]);

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = canvasData?.nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setDraggingNode(nodeId);
      setDragOffset({
        x: e.clientX - node.x * scale - offset.x,
        y: e.clientY - node.y * scale - offset.y
      });
    }
  };

  const handleMouseMove = async (e: MouseEvent) => {
    if (draggingNode && canvasData) {
      const updatedNodes = canvasData.nodes.map(node => {
        if (node.id === draggingNode) {
          return {
            ...node,
            x: (e.clientX - dragOffset.x - offset.x) / scale,
            y: (e.clientY - dragOffset.y - offset.y) / scale
          };
        }
        return node;
      });

      const updatedCanvasData = {
        ...canvasData,
        nodes: updatedNodes
      };
      
      setCanvasData(updatedCanvasData);
      
      // Save to database
      try {
        await api.canvas.updateByEvent(canvasData.eventId, updatedCanvasData.nodes);
      } catch (error) {
        console.error('Error saving canvas:', error);
        // Revert the change if saving failed
        setCanvasData(canvasData);
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedNode(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = 0.1;
    const newScale = e.deltaY < 0 ? scale * (1 + scaleFactor) : scale * (1 - scaleFactor);
    
    // Limit zoom range
    if (newScale > 0.5 && newScale < 2) {
      setScale(newScale);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedNode(null);
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [draggingNode, dragOffset, canvasData]);

  const handleAddNode = async () => {
    if (!canvasData || !selectedNode) return;

    const newNode: CanvasNode = {
      id: `node_${Date.now()}`,
      title: 'New Node',
      description: '',
      x: selectedNode.x + 200,
      y: selectedNode.y,
      parentId: selectedNode.id,
      expanded: false,
      status: 'not_started',
      checklist: []
    };

    const updatedCanvasData = {
      ...canvasData,
      nodes: [...canvasData.nodes, newNode],
      updatedAt: new Date().toISOString()
    };
    
    setCanvasData(updatedCanvasData);
    
    // Save to database
    try {
      await api.canvas.updateByEvent(canvasData.eventId, updatedCanvasData.nodes);
    } catch (error) {
      console.error('Error saving canvas:', error);
      // Revert the change if saving failed
      setCanvasData(canvasData);
    }
  };

  const handleNodeTitleChange = async (nodeId: string, title: string) => {
    if (!canvasData) return;

    const updatedNodes = canvasData.nodes.map(node => 
      node.id === nodeId ? { ...node, title } : node
    );

    const updatedCanvasData = {
      ...canvasData,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString()
    };
    
    setCanvasData(updatedCanvasData);
    
    // Save to database
    try {
      await api.canvas.updateByEvent(canvasData.eventId, updatedCanvasData.nodes);
    } catch (error) {
      console.error('Error saving canvas:', error);
      // Revert the change if saving failed
      setCanvasData(canvasData);
    }
  };

  const handleNodeDescriptionChange = async (nodeId: string, description: string) => {
    if (!canvasData) return;

    const updatedNodes = canvasData.nodes.map(node => 
      node.id === nodeId ? { ...node, description } : node
    );

    const updatedCanvasData = {
      ...canvasData,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString()
    };
    
    setCanvasData(updatedCanvasData);
    
    // Save to database
    try {
      await api.canvas.updateByEvent(canvasData.eventId, updatedCanvasData.nodes);
    } catch (error) {
      console.error('Error saving canvas:', error);
      // Revert the change if saving failed
      setCanvasData(canvasData);
    }
  };

  const handleToggleExpand = async (nodeId: string) => {
    if (!canvasData) return;

    const updatedNodes = canvasData.nodes.map(node => 
      node.id === nodeId ? { ...node, expanded: !node.expanded } : node
    );

    const updatedCanvasData = {
      ...canvasData,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString()
    };
    
    setCanvasData(updatedCanvasData);
    
    // Save to database
    try {
      await api.canvas.updateByEvent(canvasData.eventId, updatedCanvasData.nodes);
    } catch (error) {
      console.error('Error saving canvas:', error);
      // Revert the change if saving failed
      setCanvasData(canvasData);
    }
  };

  const handleBackToEvent = () => {
    router.push(`/events/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-400">Loading canvas...</p>
        </div>
      </div>
    );
  }

  if (!canvasData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400">Canvas not found</h2>
          <button 
            onClick={handleBackToEvent}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Back to Event
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center py-4 px-6 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center">
          <button 
            onClick={handleBackToEvent}
            className="mr-4 text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Canvas Mode</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-400">Welcome, {user?.email}</span>
          <button 
            onClick={() => signOut()}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div 
          ref={canvasRef}
          className="flex-1 relative overflow-hidden bg-gradient-to-br from-gray-900/50 to-black/50 cursor-grab active:cursor-grabbing"
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}
          style={{ transform: `scale(${scale})` }}
        >
          <div 
            className="absolute inset-0"
            style={{ 
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          >
            {canvasData.nodes.map((node) => (
              <motion.div
                key={node.id}
                className={`absolute bg-gray-800 border-2 rounded-lg p-4 min-w-[200px] shadow-lg ${
                  selectedNode?.id === node.id 
                    ? 'border-indigo-500 shadow-indigo-500/20' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: '200px'
                }}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex justify-between items-start">
                  <input
                    type="text"
                    value={node.title}
                    onChange={(e) => handleNodeTitleChange(node.id, e.target.value)}
                    className="bg-transparent text-white font-medium outline-none flex-1 mr-2"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleExpand(node.id);
                    }}
                    className="text-gray-400 hover:text-white ml-2"
                  >
                    {node.expanded ? '−' : '+'}
                  </button>
                </div>
                
                {node.expanded && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 pt-2 border-t border-gray-700"
                    >
                      <textarea
                        value={node.description}
                        onChange={(e) => handleNodeDescriptionChange(node.id, e.target.value)}
                        placeholder="Description..."
                        className="w-full bg-transparent text-gray-300 text-sm resize-none outline-none mb-2"
                        rows={2}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex items-center text-xs mb-2">
                        <span className={`px-2 py-1 rounded ${
                          node.status === 'not_started' ? 'bg-gray-700 text-gray-300' :
                          node.status === 'in_progress' ? 'bg-yellow-700 text-yellow-200' :
                          'bg-green-700 text-green-200'
                        }`}>
                          {node.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddNode();
                        }}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded transition-colors"
                      >
                        Add Child
                      </button>
                    </motion.div>
                  </AnimatePresence>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Node Details Panel */}
        <div className={`w-80 bg-gray-800/90 backdrop-blur-sm border-l border-gray-700 p-6 overflow-y-auto transition-all duration-300 ${
          selectedNode ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
        }`}>
          {selectedNode ? (
            <div>
              <h2 className="text-xl font-bold mb-4">Node Details</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => handleNodeTitleChange(selectedNode.id, e.target.value)}
                  className="w-full bg-gray-700/50 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  value={selectedNode.description}
                  onChange={(e) => handleNodeDescriptionChange(selectedNode.id, e.target.value)}
                  className="w-full bg-gray-700/50 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                <select
                  value={selectedNode.status}
                  // In a real implementation, this would update the status
                  className="w-full bg-gray-700/50 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-400">Checklist</label>
                  <button className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded transition-colors">
                    Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedNode.checklist.map((item) => (
                    <div key={item.id} className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={item.completed}
                        className="mr-2"
                      />
                      <span className={`${item.completed ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={() => handleAddNode()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors"
              >
                Add Child Node
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-8">
              <p>Select a node to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-3 text-center text-gray-500 text-sm border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <p>Canvas Mode • Pan: Click and drag empty space • Zoom: Mouse wheel • Add nodes: Select a node and click "Add Child"</p>
      </footer>
    </div>
  );
}