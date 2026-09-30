import React, { memo, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ImageNodeData } from '../types';
import { useBoardStore } from '../store/useBoardStore';
import { compressImageFile } from '../utils/imageCompressor';

const SIZE_PRESETS = [
  { label: 'S', width: 220 },
  { label: 'M', width: 340 },
  { label: 'L', width: 480 },
  { label: 'XL', width: 680 },
];

export const ImageNode = memo(({ id, data, selected }: NodeProps & { data: ImageNodeData }) => {
  const deleteNode = useBoardStore((s) => s.deleteNode);
  const duplicateNode = useBoardStore((s) => s.duplicateNode);
  const updateNode = useBoardStore((s) => s.updateNode);
  const setSelectedNodeId = useBoardStore((s) => s.setSelectedNodeId);
  const openLightbox = useBoardStore((s) => s.openLightbox);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionInput, setCaptionInput] = useState(data.caption || data.title || '');

  const currentWidth = data.width || 340;

  const handleCycleSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = SIZE_PRESETS.findIndex((p) => p.width === currentWidth);
    const nextIdx = (currentIdx + 1) % SIZE_PRESETS.length;
    updateNode(id, { width: SIZE_PRESETS[nextIdx].width });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      updateNode(id, { imageUrl: compressed });
    } catch (err) {
      console.error('Failed to update image', err);
    }
  };

  const handleSaveCaption = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateNode(id, { caption: captionInput.trim(), title: captionInput.trim() });
    setIsEditingCaption(false);
  };

  return (
    <div
      style={{
        width: `${currentWidth}px`,
        boxShadow: selected
          ? '0 32px 70px -15px rgba(0,0,0,0.8), 0 0 0 1.5px rgba(255,255,255,0.4), 0 0 35px rgba(255,255,255,0.06)'
          : undefined,
      }}
      onClick={() => setSelectedNodeId(id)}
      className={`group relative rounded-3xl transition-all duration-200 select-none liquid-glass p-2.5 ${
        selected
          ? 'scale-[1.015] shadow-2xl ring-0 ring-offset-0'
          : 'hover:-translate-y-1 hover:shadow-2xl'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Floating Action Menu on hover / select */}
      <div className="absolute -top-11 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 liquid-glass px-2.5 py-1 rounded-2xl shadow-xl z-20 text-[11px] font-mono">
        <button
          onClick={(e) => {
            e.stopPropagation();
            openLightbox(data.imageUrl, data.title || data.caption);
          }}
          className="p-1 rounded hover:bg-white/20 transition-colors"
          title="Открыть на весь экран"
        >
          🔍
        </button>
        <button
          onClick={handleCycleSize}
          className="px-1.5 py-0.5 rounded hover:bg-white/20 font-bold transition-colors"
          title="Изменить размер карточки"
        >
          {SIZE_PRESETS.find((p) => p.width === currentWidth)?.label || 'M'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="p-1 rounded hover:bg-white/20 transition-colors"
          title="Заменить фото"
        >
          🔄
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
          title="Удалить фото"
        >
          ✕
        </button>
      </div>

      {/* Image View */}
      <div 
        className="relative w-full rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 shadow-sm cursor-zoom-in group/inner"
        onClick={(e) => {
          e.stopPropagation();
          openLightbox(data.imageUrl, data.title || data.caption);
        }}
      >
        <img
          src={data.imageUrl}
          alt={data.title || data.caption || 'Изображение на холсте'}
          className="w-full h-auto max-h-[520px] object-contain block transition-transform duration-200 group-hover/inner:scale-[1.01]"
          loading="lazy"
        />

        {/* Hover zoom hint overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/inner:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono">
            🔍 Клик для увеличения
          </span>
        </div>
      </div>

      {/* Caption / Title */}
      <div className="mt-2 px-1">
        {isEditingCaption ? (
          <form onSubmit={handleSaveCaption} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              placeholder="Подпись к фото..."
              className="w-full px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/10 text-xs text-zinc-900 dark:text-white border border-black/10 dark:border-white/15 outline-none font-sans"
            />
            <button
              type="submit"
              className="px-2 py-1 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[10px] font-medium"
            >
              OK
            </button>
          </form>
        ) : (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditingCaption(true);
            }}
            className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 font-sans cursor-text group/caption py-0.5"
            title="Двойной клик для изменения подписи"
          >
            <span className="truncate font-medium">
              {data.caption || data.title || (
                <span className="text-zinc-400 dark:text-zinc-500 italic text-[11px]">
                  Добавить подпись (двойной клик)...
                </span>
              )}
            </span>
            <span className="opacity-0 group-hover/caption:opacity-60 text-[10px] font-mono ml-1">✎</span>
          </div>
        )}
      </div>

      {/* Connection Handles (Top, Right, Bottom, Left) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-white/40 hover:!bg-white !opacity-40 hover:!opacity-100 !border-0 !shadow-sm !-top-1 transition-all duration-150"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-white/40 hover:!bg-white !opacity-40 hover:!opacity-100 !border-0 !shadow-sm !-bottom-1 transition-all duration-150"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2 !h-2 !bg-white/40 hover:!bg-white !opacity-40 hover:!opacity-100 !border-0 !shadow-sm !-left-1 transition-all duration-150"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2 !h-2 !bg-white/40 hover:!bg-white !opacity-40 hover:!opacity-100 !border-0 !shadow-sm !-right-1 transition-all duration-150"
      />
    </div>
  );
});

ImageNode.displayName = 'ImageNode';
