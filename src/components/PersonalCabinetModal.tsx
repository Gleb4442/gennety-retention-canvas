import React, { useState, useRef } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { ButterflyLogo } from './ButterflyLogo';
import { maskAccessKey } from '../lib/auth';
import type { CanvasProject } from '../types';

interface PersonalCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewProjectModal: () => void;
}

export const PersonalCabinetModal: React.FC<PersonalCabinetModalProps> = ({
  isOpen,
  onClose,
  onOpenNewProjectModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullKey, setShowFullKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState('');

  const backupInputRef = useRef<HTMLInputElement>(null);
  const importProjectInputRef = useRef<HTMLInputElement>(null);

  const accessKey = useBoardStore((s) => s.accessKey);
  const projects = useBoardStore((s) => s.projects);
  const currentProjectId = useBoardStore((s) => s.currentProjectId);
  const theme = useBoardStore((s) => s.theme);
  const logout = useBoardStore((s) => s.logout);
  const switchProject = useBoardStore((s) => s.switchProject);
  const duplicateProject = useBoardStore((s) => s.duplicateProject);
  const renameProject = useBoardStore((s) => s.renameProject);
  const deleteProject = useBoardStore((s) => s.deleteProject);
  const exportProjectJson = useBoardStore((s) => s.exportProjectJson);
  const exportAllProjectsJson = useBoardStore((s) => s.exportAllProjectsJson);
  const importProjectFromJson = useBoardStore((s) => s.importProjectFromJson);
  const importBackupJson = useBoardStore((s) => s.importBackupJson);

  if (!isOpen) return null;

  // Stats calculation
  const totalNodesCount = projects.reduce((acc, p) => acc + (p.nodes?.length || 0), 0);
  const totalEdgesCount = projects.reduce((acc, p) => acc + (p.edges?.length || 0), 0);
  const activeProj = projects.find((p) => p.id === currentProjectId) || projects[0];

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const handleCopyKey = async () => {
    if (!accessKey) return;
    try {
      await navigator.clipboard.writeText(accessKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } catch {
      // Fallback copy
      const t = document.createElement('textarea');
      t.value = accessKey;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handleExportBackup = () => {
    const json = exportAllProjectsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `retention-canvas-backup-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const res = importBackupJson(content);
      if (!res.success) {
        alert(res.error || 'Ошибка импорта резервной копии');
      } else {
        alert('Резервная копия успешно восстановлена!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportSingleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const defaultName = file.name.replace(/\.json$/i, '');
      const res = importProjectFromJson(content, defaultName);
      if (!res.success) {
        alert(res.error || 'Ошибка импорта проекта');
      } else {
        onClose();
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportSingleProject = (p: CanvasProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const json = exportProjectJson(p.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = p.title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_');
    link.download = `${safeTitle}-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleStartEditing = (p: CanvasProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(p.id);
    setEditingTitle(p.title);
    setEditingDesc(p.description || '');
  };

  const handleSaveEditing = (pId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editingTitle.trim()) {
      renameProject(pId, editingTitle.trim(), editingDesc.trim());
    }
    setEditingProjectId(null);
  };

  const handleDelete = (pId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length <= 1) {
      alert('Нельзя удалить единственный проект.');
      return;
    }
    if (confirm(`Удалить проект «${title}»? Это действие нельзя отменить.`)) {
      deleteProject(pId);
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={backupInputRef}
        onChange={handleBackupFileChange}
        accept=".json"
        className="hidden"
      />
      <input
        type="file"
        ref={importProjectInputRef}
        onChange={handleImportSingleProjectFileChange}
        accept=".json"
        className="hidden"
      />

      <div 
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl liquid-glass shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= TOP HEADER ================= */}
        <div className="px-6 py-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-white/[0.02]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl liquid-pill flex items-center justify-center p-2 shadow-md">
              <ButterflyLogo theme={theme} className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg text-white">
                  Личный кабинет стратега
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono liquid-pill text-cyan-400 border border-cyan-400/20">
                  Workspace
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Управление Canvas-проектами и облачным доступом
              </p>
            </div>
          </div>

          {/* Access Key & User Actions */}
          <div className="flex items-center gap-2.5">
            {/* Key Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl liquid-pill border border-white/5 font-mono text-xs">
              <span className="text-zinc-400 text-[11px]">Ключ:</span>
              <span className="text-cyan-300 font-semibold tracking-wider">
                {showFullKey ? accessKey : maskAccessKey(accessKey || '')}
              </span>
              <button
                type="button"
                onClick={() => setShowFullKey(!showFullKey)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                title={showFullKey ? 'Скрыть ключ' : 'Показать полный ключ'}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showFullKey ? (
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  ) : (
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                  )}
                </svg>
              </button>
              <button
                type="button"
                onClick={handleCopyKey}
                className="text-zinc-400 hover:text-white transition-colors p-0.5"
                title="Копировать ключ"
              >
                {copiedKey ? (
                  <span className="text-emerald-400 text-[10px] font-sans">✓</span>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                if (confirm('Выйти из личного кабинета? Ключ останется сохранён в ваших записях.')) {
                  logout();
                }
              }}
              className="px-3 py-1.5 rounded-xl liquid-pill text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
              title="Выйти из этого аккаунта"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Выйти</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl liquid-pill text-zinc-400 hover:text-white transition-colors ml-1"
              title="Закрыть кабинет и вернуться к холсту"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ================= STATS BAR ================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-4 border-b border-white/5 bg-white/[0.01]">
          <div className="p-3 rounded-2xl liquid-pill">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Всего проектов</div>
            <div className="text-xl font-bold font-display text-white mt-0.5">{projects.length}</div>
          </div>
          <div className="p-3 rounded-2xl liquid-pill">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Всего блоков</div>
            <div className="text-xl font-bold font-display text-cyan-300 mt-0.5">{totalNodesCount}</div>
          </div>
          <div className="p-3 rounded-2xl liquid-pill">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Связей в графах</div>
            <div className="text-xl font-bold font-display text-emerald-300 mt-0.5">{totalEdgesCount}</div>
          </div>
          <div className="p-3 rounded-2xl liquid-pill">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Активный проект</div>
            <div className="text-sm font-semibold font-display text-zinc-200 mt-1 truncate">
              {activeProj?.title || '—'}
            </div>
          </div>
        </div>

        {/* ================= CONTROLS TOOLBAR ================= */}
        <div className="px-6 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.01]">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск проектов по названию..."
              className="w-full pl-9 pr-4 py-2 rounded-xl liquid-pill text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
            />
            <svg
              className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                onClose();
                onOpenNewProjectModal();
              }}
              className="px-4 py-2 rounded-xl liquid-pill-active font-semibold text-xs text-white flex items-center gap-1.5 transition-transform hover:scale-105"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Новый проект</span>
            </button>

            <button
              onClick={() => importProjectInputRef.current?.click()}
              className="px-3 py-2 rounded-xl liquid-pill text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
              title="Импортировать один Canvas проект из JSON файла"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="hidden sm:inline">Импорт JSON</span>
            </button>

            <button
              onClick={handleExportBackup}
              className="px-3 py-2 rounded-xl liquid-pill text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
              title="Скачать полную резервную копию всех проектов"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="hidden sm:inline">Резервная копия</span>
            </button>

            <button
              onClick={() => backupInputRef.current?.click()}
              className="p-2 rounded-xl liquid-pill text-zinc-400 hover:text-white transition-colors"
              title="Восстановить все проекты из резервной копии"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
          </div>
        </div>

        {/* ================= PROJECTS GRID ================= */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 font-mono text-xs">
              Проекты не найдены. Попробуйте изменить поисковый запрос или создайте новый проект.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((p) => {
                const isActive = p.id === currentProjectId;
                const isEditingThis = editingProjectId === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (!isEditingThis) {
                        switchProject(p.id);
                        onClose();
                      }
                    }}
                    className={`group relative p-5 rounded-2xl transition-all cursor-pointer border ${
                      isActive
                        ? 'liquid-pill-active border-cyan-400/50 shadow-xl ring-1 ring-cyan-400/30'
                        : 'liquid-glass border-white/5 hover:border-white/20 hover:scale-[1.01]'
                    }`}
                  >
                    {/* Active Ribbon */}
                    {isActive && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span>Открыт</span>
                      </div>
                    )}

                    {/* Inline Rename Form or Card Header */}
                    {isEditingThis ? (
                      <form
                        onSubmit={(e) => handleSaveEditing(p.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="space-y-2 mb-3"
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          autoFocus
                          className="w-full px-2.5 py-1.5 rounded-lg liquid-pill text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                        <input
                          type="text"
                          value={editingDesc}
                          onChange={(e) => setEditingDesc(e.target.value)}
                          placeholder="Описание..."
                          className="w-full px-2.5 py-1 rounded-lg liquid-pill text-[11px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="submit"
                            className="px-2.5 py-1 rounded-md liquid-pill-active text-[10px] font-medium text-white"
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProjectId(null);
                            }}
                            className="px-2.5 py-1 rounded-md liquid-pill text-[10px] text-zinc-400 hover:text-white"
                          >
                            Отмена
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="mb-3 pr-14">
                        <h3 className="font-display font-bold text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {p.title}
                        </h3>
                        {p.description && (
                          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed font-sans">
                            {p.description}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Meta chips */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded-md liquid-pill text-zinc-300">
                        🧩 {p.nodes?.length || 0} блоков
                      </span>
                      <span className="px-2 py-0.5 rounded-md liquid-pill text-zinc-400">
                        ⚡ {p.edges?.length || 0} связей
                      </span>
                      <span className="px-2 py-0.5 rounded-md liquid-pill text-zinc-400 capitalize">
                        📐 {p.layoutMode}
                      </span>
                    </div>

                    {/* Footer with date & actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] font-mono text-zinc-500">
                      <span>{formatDate(p.updatedAt)}</span>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleStartEditing(p, e)}
                          className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                          title="Переименовать"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateProject(p.id);
                          }}
                          className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                          title="Дублировать проект"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleExportSingleProject(p, e)}
                          className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                          title="Экспорт в JSON"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>

                        {projects.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(p.id, p.title, e)}
                            className="p-1 rounded-md hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-colors"
                            title="Удалить проект"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between bg-white/[0.02] text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Автосохранение включено • Хранилище активно</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl liquid-pill text-zinc-300 hover:text-white transition-colors"
          >
            Вернуться к холсту →
          </button>
        </div>
      </div>
    </div>
  );
};
