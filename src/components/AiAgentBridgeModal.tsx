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
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl liquid-glass shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-inherit"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= HEADER: Frameless & Minimal ================= */}
        <div className="px-6 py-4.5 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-inherit opacity-90">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.5-6.5l-2.1 2.1m-8.8 8.8l-2.1 2.1m0-13l2.1 2.1m8.8 8.8l2.1 2.1" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-base tracking-wide">
                  Agent Bridge
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-70">
                  Live Context
                </span>
              </div>
              <p className="text-[11px] font-mono opacity-50">
                AI Prompt · MCP Server · Browser API
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-all"
              title="Закрыть (Esc)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ================= TABS: Borderless Segmented Pill ================= */}
        <div className="px-6 py-2.5 flex items-center justify-between gap-3 border-b border-black/[0.04] dark:border-white/[0.04]">
          <div className="flex items-center p-0.5 rounded-2xl bg-black/5 dark:bg-white/5 gap-1">
            <button
              onClick={() => setActiveTab('prompt')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
                activeTab === 'prompt'
                  ? 'bg-black/10 dark:bg-white/15 font-semibold opacity-100 shadow-xs'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              Master Prompt
            </button>
            <button
              onClick={() => setActiveTab('mcp')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
                activeTab === 'mcp'
                  ? 'bg-black/10 dark:bg-white/15 font-semibold opacity-100 shadow-xs'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              MCP Server
            </button>
            <button
              onClick={() => setActiveTab('browser')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
                activeTab === 'browser'
                  ? 'bg-black/10 dark:bg-white/15 font-semibold opacity-100 shadow-xs'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              Browser API
            </button>
          </div>

          <div className="text-[11px] font-mono opacity-50 hidden sm:flex items-center gap-1.5">
            <span>Key</span>
            <span className="font-semibold opacity-90">{maskAccessKey(accessKey)}</span>
          </div>
        </div>

        {/* ================= CONTENT BODY ================= */}
        <div className="p-6 overflow-y-auto max-h-[calc(92vh-140px)] space-y-6">
          {/* TAB 1: MASTER PROMPT */}
          {activeTab === 'prompt' && (
            <div className="space-y-5">
              {/* Abstract Hero Copy Strip */}
              <div className="p-4 sm:p-5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-display font-medium text-sm flex items-center gap-2">
                    <span>Системный контекст аккаунта</span>
                    <span className="text-[10px] font-mono opacity-60">
                      ~{(generatedPrompt.length / 1024).toFixed(1)} kB · {projects.length} схем · {totalNodesCount} узлов
                    </span>
                  </div>
                  <p className="text-xs opacity-60 max-w-xl font-mono leading-relaxed">
                    Полный слепок 8 категорий Retention, активная схема, параметры авторизации и ссылки прямого входа для агентов (ChatGPT, Claude, Cursor, Antigravity).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyText(generatedPrompt, setCopiedPrompt)}
                  className="px-4 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-97 text-xs font-semibold font-mono flex items-center gap-2 transition-all shadow-sm flex-shrink-0"
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

              {/* Frameless Credentials Tiles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
                {/* 1-Click URL */}
                <div className="p-3.5 rounded-2xl bg-black/[0.025] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between opacity-60 text-[10px] uppercase tracking-wider font-semibold">
                    <span>Direct Auth URL</span>
                    <button
                      onClick={() => handleCopyText(directAuthUrl, setCopiedUrl)}
                      className="hover:opacity-100 hover:underline"
                    >
                      {copiedUrl ? '✓' : 'Копировать'}
                    </button>
                  </div>
                  <div className="truncate text-[11px] opacity-90" title={directAuthUrl}>
                    {directAuthUrl}
                  </div>
                </div>

                {/* Key */}
                <div className="p-3.5 rounded-2xl bg-black/[0.025] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between opacity-60 text-[10px] uppercase tracking-wider font-semibold">
                    <span>Access Key</span>
                    <button
                      onClick={() => handleCopyText(accessKey, setCopiedKey)}
                      className="hover:opacity-100 hover:underline"
                    >
                      {copiedKey ? '✓' : 'Копировать'}
                    </button>
                  </div>
                  <div className="truncate text-[11px] opacity-90 font-semibold">
                    {accessKey}
                  </div>
                </div>

                {/* REST API */}
                <div className="p-3.5 rounded-2xl bg-black/[0.025] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between opacity-60 text-[10px] uppercase tracking-wider font-semibold">
                    <span>REST Endpoint</span>
                    <button
                      onClick={() => handleCopyText(apiWorkspaceUrl, setCopiedApi)}
                      className="hover:opacity-100 hover:underline"
                    >
                      {copiedApi ? '✓' : 'Копировать'}
                    </button>
                  </div>
                  <div className="truncate text-[11px] opacity-90" title={apiWorkspaceUrl}>
                    {apiWorkspaceUrl}
                  </div>
                </div>
              </div>

              {/* Options & Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono opacity-70 px-1">
                <label className="flex items-center gap-2 cursor-pointer hover:opacity-100 transition-opacity">
                  <input
                    type="checkbox"
                    checked={includeAllProjects}
                    onChange={(e) => setIncludeAllProjects(e.target.checked)}
                    className="rounded accent-current cursor-pointer"
                  />
                  <span>Включить дамп всех проектов ({projects.length} шт.)</span>
                </label>
                <span>Промпт: {generatedPrompt.length} символов</span>
              </div>

              {/* Frameless Code Preview */}
              <div className="relative rounded-2xl bg-black/40 dark:bg-black/60 p-4 font-mono text-[11px] leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap opacity-80 select-text">
                <div className="sticky top-0 float-right mb-2">
                  <button
                    onClick={() => handleCopyText(generatedPrompt, setCopiedPrompt)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono transition-colors"
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
              {/* Abstract Tool Matrix */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider opacity-50 font-semibold px-1">
                  Инструменты сервера (Tools)
                </div>
                <div className="flex flex-wrap gap-1.5">
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
                      className="px-2.5 py-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] text-[11px] font-mono opacity-80"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Claude Desktop Config */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono opacity-60 px-1">
                  <span>Claude Desktop Config (~/.../claude_desktop_config.json)</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(claudeDesktopConfig, setCopiedClaudeConfig)}
                    className="hover:opacity-100 hover:underline"
                  >
                    {copiedClaudeConfig ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-2xl bg-black/40 dark:bg-black/60 font-mono text-[11px] opacity-80 overflow-x-auto">
                  {claudeDesktopConfig}
                </pre>
              </div>

              {/* Cursor Config */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono opacity-60 px-1">
                  <span>Cursor Config (.cursor/mcp.json)</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(cursorMcpConfig, setCopiedCursorConfig)}
                    className="hover:opacity-100 hover:underline"
                  >
                    {copiedCursorConfig ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-3.5 rounded-2xl bg-black/40 dark:bg-black/60 font-mono text-[11px] opacity-80 overflow-x-auto">
                  {cursorMcpConfig}
                </pre>
              </div>

              {/* Local run command */}
              <div className="p-3 rounded-2xl bg-black/[0.025] dark:bg-white/[0.03] flex items-center justify-between gap-3 text-xs font-mono">
                <span className="opacity-60">Локальный запуск stdio:</span>
                <div className="flex items-center gap-2">
                  <code className="opacity-90 font-semibold">npm run mcp</code>
                  <button
                    onClick={() => handleCopyText('npm run mcp', setCopiedCliCommand)}
                    className="opacity-60 hover:opacity-100 transition-opacity"
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
              <div className="p-4 rounded-2xl bg-black/[0.025] dark:bg-white/[0.03] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-medium">
                  <span className="opacity-80">01 · Авторизация по URL (?key=...)</span>
                  <button
                    onClick={() => handleCopyText(directAuthUrl, setCopiedUrl)}
                    className="text-[11px] opacity-60 hover:opacity-100 hover:underline"
                  >
                    {copiedUrl ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <code className="block p-2.5 rounded-xl bg-black/30 dark:bg-black/50 font-mono text-[11px] opacity-80 truncate">
                  {directAuthUrl}
                </code>
              </div>

              {/* Protocol Step 2: Runtime DOM API */}
              <div className="p-4 rounded-2xl bg-black/[0.025] dark:bg-white/[0.03] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-medium">
                  <span className="opacity-80">02 · Runtime DOM API (window.__GENNETY_WORKSPACE__)</span>
                  <button
                    onClick={() => handleCopyText(domApiSnippet, setCopiedDomApi)}
                    className="text-[11px] opacity-60 hover:opacity-100 hover:underline"
                  >
                    {copiedDomApi ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-black/30 dark:bg-black/50 font-mono text-[11px] opacity-80 overflow-x-auto">
                  {domApiSnippet}
                </pre>
              </div>

              {/* Protocol Step 3: REST API */}
              <div className="p-4 rounded-2xl bg-black/[0.025] dark:bg-white/[0.03] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-medium">
                  <span className="opacity-80">03 · cURL Endpoint</span>
                  <button
                    onClick={() => handleCopyText(curlSnippet, setCopiedCurl)}
                    className="text-[11px] opacity-60 hover:opacity-100 hover:underline"
                  >
                    {copiedCurl ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-black/30 dark:bg-black/50 font-mono text-[11px] opacity-80 overflow-x-auto">
                  {curlSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 py-3.5 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="opacity-50">
            {projects.length} проектов · {totalNodesCount} узлов · {maskAccessKey(accessKey)}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopyText(generatedPrompt, setCopiedPrompt)}
              className="px-3.5 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold hover:opacity-90 active:scale-97 transition-all shadow-xs"
            >
              {copiedPrompt ? '✓ Скопировано' : 'Копировать промпт'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
