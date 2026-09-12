import React, { useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { CATEGORIES } from '../constants/categories';
import type { CategoryType } from '../types';
import { 
  IconFoundation, 
  IconPsychology, 
  IconHardware, 
  IconRetention, 
  IconEventDuality, 
  IconLifecycle, 
  IconOutcome, 
  IconCustomNode,
  IconAdd,
} from './AbstractIcons';

const ABSTRACT_ICONS: Record<string, React.ElementType> = {
  foundation: IconFoundation,
  psychology: IconPsychology,
  hardware: IconHardware,
  retention: IconRetention,
  event: IconEventDuality,
  lifecycle: IconLifecycle,
  outcome: IconOutcome,
  custom: IconCustomNode,
};

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({ isOpen, onClose }) => {
  const addNode = useBoardStore((s) => s.addNode);

  const [category, setCategory] = useState<CategoryType>('foundation');
  const [title, setTitle] = useState('');
  const [badge, setBadge] = useState('Paradigm Shift');
  const [description, setDescription] = useState('');
  const [keyMetric, setKeyMetric] = useState('');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleCategoryChange = (cat: CategoryType) => {
    setCategory(cat);
    setBadge(CATEGORIES[cat].badgeDefault);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addNode({
      category,
      title: title.trim(),
      badge: badge.trim() || CATEGORIES[category].badgeDefault,
      description: description.trim() || 'Описание механизма...',
      keyMetric: keyMetric.trim() || undefined,
      outcome: outcome.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: [CATEGORIES[category].neutralTag],
    });

    onClose();
    setTitle('');
    setDescription('');
    setKeyMetric('');
    setOutcome('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xl animate-in fade-in select-none">
      <div 
        className="w-full max-w-lg liquid-glass rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-current/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl liquid-pill flex items-center justify-center opacity-90">
              <IconAdd className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm text-inherit">
                Новый Стратегический Блок
              </h2>
              <p className="text-[11px] opacity-60 font-mono">
                Добавление узла в архитектуру Gennety Canvas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl liquid-pill opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Category selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
              Выберите Категорию
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(CATEGORIES).map((cat) => {
                const isSelected = category === cat.id;
                const CatIcon = ABSTRACT_ICONS[cat.id] || IconCustomNode;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`px-3 py-2 rounded-xl text-left flex flex-col gap-1 transition-all ${
                      isSelected
                        ? 'liquid-pill-active font-semibold shadow-md'
                        : 'liquid-pill opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CatIcon className="w-3.5 h-3.5 opacity-90" />
                      <span className="font-medium text-[11px] truncate">{cat.label}</span>
                    </div>
                    <span className="font-mono text-[9px] opacity-50 truncate">{cat.badgeDefault}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title and Badge row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Название карточки *
              </label>
              <input
                type="text"
                required
                placeholder="например: МЕХАНИКА АБОНЕМЕНТА..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit font-semibold outline-none text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Метка (Badge)
              </label>
              <input
                type="text"
                placeholder="Retention Tool"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit font-mono outline-none text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
              Суть и логика блока
            </label>
            <textarea
              rows={3}
              placeholder="Детальное описание бизнес-логики, каналов доставки..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none resize-none leading-relaxed text-xs"
            />
          </div>

          {/* Key Metric & Outcome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Целевая метрика (Key Metric)
              </label>
              <input
                type="text"
                placeholder="Top-1 Retention, LTV..."
                value={keyMetric}
                onChange={(e) => setKeyMetric(e.target.value)}
                className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Результат (Outcome)
              </label>
              <input
                type="text"
                placeholder="Эмоция избранности..."
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none text-xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-current/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl liquid-pill opacity-75 hover:opacity-100 transition-opacity font-medium text-xs"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl liquid-pill-active font-semibold transition-all hover:scale-105 text-xs shadow-lg"
            >
              Добавить на холст
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
