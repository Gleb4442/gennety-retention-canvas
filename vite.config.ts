import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function gennetyApiPlugin() {
  return {
    name: 'gennety-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
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

          if (req.method === 'GET') {
            const key = url.searchParams.get('key')
            if (fs.existsSync(storagePath)) {
              try {
                const data = JSON.parse(fs.readFileSync(storagePath, 'utf-8'))
                if (!key || data.accessKey === key) {
                  res.statusCode = 200
                  res.end(JSON.stringify({ success: true, ...data }))
                  return
                }
              } catch {
                // pass through
              }
            }
            res.statusCode = 200
            res.end(JSON.stringify({ success: false, notFound: true }))
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk: any) => {
              body += chunk
            })
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body)
                fs.writeFileSync(storagePath, JSON.stringify(parsed, null, 2), 'utf-8')
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, savedAt: Date.now() }))
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
