import type { CanvasProject } from '../types';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export interface RemoteWorkspaceResponse {
  success: boolean;
  projects?: CanvasProject[];
  activeProjectId?: string;
  updatedAt?: number;
  error?: string;
}

/**
 * Attempts to load workspace from local dev or production /api/workspace endpoint.
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

    const data = await res.json();
    if (data && data.success && Array.isArray(data.projects)) {
      return data;
    }
    return null;
  } catch {
    // Non-blocking fallback for offline/disconnected environments
    return null;
  }
}

/**
 * Debounced push of user's active workspace state to /api/workspace.
 */
export function pushLocalWorkspaceToApi(
  accessKey: string,
  projects: CanvasProject[],
  activeProjectId: string,
  delayMs = 1500
): void {
  if (!accessKey || !projects || projects.length === 0) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    try {
      await fetch('/api/workspace', {
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
    } catch {
      // Non-blocking catch
    }
  }, delayMs);
}
