import React, { useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { isOwnerAccessKey } from '../lib/projectStorage';
import type { ProjectTemplate } from '../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
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
        className="relative w-full max-w-lg p-6 rounded-3xl liquid-glass shadow-2xl z-10 border border-white/10 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-bold text-lg text-white">
              Создать Canvas-проект
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              {isOwner ? 'Выберите начальный шаблон или начните с чистого листа' : 'Создайте новый рабочий холст'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl liquid-pill text-zinc-400 hover:text-white transition-colors"
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
                    ? 'liquid-pill-active border-cyan-400/50 shadow-lg ring-1 ring-cyan-400/30'
                    : 'liquid-pill border-white/5 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-cyan-400">⚡</span>
                  <span className="font-medium text-xs text-white">Retention Blueprint</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Мастер-шаблон Gennety: циклы возврата, психология и аппаратные триггеры.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('blank')}
                className={`p-3.5 rounded-2xl text-left transition-all border ${
                  template === 'blank'
                    ? 'liquid-pill-active border-cyan-400/50 shadow-lg ring-1 ring-cyan-400/30'
                    : 'liquid-pill border-white/5 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-emerald-400">◻️</span>
                  <span className="font-medium text-xs text-white">Чистый холст</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Пустое рабочее пространство для моделирования собственной стратегии.
                </p>
              </button>
            </div>
          )}

          {/* Project Title */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              Название проекта
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Новая воронка онбординга"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl liquid-pill text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 font-sans"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              Описание / Цель схемы (необязательно)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание гипотезы или целей проекта..."
              rows={2}
              className="w-full px-4 py-2 rounded-xl liquid-pill text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 font-sans resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl liquid-pill text-xs font-mono text-zinc-400 hover:text-white transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl liquid-pill-active font-semibold text-xs text-white tracking-wide transition-all hover:scale-105"
            >
              Создать проект
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
