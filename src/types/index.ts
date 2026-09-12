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

export type ThemeMode = 'dark' | 'light' | 'graphite' | 'monochrome';

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
}

export type StrategyNode = Node<StrategyNodeData, 'strategyNode'>;

export type EdgeLabelSize = 'sm' | 'md' | 'lg' | 'xl';

export interface StrategyEdgeData extends Record<string, unknown> {
  label?: string;
  animated?: boolean;
  styleType?: 'bezier' | 'smoothstep' | 'straight';
  color?: string;
  labelSize?: EdgeLabelSize;
}

export type StrategyEdge = Edge<StrategyEdgeData, 'customEdge'>;

export type LayoutMode = 'freeform' | 'pyramid' | 'flywheel';

export interface BoardSnapshot {
  nodes: StrategyNode[];
  edges: StrategyEdge[];
  timestamp: number;
}

export type ProjectTemplate = 'blueprint' | 'blank';

export interface CanvasProject {
  id: string;
  title: string;
  description?: string;
  nodes: StrategyNode[];
  edges: StrategyEdge[];
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
