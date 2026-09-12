import React, { useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { isOwnerAccessKey } from '../lib/projectStorage';
import type { ProjectTemplate } from '../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImportJson?: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ 
  isOpen, 
  onClose,
  onOpenImportJson,
}) => {
  const accessKey = useBoardStore((s) => s.accessKey);
  const isOwner = isOwnerAccessKey(accessKey || '');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState<ProjectTemplate>(isOwner ? 'blueprint' : 'blank');

  const createProject = useBoardStore((s) => s.createProject);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isBlueprintSelected = template === 'blueprint' && isOwner;
    const finalTitle = title.trim() || (isBlueprintSelected ? 'Retention Strategy Project' : 'Новый холст');
    createProject(finalTitle, isBlueprintSelected ? 'blueprint' : 'blank', description.trim());
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div 
        className="relative w-full max-w-lg p-6 rounded-3xl liquid-glass shadow-2xl z-10 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-zinc-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-bold text-lg text-zinc-900 dark:text-white">
              Создать Canvas-проект
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              {isOwner ? 'Выберите начальный шаблон или начните с чистого листа' : 'Создайте новый рабочий холст'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl liquid-pill text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors border border-black/5 dark:border-white/5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Selection - only shown if Owner */}
          {isOwner && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTemplate('blueprint')}
                className={`p-3.5 rounded-2xl text-left transition-all border ${
                  template === 'blueprint'
                    ? 'bg-zinc-200/90 dark:bg-white/15 border-zinc-900 dark:border-white shadow-md ring-1 ring-zinc-900/20 dark:ring-white/20'
                    : 'bg-white/80 dark:bg-white/[0.04] border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-rose-500">⚡</span>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-white">Retention Blueprint</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                  Мастер-шаблон Gennety: циклы возврата, психология и аппаратные триггеры.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('blank')}
                className={`p-3.5 rounded-2xl text-left transition-all border ${
                  template === 'blank'
                    ? 'bg-zinc-200/90 dark:bg-white/15 border-zinc-900 dark:border-white shadow-md ring-1 ring-zinc-900/20 dark:ring-white/20'
                    : 'bg-white/80 dark:bg-white/[0.04] border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-zinc-500">◻️</span>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-white">Чистый холст</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                  Пустое рабочее пространство для моделирования собственной стратегии.
                </p>
              </button>
            </div>
          )}

          {/* Project Title */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Название проекта
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Новая воронка онбординга"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-white/[0.06] text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white/30 font-sans shadow-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Описание / Цель схемы (необязательно)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание гипотезы или целей проекта..."
              rows={2}
              className="w-full px-4 py-2 rounded-xl bg-white dark:bg-white/[0.06] text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-white/30 font-sans resize-none shadow-sm"
            />
          </div>

          {/* Quick Import from JSON / AI Sketch */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenImportJson?.();
            }}
            className="w-full p-3 rounded-2xl bg-zinc-100/80 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/20 text-left flex items-center justify-between transition-all group hover:bg-zinc-200/60 dark:hover:bg-white/[0.08] shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 border border-black/5 dark:border-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-300 group-hover:scale-110 transition-transform shadow-xs">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-white transition-colors">
                  Импортировать по коду JSON или скетчу А4
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Вставить JSON от ChatGPT / Claude или загрузить файл
                </div>
              </div>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white font-mono">→</span>
          </button>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors border border-black/5 dark:border-white/5"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 font-semibold text-xs tracking-wide transition-all hover:scale-105 shadow-sm"
            >
              Создать проект
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
