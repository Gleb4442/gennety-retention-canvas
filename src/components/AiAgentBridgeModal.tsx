import React, { useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { generateAgentBridgePrompt } from '../lib/aiPromptGenerator';
import { getDirectAuthUrl, getApiWorkspaceUrl, maskAccessKey } from '../lib/auth';

interface AiAgentBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAgentBridgeModal: React.FC<AiAgentBridgeModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'mcp' | 'web'>('prompt');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedApi, setCopiedApi] = useState(false);
  const [copiedClaudeConfig, setCopiedClaudeConfig] = useState(false);
  const [copiedCursorConfig, setCopiedCursorConfig] = useState(false);

  // Prompt options
  const [includeAllProjects, setIncludeAllProjects] = useState(true);

  const accessKey = useBoardStore((s) => s.accessKey) || 'GNTY-DEMO-2026-CORE';
  const projects = useBoardStore((s) => s.projects);
  const currentProjectId = useBoardStore((s) => s.currentProjectId);

  if (!isOpen) return null;

  const directAuthUrl = getDirectAuthUrl(accessKey, 'https://gennety-retention-canvas.vercel.app');
  const apiWorkspaceUrl = getApiWorkspaceUrl(accessKey, 'https://gennety-retention-canvas.vercel.app');

  const generatedPrompt = generateAgentBridgePrompt({
    accessKey,
    projects,
    currentProjectId,
    includeAllProjectsDump: includeAllProjects,
    baseUrl: 'https://gennety-retention-canvas.vercel.app',
  });

  const handleCopyText = async (text: string, setter: (val: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setter(true);
      setTimeout(() => setter(false), 2500);
    }
  };

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        'gennety-canvas': {
          command: 'node',
          args: ['/Users/pro/Desktop/Gennety Canvas/mcp/index.js'],
          env: {
            GENNETY_ACCESS_KEY: accessKey,
          },
        },
      },
    },
    null,
    2
  );

  const cursorMcpConfig = JSON.stringify(
    {
      mcpServers: {
        'gennety-canvas': {
          command: 'node',
          args: ['/Users/pro/Desktop/Gennety Canvas/mcp/index.js'],
        },
      },
    },
    null,
    2
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl liquid-glass shadow-2xl border border-black/15 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= HEADER ================= */}
        <div className="px-6 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shadow-xs">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                <path d="M4 11a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7z" />
                <path d="M9 16h.01" />
                <path d="M15 16h.01" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-lg text-zinc-900 dark:text-white">
                  AI-Агент & MCP Мост
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-500 dark:bg-indigo-400/10 dark:text-indigo-300 border border-indigo-500/20">
                  Ready to Sync
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                Копируйте комплексный промпт или подключите AI-агентов через MCP и REST API
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors border border-black/5 dark:border-white/5"
            title="Закрыть (Esc)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ================= TABS ================= */}
        <div className="px-6 py-2.5 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-2 bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('prompt')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 ${
                activeTab === 'prompt'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span>📋 AI-Промпт (Master Prompt)</span>
            </button>
            <button
              onClick={() => setActiveTab('mcp')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 ${
                activeTab === 'mcp'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span>🔌 MCP-Сервер</span>
            </button>
            <button
              onClick={() => setActiveTab('web')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 ${
                activeTab === 'web'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span>🌐 Web & Aside Browser</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hidden sm:block">
            Ключ: <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{maskAccessKey(accessKey)}</span>
          </div>
        </div>

        {/* ================= BODY CONTENT ================= */}
        <div className="p-6 overflow-y-auto max-h-[calc(92vh-140px)] space-y-6">
          {/* TAB 1: MASTER AI PROMPT */}
          {activeTab === 'prompt' && (
            <div className="space-y-5">
              {/* Top Action Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-display font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>✨ Скопировать единый промпт со всеми данными</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-xl">
                    Содержит прямой URL с авто-логином, ваш ключ доступа, семантику 8 категорий Retention Canvas, список всех ваших папок/проектов и полный контекст активной схемы. Отправьте его в ChatGPT, Claude, Antigravity или Cursor для начала стратегической сессии.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyText(generatedPrompt, setCopiedPrompt)}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold flex items-center gap-2.5 transition-all shadow-lg shadow-indigo-600/25 flex-shrink-0"
                >
                  {copiedPrompt ? (
                    <>
                      <span className="font-bold text-white">✓</span>
                      <span>Скопировано в буфер!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Скопировать промпт</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Credentials Pills */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                {/* 1-Click Login Link */}
                <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold flex items-center justify-between">
                    <span>1-Click Авто-вход</span>
                    <button
                      onClick={() => handleCopyText(directAuthUrl, setCopiedUrl)}
                      className="text-indigo-500 hover:underline"
                    >
                      {copiedUrl ? 'Скопировано!' : 'Копировать'}
                    </button>
                  </div>
                  <div className="text-zinc-800 dark:text-zinc-200 truncate font-mono text-[11px]" title={directAuthUrl}>
                    {directAuthUrl}
                  </div>
                </div>

                {/* Personal Key */}
                <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold flex items-center justify-between">
                    <span>Ключ доступа (Key)</span>
                    <button
                      onClick={() => handleCopyText(accessKey, setCopiedKey)}
                      className="text-indigo-500 hover:underline"
                    >
                      {copiedKey ? 'Скопировано!' : 'Копировать'}
                    </button>
                  </div>
                  <div className="text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                    {accessKey}
                  </div>
                </div>

                {/* Live REST API */}
                <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold flex items-center justify-between">
                    <span>Live REST API</span>
                    <button
                      onClick={() => handleCopyText(apiWorkspaceUrl, setCopiedApi)}
                      className="text-indigo-500 hover:underline"
                    >
                      {copiedApi ? 'Скопировано!' : 'Копировать'}
                    </button>
                  </div>
                  <div className="text-zinc-800 dark:text-zinc-200 truncate font-mono text-[11px]" title={apiWorkspaceUrl}>
                    {apiWorkspaceUrl}
                  </div>
                </div>
              </div>

              {/* Options & Configuration */}
              <div className="flex items-center gap-4 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAllProjects}
                    onChange={(e) => setIncludeAllProjects(e.target.checked)}
                    className="rounded border-zinc-400 dark:border-zinc-600"
                  />
                  <span>Включить подробный дамп всех проектов ({projects.length} шт.)</span>
                </label>
              </div>

              {/* Readonly Prompt Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  <span>Предпросмотр генерируемого промпта ({generatedPrompt.length} символов):</span>
                  <span>Markdown / Context Ready</span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-900 text-zinc-100 dark:bg-black/60 dark:text-zinc-300 border border-black/10 dark:border-white/10 text-[11px] font-mono whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed shadow-inner">
                  {generatedPrompt}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MCP SERVER CONFIGURATION */}
          {activeTab === 'mcp' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-white/[0.04] border border-black/10 dark:border-white/10 space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="font-display font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>⚡ Model Context Protocol (MCP) Server</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Сервер MCP встроен прямо в репозиторий проекта. Он позволяет ИИ-агентам автономно читать все ваши холсты, искать узлы по ключевым метрикам, запускать аудит retention-петель и добавлять новые карточки прямо на холст.
                </p>
              </div>

              {/* Tools Available */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                  Инструменты (Tools), доступные агенту:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10">
                    <span className="text-indigo-500 font-bold">list_projects</span>: Список всех папок, схем и сводка по узлам.
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10">
                    <span className="text-indigo-500 font-bold">get_project_canvas</span>: Полный граф узлов, метрик и связей.
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10">
                    <span className="text-indigo-500 font-bold">search_canvas</span>: Поиск по картам, категориям, тегам и метрикам.
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10">
                    <span className="text-indigo-500 font-bold">analyze_retention_flow</span>: Аудит маховика, тупиков и категорий.
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10">
                    <span className="text-indigo-500 font-bold">create_or_update_node</span>: Добавление карточек на холст агентом.
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10">
                    <span className="text-indigo-500 font-bold">export_workspace_backup</span>: Полный резервный экспорт аккаунта.
                  </div>
                </div>
              </div>

              {/* Claude Desktop Config */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                    Конфигурация для Claude Desktop (~/Library/Application Support/Claude/claude_desktop_config.json):
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(claudeDesktopConfig, setCopiedClaudeConfig)}
                    className="text-xs font-mono text-indigo-500 hover:underline"
                  >
                    {copiedClaudeConfig ? '✓ Скопировано!' : 'Скопировать JSON'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-2xl bg-zinc-900 text-zinc-100 dark:bg-black/60 dark:text-zinc-300 border border-black/10 dark:border-white/10 text-[11px] font-mono overflow-x-auto">
                  {claudeDesktopConfig}
                </pre>
              </div>

              {/* Cursor Config */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                    Конфигурация для Cursor (.cursor/mcp.json):
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(cursorMcpConfig, setCopiedCursorConfig)}
                    className="text-xs font-mono text-indigo-500 hover:underline"
                  >
                    {copiedCursorConfig ? '✓ Скопировано!' : 'Скопировать JSON'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-2xl bg-zinc-900 text-zinc-100 dark:bg-black/60 dark:text-zinc-300 border border-black/10 dark:border-white/10 text-[11px] font-mono overflow-x-auto">
                  {cursorMcpConfig}
                </pre>
              </div>

              {/* Run Command */}
              <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs font-mono flex items-center justify-between">
                <span>Запуск локального сервера вручную: <code className="text-indigo-500">npm run mcp</code></span>
                <span className="text-zinc-500">stdio transport</span>
              </div>
            </div>
          )}

          {/* TAB 3: WEB & ASIDE BROWSER AGENT */}
          {activeTab === 'web' && (
            <div className="space-y-5 text-xs text-zinc-700 dark:text-zinc-300">
              <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-white/[0.04] border border-black/10 dark:border-white/10 space-y-2">
                <div className="font-display font-semibold text-zinc-900 dark:text-white">
                  🌐 Автономный серфинг и чтение аккаунта браузерными агентами (Aside, Playwright, DevTools)
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Если вы используете агента с браузерным модулем (например, навык <b>Aside Browser</b>, Puppeteer или Playwright), агент может самостоятельно зайти на сайт, авторизоваться и получить всю структуру вашего аккаунта.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
                  <div className="font-semibold text-zinc-900 dark:text-white">
                    1. 1-Click Авторизация через URL
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Достаточно передать агенту команду открыть ссылку:
                  </p>
                  <code className="block p-2 rounded-lg bg-zinc-900 text-indigo-400 font-mono text-[11px] overflow-x-auto">
                    {directAuthUrl}
                  </code>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Веб-приложение моментально распознает ключ в query-параметре <code>?key=...</code> и разблокирует рабочее пространство без ручного ввода.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
                  <div className="font-semibold text-zinc-900 dark:text-white">
                    2. Программный доступ через JavaScript API
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    В окне браузера экспортирован объект <code>window.__GENNETY_WORKSPACE__</code>:
                  </p>
                  <pre className="p-3 rounded-lg bg-zinc-900 text-zinc-200 font-mono text-[11px] overflow-x-auto">
{`// Получить полный снимок всех проектов, узлов и связей:
const snapshot = window.__GENNETY_WORKSPACE__.exportFullSnapshot();

// Поиск узлов по ключевым словам:
const matches = window.__GENNETY_WORKSPACE__.searchNodes('gym');`}
                  </pre>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-2">
                  <div className="font-semibold text-zinc-900 dark:text-white">
                    3. Прямой REST-запрос (cURL / Fetch)
                  </div>
                  <pre className="p-3 rounded-lg bg-zinc-900 text-zinc-200 font-mono text-[11px] overflow-x-auto">
{`curl -X GET "${apiWorkspaceUrl}" \\
  -H "Accept: application/json"`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 py-4 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            Всего проектов: <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{projects.length}</span> | Узлов: <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{projects.reduce((a, p) => a + (p.nodes?.length || 0), 0)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopyText(generatedPrompt, setCopiedPrompt)}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              {copiedPrompt ? '✓ Скопировано' : 'Скопировать Master AI Промпт'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
