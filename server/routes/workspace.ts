import { Router, type Request, type Response } from 'express';
import { getDbPool, safeJsonParse } from '../db.js';
import { broadcastToProject } from '../websocket.js';

const router = Router();

// In-memory fallback cache
const memoryStore: Record<string, { projects: any[]; activeProjectId: string; updatedAt: number }> = {};

// GET /api/workspace?key=...
router.get('/', async (req: Request, res: Response) => {
  const rawKey = (req.query.key as string) || (req.query.accessKey as string);
  if (!rawKey) {
    return res.status(400).json({ success: false, error: 'Параметр "key" обязателен.' });
  }

  const cleanKey = rawKey.trim();
  const db = getDbPool();

  // 1. Try fetching from Cloud Database (Neon PostgreSQL)
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
});

// POST /api/workspace
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = safeJsonParse(req.body, req.body);
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

    const db = getDbPool();

    // Persist to Cloud Database (Neon PostgreSQL)
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

        // Notify subscribers if active project exists
        if (targetActiveId) {
          broadcastToProject(targetActiveId, {
            type: 'workspace_saved',
            activeProjectId: targetActiveId,
            timestamp: now,
          });
        }

        return res.status(200).json({
          success: true,
          accessKey: cleanKey,
          totalProjects: projects.length,
          savedAt: now,
          storage: 'cloud_postgres',
        });
      } catch (dbErr: any) {
        console.error('[API Workspace] Postgres POST error:', dbErr.message);
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
});

export default router;
