import React from 'react';
import { useBoardStore } from '../store/useBoardStore';

export const ViewerModeBanner: React.FC = () => {
  const isViewerMode = useBoardStore((s) => s.isViewerMode);
  const previewingVersion = useBoardStore((s) => s.previewingVersion);
  const setPreviewingVersion = useBoardStore((s) => s.setPreviewingVersion);
  const restoreVersionCheckpoint = useBoardStore((s) => s.restoreVersionCheckpoint);

  if (!isViewerMode && !previewingVersion) return null;

  if (previewingVersion) {
    return (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-2xl bg-indigo-950/90 text-white backdrop-blur-xl shadow-2xl animate-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-2 text-xs">
          <span className="p-1 rounded-lg bg-indigo-500/30 text-indigo-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
          </span>
          <div>
            <span className="font-semibold text-indigo-200">Предпросмотр версии v{previewingVersion.versionNumber}:</span>{' '}
            <span className="opacity-90">"{previewingVersion.label || 'Контрольная точка'}"</span>
            <span className="opacity-60 text-[10px] ml-1 font-mono">({previewingVersion.createdByName})</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pl-2">
          <button
            onClick={() => setPreviewingVersion(null)}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium transition-all"
          >
            Выйти
          </button>
          <button
            onClick={() => restoreVersionCheckpoint(previewingVersion.id)}
            className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-md transition-all active:scale-95"
          >
            Восстановить эту версию
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/80 dark:bg-black/90 text-white backdrop-blur-xl shadow-xl text-xs font-mono select-none animate-in slide-in-from-top-4 duration-200">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="opacity-90">Режим просмотра (Только чтение). Правки отключены.</span>
    </div>
  );
};
