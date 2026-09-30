import React, { useState, useRef } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
} from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { useBoardStore } from '../store/useBoardStore';
import type { StrategyEdgeData, EdgeLabelSize } from '../types';
import { compressImageFile } from '../utils/imageCompressor';

const LABEL_SIZES: Record<EdgeLabelSize, { text: string; pill: string }> = {
  sm: { text: 'text-[10px]', pill: 'px-3 py-1' },
  md: { text: 'text-xs font-medium', pill: 'px-3.5 py-1.5' },
  lg: { text: 'text-sm font-semibold', pill: 'px-4 py-2' },
  xl: { text: 'text-base font-bold', pill: 'px-5 py-2.5' },
};

export const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
}: EdgeProps & { data?: StrategyEdgeData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateEdge = useBoardStore((s) => s.updateEdge);
  const deleteEdge = useBoardStore((s) => s.deleteEdge);
  const setSelectedEdgeId = useBoardStore((s) => s.setSelectedEdgeId);
  const openLightbox = useBoardStore((s) => s.openLightbox);

  const [isEditing, setIsEditing] = useState(false);
  const [tempLabel, setTempLabel] = useState(data?.label || '');

  const styleType = data?.styleType || 'bezier';
  const labelSize: EdgeLabelSize = data?.labelSize || 'sm';
  const currentSizeConfig = LABEL_SIZES[labelSize] || LABEL_SIZES.sm;

  let edgePath = '';
  let labelX = 0;
  let labelY = 0;

  if (styleType === 'smoothstep') {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 16,
    });
  } else {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }

  const handleSaveLabel = (e: React.FormEvent) => {
    e.stopPropagation();
    updateEdge(id, { label: tempLabel.trim() });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveLabel(e);
    } else if (e.key === 'Escape') {
      setTempLabel(data?.label || '');
      setIsEditing(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 1200, 0.85);
      updateEdge(id, { imageUrl: compressed });
    } catch (err) {
      console.error('Failed to compress edge image:', err);
      alert('Не удалось загрузить фото связи.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          strokeDasharray: data?.animated ? '5 5' : undefined,
        }}
      />

      <EdgeLabelRenderer>
        {/* Hidden file input for edge image */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/*"
          className="hidden pointer-events-auto"
        />

        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {isEditing ? (
            <div 
              className="flex items-center gap-1.5 edge-solid-pill px-3 py-1.5 rounded-xl shadow-2xl z-30"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                autoFocus
                value={tempLabel}
                onChange={(e) => setTempLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Связь..."
                className="bg-transparent text-inherit font-mono text-[11px] outline-none w-32 pb-0.5 border-b border-current opacity-90"
              />
              <button
                onClick={handleSaveLabel}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-inherit"
                title="Сохранить"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setTempLabel(data?.label || '');
                  setIsEditing(false);
                }}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-inherit opacity-70"
                title="Отмена"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                </svg>
              </button>
            </div>
          ) : (
            <div
              className={`group flex items-center gap-1.5 ${currentSizeConfig.pill} rounded-full cursor-pointer select-none edge-solid-pill ${
                selected
                  ? 'edge-solid-pill-selected scale-105'
                  : 'hover:scale-105'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEdgeId(id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title="Двойной клик — редактировать название"
            >
              {/* Optional Image Thumbnail in Edge Pill */}
              {data?.imageUrl && (
                <div 
                  className="relative group/edgimg w-5 h-5 rounded-md overflow-hidden flex-shrink-0 cursor-pointer shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(data.imageUrl!, data?.label || 'Связь');
                  }}
                  title="Кликните для просмотра фото"
                >
                  <img src={data.imageUrl} alt={data.label || 'Связь'} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/edgimg:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                  </div>
                </div>
              )}

              <span className={`font-mono ${currentSizeConfig.text} tracking-tight whitespace-nowrap opacity-90`}>
                {data?.label || 'связь'}
              </span>

              {/* Quick action buttons on hover */}
              <div className="hidden group-hover:flex items-center gap-1 ml-1 pl-1.5 opacity-70">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const cycle: EdgeLabelSize[] = ['sm', 'md', 'lg', 'xl'];
                    const nextIdx = (cycle.indexOf(labelSize) + 1) % cycle.length;
                    updateEdge(id, { labelSize: cycle[nextIdx] });
                  }}
                  className="px-1 py-0.5 rounded text-[9px] font-mono hover:bg-white/15 hover:opacity-100 transition-colors uppercase"
                  title={`Размер заголовка: ${labelSize.toUpperCase()} (нажмите для переключения)`}
                >
                  {labelSize.toUpperCase()}
                </button>

                {/* Attach / Change Photo button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="p-0.5 hover:opacity-100 transition-opacity"
                  title={data?.imageUrl ? "Заменить фото связи" : "Прикрепить фото к связи"}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                </button>

                {/* Remove photo button if image attached */}
                {data?.imageUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateEdge(id, { imageUrl: undefined });
                    }}
                    className="p-0.5 hover:text-rose-400 transition-colors"
                    title="Удалить фото связи"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                    </svg>
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="p-0.5 hover:opacity-100 transition-opacity"
                  title="Изменить название"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEdge(id);
                  }}
                  className="p-0.5 hover:text-rose-400 transition-colors"
                  title="Удалить связь"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
