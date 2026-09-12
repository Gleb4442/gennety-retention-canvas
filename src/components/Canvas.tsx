import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { ImageNode } from './ImageNode';
import { CustomEdge } from './CustomEdge';
import { CanvasControls } from './CanvasControls';
import { SidebarInspector } from './SidebarInspector';
import { DrawingLayer } from './DrawingLayer';
import { DrawingToolbar } from './DrawingToolbar';
import { ImageLightboxModal } from './ImageLightboxModal';
import { IconAdd } from './AbstractIcons';
import { useBoardStore } from '../store/useBoardStore';
import { THEME_CONFIG } from '../constants/themeTokens';
import { compressImageFile } from '../utils/imageCompressor';
import type { StrategyNode } from '../types';

interface CanvasProps {
  onOpenSearchModal: () => void;
  onOpenAddModal?: () => void;
}

const NODE_TYPES = { 
  strategyNode: CustomNode,
  imageNode: ImageNode,
};
const EDGE_TYPES = { customEdge: CustomEdge };

export const Canvas: React.FC<CanvasProps> = ({ onOpenSearchModal, onOpenAddModal }) => {
  const { setCenter, fitView, screenToFlowPosition } = useReactFlow();

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
  const addImageNode = useBoardStore((s) => s.addImageNode);
  const isDrawingMode = useBoardStore((s) => s.isDrawingMode);
  const setIsDrawingMode = useBoardStore((s) => s.setIsDrawingMode);
  const drawingTool = useBoardStore((s) => s.drawingTool);

  const [isLocked, setIsLocked] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const themeTokens = THEME_CONFIG[theme] || THEME_CONFIG.dark;

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 1600, 0.88);
      const viewport = document.querySelector('.react-flow') as HTMLElement;
      const rect = viewport
        ? viewport.getBoundingClientRect()
        : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      const centerPos = screenToFlowPosition({
        x: rect.left + rect.width / 2 + (Math.random() * 60 - 30),
        y: rect.top + rect.height / 2 + (Math.random() * 60 - 30),
      });
      addImageNode(
        compressed,
        { x: centerPos.x - 170, y: centerPos.y - 120 },
        file.name.replace(/\.[^/.]+$/, '')
      );
    } catch (err) {
      console.error('Failed to add photo card:', err);
    } finally {
      e.target.value = '';
    }
  };

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

  // Drag and drop image files directly onto canvas
  const handleCanvasDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleCanvasDrop = async (e: React.DragEvent) => {
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    const file = e.dataTransfer.files[0];
    if (!file.type.startsWith('image/')) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const compressed = await compressImageFile(file, 1600, 0.88);
      addImageNode(
        compressed, 
        { x: position.x - 170, y: position.y - 120 }, 
        file.name.replace(/\.[^/.]+$/, '')
      );
    } catch (err) {
      console.error('Failed to process dropped image on canvas:', err);
    }
  };

  // Clipboard paste listener for images (e.g. Cmd+V screenshots)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            try {
              const compressed = await compressImageFile(file, 1600, 0.88);
              const viewport = document.querySelector('.react-flow') as HTMLElement;
              const rect = viewport ? viewport.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
              const centerPos = screenToFlowPosition({
                x: rect.left + rect.width / 2 + (Math.random() * 60 - 30),
                y: rect.top + rect.height / 2 + (Math.random() * 60 - 30),
              });
              addImageNode(
                compressed, 
                { x: centerPos.x - 170, y: centerPos.y - 120 }, 
                'Вставленное фото'
              );
            } catch (err) {
              console.error('Failed to paste image:', err);
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addImageNode, screenToFlowPosition]);

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
    if (node.type === 'imageNode') {
      return theme === 'light' ? '#71717A' : '#A1A1AA';
    }
    const strategyNode = node as StrategyNode;
    const isLight = ['light', 'sand', 'mist'].includes(theme);
    if (strategyNode.selected) {
      return isLight ? '#000000' : '#FFFFFF';
    }
    return isLight ? '#94A3B8' : '#475569';
  }, [theme]);

  const isDrawingActive = isDrawingMode && drawingTool !== 'select';

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={isLocked ? undefined : onNodesChange}
        onEdgesChange={isLocked ? undefined : onEdgesChange}
        onConnect={isLocked ? undefined : onConnect}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        nodesDraggable={!isLocked && !isDrawingActive}
        nodesConnectable={!isLocked && !isDrawingActive}
        elementsSelectable={!isDrawingActive}
        panOnDrag={isDrawingActive ? false : true}
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
        {/* Freehand SVG Drawing Layer mounted inside React Flow Viewport */}
        <DrawingLayer />

        {/* Subtle Liquid Dots */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.5}
          color={themeTokens.dotsColor}
        />

        {/* MiniMap in bottom-right corner (raised so it never overlaps the action dock) */}
        <MiniMap
          nodeColor={nodeColor}
          nodeStrokeWidth={0}
          zoomable
          pannable
          ariaLabel="Навигационная миникарта"
          className="!bottom-[84px] !right-6 !rounded-2xl !overflow-hidden !border !border-black/10 dark:!border-white/10 !shadow-2xl backdrop-blur-md"
        />
      </ReactFlow>

      {/* Floating Canvas Controls (bottom-left) */}
      <CanvasControls
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
      />

      {/* Hidden File Input for Canvas Photo Button */}
      <input
        type="file"
        ref={imageFileInputRef}
        onChange={handlePhotoFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Floating Bottom-Right Action Dock (Add Card, Photo, Drawing) */}
      <div 
        className="absolute bottom-6 right-6 z-30 flex items-center p-1.5 rounded-2xl liquid-glass shadow-2xl gap-1.5 select-none pointer-events-auto border border-black/10 dark:border-white/10"
        role="toolbar"
        aria-label="Панель добавления карточек и рисования"
      >
        {/* Add Card Button */}
        {onOpenAddModal && (
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl liquid-pill-active text-xs font-semibold transition-all hover:scale-[1.02] shadow-sm active:scale-95"
            title="Добавить новую карточку на холст"
          >
            <IconAdd className="w-3.5 h-3.5" />
            <span>Добавить карточку</span>
          </button>
        )}

        {/* Add Standalone Photo Card */}
        <button
          onClick={() => imageFileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl liquid-pill text-xs font-medium transition-all hover:scale-[1.02] active:scale-95 opacity-85 hover:opacity-100"
          title="Добавить фото на холст (также можно перетащить файл или нажать ⌘V)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
          <span>Фото</span>
        </button>

        <div className="w-[1px] h-4 bg-current/10 mx-0.5" />

        {/* Drawing Mode Toggle Button */}
        <button
          onClick={() => setIsDrawingMode(!isDrawingMode)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all active:scale-95 ${
            isDrawingMode
              ? 'liquid-pill-active font-semibold shadow-sm ring-1 ring-white/20'
              : 'liquid-pill opacity-85 hover:opacity-100'
          }`}
          title={isDrawingMode ? "Выйти из режима рисования" : "Включить свободное рисование и ластик"}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
          <span>Рисование</span>
          {isDrawingMode && (
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-pulse" />
          )}
        </button>
      </div>

      {/* Floating Liquid-Glass Drawing Toolbar */}
      <DrawingToolbar />

      {/* Slide-out Sidebar Inspector */}
      <SidebarInspector onFocusNode={handleFocusNode} />

      {/* Fullscreen Photo Lightbox Modal */}
      <ImageLightboxModal />
    </div>
  );
};
