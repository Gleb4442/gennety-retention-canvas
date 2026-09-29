import type {
  CollabUser,
  CollabCursor,
  CollabEventMessage,
  AuditLogEntry,
  ProjectVersion,
  ProjectVersionSnapshot,
  ProjectShareLink,
  UserRole,
} from '../types';

const COLLAB_PROFILE_KEY = 'gnty_collab_profile';

const CURSOR_COLORS = [
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#14B8A6', // Teal
  '#F43F5E', // Rose
];

export function getLocalUser(): CollabUser {
  try {
    const raw = localStorage.getItem(COLLAB_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.id && parsed.name) {
        return {
          ...parsed,
          isSelf: true,
          lastActiveAt: Date.now(),
        };
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randomColor = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
  const newUser: CollabUser = {
    id: `usr_${Date.now()}_${randomHex.toLowerCase()}`,
    name: `Участник-${randomHex}`,
    color: randomColor,
    role: 'editor',
    isSelf: true,
    lastActiveAt: Date.now(),
  };

  try {
    localStorage.setItem(COLLAB_PROFILE_KEY, JSON.stringify(newUser));
  } catch {
    // ignore
  }

  return newUser;
}

export function saveLocalUser(updates: Partial<CollabUser>): CollabUser {
  const current = getLocalUser();
  const updated: CollabUser = {
    ...current,
    ...updates,
    isSelf: true,
    lastActiveAt: Date.now(),
  };
  try {
    localStorage.setItem(COLLAB_PROFILE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export class CollaborationManager {
  private projectId: string = '';
  private user: CollabUser;
  private channel: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private pollTimer: any = null;
  private lastPollTs: number = Date.now();
  private cursorThrottleTimer: any = null;
  private pendingCursor: CollabCursor | null = null;
  private nodeMoveThrottleTimer: any = null;
  private pendingNodePositions: Array<{ id: string; position: { x: number; y: number } }> | null = null;

  private onEventCallbacks: Set<(msg: CollabEventMessage) => void> = new Set();
  private onPresenceCallbacks: Set<(users: CollabUser[]) => void> = new Set();
  private onCursorsCallbacks: Set<(cursors: Record<string, CollabCursor>) => void> = new Set();
  private onSelectionsCallbacks: Set<(selections: Record<string, { userId: string; userName: string; color: string }>) => void> = new Set();

  private activePeers: Map<string, CollabUser> = new Map();
  private remoteCursors: Map<string, CollabCursor> = new Map();
  private remoteSelections: Map<string, { userId: string; userName: string; color: string }> = new Map();

  constructor() {
    this.user = getLocalUser();
  }

  public init(projectId: string, role: UserRole = 'editor') {
    if (this.projectId === projectId && (this.channel || this.ws)) {
      return;
    }

    this.cleanup();
    this.projectId = projectId;
    this.user.role = role;

    // 1. Setup local cross-tab BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.channel = new BroadcastChannel(`gnty_collab_${projectId}`);
        this.channel.onmessage = (ev) => {
          if (ev.data && typeof ev.data === 'object') {
            this.handleIncomingMessage(ev.data as CollabEventMessage);
          }
        };
      }
    } catch (e) {
      console.warn('[Collab] BroadcastChannel unavailable:', e);
    }

    // 2. Setup Real-time WebSocket connection to Render server
    this.setupWebSocket(projectId);

    // 3. Start Presence Heartbeat (every 4 seconds)
    this.broadcastHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.broadcastHeartbeat();
      this.purgeStalePeers();
    }, 4000);

    // 4. Start API Poll bus (every 4 seconds as a background fallback)
    this.lastPollTs = Date.now();
    this.pollTimer = setInterval(() => {
      this.pollRemoteEvents();
    }, 4000);

    // 5. Cleanup on page leave
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  private setupWebSocket(projectId: string) {
    if (typeof window === 'undefined') return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            projectId,
            user: this.user,
          })
        );
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (!data || typeof data !== 'object') return;

          if (data.type === 'subscribed') {
            if (Array.isArray(data.peers)) {
              data.peers.forEach((p: any) => {
                if (p.id !== this.user.id) {
                  this.activePeers.set(p.id, { ...p, isSelf: false, lastActiveAt: Date.now() });
                }
              });
              this.notifyPresence();
            }
          } else if (data.type === 'cursor_move') {
            if (data.cursor && data.cursor.userId !== this.user.id) {
              this.remoteCursors.set(data.cursor.userId, data.cursor);
              this.notifyCursors();
            }
          } else if (data.type === 'node_positions') {
            if (data.positions && data.userId !== this.user.id) {
              this.onEventCallbacks.forEach((cb) =>
                cb({
                  type: 'nodes_moved',
                  nodePositions: data.positions,
                  user: { id: data.userId, name: 'Участник', color: '#10B981', role: 'editor', isSelf: false },
                } as any)
              );
            }
          } else if (data.type === 'presence_join') {
            if (data.user && data.user.id !== this.user.id) {
              this.activePeers.set(data.user.id, { ...data.user, isSelf: false, lastActiveAt: Date.now() });
              this.notifyPresence();
            }
          } else if (data.type === 'presence_leave') {
            if (data.userId) {
              this.activePeers.delete(data.userId);
              this.remoteCursors.delete(data.userId);
              this.notifyPresence();
              this.notifyCursors();
            }
          } else if (['mcp_mutation', 'workspace_saved', 'project_synced', 'version_restored'].includes(data.type)) {
            // Live notifications from remote MCP agents or cloud
            this.onEventCallbacks.forEach((cb) => cb(data as any));
          } else if (data.type) {
            this.handleIncomingMessage(data as CollabEventMessage);
          }
        } catch {
          // ignore parsing error
        }
      };

      ws.onclose = () => {
        this.ws = null;
        if (this.projectId === projectId) {
          this.wsReconnectTimer = setTimeout(() => this.setupWebSocket(projectId), 3000);
        }
      };
    } catch (e) {
      console.warn('[Collab] WebSocket connection error, using HTTP polling fallback:', e);
    }
  }

  private handleBeforeUnload = () => {
    this.postMessage({ type: 'presence_leave', userId: this.user.id });
  };

  public cleanup() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.cursorThrottleTimer) clearTimeout(this.cursorThrottleTimer);
    if (this.nodeMoveThrottleTimer) clearTimeout(this.nodeMoveThrottleTimer);
    if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    if (this.channel) {
      this.postMessage({ type: 'presence_leave', userId: this.user.id });
      try {
        this.channel.close();
      } catch {
        // ignore
      }
      this.channel = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }

    this.activePeers.clear();
    this.remoteCursors.clear();
    this.remoteSelections.clear();
    this.onEventCallbacks.clear();
    this.onPresenceCallbacks.clear();
    this.onCursorsCallbacks.clear();
    this.onSelectionsCallbacks.clear();
  }

  public updateUser(updates: Partial<CollabUser>): CollabUser {
    this.user = saveLocalUser(updates);
    this.broadcastHeartbeat();
    return this.user;
  }

  public getCurrentUser(): CollabUser {
    return this.user;
  }

  public getActivePeers(): CollabUser[] {
    return Array.from(this.activePeers.values());
  }

  public getRemoteCursors(): Record<string, CollabCursor> {
    const obj: Record<string, CollabCursor> = {};
    for (const [id, cursor] of this.remoteCursors.entries()) {
      obj[id] = cursor;
    }
    return obj;
  }

  public getRemoteSelections(): Record<string, { userId: string; userName: string; color: string }> {
    const obj: Record<string, { userId: string; userName: string; color: string }> = {};
    for (const [nodeId, user] of this.remoteSelections.entries()) {
      obj[nodeId] = user;
    }
    return obj;
  }

  public subscribe(onEvent: (msg: CollabEventMessage) => void) {
    this.onEventCallbacks.add(onEvent);
    return () => this.onEventCallbacks.delete(onEvent);
  }

  public subscribePresence(onPresence: (users: CollabUser[]) => void) {
    this.onPresenceCallbacks.add(onPresence);
    onPresence(this.getActivePeers());
    return () => this.onPresenceCallbacks.delete(onPresence);
  }

  public subscribeCursors(onCursors: (cursors: Record<string, CollabCursor>) => void) {
    this.onCursorsCallbacks.add(onCursors);
    onCursors(this.getRemoteCursors());
    return () => this.onCursorsCallbacks.delete(onCursors);
  }

  public subscribeSelections(onSelections: (selections: Record<string, { userId: string; userName: string; color: string }>) => void) {
    this.onSelectionsCallbacks.add(onSelections);
    onSelections(this.getRemoteSelections());
    return () => this.onSelectionsCallbacks.delete(onSelections);
  }

  // -------------------------------------------------------------
  // Message Emission & Throttling
  // -------------------------------------------------------------
  private postMessage(msg: CollabEventMessage) {
    // 1. Post to local BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (e) {
        console.warn('[Collab] postMessage error:', e);
      }
    }

    // 2. Stream instantly to WebSocket server if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        if (msg.type === 'cursor_move') {
          this.ws.send(JSON.stringify({ type: 'cursor', projectId: this.projectId, cursor: (msg as any).cursor }));
        } else if (msg.type === 'nodes_moved') {
          this.ws.send(JSON.stringify({ type: 'node_move', projectId: this.projectId, positions: (msg as any).nodePositions }));
        } else {
          this.ws.send(JSON.stringify({ type: 'event', projectId: this.projectId, event: msg }));
        }
      } catch (e) {
        // ignore send error
      }
    }

    // 3. Publish to API event bus asynchronously for cross-device peers
    if (!['cursor_move', 'presence_heartbeat'].includes(msg.type)) {
      fetch(`/api/collaboration?action=publish_event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: this.projectId, event: msg }),
      }).catch(() => {});
    }
  }

  public broadcastCursor(x: number, y: number, activeNodeId?: string | null) {
    this.pendingCursor = {
      userId: this.user.id,
      userName: this.user.name,
      color: this.user.color,
      x,
      y,
      activeNodeId,
      lastUpdated: Date.now(),
    };

    if (!this.cursorThrottleTimer) {
      this.cursorThrottleTimer = setTimeout(() => {
        if (this.pendingCursor) {
          this.postMessage({ type: 'cursor_move', cursor: this.pendingCursor });
          this.pendingCursor = null;
        }
        this.cursorThrottleTimer = null;
      }, 40); // 25 fps cursor update
    }
  }

  public broadcastNodeSelection(nodeId: string | null) {
    this.postMessage({
      type: 'node_selection',
      nodeId,
      user: this.user,
    });
  }

  public broadcastNodesMoved(nodePositions: Array<{ id: string; position: { x: number; y: number } }>) {
    this.pendingNodePositions = nodePositions;
    if (!this.nodeMoveThrottleTimer) {
      this.nodeMoveThrottleTimer = setTimeout(() => {
        if (this.pendingNodePositions && this.pendingNodePositions.length > 0) {
          this.postMessage({
            type: 'nodes_moved',
            nodePositions: this.pendingNodePositions,
            user: this.user,
          });
          this.pendingNodePositions = null;
        }
        this.nodeMoveThrottleTimer = null;
      }, 50);
    }
  }

  public broadcastMutation(
    msg: CollabEventMessage,
    auditPayload?: { actionType: string; summary: string; targetId?: string; diff?: any }
  ) {
    this.postMessage(msg);

    // Save to server audit log
    if (auditPayload && this.projectId) {
      fetch(`/api/collaboration?action=create_audit_log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.projectId,
          userId: this.user.id,
          userName: this.user.name,
          userColor: this.user.color,
          actionType: auditPayload.actionType,
          targetId: auditPayload.targetId,
          summary: auditPayload.summary,
          diff: auditPayload.diff,
        }),
      }).catch((err) => console.warn('[Collab] Failed to write audit log:', err));
    }
  }

  private broadcastHeartbeat() {
    this.postMessage({
      type: 'presence_heartbeat',
      user: {
        ...this.user,
        lastActiveAt: Date.now(),
      },
    });
  }

  // -------------------------------------------------------------
  // Message Handling
  // -------------------------------------------------------------
  private handleIncomingMessage(msg: CollabEventMessage) {
    switch (msg.type) {
      case 'presence_heartbeat': {
        if (msg.user.id === this.user.id) return;
        this.activePeers.set(msg.user.id, { ...msg.user, isSelf: false });
        this.notifyPresence();
        break;
      }

      case 'presence_leave': {
        if (msg.userId === this.user.id) return;
        this.activePeers.delete(msg.userId);
        this.remoteCursors.delete(msg.userId);
        // Clear remote selections for this user
        for (const [nodeId, u] of this.remoteSelections.entries()) {
          if (u.userId === msg.userId) {
            this.remoteSelections.delete(nodeId);
          }
        }
        this.notifyPresence();
        this.notifyCursors();
        this.notifySelections();
        break;
      }

      case 'cursor_move': {
        if (msg.cursor.userId === this.user.id) return;
        this.remoteCursors.set(msg.cursor.userId, msg.cursor);
        this.notifyCursors();
        break;
      }

      case 'node_selection': {
        if (msg.user.id === this.user.id) return;
        // Clear previous selections for this user
        for (const [nodeId, u] of this.remoteSelections.entries()) {
          if (u.userId === msg.user.id) {
            this.remoteSelections.delete(nodeId);
          }
        }
        if (msg.nodeId) {
          this.remoteSelections.set(msg.nodeId, {
            userId: msg.user.id,
            userName: msg.user.name,
            color: msg.user.color,
          });
        }
        this.notifySelections();
        break;
      }

      default: {
        // Forward mutations (nodes_moved, node_update, edge_add, etc.) to subscribers
        this.onEventCallbacks.forEach((cb) => cb(msg));
        break;
      }
    }
  }

  private purgeStalePeers() {
    const now = Date.now();
    let changed = false;
    for (const [id, peer] of this.activePeers.entries()) {
      if (now - peer.lastActiveAt > 10000) {
        this.activePeers.delete(id);
        this.remoteCursors.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.notifyPresence();
      this.notifyCursors();
    }
  }

  private async pollRemoteEvents() {
    if (!this.projectId) return;
    try {
      const res = await fetch(`/api/collaboration?action=poll_events&project_id=${encodeURIComponent(this.projectId)}&since=${this.lastPollTs}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success && Array.isArray(data.events)) {
        this.lastPollTs = data.now || Date.now();
        for (const ev of data.events) {
          // If the event came from another device, apply it
          if (ev.user?.id !== this.user.id && ev.userId !== this.user.id) {
            this.handleIncomingMessage(ev);
          }
        }
      }
    } catch {
      // ignore network errors
    }
  }

  private notifyPresence() {
    const peers = this.getActivePeers();
    this.onPresenceCallbacks.forEach((cb) => cb(peers));
  }

  private notifyCursors() {
    const cursors = this.getRemoteCursors();
    this.onCursorsCallbacks.forEach((cb) => cb(cursors));
  }

  private notifySelections() {
    const selections = this.getRemoteSelections();
    this.onSelectionsCallbacks.forEach((cb) => cb(selections));
  }

  // -------------------------------------------------------------
  // REST API Helpers: Audit Logs, Versions & Shares
  // -------------------------------------------------------------
  public async fetchAuditLogs(): Promise<AuditLogEntry[]> {
    if (!this.projectId) return [];
    try {
      const res = await fetch(`/api/collaboration?action=get_audit_logs&project_id=${encodeURIComponent(this.projectId)}`);
      if (res.ok) {
        const data = await res.json();
        return data.logs || [];
      }
    } catch (e) {
      console.warn('[Collab] Failed to fetch audit logs:', e);
    }
    return [];
  }

  public async fetchVersions(): Promise<ProjectVersion[]> {
    if (!this.projectId) return [];
    try {
      const res = await fetch(`/api/collaboration?action=get_versions&project_id=${encodeURIComponent(this.projectId)}`);
      if (res.ok) {
        const data = await res.json();
        return data.versions || [];
      }
    } catch (e) {
      console.warn('[Collab] Failed to fetch versions:', e);
    }
    return [];
  }

  public async createVersionCheckpoint(
    label: string,
    snapshot: ProjectVersionSnapshot,
    isManual = true
  ): Promise<ProjectVersion | null> {
    if (!this.projectId) return null;
    try {
      const res = await fetch(`/api/collaboration?action=create_version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.projectId,
          label,
          isManual,
          snapshot,
          createdByName: this.user.name,
          createdById: this.user.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.version || null;
      }
    } catch (e) {
      console.warn('[Collab] Failed to create version:', e);
    }
    return null;
  }

  public async restoreVersion(versionId: string): Promise<{ success: boolean; snapshot?: ProjectVersionSnapshot; summary?: string }> {
    if (!this.projectId) return { success: false };
    try {
      const res = await fetch(`/api/collaboration?action=restore_version`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.projectId,
          versionId,
          user: this.user,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.snapshot) {
          // Broadcast version restore event to all peers
          this.postMessage({
            type: 'version_restored',
            versionNumber: data.restoredVersionNumber || 1,
            snapshot: data.snapshot,
            user: this.user,
          });
          return data;
        }
      }
    } catch (e) {
      console.warn('[Collab] Failed to restore version:', e);
    }
    return { success: false };
  }

  public async fetchShares(): Promise<ProjectShareLink[]> {
    if (!this.projectId) return [];
    try {
      const res = await fetch(`/api/collaboration?action=get_shares&project_id=${encodeURIComponent(this.projectId)}`);
      if (res.ok) {
        const data = await res.json();
        return (data.shares || []).map((s: any) => ({
          id: s.id,
          projectId: s.projectId || s.project_id || this.projectId,
          shareToken: s.shareToken || s.share_token,
          role: s.role || 'viewer',
          isActive: Boolean(s.isActive ?? s.is_active ?? true),
          createdAt: s.createdAt || s.created_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn('[Collab] Failed to fetch shares:', e);
    }
    return [];
  }

  public async createShare(role: 'viewer' | 'editor'): Promise<ProjectShareLink | null> {
    if (!this.projectId) return null;
    try {
      const res = await fetch(`/api/collaboration?action=create_share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.projectId,
          role,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.share) {
          const s = data.share;
          return {
            id: s.id,
            projectId: s.projectId || s.project_id || this.projectId,
            shareToken: s.shareToken || s.share_token,
            role: s.role || role,
            isActive: Boolean(s.isActive ?? s.is_active ?? true),
            createdAt: s.createdAt || s.created_at || new Date().toISOString(),
          };
        }
        return null;
      }
    } catch (e) {
      console.warn('[Collab] Failed to create share:', e);
    }
    return null;
  }

  public async revokeShare(shareToken: string, ownerKey?: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/collaboration?action=revoke_share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken, ownerKey }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async fetchSharedProject(options: {
    projectId?: string;
    shareToken?: string;
  }): Promise<{
    project: any;
    role: 'viewer' | 'editor';
  } | null> {
    try {
      const params = new URLSearchParams();
      if (options.shareToken) params.append('share_token', options.shareToken);
      if (options.projectId) params.append('project_id', options.projectId);
      const res = await fetch(`/api/collaboration?action=get_project&${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.project) {
          return {
            project: data.project,
            role: data.role || 'editor',
          };
        }
      }
    } catch (e) {
      console.warn('[Collab] Failed to fetch shared project:', e);
    }
    return null;
  }
}

// Global Singleton Instance
export const collabManager = new CollaborationManager();
