export type UserRole = 'owner' | 'editor' | 'viewer';

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  role: UserRole;
  isSelf?: boolean;
  lastActiveAt: number;
}

export interface CollabCursor {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
  activeNodeId?: string | null;
  lastUpdated: number;
}

export interface CollabPresenceState {
  users: CollabUser[];
  cursors: Record<string, CollabCursor>;
  selectedNodes: Record<string, { userId: string; userName: string; color: string }>;
}

export type AuditActionType =
  | 'node_create'
  | 'node_update'
  | 'node_delete'
  | 'nodes_move'
  | 'edge_create'
  | 'edge_delete'
  | 'drawing_add'
  | 'drawing_delete'
  | 'drawings_clear'
  | 'layout_change'
  | 'theme_change'
  | 'version_restore'
  | 'version_create'
  | 'project_rename';

export interface AuditLogEntry {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userColor: string;
  actionType: AuditActionType;
  targetId?: string;
  summary: string;
  diff?: Record<string, any>;
  createdAt: string;
}

export interface ProjectVersionSnapshot {
  nodes: any[];
  edges: any[];
  drawings?: any[];
  layoutMode: string;
  theme: string;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  label?: string;
  isManual: boolean;
  snapshot: ProjectVersionSnapshot;
  nodesCount: number;
  edgesCount: number;
  drawingsCount: number;
  createdByName: string;
  createdById: string;
  createdAt: string;
}

export interface ProjectShareLink {
  id: string;
  projectId: string;
  shareToken: string;
  role: 'viewer' | 'editor';
  isActive: boolean;
  createdAt: string;
}

export type CollabEventMessage =
  | { type: 'cursor_move'; cursor: CollabCursor }
  | { type: 'node_selection'; nodeId: string | null; user: CollabUser }
  | { type: 'nodes_moved'; nodePositions: Array<{ id: string; position: { x: number; y: number } }>; user: CollabUser }
  | { type: 'node_update'; id: string; data: any; user: CollabUser; summary: string }
  | { type: 'node_add'; node: any; user: CollabUser; summary: string }
  | { type: 'node_delete'; id: string; user: CollabUser; summary: string }
  | { type: 'edge_add'; edge: any; user: CollabUser; summary: string }
  | { type: 'edge_delete'; id: string; user: CollabUser; summary: string }
  | { type: 'drawing_add'; stroke: any; user: CollabUser }
  | { type: 'drawing_delete'; id: string; user: CollabUser }
  | { type: 'drawings_clear'; user: CollabUser; summary: string }
  | { type: 'version_restored'; versionNumber: number; snapshot: ProjectVersionSnapshot; user: CollabUser }
  | { type: 'presence_heartbeat'; user: CollabUser }
  | { type: 'presence_leave'; userId: string };
