import React from 'react';
import { useViewport } from '@xyflow/react';
import { useBoardStore } from '../store/useBoardStore';

const isCursorFresh = (lastUpdated: number, userId: string, currentUserId?: string) => {
  return userId !== currentUserId && Date.now() - lastUpdated < 15000;
};

export const LiveCursorsOverlay: React.FC = () => {
  const { x: vpX, y: vpY, zoom } = useViewport();
  const collabCursors = useBoardStore((s) => s.collabCursors);
  const collabUser = useBoardStore((s) => s.collabUser);

  const cursorsList = Object.values(collabCursors).filter((c) =>
    isCursorFresh(c.lastUpdated, c.userId, collabUser?.id)
  );

  if (cursorsList.length === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-20"
      style={{
        transform: `translate(${vpX}px, ${vpY}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    >
      {cursorsList.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute transition-transform duration-75 ease-linear pointer-events-none"
          style={{
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Custom SVG Pointer */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
          >
            <path
              d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
              fill={cursor.color}
              stroke="#FFFFFF"
              strokeWidth="1.2"
            />
          </svg>

          {/* User Name Badge */}
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-0.5 ml-3 rounded-full text-[10px] font-medium tracking-wide shadow-lg whitespace-nowrap select-none backdrop-blur-md border border-white/20"
            style={{
              backgroundColor: `${cursor.color}E6`,
              color: '#FFFFFF',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>{cursor.userName}</span>
            {cursor.activeNodeId && (
              <span className="opacity-75 text-[9px] font-mono border-l border-white/30 pl-1">
                выбирает
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
