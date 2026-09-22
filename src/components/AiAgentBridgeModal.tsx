import React, { useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { generateAgentBridgePrompt } from '../lib/aiPromptGenerator';
import { getDirectAuthUrl, getApiWorkspaceUrl, maskAccessKey } from '../lib/auth';

interface AiAgentBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAgentBridgeModal: React.FC<AiAgentBridgeModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'mcp' | 'browser'>('prompt');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedApi, setCopiedApi] = useState(false);
  const [copiedClaudeConfig, setCopiedClaudeConfig] = useState(false);
  const [copiedCursorConfig, setCopiedCursorConfig] = useState(false);
  const [copiedCliCommand, setCopiedCliCommand] = useState(false);
  const [copiedDomApi, setCopiedDomApi] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Prompt options
  const [includeAllProjects, setIncludeAllProjects] = useState(true);

  const accessKey = useBoardStore((s) => s.accessKey) || 'GNTY-DEMO-2026-CORE';
  const projects = useBoardStore((s) => s.projects);
  const currentProjectId = useBoardStore((s) => s.currentProjectId);

  if (!isOpen) return null;

  const baseUrl = 'https://gennety-retention-canvas.vercel.app';
  const directAuthUrl = getDirectAuthUrl(accessKey, baseUrl);
  const apiWorkspaceUrl = getApiWorkspaceUrl(accessKey, baseUrl);

  const generatedPrompt = generateAgentBridgePrompt({
    accessKey,
    projects,
    currentProjectId,
    includeAllProjectsDump: includeAllProjects,
    baseUrl,
  });

  const totalNodesCount = projects.reduce((acc, p) => acc + (p.nodes?.length || 0), 0);

  const handleCopyText = async (text: string, setter: (val: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2200);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setter(true);
      setTimeout(() => setter(false), 2200);
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

  const domApiSnippet = `// Чтение полного состояния аккаунта и холста в браузере:
const workspace = window.__GENNETY_WORKSPACE__.exportFullSnapshot();
console.log('Projects:', workspace.projects);`;

  const curlSnippet = `curl -s -X GET "${apiWorkspaceUrl}" -H "Accept: application/json"`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl minimal-modal shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= HEADER: Minimalist & Clean ================= */}
        <div className="px-6 py-3.5 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white tracking-tight">
              MCP Bridge
            </span>

            {/* Segmented Minimalist Tabs */}
            <div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/10 gap-0.5">
              <button
                onClick={() => setActiveTab('prompt')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'prompt'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Master Prompt
              </button>
              <button
                onClick={() => setActiveTab('mcp')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'mcp'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                MCP Server
              </button>
              <button
                onClick={() => setActiveTab('browser')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'browser'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Browser API
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-[11px] font-mono text-zinc-400">
              {maskAccessKey(accessKey)}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Закрыть (Esc)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ================= CONTENT BODY ================= */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(88vh-110px)] space-y-4">
          {/* TAB 1: MASTER PROMPT */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              {/* Minimal Action Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                    Системный контекст для ИИ-ассистентов
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                    ~{(generatedPrompt.length / 1024).toFixed(1)} kB · {projects.length} схем · {totalNodesCount} узлов
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyText(generatedPrompt, setCopiedPrompt)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 active:scale-97 transition-all shadow-xs flex items-center justify-center gap-1.5 flex-shrink-0"
                >
                  {copiedPrompt ? (
                    <>
                      <span className="font-bold">✓</span>
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Скопировать промпт</span>
                    </>
                  )}
                </button>
              </div>

              {/* Minimal Credentials Tiles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
                {/* 1-Click URL */}
                <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                    <span>Direct Auth URL</span>
                    <button
                      onClick={() => handleCopyText(directAuthUrl, setCopiedUrl)}
                      className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-medium transition-colors"
                    >
                      {copiedUrl ? '✓' : 'Копировать'}
                    </button>
                  </div>
                  <div className="truncate text-xs text-zinc-700 dark:text-zinc-300" title={directAuthUrl}>
                    {directAuthUrl}
                  </div>
                </div>

                {/* Key */}
                <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                    <span>Access Key</span>
                    <button
                      onClick={() => handleCopyText(accessKey, setCopiedKey)}
                      className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-medium transition-colors"
                    >
                      {copiedKey ? '✓' : 'Копировать'}
                    </button>
                  </div>
                  <div className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {accessKey}
                  </div>
                </div>

                {/* REST API */}
                <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                    <span>REST Endpoint</span>
                    <button
                      onClick={() => handleCopyText(apiWorkspaceUrl, setCopiedApi)}
                      className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-medium transition-colors"
                    >
                      {copiedApi ? '✓' : 'Копировать'}
                    </button>
                  </div>
                  <div className="truncate text-xs text-zinc-700 dark:text-zinc-300" title={apiWorkspaceUrl}>
                    {apiWorkspaceUrl}
                  </div>
                </div>
              </div>

              {/* Options & Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 px-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeAllProjects}
                    onChange={(e) => setIncludeAllProjects(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-300 accent-current cursor-pointer"
                  />
                  <span>Включить дамп всех проектов ({projects.length})</span>
                </label>
                <span className="font-mono text-[11px]">
                  {generatedPrompt.length} символов
                </span>
              </div>

              {/* Code Preview */}
              <div className="relative rounded-xl bg-zinc-950 text-zinc-300 border border-black/10 dark:border-white/10 p-3.5 font-mono text-xs leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-text">
                <div className="sticky top-0 float-right mb-1">
                  <button
                    onClick={() => handleCopyText(generatedPrompt, setCopiedPrompt)}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono transition-colors"
                  >
                    {copiedPrompt ? '✓' : 'Копировать'}
                  </button>
                </div>
                {generatedPrompt}
              </div>
            </div>
          )}

          {/* TAB 2: MCP SERVER */}
          {activeTab === 'mcp' && (
            <div className="space-y-4">
              {/* Tools Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-zinc-400 px-1">
                  <span>Инструменты MCP v2.0 (12 Tools)</span>
                  <span className="text-emerald-500 font-mono">● Auto-Sync enabled</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {/* Category 1: Workflows & Layout */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 font-semibold px-1">Воркфлоу & Сетка:</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-semibold" title="Генерация комплексного воркфлоу со стратегией, текстом и фото в 1 вызов">
                      build_explanatory_workflow
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[11px]" title="Автоматическое выравнивание карточек холста с равными отступами">
                      auto_layout_project
                    </span>
                  </div>

                  {/* Category 2: Content & Nodes */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 font-semibold px-1">Узлы & Контент:</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[11px]" title="Создание или редактирование блока любого типа">
                      create_or_update_node
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono text-[11px]" title="Добавление текстового блока с заметкой или гипотезой">
                      create_text_block
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono text-[11px]" title="Добавление фото/макета с подписью">
                      create_photo_card
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]" title="Создание или настройка стрелки между блоками">
                      create_or_update_edge
                    </span>
                  </div>

                  {/* Category 3: Analysis & Search */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 font-semibold px-1">Анализ & Поиск:</span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[11px]" title="Аудит воронки на разрывы и тупики">
                      analyze_retention_flow
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]" title="Поиск карточек по ключевым словам и категориям">
                      search_canvas
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]" title="Получение всей схемы проекта">
                      get_project_canvas
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]" title="Список всех проектов">
                      list_projects
                    </span>
                  </div>

                  {/* Category 4: Sync & Backup */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 font-semibold px-1">Синхронизация:</span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]" title="Экспорт полного JSON-бэкапа">
                      export_workspace_backup
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]" title="Загрузка данных с сервера">
                      fetch_remote_account
                    </span>
                  </div>
                </div>
              </div>

              {/* Claude Desktop Config */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
                  <span>Claude Desktop Config</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(claudeDesktopConfig, setCopiedClaudeConfig)}
                    className="hover:text-zinc-900 dark:hover:text-white font-medium"
                  >
                    {copiedClaudeConfig ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-zinc-950 text-zinc-300 border border-black/10 dark:border-white/10 font-mono text-xs leading-relaxed overflow-x-auto">
                  {claudeDesktopConfig}
                </pre>
              </div>

              {/* Cursor Config */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
                  <span>Cursor Config</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(cursorMcpConfig, setCopiedCursorConfig)}
                    className="hover:text-zinc-900 dark:hover:text-white font-medium"
                  >
                    {copiedCursorConfig ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-zinc-950 text-zinc-300 border border-black/10 dark:border-white/10 font-mono text-xs leading-relaxed overflow-x-auto">
                  {cursorMcpConfig}
                </pre>
              </div>

              {/* Local run command */}
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 text-xs font-mono">
                <span className="text-zinc-500 dark:text-zinc-400">Локальный запуск stdio:</span>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-0.5 rounded bg-zinc-950 text-emerald-400 font-bold border border-white/10">
                    npm run mcp
                  </code>
                  <button
                    onClick={() => handleCopyText('npm run mcp', setCopiedCliCommand)}
                    className="hover:text-zinc-900 dark:hover:text-white text-zinc-400"
                  >
                    {copiedCliCommand ? '✓' : 'Копировать'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BROWSER API */}
          {activeTab === 'browser' && (
            <div className="space-y-3">
              {/* Protocol Step 1: URL */}
              <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <span>01 · Авторизация по URL (?key=...)</span>
                  <button
                    onClick={() => handleCopyText(directAuthUrl, setCopiedUrl)}
                    className="text-[11px] font-normal text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  >
                    {copiedUrl ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <code className="block p-2.5 rounded-lg bg-zinc-950 text-zinc-300 border border-black/10 dark:border-white/10 font-mono text-xs truncate">
                  {directAuthUrl}
                </code>
              </div>

              {/* Protocol Step 2: Runtime DOM API */}
              <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <span>02 · Runtime DOM API (window.__GENNETY_WORKSPACE__)</span>
                  <button
                    onClick={() => handleCopyText(domApiSnippet, setCopiedDomApi)}
                    className="text-[11px] font-normal text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  >
                    {copiedDomApi ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-zinc-950 text-zinc-300 border border-black/10 dark:border-white/10 font-mono text-xs leading-relaxed overflow-x-auto">
                  {domApiSnippet}
                </pre>
              </div>

              {/* Protocol Step 3: REST API */}
              <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <span>03 · cURL Endpoint</span>
                  <button
                    onClick={() => handleCopyText(curlSnippet, setCopiedCurl)}
                    className="text-[11px] font-normal text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  >
                    {copiedCurl ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-zinc-950 text-zinc-300 border border-black/10 dark:border-white/10 font-mono text-xs leading-relaxed overflow-x-auto">
                  {curlSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER: Minimalist ================= */}
        <div className="px-6 py-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <div>
            {projects.length} схем · {totalNodesCount} узлов
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopyText(generatedPrompt, setCopiedPrompt)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-medium hover:opacity-90 active:scale-97 transition-all shadow-xs"
            >
              {copiedPrompt ? '✓ Скопировано' : 'Копировать промпт'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
