const STORAGE_AUTH_KEY = 'gnty_access_key';

/**
 * Generates an executive-grade unique access key.
 * Format: GNTY-XXXX-XXXX-XXXX (12 hex digits in 3 blocks)
 */
export function generateAccessKey(): string {
  const bytes = new Uint8Array(6);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');

  // Format as GNTY-XXXX-XXXX-XXXX
  return `GNTY-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/**
 * Validates the provided access key.
 */
export function validateAccessKey(rawKey: string): { valid: boolean; error?: string; formattedKey?: string } {
  const trimmed = rawKey.trim();
  if (!trimmed) {
    return { valid: false, error: 'Пожалуйста, введите ключ доступа.' };
  }

  if (trimmed.length < 4) {
    return { valid: false, error: 'Ключ доступа должен содержать не менее 4 символов.' };
  }

  return { valid: true, formattedKey: trimmed };
}

export function getShareParamsFromUrl(): {
  shareToken: string | null;
  projectId: string | null;
  role: 'viewer' | 'editor' | null;
} {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const shareToken = params.get('share') || params.get('token');
      const projectId = params.get('p') || params.get('project') || params.get('projectId');
      const roleParam = params.get('role')?.toLowerCase();
      const role = roleParam === 'viewer' ? 'viewer' : (roleParam === 'editor' ? 'editor' : null);

      return {
        shareToken: shareToken ? shareToken.trim() : null,
        projectId: projectId ? projectId.trim() : null,
        role,
      };
    }
  } catch {
    // ignore
  }
  return { shareToken: null, projectId: null, role: null };
}

/**
 * Returns the stored access key or null if not authenticated.
 * Also checks URL query parameters (?key=... or ?accessKey=...) for instant one-click login.
 */
export function getStoredKey(): string | null {
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlKey = params.get('key') || params.get('accessKey');
      if (urlKey && urlKey.trim().length >= 4) {
        const cleanKey = urlKey.trim();
        setStoredKey(cleanKey);
        return cleanKey;
      }
    }
    return localStorage.getItem(STORAGE_AUTH_KEY);
  } catch {
    return null;
  }
}

/**
 * Returns the production or current origin URL with the access key embedded for one-click auth.
 */
export function getDirectAuthUrl(key: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://gennety-retention-canvas.vercel.app');
  return `${base}/?key=${encodeURIComponent(key.trim())}`;
}

/**
 * Returns the API endpoint URL with the access key embedded.
 */
export function getApiWorkspaceUrl(key: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://gennety-retention-canvas.vercel.app');
  return `${base}/api/workspace?key=${encodeURIComponent(key.trim())}`;
}

/**
 * Saves the access key to localStorage.
 */
export function setStoredKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_AUTH_KEY, key.trim());
  } catch (e) {
    console.error('Failed to store access key:', e);
  }
}

/**
 * Clears the stored access key from localStorage.
 */
export function clearStoredKey(): void {
  try {
    localStorage.removeItem(STORAGE_AUTH_KEY);
  } catch (e) {
    console.error('Failed to remove access key:', e);
  }
}

/**
 * Masks an access key for secure display in UI (e.g., GNTY-••••-••••-9F2A).
 */
export function maskAccessKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return key.slice(0, 2) + '••••' + key.slice(-2);
  const prefix = key.slice(0, 5);
  const suffix = key.slice(-4);
  return `${prefix}••••-••••-${suffix}`;
}
