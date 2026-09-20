import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import pg from 'pg'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_CONNECTION_STRING = process.env.DATABASE_URL || ''

let devPool: any = null
function getDevDbPool() {
  if (!devPool) {
    try {
      devPool = new Pool({
        connectionString: DB_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 4000,
      })
    } catch {
      devPool = null
    }
  }
  return devPool
}

const devEvents: Record<string, any[]> = {}

function gennetyApiPlugin() {
  return {
    name: 'gennety-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const host = req.headers.host || 'localhost:5173'
        const url = new URL(req.url, `http://${host}`)

        if (url.pathname === '/api/workspace') {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.statusCode = 200
            res.end()
            return
          }

          const storagePath = path.resolve(__dirname, 'workspace-storage.json')
          const db = getDevDbPool()

          if (req.method === 'GET') {
            const rawKey = url.searchParams.get('key') || url.searchParams.get('accessKey')
            const cleanKey = rawKey ? rawKey.trim() : null

            // 1. Try Supabase Postgres first
            if (db && cleanKey) {
              try {
                const dbRes = await db.query(
                  `SELECT access_key, active_project_id, projects, updated_at
                   FROM canvas_workspaces
                   WHERE access_key = $1`,
                  [cleanKey]
                )

                if (dbRes.rows.length > 0) {
                  const row = dbRes.rows[0]
                  const projects = typeof row.projects === 'string' ? JSON.parse(row.projects) : row.projects

                  // Save local disk snapshot
                  try {
                    fs.writeFileSync(
                      storagePath,
                      JSON.stringify(
                        {
                          accessKey: row.access_key,
                          activeProjectId: row.active_project_id,
                          projects,
                          updatedAt: new Date(row.updated_at).getTime(),
                        },
                        null,
                        2
                      ),
                      'utf-8'
                    )
                  } catch {
                    // non-blocking
                  }

                  res.statusCode = 200
                  res.end(
                    JSON.stringify({
                      success: true,
                      accessKey: row.access_key,
                      activeProjectId: row.active_project_id,
                      projects,
                      updatedAt: new Date(row.updated_at).getTime(),
                      storage: 'cloud_postgres',
                    })
                  )
                  return
                }
              } catch (dbErr: any) {
                console.warn('[Vite API] Dev Postgres GET fallback to local disk:', dbErr.message)
              }
            }

            // 2. Fallback to local workspace-storage.json
            if (fs.existsSync(storagePath)) {
              try {
                const data = JSON.parse(fs.readFileSync(storagePath, 'utf-8'))
                if (!cleanKey || data.accessKey === cleanKey) {
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, ...data, storage: 'local_disk' }))
                  return
                }
              } catch {
                // pass through
              }
            }

            res.statusCode = 200
            res.end(JSON.stringify({ success: false, notFound: true, message: 'Workspace not found in DB or disk' }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk: any) => {
              body += chunk
            })
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body)
                const { accessKey, projects, activeProjectId } = parsed || {}
                const cleanKey = accessKey ? accessKey.trim() : null
                const targetActiveId = activeProjectId || (projects && projects[0]?.id) || ''
                const now = Date.now()

                // 1. Always save to local file on disk immediately
                fs.writeFileSync(
                  storagePath,
                  JSON.stringify(
                    {
                      accessKey: cleanKey,
                      activeProjectId: targetActiveId,
                      projects,
                      updatedAt: now,
                    },
                    null,
                    2
                  ),
                  'utf-8'
                )

                // 2. Upsert to Supabase Postgres
                if (db && cleanKey && Array.isArray(projects)) {
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
                    )
                  } catch (dbErr: any) {
                    console.warn('[Vite API] Dev Postgres POST warning:', dbErr.message)
                  }
                }

                res.statusCode = 200
                res.end(JSON.stringify({ success: true, savedAt: now, storage: 'cloud_postgres_and_disk' }))
              } catch (err: any) {
                res.statusCode = 400
                res.end(JSON.stringify({ success: false, error: err.message }))
              }
            })
            return
          }
        }

        if (url.pathname === '/api/collaboration') {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

          if (req.method === 'OPTIONS') {
            res.statusCode = 200
            res.end()
            return
          }

          const action = url.searchParams.get('action')
          const db = getDevDbPool()

          const handleCollab = async (bodyData: any = {}) => {
            try {
              if (req.method === 'GET' && action === 'get_project') {
                const shareToken = url.searchParams.get('share_token')?.trim()
                const projectId = url.searchParams.get('project_id')?.trim()
                let targetId = projectId
                let role = 'editor'

                if (db) {
                  if (shareToken) {
                    const shRes = await db.query(
                      `SELECT project_id, role, is_active FROM canvas_project_shares WHERE share_token = $1`,
                      [shareToken]
                    )
                    if (shRes.rows.length === 0 || !shRes.rows[0].is_active) {
                      res.statusCode = 404
                      res.end(JSON.stringify({ success: false, error: 'Ссылка доступа недействительна.' }))
                      return
                    }
                    targetId = shRes.rows[0].project_id
                    role = shRes.rows[0].role
                  }

                  const pRes = await db.query(
                    `SELECT id, owner_key, title, description, nodes, edges, drawings, layout_mode, theme, updated_at
                     FROM canvas_projects WHERE id = $1`,
                    [targetId]
                  )
                  if (pRes.rows.length > 0) {
                    const r = pRes.rows[0]
                    res.statusCode = 200
                    res.end(JSON.stringify({
                      success: true,
                      project: {
                        id: r.id,
                        ownerKey: r.owner_key,
                        title: r.title,
                        description: r.description,
                        nodes: typeof r.nodes === 'string' ? JSON.parse(r.nodes) : r.nodes,
                        edges: typeof r.edges === 'string' ? JSON.parse(r.edges) : r.edges,
                        drawings: typeof r.drawings === 'string' ? JSON.parse(r.drawings) : (r.drawings || []),
                        layoutMode: r.layout_mode || 'freeform',
                        theme: r.theme || 'dark',
                        updatedAt: new Date(r.updated_at).getTime(),
                      },
                      role,
                    }))
                    return
                  }
                }
                res.statusCode = 404
                res.end(JSON.stringify({ success: false, error: 'Проект не найден' }))
                return
              }

              if (req.method === 'GET' && action === 'get_audit_logs') {
                const projectId = url.searchParams.get('project_id')?.trim()
                if (db && projectId) {
                  const r = await db.query(
                    `SELECT id, project_id, user_id, user_name, user_color, action_type, target_id, summary, diff, created_at
                     FROM canvas_audit_logs WHERE project_id = $1 ORDER BY created_at DESC LIMIT 100`,
                    [projectId]
                  )
                  const logs = r.rows.map((row: any) => ({
                    id: row.id,
                    projectId: row.project_id,
                    userId: row.user_id,
                    userName: row.user_name,
                    userColor: row.user_color,
                    actionType: row.action_type,
                    targetId: row.target_id,
                    summary: row.summary,
                    diff: typeof row.diff === 'string' ? JSON.parse(row.diff) : row.diff,
                    createdAt: row.created_at,
                  }))
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, logs }))
                  return
                }
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, logs: [] }))
                return
              }

              if (req.method === 'POST' && action === 'create_audit_log') {
                const { projectId, userId, userName, userColor, actionType, targetId, summary, diff } = bodyData
                if (db && projectId && summary) {
                  const ins = await db.query(
                    `INSERT INTO canvas_audit_logs (project_id, user_id, user_name, user_color, action_type, target_id, summary, diff, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id, created_at`,
                    [projectId, userId || 'anon', userName || 'User', userColor || '#3B82F6', actionType || 'node_update', targetId || null, summary, JSON.stringify(diff || {})]
                  )
                  res.statusCode = 200
                  res.end(JSON.stringify({
                    success: true,
                    log: { id: ins.rows[0].id, projectId, userId, userName, userColor, actionType, targetId, summary, diff, createdAt: ins.rows[0].created_at },
                  }))
                  return
                }
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, log: { id: `log_${Date.now()}`, ...bodyData, createdAt: new Date().toISOString() } }))
                return
              }

              if (req.method === 'GET' && action === 'get_versions') {
                const projectId = url.searchParams.get('project_id')?.trim()
                if (db && projectId) {
                  const r = await db.query(
                    `SELECT id, project_id, version_number, label, is_manual, snapshot, created_by_name, created_by_id, created_at
                     FROM canvas_project_versions WHERE project_id = $1 ORDER BY version_number DESC LIMIT 50`,
                    [projectId]
                  )
                  const versions = r.rows.map((row: any) => {
                    const snap = typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot
                    return {
                      id: row.id,
                      projectId: row.project_id,
                      versionNumber: row.version_number,
                      label: row.label,
                      isManual: Boolean(row.is_manual),
                      snapshot: snap,
                      nodesCount: snap?.nodes?.length || 0,
                      edgesCount: snap?.edges?.length || 0,
                      drawingsCount: snap?.drawings?.length || 0,
                      createdByName: row.created_by_name,
                      createdById: row.created_by_id,
                      createdAt: row.created_at,
                    }
                  })
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, versions }))
                  return
                }
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, versions: [] }))
                return
              }

              if (req.method === 'POST' && action === 'create_version') {
                const { projectId, label, isManual, snapshot, createdByName, createdById } = bodyData
                if (db && projectId && snapshot) {
                  const countRes = await db.query(
                    `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver FROM canvas_project_versions WHERE project_id = $1`,
                    [projectId]
                  )
                  const nextVer = parseInt(countRes.rows[0]?.next_ver || '1', 10)
                  const ins = await db.query(
                    `INSERT INTO canvas_project_versions (project_id, version_number, label, is_manual, snapshot, created_by_name, created_by_id, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id, created_at`,
                    [projectId, nextVer, label || `Контрольная точка #${nextVer}`, Boolean(isManual), JSON.stringify(snapshot), createdByName || 'User', createdById || 'anon']
                  )
                  res.statusCode = 200
                  res.end(JSON.stringify({
                    success: true,
                    version: {
                      id: ins.rows[0].id,
                      projectId,
                      versionNumber: nextVer,
                      label: label || `Контрольная точка #${nextVer}`,
                      isManual: Boolean(isManual),
                      snapshot,
                      nodesCount: snapshot.nodes?.length || 0,
                      edgesCount: snapshot.edges?.length || 0,
                      drawingsCount: snapshot.drawings?.length || 0,
                      createdByName: createdByName || 'User',
                      createdById: createdById || 'anon',
                      createdAt: ins.rows[0].created_at,
                    },
                  }))
                  return
                }
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, version: { id: `v_${Date.now()}`, ...bodyData } }))
                return
              }

              if (req.method === 'POST' && action === 'restore_version') {
                const { projectId, versionId, user } = bodyData
                if (db && projectId && versionId) {
                  const verRes = await db.query(
                    `SELECT version_number, label, snapshot FROM canvas_project_versions WHERE id = $1 AND project_id = $2`,
                    [versionId, projectId]
                  )
                  if (verRes.rows.length > 0) {
                    const snap = typeof verRes.rows[0].snapshot === 'string' ? JSON.parse(verRes.rows[0].snapshot) : verRes.rows[0].snapshot
                    await db.query(
                      `UPDATE canvas_projects SET nodes = $1, edges = $2, drawings = $3, layout_mode = $4, theme = $5, updated_at = NOW() WHERE id = $6`,
                      [JSON.stringify(snap.nodes || []), JSON.stringify(snap.edges || []), JSON.stringify(snap.drawings || []), snap.layoutMode || 'freeform', snap.theme || 'dark', projectId]
                    )
                    const userName = user?.name || 'Пользователь'
                    const summary = `${userName} откатил проект до версии v${verRes.rows[0].version_number}`
                    await db.query(
                      `INSERT INTO canvas_audit_logs (project_id, user_id, user_name, user_color, action_type, summary, created_at)
                       VALUES ($1, $2, $3, $4, 'version_restore', $5, NOW())`,
                      [projectId, user?.id || 'anon', userName, user?.color || '#EF4444', summary]
                    )
                    res.statusCode = 200
                    res.end(JSON.stringify({ success: true, snapshot: snap, summary }))
                    return
                  }
                }
                res.statusCode = 200
                res.end(JSON.stringify({ success: true }))
                return
              }

              if (req.method === 'GET' && action === 'get_shares') {
                const projectId = url.searchParams.get('project_id')?.trim()
                if (db && projectId) {
                  const r = await db.query(
                    `SELECT id, project_id, share_token, role, is_active, created_at FROM canvas_project_shares WHERE project_id = $1 AND is_active = true ORDER BY created_at DESC`,
                    [projectId]
                  )
                  const shares = r.rows.map((row: any) => ({
                    id: row.id,
                    projectId: row.project_id,
                    shareToken: row.share_token,
                    role: row.role,
                    isActive: Boolean(row.is_active),
                    createdAt: row.created_at,
                  }))
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, shares }))
                  return
                }
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, shares: [] }))
                return
              }

              if (req.method === 'POST' && action === 'create_share') {
                const { projectId, role } = bodyData
                const cleanRole = role === 'viewer' ? 'viewer' : 'editor'
                const token = `sh_${cleanRole}_${crypto.randomBytes(16).toString('hex')}`
                if (db && projectId) {
                  const ins = await db.query(
                    `INSERT INTO canvas_project_shares (project_id, share_token, role, is_active, created_at)
                     VALUES ($1, $2, $3, true, NOW()) RETURNING id, share_token, role, is_active, created_at`,
                    [projectId, token, cleanRole]
                  )
                  const row = ins.rows[0]
                  res.statusCode = 200
                  res.end(JSON.stringify({
                    success: true,
                    share: {
                      id: row.id,
                      projectId,
                      shareToken: row.share_token,
                      role: row.role,
                      isActive: Boolean(row.is_active),
                      createdAt: row.created_at,
                    },
                  }))
                  return
                }
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, share: { id: `sh_${Date.now()}`, projectId, shareToken: token, role: cleanRole, isActive: true } }))
                return
              }

              if (req.method === 'POST' && action === 'revoke_share') {
                const { shareToken, ownerKey } = bodyData
                if (db && shareToken) {
                  if (ownerKey) {
                    const shareCheck = await db.query(
                      `SELECT s.id, p.owner_key 
                       FROM canvas_project_shares s
                       JOIN canvas_projects p ON s.project_id = p.id
                       WHERE s.share_token = $1`,
                      [shareToken]
                    )
                    if (shareCheck.rows.length > 0) {
                      const row = shareCheck.rows[0]
                      if (row.owner_key && row.owner_key !== 'anonymous' && row.owner_key !== ownerKey) {
                        res.statusCode = 403
                        res.end(JSON.stringify({ success: false, error: 'Недостаточно прав' }))
                        return
                      }
                    }
                  }
                  await db.query(`UPDATE canvas_project_shares SET is_active = false WHERE share_token = $1`, [shareToken])
                }
                res.statusCode = 200
                res.end(JSON.stringify({ success: true }))
                return
              }

              if (req.method === 'POST' && action === 'publish_event') {
                const { projectId, event } = bodyData
                if (!projectId || !event) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ success: false, error: 'projectId and event required' }))
                  return
                }
                if (!devEvents[projectId]) devEvents[projectId] = []
                devEvents[projectId].push({ ...event, _ts: Date.now() })
                if (devEvents[projectId].length > 200) {
                  devEvents[projectId] = devEvents[projectId].slice(-150)
                }
                res.statusCode = 200
                res.end(JSON.stringify({ success: true }))
                return
              }

              if (req.method === 'GET' && action === 'poll_events') {
                const projectId = url.searchParams.get('project_id')?.trim()
                const since = parseInt(url.searchParams.get('since') || '0', 10)
                if (!projectId) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ success: false, error: 'project_id required' }))
                  return
                }
                const events = devEvents[projectId] || []
                const recent = events.filter((e: any) => e._ts > since)
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, events: recent, now: Date.now() }))
                return
              }

              if (req.method === 'POST' && action === 'sync_project') {
                const { project, ownerKey } = bodyData
                if (db && project && project.id) {
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
                      ownerKey || 'anon',
                      project.title || 'Canvas Project',
                      project.description || '',
                      JSON.stringify(project.nodes || []),
                      JSON.stringify(project.edges || []),
                      JSON.stringify(project.drawings || []),
                      project.layoutMode || 'freeform',
                      project.theme || 'dark',
                    ]
                  )
                }
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, savedAt: Date.now() }))
                return
              }

              // Event bus fallback
              res.statusCode = 200
              res.end(JSON.stringify({ success: true }))
            } catch (collabErr: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: collabErr.message }))
            }
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk: any) => { body += chunk })
            req.on('end', () => {
              try {
                const parsed = body ? JSON.parse(body) : {}
                handleCollab(parsed)
              } catch {
                handleCollab({})
              }
            })
            return
          } else {
            handleCollab({})
            return
          }
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile(), gennetyApiPlugin()],
  base: './',
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
  },
})
