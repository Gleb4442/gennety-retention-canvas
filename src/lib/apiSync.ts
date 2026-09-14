import type { CanvasProject } from '../types';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface RemoteWorkspaceResponse {
  success: boolean;
  projects?: CanvasProject[];
  activeProjectId?: string;
  updatedAt?: number;
  storage?: string;
  error?: string;
  notFound?: boolean;
}

/**
 * Attempts to load workspace from Supabase Postgres cloud database via /api/workspace endpoint.
 * Returns null if network fails or endpoint is unreachable.
 */
export async function fetchRemoteWorkspace(accessKey: string): Promise<RemoteWorkspaceResponse | null> {
  if (!accessKey) return null;

  try {
    const res = await fetch(`/api/workspace?key=${encodeURIComponent(accessKey.trim())}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data: RemoteWorkspaceResponse = await res.json();
    if (data && (data.success || data.notFound)) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn('[Cloud Sync] Failed to fetch remote workspace:', err);
    return null;
  }
}

/**
 * Debounced push of user's active workspace state to cloud database (/api/workspace).
 */
export function pushLocalWorkspaceToApi(
  accessKey: string,
  projects: CanvasProject[],
  activeProjectId: string,
  delayMs = 1000,
  onStatusChange?: (status: CloudSyncStatus) => void
): void {
  if (!accessKey || !projects || projects.length === 0) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  if (onStatusChange) {
    onStatusChange('syncing');
  }

  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessKey: accessKey.trim(),
          projects,
          activeProjectId,
          syncedAt: Date.now(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          if (onStatusChange) onStatusChange('synced');
          return;
        }
      }

      if (onStatusChange) onStatusChange('error');
    } catch (err) {
      console.warn('[Cloud Sync] Network error during push to cloud DB:', err);
      if (onStatusChange) onStatusChange('offline');
    }
  }, delayMs);
}
