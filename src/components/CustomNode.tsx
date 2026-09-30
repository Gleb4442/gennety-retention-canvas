import React, { memo, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { 
  IconFoundation, 
  IconPsychology, 
  IconHardware, 
  IconRetention, 
  IconEventDuality, 
  IconLifecycle, 
  IconOutcome, 
  IconCustomNode,
} from './AbstractIcons';
import type { StrategyNodeData } from '../types';
import { CATEGORIES } from '../constants/categories';
import { useBoardStore } from '../store/useBoardStore';
import { compressImageFile } from '../utils/imageCompressor';

const ABSTRACT_ICON_MAP: Record<string, React.ElementType> = {
  foundation: IconFoundation,
  psychology: IconPsychology,
  hardware: IconHardware,
  retention: IconRetention,
  event: IconEventDuality,
  lifecycle: IconLifecycle,
  outcome: IconOutcome,
  custom: IconCustomNode,
};

export const CustomNode = memo(({ id, data, selected }: NodeProps & { data: StrategyNodeData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOverCard, setIsDragOverCard] = useState(false);

  const duplicateNode = useBoardStore((s) => s.duplicateNode);
  const deleteNode = useBoardStore((s) => s.deleteNode);
  const updateNode = useBoardStore((s) => s.updateNode);
  const setSelectedNodeId = useBoardStore((s) => s.setSelectedNodeId);
  const openLightbox = useBoardStore((s) => s.openLightbox);
  const peerSelecting = useBoardStore((s) => s.collabSelections[id]);
  const isViewerMode = useBoardStore((s) => s.isViewerMode);

  const categoryDef = CATEGORIES[data.category] || CATEGORIES.custom;
  const AbstractIcon = ABSTRACT_ICON_MAP[data.category] || IconCustomNode;

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateNode(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(id);
  };

  const handlePhotoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const compressed = await compressImageFile(file, 1400, 0.85);
      updateNode(id, { imageUrl: compressed });
    } catch (err) {
      console.error('Failed to compress image:', err);
      alert('Не удалось загрузить изображение.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOverCard(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCard(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCard(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        setIsUploading(true);
        const compressed = await compressImageFile(file, 1400, 0.85);
        updateNode(id, { imageUrl: compressed });
      } catch (err) {
        console.error('Failed to process dropped image:', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div
      className={`group relative w-[340px] rounded-3xl transition-all duration-200 select-none liquid-glass ${
        selected
          ? 'scale-[1.015] shadow-2xl ring-0 ring-offset-0'
          : 'hover:-translate-y-1 hover:shadow-2xl'
      } ${isDragOverCard ? 'ring-2 ring-white/60 scale-[1.02]' : ''}`}
      style={{
        boxShadow: peerSelecting
          ? `0 0 0 2px ${peerSelecting.color}, 0 0 24px ${peerSelecting.color}66`
          : selected
          ? '0 32px 70px -15px rgba(0,0,0,0.8), 0 0 0 1.5px rgba(255,255,255,0.45), 0 0 35px rgba(255,255,255,0.06)'
          : undefined,
      }}
      onClick={() => setSelectedNodeId(id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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

      {/* Hidden file input for photo attachment */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        className="hidden"
      />

      {/* Specular Top Reflection / Liquid Light Arc */}
      <div 
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl pointer-events-none opacity-60"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
        }}
      />

      {/* Floating Action Menu on hover / select */}
      {!isViewerMode && (
        <div className="absolute -top-10 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 liquid-pill px-2 py-1 rounded-xl shadow-lg z-20">
          <button
            onClick={handlePhotoClick}
            disabled={isUploading}
            title={data.imageUrl ? "Заменить фото карточки" : "Прикрепить фото к карточке"}
            className="p-1 rounded-lg hover:bg-white/15 text-inherit opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </button>
          <button
            onClick={handleEdit}
            title="Редактировать"
            className="p-1 rounded-lg hover:bg-white/15 text-inherit opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
          <button
            onClick={handleDuplicate}
            title="Дублировать (Cmd+D)"
            className="p-1 rounded-lg hover:bg-white/15 text-inherit opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            title="Удалить карточку"
            className="p-1 rounded-lg hover:bg-rose-500/20 hover:text-rose-400 opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>
      )}

      <div className="p-5 flex flex-col gap-3.5">
        {/* Header: Neutral Abstract Icon & Minimalist Pill Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {/* Minimalist Abstract Filled Icon in Neutral Pebble */}
            <div className="w-7 h-7 rounded-xl liquid-pill flex items-center justify-center text-inherit opacity-90 shadow-sm">
              <AbstractIcon className="w-4 h-4" />
            </div>

            {/* Minimalist Monospace Badge */}
            <span className="font-mono text-[10px] tracking-wider uppercase font-semibold px-2.5 py-1 rounded-lg liquid-pill text-inherit opacity-90">
              {data.badge || categoryDef.badgeDefault}
            </span>
          </div>

          <span className="text-[10px] font-mono opacity-60 tracking-wider uppercase font-medium">
            {categoryDef.neutralTag}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-display font-bold text-[15px] leading-snug tracking-tight text-inherit opacity-95 group-hover:opacity-100 transition-opacity">
          {data.title}
        </h3>

        {/* Attached Photo Banner */}
        {data.imageUrl && (
          <div 
            className="relative w-full h-40 rounded-2xl overflow-hidden group/img cursor-pointer bg-black/20 shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              openLightbox(data.imageUrl!, data.title);
            }}
            title="Кликните для полноэкранного просмотра"
          >
            <img
              src={data.imageUrl}
              alt={data.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
            
            {/* Image actions on hover */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="p-1 rounded-lg bg-black/70 text-white hover:bg-black/90 transition-colors shadow"
                title="Заменить фото"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateNode(id, { imageUrl: undefined });
                }}
                className="p-1 rounded-lg bg-black/70 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors shadow"
                title="Удалить фото"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                </svg>
              </button>
            </div>

            <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <span>Открыть фото</span>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="text-[13px] leading-relaxed opacity-85 whitespace-pre-line space-y-1 font-sans font-medium">
          {data.description}
        </div>

        {/* Key Metric Highlight - Frameless Inset */}
        {data.keyMetric && (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/[0.04] dark:bg-white/[0.04] text-xs leading-relaxed opacity-95">
            <span className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 flex-shrink-0 opacity-60" />
            <div>
              <span className="font-semibold opacity-100">Цель: </span>
              <span className="opacity-80 font-normal">{data.keyMetric}</span>
            </div>
          </div>
        )}

        {/* Strategic Outcome Highlight - Frameless Inset */}
        {data.outcome && (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/[0.04] dark:bg-white/[0.04] text-xs leading-relaxed opacity-95">
            <span className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 flex-shrink-0 opacity-60" />
            <div>
              <span className="font-semibold opacity-100">Результат: </span>
              <span className="opacity-80 font-normal">{data.outcome}</span>
            </div>
          </div>
        )}

      </div>

      {/* React Flow Connection Handles (Top, Right, Bottom, Left) */}
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

CustomNode.displayName = 'CustomNode';
