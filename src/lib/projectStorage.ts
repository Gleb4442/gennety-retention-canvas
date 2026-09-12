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
 * Check for legacy local data from genity_blueprint_state_v2 and migrate if available.
 */
function tryMigrateLegacyData(): CanvasProject | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      const now = Date.now();
      return {
        id: `proj_${now}_migrated`,
        title: 'Retention Canvas (Сохранённая схема)',
        description: 'Схема, автоматически перенесённая из предыдущей локальной сессии.',
        nodes: parsed.nodes,
        edges: parsed.edges,
        layoutMode: parsed.layoutMode || 'freeform',
        theme: parsed.theme || 'dark',
        createdAt: parsed.updatedAt || now,
        updatedAt: parsed.updatedAt || now,
        tags: ['Миграция'],
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

  // If no projects found for this key, check legacy data migration
  const migrated = tryMigrateLegacyData();
  const initialProject = migrated || createDefaultBlueprintProject();
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
  try {
    const projectsKey = getProjectsStorageKey(accessKey);
    localStorage.setItem(projectsKey, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects to localStorage:', e);
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
      theme: (['dark', 'light', 'graphite', 'monochrome'].includes(p.theme as ThemeMode) ? p.theme : 'dark') as ThemeMode,
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
