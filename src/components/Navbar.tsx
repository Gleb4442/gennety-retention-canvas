import React, { useRef, useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import type { ThemeMode } from '../types';
import {
  IconFreeform,
  IconPyramidLayout,
  IconFlywheelLayout,
  IconThemeSwitch,
  IconSearchMinimal,
} from './AbstractIcons';
import { ButterflyLogo } from './ButterflyLogo';
import { LivePresenceBar } from './LivePresenceBar';

interface NavbarProps {
  onOpenSearchModal: () => void;
  onOpenHelpModal: () => void;
  onOpenCabinet: () => void;
  onOpenSettings: () => void;
  onOpenImportJson?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearchModal,
  onOpenHelpModal,
  onOpenCabinet,
  onOpenSettings,
  onOpenImportJson,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  const layoutMode = useBoardStore((s) => s.layoutMode);
  const setLayoutMode = useBoardStore((s) => s.setLayoutMode);
  const theme = useBoardStore((s) => s.theme);
  const setTheme = useBoardStore((s) => s.setTheme);
  const undo = useBoardStore((s) => s.undo);
  const redo = useBoardStore((s) => s.redo);
  const undoStack = useBoardStore((s) => s.undoStack);
  const redoStack = useBoardStore((s) => s.redoStack);
  const resetToDefault = useBoardStore((s) => s.resetToDefault);
  const exportJson = useBoardStore((s) => s.exportJson);
  const importJson = useBoardStore((s) => s.importJson);
  const projects = useBoardStore((s) => s.projects);
  const currentProjectId = useBoardStore((s) => s.currentProjectId);
  const cloudSyncStatus = useBoardStore((s) => s.cloudSyncStatus);
  const setIsAiBridgeModalOpen = useBoardStore((s) => s.setIsAiBridgeModalOpen);

  const isViewerMode = useBoardStore((s) => s.isViewerMode);
  const setIsShareModalOpen = useBoardStore((s) => s.setIsShareModalOpen);
  const setIsVersionHistoryModalOpen = useBoardStore((s) => s.setIsVersionHistoryModalOpen);
  const setIsAuditDrawerOpen = useBoardStore((s) => s.setIsAuditDrawerOpen);
  const versions = useBoardStore((s) => s.versions);
  const auditLogs = useBoardStore((s) => s.auditLogs);

  const activeProject = projects.find((p) => p.id === currentProjectId) || projects[0];
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const handleExportPng = async () => {
    const element = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!element) return;

    try {
      const { toPng } = await import('html-to-image');
      const bgColor =
        theme === 'light'
          ? '#F3F5F8'
          : theme === 'graphite'
          ? '#18191D'
          : theme === 'monochrome'
          ? '#050505'
          : '#08090C';
      const dataUrl = await toPng(element, {
        backgroundColor: bgColor,
        quality: 1.0,
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `${activeProject ? activeProject.title : 'retention-canvas'}-${theme}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('Не удалось экспортировать изображение.');
    }
  };

  const handleExportJson = () => {
    const json = exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${activeProject ? activeProject.title : 'retention-canvas'}-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonClick = () => {
    if (onOpenImportJson) {
      onOpenImportJson();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importJson(content);
      if (!res.success) {
        alert(res.error || 'Ошибка при импорте JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetConfirm = () => {
    if (confirm('Сбросить схему до начального состояния Gennety Canvas?')) {
      resetToDefault();
    }
  };

  const themeOptions: { id: ThemeMode; label: string; desc: string; isLight?: boolean }[] = [
    { id: 'dark', label: 'Dark Obsidian', desc: 'Глубокое чёрное стекло' },
    { id: 'stone', label: 'Warm Stone', desc: 'Тёплый базальт (без синевы)' },
    { id: 'slate', label: 'Nordic Slate', desc: 'Скандинавский сланец' },
    { id: 'graphite', label: 'Graphite Gray', desc: 'Матовый нейтральный серый' },
    { id: 'monochrome', label: 'Monochrome B&W', desc: 'Строгий минимал' },
    { id: 'light', label: 'Liquid Pearl', desc: 'Светлый жемчуг', isLight: true },
    { id: 'sand', label: 'Parchment Sand', desc: 'Песочный пергамент (книжный)', isLight: true },
    { id: 'mist', label: 'Titanium Mist', desc: 'Титановая дымка (без бликов)', isLight: true },
  ];

  return (
    <nav className="fixed top-3 inset-x-3 sm:inset-x-5 z-30 flex items-center justify-between pointer-events-none select-none gap-2 flex-nowrap">
      {/* Hidden File Input for JSON */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden pointer-events-auto"
      />

      {/* Left Section: Brand Logo ("Canvas") + Project Pill */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Brand Block (Canvas only) */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-2xl liquid-glass shadow-xl flex-shrink-0">
          <div className="w-7 h-7 rounded-xl liquid-pill flex items-center justify-center p-1 text-inherit opacity-95 shadow-sm flex-shrink-0">
            <ButterflyLogo theme={theme} className="w-full h-full" />
          </div>
          <span className="font-display font-bold text-sm tracking-wide text-inherit block leading-none pr-0.5">
            Canvas
          </span>
        </div>

        {/* Compact Project Folder Pill with Cloud Database Sync Indicator */}
        <button
          onClick={onOpenCabinet}
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-2xl liquid-glass shadow-xl text-xs font-mono transition-all hover:bg-black/5 dark:hover:bg-white/10 hover:scale-[1.01] active:scale-[0.99] text-inherit group flex-shrink-0"
          title={`Проект: ${activeProject?.title || 'Retention'} | Статус БД: ${
            cloudSyncStatus === 'syncing'
              ? 'Сохранение в Supabase Postgres...'
              : cloudSyncStatus === 'synced'
              ? 'Синхронизировано с базой данных Supabase'
              : cloudSyncStatus === 'offline'
              ? 'Офлайн (сохранено локально)'
              : cloudSyncStatus === 'error'
              ? 'Ошибка соединения с БД'
              : 'База данных Supabase подключена'
          }`}
        >
          <svg className="w-3.5 h-3.5 opacity-65 group-hover:opacity-100 flex-shrink-0 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="max-w-[100px] sm:max-w-[140px] truncate opacity-90 group-hover:opacity-100 font-semibold transition-opacity">
            {activeProject?.title || 'Проекты'}
          </span>
          {cloudSyncStatus === 'syncing' ? (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0 shadow-sm" title="Сохранение в базу данных..." />
          ) : cloudSyncStatus === 'synced' ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 shadow-sm" title="Сохранено в базе данных Supabase" />
          ) : cloudSyncStatus === 'offline' ? (
            <span className="w-2 h-2 rounded-full bg-zinc-400 flex-shrink-0" title="Офлайн" />
          ) : cloudSyncStatus === 'error' ? (
            <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 animate-bounce" title="Ошибка связи с БД" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500/80 flex-shrink-0 shadow-sm" title="База данных подключена" />
          )}
        </button>
      </div>

      {/* Island 2 (Center): Compact Layout Mode Switcher (Icon-only with tooltips) */}
      <div className="pointer-events-auto flex items-center p-1 rounded-2xl liquid-glass shadow-xl gap-0.5 flex-shrink-0">
        <button
          onClick={() => setLayoutMode('freeform')}
          className={`p-1.5 rounded-xl text-xs transition-all ${
            layoutMode === 'freeform'
              ? 'liquid-pill-active'
              : 'opacity-65 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Свободный холст (Freeform)"
          aria-label="Свободный холст"
        >
          <IconFreeform className="w-4 h-4" />
        </button>

        <button
          onClick={() => setLayoutMode('pyramid')}
          className={`p-1.5 rounded-xl text-xs transition-all ${
            layoutMode === 'pyramid'
              ? 'liquid-pill-active'
              : 'opacity-65 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Пирамида уровней (Pyramid Auto-Layout)"
          aria-label="Пирамида уровней"
        >
          <IconPyramidLayout className="w-4 h-4" />
        </button>

        <button
          onClick={() => setLayoutMode('flywheel')}
          className={`p-1.5 rounded-xl text-xs transition-all ${
            layoutMode === 'flywheel'
              ? 'liquid-pill-active'
              : 'opacity-65 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title="Круговой маховик системы (Flywheel loop)"
          aria-label="Маховик системы"
        >
          <IconFlywheelLayout className="w-4 h-4" />
        </button>
      </div>

      {/* Island 3 (Right): Theme Switcher, Actions & Settings */}
      <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-2xl liquid-glass shadow-xl flex-shrink-0">
        {/* Theme Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl liquid-pill text-xs font-mono transition-all"
            title="Переключить тему оформления"
          >
            <IconThemeSwitch className="w-3.5 h-3.5 opacity-80" />
            <span className="hidden xl:inline opacity-90 truncate max-w-[100px] font-medium">
              {themeOptions.find((t) => t.id === theme)?.label || theme}
            </span>
          </button>

          {isThemeMenuOpen && (
            <div 
              className="absolute top-10 right-0 w-64 p-1.5 rounded-2xl minimal-modal shadow-2xl z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto"
              onMouseLeave={() => setIsThemeMenuOpen(false)}
            >
              {/* Dark & Neutral Group */}
              <div className="px-2.5 pt-2 pb-1 text-[9px] font-mono uppercase tracking-wider opacity-40">
                Тёмные & Матовые
              </div>
              {themeOptions.filter((t) => !t.isLight).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsThemeMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                    theme === t.id
                      ? 'liquid-pill-active font-semibold'
                      : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                      style={{ 
                        backgroundColor: t.id === 'dark' ? '#08090C' : t.id === 'stone' ? '#1C1B1A' : t.id === 'slate' ? '#111418' : t.id === 'graphite' ? '#18191D' : '#050505' 
                      }} 
                    />
                    <div>
                      <div className="font-medium text-[11px] leading-tight">{t.label}</div>
                      <div className="text-[9px] opacity-60 font-mono leading-tight">{t.desc}</div>
                    </div>
                  </div>
                  {theme === t.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 ml-2 flex-shrink-0" />
                  )}
                </button>
              ))}

              {/* Light & Gentle Group */}
              <div className="px-2.5 pt-2.5 pb-1 text-[9px] font-mono uppercase tracking-wider opacity-40 mt-1">
                Светлые & Мягкие для глаз
              </div>
              {themeOptions.filter((t) => t.isLight).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsThemeMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                    theme === t.id
                      ? 'liquid-pill-active font-semibold'
                      : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                      style={{ 
                        backgroundColor: t.id === 'light' ? '#F3F5F8' : t.id === 'sand' ? '#ECE8E1' : '#E4E6EA' 
                      }} 
                    />
                    <div>
                      <div className="font-medium text-[11px] leading-tight">{t.label}</div>
                      <div className="text-[9px] opacity-60 font-mono leading-tight">{t.desc}</div>
                    </div>
                  </div>
                  {theme === t.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 ml-2 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center p-0.5 rounded-xl liquid-pill">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg transition-opacity ${
              canUndo ? 'opacity-80 hover:opacity-100 hover:bg-white/10' : 'opacity-25 cursor-not-allowed'
            }`}
            title="Отменить (Cmd+Z)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg transition-opacity ${
              canRedo ? 'opacity-80 hover:opacity-100 hover:bg-white/10' : 'opacity-25 cursor-not-allowed'
            }`}
            title="Повторить (Cmd+Shift+Z)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
            </svg>
          </button>
        </div>

        {/* Live Team Presence Bar */}
        <LivePresenceBar />

        {/* Share Project Button */}
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95 flex-shrink-0"
          title="Поделиться проектом по ссылке (⌘⇧S)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span className="hidden lg:inline">Поделиться</span>
        </button>

        {/* Version History Checkpoints Button */}
        <button
          onClick={() => setIsVersionHistoryModalOpen(true)}
          className="p-1.5 rounded-lg liquid-pill opacity-75 hover:opacity-100 transition-opacity relative flex-shrink-0"
          title="История версий и откат схемы"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20v-6M6 20V10M18 20V4" />
          </svg>
          {versions.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-blue-500 text-[8px] font-mono font-bold text-white flex items-center justify-center">
              {versions.length}
            </span>
          )}
        </button>

        {/* Audit Log Activity Feed Button */}
        <button
          onClick={() => setIsAuditDrawerOpen(true)}
          className="p-1.5 rounded-lg liquid-pill opacity-75 hover:opacity-100 transition-opacity relative flex-shrink-0"
          title="Журнал действий команды (⌘L)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {auditLogs.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-blue-500 text-[8px] font-mono font-bold text-white flex items-center justify-center">
              {auditLogs.length > 99 ? '99+' : auditLogs.length}
            </span>
          )}
        </button>

        {/* Search (Compact Icon) */}
        <button
          onClick={onOpenSearchModal}
          className="p-1.5 rounded-lg liquid-pill opacity-80 hover:opacity-100 transition-opacity flex-shrink-0"
          title="Поиск узлов (⌘K)"
        >
          <IconSearchMinimal className="w-4 h-4" />
        </button>

        {/* Export / Reset Buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={handleExportPng}
            className="p-1.5 rounded-lg liquid-pill opacity-75 hover:opacity-100 transition-opacity"
            title="Экспортировать в PNG"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </button>

          <button
            onClick={handleExportJson}
            className="p-1.5 rounded-lg liquid-pill opacity-75 hover:opacity-100 transition-opacity"
            title="Экспортировать JSON проекта"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
          </button>

          {!isViewerMode && (
            <>
              <button
                onClick={handleImportJsonClick}
                className="p-1.5 rounded-lg liquid-pill opacity-75 hover:opacity-100 transition-opacity"
                title="Импортировать по коду JSON или AI-промпту (⌘I)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
                </svg>
              </button>

              <button
                onClick={handleResetConfirm}
                className="p-1.5 rounded-lg liquid-pill opacity-50 hover:opacity-100 transition-opacity"
                title="Сбросить холст к исходной структуре Gennety Canvas"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                </svg>
              </button>
            </>
          )}

          {/* MCP Bridge Button (Accent Color) */}
          <button
            onClick={() => setIsAiBridgeModalOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs tracking-wider shadow-md shadow-indigo-600/30 transition-all active:scale-95 flex-shrink-0"
            title="MCP & AI-Агент: системный промпт со всеми адресами, MCP-сервер и API (⌘J)"
          >
            MCP
          </button>

          {/* Settings Button (Access Key, Account, Backup) */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg liquid-pill opacity-75 hover:opacity-100 transition-opacity"
            title="Настройки ключа доступа и аккаунта"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <button
            onClick={onOpenHelpModal}
            className="p-1.5 rounded-lg liquid-pill opacity-50 hover:opacity-100 transition-opacity"
            title="Подсказки и горячие клавиши"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};
