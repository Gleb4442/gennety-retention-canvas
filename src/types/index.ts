import type { Node, Edge } from '@xyflow/react';

export type CategoryType = 
  | 'foundation' 
  | 'psychology' 
  | 'hardware' 
  | 'retention' 
  | 'event' 
  | 'lifecycle' 
  | 'outcome' 
  | 'custom';

export type ThemeMode = 
  | 'dark' 
  | 'light' 
  | 'graphite' 
  | 'monochrome' 
  | 'stone' 
  | 'slate' 
  | 'sand' 
  | 'mist';

export type UiFontSize = 'sm' | 'md' | 'lg';

export interface CategoryDefinition {
  id: CategoryType;
  label: string;
  badgeDefault: string;
  accentHue: string;
  iconType: string;
  neutralTag: string;
}

export interface StrategyNodeData extends Record<string, unknown> {
  title: string;
  badge: string;
  category: CategoryType;
  description: string;
  keyMetric?: string;
  outcome?: string;
  customColor?: string;
  notes?: string;
  tags?: string[];
  isHighlighted?: boolean;
  imageUrl?: string;
}

export type StrategyNode = Node<StrategyNodeData, 'strategyNode'>;

export interface ImageNodeData extends Record<string, unknown> {
  imageUrl: string;
  title?: string;
  caption?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  isHighlighted?: boolean;
}

export type ImageNode = Node<ImageNodeData, 'imageNode'>;

export type BoardNode = StrategyNode | ImageNode;

export type EdgeLabelSize = 'sm' | 'md' | 'lg' | 'xl';

export interface StrategyEdgeData extends Record<string, unknown> {
  label?: string;
  animated?: boolean;
  styleType?: 'bezier' | 'smoothstep' | 'straight';
  color?: string;
  labelSize?: EdgeLabelSize;
  imageUrl?: string;
}

export type StrategyEdge = Edge<StrategyEdgeData, 'customEdge'>;

// ================= Freehand Drawing Types =================
export interface DrawingPoint {
  x: number;
  y: number;
}

export type DrawingTool = 'select' | 'pen' | 'highlighter' | 'arrow' | 'eraser';

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'arrow';
  opacity?: number;
}

export type LayoutMode = 'freeform' | 'pyramid' | 'flywheel';

export interface BoardSnapshot {
  nodes: (StrategyNode | ImageNode)[];
  edges: StrategyEdge[];
  drawings?: DrawingStroke[];
  timestamp: number;
}

export type ProjectTemplate = 'blueprint' | 'blank';

export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  nodes: (StrategyNode | ImageNode)[];
  edges: StrategyEdge[];
  drawings?: DrawingStroke[];
  layoutMode: LayoutMode;
  theme: ThemeMode;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  isFavorite?: boolean;
}

export interface UserWorkspaceBackup {
  version: '2.0.0';
  accessKey: string;
  exportedAt: string;
  activeProjectId: string;
  projects: CanvasProject[];
}

export * from './collaboration';
