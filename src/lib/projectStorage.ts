import type { CanvasProject, LayoutMode, ThemeMode, UserWorkspaceBackup } from '../types';
import { INITIAL_NODES, INITIAL_EDGES } from '../constants/initialData';

const LEGACY_STORAGE_KEY = 'genity_blueprint_state_v2';

function getStoragePrefix(accessKey: string): string {
  // Normalize key to safe alphanumeric string
  const clean = accessKey.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `gnty_ws_${clean}`;
}

export function getProjectsStorageKey(accessKey: string): string {
  return `${getStoragePrefix(accessKey)}_projects`;
}

export function getActiveProjectStorageKey(accessKey: string): string {
  return `${getStoragePrefix(accessKey)}_active_id`;
}

/**
 * Creates a default starter Retention Blueprint project.
 */
export function createDefaultBlueprintProject(customTitle = 'Retention Flywheel (Основной)'): CanvasProject {
  const now = Date.now();
  return {
    id: `proj_${now}_default`,
    title: customTitle,
    description: 'Мастер-стратегия удержания пользователей Gennety: циклы, психология, ритуалы и аппаратные триггеры.',
    nodes: JSON.parse(JSON.stringify(INITIAL_NODES)),
    edges: JSON.parse(JSON.stringify(INITIAL_EDGES)),
    layoutMode: 'freeform',
    theme: 'dark',
    createdAt: now,
    updatedAt: now,
    tags: ['Master Template', 'Retention Flywheel'],
    isFavorite: true,
  };
}

/**
 * Creates a blank project.
 */
export function createBlankProject(title = 'Новый Canvas проект', description = ''): CanvasProject {
  const now = Date.now();
  return {
    id: `proj_${now}_blank`,
    title,
    description,
    nodes: [],
    edges: [],
    layoutMode: 'freeform',
    theme: 'dark',
    createdAt: now,
    updatedAt: now,
    tags: ['Custom'],
    isFavorite: false,
  };
}

/**
 * Determines whether an access key belongs to the verified owner of the Retention Blueprint.
 */
export function isOwnerAccessKey(accessKey: string): boolean {
  if (!accessKey) return false;
  const clean = accessKey.trim().toUpperCase();
  if (
    clean === 'GNTY-PRO-MASTER-2026' ||
    clean === 'GNTY-DEMO-2026-CORE' ||
    clean.startsWith('GNTY-OWNER-') ||
    clean.startsWith('GNTY-MASTER-')
  ) {
    return true;
  }

  if (typeof window !== 'undefined' && localStorage.getItem('gnty_owner_account_verified') === accessKey) {
    return true;
  }

  return false;
}

/**
 * Check for legacy local data from genity_blueprint_state_v2 and migrate only once to the owner.
 */
function tryMigrateLegacyData(targetAccessKey: string): CanvasProject | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      const now = Date.now();
      // Remove legacy storage so no subsequent key ever picks it up
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.setItem('gnty_owner_account_verified', targetAccessKey);

      return {
        id: `proj_${now}_migrated`,
        title: 'Retention Canvas (Основная стратегия)',
        description: 'Ваша мастер-стратегия удержания пользователей Gennety.',
        nodes: parsed.nodes,
        edges: parsed.edges,
        layoutMode: parsed.layoutMode || 'freeform',
        theme: parsed.theme || 'dark',
        createdAt: parsed.updatedAt || now,
        updatedAt: parsed.updatedAt || now,
        tags: ['Основной'],
        isFavorite: true,
      };
    }
  } catch (e) {
    console.warn('Failed to migrate legacy data:', e);
  }
  return null;
}

/**
 * Loads all projects for a specific access key.
 */
export function loadProjectsForUser(accessKey: string): { projects: CanvasProject[]; activeProjectId: string } {
  const projectsKey = getProjectsStorageKey(accessKey);
  const activeKey = getActiveProjectStorageKey(accessKey);

  try {
    const raw = localStorage.getItem(projectsKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let activeId = localStorage.getItem(activeKey) || '';
        const found = parsed.find((p: CanvasProject) => p.id === activeId);
        if (!found) {
          activeId = parsed[0].id;
          localStorage.setItem(activeKey, activeId);
        }
        return { projects: parsed, activeProjectId: activeId };
      }
    }
  } catch (e) {
    console.error('Failed to load projects from localStorage:', e);
  }

  // If no projects found for this key:
  const isOwner = isOwnerAccessKey(accessKey);
  const migrated = tryMigrateLegacyData(accessKey);

  let initialProject: CanvasProject;

  if (migrated) {
    // 1. Owner's migrated personal project
    initialProject = migrated;
  } else if (isOwner) {
    // 2. Owner's master key gets the proprietary Retention Blueprint
    initialProject = createDefaultBlueprintProject();
  } else {
    // 3. ANY OTHER / NEW / PUBLIC ACCOUNT:
    // Starts with a 100% clean, blank canvas. Confidential Retention Blueprint is NEVER created for new users!
    initialProject = createBlankProject('Мой проект', 'Чистый холст для создания вашей схемы.');
  }

  const projects = [initialProject];
  const activeProjectId = initialProject.id;

  // Persist initialized state
  saveProjectsForUser(accessKey, projects);
  saveActiveProjectIdForUser(accessKey, activeProjectId);

  return { projects, activeProjectId };
}

/**
 * Saves projects array to localStorage for the given access key.
 */
export function saveProjectsForUser(accessKey: string, projects: CanvasProject[]): void {
  const projectsKey = getProjectsStorageKey(accessKey);
  try {
    localStorage.setItem(projectsKey, JSON.stringify(projects));
  } catch (e) {
    console.warn('[Storage] localStorage quota exceeded, trimming heavy media for local cache:', e);
    try {
      // Create a lightweight local copy without huge base64 data URIs so node topology is never lost
      const prunedProjects = projects.map((p) => ({
        ...p,
        nodes: p.nodes.map((n) => {
          if (n.data && typeof (n.data as any).imageUrl === 'string' && (n.data as any).imageUrl.startsWith('data:')) {
            // Drop heavy local base64 preview for localStorage, full version is safe in Cloud DB
            return {
              ...n,
              data: {
                ...n.data,
                imageUrl: undefined,
                _hasCloudMedia: true,
              },
            };
          }
          return n;
        }),
      }));
      localStorage.setItem(projectsKey, JSON.stringify(prunedProjects));
    } catch (innerErr) {
      console.error('[Storage] Critical: could not persist even pruned projects to localStorage:', innerErr);
    }
  }
}

/**
 * Saves active project ID for the given access key.
 */
export function saveActiveProjectIdForUser(accessKey: string, activeProjectId: string): void {
  try {
    const activeKey = getActiveProjectStorageKey(accessKey);
    localStorage.setItem(activeKey, activeProjectId);
  } catch (e) {
    console.error('Failed to save active project ID:', e);
  }
}

/**
 * Exports full workspace backup as JSON string.
 */
export function exportWorkspaceBackup(accessKey: string, projects: CanvasProject[], activeProjectId: string): string {
  const backup: UserWorkspaceBackup = {
    version: '2.0.0',
    accessKey,
    exportedAt: new Date().toISOString(),
    activeProjectId,
    projects,
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Validates and imports full workspace backup from JSON string.
 */
export function importWorkspaceBackup(
  jsonString: string,
  targetAccessKey: string
): { success: boolean; projects?: CanvasProject[]; activeProjectId?: string; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.projects) || parsed.projects.length === 0) {
      return { success: false, error: 'Неверный формат резервной копии: отсутствуют проекты.' };
    }

    // Validate that each project has id, nodes, edges
    const validatedProjects: CanvasProject[] = parsed.projects.map((p: Partial<CanvasProject>, idx: number) => ({
      id: p.id || `proj_${Date.now()}_${idx}`,
      title: p.title || `Импортированный проект ${idx + 1}`,
      description: p.description || '',
      nodes: Array.isArray(p.nodes) ? p.nodes : [],
      edges: Array.isArray(p.edges) ? p.edges : [],
      layoutMode: (['freeform', 'pyramid', 'flywheel'].includes(p.layoutMode as LayoutMode) ? p.layoutMode : 'freeform') as LayoutMode,
      theme: (['dark', 'light', 'graphite', 'monochrome', 'stone', 'slate', 'sand', 'mist'].includes(p.theme as ThemeMode) ? p.theme : 'dark') as ThemeMode,
      createdAt: p.createdAt || Date.now(),
      updatedAt: Date.now(),
      tags: Array.isArray(p.tags) ? p.tags : ['Imported'],
      isFavorite: Boolean(p.isFavorite),
    }));

    const activeProjectId = validatedProjects.find((p) => p.id === parsed.activeProjectId)?.id || validatedProjects[0].id;

    saveProjectsForUser(targetAccessKey, validatedProjects);
    saveActiveProjectIdForUser(targetAccessKey, activeProjectId);

    return {
      success: true,
      projects: validatedProjects,
      activeProjectId,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Ошибка разбора JSON файла';
    return { success: false, error: msg };
  }
}
