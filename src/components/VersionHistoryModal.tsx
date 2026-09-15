import React, { useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import type { ProjectVersion } from '../types';

export const VersionHistoryModal: React.FC = () => {
  const isOpen = useBoardStore((s) => s.isVersionHistoryModalOpen);
  const setIsOpen = useBoardStore((s) => s.setIsVersionHistoryModalOpen);
  const versions = useBoardStore((s) => s.versions);
  const fetchVersions = useBoardStore((s) => s.fetchVersions);
  const createVersionCheckpoint = useBoardStore((s) => s.createVersionCheckpoint);
  const restoreVersionCheckpoint = useBoardStore((s) => s.restoreVersionCheckpoint);
  const setPreviewingVersion = useBoardStore((s) => s.setPreviewingVersion);
  const userRole = useBoardStore((s) => s.userRole);

  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    await createVersionCheckpoint(newVersionLabel.trim() || undefined);
    setNewVersionLabel('');
    setIsCreating(false);
  };

  const handlePreview = (version: ProjectVersion) => {
    setPreviewingVersion(version);
    setIsOpen(false);
  };

  const handleRestore = async (version: ProjectVersion) => {
    const confirmRestore = window.confirm(
      `Вы уверены, что хотите откатить проект до версии v${version.versionNumber} ("${version.label || 'Без названия'}")?\n\nТекущее состояние сохранится в истории перед откатом.`
    );
    if (!confirmRestore) return;

    setRestoringId(version.id);
    await restoreVersionCheckpoint(version.id);
    setRestoringId(null);
    setIsOpen(false);
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl liquid-card flex flex-col shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl liquid-pill text-indigo-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20v-6M6 20V10M18 20V4" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight">История версий и откат</h2>
              <p className="text-xs opacity-60">Точки сохранения, предпросмотр и мгновенный откат схемы</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg liquid-pill opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>

        {/* Create Manual Checkpoint Form */}
        {userRole !== 'viewer' && (
          <div className="p-4 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
            <form onSubmit={handleCreateCheckpoint} className="flex gap-2">
              <input
                type="text"
                value={newVersionLabel}
                onChange={(e) => setNewVersionLabel(e.target.value)}
                placeholder="Название контрольной точки (например, 'Финал спринта #4')..."
                className="flex-1 px-3 py-2 rounded-xl text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>{isCreating ? 'Сохранение...' : 'Создать точку сохранения'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Versions List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {versions.length === 0 ? (
            <div className="py-12 text-center opacity-50 space-y-2">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto opacity-50">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
              <p className="text-sm font-medium">Версии еще не созданы</p>
              <p className="text-xs">Нажмите «Создать точку сохранения», чтобы зафиксировать текущую схему</p>
            </div>
          ) : (
            versions.map((ver) => (
              <div
                key={ver.id}
                className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/40 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 font-mono font-bold text-xs border border-indigo-500/30">
                      v{ver.versionNumber}
                    </span>
                    <h4 className="text-sm font-semibold tracking-tight">
                      {ver.label || `Контрольная точка #${ver.versionNumber}`}
                    </h4>
                    {ver.isManual && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 opacity-70">
                        Ручная
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs opacity-60">
                    <span>Автор: <strong className="opacity-90">{ver.createdByName}</strong></span>
                    <span>•</span>
                    <span className="font-mono">{formatDate(ver.createdAt)}</span>
                    <span>•</span>
                    <span className="font-mono">{ver.nodesCount} блоков, {ver.edgesCount} связей</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-0">
                  <button
                    onClick={() => handlePreview(ver)}
                    className="px-3 py-1.5 rounded-xl liquid-pill text-xs font-medium opacity-80 hover:opacity-100 hover:bg-white/10 transition-all flex items-center gap-1.5"
                    title="Посмотреть состояние проекта на этот момент"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>Предпросмотр</span>
                  </button>

                  {userRole !== 'viewer' && (
                    <button
                      onClick={() => handleRestore(ver)}
                      disabled={restoringId === ver.id}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white text-xs font-medium shadow-sm active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                      title="Откатить текущий холст до этого состояния"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                      <span>{restoringId === ver.id ? 'Откат...' : 'Откатить'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-between text-xs opacity-70">
          <span>Всего версий в базе: {versions.length}</span>
          <button
            onClick={() => fetchVersions()}
            className="hover:underline font-mono"
          >
            Обновить список
          </button>
        </div>
      </div>
    </div>
  );
};
