import React from 'react';
import { useBoardStore } from '../store/useBoardStore';
import type { DrawingTool } from '../types';

const COLOR_PALETTE = [
  { id: '#F4F4F6', label: 'Белый / Светлый', bg: '#F4F4F6' },
  { id: '#A1A1AA', label: 'Серый / Цинк', bg: '#A1A1AA' },
  { id: '#18181B', label: 'Чёрный / Графит', bg: '#18181B' },
  { id: '#881337', label: 'Бордовый', bg: '#881337' },
  { id: '#D97706', label: 'Тёплая охра', bg: '#D97706' },
  { id: '#78716C', label: 'Базальт / Камень', bg: '#78716C' },
];

const STROKE_WIDTHS = [
  { id: 2, label: 'Тонкий', px: '2px' },
  { id: 4, label: 'Средний', px: '4px' },
  { id: 8, label: 'Толстый', px: '8px' },
];

export const DrawingToolbar: React.FC = () => {
  const isDrawingMode = useBoardStore((s) => s.isDrawingMode);
  const setIsDrawingMode = useBoardStore((s) => s.setIsDrawingMode);
  const drawingTool = useBoardStore((s) => s.drawingTool);
  const setDrawingTool = useBoardStore((s) => s.setDrawingTool);
  const drawingColor = useBoardStore((s) => s.drawingColor);
  const setDrawingColor = useBoardStore((s) => s.setDrawingColor);
  const drawingWidth = useBoardStore((s) => s.drawingWidth);
  const setDrawingWidth = useBoardStore((s) => s.setDrawingWidth);
  const clearDrawings = useBoardStore((s) => s.clearDrawings);
  const drawings = useBoardStore((s) => s.drawings);

  if (!isDrawingMode) return null;

  const tools: { id: DrawingTool; label: string; icon: React.ReactNode }[] = [
    {
      id: 'select',
      label: 'Курсор (перемещение)',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 3 7 18 3-7 7-3L3 3z" />
          <path d="m13 13 6 6" />
        </svg>
      ),
    },
    {
      id: 'pen',
      label: 'Перо / Карандаш',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m18 2 4 4-12 12H6v-4L18 2z" />
          <line x1="14" y1="6" x2="18" y2="10" />
        </svg>
      ),
    },
    {
      id: 'highlighter',
      label: 'Маркер / Хайлайтер',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m9 11-6 6v3h3l6-6" />
          <path d="m22 7-3-3a2.83 2.83 0 0 0-4 0l-3 3 7 7 3-3a2.83 2.83 0 0 0 0-4z" />
        </svg>
      ),
    },
    {
      id: 'arrow',
      label: 'Стрелка от руки',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="19" x2="19" y2="5" />
          <polyline points="9 5 19 5 19 15" />
        </svg>
      ),
    },
    {
      id: 'eraser',
      label: 'Ластик (проведите по линии)',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
          <path d="M22 21H7" />
          <path d="m5 11 9 9" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 rounded-2xl liquid-glass shadow-2xl border border-black/15 dark:border-white/10 animate-in fade-in zoom-in-95 duration-150 select-none text-zinc-900 dark:text-zinc-100">
      {/* Tool Selector */}
      <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
        {tools.map((t) => {
          const isActive = drawingTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setDrawingTool(t.id)}
              className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm scale-105'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={t.label}
            >
              {t.icon}
            </button>
          );
        })}
      </div>

      <div className="w-[1px] h-5 bg-black/10 dark:bg-white/10 mx-0.5" />

      {/* Color Palette (disabled for eraser / select) */}
      {drawingTool !== 'eraser' && drawingTool !== 'select' && (
        <>
          <div className="flex items-center gap-1.5 px-1">
            {COLOR_PALETTE.map((c) => {
              const isSelected = drawingColor.toLowerCase() === c.id.toLowerCase();
              return (
                <button
                  key={c.id}
                  onClick={() => setDrawingColor(c.id)}
                  style={{ backgroundColor: c.bg }}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    isSelected
                      ? 'scale-125 ring-2 ring-zinc-900 dark:ring-white border-white/50'
                      : 'border-black/20 dark:border-white/20 hover:scale-110 opacity-80 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              );
            })}
          </div>

          <div className="w-[1px] h-5 bg-black/10 dark:bg-white/10 mx-0.5" />

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-0.5 rounded-xl">
            {STROKE_WIDTHS.map((w) => {
              const isSelected = drawingWidth === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => setDrawingWidth(w.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all ${
                    isSelected
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title={`Толщина: ${w.label} (${w.px})`}
                >
                  {w.px}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Clear Drawings Button */}
      {drawings.length > 0 && (
        <button
          onClick={() => {
            if (confirm('Очистить все нарисованные элементы на холсте?')) {
              clearDrawings();
            }
          }}
          className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title={`Стереть все штрихи (${drawings.length})`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}

      {/* Close Drawing Mode */}
      <button
        onClick={() => setIsDrawingMode(false)}
        className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        title="Завершить рисование"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};
