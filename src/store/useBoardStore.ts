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
  LayoutMode, 
  BoardSnapshot, 
  StrategyNodeData, 
  ThemeMode,
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
  isSettingsOpen: boolean;
  isImportJsonModalOpen: boolean;

  // Active Canvas Data
  nodes: (StrategyNode | ImageNode)[];
  edges: StrategyEdge[];
  drawings: DrawingStroke[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  layoutMode: LayoutMode;
  theme: ThemeMode;
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

  // History
  undoStack: BoardSnapshot[];
  redoStack: BoardSnapshot[];

  // Project Actions
  setIsCabinetOpen: (open: boolean) => void;
  setIsNewProjectModalOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsImportJsonModalOpen: (open: boolean) => void;
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
  setNodes: (nodes: (StrategyNode | ImageNode)[]) => void;
  setEdges: (edges: StrategyEdge[]) => void;
  onNodesChange: (changes: NodeChange<StrategyNode | ImageNode>[]) => void;
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
  updateNode: (id: string, data: Partial<StrategyNodeData | ImageNodeData>) => void;
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
      nodes: [],
      edges: [],
      drawings: [],
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
    nodes: activeProj ? (activeProj.nodes || []) : [],
    edges: activeProj ? (activeProj.edges || []) : [],
    drawings: activeProj ? (activeProj.drawings || []) : [],
    layoutMode: (activeProj ? activeProj.layoutMode : 'freeform') as LayoutMode,
    theme: (activeProj ? activeProj.theme : 'dark') as ThemeMode,
  };
}

const initialBoot = bootstrap();

export const useBoardStore = create<BoardStore>((set, get) => {
  // Helper to persist current active project into projects list and localStorage
  const syncAndPersist = (
    nodes: (StrategyNode | ImageNode)[],
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
    isSettingsOpen: false,
    isImportJsonModalOpen: false,

    // Active Canvas
    nodes: initialBoot.nodes,
    edges: initialBoot.edges,
    drawings: initialBoot.drawings || [],
    selectedNodeId: null,
    selectedEdgeId: null,
    layoutMode: initialBoot.layoutMode,
    theme: initialBoot.theme,
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
      get().saveSnapshot();
      set((state) => {
        const updated = [...state.drawings, stroke];
        syncAndPersist(state.nodes, state.edges, state.layoutMode, state.theme, updated);
        return { drawings: updated };
      });
    },
    deleteDrawingStroke: (id) => {
      get().saveSnapshot();
      set((state) => {
        const updated = state.drawings.filter((d) => d.id !== id);
        syncAndPersist(state.nodes, state.edges, state.layoutMode, state.theme, updated);
        return { drawings: updated };
      });
    },
    clearDrawings: () => {
      get().saveSnapshot();
      set((state) => {
        syncAndPersist(state.nodes, state.edges, state.layoutMode, state.theme, []);
        return { drawings: [] };
      });
    },

    // Lightbox Modal
    lightboxImageUrl: null,
    lightboxTitle: undefined,
    openLightbox: (url, title) => set({ lightboxImageUrl: url, lightboxTitle: title }),
    closeLightbox: () => set({ lightboxImageUrl: null, lightboxTitle: undefined }),

    // Standalone Image Node on Canvas
    addImageNode: (imageUrl, position, title, caption) => {
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
    setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),
    setIsImportJsonModalOpen: (open) => set({ isImportJsonModalOpen: open }),

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
      set((state) => {
        const updatedNodes = applyNodeChanges(changes, state.nodes);
        
        const selectedNodes = updatedNodes.filter((n) => n.selected);
        let newSelectedId = state.selectedNodeId;

        if (selectedNodes.length === 1) {
          newSelectedId = selectedNodes[0].id;
        } else if (selectedNodes.length === 0) {
          newSelectedId = null;
        } else {
          // Multiple nodes selected via box selection
          newSelectedId = null;
        }

        const hasPosChange = changes.some((c) => c.type === 'position' && !c.dragging);
        if (hasPosChange) {
          get().saveSnapshot();
          syncAndPersist(updatedNodes, state.edges, state.layoutMode, state.theme, state.drawings);
        }

        return {
          nodes: updatedNodes,
          selectedNodeId: newSelectedId,
          // Only open inspector if exactly 1 node is selected; keep closed for multi-node selection to avoid blocking the canvas
          isInspectorOpen: selectedNodes.length === 1 ? true : (selectedNodes.length > 1 ? false : state.isInspectorOpen),
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
        const updatedNodes: (StrategyNode | ImageNode)[] = state.nodes.map((node) => {
          if (node.id === id) {
            if (node.type === 'imageNode') {
              return {
                ...node,
                data: {
                  ...node.data,
                  ...data,
                },
              } as ImageNode;
            } else {
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
      const newId = `${nodeToDup.type === 'imageNode' ? 'img' : 'node'}_${Date.now()}`;

      let duplicatedNode: StrategyNode | ImageNode;
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
      const duplicatedNodes: (StrategyNode | ImageNode)[] = selectedNodes.map((nodeToDup, idx) => {
        const newId = `${nodeToDup.type === 'imageNode' ? 'img' : 'node'}_${timestamp}_${idx}`;
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
      set({ layoutMode: mode });
      get().applyCurrentLayout();
    },

    applyCurrentLayout: async () => {
      const { nodes, edges, layoutMode, theme, drawings } = get();
      if (layoutMode === 'freeform') return;

      get().saveSnapshot();
      const newNodes = await computeLayout(nodes, edges, layoutMode);
      set({ nodes: newNodes });
      syncAndPersist(newNodes, edges, layoutMode, theme, drawings);
    },

    undo: () => {
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
  };
});
