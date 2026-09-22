import { create } from 'zustand';
import { 
  applyNodeChanges, 
  applyEdgeChanges, 
  type NodeChange, 
  type EdgeChange, 
  type Connection,
  addEdge,
} from '@xyflow/react';
import type { 
  StrategyNode, 
  StrategyEdge, 
  ImageNode,
  ImageNodeData,
  TextNode,
  TextNodeData,
  BoardNode,
  LayoutMode, 
  BoardSnapshot, 
  StrategyNodeData, 
  ThemeMode,
  UiFontSize,
  CanvasProject,
  ProjectTemplate,
  DrawingStroke,
  DrawingTool,
} from '../types';
import { INITIAL_NODES, INITIAL_EDGES } from '../constants/initialData';
import { computeLayout } from '../utils/layoutAlgorithms';
import { 
  getStoredKey, 
  setStoredKey, 
  clearStoredKey, 
  generateAccessKey,
  validateAccessKey,
} from '../lib/auth';
import { 
  loadProjectsForUser, 
  saveProjectsForUser, 
  saveActiveProjectIdForUser, 
  createDefaultBlueprintProject, 
  createBlankProject,
  exportWorkspaceBackup,
  importWorkspaceBackup,
  isOwnerAccessKey,
} from '../lib/projectStorage';
import { parseCanvasJson } from '../lib/jsonProjectImporter';
import { pushLocalWorkspaceToApi, fetchRemoteWorkspace, type CloudSyncStatus } from '../lib/apiSync';
import type {
  CollabUser,
  CollabCursor,
  AuditLogEntry,
  ProjectVersion,
  UserRole,
} from '../types';
import { getShareParamsFromUrl } from '../lib/auth';
import { collabManager } from '../lib/collaborationManager';

const MAX_HISTORY = 30;

export interface BoardStore {
  // Auth
  accessKey: string | null;
  isAuthenticated: boolean;
  login: (key: string) => { success: boolean; error?: string };
  logout: () => void;
  generateAndSetKey: () => string;

  // Cloud Database Sync
  cloudSyncStatus: CloudSyncStatus;
  syncWithCloudDatabase: (overrideKey?: string) => Promise<void>;

  // Projects & Workspace
  projects: CanvasProject[];
  currentProjectId: string;
  isSaving: boolean;
  lastSavedAt: number | null;
  isCabinetOpen: boolean;
  isNewProjectModalOpen: boolean;
  isSettingsOpen: boolean;
  isImportJsonModalOpen: boolean;
  isAiBridgeModalOpen: boolean;

  // Active Canvas Data
  nodes: BoardNode[];
  edges: StrategyEdge[];
  drawings: DrawingStroke[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  layoutMode: LayoutMode;
  theme: ThemeMode;
  uiFontSize: UiFontSize;
  searchQuery: string;
  isInspectorOpen: boolean;
  
  // Drawing Mode State & Actions
  isDrawingMode: boolean;
  drawingTool: DrawingTool;
  drawingColor: string;
  drawingWidth: number;
  setIsDrawingMode: (active: boolean) => void;
  setDrawingTool: (tool: DrawingTool) => void;
  setDrawingColor: (color: string) => void;
  setDrawingWidth: (width: number) => void;
  addDrawingStroke: (stroke: DrawingStroke) => void;
  deleteDrawingStroke: (id: string) => void;
  clearDrawings: () => void;

  // Area Selection Mode & Multi-Node Actions
  isSelectAreaMode: boolean;
  setIsSelectAreaMode: (active: boolean) => void;
  deleteSelectedNodes: () => void;
  duplicateSelectedNodes: () => void;
  deselectAllNodes: () => void;

  // Lightbox Modal
  lightboxImageUrl: string | null;
  lightboxTitle?: string;
  openLightbox: (url: string, title?: string) => void;
  closeLightbox: () => void;

  // Standalone Image Node on Canvas
  addImageNode: (imageUrl: string, position?: { x: number; y: number }, title?: string, caption?: string) => string;

  // Standalone Text Node on Canvas & Modal
  addTextNode: (text: string, position?: { x: number; y: number }, title?: string, color?: string, fontSize?: 'sm' | 'md' | 'lg' | 'xl') => string;
  isAddTextModalOpen: boolean;
  setIsAddTextModalOpen: (open: boolean) => void;

  // History
  undoStack: BoardSnapshot[];
  redoStack: BoardSnapshot[];

  // Project Actions
  setIsCabinetOpen: (open: boolean) => void;
  setIsNewProjectModalOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsImportJsonModalOpen: (open: boolean) => void;
  setIsAiBridgeModalOpen: (open: boolean) => void;
  switchProject: (projectId: string) => void;
  createProject: (title: string, template?: ProjectTemplate, description?: string) => string;
  duplicateProject: (projectId: string) => string;
  renameProject: (projectId: string, title: string, description?: string) => void;
  deleteProject: (projectId: string) => boolean;
  toggleFavoriteProject: (projectId: string) => void;
  importProjectFromJson: (jsonString: string, titleOverride?: string) => { success: boolean; error?: string };
  exportProjectJson: (projectId?: string) => string;
  exportAllProjectsJson: () => string;
  importBackupJson: (jsonString: string) => { success: boolean; error?: string };

  // Canvas Setters & Flow Handlers
  setNodes: (nodes: BoardNode[]) => void;
  setEdges: (edges: StrategyEdge[]) => void;
  onNodesChange: (changes: NodeChange<BoardNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<StrategyEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  // Selection & UI
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setIsInspectorOpen: (open: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setUiFontSize: (size: UiFontSize) => void;

  // Node CRUD
  addNode: (nodeData: Partial<StrategyNodeData>, position?: { x: number; y: number }) => string;
  updateNode: (id: string, data: Partial<StrategyNodeData | ImageNodeData | TextNodeData>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;

  // Edge CRUD
  updateEdge: (id: string, data: Partial<StrategyEdge['data']>) => void;
  deleteEdge: (id: string) => void;

  // Layout & History
  setLayoutMode: (mode: LayoutMode) => void;
  applyCurrentLayout: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  saveSnapshot: () => void;

  // Persistence & Reset
  resetToDefault: () => void;
  exportJson: () => string;
  importJson: (jsonString: string) => { success: boolean; error?: string };

  // ==================== COLLABORATION & MULTIPLAYER ====================
  collabUser: CollabUser;
  collabPeers: CollabUser[];
  collabCursors: Record<string, CollabCursor>;
  collabSelections: Record<string, { userId: string; userName: string; color: string }>;
  userRole: UserRole;
  isViewerMode: boolean;

  // Modals & Panels for Team Features
  isAuditDrawerOpen: boolean;
  isVersionHistoryModalOpen: boolean;
  isShareModalOpen: boolean;
  previewingVersion: ProjectVersion | null;

  // Audit Logs & Versions
  auditLogs: AuditLogEntry[];
  versions: ProjectVersion[];

  // Collaboration Actions
  setCollabUserName: (name: string) => void;
  setCollabUserColor: (color: string) => void;
  setUserRole: (role: UserRole) => void;
  setIsAuditDrawerOpen: (open: boolean) => void;
  setIsVersionHistoryModalOpen: (open: boolean) => void;
  setIsShareModalOpen: (open: boolean) => void;
  setPreviewingVersion: (version: ProjectVersion | null) => void;
  fetchAuditLogs: () => Promise<void>;
  fetchVersions: () => Promise<void>;
  createVersionCheckpoint: (label?: string) => Promise<void>;
  restoreVersionCheckpoint: (versionId: string) => Promise<void>;
  initCollaboration: (projectId: string, role?: UserRole) => void;
  cleanupCollaboration: () => void;
  loadSharedProject: (options: { shareToken?: string | null; projectId?: string | null; role?: UserRole | null }) => Promise<void>;
  broadcastCursor: (x: number, y: number, activeNodeId?: string | null) => void;
}

// Initial bootstrap from stored key, shared link, or demo
function bootstrap() {
  const shareParams = getShareParamsFromUrl();
  const storedKey = getStoredKey();
  const storedFontSize = (typeof window !== 'undefined' ? localStorage.getItem('gennety_ui_font_size') : null) as UiFontSize | null;
  const uiFontSize: UiFontSize = storedFontSize && ['sm', 'md', 'lg'].includes(storedFontSize) ? storedFontSize : 'md';

  // If entering via direct project share link
  if (shareParams.shareToken || (shareParams.projectId && shareParams.role)) {
    const role: UserRole = shareParams.role === 'viewer' ? 'viewer' : 'editor';
    return {
      accessKey: storedKey || 'guest_shared',
      isAuthenticated: true,
      projects: [],
      currentProjectId: shareParams.projectId || '',
      nodes: [],
      edges: [],
      drawings: [],
      layoutMode: 'freeform' as LayoutMode,
      theme: 'dark' as ThemeMode,
      uiFontSize,
      userRole: role,
      isViewerMode: role === 'viewer',
    };
  }

  if (!storedKey) {
    return {
      accessKey: null,
      isAuthenticated: false,
      projects: [],
      currentProjectId: '',
      nodes: [],
      edges: [],
      drawings: [],
      layoutMode: 'freeform' as LayoutMode,
      theme: 'dark' as ThemeMode,
      uiFontSize,
      userRole: 'editor' as UserRole,
      isViewerMode: false,
    };
  }

  const { projects, activeProjectId } = loadProjectsForUser(storedKey);
  const activeProj = projects.find((p) => p.id === activeProjectId) || projects[0];

  return {
    accessKey: storedKey,
    isAuthenticated: true,
    projects,
    currentProjectId: activeProj ? activeProj.id : '',
    nodes: activeProj ? (activeProj.nodes || []) : [],
    edges: activeProj ? (activeProj.edges || []) : [],
    drawings: activeProj ? (activeProj.drawings || []) : [],
    layoutMode: (activeProj ? activeProj.layoutMode : 'freeform') as LayoutMode,
    theme: (activeProj ? activeProj.theme : 'dark') as ThemeMode,
    uiFontSize,
    userRole: (isOwnerAccessKey(storedKey) ? 'owner' : 'editor') as UserRole,
    isViewerMode: false,
  };
}

const initialBoot = bootstrap();

let originalStateBeforePreview: {
  nodes: BoardNode[];
  edges: StrategyEdge[];
  drawings: DrawingStroke[];
  layoutMode: LayoutMode;
  theme: ThemeMode;
} | null = null;

let collabSyncTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedCollabSync = (project: CanvasProject, ownerKey: string) => {
  if (collabSyncTimer) clearTimeout(collabSyncTimer);
  collabSyncTimer = setTimeout(() => {
    fetch('/api/collaboration?action=sync_project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, ownerKey }),
    }).catch(() => {});
  }, 600);
};

export const useBoardStore = create<BoardStore>((set, get) => {
  // Helper to persist current active project into projects list and localStorage
  const syncAndPersist = (
    nodes: BoardNode[],
    edges: StrategyEdge[],
    layoutMode: LayoutMode,
    theme: ThemeMode,
    drawings?: DrawingStroke[]
  ) => {
    const { accessKey, projects, currentProjectId } = get();
    if (!accessKey || !currentProjectId) return;

    const currentDrawings = drawings !== undefined ? drawings : (get().drawings || []);
    const now = Date.now();
    const updatedProjects = projects.map((p) => {
      if (p.id === currentProjectId) {
        return {
          ...p,
          nodes,
          edges,
          drawings: currentDrawings,
          layoutMode,
          theme,
          updatedAt: now,
        };
      }
      return p;
    });

    set({
      projects: updatedProjects,
      isSaving: false,
      lastSavedAt: now,
    });

    saveProjectsForUser(accessKey, updatedProjects);
    pushLocalWorkspaceToApi(accessKey, updatedProjects, currentProjectId, 800, (status) => {
      set({ cloudSyncStatus: status });
    });

    // Also sync individual project to canvas_projects table for live collaboration (debounced)
    const currentProj = updatedProjects.find((p) => p.id === currentProjectId);
    if (currentProj) {
      debouncedCollabSync(currentProj, accessKey);
    }
  };

  return {
    // Auth State
    accessKey: initialBoot.accessKey,
    isAuthenticated: initialBoot.isAuthenticated,

    // Collaboration & Multiplayer State
    collabUser: collabManager.getCurrentUser(),
    collabPeers: [],
    collabCursors: {},
    collabSelections: {},
    userRole: initialBoot.userRole,
    isViewerMode: initialBoot.isViewerMode,

    // Collaboration Drawers & Modals
    isAuditDrawerOpen: false,
    isVersionHistoryModalOpen: false,
    isShareModalOpen: false,
    previewingVersion: null,

    // Audit Logs & Versions Data
    auditLogs: [],
    versions: [],

    // Cloud Database Sync State
    cloudSyncStatus: 'idle' as CloudSyncStatus,

    // Projects State
    projects: initialBoot.projects,
    currentProjectId: initialBoot.currentProjectId,
    isSaving: false,
    lastSavedAt: Date.now(),
    isCabinetOpen: false,
    isNewProjectModalOpen: false,
    isSettingsOpen: false,
    isImportJsonModalOpen: false,
    isAiBridgeModalOpen: false,

    // Active Canvas
    nodes: initialBoot.nodes,
    edges: initialBoot.edges,
    drawings: initialBoot.drawings || [],
    selectedNodeId: null,
    selectedEdgeId: null,
    layoutMode: initialBoot.layoutMode,
    theme: initialBoot.theme,
    uiFontSize: initialBoot.uiFontSize,
    searchQuery: '',
    isInspectorOpen: false,

    // Drawing Mode State & Actions
    isDrawingMode: false,
    drawingTool: 'pen' as DrawingTool,
    drawingColor: '#EDEDF0',
    drawingWidth: 3,
    setIsDrawingMode: (active) => set({ 
      isDrawingMode: active, 
      isSelectAreaMode: active ? false : get().isSelectAreaMode,
      isInspectorOpen: active ? false : get().isInspectorOpen 
    }),
    setDrawingTool: (tool) => set({ 
      drawingTool: tool, 
      isDrawingMode: true, 
      isSelectAreaMode: false 
    }),
    setDrawingColor: (color) => set({ drawingColor: color }),
    setDrawingWidth: (width) => set({ drawingWidth: width }),

    // Area Selection Mode
    isSelectAreaMode: false,
    setIsSelectAreaMode: (active) => set({ 
      isSelectAreaMode: active, 
      isDrawingMode: active ? false : get().isDrawingMode,
      isInspectorOpen: active ? false : get().isInspectorOpen 
    }),
    addDrawingStroke: (stroke) => {
      if (get().isViewerMode) return;
      get().saveSnapshot();
      set((state) => {
        const updated = [...state.drawings, stroke];
        syncAndPersist(state.nodes, state.edges, state.layoutMode, state.theme, updated);
        return { drawings: updated };
      });
      const user = collabManager.getCurrentUser();
      collabManager.broadcastMutation(
        { type: 'drawing_add', stroke, user },
        { actionType: 'drawing_add', summary: `${user.name} добавил рисунок на холсте` }
      );
    },
    deleteDrawingStroke: (id) => {
      if (get().isViewerMode) return;
      get().saveSnapshot();
      set((state) => {
        const updated = state.drawings.filter((d) => d.id !== id);
        syncAndPersist(state.nodes, state.edges, state.layoutMode, state.theme, updated);
        return { drawings: updated };
      });
      const user = collabManager.getCurrentUser();
      collabManager.broadcastMutation(
        { type: 'drawing_delete', id, user },
        { actionType: 'drawing_delete', summary: `${user.name} удалил рисунок` }
      );
    },
    clearDrawings: () => {
      if (get().isViewerMode) return;
      get().saveSnapshot();
      set((state) => {
        syncAndPersist(state.nodes, state.edges, state.layoutMode, state.theme, []);
        return { drawings: [] };
      });
      const user = collabManager.getCurrentUser();
      collabManager.broadcastMutation(
        { type: 'drawings_clear', user, summary: `${user.name} очистил все рисунки` },
        { actionType: 'drawings_clear', summary: `${user.name} очистил все рисунки` }
      );
    },

    // Lightbox Modal
    lightboxImageUrl: null,
    lightboxTitle: undefined,
    openLightbox: (url, title) => set({ lightboxImageUrl: url, lightboxTitle: title }),
    closeLightbox: () => set({ lightboxImageUrl: null, lightboxTitle: undefined }),

    // Standalone Image Node on Canvas
    addImageNode: (imageUrl, position, title, caption) => {
      if (get().isViewerMode) return '';
      get().saveSnapshot();
      const id = `img_${Date.now()}`;
      const defaultPosition = position || {
        x: 350 + Math.random() * 150,
        y: 200 + Math.random() * 150,
      };

      const newImageNode: ImageNode = {
        id,
        type: 'imageNode',
        position: defaultPosition,
        data: {
          imageUrl,
          title: title || '',
          caption: caption || title || '',
          width: 340,
        },
      };

      set((state) => {
        const updatedNodes = [...state.nodes, newImageNode];
        syncAndPersist(updatedNodes, state.edges, state.layoutMode, state.theme, state.drawings);
        return {
          nodes: updatedNodes,
          selectedNodeId: id,
          selectedEdgeId: null,
          isInspectorOpen: true,
        };
      });

      return id;
    },

    // Standalone Text Node on Canvas & Modal
    isAddTextModalOpen: false,
    setIsAddTextModalOpen: (open) => set({ isAddTextModalOpen: open }),
    addTextNode: (text, position, title, color = 'default', fontSize = 'md') => {
      if (get().isViewerMode) return '';
      get().saveSnapshot();
      const id = `text_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const defaultPosition = position || {
        x: 350 + Math.random() * 150,
        y: 200 + Math.random() * 150,
      };

      const newTextNode: TextNode = {
        id,
        type: 'textNode',
        position: defaultPosition,
        data: {
          text,
          title: title || undefined,
          color,
          fontSize,
          width: 340,
        },
      };

      set((state) => {
        const updatedNodes = [...state.nodes, newTextNode];
        syncAndPersist(updatedNodes, state.edges, state.layoutMode, state.theme, state.drawings);
        return {
          nodes: updatedNodes,
          selectedNodeId: id,
          selectedEdgeId: null,
          isInspectorOpen: true,
        };
      });

      const user = collabManager.getCurrentUser();
      collabManager.broadcastMutation(
        { type: 'node_add', node: newTextNode, user, summary: `Добавил текстовый блок "${title || text.slice(0, 25)}"` },
        { actionType: 'node_create', summary: `Добавил текстовый блок "${title || text.slice(0, 25)}"`, targetId: id }
      );

      return id;
    },

    undoStack: [],
    redoStack: [],

    // ==================== AUTH METHODS ====================
    login: (rawKey: string) => {
      const val = validateAccessKey(rawKey);
      if (!val.valid || !val.formattedKey) {
        return { success: false, error: val.error || 'Неверный ключ доступа' };
      }

      const key = val.formattedKey;
      setStoredKey(key);

      const { projects, activeProjectId } = loadProjectsForUser(key);
      const activeProj = projects.find((p) => p.id === activeProjectId) || projects[0];

      set({
        accessKey: key,
        isAuthenticated: true,
        projects,
        currentProjectId: activeProj.id,
        nodes: activeProj.nodes || [],
        edges: activeProj.edges || [],
        drawings: activeProj.drawings || [],
        layoutMode: activeProj.layoutMode,
        theme: activeProj.theme,
        undoStack: [],
        redoStack: [],
        selectedNodeId: null,
        selectedEdgeId: null,
        lastSavedAt: Date.now(),
        cloudSyncStatus: 'syncing',
      });

      // Synchronize with Supabase Cloud Database immediately
      get().syncWithCloudDatabase(key);

      return { success: true };
    },

    syncWithCloudDatabase: async (overrideKey?: string) => {
      const key = overrideKey || get().accessKey;
      if (!key) return;

      set({ cloudSyncStatus: 'syncing' });
      try {
        const remote = await fetchRemoteWorkspace(key);
        if (!remote) {
          set({ cloudSyncStatus: 'offline' });
          return;
        }

        const localProjects = get().projects;
        const currentActiveId = get().currentProjectId;

        if (remote.success && Array.isArray(remote.projects) && remote.projects.length > 0) {
          const remoteUpdated = remote.updatedAt || 0;
          const localMaxUpdated = localProjects.reduce((max, p) => Math.max(max, p.updatedAt || 0), 0);

          // If remote has valid projects and is newer, or local was just an empty blank project, or remote has more projects
          const isLocalEmptyOrFewer = localProjects.length === 0 ||
            (localProjects.length === 1 && (localProjects[0].nodes?.length || 0) === 0) ||
            (localProjects.length < remote.projects.length);

          if (remoteUpdated >= localMaxUpdated || isLocalEmptyOrFewer) {
            const activeId = remote.activeProjectId && remote.projects.some((p) => p.id === remote.activeProjectId)
              ? remote.activeProjectId
              : remote.projects[0].id;
            const activeProj = remote.projects.find((p) => p.id === activeId) || remote.projects[0];

            saveProjectsForUser(key, remote.projects);
            saveActiveProjectIdForUser(key, activeId);

            set({
              projects: remote.projects,
              currentProjectId: activeId,
              nodes: activeProj.nodes || [],
              edges: activeProj.edges || [],
              drawings: activeProj.drawings || [],
              layoutMode: activeProj.layoutMode || 'freeform',
              theme: activeProj.theme || 'dark',
              cloudSyncStatus: 'synced',
              lastSavedAt: remoteUpdated || Date.now(),
            });
            return;
          } else {
            // Local is newer: push local state to Cloud DB
            pushLocalWorkspaceToApi(key, localProjects, currentActiveId, 0, (status) => {
              set({ cloudSyncStatus: status });
            });
            return;
          }
        }

        if (remote.notFound) {
          // If remote doesn't have this key yet in database, upload our local projects to Supabase!
          if (localProjects.length > 0) {
            pushLocalWorkspaceToApi(key, localProjects, currentActiveId, 0, (status) => {
              set({ cloudSyncStatus: status });
            });
          } else {
            set({ cloudSyncStatus: 'synced' });
          }
        }
      } catch (err) {
        console.warn('[Cloud Sync] syncWithCloudDatabase error:', err);
        set({ cloudSyncStatus: 'error' });
      }
    },

    logout: () => {
      clearStoredKey();
      collabManager.cleanup();
      set({
        accessKey: null,
        isAuthenticated: false,
        isCabinetOpen: false,
        isAiBridgeModalOpen: false,
        selectedNodeId: null,
        selectedEdgeId: null,
        collabPeers: [],
        collabCursors: {},
        collabSelections: {},
      });
    },

    generateAndSetKey: () => {
      const newKey = generateAccessKey();
      get().login(newKey);
      return newKey;
    },

    // ==================== PROJECT METHODS ====================
    setIsCabinetOpen: (open) => set({ isCabinetOpen: open }),
    setIsNewProjectModalOpen: (open) => set({ isNewProjectModalOpen: open }),
    setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
    setIsImportJsonModalOpen: (open) => set({ isImportJsonModalOpen: open }),
    setIsAiBridgeModalOpen: (open) => set({ isAiBridgeModalOpen: open }),

    switchProject: (projectId: string) => {
      const { projects, accessKey } = get();
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;

      if (accessKey) {
        saveActiveProjectIdForUser(accessKey, target.id);
      }

      set({
        currentProjectId: target.id,
        nodes: target.nodes || [],
        edges: target.edges || [],
        drawings: target.drawings || [],
        layoutMode: target.layoutMode,
        theme: target.theme,
        selectedNodeId: null,
        selectedEdgeId: null,
        undoStack: [],
        redoStack: [],
        isCabinetOpen: false,
        lastSavedAt: Date.now(),
      });
    },

    createProject: (title: string, template: ProjectTemplate = 'blank', description = '') => {
      const { accessKey, projects } = get();
      if (!accessKey) return '';

      const isOwner = isOwnerAccessKey(accessKey);
      const isBlueprintTemplate = template === 'blueprint' && isOwner;

      const cleanTitle = title.trim() || (isBlueprintTemplate ? 'Retention Strategy Project' : 'Новый холст');
      const newProject: CanvasProject = isBlueprintTemplate 
        ? { ...createDefaultBlueprintProject(cleanTitle), description }
        : createBlankProject(cleanTitle, description);

      const updatedProjects = [newProject, ...projects];
      saveProjectsForUser(accessKey, updatedProjects);
      saveActiveProjectIdForUser(accessKey, newProject.id);

      set({
        projects: updatedProjects,
        currentProjectId: newProject.id,
        nodes: newProject.nodes,
        edges: newProject.edges,
        layoutMode: newProject.layoutMode,
        theme: newProject.theme,
        selectedNodeId: null,
        selectedEdgeId: null,
        undoStack: [],
        redoStack: [],
        isCabinetOpen: false,
        isNewProjectModalOpen: false,
        lastSavedAt: Date.now(),
      });

      return newProject.id;
    },

    duplicateProject: (projectId: string) => {
      const { accessKey, projects } = get();
      if (!accessKey) return '';

      const target = projects.find((p) => p.id === projectId);
      if (!target) return '';

      const now = Date.now();
      const duplicated: CanvasProject = {
        ...target,
        id: `proj_${now}_copy`,
        title: `${target.title} (Копия)`,
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
      };

      const updatedProjects = [duplicated, ...projects];
      saveProjectsForUser(accessKey, updatedProjects);

      set({ projects: updatedProjects });
      return duplicated.id;
    },

    renameProject: (projectId: string, title: string, description?: string) => {
      const { accessKey, projects } = get();
      if (!accessKey) return;

      const trimmedTitle = title.trim();
      if (!trimmedTitle) return;

      const updatedProjects = projects.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            title: trimmedTitle,
            description: description !== undefined ? description : p.description,
            updatedAt: Date.now(),
          };
        }
        return p;
      });

      saveProjectsForUser(accessKey, updatedProjects);
      set({ projects: updatedProjects });
    },

    deleteProject: (projectId: string) => {
      const { accessKey, projects, currentProjectId } = get();
      if (!accessKey || projects.length <= 1) {
        return false; // Prevent deleting last remaining project
      }

      const updatedProjects = projects.filter((p) => p.id !== projectId);
      saveProjectsForUser(accessKey, updatedProjects);

      // If we deleted the active project, switch to the first remaining one
      if (currentProjectId === projectId) {
        const nextActive = updatedProjects[0];
        saveActiveProjectIdForUser(accessKey, nextActive.id);
        set({
          projects: updatedProjects,
          currentProjectId: nextActive.id,
          nodes: nextActive.nodes,
          edges: nextActive.edges,
          layoutMode: nextActive.layoutMode,
          theme: nextActive.theme,
          selectedNodeId: null,
          selectedEdgeId: null,
          undoStack: [],
          redoStack: [],
        });
      } else {
        set({ projects: updatedProjects });
      }

      return true;
    },

    toggleFavoriteProject: (projectId: string) => {
      const { accessKey, projects } = get();
      if (!accessKey) return;

      const updatedProjects = projects.map((p) => 
        p.id === projectId ? { ...p, isFavorite: !p.isFavorite } : p
      );

      saveProjectsForUser(accessKey, updatedProjects);
      set({ projects: updatedProjects });
    },

    importProjectFromJson: (jsonString: string, titleOverride?: string) => {
      try {
        const { accessKey, projects } = get();
        if (!accessKey) return { success: false, error: 'Необходима авторизация' };

        const parseRes = parseCanvasJson(jsonString, titleOverride);
        if (!parseRes.success || !parseRes.project) {
          return { success: false, error: parseRes.error || 'Неверный формат JSON схемы' };
        }

        const importedProject = parseRes.project;
        const updatedProjects = [importedProject, ...projects];
        saveProjectsForUser(accessKey, updatedProjects);
        saveActiveProjectIdForUser(accessKey, importedProject.id);

        set({
          projects: updatedProjects,
          currentProjectId: importedProject.id,
          nodes: importedProject.nodes,
          edges: importedProject.edges,
          drawings: importedProject.drawings || [],
          layoutMode: importedProject.layoutMode,
          theme: importedProject.theme,
          selectedNodeId: null,
          selectedEdgeId: null,
          undoStack: [],
          redoStack: [],
          isCabinetOpen: false,
          isImportJsonModalOpen: false,
          lastSavedAt: Date.now(),
        });

        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Ошибка парсинга JSON';
        return { success: false, error: msg };
      }
    },

    exportProjectJson: (projectId?: string) => {
      const { projects, currentProjectId, nodes, edges, drawings, layoutMode, theme } = get();
      const targetId = projectId || currentProjectId;
      const targetProj = projects.find((p) => p.id === targetId);

      const payload = {
        project: targetProj?.title || 'Retention Canvas',
        description: targetProj?.description || '',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        layoutMode: targetId === currentProjectId ? layoutMode : targetProj?.layoutMode || 'freeform',
        theme: targetId === currentProjectId ? theme : targetProj?.theme || 'dark',
        nodes: targetId === currentProjectId ? nodes : targetProj?.nodes || [],
        edges: targetId === currentProjectId ? edges : targetProj?.edges || [],
        drawings: targetId === currentProjectId ? (drawings || []) : (targetProj?.drawings || []),
      };
      return JSON.stringify(payload, null, 2);
    },

    exportAllProjectsJson: () => {
      const { accessKey, projects, currentProjectId } = get();
      return exportWorkspaceBackup(accessKey || 'anonymous', projects, currentProjectId);
    },

    importBackupJson: (jsonString: string) => {
      const { accessKey } = get();
      if (!accessKey) return { success: false, error: 'Сначала выполните вход' };

      const res = importWorkspaceBackup(jsonString, accessKey);
      if (!res.success || !res.projects || !res.activeProjectId) {
        return { success: false, error: res.error || 'Ошибка восстановления резервной копии' };
      }

      const activeProj = res.projects.find((p) => p.id === res.activeProjectId) || res.projects[0];

      set({
        projects: res.projects,
        currentProjectId: activeProj.id,
        nodes: activeProj.nodes,
        edges: activeProj.edges,
        layoutMode: activeProj.layoutMode,
        theme: activeProj.theme,
        undoStack: [],
        redoStack: [],
        selectedNodeId: null,
        selectedEdgeId: null,
        lastSavedAt: Date.now(),
      });

      return { success: true };
    },

    // ==================== CANVAS METHODS ====================
    setNodes: (nodes) => {
      set({ nodes });
      syncAndPersist(nodes, get().edges, get().layoutMode, get().theme);
    },

    setEdges: (edges) => {
      set({ edges });
      syncAndPersist(get().nodes, edges, get().layoutMode, get().theme);
    },

    setTheme: (theme) => {
      set({ theme });
      syncAndPersist(get().nodes, get().edges, get().layoutMode, theme);
    },

    setUiFontSize: (uiFontSize) => {
      try {
        localStorage.setItem('gennety_ui_font_size', uiFontSize);
      } catch {}
      set({ uiFontSize });
    },

    saveSnapshot: () => {
      const { nodes, edges, drawings, undoStack } = get();
      const newSnapshot: BoardSnapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        drawings: JSON.parse(JSON.stringify(drawings || [])),
        timestamp: Date.now(),
      };
      const updatedUndo = [...undoStack, newSnapshot].slice(-MAX_HISTORY);
      set({ undoStack: updatedUndo, redoStack: [] });
    },

    onNodesChange: (changes) => {
      if (get().isViewerMode) {
        // In viewer mode, allow only node selection, reject dragging and layout alterations
        const selectChanges = changes.filter((c) => c.type === 'select');
        if (selectChanges.length === 0) return;
        changes = selectChanges;
      }

      const currentState = get();
      const updatedNodes = applyNodeChanges(changes, currentState.nodes);
      
      const selectedNodes = updatedNodes.filter((n) => n.selected);
      let newSelectedId = currentState.selectedNodeId;

      if (selectedNodes.length === 1) {
        newSelectedId = selectedNodes[0].id;
      } else if (selectedNodes.length === 0) {
        newSelectedId = null;
      } else {
        // Multiple nodes selected via box selection
        newSelectedId = null;
      }

      // Live broadcast position during dragging
      const movedPositions: Array<{ id: string; position: { x: number; y: number } }> = [];
      changes.forEach((c) => {
        if (c.type === 'position' && c.position) {
          movedPositions.push({ id: c.id, position: c.position });
        }
      });
      if (movedPositions.length > 0) {
        collabManager.broadcastNodesMoved(movedPositions);
      }

      const hasPosChange = changes.some((c) => c.type === 'position' && !c.dragging);

      set({
        nodes: updatedNodes,
        selectedNodeId: newSelectedId,
        // Only open inspector if exactly 1 node is selected; keep closed for multi-node selection to avoid blocking the canvas
        isInspectorOpen: selectedNodes.length === 1 ? true : (selectedNodes.length > 1 ? false : currentState.isInspectorOpen),
      });

      if (hasPosChange) {
        get().saveSnapshot();
        syncAndPersist(updatedNodes, currentState.edges, currentState.layoutMode, currentState.theme, currentState.drawings);
        const user = collabManager.getCurrentUser();
        collabManager.broadcastMutation(
          { type: 'nodes_moved', nodePositions: movedPositions, user },
          { actionType: 'nodes_move', summary: `${user.name} переместил карточки на холсте` }
        );
      }
    },

    onEdgesChange: (changes) => {
      if (get().isViewerMode) {
        const selectChanges = changes.filter((c) => c.type === 'select');
        if (selectChanges.length === 0) return;
        changes = selectChanges;
      }

      const currentState = get();
      const updatedEdges = applyEdgeChanges(changes, currentState.edges);
      
      const selectChange = changes.find((c) => c.type === 'select');
      let newSelectedId = currentState.selectedEdgeId;
      if (selectChange && 'selected' in selectChange) {
        if (selectChange.selected) {
          newSelectedId = selectChange.id;
        } else if (currentState.selectedEdgeId === selectChange.id) {
          newSelectedId = null;
        }
      }

      set({
        edges: updatedEdges,
        selectedEdgeId: newSelectedId,
      });

      const hasStructuralChange = changes.some((c) => c.type !== 'select');
      if (hasStructuralChange) {
        syncAndPersist(currentState.nodes, updatedEdges, currentState.layoutMode, currentState.theme, currentState.drawings);
      }
    },

    onConnect: (connection) => {
      if (get().isViewerMode) return;
      get().saveSnapshot();
      const newEdge: StrategyEdge = {
        ...connection,
        id: `e_${connection.source}_${connection.target}_${Date.now()}`,
        type: 'customEdge',
        animated: true,
        data: {
          label: 'связано с',
          styleType: 'bezier',
        },
      };

      set((state) => {
        const updatedEdges = addEdge(newEdge, state.edges);
        syncAndPersist(state.nodes, updatedEdges, state.layoutMode, state.theme);
        return { edges: updatedEdges };
      });

      const user = collabManager.getCurrentUser();
      collabManager.broadcastMutation(
        { type: 'edge_add', edge: newEdge, user, summary: 'Создал связь' },
        { actionType: 'edge_create', summary: 'Создал новую связь на холсте', targetId: newEdge.id }
      );
    },

    setSelectedNodeId: (id) => {
      set((state) => ({
        selectedNodeId: id,
        selectedEdgeId: id ? null : state.selectedEdgeId,
        isInspectorOpen: Boolean(id),
      }));
      collabManager.broadcastNodeSelection(id);
    },

    setSelectedEdgeId: (id) => {
      set((state) => ({
        selectedEdgeId: id,
        selectedNodeId: id ? null : state.selectedNodeId,
        isInspectorOpen: Boolean(id),
      }));
    },

    setSearchQuery: (query) => {
      set({ searchQuery: query });
    },

    setIsInspectorOpen: (open) => {
      set({ isInspectorOpen: open });
    },

    addNode: (nodeData, position) => {
      if (get().isViewerMode) return '';
      get().saveSnapshot();
      const id = `node_${Date.now()}`;
      const defaultPosition = position || {
        x: 400 + Math.random() * 200,
        y: 250 + Math.random() * 200,
      };

      const newNode: StrategyNode = {
        id,
        type: 'strategyNode',
        position: defaultPosition,
        data: {
          title: nodeData.title || 'НОВЫЙ СТРАТЕГИЧЕСКИЙ БЛОК',
          badge: nodeData.badge || 'New Strategy',
          category: nodeData.category || 'custom',
          description: nodeData.description || 'Описание механизма, эффекта или гипотезы...',
          keyMetric: nodeData.keyMetric,
          outcome: nodeData.outcome,
          tags: nodeData.tags || ['Strategy'],
          notes: nodeData.notes || '',
          ...nodeData,
        },
      };

      set((state) => {
        const updatedNodes = [...state.nodes, newNode];
        syncAndPersist(updatedNodes, state.edges, state.layoutMode, state.theme);
        return {
          nodes: updatedNodes,
          selectedNodeId: id,
          isInspectorOpen: true,
        };
      });

      const user = collabManager.getCurrentUser();
      collabManager.broadcastMutation(
        { type: 'node_add', node: newNode, user, summary: `Создал карточку "${newNode.data.title}"` },
        { actionType: 'node_create', summary: `Создал карточку "${newNode.data.title}"`, targetId: id }
      );

      return id;
    },

    updateNode: (id, data) => {
      if (get().isViewerMode) return;
      get().saveSnapshot();
      let nodeTitle = '';
      set((state) => {
        const updatedNodes: BoardNode[] = state.nodes.map((node) => {
          if (node.id === id) {
            if (node.type === 'imageNode') {
              return {
                ...node,
                data: {
                  ...node.data,
                  ...data,
                },
              } as ImageNode;
            } else if (node.type === 'textNode') {
              nodeTitle = (data as any).title || (node.data as any).title || (data as any).text?.slice(0, 25) || '';
              return {
                ...node,
                data: {
                  ...node.data,
                  ...data,
                },
              } as TextNode;
            } else {
              nodeTitle = (data as any).title || (node.data as any).title || '';
              return {
                ...node,
                data: {
                  ...node.data,
                  ...data,
                },
              } as StrategyNode;
            }
          }
          return node;
        });
        syncAndPersist(updatedNodes, state.edges, state.layoutMode, state.theme);
        return { nodes: updatedNodes };
      });

      const user = collabManager.getCurrentUser();
      collabManager.broadcastMutation(
        { type: 'node_update', id, data, user, summary: `Изменил карточку "${nodeTitle || id}"` },
        { actionType: 'node_update', summary: `Изменил карточку "${nodeTitle || id}"`, targetId: id, diff: data }
      );
    },

    deleteNode: (id) => {
      if (get().isViewerMode) return;
      get().saveSnapshot();
      const nodeToDelete = get().nodes.find((n) => n.id === id);
      const title = (nodeToDelete?.data as any)?.title || id;

      set((state) => {
        const updatedNodes = state.nodes.filter((node) => node.id !== id);
        const updatedEdges = state.edges.filter(
          (edge) => edge.source !== id && edge.target !== id
        );
        syncAndPersist(updatedNodes, updatedEdges, state.layoutMode, state.theme);
        return {
          nodes: updatedNodes,
          edges: updatedEdges,
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
          isInspectorOpen: state.selectedNodeId === id ? false : state.isInspectorOpen,
        };
      });

      const user = collabManager.getCurrentUser();
      collabManager.broadcastMutation(
        { type: 'node_delete', id, user, summary: `Удалил карточку "${title}"` },
        { actionType: 'node_delete', summary: `Удалил карточку "${title}"`, targetId: id }
      );
    },

    duplicateNode: (id) => {
      if (get().isViewerMode) return;
      const nodeToDup = get().nodes.find((n) => n.id === id);
      if (!nodeToDup) return;

      get().saveSnapshot();
      const newId = `${nodeToDup.type === 'imageNode' ? 'img' : nodeToDup.type === 'textNode' ? 'text' : 'node'}_${Date.now()}`;

      let duplicatedNode: BoardNode;
      if (nodeToDup.type === 'imageNode') {
        const imgData = nodeToDup.data as ImageNodeData;
        duplicatedNode = {
          ...nodeToDup,
          id: newId,
          position: {
            x: nodeToDup.position.x + 40,
            y: nodeToDup.position.y + 40,
          },
          data: {
            ...imgData,
            title: imgData.title ? `${imgData.title} (Копия)` : '',
          },
          selected: true,
        } as ImageNode;
      } else if (nodeToDup.type === 'textNode') {
        const textData = nodeToDup.data as TextNodeData;
        duplicatedNode = {
          ...nodeToDup,
          id: newId,
          position: {
            x: nodeToDup.position.x + 40,
            y: nodeToDup.position.y + 40,
          },
          data: {
            ...textData,
            title: textData.title ? `${textData.title} (Копия)` : undefined,
          },
          selected: true,
        } as TextNode;
      } else {
        const stratData = nodeToDup.data as StrategyNodeData;
        duplicatedNode = {
          ...nodeToDup,
          id: newId,
          position: {
            x: nodeToDup.position.x + 40,
            y: nodeToDup.position.y + 40,
          },
          data: {
            ...stratData,
            title: `${stratData.title} (Копия)`,
          },
          selected: true,
        } as StrategyNode;
      }

      set((state) => {
        const unselectedNodes = state.nodes.map((n) => ({ ...n, selected: false }));
        const updatedNodes = [...unselectedNodes, duplicatedNode];
        syncAndPersist(updatedNodes, state.edges, state.layoutMode, state.theme, state.drawings);
        return {
          nodes: updatedNodes,
          selectedNodeId: newId,
          isInspectorOpen: true,
        };
      });
    },

    deselectAllNodes: () => {
      set((state) => ({
        nodes: state.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
        edges: state.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
        selectedNodeId: null,
        selectedEdgeId: null,
        isInspectorOpen: false,
      }));
    },

    deleteSelectedNodes: () => {
      if (get().isViewerMode) return;
      const state = get();
      const selectedIds = new Set(state.nodes.filter((n) => n.selected).map((n) => n.id));
      if (state.selectedNodeId) selectedIds.add(state.selectedNodeId);
      if (selectedIds.size === 0) return;

      get().saveSnapshot();
      set((state) => {
        const updatedNodes = state.nodes.filter((node) => !selectedIds.has(node.id));
        const updatedEdges = state.edges.filter(
          (edge) => !selectedIds.has(edge.source) && !selectedIds.has(edge.target)
        );
        syncAndPersist(updatedNodes, updatedEdges, state.layoutMode, state.theme, state.drawings);
        return {
          nodes: updatedNodes,
          edges: updatedEdges,
          selectedNodeId: null,
          isInspectorOpen: false,
        };
      });
    },

    duplicateSelectedNodes: () => {
      if (get().isViewerMode) return;
      const state = get();
      let selectedNodes = state.nodes.filter((n) => n.selected);
      if (selectedNodes.length === 0 && state.selectedNodeId) {
        const single = state.nodes.find((n) => n.id === state.selectedNodeId);
        if (single) selectedNodes = [single];
      }
      if (selectedNodes.length === 0) return;

      get().saveSnapshot();
      const idMap = new Map<string, string>();
      const timestamp = Date.now();
      const duplicatedNodes: BoardNode[] = selectedNodes.map((nodeToDup, idx) => {
        const prefix = nodeToDup.type === 'imageNode' ? 'img' : nodeToDup.type === 'textNode' ? 'text' : 'node';
        const newId = `${prefix}_${timestamp}_${idx}`;
        idMap.set(nodeToDup.id, newId);
        return {
          ...nodeToDup,
          id: newId,
          position: {
            x: nodeToDup.position.x + 50,
            y: nodeToDup.position.y + 50,
          },
          selected: true,
        };
      });

      const duplicatedEdges: StrategyEdge[] = [];
      state.edges.forEach((edge, idx) => {
        if (idMap.has(edge.source) && idMap.has(edge.target)) {
          duplicatedEdges.push({
            ...edge,
            id: `edge_${timestamp}_${idx}`,
            source: idMap.get(edge.source)!,
            target: idMap.get(edge.target)!,
          });
        }
      });

      set((state) => {
        const unselectedNodes = state.nodes.map((n) => ({ ...n, selected: false }));
        const updatedNodes = [...unselectedNodes, ...duplicatedNodes];
        const updatedEdges = [...state.edges, ...duplicatedEdges];
        syncAndPersist(updatedNodes, updatedEdges, state.layoutMode, state.theme, state.drawings);
        return {
          nodes: updatedNodes,
          edges: updatedEdges,
          selectedNodeId: duplicatedNodes.length === 1 ? duplicatedNodes[0].id : null,
        };
      });
    },

    updateEdge: (id, data) => {
      if (get().isViewerMode) return;
      get().saveSnapshot();
      set((state) => {
        const updatedEdges = state.edges.map((edge) => {
          if (edge.id === id) {
            return {
              ...edge,
              ...data,
              data: {
                ...edge.data,
                ...data,
              },
            };
          }
          return edge;
        });
        syncAndPersist(state.nodes, updatedEdges, state.layoutMode, state.theme, state.drawings);
        return { edges: updatedEdges };
      });
    },

    deleteEdge: (id) => {
      if (get().isViewerMode) return;
      get().saveSnapshot();
      set((state) => {
        const updatedEdges = state.edges.filter((e) => e.id !== id);
        syncAndPersist(state.nodes, updatedEdges, state.layoutMode, state.theme, state.drawings);
        return {
          edges: updatedEdges,
          selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
        };
      });
    },

    setLayoutMode: (mode) => {
      if (get().isViewerMode) return;
      set({ layoutMode: mode });
      get().applyCurrentLayout();
    },

    applyCurrentLayout: async () => {
      if (get().isViewerMode) return;
      const { nodes, edges, layoutMode, theme, drawings } = get();
      if (layoutMode === 'freeform') return;

      get().saveSnapshot();
      const newNodes = await computeLayout(nodes, edges, layoutMode);
      set({ nodes: newNodes });
      syncAndPersist(newNodes, edges, layoutMode, theme, drawings);
    },

    undo: () => {
      if (get().isViewerMode) return;
      const { undoStack, redoStack, nodes, edges, drawings, theme, layoutMode } = get();
      if (undoStack.length === 0) return;

      const previous = undoStack[undoStack.length - 1];
      const newUndo = undoStack.slice(0, -1);
      const newRedo = [
        ...redoStack,
        {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          drawings: JSON.parse(JSON.stringify(drawings || [])),
          timestamp: Date.now(),
        },
      ];

      set({
        nodes: previous.nodes,
        edges: previous.edges,
        drawings: previous.drawings || [],
        undoStack: newUndo,
        redoStack: newRedo,
      });
      syncAndPersist(previous.nodes, previous.edges, layoutMode, theme, previous.drawings || []);
    },

    redo: () => {
      if (get().isViewerMode) return;
      const { undoStack, redoStack, nodes, edges, drawings, theme, layoutMode } = get();
      if (redoStack.length === 0) return;

      const next = redoStack[redoStack.length - 1];
      const newRedo = redoStack.slice(0, -1);
      const newUndo = [
        ...undoStack,
        {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          drawings: JSON.parse(JSON.stringify(drawings || [])),
          timestamp: Date.now(),
        },
      ];

      set({
        nodes: next.nodes,
        edges: next.edges,
        drawings: next.drawings || [],
        undoStack: newUndo,
        redoStack: newRedo,
      });
      syncAndPersist(next.nodes, next.edges, layoutMode, theme, next.drawings || []);
    },

    resetToDefault: () => {
      if (get().isViewerMode) return;
      const { accessKey } = get();
      const isOwner = isOwnerAccessKey(accessKey || '');
      get().saveSnapshot();
      const defaultNodes = isOwner ? INITIAL_NODES : [];
      const defaultEdges = isOwner ? INITIAL_EDGES : [];
      set({
        nodes: defaultNodes,
        edges: defaultEdges,
        drawings: [],
        layoutMode: 'freeform',
        selectedNodeId: null,
        selectedEdgeId: null,
      });
      syncAndPersist(defaultNodes, defaultEdges, 'freeform', get().theme, []);
    },

    exportJson: () => {
      return get().exportProjectJson();
    },

    importJson: (jsonString) => {
      return get().importProjectFromJson(jsonString);
    },

    // ==================== COLLABORATION & MULTIPLAYER ACTIONS ====================
    setCollabUserName: (name: string) => {
      const updated = collabManager.updateUser({ name });
      set({ collabUser: updated });
    },

    setCollabUserColor: (color: string) => {
      const updated = collabManager.updateUser({ color });
      set({ collabUser: updated });
    },

    setUserRole: (role: UserRole) => {
      set({ userRole: role, isViewerMode: role === 'viewer' });
      collabManager.updateUser({ role });
    },

    setIsAuditDrawerOpen: (open: boolean) => {
      set({ isAuditDrawerOpen: open });
      if (open) get().fetchAuditLogs();
    },

    setIsVersionHistoryModalOpen: (open: boolean) => {
      set({ isVersionHistoryModalOpen: open });
      if (open) get().fetchVersions();
    },

    setIsShareModalOpen: (open: boolean) => {
      set({ isShareModalOpen: open });
    },

    broadcastCursor: (x: number, y: number, activeNodeId?: string | null) => {
      collabManager.broadcastCursor(x, y, activeNodeId);
    },

    fetchAuditLogs: async () => {
      const logs = await collabManager.fetchAuditLogs();
      set({ auditLogs: logs });
    },

    fetchVersions: async () => {
      const versions = await collabManager.fetchVersions();
      set({ versions });
    },

    createVersionCheckpoint: async (label?: string) => {
      const { currentProjectId, nodes, edges, drawings, layoutMode, theme } = get();
      if (!currentProjectId) return;
      const snapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        drawings: JSON.parse(JSON.stringify(drawings || [])),
        layoutMode,
        theme,
      };
      const ver = await collabManager.createVersionCheckpoint(label || 'Контрольная точка', snapshot, true);
      if (ver) {
        set((state) => ({ versions: [ver, ...state.versions] }));
        get().fetchAuditLogs();
      }
    },

    restoreVersionCheckpoint: async (versionId: string) => {
      const res = await collabManager.restoreVersion(versionId);
      if (res.success && res.snapshot) {
        const snap = res.snapshot;
        const newNodes = snap.nodes || [];
        const newEdges = snap.edges || [];
        const newDrawings = snap.drawings || [];
        const newLayout = (snap.layoutMode as LayoutMode) || get().layoutMode;
        const newTheme = (snap.theme as ThemeMode) || get().theme;

        set({
          nodes: newNodes,
          edges: newEdges,
          drawings: newDrawings,
          layoutMode: newLayout,
          theme: newTheme,
          previewingVersion: null,
          isViewerMode: get().userRole === 'viewer',
          undoStack: [],
          redoStack: [],
        });

        syncAndPersist(newNodes, newEdges, newLayout, newTheme, newDrawings);
        get().fetchAuditLogs();
        get().fetchVersions();
      }
    },

    setPreviewingVersion: (version: ProjectVersion | null) => {
      if (version) {
        if (!originalStateBeforePreview) {
          originalStateBeforePreview = {
            nodes: get().nodes,
            edges: get().edges,
            drawings: get().drawings,
            layoutMode: get().layoutMode,
            theme: get().theme,
          };
        }
        set({
          previewingVersion: version,
          nodes: version.snapshot.nodes || [],
          edges: version.snapshot.edges || [],
          drawings: version.snapshot.drawings || [],
          layoutMode: (version.snapshot.layoutMode as LayoutMode) || 'freeform',
          theme: (version.snapshot.theme as ThemeMode) || 'dark',
          isViewerMode: true,
        });
      } else {
        if (originalStateBeforePreview) {
          set({
            nodes: originalStateBeforePreview.nodes,
            edges: originalStateBeforePreview.edges,
            drawings: originalStateBeforePreview.drawings,
            layoutMode: originalStateBeforePreview.layoutMode,
            theme: originalStateBeforePreview.theme,
            previewingVersion: null,
            isViewerMode: get().userRole === 'viewer',
          });
          originalStateBeforePreview = null;
        } else {
          set({
            previewingVersion: null,
            isViewerMode: get().userRole === 'viewer',
          });
        }
      }
    },

    initCollaboration: (projectId: string, role?: UserRole) => {
      if (!projectId) return;
      get().cleanupCollaboration();
      const currentRole = role || get().userRole;
      collabManager.init(projectId, currentRole);

      collabManager.subscribePresence((peers) => {
        set({ collabPeers: peers });
      });

      collabManager.subscribeCursors((cursors) => {
        set({ collabCursors: cursors });
      });

      collabManager.subscribeSelections((selections) => {
        set({ collabSelections: selections });
      });

      collabManager.subscribe((msg) => {
        const state = get();
        if (state.previewingVersion) return;

        switch (msg.type) {
          case 'nodes_moved': {
            const posMap = new Map(msg.nodePositions.map((p) => [p.id, p.position]));
            const updated = state.nodes.map((node) => {
              const newPos = posMap.get(node.id);
              if (newPos) {
                return { ...node, position: newPos };
              }
              return node;
            });
            set({ nodes: updated });
            break;
          }

          case 'node_update': {
            const updated = state.nodes.map((node) => {
              if (node.id === msg.id) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    ...msg.data,
                  },
                };
              }
              return node;
            });
            set({ nodes: updated as BoardNode[] });
            break;
          }

          case 'node_add': {
            if (!state.nodes.some((n) => n.id === msg.node.id)) {
              set({ nodes: [...state.nodes, msg.node] });
            }
            break;
          }

          case 'node_delete': {
            set({
              nodes: state.nodes.filter((n) => n.id !== msg.id),
              edges: state.edges.filter((e) => e.source !== msg.id && e.target !== msg.id),
              selectedNodeId: state.selectedNodeId === msg.id ? null : state.selectedNodeId,
            });
            break;
          }

          case 'edge_add': {
            if (!state.edges.some((e) => e.id === msg.edge.id)) {
              set({ edges: [...state.edges, msg.edge] });
            }
            break;
          }

          case 'edge_delete': {
            set({
              edges: state.edges.filter((e) => e.id !== msg.id),
              selectedEdgeId: state.selectedEdgeId === msg.id ? null : state.selectedEdgeId,
            });
            break;
          }

          case 'drawing_add': {
            set({ drawings: [...state.drawings, msg.stroke] });
            break;
          }

          case 'drawing_delete': {
            set({ drawings: state.drawings.filter((d) => d.id !== msg.id) });
            break;
          }

          case 'drawings_clear': {
            set({ drawings: [] });
            break;
          }

          case 'version_restored': {
            if (msg.snapshot) {
              set({
                nodes: msg.snapshot.nodes || [],
                edges: msg.snapshot.edges || [],
                drawings: msg.snapshot.drawings || [],
                layoutMode: (msg.snapshot.layoutMode as LayoutMode) || state.layoutMode,
                theme: (msg.snapshot.theme as ThemeMode) || state.theme,
                previewingVersion: null,
              });
              get().fetchAuditLogs();
              get().fetchVersions();
            }
            break;
          }
        }
      });

      get().fetchAuditLogs();
      get().fetchVersions();
    },

    cleanupCollaboration: () => {
      collabManager.cleanup();
      set({
        collabPeers: [],
        collabCursors: {},
        collabSelections: {},
      });
    },

    loadSharedProject: async (options) => {
      const { shareToken, projectId, role: forcedRole } = options;
      if (!shareToken && !projectId) return;

      set({ cloudSyncStatus: 'syncing' });
      const res = await collabManager.fetchSharedProject({
        shareToken: shareToken || undefined,
        projectId: projectId || undefined,
      });

      if (res && res.project) {
        const proj = res.project;
        const effectiveRole: UserRole = forcedRole || res.role || 'viewer';
        const isViewer = effectiveRole === 'viewer';

        set((state) => {
          const existingIdx = state.projects.findIndex((p) => p.id === proj.id);
          const updatedProjects = existingIdx >= 0
            ? state.projects.map((p) => (p.id === proj.id ? proj : p))
            : [proj, ...state.projects];

          return {
            projects: updatedProjects,
            currentProjectId: proj.id,
            nodes: proj.nodes || [],
            edges: proj.edges || [],
            drawings: proj.drawings || [],
            layoutMode: proj.layoutMode || 'freeform',
            theme: proj.theme || 'dark',
            userRole: effectiveRole,
            isViewerMode: isViewer,
            cloudSyncStatus: 'synced',
            isAuthenticated: true,
          };
        });

        get().initCollaboration(proj.id, effectiveRole);
      } else {
        set({ cloudSyncStatus: 'error' });
      }
    },
  };
});

// Attach global API for browser agents (Aside, DevTools, Playwright)
if (typeof window !== 'undefined') {
  (window as any).__GENNETY_WORKSPACE__ = {
    getStore: () => useBoardStore.getState(),
    getAccessKey: () => useBoardStore.getState().accessKey,
    getProjects: () => useBoardStore.getState().projects,
    getActiveProject: () => {
      const s = useBoardStore.getState();
      return s.projects.find((p) => p.id === s.currentProjectId) || s.projects[0];
    },
    exportFullSnapshot: () => {
      const s = useBoardStore.getState();
      return {
        version: '2.0.0',
        accessKey: s.accessKey,
        currentProjectId: s.currentProjectId,
        totalProjects: s.projects.length,
        projects: s.projects,
        activeProject: s.projects.find((p) => p.id === s.currentProjectId) || s.projects[0],
      };
    },
    searchNodes: (query: string) => {
      const q = (query || '').toLowerCase().trim();
      const s = useBoardStore.getState();
      const matches: any[] = [];
      for (const proj of s.projects) {
        for (const n of proj.nodes || []) {
          const d = (n as any).data || {};
          const text = `${d.title || ''} ${d.description || ''} ${d.badge || ''} ${d.keyMetric || ''} ${d.outcome || ''} ${(d.tags || []).join(' ')}`.toLowerCase();
          if (text.includes(q)) {
            matches.push({ projectId: proj.id, projectTitle: proj.title, node: n });
          }
        }
      }
      return matches;
    },
    openAiBridge: () => useBoardStore.getState().setIsAiBridgeModalOpen(true),
  };

  // Trigger bi-directional sync with Supabase Cloud Database on startup
  if (initialBoot.accessKey && initialBoot.accessKey !== 'guest_shared') {
    useBoardStore.getState().syncWithCloudDatabase(initialBoot.accessKey);
  }

  // If entered via shared link or shared project, fetch it
  const shareParams = getShareParamsFromUrl();
  if (shareParams.shareToken || (shareParams.projectId && shareParams.role)) {
    useBoardStore.getState().loadSharedProject({
      shareToken: shareParams.shareToken,
      projectId: shareParams.projectId,
      role: shareParams.role,
    });
  }
}


