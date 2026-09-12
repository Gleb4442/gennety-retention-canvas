import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  MarkerType,
} from '@xyflow/react';
import type { Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CustomNode } from './CustomNode';
import { CustomEdge } from './CustomEdge';
import { CanvasControls } from './CanvasControls';
import { SidebarInspector } from './SidebarInspector';
import { useBoardStore } from '../store/useBoardStore';
import { THEME_CONFIG } from '../constants/themeTokens';
import type { StrategyNode } from '../types';

interface CanvasProps {
  onOpenSearchModal: () => void;
}

const NODE_TYPES = { strategyNode: CustomNode };
const EDGE_TYPES = { customEdge: CustomEdge };

export const Canvas: React.FC<CanvasProps> = ({ onOpenSearchModal }) => {
  const { setCenter, fitView } = useReactFlow();

  const nodes = useBoardStore((s) => s.nodes);
  const edges = useBoardStore((s) => s.edges);
  const theme = useBoardStore((s) => s.theme);
  const onNodesChange = useBoardStore((s) => s.onNodesChange);
  const onEdgesChange = useBoardStore((s) => s.onEdgesChange);
  const onConnect = useBoardStore((s) => s.onConnect);
  const selectedNodeId = useBoardStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useBoardStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useBoardStore((s) => s.setSelectedEdgeId);
  const deleteNode = useBoardStore((s) => s.deleteNode);
  const duplicateNode = useBoardStore((s) => s.duplicateNode);
  const undo = useBoardStore((s) => s.undo);
  const redo = useBoardStore((s) => s.redo);

  const [isLocked, setIsLocked] = useState(false);

  const themeTokens = THEME_CONFIG[theme] || THEME_CONFIG.dark;

  // Fit view initially
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.18, duration: 600 });
    }, 150);
    return () => clearTimeout(timer);
  }, [fitView]);

  // Center on node helper
  const handleFocusNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setCenter(node.position.x + 170, node.position.y + 110, {
          zoom: 1.15,
          duration: 500,
        });
      }
    },
    [nodes, setCenter]
  );

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearchModal();
        return;
      }

      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedNodeId) {
          duplicateNode(selectedNodeId);
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          deleteNode(selectedNodeId);
        }
      }

      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    duplicateNode,
    deleteNode,
    undo,
    redo,
    setSelectedNodeId,
    setSelectedEdgeId,
    onOpenSearchModal,
  ]);

  // MiniMap node color
  const nodeColor = useCallback((node: Node) => {
    const strategyNode = node as StrategyNode;
    if (strategyNode.selected) {
      return theme === 'light' ? '#000000' : '#FFFFFF';
    }
    return theme === 'light' ? '#94A3B8' : '#475569';
  }, [theme]);


  return (
    <div className="relative w-full h-full overflow-hidden">

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isLocked ? undefined : onNodesChange}
        onEdgesChange={isLocked ? undefined : onEdgesChange}
        onConnect={isLocked ? undefined : onConnect}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        nodesDraggable={!isLocked}
        nodesConnectable={!isLocked}
        elementsSelectable={true}
        onPaneClick={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        minZoom={0.2}
        maxZoom={2.5}
        defaultEdgeOptions={{
          type: 'customEdge',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 12,
            height: 12,
            color: themeTokens.edgeColor,
          },
        }}
        fitView
      >
        {/* Subtle Liquid Dots */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.5}
          color={themeTokens.dotsColor}
        />

        {/* MiniMap in bottom-right corner */}
        <MiniMap
          nodeColor={nodeColor}
          nodeStrokeWidth={0}
          zoomable
          pannable
          ariaLabel="Навигационная миникарта"
          className="!bottom-6 !right-6"
        />
      </ReactFlow>

      {/* Floating Canvas Controls */}
      <CanvasControls
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
      />

      {/* Slide-out Sidebar Inspector */}
      <SidebarInspector onFocusNode={handleFocusNode} />
    </div>
  );
};
