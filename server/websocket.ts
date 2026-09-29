import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface CollabPeer {
  ws: WebSocket;
  userId: string;
  userName: string;
  userColor: string;
  role: string;
  projectId: string;
}

// Map from projectId -> Set of peers
const rooms = new Map<string, Set<CollabPeer>>();
// Map from WebSocket instance -> CollabPeer
const peerByWs = new Map<WebSocket, CollabPeer>();

let wssInstance: WebSocketServer | null = null;

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wssInstance = wss;

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (raw: Buffer | string) => {
      try {
        const data = JSON.parse(raw.toString());
        handleWsMessage(ws, data);
      } catch (err: any) {
        console.warn('[WS] Malformed message received:', err.message);
      }
    });

    ws.on('close', () => {
      handleDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.warn('[WS] Client socket error:', err.message);
      handleDisconnect(ws);
    });
  });

  return wss;
}

function handleWsMessage(ws: WebSocket, msg: any) {
  const { type, projectId } = msg || {};

  if (type === 'ping') {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
    }
    return;
  }

  // 1. Join project room
  if (type === 'subscribe') {
    const user = msg.user || {};
    const targetProjectId = projectId || 'default';

    // Remove existing membership if any
    handleDisconnect(ws, false);

    const peer: CollabPeer = {
      ws,
      userId: user.id || `anon_${Date.now()}`,
      userName: user.name || 'Пользователь',
      userColor: user.color || '#10B981',
      role: user.role || 'editor',
      projectId: targetProjectId,
    };

    peerByWs.set(ws, peer);

    if (!rooms.has(targetProjectId)) {
      rooms.set(targetProjectId, new Set());
    }
    rooms.get(targetProjectId)!.add(peer);

    // Notify room of new presence
    broadcastToProject(
      targetProjectId,
      {
        type: 'presence_join',
        user: {
          id: peer.userId,
          name: peer.userName,
          color: peer.userColor,
          role: peer.role,
        },
      },
      ws
    );

    // Send active peers back to the newly joined peer
    const activePeers = Array.from(rooms.get(targetProjectId)!).map((p) => ({
      id: p.userId,
      name: p.userName,
      color: p.userColor,
      role: p.role,
    }));

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'subscribed',
          projectId: targetProjectId,
          peers: activePeers,
        })
      );
    }
    return;
  }

  // 2. Cursor movements & real-time events
  const currentPeer = peerByWs.get(ws);
  if (!currentPeer) return;

  const activeProjectId = currentPeer.projectId;

  if (type === 'cursor') {
    broadcastToProject(
      activeProjectId,
      {
        type: 'cursor_move',
        cursor: msg.cursor,
      },
      ws
    );
  } else if (type === 'node_move') {
    broadcastToProject(
      activeProjectId,
      {
        type: 'node_positions',
        positions: msg.positions,
        userId: currentPeer.userId,
      },
      ws
    );
  } else if (type === 'event') {
    broadcastToProject(activeProjectId, msg.event, ws);
  }
}

function handleDisconnect(ws: WebSocket, notify = true) {
  const peer = peerByWs.get(ws);
  if (!peer) return;

  peerByWs.delete(ws);
  const room = rooms.get(peer.projectId);
  if (room) {
    room.delete(peer);
    if (room.size === 0) {
      rooms.delete(peer.projectId);
    } else if (notify) {
      broadcastToProject(peer.projectId, {
        type: 'presence_leave',
        userId: peer.userId,
      });
    }
  }
}

/**
 * Broadcast an arbitrary payload to all connected peers in a project room.
 */
export function broadcastToProject(projectId: string, payload: any, excludeWs?: WebSocket) {
  const room = rooms.get(projectId);
  if (!room || room.size === 0) return;

  const data = JSON.stringify(payload);
  for (const peer of room) {
    if (peer.ws !== excludeWs && peer.ws.readyState === WebSocket.OPEN) {
      try {
        peer.ws.send(data);
      } catch (err: any) {
        console.warn(`[WS] Send error to peer ${peer.userId}:`, err.message);
      }
    }
  }
}

export function getConnectedPeersCount(projectId?: string): number {
  if (projectId) {
    return rooms.get(projectId)?.size || 0;
  }
  return peerByWs.size;
}
