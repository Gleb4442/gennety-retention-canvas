import React, { useRef, useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import type { ThemeMode } from '../types';
import {
  IconFreeform,
  IconPyramidLayout,
  IconFlywheelLayout,
  IconThemeSwitch,
  IconAdd,
  IconSearchMinimal,
} from './AbstractIcons';
import { ButterflyLogo } from './ButterflyLogo';

interface NavbarProps {
  onOpenAddModal: () => void;
  onOpenSearchModal: () => void;
  onOpenHelpModal: () => void;
  onOpenCabinet: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddModal,
  onOpenSearchModal,
  onOpenHelpModal,
  onOpenCabinet,
  onOpenSettings,
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
    fileInputRef.current?.click();
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
    if (confirm('Сбросить схему до начального состояния Retention Canvas?')) {
      resetToDefault();
    }
  };

  const themeOptions: { id: ThemeMode; label: string; desc: string }[] = [
    { id: 'dark', label: 'Dark Obsidian', desc: 'Глубокое стекло' },
    { id: 'light', label: 'Liquid Pearl', desc: 'Светлый жемчуг' },
    { id: 'graphite', label: 'Graphite Gray', desc: 'Матовый серый' },
    { id: 'monochrome', label: 'Monochrome B&W', desc: 'Чёрно-белая' },
  ];

  return (
    <nav className="fixed top-4 inset-x-6 z-30 flex items-center justify-between pointer-events-none select-none gap-2">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden pointer-events-auto"
      />

      {/* Left Section: Standard Brand Identity + Compact Separate Project Folder */}
      <div className="flex items-center gap-2">
        {/* Standard Brand Block (Pristine size) */}
        <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-2xl liquid-glass shadow-2xl">
          <div className="w-10 h-10 rounded-xl liquid-pill flex items-center justify-center p-1.5 text-inherit opacity-95 shadow-sm flex-shrink-0">
            <ButterflyLogo theme={theme} className="w-full h-full" />
          </div>
          <div>
            <span className="font-display font-bold text-sm tracking-wider text-inherit block leading-tight">
              Retention Canvas
            </span>
          </div>
        </div>

        {/* Compact Project Folder Pill */}
        <button
          onClick={onOpenCabinet}
          className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl liquid-glass shadow-2xl text-xs font-mono transition-all hover:bg-white/10 group"
          title={`Проект: ${activeProject?.title || 'Retention'} (кликните, чтобы открыть проекты)`}
        >
          <svg className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="max-w-[110px] sm:max-w-[140px] truncate text-zinc-300 group-hover:text-white transition-colors">
            {activeProject?.title || 'Проекты'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="Сохранено" />
        </button>
      </div>

      {/* Island 2 (Center): Frameless Layout Mode Switcher */}
      <div className="pointer-events-auto flex items-center p-1 rounded-2xl liquid-glass shadow-2xl gap-1">
        <button
          onClick={() => setLayoutMode('freeform')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
            layoutMode === 'freeform'
              ? 'liquid-pill-active font-semibold'
              : 'opacity-70 hover:opacity-100'
          }`}
          title="Свободный холст (Miro style)"
        >
          <IconFreeform className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Freeform</span>
        </button>

        <button
          onClick={() => setLayoutMode('pyramid')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
            layoutMode === 'pyramid'
              ? 'liquid-pill-active font-semibold'
              : 'opacity-70 hover:opacity-100'
          }`}
          title="Пирамида уровней (Dagre Auto-Layout)"
        >
          <IconPyramidLayout className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Pyramid</span>
        </button>

        <button
          onClick={() => setLayoutMode('flywheel')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
            layoutMode === 'flywheel'
              ? 'liquid-pill-active font-semibold'
              : 'opacity-70 hover:opacity-100'
          }`}
          title="Круговой маховик системы (Flywheel loop)"
        >
          <IconFlywheelLayout className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Flywheel</span>
        </button>
      </div>

      {/* Island 3 (Right): Theme Switcher, Actions & Settings */}
      <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-2xl liquid-glass shadow-2xl">
        {/* Theme Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl liquid-pill text-xs font-mono transition-all"
            title="Переключить тему оформления"
          >
            <IconThemeSwitch className="w-3.5 h-3.5 opacity-80" />
            <span className="hidden md:inline capitalize opacity-90">{theme}</span>
          </button>

          {isThemeMenuOpen && (
            <div 
              className="absolute top-11 right-0 w-48 p-1.5 rounded-2xl liquid-glass shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95"
              onMouseLeave={() => setIsThemeMenuOpen(false)}
            >
              {themeOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsThemeMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all ${
                    theme === t.id
                      ? 'liquid-pill-active font-semibold'
                      : 'hover:bg-white/10 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="font-medium text-[11px]">{t.label}</div>
                    <div className="text-[9px] opacity-60 font-mono">{t.desc}</div>
                  </div>
                  {theme === t.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
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

        {/* Search */}
        <button
          onClick={onOpenSearchModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl liquid-pill text-xs font-mono transition-all"
          title="Поиск узлов (Cmd+K)"
        >
          <IconSearchMinimal className="w-3.5 h-3.5 opacity-70" />
          <span className="hidden 2xl:inline opacity-70">Search</span>
          <kbd className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded-md liquid-pill opacity-60">
            ⌘K
          </kbd>
        </button>

        {/* + Add Card */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl liquid-pill-active text-xs font-semibold transition-all hover:scale-105"
        >
          <IconAdd className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Card</span>
        </button>

        {/* Export / Reset Buttons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleExportPng}
            className="p-2 rounded-xl liquid-pill opacity-75 hover:opacity-100 transition-opacity"
            title="Экспортировать в PNG"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </button>

          <button
            onClick={handleExportJson}
            className="p-2 rounded-xl liquid-pill opacity-75 hover:opacity-100 transition-opacity"
            title="Экспортировать JSON проекта"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
          </button>

          <button
            onClick={handleImportJsonClick}
            className="p-2 rounded-xl liquid-pill opacity-75 hover:opacity-100 transition-opacity"
            title="Импортировать JSON"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
            </svg>
          </button>

          <button
            onClick={handleResetConfirm}
            className="p-2 rounded-xl liquid-pill opacity-50 hover:opacity-100 transition-opacity"
            title="Сбросить холст к исходной структуре Retention Canvas"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
          </button>

          {/* Settings Button (Access Key, Account, Backup) */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl liquid-pill text-zinc-300 hover:text-white transition-colors"
            title="Настройки ключа доступа и аккаунта"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <button
            onClick={onOpenHelpModal}
            className="p-2 rounded-xl liquid-pill opacity-50 hover:opacity-100 transition-opacity"
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
