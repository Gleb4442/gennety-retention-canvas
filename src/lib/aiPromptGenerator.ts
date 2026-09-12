import type { CanvasProject, StrategyNode, StrategyEdge, CategoryType } from '../types';
import { getDirectAuthUrl, getApiWorkspaceUrl } from './auth';

export interface PromptGeneratorOptions {
  accessKey: string;
  projects: CanvasProject[];
  currentProjectId: string;
  includeAllProjectsDump?: boolean;
  baseUrl?: string;
}

const CATEGORY_NAMES: Record<CategoryType, string> = {
  foundation: 'Фундамент & Смена парадигмы (Голубой)',
  psychology: 'Психология & Эмоции/Статус (Фиолетовый)',
  hardware: 'Hardware & Физические маяки (Янтарный)',
  retention: 'Механики удержания & Gym-model (Изумрудный)',
  event: 'Ивенты & Двойственность форматов (Синий)',
  lifecycle: 'Жизненный цикл & Борьба с оттоком (Коралловый)',
  outcome: 'Бизнес-цель & Топ-1 Retention (Золотой)',
  custom: 'Пользовательский узел (Серый)',
};

export function generateAgentBridgePrompt(options: PromptGeneratorOptions): string {
  const {
    accessKey,
    projects,
    currentProjectId,
    includeAllProjectsDump = true,
    baseUrl = 'https://gennety-retention-canvas.vercel.app',
  } = options;

  const directAuthUrl = getDirectAuthUrl(accessKey, baseUrl);
  const apiWorkspaceUrl = getApiWorkspaceUrl(accessKey, baseUrl);
  const activeProj = projects.find((p) => p.id === currentProjectId) || projects[0];

  const totalNodes = projects.reduce((acc, p) => acc + (p.nodes?.length || 0), 0);
  const totalEdges = projects.reduce((acc, p) => acc + (p.edges?.length || 0), 0);

  // Build projects overview table
  const projectsList = projects
    .map((p, idx) => {
      const isActive = p.id === activeProj?.id;
      const nodesCount = p.nodes?.length || 0;
      const edgesCount = p.edges?.length || 0;
      const tags = (p.tags || []).join(', ') || 'нет тегов';
      const updated = new Date(p.updatedAt).toLocaleString('ru-RU');
      return `${idx + 1}. **${p.title}** ${isActive ? '⭐ *(АКТИВНЫЙ ПРОЕКТ НА ЭКРАНЕ)*' : ''}
   - **ID**: \`${p.id}\` | **Узлов**: ${nodesCount} | **Связей**: ${edgesCount} | **Обновлен**: ${updated}
   - **Теги**: ${tags}
   - **Описание**: ${p.description || 'Без описания'}`;
    })
    .join('\n\n');

  // Format detailed nodes and edges for a project
  const formatProjectDetails = (proj: CanvasProject) => {
    const nodes = (proj.nodes || []) as StrategyNode[];
    const edges = (proj.edges || []) as StrategyEdge[];

    const nodesByCategory: Record<string, StrategyNode[]> = {};
    for (const n of nodes) {
      const cat = (n.data?.category || 'custom') as string;
      if (!nodesByCategory[cat]) nodesByCategory[cat] = [];
      nodesByCategory[cat].push(n);
    }

    let nodesText = '';
    for (const [catKey, catNodes] of Object.entries(nodesByCategory)) {
      const catTitle = CATEGORY_NAMES[catKey as CategoryType] || catKey;
      nodesText += `\n#### 🏷 Категория: ${catTitle} (${catNodes.length} узлов)\n`;
      for (const node of catNodes) {
        const d = node.data || {};
        nodesText += `\n- **[${node.id}] «${d.title}»** ${d.badge ? `[Бейдж: ${d.badge}]` : ''}
  * **Суть / Механика**: ${d.description || '—'}
  * **Ключевая метрика (Key Metric)**: ${d.keyMetric || 'Не указана'}
  * **Результат шага (Outcome)**: ${d.outcome || 'Не указан'}
  * **Теги**: ${(d.tags || []).join(', ') || 'нет'}${d.imageUrl ? `\n  * **Медиа**: ${d.imageUrl}` : ''}`;
      }
    }

    let edgesText = '';
    if (edges.length > 0) {
      edgesText = edges
        .map((e) => {
          const lbl = e.data?.label || e.label || 'связан с';
          return `- \`${e.source}\` ──[ ${lbl} ]──► \`${e.target}\``;
        })
        .join('\n');
    } else {
      edgesText = 'Связей пока нет.';
    }

    return `### Проект: «${proj.title}» (ID: \`${proj.id}\`)
*Описание*: ${proj.description || '—'}
*Режим холста*: \`${proj.layoutMode || 'freeform'}\` | *Тема*: \`${proj.theme || 'dark'}\`

#### Блоки схемы (${nodes.length} шт.):
${nodesText || 'Узлов нет.'}

#### Направленные связи и переходы (${edges.length} шт.):
\`\`\`text
${edgesText}
\`\`\``;
  };

  const activeProjectDump = activeProj ? formatProjectDetails(activeProj) : '';

  let otherProjectsDump = '';
  if (includeAllProjectsDump && projects.length > 1) {
    const others = projects.filter((p) => p.id !== activeProj?.id);
    otherProjectsDump = `\n---\n\n## 🗂 ДРУГИЕ ПРОЕКТЫ И ПАПКИ В МОЕМ АККАУНТЕ (${others.length})\n\n` +
      others.map((p) => formatProjectDetails(p)).join('\n\n---\n\n');
  }

  return `Ты — Главный Архитектор Удержания (Lead Retention Architect) и Стратегический Продуктовый Советник проекта **Gennety Canvas**.

Я делюсь с тобой полным контекстом своего личного аккаунта, всеми моими проектами, схемами, узлами, связями и адресами доступа. Твоя задача — досконально изучить эту информацию с учетом необычной специфики графового представления, глубоко понять взаимосвязи, помочь мне анализировать логику, искать узкие места и обсуждать стратегию прямо здесь в чате.

---

## 🌐 АДРЕСА, КЛЮЧИ И СПОСОБЫ ДОСТУПА К МОЕМУ АККАУНТУ

1. **Прямая ссылка для входа в мой личный кабинет (1-Click Auto-Auth)**:
   ${directAuthUrl}
   *(При переходе по этой ссылке сайт автоматически выполнит авторизацию под моим личным аккаунтом).*

2. **Мой персональный ключ доступа (Access Key)**:
   \`${accessKey}\`

3. **Веб-приложение Gennety Canvas**:
   - Production URL: ${baseUrl}
   - Local Dev URL: http://localhost:5173/?key=${encodeURIComponent(accessKey)}

4. **Live REST / Sync API (JSON-эндпоинт моего воркспейса)**:
   \`${apiWorkspaceUrl}\`
   *(Возвращает полный JSON всех проектов, узлов и связей моего аккаунта).*

5. **Программный доступ для браузерных агентов (Aside Browser / DevTools / Playwright)**:
   В консоли браузера доступен глобальный объект:
   \`window.__GENNETY_WORKSPACE__.exportFullSnapshot()\`

6. **MCP-сервер (Model Context Protocol)**:
   В проекте настроен локальный MCP-сервер:
   \`npm run mcp\` (или \`node mcp/index.js\`), предоставляющий инструменты:
   - \`list_projects\`
   - \`get_project_canvas\`
   - \`search_canvas\`
   - \`analyze_retention_flow\`
   - \`create_node\`
   - \`update_node\`

---

## 🧠 СУТЬ И СЕМАНТИКА ФОРМАТА GENNETY CANVAS

Формат представления информации в Gennety Canvas необычен — это не линейный документ, а **кибернетический граф удержания и психологических циклов**.

### Ключевая концепция:
Трансформация дейтинг-бизнеса в безусловного лидера по Retention и LTV через:
- **Закрытый статус и комьюнити** вместо разового поиска пары.
- **Hardware Signaling (физический маяк / «сигналка»)**: физический маркер в реальном мире, овеществляющий статус избранности и провоцирующий виральный WOM.
- **Gym-Subscription Mechanics (механика спортзала)**: оффлайн-ивенты как регулярный ритуал и эмоциональная привязка, плата за членство вне зависимости от частоты посещения.
- **Двойственность ивентов**: внешняя масштабность (хайп) + внутренняя закрытая кулуарность (глубокие связи).
- **Двухуровневый Anti-Churn**: аппаратный апгрейд (Hardware V2) + постоянная ротация форматов.

### 8 категорий узлов и их роль:
1. **\`foundation\` (Фундамент)**: Сдвиг базовой бизнес-модели, правила доступа, фундаментальные постулаты.
2. **\`psychology\` (Психология & Статус)**: Первичные эмоции, дофаминовые триггеры, престиж, признание, Aha-момент.
3. **\`hardware\` (Аппаратный маркер)**: Физический носимый аксессуар/маяк, сенсорные триггеры, реальный мир.
4. **\`retention\` (Механики удержания)**: Циклы привычки, регулярные ритуалы, штраф за выход, механика абонемента.
5. **\`event\` (Ивент-архитектура)**: Мероприятия, закрытые встречи, вечеринки, разделение на слои доступа.
6. **\`lifecycle\` (Жизненный цикл & LTV)**: Длительное удержание, предотвращение оттока, реактивация, Hardware V2.
7. **\`outcome\` (Вершина / Результат)**: Целевой бизнес-результат (Топ-1 Retention, рекордный LTV, виральный коэффициент).
8. **\`custom\` (Кастомный шаг)**: Специфические технические или операционные узлы.

Каждая направленная связь (\`source\` ──► \`target\`) означает передачу ценности, психологический триггер или условие перехода между этапами.

---

## 📁 СПИСОК ВСЕХ МОИХ ПРОЕКТОВ И ПАПОК (Всего: ${projects.length} проектов, ${totalNodes} узлов, ${totalEdges} связей)

${projectsList}

---

## 🔍 АКТИВНЫЙ ПРОЕКТ В МОЕМ АККАУНТЕ

${activeProjectDump}
${otherProjectsDump}

---

## 🎯 ЧТО ТЫ ДОЛЖЕН ДЕЛАТЬ КАК AI-АГЕНТ:

1. **Контекстно ориентироваться во всех моих проектах**: Понимай, в каком проекте что находится, связывай идеи из разных проектов и папок, находи общие паттерны.
2. **Проводить глубокий анализ логики и цепочек Retention**:
   - Есть ли разорванные петли (узлы, из которых никуда не идет стрелка)?
   - Подкреплен ли каждый шаг понятной метрикой (\`keyMetric\`) и результатом (\`outcome\`)?
   - Как аппаратный маркер (\`hardware\`) усиливает психологию (\`psychology\`) и удерживает абонемент (\`retention\`)?
   - Каковы узкие места и риски оттока пользователей?
3. **Обсуждать стратегию в живом диалоге**:
   - Отвечай на мои вопросы о схеме, предлагай продуктовые гипотезы, тексты, механики вовлечения, расчеты LTV/CAC.
4. **Генерировать обновления в формате Gennety Canvas JSON**:
   - Если предлагаешь добавить новые шаги или скорректировать существующие, выдавай их в валидном формате JSON (по схеме \`nodes\` и \`edges\`), чтобы я мог вставить их в приложение через кнопку «Импорт JSON» (\`⌘I\`) в один клик.

Подтверди, что ты полностью воспринял структуру моего личного аккаунта Gennety Canvas, назови активный проект, общее число проектов и узлов, и будь готов к глубокому обсуждению!`;
}
