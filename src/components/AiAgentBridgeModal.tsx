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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl liquid-glass shadow-2xl border border-black/15 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= HEADER: Open, Spacious & Clear ================= */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col gap-4">
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 dark:bg-indigo-400/15 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm flex-shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                  <path d="M4 11a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7z" />
                  <path d="M9 16h.01" />
                  <path d="M15 16h.01" />
                </svg>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-display font-bold text-lg sm:text-xl text-zinc-900 dark:text-white tracking-tight">
                    MCP & AI Agent Bridge
                  </h2>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Context
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
                    {projects.length} схем · {totalNodesCount} узлов
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Системный контекст аккаунта, локальный MCP-сервер и браузерный API для AI-ассистентов
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all border border-black/5 dark:border-white/5 flex-shrink-0"
              title="Закрыть (Esc)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Open Tabs Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/5 gap-1">
              <button
                onClick={() => setActiveTab('prompt')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'prompt'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>🤖</span>
                <span>Системный промпт</span>
              </button>
              <button
                onClick={() => setActiveTab('mcp')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'mcp'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>⚡</span>
                <span>MCP Server</span>
              </button>
              <button
                onClick={() => setActiveTab('browser')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'browser'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span>🌐</span>
                <span>Browser & REST API</span>
              </button>
            </div>

            <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
              <span>Ключ доступа:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{maskAccessKey(accessKey)}</span>
            </div>
          </div>
        </div>

        {/* ================= CONTENT BODY ================= */}
        <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(90vh-160px)] space-y-6">
          {/* TAB 1: MASTER PROMPT */}
          {activeTab === 'prompt' && (
            <div className="space-y-5">
              {/* Hero Banner Strip */}
              <div className="p-5 sm:p-6 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="font-display font-semibold text-sm sm:text-base text-zinc-900 dark:text-white flex flex-wrap items-center gap-2">
                    <span>Системный контекст аккаунта</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 dark:bg-indigo-400/15 text-indigo-600 dark:text-indigo-400 font-medium">
                      ~{(generatedPrompt.length / 1024).toFixed(1)} kB · {projects.length} схем · {totalNodesCount} узлов
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 max-w-xl leading-relaxed">
                    Полный слепок 8 категорий Retention, активная схема со всеми узлами и связями, параметры авторизации и ссылки прямого входа для ИИ-агентов (ChatGPT, Claude, Cursor, Antigravity).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyText(generatedPrompt, setCopiedPrompt)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-97 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-md flex-shrink-0"
                >
                  {copiedPrompt ? (
                    <>
                      <span className="font-bold text-emerald-300">✓</span>
                      <span>Скопировано в буфер</span>
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

              {/* Credentials Tiles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                {/* 1-Click URL */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-black/10 dark:border-white/10 shadow-xs flex flex-col justify-between gap-2.5">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                    <span>Direct Auth URL</span>
                    <button
                      onClick={() => handleCopyText(directAuthUrl, setCopiedUrl)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      {copiedUrl ? '✓ Скопировано' : 'Копировать'}
                    </button>
                  </div>
                  <div className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200" title={directAuthUrl}>
                    {directAuthUrl}
                  </div>
                </div>

                {/* Key */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-black/10 dark:border-white/10 shadow-xs flex flex-col justify-between gap-2.5">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                    <span>Access Key</span>
                    <button
                      onClick={() => handleCopyText(accessKey, setCopiedKey)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      {copiedKey ? '✓ Скопировано' : 'Копировать'}
                    </button>
                  </div>
                  <div className="truncate text-xs font-bold text-zinc-900 dark:text-white">
                    {accessKey}
                  </div>
                </div>

                {/* REST API */}
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-black/10 dark:border-white/10 shadow-xs flex flex-col justify-between gap-2.5">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                    <span>REST Endpoint</span>
                    <button
                      onClick={() => handleCopyText(apiWorkspaceUrl, setCopiedApi)}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      {copiedApi ? '✓ Скопировано' : 'Копировать'}
                    </button>
                  </div>
                  <div className="truncate text-xs font-medium text-zinc-800 dark:text-zinc-200" title={apiWorkspaceUrl}>
                    {apiWorkspaceUrl}
                  </div>
                </div>
              </div>

              {/* Options & Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 px-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none font-medium">
                  <input
                    type="checkbox"
                    checked={includeAllProjects}
                    onChange={(e) => setIncludeAllProjects(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Включить дамп всех проектов ({projects.length} схем)</span>
                </label>
                <span className="font-mono text-zinc-500 dark:text-zinc-400 text-xs">
                  Размер промпта: <strong className="text-zinc-900 dark:text-white">{generatedPrompt.length}</strong> символов
                </span>
              </div>

              {/* Code Preview */}
              <div className="relative rounded-2xl bg-zinc-950 text-zinc-200 border border-zinc-800 p-4 sm:p-5 font-mono text-xs leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap select-text">
                <div className="sticky top-0 float-right mb-2">
                  <button
                    onClick={() => handleCopyText(generatedPrompt, setCopiedPrompt)}
                    className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-mono font-medium transition-colors shadow-sm"
                  >
                    {copiedPrompt ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                {generatedPrompt}
              </div>
            </div>
          )}

          {/* TAB 2: MCP SERVER */}
          {activeTab === 'mcp' && (
            <div className="space-y-5">
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Локальный MCP-сервер (<code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono font-semibold">mcp/index.js</code>) связывает ваши ИИ-среды разработки (Cursor, Claude Desktop, Antigravity) напрямую с рабочей областью холста по протоколу Model Context Protocol.
              </div>

              {/* Tools Matrix */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
                  Инструменты сервера (Tools)
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    'list_projects',
                    'get_project_canvas',
                    'search_canvas',
                    'analyze_retention_flow',
                    'create_or_update_node',
                    'export_workspace_backup',
                  ].map((tool) => (
                    <span
                      key={tool}
                      className="px-3 py-1.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-xs font-mono font-semibold"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Claude Desktop Config */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 px-1">
                  <span>Claude Desktop Config (~/.../claude_desktop_config.json)</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(claudeDesktopConfig, setCopiedClaudeConfig)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-xs"
                  >
                    {copiedClaudeConfig ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-200 border border-zinc-800 font-mono text-xs leading-relaxed overflow-x-auto">
                  {claudeDesktopConfig}
                </pre>
              </div>

              {/* Cursor Config */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 px-1">
                  <span>Cursor Config (.cursor/mcp.json)</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(cursorMcpConfig, setCopiedCursorConfig)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-xs"
                  >
                    {copiedCursorConfig ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-200 border border-zinc-800 font-mono text-xs leading-relaxed overflow-x-auto">
                  {cursorMcpConfig}
                </pre>
              </div>

              {/* Local run command */}
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-black/10 dark:border-white/10 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm font-mono">
                <span className="text-zinc-600 dark:text-zinc-400">Локальный запуск stdio:</span>
                <div className="flex items-center gap-2.5">
                  <code className="px-3 py-1.5 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-xs sm:text-sm font-bold border border-emerald-500/20">
                    npm run mcp
                  </code>
                  <button
                    onClick={() => handleCopyText('npm run mcp', setCopiedCliCommand)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 text-zinc-800 dark:text-zinc-200 font-medium transition-colors text-xs"
                  >
                    {copiedCliCommand ? '✓' : 'Копировать'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BROWSER API */}
          {activeTab === 'browser' && (
            <div className="space-y-4">
              {/* Protocol Step 1: URL */}
              <div className="p-4.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-black/10 dark:border-white/10 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                  <span>01 · Авторизация по прямому URL (?key=...)</span>
                  <button
                    onClick={() => handleCopyText(directAuthUrl, setCopiedUrl)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {copiedUrl ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <code className="block p-3 rounded-xl bg-zinc-950 text-zinc-200 border border-zinc-800 font-mono text-xs truncate">
                  {directAuthUrl}
                </code>
              </div>

              {/* Protocol Step 2: Runtime DOM API */}
              <div className="p-4.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-black/10 dark:border-white/10 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                  <span>02 · Runtime DOM API (window.__GENNETY_WORKSPACE__)</span>
                  <button
                    onClick={() => handleCopyText(domApiSnippet, setCopiedDomApi)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {copiedDomApi ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-zinc-950 text-zinc-200 border border-zinc-800 font-mono text-xs leading-relaxed overflow-x-auto">
                  {domApiSnippet}
                </pre>
              </div>

              {/* Protocol Step 3: REST API */}
              <div className="p-4.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-black/10 dark:border-white/10 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                  <span>03 · cURL Endpoint</span>
                  <button
                    onClick={() => handleCopyText(curlSnippet, setCopiedCurl)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {copiedCurl ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-zinc-950 text-zinc-200 border border-zinc-800 font-mono text-xs leading-relaxed overflow-x-auto">
                  {curlSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 sm:px-8 py-4 border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-mono">
          <div className="text-zinc-500 dark:text-zinc-400 font-medium">
            {projects.length} проектов · {totalNodesCount} узлов · {maskAccessKey(accessKey)}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleCopyText(generatedPrompt, setCopiedPrompt)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold hover:opacity-95 active:scale-97 transition-all shadow-sm flex items-center gap-1.5"
            >
              {copiedPrompt ? '✓ Скопировано' : 'Копировать промпт'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white font-medium transition-colors border border-black/5 dark:border-white/5"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
