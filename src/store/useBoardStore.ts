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
  LayoutMode, 
  BoardSnapshot, 
  StrategyNodeData, 
  ThemeMode,
  CanvasProject,
  ProjectTemplate,
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
} from '../lib/projectStorage';

const MAX_HISTORY = 30;

export interface BoardStore {
  // Auth
  accessKey: string | null;
  isAuthenticated: boolean;
  login: (key: string) => { success: boolean; error?: string };
  logout: () => void;
  generateAndSetKey: () => string;

  // Projects & Workspace
  projects: CanvasProject[];
  currentProjectId: string;
  isSaving: boolean;
  lastSavedAt: number | null;
  isCabinetOpen: boolean;
  isNewProjectModalOpen: boolean;

  // Active Canvas Data
  nodes: StrategyNode[];
  edges: StrategyEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  layoutMode: LayoutMode;
  theme: ThemeMode;
  searchQuery: string;
  isInspectorOpen: boolean;
  
  // History
  undoStack: BoardSnapshot[];
  redoStack: BoardSnapshot[];

  // Project Actions
  setIsCabinetOpen: (open: boolean) => void;
  setIsNewProjectModalOpen: (open: boolean) => void;
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
  setNodes: (nodes: StrategyNode[]) => void;
  setEdges: (edges: StrategyEdge[]) => void;
  onNodesChange: (changes: NodeChange<StrategyNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<StrategyEdge>[]) => void;
  onConnect: (connection: Connection) => void;

  // Selection & UI
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setIsInspectorOpen: (open: boolean) => void;
  setTheme: (theme: ThemeMode) => void;

  // Node CRUD
  addNode: (nodeData: Partial<StrategyNodeData>, position?: { x: number; y: number }) => string;
  updateNode: (id: string, data: Partial<StrategyNodeData>) => void;
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
}

// Initial bootstrap from stored key or demo
function bootstrap() {
  const storedKey = getStoredKey();
  if (!storedKey) {
    return {
      accessKey: null,
      isAuthenticated: false,
      projects: [],
      currentProjectId: '',
      nodes: INITIAL_NODES,
      edges: INITIAL_EDGES,
      layoutMode: 'freeform' as LayoutMode,
      theme: 'dark' as ThemeMode,
    };
  }

  const { projects, activeProjectId } = loadProjectsForUser(storedKey);
  const activeProj = projects.find((p) => p.id === activeProjectId) || projects[0];

  return {
    accessKey: storedKey,
    isAuthenticated: true,
    projects,
    currentProjectId: activeProj ? activeProj.id : '',
    nodes: activeProj ? activeProj.nodes : INITIAL_NODES,
    edges: activeProj ? activeProj.edges : INITIAL_EDGES,
    layoutMode: (activeProj ? activeProj.layoutMode : 'freeform') as LayoutMode,
    theme: (activeProj ? activeProj.theme : 'dark') as ThemeMode,
  };
}

const initialBoot = bootstrap();

export const useBoardStore = create<BoardStore>((set, get) => {
  // Helper to persist current active project into projects list and localStorage
  const syncAndPersist = (
    nodes: StrategyNode[],
    edges: StrategyEdge[],
    layoutMode: LayoutMode,
    theme: ThemeMode
  ) => {
    const { accessKey, projects, currentProjectId } = get();
    if (!accessKey || !currentProjectId) return;

    const now = Date.now();
    const updatedProjects = projects.map((p) => {
      if (p.id === currentProjectId) {
        return {
          ...p,
          nodes,
          edges,
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
  };

  return {
    // Auth State
    accessKey: initialBoot.accessKey,
    isAuthenticated: initialBoot.isAuthenticated,

    // Projects State
    projects: initialBoot.projects,
    currentProjectId: initialBoot.currentProjectId,
    isSaving: false,
    lastSavedAt: Date.now(),
    isCabinetOpen: false,
    isNewProjectModalOpen: false,

    // Active Canvas
    nodes: initialBoot.nodes,
    edges: initialBoot.edges,
    selectedNodeId: null,
    selectedEdgeId: null,
    layoutMode: initialBoot.layoutMode,
    theme: initialBoot.theme,
    searchQuery: '',
    isInspectorOpen: false,

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

    logout: () => {
      clearStoredKey();
      set({
        accessKey: null,
        isAuthenticated: false,
        isCabinetOpen: false,
        selectedNodeId: null,
        selectedEdgeId: null,
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

    switchProject: (projectId: string) => {
      const { projects, accessKey } = get();
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;

      if (accessKey) {
        saveActiveProjectIdForUser(accessKey, target.id);
      }

      set({
        currentProjectId: target.id,
        nodes: target.nodes,
        edges: target.edges,
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

    createProject: (title: string, template: ProjectTemplate = 'blueprint', description = '') => {
      const { accessKey, projects } = get();
      if (!accessKey) return '';

      const cleanTitle = title.trim() || (template === 'blueprint' ? 'Retention Strategy Project' : 'Новый холст');
      const newProject: CanvasProject = template === 'blueprint' 
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
        const data = JSON.parse(jsonString);
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          return { success: false, error: 'Неверный формат JSON: отсутствуют массивы nodes и edges' };
        }

        const { accessKey, projects } = get();
        if (!accessKey) return { success: false, error: 'Необходима авторизация' };

        const now = Date.now();
        const importedProject: CanvasProject = {
          id: `proj_${now}_imported`,
          title: titleOverride || data.title || data.project || `Импортированный проект ${new Date().toLocaleDateString()}`,
          description: data.description || 'Импортировано из внешнего JSON файла.',
          nodes: data.nodes,
          edges: data.edges,
          layoutMode: data.layoutMode || 'freeform',
          theme: data.theme || 'dark',
          createdAt: now,
          updatedAt: now,
          tags: ['Imported'],
          isFavorite: false,
        };

        const updatedProjects = [importedProject, ...projects];
        saveProjectsForUser(accessKey, updatedProjects);
        saveActiveProjectIdForUser(accessKey, importedProject.id);

        set({
          projects: updatedProjects,
          currentProjectId: importedProject.id,
          nodes: importedProject.nodes,
          edges: importedProject.edges,
          layoutMode: importedProject.layoutMode,
          theme: importedProject.theme,
          selectedNodeId: null,
          selectedEdgeId: null,
          undoStack: [],
          redoStack: [],
          isCabinetOpen: false,
          lastSavedAt: now,
        });

        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Ошибка парсинга JSON';
        return { success: false, error: msg };
      }
    },

    exportProjectJson: (projectId?: string) => {
      const { projects, currentProjectId, nodes, edges, layoutMode, theme } = get();
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

    saveSnapshot: () => {
      const { nodes, edges, undoStack } = get();
      const newSnapshot: BoardSnapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        timestamp: Date.now(),
      };
      const updatedUndo = [...undoStack, newSnapshot].slice(-MAX_HISTORY);
      set({ undoStack: updatedUndo, redoStack: [] });
    },

    onNodesChange: (changes) => {
      set((state) => {
        const updatedNodes = applyNodeChanges(changes, state.nodes);
        
        const selectChange = changes.find((c) => c.type === 'select');
        let newSelectedId = state.selectedNodeId;
        if (selectChange && 'selected' in selectChange) {
          if (selectChange.selected) {
            newSelectedId = selectChange.id;
          } else if (state.selectedNodeId === selectChange.id) {
            newSelectedId = null;
          }
        }

        const hasPosChange = changes.some((c) => c.type === 'position' && !c.dragging);
        if (hasPosChange) {
          syncAndPersist(updatedNodes, state.edges, state.layoutMode, state.theme);
        }

        return {
          nodes: updatedNodes,
          selectedNodeId: newSelectedId,
          isInspectorOpen: newSelectedId ? true : state.isInspectorOpen,
        };
      });
    },

    onEdgesChange: (changes) => {
      set((state) => {
        const updatedEdges = applyEdgeChanges(changes, state.edges);
        
        const selectChange = changes.find((c) => c.type === 'select');
        let newSelectedId = state.selectedEdgeId;
        if (selectChange && 'selected' in selectChange) {
          if (selectChange.selected) {
            newSelectedId = selectChange.id;
          } else if (state.selectedEdgeId === selectChange.id) {
            newSelectedId = null;
          }
        }

        syncAndPersist(state.nodes, updatedEdges, state.layoutMode, state.theme);
        return {
          edges: updatedEdges,
          selectedEdgeId: newSelectedId,
        };
      });
    },

    onConnect: (connection) => {
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
    },

    setSelectedNodeId: (id) => {
      set((state) => ({
        selectedNodeId: id,
        selectedEdgeId: id ? null : state.selectedEdgeId,
        isInspectorOpen: Boolean(id),
      }));
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

      return id;
    },

    updateNode: (id, data) => {
      get().saveSnapshot();
      set((state) => {
        const updatedNodes = state.nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            };
          }
          return node;
        });
        syncAndPersist(updatedNodes, state.edges, state.layoutMode, state.theme);
        return { nodes: updatedNodes };
      });
    },

    deleteNode: (id) => {
      get().saveSnapshot();
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
    },

    duplicateNode: (id) => {
      const nodeToDup = get().nodes.find((n) => n.id === id);
      if (!nodeToDup) return;

      get().saveSnapshot();
      const newId = `node_${Date.now()}`;
      const duplicatedNode: StrategyNode = {
        ...nodeToDup,
        id: newId,
        position: {
          x: nodeToDup.position.x + 40,
          y: nodeToDup.position.y + 40,
        },
        data: {
          ...nodeToDup.data,
          title: `${nodeToDup.data.title} (Копия)`,
        },
        selected: true,
      };

      set((state) => {
        const unselectedNodes = state.nodes.map((n) => ({ ...n, selected: false }));
        const updatedNodes = [...unselectedNodes, duplicatedNode];
        syncAndPersist(updatedNodes, state.edges, state.layoutMode, state.theme);
        return {
          nodes: updatedNodes,
          selectedNodeId: newId,
          isInspectorOpen: true,
        };
      });
    },

    updateEdge: (id, data) => {
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
        syncAndPersist(state.nodes, updatedEdges, state.layoutMode, state.theme);
        return { edges: updatedEdges };
      });
    },

    deleteEdge: (id) => {
      get().saveSnapshot();
      set((state) => {
        const updatedEdges = state.edges.filter((e) => e.id !== id);
        syncAndPersist(state.nodes, updatedEdges, state.layoutMode, state.theme);
        return {
          edges: updatedEdges,
          selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
        };
      });
    },

    setLayoutMode: (mode) => {
      set({ layoutMode: mode });
      get().applyCurrentLayout();
    },

    applyCurrentLayout: async () => {
      const { nodes, edges, layoutMode, theme } = get();
      if (layoutMode === 'freeform') return;

      get().saveSnapshot();
      const newNodes = await computeLayout(nodes, edges, layoutMode);
      set({ nodes: newNodes });
      syncAndPersist(newNodes, edges, layoutMode, theme);
    },

    undo: () => {
      const { undoStack, redoStack, nodes, edges, theme, layoutMode } = get();
      if (undoStack.length === 0) return;

      const previous = undoStack[undoStack.length - 1];
      const newUndo = undoStack.slice(0, -1);
      const newRedo = [
        ...redoStack,
        { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), timestamp: Date.now() },
      ];

      set({
        nodes: previous.nodes,
        edges: previous.edges,
        undoStack: newUndo,
        redoStack: newRedo,
      });
      syncAndPersist(previous.nodes, previous.edges, layoutMode, theme);
    },

    redo: () => {
      const { undoStack, redoStack, nodes, edges, theme, layoutMode } = get();
      if (redoStack.length === 0) return;

      const next = redoStack[redoStack.length - 1];
      const newRedo = redoStack.slice(0, -1);
      const newUndo = [
        ...undoStack,
        { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), timestamp: Date.now() },
      ];

      set({
        nodes: next.nodes,
        edges: next.edges,
        undoStack: newUndo,
        redoStack: newRedo,
      });
      syncAndPersist(next.nodes, next.edges, layoutMode, theme);
    },

    resetToDefault: () => {
      get().saveSnapshot();
      set({
        nodes: INITIAL_NODES,
        edges: INITIAL_EDGES,
        layoutMode: 'freeform',
        selectedNodeId: null,
        selectedEdgeId: null,
      });
      syncAndPersist(INITIAL_NODES, INITIAL_EDGES, 'freeform', get().theme);
    },

    exportJson: () => {
      return get().exportProjectJson();
    },

    importJson: (jsonString) => {
      return get().importProjectFromJson(jsonString);
    },
  };
});
