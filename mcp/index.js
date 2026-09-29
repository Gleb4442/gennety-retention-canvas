#!/usr/bin/env node

/**
 * Gennety Canvas MCP Server (Enhanced 2026 Edition)
 * Model Context Protocol (MCP) server for Claude Desktop, Cursor, Antigravity, and AI Agents.
 * 
 * Supports creating and managing complete explanatory retention workflows,
 * strategic cards, standalone text blocks/notes, photo mockups, connections,
 * and automated comfortable spatial layouts with equal gutters.
 * 
 * JSON-RPC 2.0 over standard I/O (stdio).
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
        nodes: [],
        edges: [],
      },
    ],
  };
}

/**
 * Save workspace data and optionally push to remote API.
 */
function saveStorage(data) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');

    // Asynchronously push to remote API if access key is known so changes show up in live web app
    if (data.accessKey && API_URL) {
      const url = `${API_URL}?key=${encodeURIComponent(data.accessKey)}`;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: data.accessKey,
          accessKey: data.accessKey,
          projects: data.projects,
          activeProjectId: data.activeProjectId,
        }),
      }).catch(() => {});
    }
    return true;
  } catch (err) {
    console.error(`[MCP] Failed to save to ${STORAGE_FILE}:`, err.message);
    return false;
  }
}

/**
 * Layout helper: calculates clean, readable coordinates with equal gutters and alignment.
 * Eliminates overlapping and enforces comfortable reading rhythm.
 */
function layoutNodesWithSpacing(nodes, edges = [], layoutStyle = 'horizontal_tracks') {
  if (!Array.isArray(nodes) || nodes.length === 0) return nodes;

  const CARD_WIDTH = 340;
  const STEP_X = 440; // 340px card + 100px equal readable gutter
  const START_X = 80;
  const START_Y = 80;

  if (layoutStyle === 'horizontal_tracks') {
    // 3 parallel horizontal tracks:
    // Track 0 (Top / Visual mockups/photos): Y = 80
    // Track 1 (Middle / Main strategy nodes): Y = 380
    // Track 2 (Bottom / Explanatory text notes & hypotheses): Y = 680
    const TRACK_Y = {
      imageNode: 80,
      strategyNode: 380,
      textNode: 680,
    };

    const stratNodes = nodes.filter((n) => n.type === 'strategyNode' || (!n.type && !n.data?.text && !n.data?.imageUrl));
    const textNodes = nodes.filter((n) => n.type === 'textNode' || (!n.type && n.data?.text && !n.data?.category));
    const imageNodes = nodes.filter((n) => n.type === 'imageNode' || (!n.type && n.data?.imageUrl && !n.data?.description));

    // Place main strategy cards across middle track
    stratNodes.forEach((node, idx) => {
      node.position = {
        x: START_X + idx * STEP_X,
        y: TRACK_Y.strategyNode,
      };
    });

    // Place text notes: if connected to a strategy node, align directly under it, else place sequentially
    textNodes.forEach((node, idx) => {
      const edge = edges.find((e) => e.source === node.id || e.target === node.id);
      const partnerId = edge ? (edge.source === node.id ? edge.target : edge.source) : null;
      const partner = partnerId ? stratNodes.find((n) => n.id === partnerId) : null;

      if (partner) {
        node.position = { x: partner.position.x, y: TRACK_Y.textNode };
      } else {
        node.position = { x: START_X + idx * STEP_X, y: TRACK_Y.textNode };
      }
    });

    // Place photo cards: if connected to a strategy node, align directly above it, else place sequentially
    imageNodes.forEach((node, idx) => {
      const edge = edges.find((e) => e.source === node.id || e.target === node.id);
      const partnerId = edge ? (edge.source === node.id ? edge.target : edge.source) : null;
      const partner = partnerId ? stratNodes.find((n) => n.id === partnerId) : null;

      if (partner) {
        node.position = { x: partner.position.x, y: TRACK_Y.imageNode };
      } else {
        node.position = { x: START_X + idx * STEP_X, y: TRACK_Y.imageNode };
      }
    });

    return nodes;
  }

  if (layoutStyle === 'stage_columns') {
    // Group into columns of 3 cards each (e.g. Header note -> Strategy card -> Sub-action / photo)
    let col = 0;
    let row = 0;
    nodes.forEach((node) => {
      node.position = {
        x: START_X + col * 460,
        y: START_Y + row * 280,
      };
      row++;
      if (row >= 3) {
        row = 0;
        col++;
      }
    });
    return nodes;
  }

  // Default: sequential grid with wrap at 4 cards per row
  nodes.forEach((node, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    node.position = {
      x: START_X + col * STEP_X,
      y: START_Y + row * 320,
    };
  });

  return nodes;
}

/**
 * Finds neat position relative to existing nodes or at the end of the line with equal spacing.
 */
function getNeatPosition(project, relativeToNodeId, relativePosition = 'right', customPosition = null) {
  if (customPosition && typeof customPosition.x === 'number' && typeof customPosition.y === 'number') {
    return customPosition;
  }

  const nodes = project.nodes || [];

  if (relativeToNodeId) {
    const ref = nodes.find((n) => n.id === relativeToNodeId);
    if (ref && ref.position) {
      const rx = ref.position.x;
      const ry = ref.position.y;
      switch (relativePosition) {
        case 'above':
          return { x: rx, y: ry - 280 };
        case 'below':
          return { x: rx, y: ry + 280 };
        case 'left':
          return { x: rx - 440, y: ry };
        case 'right':
        default:
          return { x: rx + 440, y: ry };
      }
    }
  }

  // If no relative node, position after the rightmost node on canvas
  if (nodes.length > 0) {
    let maxX = 80;
    let maxY = 120;
    nodes.forEach((n) => {
      if (n.position && n.position.x > maxX) {
        maxX = n.position.x;
        maxY = n.position.y;
      }
    });
    return { x: maxX + 440, y: maxY };
  }

  return { x: 80, y: 120 };
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
    description: 'Retrieves the complete graph structure of a specific project (or active project) including all strategy cards, text blocks, photos, categories, metrics, and edge transitions.',
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
    description: 'Performs full-text and semantic search across strategy cards, text blocks, image captions, categories, key metrics, and tags in all projects.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keyword or phrase to search for (e.g. "hardware", "gym", "churn", "D1", "status", "гипотеза").',
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
    description: 'Adds a new strategy card, text note, or photo card, or updates an existing card in a canvas project with clean spacing.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project ID where the node will be added/updated.',
        },
        nodeId: {
          type: 'string',
          description: 'Unique node identifier (e.g. "step_onboarding"). If exists, updates it; otherwise creates a new node.',
        },
        nodeType: {
          type: 'string',
          enum: ['strategyNode', 'textNode', 'imageNode'],
          description: 'Type of card: "strategyNode" (default strategy card), "textNode" (standalone text block/note), or "imageNode" (photo/mockup card).',
        },
        title: {
          type: 'string',
          description: 'Headline title of the card.',
        },
        badge: {
          type: 'string',
          description: 'Short tag/badge (e.g. "Шаг 1", "Retention Engine", "Aha-moment").',
        },
        category: {
          type: 'string',
          enum: ['foundation', 'psychology', 'hardware', 'retention', 'event', 'lifecycle', 'outcome', 'custom'],
          description: 'Category for strategy cards defining accent color and role.',
        },
        description: {
          type: 'string',
          description: 'Detailed description of mechanics, psychology, or logic.',
        },
        keyMetric: {
          type: 'string',
          description: 'Target KPI / metric (e.g. "D30 Retention > 40%").',
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
        text: {
          type: 'string',
          description: 'Text content for textNode (supports multiline, markdown, bullet points).',
        },
        color: {
          type: 'string',
          enum: ['default', 'amber', 'emerald', 'blue', 'rose', 'purple', 'graphite'],
          description: 'Color theme for textNode (default: "default").',
        },
        fontSize: {
          type: 'string',
          enum: ['sm', 'md', 'lg', 'xl'],
          description: 'Font size for textNode.',
        },
        imageUrl: {
          type: 'string',
          description: 'Image URL for imageNode or attached image on strategyNode.',
        },
        caption: {
          type: 'string',
          description: 'Caption for imageNode.',
        },
        width: {
          type: 'number',
          description: 'Card width in pixels (default: 340).',
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
          },
          description: 'Optional manual coordinates. If omitted, positioned neatly with equal spacing.',
        },
        relativeToNodeId: {
          type: 'string',
          description: 'Optional ID of an existing card to place this card next to.',
        },
        relativePosition: {
          type: 'string',
          enum: ['above', 'below', 'right', 'left'],
          description: 'Where to place relative to "relativeToNodeId" (default: "right").',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_text_block',
    description: 'Adds an explanatory text block or note card to the canvas (e.g. for hypotheses, takeaways, stage summaries, instructions) with comfortable spacing.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Target project ID. Defaults to active project.' },
        nodeId: { type: 'string', description: 'Optional unique node ID.' },
        title: { type: 'string', description: 'Optional title of the text block.' },
        text: { type: 'string', description: 'The text content of the note (multiline, bullet points, markdown).' },
        color: {
          type: 'string',
          enum: ['default', 'amber', 'emerald', 'blue', 'rose', 'purple', 'graphite'],
          description: 'Visual color style: "amber" (yellow sticky), "emerald" (green), "blue" (info), "rose" (attention), "purple" (insight), "graphite" (dark solid), "default" (glass).',
        },
        fontSize: { type: 'string', enum: ['sm', 'md', 'lg', 'xl'], description: 'Font size (default: "md").' },
        width: { type: 'number', description: 'Width in pixels (default: 340).' },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
        },
        relativeToNodeId: { type: 'string', description: 'Optional card ID to place this note next to.' },
        relativePosition: { type: 'string', enum: ['above', 'below', 'right', 'left'], description: 'Placement relative to target card (default: "below").' },
      },
      required: ['text'],
    },
  },
  {
    name: 'create_photo_card',
    description: 'Adds an image/mockup card to the canvas with an optional caption and neat positioning.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Target project ID.' },
        nodeId: { type: 'string', description: 'Optional unique node ID.' },
        imageUrl: { type: 'string', description: 'URL or data URI of the image/mockup.' },
        title: { type: 'string', description: 'Optional title for the photo.' },
        caption: { type: 'string', description: 'Optional caption or context note.' },
        width: { type: 'number', description: 'Width in pixels (default: 340).' },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
        },
        relativeToNodeId: { type: 'string', description: 'Optional card ID to place this photo adjacent to.' },
        relativePosition: { type: 'string', enum: ['above', 'below', 'right', 'left'], description: 'Placement relative to card (default: "above").' },
      },
      required: ['imageUrl'],
    },
  },
  {
    name: 'create_or_update_edge',
    description: 'Creates or updates a directed connection (arrow) between two cards on the canvas.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Target project ID.' },
        edgeId: { type: 'string', description: 'Optional edge ID.' },
        source: { type: 'string', description: 'Source card ID.' },
        target: { type: 'string', description: 'Target card ID.' },
        label: { type: 'string', description: 'Optional transition label (e.g. "Конверсия 70%", "Через 7 дней").' },
        animated: { type: 'boolean', description: 'Whether the arrow has particle motion (default: true).' },
        styleType: { type: 'string', enum: ['bezier', 'smoothstep', 'straight'], description: 'Curve style (default: "bezier").' },
        color: { type: 'string', description: 'Custom stroke color hex/rgb.' },
      },
      required: ['source', 'target'],
    },
  },
  {
    name: 'build_explanatory_workflow',
    description: 'Designs and builds a complete, high-quality explanatory retention workflow or strategic system diagram with cards, explanatory text blocks, photos, and connections, laid out with equal readable spacing and clean gutters.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Optional project ID to build into. If omitted, uses active project or creates a new project if "projectTitle" is provided.',
        },
        projectTitle: {
          type: 'string',
          description: 'Title for a new project (if creating a new canvas).',
        },
        projectDescription: {
          type: 'string',
          description: 'Brief overview of the strategic workflow or hypothesis.',
        },
        theme: {
          type: 'string',
          enum: ['dark', 'light', 'graphite', 'monochrome', 'stone', 'slate', 'sand', 'mist'],
          description: 'Visual theme for the canvas project.',
        },
        layoutStyle: {
          type: 'string',
          enum: ['horizontal_tracks', 'stage_columns', 'pipeline_grid'],
          description: 'Layout arrangement: "horizontal_tracks" (visuals top, strategy center, text notes bottom in parallel lines), "stage_columns" (cards grouped by phase columns with headers), or "pipeline_grid" (compact sequential grid). Defaults to "horizontal_tracks".',
        },
        stages: {
          type: 'array',
          description: 'Phases / stages of the workflow. Each stage contains an array of cards (strategy cards, text blocks, photos) that will be placed with equal, comfortable spacing.',
          items: {
            type: 'object',
            properties: {
              stageTitle: { type: 'string', description: 'Title of the stage or phase (e.g. "1. Исследование", "2. Активация")' },
              stageSummary: { type: 'string', description: 'Explanatory context note for this stage (automatically converted to a clean textNode note)' },
              stageColor: { type: 'string', description: 'Color theme for the stage text block (e.g. "amber", "emerald", "blue", "rose", "purple")' },
              cards: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Unique node identifier' },
                    type: { type: 'string', enum: ['strategyNode', 'textNode', 'imageNode'], description: 'Type of node (default: strategyNode)' },
                    title: { type: 'string', description: 'Card title' },
                    category: { type: 'string', description: 'Strategy category (foundation, psychology, hardware, retention, event, lifecycle, outcome, custom)' },
                    badge: { type: 'string', description: 'Badge / pill' },
                    description: { type: 'string', description: 'In-depth description' },
                    keyMetric: { type: 'string', description: 'Key metric (KPI)' },
                    outcome: { type: 'string', description: 'Outcome / value delivered' },
                    tags: { type: 'array', items: { type: 'string' } },
                    text: { type: 'string', description: 'Text content if type is textNode' },
                    color: { type: 'string', description: 'Color preset if type is textNode' },
                    fontSize: { type: 'string', enum: ['sm', 'md', 'lg', 'xl'] },
                    imageUrl: { type: 'string', description: 'Image URL if type is imageNode or image attached to strategy' },
                    caption: { type: 'string', description: 'Image caption if type is imageNode' },
                    width: { type: 'number', description: 'Card width in pixels (default: 340)' },
                  },
                  required: ['title'],
                },
              },
            },
            required: ['stageTitle', 'cards'],
          },
        },
        connections: {
          type: 'array',
          description: 'Directed transitions / arrows connecting cards.',
          items: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Source card ID' },
              target: { type: 'string', description: 'Target card ID' },
              label: { type: 'string', description: 'Transition label / condition' },
              animated: { type: 'boolean', description: 'Whether the edge is animated (default: true)' },
              styleType: { type: 'string', enum: ['bezier', 'smoothstep', 'straight'] },
            },
            required: ['source', 'target'],
          },
        },
        autoConnectSequence: {
          type: 'boolean',
          description: 'If true, automatically creates sequential connections between the main strategy cards in order.',
        },
      },
    },
  },
  {
    name: 'auto_layout_project',
    description: 'Re-arranges all existing cards in a project into a clean, readable sequential layout with equal spacing and no overlaps.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Target project ID. Defaults to active project.' },
        layoutStyle: {
          type: 'string',
          enum: ['horizontal_tracks', 'stage_columns', 'pipeline_grid'],
          description: 'Desired layout arrangement (default: "horizontal_tracks").',
        },
      },
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

  // Helper to ensure target project exists
  const getOrCreateProject = (pId, defaultTitle = 'Новый проект', defaultDesc = 'Создано агентом') => {
    if (!Array.isArray(storage.projects)) storage.projects = [];
    let project = storage.projects.find((p) => p.id === pId);
    if (!project && !pId && storage.activeProjectId) {
      project = storage.projects.find((p) => p.id === storage.activeProjectId);
    }
    if (!project && storage.projects.length > 0) {
      project = storage.projects[0];
    }
    if (!project) {
      project = {
        id: pId || `proj_${Date.now()}`,
        title: defaultTitle,
        description: defaultDesc,
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
    return project;
  };

  switch (name) {
    case 'list_projects': {
      const projects = Array.isArray(storage.projects) ? storage.projects : [];
      const summary = projects.map((p) => {
        const nodes = p.nodes || [];
        const stratCount = nodes.filter((n) => n.type === 'strategyNode' || !n.type).length;
        const textCount = nodes.filter((n) => n.type === 'textNode').length;
        const imgCount = nodes.filter((n) => n.type === 'imageNode').length;

        return {
          id: p.id,
          title: p.title || 'Untitled',
          description: p.description || '',
          isActive: p.id === storage.activeProjectId,
          totalNodes: nodes.length,
          strategyCards: stratCount,
          textBlocks: textCount,
          photoCards: imgCount,
          edgesCount: p.edges?.length || 0,
          tags: p.tags || [],
          layoutMode: p.layoutMode || 'freeform',
          updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
        };
      });

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

      // Categorize strategy nodes and isolate text/image nodes
      const categoriesMap = {};
      const textBlocks = [];
      const photoCards = [];

      for (const n of nodes) {
        if (n.type === 'textNode') {
          textBlocks.push({
            id: n.id,
            title: n.data?.title,
            text: n.data?.text,
            color: n.data?.color,
            fontSize: n.data?.fontSize,
            position: n.position,
          });
        } else if (n.type === 'imageNode') {
          photoCards.push({
            id: n.id,
            title: n.data?.title,
            caption: n.data?.caption,
            imageUrl: n.data?.imageUrl,
            position: n.position,
          });
        } else {
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
            imageUrl: n.data?.imageUrl,
            position: n.position,
          });
        }
      }

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        layoutMode: project.layoutMode,
        theme: project.theme,
        totalNodes: nodes.length,
        strategyCardsCount: nodes.length - textBlocks.length - photoCards.length,
        textBlocksCount: textBlocks.length,
        photoCardsCount: photoCards.length,
        totalEdges: edges.length,
        categorizedStrategyNodes: categoriesMap,
        textBlocks,
        photoCards,
        connections: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.data?.label || e.label || '',
          animated: e.animated,
          styleType: e.data?.styleType || e.styleType,
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
          const text = (d.text || '').toLowerCase();
          const caption = (d.caption || '').toLowerCase();
          const badge = (d.badge || '').toLowerCase();
          const metric = (d.keyMetric || '').toLowerCase();
          const outcome = (d.outcome || '').toLowerCase();
          const tags = (d.tags || []).join(' ').toLowerCase();

          if (
            title.includes(q) ||
            desc.includes(q) ||
            text.includes(q) ||
            caption.includes(q) ||
            badge.includes(q) ||
            metric.includes(q) ||
            outcome.includes(q) ||
            tags.includes(q)
          ) {
            matches.push({
              projectId: proj.id,
              projectTitle: proj.title,
              nodeId: n.id,
              nodeType: n.type || 'strategyNode',
              title: d.title || (n.type === 'textNode' ? d.text?.slice(0, 30) : 'Безымянная карточка'),
              snippet: d.description || d.text || d.caption || '',
              category: d.category,
              badge: d.badge,
              keyMetric: d.keyMetric,
              outcome: d.outcome,
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

      const orphanNodes = nodes
        .filter((n) => inDegree[n.id] === 0 && outDegree[n.id] === 0)
        .map((n) => n.data?.title || n.id);

      const deadEndNodes = nodes
        .filter((n) => inDegree[n.id] > 0 && outDegree[n.id] === 0 && n.data?.category !== 'outcome')
        .map((n) => n.data?.title || n.id);

      const categoryCounts = {};
      for (const n of nodes) {
        if (n.type === 'strategyNode' || !n.type) {
          const cat = n.data?.category || 'custom';
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
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
      const project = getOrCreateProject(args.projectId);
      if (!Array.isArray(project.nodes)) project.nodes = [];

      const nodeType = args.nodeType || 'strategyNode';
      const nodeId = args.nodeId || `${nodeType === 'textNode' ? 'text' : nodeType === 'imageNode' ? 'img' : 'node'}_${Date.now()}`;
      const existingIdx = project.nodes.findIndex((n) => n.id === nodeId);

      const pos = getNeatPosition(project, args.relativeToNodeId, args.relativePosition, args.position);

      let nodeData = {};
      if (nodeType === 'textNode') {
        nodeData = {
          title: args.title || undefined,
          text: args.text || args.description || 'Текстовый блок',
          color: args.color || 'default',
          fontSize: args.fontSize || 'md',
          width: args.width || 340,
        };
      } else if (nodeType === 'imageNode') {
        nodeData = {
          imageUrl: args.imageUrl || '',
          title: args.title || undefined,
          caption: args.caption || args.description || undefined,
          width: args.width || 340,
        };
      } else {
        nodeData = {
          title: args.title,
          badge: args.badge || 'Strategy',
          category: args.category || 'custom',
          description: args.description || '',
          keyMetric: args.keyMetric || '',
          outcome: args.outcome || '',
          tags: args.tags || [],
          imageUrl: args.imageUrl || undefined,
        };
      }

      if (existingIdx >= 0) {
        project.nodes[existingIdx] = {
          ...project.nodes[existingIdx],
          type: nodeType,
          data: {
            ...project.nodes[existingIdx].data,
            ...nodeData,
          },
        };
      } else {
        project.nodes.push({
          id: nodeId,
          type: nodeType,
          position: pos,
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
        nodeType,
        position: pos,
        nodeData,
      };
    }

    case 'create_text_block': {
      const project = getOrCreateProject(args.projectId);
      if (!Array.isArray(project.nodes)) project.nodes = [];

      const nodeId = args.nodeId || `text_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const pos = getNeatPosition(project, args.relativeToNodeId, args.relativePosition || 'below', args.position);

      const textNode = {
        id: nodeId,
        type: 'textNode',
        position: pos,
        data: {
          title: args.title || undefined,
          text: args.text,
          color: args.color || 'default',
          fontSize: args.fontSize || 'md',
          width: args.width || 340,
        },
      };

      project.nodes.push(textNode);
      project.updatedAt = Date.now();
      saveStorage(storage);

      return {
        success: true,
        projectId: project.id,
        nodeId,
        type: 'textNode',
        position: pos,
        title: args.title,
        color: args.color || 'default',
      };
    }

    case 'create_photo_card': {
      const project = getOrCreateProject(args.projectId);
      if (!Array.isArray(project.nodes)) project.nodes = [];

      const nodeId = args.nodeId || `img_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const pos = getNeatPosition(project, args.relativeToNodeId, args.relativePosition || 'above', args.position);

      const photoNode = {
        id: nodeId,
        type: 'imageNode',
        position: pos,
        data: {
          imageUrl: args.imageUrl,
          title: args.title || undefined,
          caption: args.caption || undefined,
          width: args.width || 340,
        },
      };

      project.nodes.push(photoNode);
      project.updatedAt = Date.now();
      saveStorage(storage);

      return {
        success: true,
        projectId: project.id,
        nodeId,
        type: 'imageNode',
        position: pos,
        title: args.title,
      };
    }

    case 'create_or_update_edge': {
      const project = getOrCreateProject(args.projectId);
      if (!Array.isArray(project.edges)) project.edges = [];

      const edgeId = args.edgeId || `e_${args.source}_${args.target}`;
      const existingIdx = project.edges.findIndex((e) => e.id === edgeId || (e.source === args.source && e.target === args.target));

      const edgeObj = {
        id: edgeId,
        source: args.source,
        target: args.target,
        animated: args.animated !== false,
        styleType: args.styleType || 'bezier',
        data: {
          label: args.label || undefined,
          color: args.color || undefined,
        },
      };

      if (existingIdx >= 0) {
        project.edges[existingIdx] = {
          ...project.edges[existingIdx],
          ...edgeObj,
        };
      } else {
        project.edges.push(edgeObj);
      }

      project.updatedAt = Date.now();
      saveStorage(storage);

      return {
        success: true,
        action: existingIdx >= 0 ? 'updated' : 'created',
        projectId: project.id,
        edgeId,
        source: args.source,
        target: args.target,
        label: args.label,
      };
    }

    case 'build_explanatory_workflow': {
      const pId = args.projectId || (args.projectTitle ? `proj_${Date.now()}` : storage.activeProjectId);
      const project = getOrCreateProject(pId, args.projectTitle || 'Объяснительный воркфлоу', args.projectDescription);

      if (args.projectTitle) project.title = args.projectTitle;
      if (args.projectDescription) project.description = args.projectDescription;
      if (args.theme) project.theme = args.theme;

      const layoutStyle = args.layoutStyle || 'horizontal_tracks';
      let createdNodes = [];
      let createdEdges = Array.isArray(args.edges)
        ? [...args.edges]
        : Array.isArray(args.connections)
        ? [...args.connections]
        : [];

      if (Array.isArray(args.stages) && args.stages.length > 0) {
        if (layoutStyle === 'horizontal_tracks') {
          // Horizontal tracks paradigm:
          // Top row (y=80): Photos & mockups
          // Mid row (y=380): Strategy cards
          // Bottom row (y=680): Explanatory notes & hypotheses
          const stages = args.stages;
          const photos = Array.isArray(args.photos) ? args.photos : [];
          const textNotes = Array.isArray(args.textNotes) ? args.textNotes : [];

          stages.forEach((stage, idx) => {
            const colX = 80 + idx * 440;
            const stageCards = Array.isArray(stage.cards) && stage.cards.length > 0
              ? stage.cards
              : [stage];

            // Strategy card(s)
            stageCards.forEach((c, cIdx) => {
              const cId = c.id || `node_stage_${idx + 1}_${cIdx + 1}_${Date.now()}`;
              createdNodes.push({
                id: cId,
                type: 'strategyNode',
                position: { x: colX, y: 380 + cIdx * 280 },
                data: {
                  title: c.title || `Шаг ${idx + 1}`,
                  badge: c.badge || `Шаг ${idx + 1}`,
                  category: c.category || 'foundation',
                  description: c.description || '',
                  keyMetric: c.keyMetric,
                  outcome: c.outcome,
                  imageUrl: c.imageUrl,
                  tags: c.tags || [`Stage-${idx + 1}`],
                },
              });
            });

            // Photos for this stage
            const stagePhotos = photos.filter((p) => (p.stageIndex === idx || p.stageId === stage.id));
            stagePhotos.forEach((p, pIdx) => {
              const pId = p.id || `img_stage_${idx + 1}_${pIdx + 1}_${Date.now()}`;
              createdNodes.push({
                id: pId,
                type: 'imageNode',
                position: { x: colX, y: 80 - pIdx * 280 },
                data: {
                  title: p.title,
                  imageUrl: p.imageUrl || '',
                  caption: p.caption || p.description,
                  width: p.width || 340,
                },
              });
            });

            // Text notes for this stage
            const stageNotes = textNotes.filter((t) => (t.stageIndex === idx || t.stageId === stage.id));
            stageNotes.forEach((t, tIdx) => {
              const tId = t.id || `note_stage_${idx + 1}_${tIdx + 1}_${Date.now()}`;
              createdNodes.push({
                id: tId,
                type: 'textNode',
                position: { x: colX, y: 680 + tIdx * 240 },
                data: {
                  title: t.title,
                  text: t.text || t.description || 'Заметка к этапу',
                  color: t.color || 'amber',
                  fontSize: t.fontSize || 'md',
                  width: t.width || 340,
                },
              });
            });
          });
        } else {
          // Stage columns or general columns layout
          let stageCol = 0;
          for (const stage of args.stages) {
            const colX = 80 + stageCol * 460;
            let currentY = 80;

            // Stage banner / context note
            if (stage.stageTitle || stage.stageSummary) {
              const headerId = `note_stage_${stageCol + 1}_${Date.now()}`;
              createdNodes.push({
                id: headerId,
                type: 'textNode',
                position: { x: colX, y: currentY },
                data: {
                  title: stage.stageTitle,
                  text: stage.stageSummary || `Контекст этапа: ${stage.stageTitle}`,
                  color: stage.stageColor || (stageCol === 0 ? 'blue' : stageCol === 1 ? 'purple' : stageCol === 2 ? 'amber' : 'emerald'),
                  fontSize: 'md',
                  width: 340,
                },
              });
              currentY += 240;
            }

            const cards = Array.isArray(stage.cards) && stage.cards.length > 0
              ? stage.cards
              : [stage];

            for (const card of cards) {
              const cType = card.type || 'strategyNode';
              const cId = card.id || `${cType === 'textNode' ? 'text' : cType === 'imageNode' ? 'img' : 'node'}_${stageCol}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

              if (cType === 'textNode') {
                createdNodes.push({
                  id: cId,
                  type: 'textNode',
                  position: { x: colX, y: currentY },
                  data: {
                    title: card.title || undefined,
                    text: card.text || card.description || 'Заметка',
                    color: card.color || 'default',
                    fontSize: card.fontSize || 'md',
                    width: card.width || 340,
                  },
                });
                currentY += 240;
              } else if (cType === 'imageNode') {
                createdNodes.push({
                  id: cId,
                  type: 'imageNode',
                  position: { x: colX, y: currentY },
                  data: {
                    imageUrl: card.imageUrl || '',
                    title: card.title || undefined,
                    caption: card.caption || card.description || undefined,
                    width: card.width || 340,
                  },
                });
                currentY += 320;
              } else {
                createdNodes.push({
                  id: cId,
                  type: 'strategyNode',
                  position: { x: colX, y: currentY },
                  data: {
                    title: card.title || `Этап ${stageCol + 1}`,
                    badge: card.badge || `Этап ${stageCol + 1}`,
                    category: card.category || 'foundation',
                    description: card.description || '',
                    keyMetric: card.keyMetric || undefined,
                    outcome: card.outcome || undefined,
                    imageUrl: card.imageUrl || undefined,
                    tags: card.tags || [`Stage-${stageCol + 1}`],
                  },
                });
                currentY += 280;
              }
            }

            stageCol++;
          }
        }
      } else if (Array.isArray(args.nodes) && args.nodes.length > 0) {
        // Build using flat list of nodes and apply smart equal-margin layout
        createdNodes = args.nodes.map((n, idx) => {
          const cType = n.type || 'strategyNode';
          const cId = n.id || `${cType === 'textNode' ? 'text' : cType === 'imageNode' ? 'img' : 'node'}_${idx + 1}`;
          return {
            id: cId,
            type: cType,
            position: n.position || { x: 80, y: 80 },
            data: {
              title: n.title,
              badge: n.badge || 'Step',
              category: n.category || 'foundation',
              description: n.description || '',
              keyMetric: n.keyMetric,
              outcome: n.outcome,
              text: n.text || n.description,
              color: n.color || 'default',
              fontSize: n.fontSize || 'md',
              imageUrl: n.imageUrl,
              caption: n.caption,
              width: n.width || 340,
              tags: n.tags || [],
            },
          };
        });

        // Run layout algorithm to guarantee equal spacing and tracks
        createdNodes = layoutNodesWithSpacing(createdNodes, createdEdges, layoutStyle);
      }

      // Auto-connect sequential strategy cards if requested
      if (args.autoConnectSequence) {
        const stratOnly = createdNodes.filter((n) => n.type === 'strategyNode' || !n.type);
        for (let i = 0; i < stratOnly.length - 1; i++) {
          const src = stratOnly[i].id;
          const tgt = stratOnly[i + 1].id;
          if (!createdEdges.some((e) => e.source === src && e.target === tgt)) {
            createdEdges.push({
              id: `e_${src}_${tgt}`,
              source: src,
              target: tgt,
              label: 'следующий этап',
              animated: true,
              styleType: 'bezier',
            });
          }
        }
      }

      project.nodes = createdNodes;
      project.edges = createdEdges.map((e) => ({
        id: e.id || `e_${e.source}_${e.target}`,
        source: e.source,
        target: e.target,
        animated: e.animated !== false,
        styleType: e.styleType || 'bezier',
        data: {
          label: e.label || undefined,
        },
      }));

      project.updatedAt = Date.now();
      saveStorage(storage);

      return {
        success: true,
        projectId: project.id,
        projectTitle: project.title,
        layoutStyle,
        totalNodesCreated: createdNodes.length,
        strategyNodesCount: createdNodes.filter((n) => n.type === 'strategyNode').length,
        textBlocksCount: createdNodes.filter((n) => n.type === 'textNode').length,
        photoCardsCount: createdNodes.filter((n) => n.type === 'imageNode').length,
        totalEdgesCreated: project.edges.length,
      };
    }

    case 'auto_layout_project': {
      const pId = args.projectId || storage.activeProjectId;
      const project = storage.projects?.find((p) => p.id === pId) || storage.projects?.[0];
      if (!project) throw new Error(`Project "${pId}" not found.`);

      const layoutStyle = args.layoutStyle || 'horizontal_tracks';
      project.nodes = layoutNodesWithSpacing(project.nodes || [], project.edges || [], layoutStyle);
      project.updatedAt = Date.now();
      saveStorage(storage);

      return {
        success: true,
        projectId: project.id,
        layoutStyle,
        nodesRealignedCount: project.nodes.length,
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
          version: '2.0.0',
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

const isDirectRun = process.argv[1] && (
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
  process.argv[1].endsWith('mcp/index.js')
);

if (isDirectRun) {
  main();
}

export { TOOLS, executeTool, handleMessage, loadStorage, saveStorage };
