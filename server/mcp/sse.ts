import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { handleMessage, TOOLS } from '../../mcp/index.js';
import { broadcastToProject } from '../websocket.js';

const router = Router();

interface McpSession {
  id: string;
  res: Response;
  createdAt: number;
  lastActive: number;
}

const activeSessions = new Map<string, McpSession>();

// Periodic keepalive for all active SSE connections (every 15 seconds)
setInterval(() => {
  for (const [sessionId, session] of activeSessions.entries()) {
    try {
      session.res.write(': keepalive ping\n\n');
      session.lastActive = Date.now();
    } catch {
      activeSessions.delete(sessionId);
    }
  }
}, 15000);

// GET /mcp - Metadata & Diagnostics
router.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Gennety Canvas Remote MCP Server',
    version: '2.0.0 (Render Edition)',
    status: 'online',
    timestamp: new Date().toISOString(),
    capabilities: {
      transports: ['sse', 'http-post', 'stdio'],
      toolsCount: TOOLS.length,
      realtimeSync: true,
    },
    endpoints: {
      sse: '/mcp/sse',
      message: '/mcp/message?sessionId={sessionId}',
      direct: '/mcp',
      health: '/health',
      websocket: '/ws',
    },
    tools: TOOLS.map((t: any) => ({
      name: t.name,
      description: t.description,
    })),
  });
});

// GET /mcp/sse - Standard MCP Server-Sent Events Endpoint
router.get('/sse', (req: Request, res: Response) => {
  const sessionId = `mcp_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

  // SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`: Gennety Canvas MCP SSE Connected\n\n`);
  // Send endpoint discovery event per MCP SSE spec
  res.write(`event: endpoint\ndata: /mcp/message?sessionId=${sessionId}\n\n`);

  const session: McpSession = {
    id: sessionId,
    res,
    createdAt: Date.now(),
    lastActive: Date.now(),
  };

  activeSessions.set(sessionId, session);

  req.on('close', () => {
    activeSessions.delete(sessionId);
  });
});

// POST /mcp/message - MCP Message endpoint for an SSE session
router.post('/message', async (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId as string) || (req.body?.sessionId as string);
  const session = sessionId ? activeSessions.get(sessionId) : null;

  try {
    const rpcRequest = req.body;
    if (!rpcRequest || typeof rpcRequest !== 'object') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Invalid JSON-RPC payload.' },
      });
    }

    const rpcResponse = await handleMessage(rpcRequest);

    // If a tool modified project state, broadcast event via WebSocket
    if (rpcRequest.method === 'tools/call' && rpcResponse && !rpcResponse.error) {
      const toolName = rpcRequest.params?.name;
      const toolArgs = rpcRequest.params?.arguments || {};
      const targetProjectId = toolArgs.projectId;

      if (targetProjectId) {
        broadcastToProject(targetProjectId, {
          type: 'mcp_mutation',
          tool: toolName,
          timestamp: Date.now(),
        });
      }
    }

    // 1. Deliver to SSE channel if active
    if (session && session.res.writable) {
      session.lastActive = Date.now();
      session.res.write(`event: message\ndata: ${JSON.stringify(rpcResponse)}\n\n`);
    }

    // 2. Also return in HTTP POST response for maximum client compatibility
    return res.status(200).json(rpcResponse || { jsonrpc: '2.0', id: rpcRequest.id, result: {} });
  } catch (err: any) {
    console.error('[MCP /message Error]:', err);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32603, message: err.message || 'Internal MCP error.' },
    });
  }
});

// POST /mcp - Direct JSON-RPC endpoint (Streamless / Simple HTTP)
router.post('/', async (req: Request, res: Response) => {
  try {
    const rpcRequest = req.body;
    if (!rpcRequest || typeof rpcRequest !== 'object') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Invalid JSON-RPC payload.' },
      });
    }

    const rpcResponse = await handleMessage(rpcRequest);

    // Check for canvas mutations
    if (rpcRequest.method === 'tools/call' && rpcResponse && !rpcResponse.error) {
      const toolName = rpcRequest.params?.name;
      const toolArgs = rpcRequest.params?.arguments || {};
      const targetProjectId = toolArgs.projectId;

      if (targetProjectId) {
        broadcastToProject(targetProjectId, {
          type: 'mcp_mutation',
          tool: toolName,
          timestamp: Date.now(),
        });
      }
    }

    return res.status(200).json(rpcResponse || { jsonrpc: '2.0', id: rpcRequest.id, result: {} });
  } catch (err: any) {
    console.error('[MCP /direct Error]:', err);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32603, message: err.message || 'Internal MCP error.' },
    });
  }
});

export default router;
