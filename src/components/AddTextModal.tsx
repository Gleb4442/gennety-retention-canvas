import React, { useState, useRef, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useBoardStore } from '../store/useBoardStore';
import { IconText } from './AbstractIcons';
import type { TextNodeColor } from '../types';

interface AddTextModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_OPTIONS: Array<{ id: TextNodeColor; label: string; color: string; ring: string }> = [
  { id: 'default', label: 'Стекло', color: '#71717A', ring: 'ring-zinc-400' },
  { id: 'amber', label: 'Янтарь', color: '#F59E0B', ring: 'ring-amber-500' },
  { id: 'emerald', label: 'Изумруд', color: '#10B981', ring: 'ring-emerald-500' },
  { id: 'blue', label: 'Лазурь', color: '#3B82F6', ring: 'ring-blue-500' },
  { id: 'rose', label: 'Коралл', color: '#F43F5E', ring: 'ring-rose-500' },
  { id: 'purple', label: 'Аметист', color: '#A855F7', ring: 'ring-purple-500' },
  { id: 'graphite', label: 'Графит', color: '#27272A', ring: 'ring-zinc-600' },
];

const FONT_SIZE_OPTIONS: Array<{ id: 'sm' | 'md' | 'lg' | 'xl'; label: string }> = [
  { id: 'sm', label: 'S (мелкий)' },
  { id: 'md', label: 'M (стандарт)' },
  { id: 'lg', label: 'L (крупный)' },
  { id: 'xl', label: 'XL (заголовочный)' },
];

export const AddTextModal: React.FC<AddTextModalProps> = ({ isOpen, onClose }) => {
  const addTextNode = useBoardStore((s) => s.addTextNode);
  const { screenToFlowPosition } = useReactFlow();

  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState<TextNodeColor>('default');
  const [selectedFontSize, setSelectedFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [keepOpen, setKeepOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() && !title.trim()) return;

    // Calculate viewport center
    const viewport = document.querySelector('.react-flow') as HTMLElement;
    const rect = viewport
      ? viewport.getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    const centerPos = screenToFlowPosition({
      x: rect.left + rect.width / 2 + (Math.random() * 80 - 40),
      y: rect.top + rect.height / 2 + (Math.random() * 80 - 40),
    });

    addTextNode(
      text.trim() || 'Заметка',
      { x: centerPos.x - 170, y: centerPos.y - 80 },
      title.trim() || undefined,
      selectedColor,
      selectedFontSize
    );

    setText('');
    setTitle('');

    if (!keepOpen) {
      onClose();
    } else {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg minimal-modal rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl liquid-pill flex items-center justify-center opacity-90 text-inherit">
              <IconText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm text-inherit">
                Добавить блок с текстом
              </h2>
              <p className="text-[11px] opacity-60 font-mono">
                Текстовая карточка или заметка на холст (без ограничений)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl liquid-pill opacity-70 hover:opacity-100 transition-opacity"
            title="Закрыть (Esc)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title Field (Optional) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider block">
              Заголовок блока (необязательно)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Ключевой инсайт, Задача или Вопрос..."
              className="w-full liquid-pill px-3.5 py-2 rounded-xl text-inherit placeholder-current placeholder-opacity-35 outline-none font-display font-medium text-xs"
            />
          </div>

          {/* Textarea */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider block">
              Текст блока *
            </label>
            <textarea
              ref={textareaRef}
              rows={6}
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Вставьте или введите любой текст..."
              className="w-full liquid-pill px-3.5 py-3 rounded-2xl text-inherit placeholder-current placeholder-opacity-35 outline-none font-sans text-xs leading-relaxed resize-y"
            />
          </div>

          {/* Color & Font Size Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Color Palette */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider block">
                Стиль / Оттенок
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedColor(opt.id)}
                    title={opt.label}
                    className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                      selectedColor === opt.id
                        ? `scale-110 ring-2 ${opt.ring} shadow-md`
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: opt.color }}
                  >
                    {selectedColor === opt.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider block">
                Размер шрифта
              </label>
              <select
                value={selectedFontSize}
                onChange={(e) => setSelectedFontSize(e.target.value as any)}
                className="w-full liquid-pill px-3 py-1.5 rounded-xl text-inherit outline-none text-xs font-mono cursor-pointer"
              >
                {FONT_SIZE_OPTIONS.map((f) => (
                  <option key={f.id} value={f.id} className="bg-zinc-900 text-white">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Keep open toggle */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs opacity-75 cursor-pointer hover:opacity-100 select-none">
              <input
                type="checkbox"
                checked={keepOpen}
                onChange={(e) => setKeepOpen(e.target.checked)}
                className="rounded border-zinc-500 text-blue-500 focus:ring-0"
              />
              <span>Добавить ещё один после создания</span>
            </label>
            <span className="text-[10px] font-mono opacity-50 hidden sm:inline">
              ⌘+Enter для добавления
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl liquid-pill opacity-75 hover:opacity-100 transition-opacity text-xs"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!text.trim() && !title.trim()}
              className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 ${
                text.trim() || title.trim()
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-95'
                  : 'opacity-40 cursor-not-allowed bg-zinc-500/20 text-inherit'
              }`}
            >
              Добавить на холст
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
