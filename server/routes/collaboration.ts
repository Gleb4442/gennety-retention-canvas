import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { getDbPool, safeJsonParse } from '../db.js';
import { broadcastToProject } from '../websocket.js';

const router = Router();

// In-memory caches for fast fallback
const memoryAuditLogs: Record<string, any[]> = {};
const memoryVersions: Record<string, any[]> = {};
const memoryShares: Record<string, any[]> = {};
const memoryEvents: Record<string, any[]> = {};

router.all('/', async (req: Request, res: Response) => {
  const method = req.method;
  const query = req.query;
  const action = (query.action as string) || (req.body?.action as string);
  const db = getDbPool();

  try {
    // -------------------------------------------------------------
    // 1. GET SHARED PROJECT BY SHARE TOKEN OR PROJECT ID
    // -------------------------------------------------------------
    if (method === 'GET' && action === 'get_project') {
      const shareToken = (query.share_token as string)?.trim();
      const projectId = (query.project_id as string)?.trim();

      if (!shareToken && !projectId) {
        return res.status(400).json({ success: false, error: 'Требуется share_token или project_id.' });
      }

      if (db) {
        let targetProjId = projectId;
        let shareRole: 'viewer' | 'editor' = 'editor';

        if (shareToken) {
          const shareRes = await db.query(
            `SELECT project_id, role, is_active FROM canvas_project_shares WHERE share_token = $1`,
            [shareToken]
          );
          if (shareRes.rows.length === 0 || !shareRes.rows[0].is_active) {
            return res.status(404).json({ success: false, error: 'Ссылка для совместного доступа недействительна или была отозвана.' });
          }
          targetProjId = shareRes.rows[0].project_id;
          shareRole = shareRes.rows[0].role;
        }

        const projRes = await db.query(
          `SELECT id, owner_key, title, description, nodes, edges, drawings, layout_mode, theme, updated_at
           FROM canvas_projects WHERE id = $1`,
          [targetProjId]
        );

        if (projRes.rows.length > 0) {
          const row = projRes.rows[0];
          return res.status(200).json({
            success: true,
            project: {
              id: row.id,
              ownerKey: row.owner_key,
              title: row.title,
              description: row.description || '',
              nodes: safeJsonParse(row.nodes, []),
              edges: safeJsonParse(row.edges, []),
              drawings: safeJsonParse(row.drawings, []),
              layoutMode: row.layout_mode || 'freeform',
              theme: row.theme || 'dark',
              updatedAt: new Date(row.updated_at).getTime(),
            },
            role: shareRole,
          });
        }
      }

      return res.status(404).json({ success: false, error: 'Проект не найден.' });
    }

    // -------------------------------------------------------------
    // 2. AUDIT LOGS: GET & CREATE
    // -------------------------------------------------------------
    if (method === 'GET' && action === 'get_audit_logs') {
      const projectId = (query.project_id as string)?.trim();
      if (!projectId) {
        return res.status(400).json({ success: false, error: 'Параметр project_id обязателен.' });
      }

      if (db) {
        const result = await db.query(
          `SELECT id, project_id, user_id, user_name, user_color, action_type, target_id, summary, diff, created_at
           FROM canvas_audit_logs
           WHERE project_id = $1
           ORDER BY created_at DESC
           LIMIT 100`,
          [projectId]
        );

        const logs = result.rows.map((r) => ({
          id: r.id,
          projectId: r.project_id,
          userId: r.user_id,
          userName: r.user_name,
          userColor: r.user_color,
          actionType: r.action_type,
          targetId: r.target_id,
          summary: r.summary,
          diff: safeJsonParse(r.diff, {}),
          createdAt: r.created_at,
        }));

        memoryAuditLogs[projectId] = logs;
        return res.status(200).json({ success: true, logs });
      }

      return res.status(200).json({ success: true, logs: memoryAuditLogs[projectId] || [] });
    }

    if (method === 'POST' && action === 'create_audit_log') {
      const body = safeJsonParse(req.body, {});
      const { projectId, userId, userName, userColor, actionType, targetId, summary, diff } = body || {};

      if (!projectId || !summary) {
        return res.status(400).json({ success: false, error: 'Отсутствуют обязательные поля для аудита.' });
      }

      const newLog = {
        id: `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        projectId,
        userId: userId || 'anonymous',
        userName: userName || 'Пользователь',
        userColor: userColor || '#3B82F6',
        actionType: actionType || 'node_update',
        targetId: targetId || null,
        summary,
        diff: diff || null,
        createdAt: new Date().toISOString(),
      };

      if (!memoryAuditLogs[projectId]) memoryAuditLogs[projectId] = [];
      memoryAuditLogs[projectId].unshift(newLog);

      if (db) {
        try {
          const insertRes = await db.query(
            `INSERT INTO canvas_audit_logs (project_id, user_id, user_name, user_color, action_type, target_id, summary, diff, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             RETURNING id, created_at`,
            [projectId, newLog.userId, newLog.userName, newLog.userColor, newLog.actionType, newLog.targetId, summary, JSON.stringify(diff || {})]
          );
          if (insertRes.rows.length > 0) {
            newLog.id = insertRes.rows[0].id;
            newLog.createdAt = insertRes.rows[0].created_at;
          }
        } catch (e: any) {
          console.warn('[Audit DB] Insert failed, cached in memory:', e.message);
        }
      }

      // Broadcast audit event to WebSocket subscribers
      broadcastToProject(projectId, {
        type: 'audit_log_created',
        log: newLog,
      });

      return res.status(200).json({ success: true, log: newLog });
    }

    // -------------------------------------------------------------
    // 3. VERSION HISTORY: GET, CREATE & RESTORE
    // -------------------------------------------------------------
    if (method === 'GET' && action === 'get_versions') {
      const projectId = (query.project_id as string)?.trim();
      if (!projectId) {
        return res.status(400).json({ success: false, error: 'Параметр project_id обязателен.' });
      }

      if (db) {
        const result = await db.query(
          `SELECT id, project_id, version_number, label, is_manual, snapshot, created_by_name, created_by_id, created_at
           FROM canvas_project_versions
           WHERE project_id = $1
           ORDER BY version_number DESC
           LIMIT 50`,
          [projectId]
        );

        const versions = result.rows.map((r) => {
          const snapshot = safeJsonParse(r.snapshot, null);
          return {
            id: r.id,
            projectId: r.project_id,
            versionNumber: r.version_number,
            label: r.label,
            isManual: Boolean(r.is_manual),
            snapshot,
            nodesCount: Array.isArray(snapshot?.nodes) ? snapshot.nodes.length : 0,
            edgesCount: Array.isArray(snapshot?.edges) ? snapshot.edges.length : 0,
            drawingsCount: Array.isArray(snapshot?.drawings) ? snapshot.drawings.length : 0,
            createdByName: r.created_by_name,
            createdById: r.created_by_id,
            createdAt: r.created_at,
          };
        });

        memoryVersions[projectId] = versions;
        return res.status(200).json({ success: true, versions });
      }

      return res.status(200).json({ success: true, versions: memoryVersions[projectId] || [] });
    }

    if (method === 'POST' && action === 'create_version') {
      const body = safeJsonParse(req.body, {});
      const { projectId, label, isManual, snapshot, createdByName, createdById } = body || {};

      if (!projectId || !snapshot) {
        return res.status(400).json({ success: false, error: 'Отсутствуют обязательные данные для создания версии.' });
      }

      let nextVersionNumber = 1;
      let finalVersionObj: any = null;

      if (db) {
        const countRes = await db.query(
          `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver FROM canvas_project_versions WHERE project_id = $1`,
          [projectId]
        );
        if (countRes.rows.length > 0) {
          nextVersionNumber = parseInt(countRes.rows[0].next_ver, 10);
        }

        const insertRes = await db.query(
          `INSERT INTO canvas_project_versions (project_id, version_number, label, is_manual, snapshot, created_by_name, created_by_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING id, created_at`,
          [
            projectId,
            nextVersionNumber,
            label || `Контрольная точка #${nextVersionNumber}`,
            Boolean(isManual),
            JSON.stringify(snapshot),
            createdByName || 'Пользователь',
            createdById || 'anonymous',
          ]
        );

        finalVersionObj = {
          id: insertRes.rows[0].id,
          projectId,
          versionNumber: nextVersionNumber,
          label: label || `Контрольная точка #${nextVersionNumber}`,
          isManual: Boolean(isManual),
          snapshot,
          nodesCount: snapshot.nodes?.length || 0,
          edgesCount: snapshot.edges?.length || 0,
          drawingsCount: snapshot.drawings?.length || 0,
          createdByName: createdByName || 'Пользователь',
          createdById: createdById || 'anonymous',
          createdAt: insertRes.rows[0].created_at,
        };
      } else {
        finalVersionObj = {
          id: `ver_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          projectId,
          versionNumber: (memoryVersions[projectId]?.length || 0) + 1,
          label: label || 'Контрольная точка',
          isManual: Boolean(isManual),
          snapshot,
          nodesCount: snapshot.nodes?.length || 0,
          edgesCount: snapshot.edges?.length || 0,
          drawingsCount: snapshot.drawings?.length || 0,
          createdByName: createdByName || 'Пользователь',
          createdById: createdById || 'anonymous',
          createdAt: new Date().toISOString(),
        };
        if (!memoryVersions[projectId]) memoryVersions[projectId] = [];
        memoryVersions[projectId].unshift(finalVersionObj);
      }

      broadcastToProject(projectId, {
        type: 'version_created',
        version: finalVersionObj,
      });

      return res.status(200).json({ success: true, version: finalVersionObj });
    }

    if (method === 'POST' && action === 'restore_version') {
      const body = safeJsonParse(req.body, {});
      const { projectId, versionId, user } = body || {};

      if (!projectId || !versionId) {
        return res.status(400).json({ success: false, error: 'Не указаны projectId или versionId.' });
      }

      if (db) {
        const verRes = await db.query(
          `SELECT version_number, label, snapshot FROM canvas_project_versions WHERE id = $1 AND project_id = $2`,
          [versionId, projectId]
        );

        if (verRes.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Версия для отката не найдена.' });
        }

        const targetVer = verRes.rows[0];
        const snapshot = safeJsonParse(targetVer.snapshot, null);

        // Apply snapshot to canvas_projects
        await db.query(
          `UPDATE canvas_projects
           SET nodes = $1, edges = $2, drawings = $3, layout_mode = $4, theme = $5, updated_at = NOW()
           WHERE id = $6`,
          [
            JSON.stringify(snapshot.nodes || []),
            JSON.stringify(snapshot.edges || []),
            JSON.stringify(snapshot.drawings || []),
            snapshot.layoutMode || 'freeform',
            snapshot.theme || 'dark',
            projectId,
          ]
        );

        const userName = user?.name || 'Пользователь';
        const userColor = user?.color || '#EF4444';
        const userId = user?.id || 'anonymous';
        const summary = `${userName} откатил проект до версии v${targetVer.version_number} ("${targetVer.label || 'Без названия'}")`;

        await db.query(
          `INSERT INTO canvas_audit_logs (project_id, user_id, user_name, user_color, action_type, summary, created_at)
           VALUES ($1, $2, $3, $4, 'version_restore', $5, NOW())`,
          [projectId, userId, userName, userColor, summary]
        );

        // Broadcast restored snapshot to all connected WebSocket clients!
        broadcastToProject(projectId, {
          type: 'version_restored',
          snapshot,
          versionNumber: targetVer.version_number,
          summary,
        });

        return res.status(200).json({
          success: true,
          snapshot,
          restoredVersionNumber: targetVer.version_number,
          summary,
        });
      }

      return res.status(200).json({ success: true });
    }

    // -------------------------------------------------------------
    // 4. SHARING & LINKS: GET, CREATE & REVOKE
    // -------------------------------------------------------------
    if (method === 'GET' && action === 'get_shares') {
      const projectId = (query.project_id as string)?.trim();
      if (!projectId) {
        return res.status(400).json({ success: false, error: 'Параметр project_id обязателен.' });
      }

      if (db) {
        const result = await db.query(
          `SELECT id, project_id, share_token, role, is_active, created_at
           FROM canvas_project_shares
           WHERE project_id = $1 AND is_active = true
           ORDER BY created_at DESC`,
          [projectId]
        );

        const shares = result.rows.map((r) => ({
          id: r.id,
          projectId: r.project_id,
          shareToken: r.share_token,
          role: r.role,
          isActive: Boolean(r.is_active),
          createdAt: r.created_at,
        }));

        return res.status(200).json({ success: true, shares });
      }

      return res.status(200).json({ success: true, shares: memoryShares[projectId] || [] });
    }

    if (method === 'POST' && action === 'create_share') {
      const body = safeJsonParse(req.body, {});
      const { projectId, role } = body || {};

      if (!projectId) {
        return res.status(400).json({ success: false, error: 'Параметр projectId обязателен.' });
      }

      const cleanRole = role === 'viewer' ? 'viewer' : 'editor';
      const shareToken = `sh_${cleanRole}_${crypto.randomBytes(16).toString('hex')}`;

      if (db) {
        const insertRes = await db.query(
          `INSERT INTO canvas_project_shares (project_id, share_token, role, is_active, created_at)
           VALUES ($1, $2, $3, true, NOW())
           RETURNING id, share_token, role, is_active, created_at`,
          [projectId, shareToken, cleanRole]
        );

        const row = insertRes.rows[0];
        return res.status(200).json({
          success: true,
          share: {
            id: row.id,
            projectId,
            shareToken: row.share_token,
            role: row.role,
            isActive: Boolean(row.is_active),
            createdAt: row.created_at,
          },
        });
      }

      const shareObj = {
        id: `sh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        projectId,
        shareToken,
        role: cleanRole,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      if (!memoryShares[projectId]) memoryShares[projectId] = [];
      memoryShares[projectId].push(shareObj);

      return res.status(200).json({ success: true, share: shareObj });
    }

    if (method === 'POST' && action === 'revoke_share') {
      const body = safeJsonParse(req.body, {});
      const { shareToken, ownerKey } = body || {};

      if (!shareToken) {
        return res.status(400).json({ success: false, error: 'Параметр shareToken обязателен.' });
      }

      if (db) {
        if (ownerKey) {
          const shareCheck = await db.query(
            `SELECT s.id, p.owner_key 
             FROM canvas_project_shares s
             JOIN canvas_projects p ON s.project_id = p.id
             WHERE s.share_token = $1`,
            [shareToken]
          );
          if (shareCheck.rows.length > 0) {
            const row = shareCheck.rows[0];
            if (row.owner_key && row.owner_key !== 'anonymous' && row.owner_key !== ownerKey) {
              return res.status(403).json({ success: false, error: 'Недостаточно прав для отзыва ссылки.' });
            }
          }
        }

        await db.query(
          `UPDATE canvas_project_shares SET is_active = false WHERE share_token = $1`,
          [shareToken]
        );
      }

      return res.status(200).json({ success: true });
    }

    // -------------------------------------------------------------
    // 5. EVENT STREAMING / POLLING BUS (MULTI-USER REALTIME)
    // -------------------------------------------------------------
    if (method === 'POST' && action === 'publish_event') {
      const body = safeJsonParse(req.body, {});
      const { projectId, event } = body || {};

      if (!projectId || !event) {
        return res.status(400).json({ success: false, error: 'Параметры projectId и event обязательны.' });
      }

      if (!memoryEvents[projectId]) memoryEvents[projectId] = [];
      const timestampedEvent = { ...event, _ts: Date.now() };
      memoryEvents[projectId].push(timestampedEvent);

      // Keep buffer compact (last 200 events)
      if (memoryEvents[projectId].length > 200) {
        memoryEvents[projectId] = memoryEvents[projectId].slice(-150);
      }

      // Instant WebSocket broadcast to active peers!
      broadcastToProject(projectId, timestampedEvent);

      return res.status(200).json({ success: true });
    }

    if (method === 'GET' && action === 'poll_events') {
      const projectId = (query.project_id as string)?.trim();
      const since = parseInt((query.since as string) || '0', 10);

      if (!projectId) {
        return res.status(400).json({ success: false, error: 'Параметр project_id обязателен.' });
      }

      const events = memoryEvents[projectId] || [];
      const recent = events.filter((e) => e._ts > since);

      return res.status(200).json({ success: true, events: recent, now: Date.now() });
    }

    // -------------------------------------------------------------
    // 6. SYNC INDIVIDUAL PROJECT TO DATABASE
    // -------------------------------------------------------------
    if (method === 'POST' && action === 'sync_project') {
      const body = safeJsonParse(req.body, {});
      const { project, ownerKey } = body || {};

      if (!project || !project.id) {
        return res.status(400).json({ success: false, error: 'Объект project с id обязателен.' });
      }

      if (db) {
        await db.query(
          `INSERT INTO canvas_projects (id, owner_key, title, description, nodes, edges, drawings, layout_mode, theme, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             nodes = EXCLUDED.nodes,
             edges = EXCLUDED.edges,
             drawings = EXCLUDED.drawings,
             layout_mode = EXCLUDED.layout_mode,
             theme = EXCLUDED.theme,
             updated_at = NOW()`,
          [
            project.id,
            ownerKey || 'anonymous',
            project.title || 'Canvas Project',
            project.description || '',
            JSON.stringify(project.nodes || []),
            JSON.stringify(project.edges || []),
            JSON.stringify(project.drawings || []),
            project.layoutMode || 'freeform',
            project.theme || 'dark',
          ]
        );
      }

      // Notify WebSocket subscribers of project sync
      broadcastToProject(project.id, {
        type: 'project_synced',
        projectId: project.id,
        updatedAt: Date.now(),
      });

      return res.status(200).json({ success: true, savedAt: Date.now() });
    }

    return res.status(400).json({ success: false, error: 'Неизвестное действие (action).' });
  } catch (err: any) {
    console.error('[API Collaboration Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Ошибка сервера совместной работы.' });
  }
});

export default router;
