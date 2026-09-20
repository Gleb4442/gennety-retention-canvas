import React, { useState, useEffect } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { collabManager } from '../lib/collaborationManager';
import type { ProjectShareLink } from '../types';

export const ShareProjectModal: React.FC = () => {
  const isOpen = useBoardStore((s) => s.isShareModalOpen);
  const setIsOpen = useBoardStore((s) => s.setIsShareModalOpen);
  const currentProjectId = useBoardStore((s) => s.currentProjectId);
  const projects = useBoardStore((s) => s.projects);
  const accessKey = useBoardStore((s) => s.accessKey);

  const [shares, setShares] = useState<ProjectShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedRole, setCopiedRole] = useState<string | null>(null);

  const activeProject = projects.find((p) => p.id === currentProjectId) || projects[0];

  useEffect(() => {
    if (!isOpen || !currentProjectId) return;
    let isMounted = true;
    collabManager.fetchShares().then((list) => {
      if (isMounted) {
        setShares(list);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen, currentProjectId]);

  if (!isOpen) return null;

  const getBaseOrigin = () => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
    return 'https://gennety-retention-canvas.vercel.app';
  };

  const getShareUrl = (token: string, role: string) => {
    return `${getBaseOrigin()}/?p=${encodeURIComponent(currentProjectId)}&share=${encodeURIComponent(token)}&role=${role}`;
  };

  const handleCopyLink = async (role: 'viewer' | 'editor') => {
    let existing = shares.find((s) => s.role === role && s.isActive);
    if (!existing) {
      setIsLoading(true);
      existing = await collabManager.createShare(role) || undefined;
      if (existing) {
        setShares((prev) => [existing!, ...prev]);
      }
      setIsLoading(false);
    }

    if (existing) {
      const url = getShareUrl(existing.shareToken, role);
      try {
        await navigator.clipboard.writeText(url);
        setCopiedRole(role);
        setTimeout(() => setCopiedRole(null), 2500);
      } catch {
        prompt('Скопируйте ссылку вручную:', url);
      }
    }
  };

  const handleRevokeShare = async (token: string) => {
    if (!window.confirm('Отозвать эту ссылку? Пользователи с этой ссылкой потеряют доступ.')) return;
    await collabManager.revokeShare(token, accessKey || undefined);
    setShares((prev) => prev.filter((s) => s.shareToken !== token));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl minimal-modal flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl liquid-pill text-blue-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Поделиться проектом</h2>
              <p className="text-xs opacity-60 truncate max-w-xs">{activeProject?.title || 'Canvas Project'}</p>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg liquid-pill opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>

        {/* Sharing Options */}
        <div className="p-5 space-y-4">
          {/* Editor Link Card */}
          <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-indigo-400">✏️ Ссылка для редактирования</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-500/20 text-indigo-300">Editor</span>
                </div>
                <p className="text-[11px] opacity-75 mt-0.5">
                  Полный доступ: перемещение блоков, создание карточек, рисование, совместная работа в реальном времени.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleCopyLink('editor')}
              disabled={isLoading}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copiedRole === 'editor' ? '✓ Ссылка скопирована!' : 'Скопировать ссылку для команды'}</span>
            </button>
          </div>

          {/* Viewer Link Card */}
          <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-emerald-400">👁️ Ссылка только для просмотра</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300">Read-Only</span>
                </div>
                <p className="text-[11px] opacity-75 mt-0.5">
                  Безопасный доступ для клиентов: можно смотреть, читать заметки и видеть живые курсоры, но правки заблокированы.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleCopyLink('viewer')}
              disabled={isLoading}
              className="w-full py-2 px-3 rounded-xl liquid-pill font-medium text-xs opacity-90 hover:opacity-100 hover:bg-white/10 active:scale-98 transition-all flex items-center justify-center gap-2 border border-black/10 dark:border-white/10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copiedRole === 'viewer' ? '✓ Ссылка скопирована!' : 'Скопировать ссылку для просмотра'}</span>
            </button>
          </div>

          {/* Active Links Management */}
          {shares.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-semibold opacity-75 mb-2">Активные ссылки:</h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {shares.map((s) => (
                  <div
                    key={s.shareToken}
                    className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className={`w-2 h-2 rounded-full ${s.role === 'viewer' ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                      <span className="font-mono opacity-80">{s.role === 'viewer' ? 'Просмотр' : 'Редактирование'}</span>
                      <span className="font-mono text-[10px] opacity-50 truncate">{s.shareToken}</span>
                    </div>

                    <button
                      onClick={() => handleRevokeShare(s.shareToken)}
                      className="text-rose-400 hover:text-rose-300 font-mono text-[10px] px-1.5 py-0.5 rounded hover:bg-rose-500/10"
                      title="Отозвать ссылку"
                    >
                      Отозвать
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-xs opacity-60 flex items-center justify-between">
          <span>Гостям не требуется создавать пароль</span>
          <span>Горячая клавиша: ⌘⇧S</span>
        </div>
      </div>
    </div>
  );
};
