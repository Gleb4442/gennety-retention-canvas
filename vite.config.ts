import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_CONNECTION_STRING =
  process.env.DATABASE_URL ||
  'postgresql://postgres.ophztqjrabwemkqwidkq:3RLwRXqeBnGyFyGjFZ4N@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'

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
