import React, { useRef, useState, useEffect } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { CATEGORIES } from '../constants/categories';
import type { CategoryType, EdgeLabelSize, StrategyNodeData, ImageNodeData, TextNodeData } from '../types';
import { 
  IconFoundation, 
  IconPsychology, 
  IconHardware, 
  IconRetention, 
  IconEventDuality, 
  IconLifecycle, 
  IconOutcome, 
  IconCustomNode,
  IconText,
} from './AbstractIcons';
import { compressImageFile } from '../utils/imageCompressor';

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

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onDebouncedChange: (val: string) => void;
  debounceMs?: number;
}

const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onDebouncedChange,
  debounceMs = 300,
  onBlur,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (prevValue !== value) {
    setPrevValue(value);
    setLocalValue(value);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onDebouncedChange(next);
    }, debounceMs);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (localValue !== value) {
      onDebouncedChange(localValue);
    }
    onBlur?.(e);
  };

  return <input {...props} value={localValue} onChange={handleChange} onBlur={handleBlur} />;
};

interface DebouncedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onDebouncedChange: (val: string) => void;
  debounceMs?: number;
}

const DebouncedTextarea: React.FC<DebouncedTextareaProps> = ({
  value,
  onDebouncedChange,
  debounceMs = 300,
  onBlur,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (prevValue !== value) {
    setPrevValue(value);
    setLocalValue(value);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onDebouncedChange(next);
    }, debounceMs);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (localValue !== value) {
      onDebouncedChange(localValue);
    }
    onBlur?.(e);
  };

  return <textarea {...props} value={localValue} onChange={handleChange} onBlur={handleBlur} />;
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
  const isViewerMode = useBoardStore((s) => s.isViewerMode);

  const updateNode = useBoardStore((s) => s.updateNode);
  const deleteNode = useBoardStore((s) => s.deleteNode);
  const duplicateNode = useBoardStore((s) => s.duplicateNode);

  const updateEdge = useBoardStore((s) => s.updateEdge);
  const deleteEdge = useBoardStore((s) => s.deleteEdge);
  const openLightbox = useBoardStore((s) => s.openLightbox);

  const nodeFileInputRef = useRef<HTMLInputElement>(null);
  const edgeFileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  if (!isInspectorOpen || (!selectedNode && !selectedEdge)) {
    return null;
  }

  const isImageNode = selectedNode?.type === 'imageNode';
  const isTextNode = selectedNode?.type === 'textNode';
  const isStrategyNode = selectedNode?.type === 'strategyNode';

  const incomingEdges = selectedNode ? edges.filter((e) => e.target === selectedNode.id) : [];
  const outgoingEdges = selectedNode ? edges.filter((e) => e.source === selectedNode.id) : [];

  const handleSelectConnectedNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    if (onFocusNode) {
      onFocusNode(nodeId);
    }
  };

  const handleNodeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNode) return;

    try {
      setIsUploading(true);
      const compressed = await compressImageFile(file, 1400, 0.85);
      updateNode(selectedNode.id, { imageUrl: compressed });
    } catch (err) {
      console.error('Failed to compress node image:', err);
      alert('Ошибка сжатия изображения.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleEdgeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEdge) return;

    try {
      setIsUploading(true);
      const compressed = await compressImageFile(file, 1200, 0.85);
      updateEdge(selectedEdge.id, { imageUrl: compressed });
    } catch (err) {
      console.error('Failed to compress edge image:', err);
      alert('Ошибка сжатия изображения.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleApplyUrlToNode = () => {
    if (!selectedNode || !photoUrlInput.trim()) return;
    updateNode(selectedNode.id, { imageUrl: photoUrlInput.trim() });
    setPhotoUrlInput('');
  };

  const handleApplyUrlToEdge = () => {
    if (!selectedEdge || !photoUrlInput.trim()) return;
    updateEdge(selectedEdge.id, { imageUrl: photoUrlInput.trim() });
    setPhotoUrlInput('');
  };

  const SelectedAbstractIcon = isStrategyNode 
    ? ABSTRACT_ICONS[(selectedNode.data as StrategyNodeData).category] || IconCustomNode 
    : IconCustomNode;

  return (
    <aside className="fixed top-4 right-4 bottom-4 w-96 rounded-3xl liquid-glass-panel z-40 flex flex-col shadow-2xl overflow-hidden transition-transform duration-200 select-none">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={nodeFileInputRef}
        onChange={handleNodeFileUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={edgeFileInputRef}
        onChange={handleEdgeFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-current/10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg liquid-pill flex items-center justify-center opacity-85">
            {isImageNode ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
            ) : isTextNode ? (
              <IconText className="w-3.5 h-3.5" />
            ) : isStrategyNode ? (
              <SelectedAbstractIcon className="w-3.5 h-3.5" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 15l-6 6-1.42-1.42L15.17 16H4V4h2v10h9.17l-3.59-3.58L13 9l6 6z" />
              </svg>
            )}
          </div>
          <span className="font-display font-bold text-sm tracking-wide uppercase opacity-95">
            {isImageNode ? 'Фото-Карточка' : isTextNode ? 'Текстовый Блок' : selectedNode ? 'Инспектор Карточки' : 'Инспектор Связи'}
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

      {/* Read-Only Mode Banner */}
      {isViewerMode && (
        <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-[11px] font-mono flex items-center gap-2">
          <span>👁</span>
          <span>Режим просмотра: редактирование заблокировано</span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {/* ===================== IMAGE NODE INSPECTOR ===================== */}
        {isImageNode && (() => {
          const imgData = selectedNode.data as ImageNodeData;
          return (
            <div className="space-y-4">
              {/* Photo Preview Banner */}
              <div 
                className="relative w-full h-44 rounded-2xl overflow-hidden bg-black/30 border border-white/10 group/banner cursor-pointer shadow-inner"
                onClick={() => openLightbox(imgData.imageUrl, imgData.title || imgData.caption || 'Изображение')}
                title="Кликните для полноэкранного просмотра"
              >
                <img 
                  src={imgData.imageUrl} 
                  alt={imgData.title || 'Изображение'} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover/banner:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-black/70 text-white font-mono text-[10px]">
                    Открыть на весь экран
                  </span>
                </div>
              </div>

              {/* Replace Image Button & URL Input */}
              <div className="space-y-2">
                <button
                  onClick={() => nodeFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full py-2 px-3 rounded-xl liquid-pill font-medium flex items-center justify-center gap-2 hover:liquid-pill-active transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                  <span>{isUploading ? 'Загрузка...' : 'Заменить фото из файла'}</span>
                </button>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Или вставьте URL ссылки..."
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyUrlToNode()}
                    className="flex-1 liquid-pill px-3 py-1.5 rounded-xl text-inherit font-mono outline-none text-[11px]"
                  />
                  <button
                    onClick={handleApplyUrlToNode}
                    className="px-3 py-1.5 rounded-xl liquid-pill font-mono text-[10px] hover:liquid-pill-active"
                  >
                    OK
                  </button>
                </div>
              </div>

              {/* Width Presets */}
              <div className="space-y-1.5 pt-2 border-t border-current/10">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                    Размер карточки
                  </label>
                  <span className="font-mono text-[10px] opacity-70">
                    {imgData.width || 340}px
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'S (260)', w: 260 },
                    { label: 'M (340)', w: 340 },
                    { label: 'L (440)', w: 440 },
                    { label: 'XL (600)', w: 600 },
                  ].map((p) => {
                    const isActive = (imgData.width || 340) === p.w;
                    return (
                      <button
                        key={p.w}
                        onClick={() => updateNode(selectedNode.id, { width: p.w })}
                        className={`py-1.5 rounded-xl font-mono text-[10px] transition-all ${
                          isActive
                            ? 'liquid-pill-active font-bold shadow-md'
                            : 'liquid-pill opacity-70 hover:opacity-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Заголовок (необязательно)
                </label>
                <DebouncedInput
                  type="text"
                  value={imgData.title || ''}
                  placeholder="Название схемы, макета или фото..."
                  onDebouncedChange={(val) => updateNode(selectedNode.id, { title: val })}
                  className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit font-semibold outline-none text-xs"
                />
              </div>

              {/* Caption */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Подпись / Контекст
                </label>
                <DebouncedTextarea
                  rows={3}
                  value={imgData.caption || ''}
                  placeholder="Добавьте пояснение к изображению..."
                  onDebouncedChange={(val) => updateNode(selectedNode.id, { caption: val })}
                  className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none leading-relaxed resize-none text-xs"
                />
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
            </div>
          );
        })()}

        {/* ===================== TEXT NODE INSPECTOR ===================== */}
        {isTextNode && (() => {
          const textData = selectedNode.data as TextNodeData;
          return (
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Заголовок (необязательно)
                </label>
                <DebouncedInput
                  type="text"
                  value={textData.title || ''}
                  placeholder="Заголовок блока..."
                  onDebouncedChange={(val) => updateNode(selectedNode.id, { title: val })}
                  className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit font-semibold outline-none text-xs"
                />
              </div>

              {/* Body Text */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Текст блока
                </label>
                <DebouncedTextarea
                  rows={6}
                  value={textData.text || ''}
                  placeholder="Введите любой текст..."
                  onDebouncedChange={(val) => updateNode(selectedNode.id, { text: val })}
                  className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none leading-relaxed resize-y text-xs font-sans"
                />
              </div>

              {/* Color Presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Стиль / Оттенок блока
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { id: 'default', label: 'Стекло', bg: '#71717A' },
                    { id: 'amber', label: 'Янтарь', bg: '#F59E0B' },
                    { id: 'emerald', label: 'Изумруд', bg: '#10B981' },
                    { id: 'blue', label: 'Лазурь', bg: '#3B82F6' },
                    { id: 'rose', label: 'Коралл', bg: '#F43F5E' },
                    { id: 'purple', label: 'Аметист', bg: '#A855F7' },
                    { id: 'graphite', label: 'Графит', bg: '#27272A' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateNode(selectedNode.id, { color: opt.id })}
                      title={opt.label}
                      className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                        (textData.color || 'default') === opt.id
                          ? 'scale-110 ring-2 ring-current shadow-md'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: opt.bg }}
                    >
                      {(textData.color || 'default') === opt.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Размер шрифта
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateNode(selectedNode.id, { fontSize: sz })}
                      className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        (textData.fontSize || 'md') === sz
                          ? 'liquid-pill-active font-bold shadow-sm'
                          : 'liquid-pill opacity-75 hover:opacity-100'
                      }`}
                    >
                      {sz.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Width Presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Ширина блока
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'S (240px)', width: 240 },
                    { label: 'M (340px)', width: 340 },
                    { label: 'L (480px)', width: 480 },
                    { label: 'XL (640px)', width: 640 },
                  ].map((w) => (
                    <button
                      key={w.width}
                      type="button"
                      onClick={() => updateNode(selectedNode.id, { width: w.width })}
                      className={`py-1.5 rounded-lg text-[11px] font-mono transition-all ${
                        (textData.width || 340) === w.width
                          ? 'liquid-pill-active font-bold shadow-sm'
                          : 'liquid-pill opacity-75 hover:opacity-100'
                      }`}
                    >
                      {w.label.split(' ')[0]}
                    </button>
                  ))}
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
            </div>
          );
        })()}

        {/* ===================== STRATEGY NODE INSPECTOR ===================== */}
        {isStrategyNode && (() => {
          const stratData = selectedNode.data as StrategyNodeData;
          return (
            <>
              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Категория
                </label>
                <select
                  value={stratData.category}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      category: e.target.value as CategoryType,
                      badge: CATEGORIES[e.target.value as CategoryType]?.badgeDefault || stratData.badge,
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
                <DebouncedInput
                  type="text"
                  value={stratData.badge}
                  onDebouncedChange={(val) => updateNode(selectedNode.id, { badge: val })}
                  className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit font-mono outline-none font-medium"
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Название блока
                </label>
                <DebouncedInput
                  type="text"
                  value={stratData.title}
                  onDebouncedChange={(val) => updateNode(selectedNode.id, { title: val })}
                  className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit font-semibold outline-none text-xs"
                />
              </div>

              {/* Attached Photo Section */}
              <div className="space-y-2 pt-2 border-t border-current/10">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                    Фотография блока
                  </label>
                  {stratData.imageUrl && (
                    <button
                      onClick={() => updateNode(selectedNode.id, { imageUrl: undefined })}
                      className="text-[10px] font-mono text-rose-400 hover:underline"
                    >
                      Удалить
                    </button>
                  )}
                </div>

                {stratData.imageUrl ? (
                  <div 
                    className="relative w-full h-36 rounded-xl overflow-hidden bg-black/25 border border-white/10 group/prev cursor-pointer shadow-inner"
                    onClick={() => openLightbox(stratData.imageUrl!, stratData.title)}
                    title="Кликните для полноэкранного просмотра"
                  >
                    <img 
                      src={stratData.imageUrl} 
                      alt={stratData.title} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/prev:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/prev:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2 py-1 rounded bg-black/70 text-white font-mono text-[10px]">
                        Открыть фото
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-1.5">
                  <button
                    onClick={() => nodeFileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 py-1.5 px-2.5 rounded-xl liquid-pill font-mono text-[11px] flex items-center justify-center gap-1.5 hover:liquid-pill-active"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                    <span>{stratData.imageUrl ? 'Заменить' : 'Загрузить файл'}</span>
                  </button>
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Или URL картинки..."
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyUrlToNode()}
                    className="flex-1 liquid-pill px-2.5 py-1.5 rounded-xl text-inherit font-mono outline-none text-[11px]"
                  />
                  <button
                    onClick={handleApplyUrlToNode}
                    className="px-2.5 py-1.5 rounded-xl liquid-pill font-mono text-[10px] hover:liquid-pill-active"
                  >
                    OK
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Описание механизма
                </label>
                <DebouncedTextarea
                  rows={4}
                  value={stratData.description}
                  onDebouncedChange={(val) => updateNode(selectedNode.id, { description: val })}
                  className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none leading-relaxed resize-none text-xs"
                />
              </div>

              {/* Key Metric & Outcome */}
              <div className="space-y-3 pt-2 border-t border-current/10">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono opacity-70 uppercase tracking-wider">
                    Целевая метрика (Key Metric)
                  </label>
                  <DebouncedInput
                    type="text"
                    placeholder="Например: Цель — Top-1 Retention"
                    value={stratData.keyMetric || ''}
                    onDebouncedChange={(val) => updateNode(selectedNode.id, { keyMetric: val })}
                    className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono opacity-70 uppercase tracking-wider">
                    Результат (Outcome)
                  </label>
                  <DebouncedInput
                    type="text"
                    placeholder="Например: Рождает эмоцию отличности"
                    value={stratData.outcome || ''}
                    onDebouncedChange={(val) => updateNode(selectedNode.id, { outcome: val })}
                    className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit outline-none text-xs"
                  />
                </div>
              </div>

              {/* Extended Notes */}
              <div className="space-y-1.5 pt-2 border-t border-current/10">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Заметки и Контекст
                </label>
                <DebouncedTextarea
                  rows={3}
                  placeholder="Инсайты команды..."
                  value={stratData.notes || ''}
                  onDebouncedChange={(val) => updateNode(selectedNode.id, { notes: val })}
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
          );
        })()}

        {/* ===================== SELECTED EDGE INSPECTOR ===================== */}
        {selectedEdge && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                Подпись связи (отношение)
              </label>
              <DebouncedInput
                type="text"
                value={selectedEdge.data?.label || ''}
                onDebouncedChange={(val) => updateEdge(selectedEdge.id, { label: val })}
                className="w-full liquid-pill px-3 py-2 rounded-xl text-inherit font-mono outline-none"
              />
            </div>

            {/* Edge Photo Attachment */}
            <div className="space-y-2 pt-2 border-t border-current/10">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono opacity-60 uppercase tracking-wider">
                  Фотография связи
                </label>
                {selectedEdge.data?.imageUrl && (
                  <button
                    onClick={() => updateEdge(selectedEdge.id, { imageUrl: undefined })}
                    className="text-[10px] font-mono text-rose-400 hover:underline"
                  >
                    Удалить
                  </button>
                )}
              </div>

              {selectedEdge.data?.imageUrl && (
                <div 
                  className="relative w-full h-32 rounded-xl overflow-hidden bg-black/25 border border-white/10 group/edgeprev cursor-pointer shadow-inner"
                  onClick={() => openLightbox(selectedEdge.data!.imageUrl!, selectedEdge.data?.label || 'Связь')}
                  title="Кликните для полноэкранного просмотра"
                >
                  <img 
                    src={selectedEdge.data.imageUrl} 
                    alt={selectedEdge.data?.label || 'Связь'} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/edgeprev:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/edgeprev:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-2 py-1 rounded bg-black/70 text-white font-mono text-[10px]">
                      Открыть фото
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-1.5">
                <button
                  onClick={() => edgeFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex-1 py-1.5 px-2.5 rounded-xl liquid-pill font-mono text-[11px] flex items-center justify-center gap-1.5 hover:liquid-pill-active"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                  <span>{selectedEdge.data?.imageUrl ? 'Заменить фото' : 'Прикрепить фото к связи'}</span>
                </button>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Или вставьте URL..."
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyUrlToEdge()}
                  className="flex-1 liquid-pill px-2.5 py-1.5 rounded-xl text-inherit font-mono outline-none text-[11px]"
                />
                <button
                  onClick={handleApplyUrlToEdge}
                  className="px-2.5 py-1.5 rounded-xl liquid-pill font-mono text-[10px] hover:liquid-pill-active"
                >
                  OK
                </button>
              </div>
            </div>

            {/* Edge Label Size Selector */}
            <div className="space-y-1.5 pt-2 border-t border-current/10">
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
