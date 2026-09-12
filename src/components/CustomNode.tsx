import React, { memo } from 'react';
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
  const duplicateNode = useBoardStore((s) => s.duplicateNode);
  const deleteNode = useBoardStore((s) => s.deleteNode);
  const setSelectedNodeId = useBoardStore((s) => s.setSelectedNodeId);

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

  return (
    <div
      className={`group relative w-[340px] rounded-2xl transition-shadow duration-150 select-none liquid-glass ${
        selected
          ? 'scale-[1.02] shadow-2xl ring-0 ring-offset-0'
          : 'hover:-translate-y-1'
      }`}
      style={{
        boxShadow: selected
          ? '0 30px 60px -15px rgba(0,0,0,0.55), inset 0 1px 2px 0 rgba(255,255,255,0.3), 0 0 0 1.5px var(--text-primary)'
          : undefined,
      }}
      onClick={() => setSelectedNodeId(id)}
    >
      {/* Specular Top Reflection / Liquid Light Arc */}
      <div 
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl pointer-events-none opacity-60"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
        }}
      />

      {/* Floating Action Menu on hover / select */}
      <div className="absolute -top-10 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 liquid-pill px-2 py-1 rounded-xl shadow-lg z-20">
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

      <div className="p-5 flex flex-col gap-3.5">
        {/* Header: Neutral Abstract Icon & Minimalist Pill Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {/* Minimalist Abstract Filled Icon in Neutral Pebble */}
            <div className="w-7 h-7 rounded-xl liquid-pill flex items-center justify-center text-inherit opacity-90 shadow-sm">
              <AbstractIcon className="w-4 h-4" />
            </div>

            {/* Minimalist Monospace Badge */}
            <span className="font-mono text-[10px] tracking-wider uppercase font-medium px-2.5 py-1 rounded-lg liquid-pill text-inherit opacity-85">
              {data.badge || categoryDef.badgeDefault}
            </span>
          </div>

          <span className="text-[10px] font-mono opacity-50 tracking-wider uppercase">
            {categoryDef.neutralTag}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-display font-semibold text-sm leading-snug tracking-tight text-inherit opacity-95 group-hover:opacity-100 transition-opacity">
          {data.title}
        </h3>

        {/* Description */}
        <div className="text-xs leading-relaxed opacity-75 whitespace-pre-line space-y-1 font-sans">
          {data.description}
        </div>

        {/* Key Metric Highlight - Frameless Liquid Inset */}
        {data.keyMetric && (
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl liquid-pill text-[11px] leading-tight opacity-90 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 flex-shrink-0 opacity-70" />
            <div>
              <span className="font-semibold opacity-95">Цель: </span>
              <span className="opacity-85">{data.keyMetric}</span>
            </div>
          </div>
        )}

        {/* Strategic Outcome Highlight - Frameless Liquid Inset */}
        {data.outcome && (
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl liquid-pill text-[11px] leading-tight opacity-90 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 flex-shrink-0 opacity-70" />
            <div>
              <span className="font-semibold opacity-95">Результат: </span>
              <span className="opacity-85">{data.outcome}</span>
            </div>
          </div>
        )}

      </div>

      {/* React Flow Connection Handles (Top, Right, Bottom, Left) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2.5 !h-2.5 !bg-inherit !opacity-60 hover:!opacity-100 !border-0 !shadow-md !-top-1.5"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2.5 !h-2.5 !bg-inherit !opacity-60 hover:!opacity-100 !border-0 !shadow-md !-bottom-1.5"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !bg-inherit !opacity-60 hover:!opacity-100 !border-0 !shadow-md !-left-1.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-inherit !opacity-60 hover:!opacity-100 !border-0 !shadow-md !-right-1.5"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
