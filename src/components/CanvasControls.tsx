import React from 'react';
import { useReactFlow } from '@xyflow/react';
import { useBoardStore } from '../store/useBoardStore';

interface CanvasControlsProps {
  isLocked: boolean;
  onToggleLock: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({ isLocked, onToggleLock }) => {
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
  const nodes = useBoardStore((s) => s.nodes);
  const edges = useBoardStore((s) => s.edges);

  const isSelectAreaMode = useBoardStore((s) => s.isSelectAreaMode);
  const setIsSelectAreaMode = useBoardStore((s) => s.setIsSelectAreaMode);

  return (
    <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 select-none">
      {/* Node and Edge Counter Pill */}
      <div className="flex items-center gap-3 px-3 py-1.5 rounded-full liquid-pill text-[11px] font-mono shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          <span>{nodes.length} узлов</span>
        </div>
        <span className="opacity-30">/</span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          <span>{edges.length} связей</span>
        </div>
      </div>

      {/* Main floating control bar */}
      <div className="flex items-center p-1.5 rounded-2xl liquid-glass shadow-2xl gap-1">
        <button
          onClick={() => zoomIn({ duration: 250 })}
          className="p-2 rounded-xl liquid-pill opacity-75 hover:opacity-100 transition-opacity"
          title="Приблизить (+)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>

        <button
          onClick={() => zoomOut({ duration: 250 })}
          className="p-2 rounded-xl liquid-pill opacity-75 hover:opacity-100 transition-opacity"
          title="Отдалить (-)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13H5v-2h14v2z" />
          </svg>
        </button>

        <div className="w-px h-3.5 bg-current/10 mx-0.5 opacity-60" />

        <button
          onClick={() => fitView({ padding: 0.18, duration: 400 })}
          className="p-2 rounded-xl liquid-pill opacity-75 hover:opacity-100 transition-opacity"
          title="Вместить схему (Fit View)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h6v2H6v4H4V4zm14 0h-4V2h6v6h-2V4zM4 14h2v4h4v2H4v-6zm16 4h-4v2h6v-6h-2v4z" />
          </svg>
        </button>

        {/* Preset zoom levels */}
        <button
          onClick={() => zoomTo(0.5, { duration: 300 })}
          className="px-2.5 py-1 rounded-xl text-[10px] font-mono liquid-pill opacity-70 hover:opacity-100 transition-opacity"
        >
          50%
        </button>
        <button
          onClick={() => zoomTo(1.0, { duration: 300 })}
          className="px-2.5 py-1 rounded-xl text-[10px] font-mono liquid-pill opacity-70 hover:opacity-100 transition-opacity"
        >
          100%
        </button>
        <button
          onClick={() => zoomTo(1.5, { duration: 300 })}
          className="px-2.5 py-1 rounded-xl text-[10px] font-mono liquid-pill opacity-70 hover:opacity-100 transition-opacity"
        >
          150%
        </button>

        <div className="w-px h-3.5 bg-current/10 mx-0.5 opacity-60" />

        {/* Marquee Area Selection Mode Button */}
        <button
          onClick={() => setIsSelectAreaMode(!isSelectAreaMode)}
          className={`p-2 rounded-xl transition-all duration-150 ${
            isSelectAreaMode
              ? 'liquid-pill-active font-semibold shadow-sm'
              : 'liquid-pill opacity-70 hover:opacity-100'
          }`}
          title={
            isSelectAreaMode
              ? 'Выйти из режима выделения области (Esc)'
              : 'Выделение области: зажмите и выделите группу карточек для перемещения (V)'
          }
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V4h3" />
            <path d="M11 4h2" />
            <path d="M17 4h3v3" />
            <path d="M20 11v2" />
            <path d="M20 17v3h-3" />
            <path d="M13 20h-2" />
            <path d="M7 20H4v-3" />
            <path d="M4 13v-2" />
          </svg>
        </button>

        <button
          onClick={onToggleLock}
          className={`p-2 rounded-xl transition-opacity duration-150 ${
            isLocked
              ? 'liquid-pill-active font-semibold'
              : 'liquid-pill opacity-70 hover:opacity-100'
          }`}
          title={isLocked ? 'Холст заблокирован' : 'Блокировка холста'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            {isLocked ? (
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            ) : (
              <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
};
