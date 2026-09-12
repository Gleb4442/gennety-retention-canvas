import React, { useState, useRef } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { ButterflyLogo } from './ButterflyLogo';
import type { CanvasProject } from '../types';

interface PersonalCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewProjectModal: () => void;
  onOpenSettings: () => void;
  onOpenImportJson?: () => void;
}

export const PersonalCabinetModal: React.FC<PersonalCabinetModalProps> = ({
  isOpen,
  onClose,
  onOpenNewProjectModal,
  onOpenSettings,
  onOpenImportJson,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState('');

  const importProjectInputRef = useRef<HTMLInputElement>(null);

  const projects = useBoardStore((s) => s.projects);
  const currentProjectId = useBoardStore((s) => s.currentProjectId);
  const theme = useBoardStore((s) => s.theme);
  const switchProject = useBoardStore((s) => s.switchProject);
  const duplicateProject = useBoardStore((s) => s.duplicateProject);
  const renameProject = useBoardStore((s) => s.renameProject);
  const deleteProject = useBoardStore((s) => s.deleteProject);
  const exportProjectJson = useBoardStore((s) => s.exportProjectJson);
  const importProjectFromJson = useBoardStore((s) => s.importProjectFromJson);

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
      {/* Hidden File Input */}
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
        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl liquid-pill flex items-center justify-center p-2 shadow-md">
              <ButterflyLogo theme={theme} className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-base text-white">
                  Личный кабинет
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono liquid-pill text-zinc-300 border border-white/10">
                  Проекты
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Управление Canvas-проектами и схемами
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenNewProjectModal();
              }}
              className="px-3.5 py-1.5 rounded-xl liquid-pill-active font-semibold text-xs text-white flex items-center gap-1.5 transition-transform hover:scale-105"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Новый проект</span>
            </button>

            <button
              onClick={() => {
                if (onOpenImportJson) {
                  onClose();
                  onOpenImportJson();
                } else {
                  importProjectInputRef.current?.click();
                }
              }}
              className="px-3 py-1.5 rounded-xl liquid-pill text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
              title="Импортировать проект из JSON-кода или AI-промпта"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="hidden sm:inline">Импорт</span>
            </button>

            {/* Settings & Key Button */}
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 rounded-xl liquid-pill text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors hover:bg-white/10"
              title="Открыть карту настроек ключа и аккаунта"
            >
              <svg className="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Настройки</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl liquid-pill text-zinc-400 hover:text-white transition-colors"
              title="Закрыть"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ================= STATS BAR ================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-3 border-b border-white/5 bg-white/[0.01]">
          <div className="p-2.5 rounded-xl liquid-pill">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Всего проектов</div>
            <div className="text-lg font-bold font-display text-white mt-0.5">{projects.length}</div>
          </div>
          <div className="p-2.5 rounded-xl liquid-pill">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Всего блоков</div>
            <div className="text-lg font-bold font-display text-white mt-0.5">{totalNodesCount}</div>
          </div>
          <div className="p-2.5 rounded-xl liquid-pill">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Связей в графах</div>
            <div className="text-lg font-bold font-display text-zinc-300 mt-0.5">{totalEdgesCount}</div>
          </div>
          <div className="p-2.5 rounded-xl liquid-pill">
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Активный проект</div>
            <div className="text-xs font-semibold font-display text-zinc-200 mt-1 truncate">
              {activeProj?.title || '—'}
            </div>
          </div>
        </div>

        {/* ================= CONTROLS SEARCH ================= */}
        <div className="px-6 py-3 border-b border-white/10 bg-white/[0.01]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по проектам..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl liquid-pill text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <svg
              className="w-4 h-4 text-zinc-500 absolute left-3 top-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {/* ================= PROJECT CARDS LIST ================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 max-h-[50vh]">
          {filteredProjects.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2 font-mono text-xs">
              <div>Проекты не найдены</div>
              <div className="text-[11px] text-zinc-600">Попробуйте изменить поисковый запрос</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredProjects.map((p) => {
                const isActive = p.id === currentProjectId;
                const isEditingThis = editingProjectId === p.id;
                const nodeCount = p.nodes?.length || 0;
                const edgeCount = p.edges?.length || 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (!isEditingThis) {
                        switchProject(p.id);
                        onClose();
                      }
                    }}
                    className={`group relative p-4 rounded-2xl transition-all cursor-pointer border ${
                      isActive
                        ? 'liquid-pill-active border-white/25 shadow-xl ring-1 ring-white/10'
                        : 'liquid-glass border-white/5 hover:border-white/20 hover:scale-[1.01]'
                    }`}
                  >
                    {/* Active Ribbon */}
                    {isActive && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-zinc-200 text-[10px] font-mono font-medium border border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
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
                          className="w-full px-2.5 py-1.5 rounded-lg liquid-pill text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white/40"
                        />
                        <input
                          type="text"
                          value={editingDesc}
                          onChange={(e) => setEditingDesc(e.target.value)}
                          placeholder="Описание..."
                          className="w-full px-2.5 py-1 rounded-lg liquid-pill text-[11px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-white/40"
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
                      <div className="mb-2.5 pr-14">
                        <h3 className="font-display font-bold text-sm text-white group-hover:text-zinc-200 transition-colors line-clamp-1">
                          {p.title}
                        </h3>
                        {p.description && (
                          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed font-sans">
                            {p.description}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Meta chips */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3 font-mono text-[10px]">
                      <span className="px-2 py-0.5 rounded-md liquid-pill text-zinc-300">
                        🧩 {nodeCount} блоков
                      </span>
                      <span className="px-2 py-0.5 rounded-md liquid-pill text-zinc-400">
                        ⚡ {edgeCount} связей
                      </span>
                      <span className="px-2 py-0.5 rounded-md liquid-pill text-zinc-400 capitalize">
                        📐 {p.layoutMode}
                      </span>
                    </div>

                    {/* Footer with date & actions */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-white/5 text-[10px] font-mono text-zinc-500">
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
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            <span>Автосохранение включено</span>
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
