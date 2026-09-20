import { Pool } from 'pg';

// In-memory fallback cache
let memoryStore: Record<string, { projects: any[]; activeProjectId: string; updatedAt: number }> = {};

// Cached PostgreSQL pool for serverless execution
let pool: Pool | null = null;

function getDbPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    const rejectUnauthorized = process.env.NODE_ENV === 'production' && process.env.PG_REJECT_UNAUTHORIZED !== 'false';
    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized },
      max: 4,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  return pool;
}

function safeJsonParse<T>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, query, body } = req;
  const db = getDbPool();

  // GET /api/workspace?key=...
  if (method === 'GET') {
    const rawKey = (query.key as string) || (query.accessKey as string);
    if (!rawKey) {
      return res.status(400).json({ success: false, error: 'Параметр "key" обязателен.' });
    }

    const cleanKey = rawKey.trim();

    // 1. Try fetching from Cloud Database (Supabase PostgreSQL)
    if (db) {
      try {
        const result = await db.query(
          `SELECT access_key, active_project_id, projects, updated_at
           FROM canvas_workspaces
           WHERE access_key = $1`,
          [cleanKey]
        );

        if (result.rows.length > 0) {
          const row = result.rows[0];
          const projects = safeJsonParse(row.projects, []);

          // Keep in-memory cache hot
          memoryStore[cleanKey] = {
            projects,
            activeProjectId: row.active_project_id,
            updatedAt: new Date(row.updated_at).getTime(),
          };

          return res.status(200).json({
            success: true,
            accessKey: row.access_key,
            activeProjectId: row.active_project_id,
            projects,
            updatedAt: new Date(row.updated_at).getTime(),
            storage: 'cloud_postgres',
          });
        }
      } catch (err: any) {
        console.error('[API Workspace] Postgres GET error:', err.message);
        // Fall back to memoryStore
      }
    }

    // 2. Fallback to memory store if DB is empty or unavailable
    const stored = memoryStore[cleanKey];
    if (stored) {
      return res.status(200).json({
        success: true,
        accessKey: cleanKey,
        projects: stored.projects,
        activeProjectId: stored.activeProjectId,
        updatedAt: stored.updatedAt,
        storage: 'memory_fallback',
      });
    }

    return res.status(200).json({
      success: false,
      notFound: true,
      message: 'Workspace not found in database. Using local snapshot.',
    });
  }

  // POST /api/workspace
  if (method === 'POST') {
    try {
      const data = safeJsonParse(body, body);
      const { accessKey, projects, activeProjectId } = data || {};

      if (!accessKey || !Array.isArray(projects)) {
        return res.status(400).json({
          success: false,
          error: 'Неверные данные: требуются "accessKey" и массив "projects".',
        });
      }

      const cleanKey = accessKey.trim();
      const targetActiveId = activeProjectId || projects[0]?.id || '';
      const now = Date.now();

      // Always update in-memory cache
      memoryStore[cleanKey] = {
        projects,
        activeProjectId: targetActiveId,
        updatedAt: now,
      };

      // 1. Persist to Cloud Database (Supabase PostgreSQL)
      if (db) {
        try {
          await db.query(
            `INSERT INTO canvas_workspaces (access_key, active_project_id, projects, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (access_key)
             DO UPDATE SET
               active_project_id = EXCLUDED.active_project_id,
               projects = EXCLUDED.projects,
               updated_at = NOW()`,
            [cleanKey, targetActiveId, JSON.stringify(projects)]
          );

          return res.status(200).json({
            success: true,
            accessKey: cleanKey,
            totalProjects: projects.length,
            savedAt: now,
            storage: 'cloud_postgres',
          });
        } catch (dbErr: any) {
          console.error('[API Workspace] Postgres POST error:', dbErr.message);
          // Return success via memory fallback with warning
          return res.status(200).json({
            success: true,
            accessKey: cleanKey,
            totalProjects: projects.length,
            savedAt: now,
            storage: 'memory_fallback',
            warning: 'Database save failed, cached in memory',
          });
        }
      }

      return res.status(200).json({
        success: true,
        accessKey: cleanKey,
        totalProjects: projects.length,
        savedAt: now,
        storage: 'memory_only',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Ошибка обработки данных воркспейса.',
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
