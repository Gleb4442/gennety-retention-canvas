import type { 
  CanvasProject, 
  ImageNode,
  TextNode,
  BoardNode,
  StrategyEdge, 
  CategoryType, 
  LayoutMode, 
  ThemeMode,
  DrawingStroke
} from '../types';
import { CATEGORIES } from '../constants/categories';

export interface ParseResult {
  success: boolean;
  project?: CanvasProject;
  error?: string;
  warnings?: string[];
  stats?: {
    nodeCount: number;
    edgeCount: number;
    title: string;
    categories: Record<string, number>;
  };
}

const VALID_CATEGORIES: CategoryType[] = [
  'foundation',
  'psychology',
  'hardware',
  'retention',
  'event',
  'lifecycle',
  'outcome',
  'custom',
];

/**
 * Normalizes any arbitrary category string (even from rough LLM output) into a valid CategoryType.
 */
function normalizeCategory(cat: unknown): CategoryType {
  if (typeof cat !== 'string') return 'foundation';
  const clean = cat.toLowerCase().trim();
  
  if (VALID_CATEGORIES.includes(clean as CategoryType)) {
    return clean as CategoryType;
  }

  // Synonym mappings
  if (clean.includes('psych') || clean.includes('эмоци') || clean.includes('статус') || clean.includes('value')) {
    return 'psychology';
  }
  if (clean.includes('hard') || clean.includes('устройств') || clean.includes('девайс') || clean.includes('маяк') || clean.includes('сигнал')) {
    return 'hardware';
  }
  if (clean.includes('retention') || clean.includes('удержан') || clean.includes('habit') || clean.includes('привычк') || clean.includes('цикл')) {
    return 'retention';
  }
  if (clean.includes('event') || clean.includes('мероприят') || clean.includes('событ') || clean.includes('ивент') || clean.includes('встреч')) {
    return 'event';
  }
  if (clean.includes('life') || clean.includes('churn') || clean.includes('отток') || clean.includes('жизнен') || clean.includes('реактивац')) {
    return 'lifecycle';
  }
  if (clean.includes('outcome') || clean.includes('результ') || clean.includes('итог') || clean.includes('цель') || clean.includes('apex') || clean.includes('финал')) {
    return 'outcome';
  }
  if (clean.includes('custom') || clean.includes('кастом') || clean.includes('прочее')) {
    return 'custom';
  }

  return 'foundation';
}

/**
 * Strips markdown fences, surrounding text, and extracts pure JSON.
 */
export function extractJsonString(rawInput: string): string {
  let text = rawInput.trim();

  // Strip markdown code block ```json ... ``` or ``` ... ```
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    text = match[1].trim();
  }

  // If there's still text before the first { or [
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIndex = -1;

  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }

  if (startIndex > 0) {
    text = text.slice(startIndex);
  }

  // Trim text after last } or ]
  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');
  const endIndex = Math.max(lastBrace, lastBracket);

  if (endIndex !== -1 && endIndex < text.length - 1) {
    text = text.slice(0, endIndex + 1);
  }

  return text;
}

/**
 * Automatically calculates visual layout coordinates for nodes that lack them or all start at (0, 0).
 */
function autoLayoutNodes(
  nodes: BoardNode[], 
  edges: StrategyEdge[]
): BoardNode[] {
  // Check if nodes already have well-distributed positions
  const posKeys = new Set(nodes.map(n => `${Math.round(n.position.x)},${Math.round(n.position.y)}`));
  const needsLayout = posKeys.size <= 1 || nodes.some(n => n.position.x === 0 && n.position.y === 0);

  if (!needsLayout && posKeys.size > nodes.length * 0.7) {
    return nodes;
  }

  // Build adjacency map for topological sorting / layer assignment
  const inDegree: Record<string, number> = {};
  const outgoing: Record<string, string[]> = {};
  
  nodes.forEach(n => {
    inDegree[n.id] = 0;
    outgoing[n.id] = [];
  });

  edges.forEach(e => {
    if (inDegree[e.target] !== undefined) {
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    }
    if (outgoing[e.source]) {
      outgoing[e.source].push(e.target);
    }
  });

  // Assign layers (columns)
  const layerMap: Record<string, number> = {};
  let currentLayer = 0;
  let queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);

  if (queue.length === 0) {
    // If cyclic or no roots, seed with first node
    queue = [nodes[0].id];
  }

  const visited = new Set<string>();

  while (queue.length > 0) {
    const nextQueue: string[] = [];
    queue.forEach(nodeId => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        layerMap[nodeId] = currentLayer;
        (outgoing[nodeId] || []).forEach(targetId => {
          if (!visited.has(targetId) && !nextQueue.includes(targetId)) {
            nextQueue.push(targetId);
          }
        });
      }
    });
    queue = nextQueue;
    currentLayer++;
    if (currentLayer > 20) break; // safety guard
  }

  // Any remaining nodes without a layer
  nodes.forEach((n, idx) => {
    if (layerMap[n.id] === undefined) {
      layerMap[n.id] = idx % 3;
    }
  });

  // Group nodes by layer
  const nodesByLayer: Record<number, string[]> = {};
  Object.entries(layerMap).forEach(([nodeId, layer]) => {
    if (!nodesByLayer[layer]) nodesByLayer[layer] = [];
    nodesByLayer[layer].push(nodeId);
  });

  // Calculate coordinates: horizontal left-to-right flow with nice vertical spacing
  const layerKeys = Object.keys(nodesByLayer).map(Number).sort((a, b) => a - b);
  const nodePositionMap: Record<string, { x: number; y: number }> = {};

  const X_STEP = 420;
  const Y_STEP = 240;
  const START_X = 80;
  const START_Y = 120;

  layerKeys.forEach(layer => {
    const layerNodeIds = nodesByLayer[layer];
    const totalHeight = (layerNodeIds.length - 1) * Y_STEP;
    const layerStartY = Math.max(START_Y, 300 - totalHeight / 2);

    layerNodeIds.forEach((nodeId, rowIdx) => {
      nodePositionMap[nodeId] = {
        x: START_X + layer * X_STEP,
        y: layerStartY + rowIdx * Y_STEP,
      };
    });
  });

  return nodes.map(n => ({
    ...n,
    position: nodePositionMap[n.id] || n.position,
  }));
}

/**
 * Parses, normalizes, and validates arbitrary JSON into a complete CanvasProject.
 */
export function parseCanvasJson(
  rawInput: string, 
  titleOverride?: string
): ParseResult {
  const warnings: string[] = [];

  if (!rawInput || !rawInput.trim()) {
    return { success: false, error: 'Входной текст JSON пуст. Пожалуйста, вставьте JSON-код.' };
  }

  const cleanedText = extractJsonString(rawInput);

  let parsedData: any;
  try {
    parsedData = JSON.parse(cleanedText);
  } catch (err: any) {
    return {
      success: false,
      error: `Ошибка синтаксиса JSON: ${err?.message || 'Проверьте правильность кавычек и запятых'}`,
    };
  }

  // Detect root shape
  let rawProject: any = parsedData;
  if (parsedData.project && typeof parsedData.project === 'object') {
    rawProject = parsedData.project;
  } else if (Array.isArray(parsedData.projects) && parsedData.projects.length > 0) {
    rawProject = parsedData.projects[0];
    warnings.push('Обнаружен полный бэкап воркспейса. Импортирован первый проект.');
  }

  // Raw nodes & edges array detection
  let rawNodes: any[] = [];
  let rawEdges: any[] = [];

  if (Array.isArray(rawProject)) {
    // Top-level is an array of nodes
    rawNodes = rawProject;
    rawEdges = [];
  } else if (typeof rawProject === 'object' && rawProject !== null) {
    if (Array.isArray(rawProject.nodes)) {
      rawNodes = rawProject.nodes;
    } else if (Array.isArray(rawProject.cards)) {
      rawNodes = rawProject.cards;
    } else if (Array.isArray(rawProject.blocks)) {
      rawNodes = rawProject.blocks;
    } else if (Array.isArray(rawProject.steps)) {
      rawNodes = rawProject.steps;
    }

    if (Array.isArray(rawProject.edges)) {
      rawEdges = rawProject.edges;
    } else if (Array.isArray(rawProject.connections)) {
      rawEdges = rawProject.connections;
    } else if (Array.isArray(rawProject.links)) {
      rawEdges = rawProject.links;
    }
  }

  if (rawNodes.length === 0) {
    return {
      success: false,
      error: 'В JSON не найдены карточки/узлы (ожидался массив "nodes" или "cards").',
    };
  }

  // Map to resolve edge source/target by title if LLM didn't use IDs
  const idByTitle: Record<string, string> = {};

  const categoryStats: Record<string, number> = {};

  // Process & Normalize Nodes
  const nodes: BoardNode[] = rawNodes.map((n: any, idx: number) => {
    const rawId = String(n.id || n.nodeId || n.key || `node_${idx + 1}`).trim();
    const dataObj = n.data && typeof n.data === 'object' ? n.data : {};

    const rawTitle = String(dataObj.title || n.title || n.name || n.header || `Шаг ${idx + 1}`).trim();
    idByTitle[rawTitle.toLowerCase()] = rawId;

    // Position detection
    let posX = 0;
    let posY = 0;
    if (n.position && typeof n.position === 'object') {
      posX = typeof n.position.x === 'number' ? n.position.x : 0;
      posY = typeof n.position.y === 'number' ? n.position.y : 0;
    } else if (typeof n.x === 'number' && typeof n.y === 'number') {
      posX = n.x;
      posY = n.y;
    }

    // Check if standalone ImageNode
    if (n.type === 'imageNode' || (!dataObj.description && !n.description && (dataObj.imageUrl || n.imageUrl) && !dataObj.category)) {
      return {
        id: rawId,
        type: 'imageNode' as const,
        position: { x: posX, y: posY },
        data: {
          imageUrl: dataObj.imageUrl || n.imageUrl || '',
          title: rawTitle && rawTitle !== `Шаг ${idx + 1}` ? rawTitle : undefined,
          caption: dataObj.caption || n.caption || undefined,
          width: typeof dataObj.width === 'number' ? dataObj.width : (typeof n.width === 'number' ? n.width : 340),
        },
      } as ImageNode;
    }

    // Check if standalone TextNode
    if (n.type === 'textNode') {
      return {
        id: rawId,
        type: 'textNode' as const,
        position: { x: posX, y: posY },
        data: {
          text: String(dataObj.text || n.text || dataObj.content || n.content || dataObj.description || n.description || '').trim(),
          title: rawTitle && rawTitle !== `Шаг ${idx + 1}` ? rawTitle : undefined,
          color: dataObj.color || n.color || 'default',
          fontSize: dataObj.fontSize || n.fontSize || 'md',
          width: typeof dataObj.width === 'number' ? dataObj.width : (typeof n.width === 'number' ? n.width : 340),
        },
      } as TextNode;
    }

    const category = normalizeCategory(dataObj.category || n.category || n.typeCategory || 'foundation');
    categoryStats[category] = (categoryStats[category] || 0) + 1;

    const defaultBadge = CATEGORIES[category]?.badgeDefault || 'Card';
    const badge = String(dataObj.badge || n.badge || n.tag || n.step || defaultBadge).trim();

    const description = String(
      dataObj.description || n.description || n.desc || n.text || n.content || ''
    ).trim();

    const keyMetric = dataObj.keyMetric || n.keyMetric || n.metric || n.target || undefined;
    const outcome = dataObj.outcome || n.outcome || n.result || n.impact || undefined;
    const notes = dataObj.notes || n.notes || n.comment || undefined;
    const imageUrl = dataObj.imageUrl || n.imageUrl || undefined;
    
    let tags: string[] = [];
    if (Array.isArray(dataObj.tags)) tags = dataObj.tags.map(String);
    else if (Array.isArray(n.tags)) tags = n.tags.map(String);
    else if (typeof n.tags === 'string') tags = n.tags.split(',').map((t: string) => t.trim());

    return {
      id: rawId,
      type: 'strategyNode' as const,
      position: { x: posX, y: posY },
      data: {
        title: rawTitle,
        badge,
        category,
        description,
        keyMetric: keyMetric ? String(keyMetric) : undefined,
        outcome: outcome ? String(outcome) : undefined,
        notes: notes ? String(notes) : undefined,
        tags: tags.length > 0 ? tags : undefined,
        imageUrl: imageUrl ? String(imageUrl) : undefined,
      },
    };
  });

  const validNodeIds = new Set(nodes.map(n => n.id));

  // Process & Normalize Edges
  const edges: StrategyEdge[] = [];
  rawEdges.forEach((e: any, idx: number) => {
    let source = String(e.source || e.from || e.sourceId || e.start || '').trim();
    let target = String(e.target || e.to || e.targetId || e.end || '').trim();

    // If source/target isn't a direct node ID, try title lookup
    if (!validNodeIds.has(source) && idByTitle[source.toLowerCase()]) {
      source = idByTitle[source.toLowerCase()];
    }
    if (!validNodeIds.has(target) && idByTitle[target.toLowerCase()]) {
      target = idByTitle[target.toLowerCase()];
    }

    if (!validNodeIds.has(source) || !validNodeIds.has(target)) {
      warnings.push(`Пропущена связь #${idx + 1}: узел "${source}" или "${target}" не существует.`);
      return;
    }

    const edgeId = String(e.id || `e_${source}_${target}_${idx}`);
    const edgeData = e.data && typeof e.data === 'object' ? e.data : {};

    const label = e.label || edgeData.label || e.text || undefined;
    const animated = e.animated !== undefined ? Boolean(e.animated) : (edgeData.animated !== undefined ? Boolean(edgeData.animated) : true);
    const styleType = (['bezier', 'smoothstep', 'straight'].includes(e.styleType || edgeData.styleType)
      ? (e.styleType || edgeData.styleType)
      : 'bezier') as 'bezier' | 'smoothstep' | 'straight';
    const edgeImageUrl = edgeData.imageUrl || e.imageUrl || undefined;

    edges.push({
      id: edgeId,
      source,
      target,
      type: 'customEdge',
      animated,
      data: {
        label: label ? String(label) : undefined,
        animated,
        styleType,
        color: e.color || edgeData.color || undefined,
        imageUrl: edgeImageUrl ? String(edgeImageUrl) : undefined,
      },
    });
  });

  // Auto layout if needed
  const finalNodes = autoLayoutNodes(nodes, edges);

  const now = Date.now();
  const projectTitle = String(
    titleOverride ||
    rawProject.title ||
    rawProject.name ||
    rawProject.projectName ||
    `Импортированная схема (${new Date().toLocaleDateString('ru-RU')})`
  ).trim();

  const projectDesc = String(
    rawProject.description ||
    rawProject.desc ||
    'Схема создана на основе импортированного JSON / AI-промпта.'
  ).trim();

  const layoutMode: LayoutMode = ['freeform', 'pyramid', 'flywheel'].includes(rawProject.layoutMode)
    ? rawProject.layoutMode
    : 'freeform';

  const theme: ThemeMode = ['dark', 'light', 'graphite', 'monochrome', 'stone', 'slate', 'sand', 'mist'].includes(rawProject.theme)
    ? rawProject.theme
    : 'dark';

  const drawings: DrawingStroke[] = Array.isArray(rawProject.drawings) ? rawProject.drawings : [];

  const project: CanvasProject = {
    id: `proj_${now}_json_${Math.random().toString(36).substring(2, 7)}`,
    title: projectTitle,
    description: projectDesc,
    nodes: finalNodes,
    edges,
    drawings,
    layoutMode,
    theme,
    createdAt: now,
    updatedAt: now,
    tags: Array.isArray(rawProject.tags) ? rawProject.tags.map(String) : ['AI-Imported'],
    isFavorite: false,
  };

  return {
    success: true,
    project,
    warnings: warnings.length > 0 ? warnings : undefined,
    stats: {
      nodeCount: finalNodes.length,
      edgeCount: edges.length,
      title: projectTitle,
      categories: categoryStats,
    },
  };
}

/**
 * Ready-to-copy system prompt for ChatGPT, Claude, and Gemini with sample A4 sketch instructions.
 */
export const AI_SYSTEM_PROMPT_TEMPLATE = `Ты — экспертный архитектор продуктовых стратегий и UI/UX retention-графов.
Твоя задача: проанализировать прикрепленное изображение (набросок от руки на листе бумаги А4, ментальную карту, вайтборд или блок-схему) и преобразовать его в чистый, валидный JSON-код для импорта в интерактивный инструмент "Retention Canvas".

СФОРМИРУЙ СТРОГО ВАЛИДНЫЙ JSON БЕЗ ЛИШНЕГО ТЕКСТА:

\`\`\`json
{
  "title": "Название схемы (например: Воронка онбординга Gennety)",
  "description": "Краткое описание гипотезы или цепочки шагов",
  "layoutMode": "freeform",
  "theme": "dark",
  "nodes": [
    {
      "id": "step_1",
      "position": { "x": 80, "y": 200 },
      "data": {
        "title": "КОРОТКИЙ ЕМКИЙ ЗАГОЛОВОК ШАГА (КАПСОМ ИЛИ ОБЫЧНЫМ)",
        "badge": "Шаг 1 / Триггер",
        "category": "foundation",
        "description": "Подробное описание: что происходит на этом этапе, механику действия и логику.",
        "keyMetric": "Целевая метрика (например: CR 75%, D1 42%)",
        "outcome": "Конечный результат или ценность для пользователя/бизнеса",
        "tags": ["Onboarding", "Activation"]
      }
    },
    {
      "id": "step_2",
      "position": { "x": 500, "y": 200 },
      "data": {
        "title": "ЦЕННОСТЬ И ПЕРВЫЙ УСПЕХ (AHA-MOMENT)",
        "badge": "Value Delivery",
        "category": "psychology",
        "description": "Доставка ключевой ценности и формирование первого эмоционального якоря.",
        "keyMetric": "Aha-Moment за 60 секунд",
        "outcome": "Эмоциональная привязка к продукту",
        "tags": ["Psychology", "Aha"]
      }
    }
  ],
  "edges": [
    {
      "id": "e_step1_step2",
      "source": "step_1",
      "target": "step_2",
      "label": "Успешная регистрация",
      "animated": true,
      "styleType": "bezier"
    }
  ]
}
\`\`\`

ДОСТУПНЫЕ КАТЕГОРИИ (поле "category"):
1. "foundation" — Базовая стратегия, смена бизнес-модели, ключевая основа (голубой акцент)
2. "psychology" — Психология клиента, эмоции, статус, самовыражение, ценность (фиолетовый акцент)
3. "hardware" — Аппаратные решения, физические сигналы, аксессуары, маяки (янтарный акцент)
4. "retention" — Механики удержания, циклы возврата, модель привычки (изумрудный акцент)
5. "event" — Мероприятия, ивенты, встречи, комьюнити (синий акцент)
6. "lifecycle" — Жизненный цикл, борьба с оттоком, реактивация пользователей (коралловый акцент)
7. "outcome" — Стратегический результат, главная цель, вершина воронки (золотой акцент)
8. "custom" — Произвольный пользовательский шаг или блок (нейтральный серый акцент)

ПРАВИЛА КООРДИНАТ (поле "position"):
- Шаг по горизонтали между связанными этапами: X + 420 px (например 80 -> 500 -> 920 -> 1340).
- Шаг по вертикали для параллельных веток: Y + 240 px (например 100 -> 340 -> 580).
- Если граф сложный — расставь узлы так, чтобы стрелки шли слева направо или сверху вниз без наложений.

ОТВЕЧАЙ ТОЛЬКО БЛОКОМ JSON В РАЗМЕТКЕ \`\`\`json ... \`\`\` БЕЗ ВВОДНЫХ И ЗАКЛЮЧИТЕЛЬНЫХ ФРАЗ!`;
