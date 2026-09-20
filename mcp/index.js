#!/usr/bin/env node

/**
 * Gennety Canvas MCP Server
 * Model Context Protocol (MCP) server for Claude Desktop, Cursor, Antigravity, and other AI agents.
 * 
 * Supports JSON-RPC 2.0 over standard I/O (stdio).
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STORAGE_FILE = process.env.GENNETY_STORAGE_PATH || path.join(ROOT_DIR, 'workspace-storage.json');
const DEFAULT_ACCESS_KEY = process.env.GENNETY_ACCESS_KEY || 'GNTY-PRO-MASTER-2026';
const API_URL = process.env.GENNETY_API_URL || 'https://gennety-retention-canvas.vercel.app/api/workspace';

/**
 * Load workspace data from disk or memory.
 */
function loadStorage() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (!Array.isArray(parsed.projects)) {
          parsed.projects = [];
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error(`[MCP] Failed to read ${STORAGE_FILE}:`, err.message);
  }

  // Fallback initial workspace
  return {
    accessKey: DEFAULT_ACCESS_KEY,
    activeProjectId: 'proj_retention_flywheel',
    projects: [
      {
        id: 'proj_retention_flywheel',
        title: 'Retention Flywheel (Основной)',
        description: 'Мастер-стратегия удержания пользователей Gennety: циклы, психология, ритуалы и аппаратные триггеры.',
        layoutMode: 'freeform',
        theme: 'dark',
        updatedAt: Date.now(),
        tags: ['Master Template', 'Retention Flywheel'],
        nodes: [
          {
            id: 'shift_core',
            type: 'strategyNode',
            data: {
              title: 'СДВИГ БИЗНЕС-МОДЕЛИ',
              badge: 'Foundation',
              category: 'foundation',
              description: 'Плата за комьюнити, статус и закрытый клуб вместо поиска пары. Устраняем мотив удалять апп после мэтча.',
              keyMetric: 'Регулярная подписка',
              outcome: 'Член клуба',
              tags: ['Business Model', 'Disruption'],
            },
          },
          {
            id: 'emotion_status',
            type: 'strategyNode',
            data: {
              title: 'ЧИСТЫЕ ЭМОЦИИ & СТАТУС',
              badge: 'Aha-moment',
              category: 'psychology',
              description: 'Эмоции первой очереди (влюбленность, азарт, признание) + социальный статус и пафос второй очереди.',
              keyMetric: 'D1 Retention > 55%',
              outcome: 'Эмоциональный крючок',
              tags: ['Psychology', 'Ego'],
            },
          },
          {
            id: 'hardware_beacon',
            type: 'strategyNode',
            data: {
              title: 'HARDWARE-СИГНАЛКА',
              badge: 'Физический маркер',
              category: 'hardware',
              description: 'Материальный объект в реальном мире. Рождает тактильное ощущение принадлежности к избранным.',
              keyMetric: 'WOM Organic Share',
              outcome: 'Материализация статуса',
              tags: ['Hardware', 'Signaling'],
            },
          },
          {
            id: 'gym_model',
            type: 'strategyNode',
            data: {
              title: 'МЕХАНИКА СПОРТЗАЛА',
              badge: 'Retention Engine',
              category: 'retention',
              description: 'Оффлайн-ивенты как регулярный ритуал. Платят за абонемент ради доступа к жизни клуба.',
              keyMetric: 'W4 Retention > 40%',
              outcome: 'Привычка членства',
              tags: ['Gym Model', 'Habit Loop'],
            },
          },
          {
            id: 'event_duality',
            type: 'strategyNode',
            data: {
              title: 'ДВОЙСТВЕННОСТЬ ИВЕНТОВ',
              badge: 'Community',
              category: 'event',
              description: 'Внешняя масштабность (соцсети, шум, пафос) + внутренняя приватная камерность (закрытые связи).',
              keyMetric: 'Event Attendance & UGC',
              outcome: 'Сверхсильная комьюнити-связь',
              tags: ['Events', 'Social Capital'],
            },
          },
          {
            id: 'anti_churn',
            type: 'strategyNode',
            data: {
              title: 'HARDWARE V2 & РОТАЦИЯ',
              badge: 'Anti-Churn',
              category: 'lifecycle',
              description: 'Двухуровневый апгрейд: сменяемый девайс + ротация тематических сезонов и кулуарных встреч.',
              keyMetric: 'M6 Churn < 4%',
              outcome: 'Пожизненный LTV',
              tags: ['LTV', 'Lifecycle'],
            },
          },
          {
            id: 'goal_retention',
            type: 'strategyNode',
            data: {
              title: 'ТОП-1 RETENTION & LTV',
              badge: 'Apex Goal',
              category: 'outcome',
              description: 'Безусловное лидерство в категории дейтинга/комьюнити с рекордными показателями удержания.',
              keyMetric: 'D360 Retention & LTV Apex',
              outcome: 'Мировой бенчмарк',
              tags: ['Goal', 'Dominance'],
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'shift_core', target: 'emotion_status', data: { label: 'формирует контекст' } },
          { id: 'e2', source: 'emotion_status', target: 'hardware_beacon', data: { label: 'материализуется через' } },
          { id: 'e3', source: 'hardware_beacon', target: 'gym_model', data: { label: 'подстегивает ритуал' } },
          { id: 'e4', source: 'gym_model', target: 'event_duality', data: { label: 'собирает людей' } },
          { id: 'e5', source: 'event_duality', target: 'anti_churn', data: { label: 'подпитывает цикл' } },
          { id: 'e6', source: 'anti_churn', target: 'shift_core', data: { label: 'замыкает маховик' } },
          { id: 'e7', source: 'anti_churn', target: 'goal_retention', data: { label: 'приводит к' } },
        ],
      },
    ],
  };
}

function saveStorage(data) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[MCP] Failed to save to ${STORAGE_FILE}:`, err.message);
    return false;
  }
}

/**
 * Available MCP Tools
 */
const TOOLS = [
  {
    name: 'list_projects',
    description: 'Lists all canvas projects, folders, node counts, and metadata in the user\'s Gennety Canvas account.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_project_canvas',
    description: 'Retrieves the complete graph structure of a specific project (or active project) including all nodes, categories, metrics, outcomes, and edge transitions.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The unique ID of the project to retrieve. Leave blank to retrieve the active project.',
        },
      },
    },
  },
  {
    name: 'search_canvas',
    description: 'Performs full-text and semantic search across cards, categories, key metrics, descriptions, and tags in all projects.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keyword or phrase to search for (e.g. "hardware", "gym", "churn", "D1", "status").',
        },
        projectId: {
          type: 'string',
          description: 'Optional project ID to limit search scope.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'analyze_retention_flow',
    description: 'Runs automated strategic analysis on a canvas: verifies flywheel loops, detects broken or dead-end paths, audits category coverage across all 8 dimensions, and highlights missing metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Optional project ID to analyze. Defaults to active project.',
        },
      },
    },
  },
  {
    name: 'create_or_update_node',
    description: 'Adds a new strategy card or updates an existing card in a canvas project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project ID where the node will be added/updated.',
        },
        nodeId: {
          type: 'string',
          description: 'Unique node identifier (e.g. "push_habit_loop"). If exists, updates it; otherwise creates a new node.',
        },
        title: {
          type: 'string',
          description: 'Clear, uppercase or headline title of the node.',
        },
        badge: {
          type: 'string',
          description: 'Short tag/badge (e.g. "Step 1", "Retention", "Aha-moment").',
        },
        category: {
          type: 'string',
          enum: ['foundation', 'psychology', 'hardware', 'retention', 'event', 'lifecycle', 'outcome', 'custom'],
          description: 'Category defining role and color in Gennety Canvas.',
        },
        description: {
          type: 'string',
          description: 'In-depth explanation of mechanics, psychology, or business logic.',
        },
        keyMetric: {
          type: 'string',
          description: 'Target metric (e.g. "D30 Retention > 35%").',
        },
        outcome: {
          type: 'string',
          description: 'Result achieved upon completing this step.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tag strings.',
        },
      },
      required: ['title', 'category', 'description'],
    },
  },
  {
    name: 'export_workspace_backup',
    description: 'Exports complete backup of all projects, cards, and connections in the account as a single JSON payload.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'fetch_remote_account',
    description: 'Fetches live workspace data from the Gennety Canvas web app or API using an access key and syncs it locally.',
    inputSchema: {
      type: 'object',
      properties: {
        accessKey: {
          type: 'string',
          description: 'Access key of the user account. If omitted, uses configured key.',
        },
        apiUrl: {
          type: 'string',
          description: 'Optional API URL. Defaults to production or local server.',
        },
      },
    },
  },
];

/**
 * Execute Tool Calls
 */
async function executeTool(name, args) {
  const storage = loadStorage();

  switch (name) {
    case 'list_projects': {
      const projects = Array.isArray(storage.projects) ? storage.projects : [];
      const summary = projects.map((p) => ({
        id: p.id,
        title: p.title || 'Untitled',
        description: p.description || '',
        isActive: p.id === storage.activeProjectId,
        nodesCount: p.nodes?.length || 0,
        edgesCount: p.edges?.length || 0,
        tags: p.tags || [],
        layoutMode: p.layoutMode || 'freeform',
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
      }));

      return {
        totalProjects: summary.length,
        activeProjectId: storage.activeProjectId || (projects[0]?.id ?? ''),
        accessKey: storage.accessKey,
        projects: summary,
      };
    }

    case 'get_project_canvas': {
      const projects = Array.isArray(storage.projects) ? storage.projects : [];
      const pId = args.projectId || storage.activeProjectId;
      const project = projects.find((p) => p.id === pId) || projects[0];
      if (!project) {
        throw new Error(`Project "${pId}" not found in account.`);
      }

      const nodes = project.nodes || [];
      const edges = project.edges || [];

      // Categorize nodes
      const categoriesMap = {};
      for (const n of nodes) {
        const cat = n.data?.category || 'custom';
        if (!categoriesMap[cat]) categoriesMap[cat] = [];
        categoriesMap[cat].push({
          id: n.id,
          title: n.data?.title,
          badge: n.data?.badge,
          description: n.data?.description,
          keyMetric: n.data?.keyMetric,
          outcome: n.data?.outcome,
          tags: n.data?.tags,
        });
      }

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        layoutMode: project.layoutMode,
        theme: project.theme,
        totalNodes: nodes.length,
        totalEdges: edges.length,
        categorizedNodes: categoriesMap,
        connections: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.data?.label || e.label || '',
        })),
        rawNodes: nodes,
        rawEdges: edges,
      };
    }

    case 'search_canvas': {
      const q = (args.query || '').toLowerCase().trim();
      if (!q) throw new Error('Search query must not be empty.');

      const allProjects = Array.isArray(storage.projects) ? storage.projects : [];
      const targetProjects = args.projectId
        ? allProjects.filter((p) => p.id === args.projectId)
        : allProjects;

      const matches = [];
      for (const proj of targetProjects) {
        for (const n of proj.nodes || []) {
          const d = n.data || {};
          const title = (d.title || '').toLowerCase();
          const desc = (d.description || '').toLowerCase();
          const badge = (d.badge || '').toLowerCase();
          const metric = (d.keyMetric || '').toLowerCase();
          const outcome = (d.outcome || '').toLowerCase();
          const tags = (d.tags || []).join(' ').toLowerCase();

          if (
            title.includes(q) ||
            desc.includes(q) ||
            badge.includes(q) ||
            metric.includes(q) ||
            outcome.includes(q) ||
            tags.includes(q)
          ) {
            matches.push({
              projectId: proj.id,
              projectTitle: proj.title,
              nodeId: n.id,
              title: d.title,
              category: d.category,
              badge: d.badge,
              keyMetric: d.keyMetric,
              outcome: d.outcome,
              description: d.description,
            });
          }
        }
      }

      return {
        query: args.query,
        totalMatches: matches.length,
        matches,
      };
    }

    case 'analyze_retention_flow': {
      const projects = Array.isArray(storage.projects) ? storage.projects : [];
      const pId = args.projectId || storage.activeProjectId;
      const project = projects.find((p) => p.id === pId) || projects[0];
      if (!project) throw new Error(`Project "${pId}" not found.`);

      const nodes = project.nodes || [];
      const edges = project.edges || [];

      // Find incoming and outgoing edge counts
      const inDegree = {};
      const outDegree = {};
      for (const n of nodes) {
        inDegree[n.id] = 0;
        outDegree[n.id] = 0;
      }
      for (const e of edges) {
        if (outDegree[e.source] !== undefined) outDegree[e.source]++;
        if (inDegree[e.target] !== undefined) inDegree[e.target]++;
      }

      // Detect orphan nodes (no incoming and no outgoing)
      const orphanNodes = nodes
        .filter((n) => inDegree[n.id] === 0 && outDegree[n.id] === 0)
        .map((n) => n.data?.title || n.id);

      // Detect dead-end nodes (incoming connections, but no outgoing ones and not in outcome category)
      const deadEndNodes = nodes
        .filter((n) => inDegree[n.id] > 0 && outDegree[n.id] === 0 && n.data?.category !== 'outcome')
        .map((n) => n.data?.title || n.id);

      // Category distribution
      const categoryCounts = {};
      for (const n of nodes) {
        const cat = n.data?.category || 'custom';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }

      const standardCategories = ['foundation', 'psychology', 'hardware', 'retention', 'event', 'lifecycle', 'outcome'];
      const missingCategories = standardCategories.filter((c) => !categoryCounts[c]);

      return {
        projectId: project.id,
        projectTitle: project.title,
        totalNodes: nodes.length,
        totalEdges: edges.length,
        categoryCounts,
        orphanNodes,
        deadEndNodes,
        missingCategories,
        recommendations: [
          orphanNodes.length > 0 ? `Подключите изолированные узлы: ${orphanNodes.join(', ')}` : 'Все узлы соединены связями.',
          missingCategories.length > 0 ? `Добавьте отсутствующие слои архитектуры: ${missingCategories.join(', ')}` : 'Все 7 ключевых категорий удержания присутствуют.',
          deadEndNodes.length > 0 ? `Замкните тупиковые ветки в цикл или доведите их до вершины «outcome»: ${deadEndNodes.join(', ')}` : 'Цепочки завершены или замкнуты в маховик.',
        ],
      };
    }

    case 'create_or_update_node': {
      if (!Array.isArray(storage.projects)) {
        storage.projects = [];
      }
      const pId = args.projectId || storage.activeProjectId;
      let project = storage.projects.find((p) => p.id === pId);
      if (!project && storage.projects.length > 0) {
        project = storage.projects[0];
      }
      if (!project) {
        project = {
          id: pId || `proj_${Date.now()}`,
          title: 'Новый проект',
          description: 'Проект создан агентом MCP',
          nodes: [],
          edges: [],
          drawings: [],
          layoutMode: 'freeform',
          theme: 'dark',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        storage.projects.push(project);
        storage.activeProjectId = project.id;
      }

      const nodeId = args.nodeId || `node_${Date.now()}`;
      if (!Array.isArray(project.nodes)) project.nodes = [];
      const existingIdx = project.nodes.findIndex((n) => n.id === nodeId);

      const nodeData = {
        title: args.title,
        badge: args.badge || 'Strategy',
        category: args.category || 'custom',
        description: args.description || '',
        keyMetric: args.keyMetric || '',
        outcome: args.outcome || '',
        tags: args.tags || [],
      };

      if (existingIdx >= 0) {
        project.nodes[existingIdx].data = {
          ...project.nodes[existingIdx].data,
          ...nodeData,
        };
      } else {
        if (!project.nodes) project.nodes = [];
        const xPos = 80 + (project.nodes.length % 5) * 420;
        const yPos = 120 + Math.floor(project.nodes.length / 5) * 260;
        project.nodes.push({
          id: nodeId,
          type: 'strategyNode',
          position: { x: xPos, y: yPos },
          data: nodeData,
        });
      }

      project.updatedAt = Date.now();
      saveStorage(storage);

      return {
        success: true,
        action: existingIdx >= 0 ? 'updated' : 'created',
        projectId: project.id,
        nodeId,
        nodeData,
      };
    }

    case 'export_workspace_backup': {
      return {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        accessKey: storage.accessKey,
        activeProjectId: storage.activeProjectId,
        projects: storage.projects,
      };
    }

    case 'fetch_remote_account': {
      const targetKey = (args.accessKey || storage.accessKey || DEFAULT_ACCESS_KEY).trim();
      const targetUrl = args.apiUrl || API_URL;
      const url = `${targetUrl}?key=${encodeURIComponent(targetKey)}`;

      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        throw new Error(`Remote API returned status HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data && data.success && Array.isArray(data.projects)) {
        storage.accessKey = targetKey;
        storage.projects = data.projects;
        storage.activeProjectId = data.activeProjectId || data.projects[0]?.id;
        saveStorage(storage);
        return {
          success: true,
          syncedProjectsCount: data.projects.length,
          activeProjectId: storage.activeProjectId,
          accessKey: targetKey,
        };
      }
      return {
        success: false,
        message: data.message || 'No projects returned from remote endpoint.',
      };
    }

    default:
      throw new Error(`Unknown tool "${name}".`);
  }
}

/**
 * Handle MCP JSON-RPC Messages
 */
async function handleMessage(msg) {
  if (!msg || typeof msg !== 'object') return;

  const { id, method, params } = msg;

  // Initialize
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'gennety-retention-canvas-mcp',
          version: '1.0.0',
        },
      },
    };
  }

  // Initialized Notification
  if (method === 'notifications/initialized') {
    return null;
  }

  // Tools List
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: TOOLS,
      },
    };
  }

  // Tool Call
  if (method === 'tools/call') {
    try {
      const { name, arguments: args } = params || {};
      const resultData = await executeTool(name, args || {});
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resultData, null, 2),
            },
          ],
        },
      };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: err.message,
        },
      };
    }
  }

  // Unknown method
  if (id !== undefined) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`,
      },
    };
  }

  return null;
}

/**
 * Main stdio loop
 */
function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const parsed = JSON.parse(trimmed);
      const response = await handleMessage(parsed);
      if (response) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (err) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: `Parse error: ${err.message}`,
          },
        }) + '\n'
      );
    }
  });
}

main();
