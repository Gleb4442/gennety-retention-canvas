import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { TextNodeData, TextNodeColor } from '../types';
import { useBoardStore } from '../store/useBoardStore';

const WIDTH_PRESETS = [
  { label: 'S', width: 240 },
  { label: 'M', width: 340 },
  { label: 'L', width: 480 },
  { label: 'XL', width: 640 },
];

const COLOR_CONFIG: Record<
  string,
  {
    cardClass: string;
    badgeBg: string;
    accentBorder: string;
  }
> = {
  default: {
    cardClass: 'liquid-glass border-black/10 dark:border-white/15 text-zinc-900 dark:text-zinc-100',
    badgeBg: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300',
    accentBorder: 'border-zinc-500/30',
  },
  amber: {
    cardClass: 'bg-amber-500/15 border-amber-500/35 text-amber-950 dark:text-amber-100 shadow-amber-500/10 backdrop-blur-xl',
    badgeBg: 'bg-amber-500/25 text-amber-900 dark:text-amber-200',
    accentBorder: 'border-amber-500/40',
  },
  emerald: {
    cardClass: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-950 dark:text-emerald-100 shadow-emerald-500/10 backdrop-blur-xl',
    badgeBg: 'bg-emerald-500/25 text-emerald-900 dark:text-emerald-200',
    accentBorder: 'border-emerald-500/40',
  },
  blue: {
    cardClass: 'bg-blue-500/15 border-blue-500/35 text-blue-950 dark:text-blue-100 shadow-blue-500/10 backdrop-blur-xl',
    badgeBg: 'bg-blue-500/25 text-blue-900 dark:text-blue-200',
    accentBorder: 'border-blue-500/40',
  },
  rose: {
    cardClass: 'bg-rose-500/15 border-rose-500/35 text-rose-950 dark:text-rose-100 shadow-rose-500/10 backdrop-blur-xl',
    badgeBg: 'bg-rose-500/25 text-rose-900 dark:text-rose-200',
    accentBorder: 'border-rose-500/40',
  },
  purple: {
    cardClass: 'bg-purple-500/15 border-purple-500/35 text-purple-950 dark:text-purple-100 shadow-purple-500/10 backdrop-blur-xl',
    badgeBg: 'bg-purple-500/25 text-purple-900 dark:text-purple-200',
    accentBorder: 'border-purple-500/40',
  },
  graphite: {
    cardClass: 'bg-zinc-900/90 border-zinc-700/60 text-zinc-100 shadow-2xl backdrop-blur-xl',
    badgeBg: 'bg-zinc-800 text-zinc-300',
    accentBorder: 'border-zinc-600/50',
  },
};

const COLOR_CYCLE: TextNodeColor[] = [
  'default',
  'amber',
  'emerald',
  'blue',
  'rose',
  'purple',
  'graphite',
];

const FONT_SIZES: Record<string, string> = {
  sm: 'text-xs leading-relaxed',
  md: 'text-sm leading-relaxed',
  lg: 'text-base leading-relaxed',
  xl: 'text-lg leading-relaxed',
};

export const TextNode = memo(({ id, data, selected }: NodeProps & { data: TextNodeData }) => {
  const deleteNode = useBoardStore((s) => s.deleteNode);
  const duplicateNode = useBoardStore((s) => s.duplicateNode);
  const updateNode = useBoardStore((s) => s.updateNode);
  const setSelectedNodeId = useBoardStore((s) => s.setSelectedNodeId);
  const isViewerMode = useBoardStore((s) => s.isViewerMode);
  const peerSelecting = useBoardStore((s) => s.collabSelections[id]);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.text || '');
  const [editTitle, setEditTitle] = useState(data.title || '');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentWidth = data.width || 340;
  const currentColor = data.color || 'default';
  const colorScheme = COLOR_CONFIG[currentColor] || COLOR_CONFIG.default;
  const currentFontSize = data.fontSize || 'md';
  const fontClass = FONT_SIZES[currentFontSize] || FONT_SIZES.md;

  // Auto-resize textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(80, textareaRef.current.scrollHeight)}px`;
    }
  }, [isEditing, editText]);

  const handleCycleWidth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = WIDTH_PRESETS.findIndex((p) => p.width === currentWidth);
    const nextIdx = (currentIdx + 1) % WIDTH_PRESETS.length;
    updateNode(id, { width: WIDTH_PRESETS[nextIdx].width });
  };

  const handleCycleColor = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = COLOR_CYCLE.indexOf((currentColor as TextNodeColor) || 'default');
    const nextColor = COLOR_CYCLE[(currentIdx + 1) % COLOR_CYCLE.length];
    updateNode(id, { color: nextColor });
  };

  const handleCycleFontSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl'];
    const currentIdx = sizes.indexOf(currentFontSize as 'sm' | 'md' | 'lg' | 'xl');
    const nextSize = sizes[(currentIdx + 1) % sizes.length];
    updateNode(id, { fontSize: nextSize });
  };

  const handleStartEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isViewerMode) return;
    setEditText(data.text || '');
    setEditTitle(data.title || '');
    setIsEditing(true);
    setSelectedNodeId(id);
  };

  const handleSaveEdit = () => {
    updateNode(id, {
      text: editText,
      title: editTitle.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(data.text || '');
    setEditTitle(data.title || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <div
      style={{ width: `${currentWidth}px` }}
      onClick={() => setSelectedNodeId(id)}
      onDoubleClick={handleStartEdit}
      className={`group relative rounded-2xl transition-all duration-150 select-none border ${
        colorScheme.cardClass
      } p-4 ${
        selected
          ? 'scale-[1.01] shadow-2xl ring-2 ring-zinc-900 dark:ring-white/80'
          : 'hover:-translate-y-0.5 hover:shadow-xl'
      }`}
    >
      {/* Remote Peer Selection Indicator */}
      {peerSelecting && (
        <div
          className="absolute -top-6 left-3 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide shadow-md whitespace-nowrap select-none backdrop-blur-md border border-white/20 text-white flex items-center gap-1 z-30 animate-pulse"
          style={{ backgroundColor: peerSelecting.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>{peerSelecting.userName} редактирует</span>
        </div>
      )}

      {/* Specular Top Reflection / Liquid Light Arc */}
      <div 
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl pointer-events-none opacity-50"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
        }}
      />

      {/* Floating Action Menu on hover / select */}
      {!isViewerMode && (
        <div className="absolute -top-10 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-zinc-900/95 dark:bg-black/95 text-white backdrop-blur-md px-2 py-1 rounded-xl shadow-xl z-20 text-[11px] font-mono border border-white/15">
          <button
            onClick={handleStartEdit}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            title="Редактировать текст (Двойной клик)"
          >
            ✎
          </button>
          <button
            onClick={handleCycleColor}
            className="px-1.5 py-0.5 rounded hover:bg-white/20 transition-colors flex items-center gap-1"
            title="Сменить цвет заметки"
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/40"
              style={{
                backgroundColor:
                  currentColor === 'amber'
                    ? '#F59E0B'
                    : currentColor === 'emerald'
                    ? '#10B981'
                    : currentColor === 'blue'
                    ? '#3B82F6'
                    : currentColor === 'rose'
                    ? '#F43F5E'
                    : currentColor === 'purple'
                    ? '#A855F7'
                    : currentColor === 'graphite'
                    ? '#27272A'
                    : '#71717A',
              }}
            />
          </button>
          <button
            onClick={handleCycleFontSize}
            className="px-1.5 py-0.5 rounded hover:bg-white/20 font-bold transition-colors"
            title="Размер шрифта (sm/md/lg/xl)"
          >
            {currentFontSize.toUpperCase()}
          </button>
          <button
            onClick={handleCycleWidth}
            className="px-1.5 py-0.5 rounded hover:bg-white/20 font-bold transition-colors"
            title="Ширина блока"
          >
            {WIDTH_PRESETS.find((p) => p.width === currentWidth)?.label || 'M'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateNode(id);
            }}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            title="Дублировать (Cmd+D)"
          >
            📋
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(id);
            }}
            className="p-1 rounded hover:bg-rose-500/30 text-rose-300 hover:text-rose-100 transition-colors"
            title="Удалить блок"
          >
            ✕
          </button>
        </div>
      )}

      {/* Content Area */}
      {isEditing ? (
        <div 
          className="space-y-2.5 cursor-default"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Заголовок блока (необязательно)..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-black/10 dark:bg-white/10 font-display font-bold text-xs border border-current/15 outline-none text-inherit placeholder-current placeholder-opacity-40"
          />
          <textarea
            ref={textareaRef}
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите текст..."
            rows={4}
            className={`w-full px-2.5 py-2 rounded-lg bg-black/10 dark:bg-white/10 ${fontClass} border border-current/15 outline-none resize-y text-inherit placeholder-current placeholder-opacity-40 font-sans`}
          />
          <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
            <span className="opacity-50 text-[10px]">⌘+Enter для сохранения</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-2.5 py-1 rounded-lg liquid-pill opacity-75 hover:opacity-100 transition-opacity"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3 py-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="cursor-text group/text">
          {/* Header pill / badge & Title */}
          {data.title && (
            <div className="mb-2">
              <h4 className="font-display font-bold text-[14px] leading-snug tracking-tight text-inherit opacity-95">
                {data.title}
              </h4>
            </div>
          )}

          {/* Body Text */}
          <div
            className={`font-sans ${fontClass} whitespace-pre-wrap break-words opacity-90 select-text`}
          >
            {data.text || (
              <span className="opacity-40 italic text-xs">
                Пустой текстовый блок. Нажмите дважды для редактирования...
              </span>
            )}
          </div>

          {/* Bottom subtle hint on hover */}
          <div className="mt-3 pt-2 border-t border-current/10 flex items-center justify-between text-[10px] font-mono opacity-40 group-hover/text:opacity-70 transition-opacity">
            <span>Текстовый блок</span>
            <span>{data.text ? `${data.text.trim().split(/\s+/).filter(Boolean).length} сл.` : '2× клик'}</span>
          </div>
        </div>
      )}

      {/* Connection Handles (Top, Right, Bottom, Left) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-zinc-800 dark:!bg-white !opacity-60 hover:!opacity-100 !border-0 !shadow-md !-top-1.5"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-zinc-800 dark:!bg-white !opacity-60 hover:!opacity-100 !border-0 !shadow-md !-bottom-1.5"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-zinc-800 dark:!bg-white !opacity-60 hover:!opacity-100 !border-0 !shadow-md !-left-1.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-zinc-800 dark:!bg-white !opacity-60 hover:!opacity-100 !border-0 !shadow-md !-right-1.5"
      />
    </div>
  );
});

TextNode.displayName = 'TextNode';
