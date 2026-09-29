import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDbPool } from './db.js';
import { setupWebSocket, getConnectedPeersCount } from './websocket.js';
import workspaceRouter from './routes/workspace.js';
import collaborationRouter from './routes/collaboration.js';
import mcpRouter from './mcp/sse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || '10000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Global Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health & Metrics Check
app.get('/health', async (_req, res) => {
  const db = getDbPool();
  let dbStatus = 'disconnected';
  let dbLatencyMs = -1;

  if (db) {
    const start = Date.now();
    try {
      await db.query('SELECT 1');
      dbStatus = 'connected';
      dbLatencyMs = Date.now() - start;
    } catch (err: any) {
      dbStatus = `error: ${err.message}`;
    }
  }

  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    websocket: {
      activePeersCount: getConnectedPeersCount(),
    },
    mcp: {
      remoteEnabled: true,
      endpoints: ['/mcp/sse', '/mcp/message', '/mcp'],
    },
  });
});

// Mount API & Remote MCP Routes
app.use('/api/workspace', workspaceRouter);
app.use('/api/collaboration', collaborationRouter);
app.use('/mcp', mcpRouter);

// Attach Real-Time WebSocket Server
setupWebSocket(server);

// Static Asset Serving (Vite SPA)
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback for client-side routing in Express 5
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/mcp') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/mcp') || req.path.startsWith('/ws')) {
      return next();
    }
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Gennety Canvas Server</title></head>
        <body style="font-family: system-ui; background: #0b0f19; color: #f3f4f6; padding: 40px;">
          <h1>Gennety Retention Canvas Backend (Render)</h1>
          <p>Status: <strong>Online</strong></p>
          <p>Frontend bundle not found in <code>dist/</code>. Run <code>npm run build</code> to generate the SPA.</p>
          <ul>
            <li><a href="/health" style="color: #60a5fa;">/health</a></li>
            <li><a href="/mcp" style="color: #60a5fa;">/mcp (Remote MCP Info)</a></li>
          </ul>
        </body>
      </html>
    `);
  });
}

// Start Server
server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Gennety Canvas Unified Server running on http://${HOST}:${PORT}`);
  console.log(`📡 WebSocket Engine active at ws://${HOST}:${PORT}/ws`);
  console.log(`🤖 Remote MCP SSE active at http://${HOST}:${PORT}/mcp/sse`);
  console.log(`💾 Neon Database Pool initialized`);
  console.log(`=======================================================`);
});

// Graceful Shutdown
function handleShutdown(signal: string) {
  console.log(`[Server] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP and WebSocket server closed.');
    const db = getDbPool();
    if (db) {
      db.end(() => {
        console.log('[Server] Database pool closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  setTimeout(() => {
    console.error('[Server] Forceful shutdown due to timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
