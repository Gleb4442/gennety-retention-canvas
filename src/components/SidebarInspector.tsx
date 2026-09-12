import React from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { CATEGORIES } from '../constants/categories';
import type { CategoryType, EdgeLabelSize } from '../types';
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

interface SidebarInspectorProps {
  onFocusNode?: (nodeId: string) => void;
}

export const SidebarInspector: React.FC<SidebarInspectorProps> = ({ onFocusNode }) => {
  const nodes = useBoardStore((s) => s.nodes);
  const edges = useBoardStore((s) => s.edges);
  const selectedNodeId = useBoardStore((s) => s.selectedNodeId);
  const selectedEdgeId = useBoardStore((s) => s.selectedEdgeId);
  const isInspectorOpen = useBoardStore((s) => s.isInspectorOpen);
  const setIsInspectorOpen = useBoardStore((s) => s.setIsInspectorOpen);
  const setSelectedNodeId = useBoardStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useBoardStore((s) => s.setSelectedEdgeId);

  const updateNode = useBoardStore((s) => s.updateNode);
  const deleteNode = useBoardStore((s) => s.deleteNode);
  const duplicateNode = useBoardStore((s) => s.duplicateNode);

  const updateEdge = useBoardStore((s) => s.updateEdge);
  const deleteEdge = useBoardStore((s) => s.deleteEdge);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  if (!isInspectorOpen || (!selectedNode && !selectedEdge)) {
    return null;
  }

  const incomingEdges = selectedNode ? edges.filter((e) => e.target === selectedNode.id) : [];
  const outgoingEdges = selectedNode ? edges.filter((e) => e.source === selectedNode.id) : [];

  const handleSelectConnectedNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    if (onFocusNode) {
      onFocusNode(nodeId);
    }
  };

  const SelectedAbstractIcon = selectedNode 
    ? ABSTRACT_ICONS[selectedNode.data.category] || IconCustomNode 
    : IconCustomNode;

  return (
    <aside className="fixed top-4 right-4 bottom-4 w-96 rounded-3xl liquid-glass-panel z-40 flex flex-col shadow-2xl overflow-hidden transition-transform duration-200 select-none">
      {/* Header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-current/10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg liquid-pill flex items-center justify-center opacity-85">
            <SelectedAbstractIcon className="w-3.5 h-3.5" />
          </div>
          <span className="font-display font-bold text-sm tracking-wide uppercase opacity-95">
            {selectedNode ? 'Инспектор Карточки' : 'Инспектор Связи'}
          </span>
        </div>
        <button
          onClick={() => {
            setIsInspectorOpen(false);
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
          }}
          className="p-1.5 rounded-lg liquid-pill opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {selectedNode && (
          <>
            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Категория
              </label>
              <select
                value={selectedNode.data.category}
                onChange={(e) =>
                  updateNode(selectedNode.id, {
                    category: e.target.value as CategoryType,
                    badge: CATEGORIES[e.target.value as CategoryType]?.badgeDefault || selectedNode.data.badge,
                  })
                }
                className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none font-medium cursor-pointer"
              >
                {Object.values(CATEGORIES).map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-zinc-900 text-white">
                    {cat.label} ({cat.badgeDefault})
                  </option>
                ))}
              </select>
            </div>

            {/* Badge Tag */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Метка / Бейдж
              </label>
              <input
                type="text"
                value={selectedNode.data.badge}
                onChange={(e) => updateNode(selectedNode.id, { badge: e.target.value })}
                className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit font-mono outline-none font-medium"
              />
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Название блока
              </label>
              <input
                type="text"
                value={selectedNode.data.title}
                onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })}
                className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit font-semibold outline-none text-xs"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Описание механизма
              </label>
              <textarea
                rows={4}
                value={selectedNode.data.description}
                onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
                className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none leading-relaxed resize-none text-xs"
              />
            </div>

            {/* Key Metric & Outcome */}
            <div className="space-y-3 pt-2 border-t border-current/10">
              <div className="space-y-1">
                <label className="text-[10px] font-mono opacity-70 uppercase tracking-wider">
                  Целевая метрика (Key Metric)
                </label>
                <input
                  type="text"
                  placeholder="Например: Цель — Top-1 Retention"
                  value={selectedNode.data.keyMetric || ''}
                  onChange={(e) => updateNode(selectedNode.id, { keyMetric: e.target.value })}
                  className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono opacity-70 uppercase tracking-wider">
                  Результат (Outcome)
                </label>
                <input
                  type="text"
                  placeholder="Например: Рождает эмоцию отличности"
                  value={selectedNode.data.outcome || ''}
                  onChange={(e) => updateNode(selectedNode.id, { outcome: e.target.value })}
                  className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none text-xs"
                />
              </div>
            </div>

            {/* Extended Notes */}
            <div className="space-y-1.5 pt-2 border-t border-current/10">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Заметки и Контекст
              </label>
              <textarea
                rows={3}
                placeholder="Инсайты команды..."
                value={selectedNode.data.notes || ''}
                onChange={(e) => updateNode(selectedNode.id, { notes: e.target.value })}
                className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none leading-relaxed resize-none text-xs"
              />
            </div>

            {/* Dependencies */}
            <div className="space-y-3 pt-2 border-t border-current/10">
              <h4 className="font-mono text-[10px] opacity-60 uppercase tracking-wider">
                Зависимости & Связи
              </h4>

              {/* Incoming */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono opacity-50 uppercase flex items-center gap-1">
                  ← Входящие ({incomingEdges.length})
                </span>
                {incomingEdges.length === 0 ? (
                  <p className="text-[11px] opacity-40 italic">Начальный узел</p>
                ) : (
                  incomingEdges.map((e) => {
                    const sourceNode = nodes.find((n) => n.id === e.source);
                    return (
                      <div
                        key={e.id}
                        onClick={() => handleSelectConnectedNode(e.source)}
                        className="flex items-center justify-between p-2 rounded-xl liquid-pill cursor-pointer hover:liquid-pill-active transition-all"
                      >
                        <span className="font-medium truncate max-w-[180px]">
                          {sourceNode?.data.title || e.source}
                        </span>
                        <span className="font-mono text-[9px] opacity-60">
                          {e.data?.label || 'связь'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Outgoing */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono opacity-50 uppercase flex items-center gap-1">
                  → Исходящие ({outgoingEdges.length})
                </span>
                {outgoingEdges.length === 0 ? (
                  <p className="text-[11px] opacity-40 italic">Конечный узел</p>
                ) : (
                  outgoingEdges.map((e) => {
                    const targetNode = nodes.find((n) => n.id === e.target);
                    return (
                      <div
                        key={e.id}
                        onClick={() => handleSelectConnectedNode(e.target)}
                        className="flex items-center justify-between p-2 rounded-xl liquid-pill cursor-pointer hover:liquid-pill-active transition-all"
                      >
                        <span className="font-medium truncate max-w-[180px]">
                          {targetNode?.data.title || e.target}
                        </span>
                        <span className="font-mono text-[9px] opacity-60">
                          {e.data?.label || 'связь'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-current/10 flex gap-2">
              <button
                onClick={() => duplicateNode(selectedNode.id)}
                className="flex-1 py-2 px-3 rounded-xl liquid-pill font-medium text-xs hover:liquid-pill-active transition-all"
              >
                Дублировать
              </button>
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="flex-1 py-2 px-3 rounded-xl liquid-pill text-rose-400 hover:bg-rose-500/20 font-medium text-xs transition-all"
              >
                Удалить
              </button>
            </div>
          </>
        )}

        {/* Selected Edge Inspector */}
        {selectedEdge && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Подпись связи (отношение)
              </label>
              <input
                type="text"
                value={selectedEdge.data?.label || ''}
                onChange={(e) => updateEdge(selectedEdge.id, { label: e.target.value })}
                className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit font-mono outline-none"
              />
            </div>

            {/* Edge Label Size Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Размер заголовка связи
                </label>
                <span className="font-mono text-[10px] opacity-70 uppercase font-semibold">
                  {(selectedEdge.data?.labelSize || 'sm').toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'sm', label: 'S (10px)', desc: 'Мини' },
                  { id: 'md', label: 'M (12px)', desc: 'Норм' },
                  { id: 'lg', label: 'L (15px)', desc: 'Крупно' },
                  { id: 'xl', label: 'XL (18px)', desc: 'Заголовок' },
                ].map((s) => {
                  const isActive = (selectedEdge.data?.labelSize || 'sm') === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => updateEdge(selectedEdge.id, { labelSize: s.id as EdgeLabelSize })}
                      className={`py-2 px-1.5 rounded-xl font-mono text-[10px] flex flex-col items-center justify-center transition-all ${
                        isActive
                          ? 'liquid-pill-active font-bold shadow-md scale-[1.02]'
                          : 'liquid-pill opacity-70 hover:opacity-100'
                      }`}
                      title={`Установить размер ${s.label}`}
                    >
                      <span>{s.id.toUpperCase()}</span>
                      <span className="text-[8px] opacity-60">{s.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Тип кривой
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateEdge(selectedEdge.id, { styleType: 'bezier' })}
                  className={`py-2 px-3 rounded-xl font-mono text-[11px] transition-all ${
                    selectedEdge.data?.styleType !== 'smoothstep'
                      ? 'liquid-pill-active font-semibold'
                      : 'liquid-pill opacity-70'
                  }`}
                >
                  Bezier
                </button>
                <button
                  onClick={() => updateEdge(selectedEdge.id, { styleType: 'smoothstep' })}
                  className={`py-2 px-3 rounded-xl font-mono text-[11px] transition-all ${
                    selectedEdge.data?.styleType === 'smoothstep'
                      ? 'liquid-pill-active font-semibold'
                      : 'liquid-pill opacity-70'
                  }`}
                >
                  Step Line
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Анимация потока
              </label>
              <button
                onClick={() => updateEdge(selectedEdge.id, { animated: !selectedEdge.animated })}
                className="w-full py-2.5 px-3 rounded-xl liquid-pill text-left flex items-center justify-between"
              >
                <span>Импульс потока</span>
                <span className={`font-mono text-xs font-semibold ${selectedEdge.animated ? 'opacity-100' : 'opacity-40'}`}>
                  {selectedEdge.animated ? 'ВКЛ' : 'ВЫКЛ'}
                </span>
              </button>
            </div>

            <div className="pt-4 border-t border-current/10">
              <button
                onClick={() => deleteEdge(selectedEdge.id)}
                className="w-full py-2 px-3 rounded-xl liquid-pill text-rose-400 hover:bg-rose-500/20 font-medium text-xs transition-all"
              >
                Удалить связь
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
