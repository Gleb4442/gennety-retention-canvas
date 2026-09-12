import React, { useState, useEffect, useRef } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { CATEGORIES } from '../constants/categories';
import { 
  IconFoundation, 
  IconPsychology, 
  IconHardware, 
  IconRetention, 
  IconEventDuality, 
  IconLifecycle, 
  IconOutcome, 
  IconCustomNode,
  IconSearchMinimal,
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

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectNode,
}) => {
  const nodes = useBoardStore((s) => s.nodes);
  const setSearchQuery = useBoardStore((s) => s.setSearchQuery);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSearchQuery('');
    }
  }, [isOpen, setSearchQuery]);

  const filteredNodes = nodes.filter((node) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    
    if (node.type === 'imageNode') {
      const title = (node.data.title || node.data.caption || 'Фото').toLowerCase();
      const caption = (node.data.caption || '').toLowerCase();
      return title.includes(q) || caption.includes(q) || 'фото'.includes(q);
    }

    const stratData = node.data;
    const cat = (CATEGORIES[stratData.category]?.label || '').toLowerCase();
    return (
      (stratData.title || '').toLowerCase().includes(q) ||
      (stratData.badge || '').toLowerCase().includes(q) ||
      (stratData.description || '').toLowerCase().includes(q) ||
      cat.includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredNodes.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredNodes.length) % (filteredNodes.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredNodes[selectedIndex]) {
        handleChoose(filteredNodes[selectedIndex].id);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleChoose = (id: string) => {
    onSelectNode(id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/50 backdrop-blur-xl animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl liquid-glass rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center px-5 py-4 border-b border-current/10">
          <IconSearchMinimal className="w-4 h-4 opacity-60 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Поиск узлов по названию, метке или смыслу..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-inherit placeholder-current placeholder-opacity-40 text-sm outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSearchQuery('');
              }}
              className="p-1 opacity-50 hover:opacity-100 mr-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
              </svg>
            </button>
          )}
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded-lg liquid-pill opacity-60">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredNodes.length === 0 ? (
            <div className="py-8 text-center opacity-50 text-xs font-mono">
              Ничего не найдено по запросу «{query}»
            </div>
          ) : (
            filteredNodes.map((node, index) => {
              const isSelected = index === selectedIndex;
              const isImg = node.type === 'imageNode';
              const imgData = isImg ? (node.data as import('../types').ImageNodeData) : null;
              const stratData = !isImg ? (node.data as import('../types').StrategyNodeData) : null;

              const title = isImg ? (imgData?.title || imgData?.caption || 'Фото-карточка') : (stratData?.title || 'Карточка');
              const badge = isImg ? 'Фото' : (stratData?.badge || 'Card');
              const desc = isImg ? (imgData?.caption || 'Изображение на холсте') : (stratData?.description || '');
              const NodeIcon = (!isImg && stratData) ? (ABSTRACT_ICONS[stratData.category] || IconCustomNode) : IconCustomNode;

              return (
                <div
                  key={node.id}
                  onClick={() => handleChoose(node.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'liquid-pill-active shadow-sm scale-[1.01]'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-xl liquid-pill flex items-center justify-center flex-shrink-0 opacity-85">
                      {isImg && imgData?.imageUrl ? (
                        <img src={imgData.imageUrl} alt={title} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <NodeIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-inherit truncate">
                          {title}
                        </span>
                        <span className="font-mono text-[9px] px-2 py-0.5 rounded-md liquid-pill opacity-70">
                          {badge}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-60 truncate max-w-md">
                        {desc}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono opacity-40">↵</span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-current/10 flex items-center justify-between text-[10px] font-mono opacity-50">
          <span>Навигация: ↑ ↓ стрелки</span>
          <span>ENTER для перехода</span>
        </div>
      </div>
    </div>
  );
};
