import React, { useEffect, useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';

interface ImageLightboxModalProps {
  imageUrl?: string | null;
  title?: string;
  onClose?: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  imageUrl: propUrl,
  title: propTitle,
  onClose: propClose,
}) => {
  const storeUrl = useBoardStore((s) => s.lightboxImageUrl);
  const storeTitle = useBoardStore((s) => s.lightboxTitle);
  const storeClose = useBoardStore((s) => s.closeLightbox);

  const imageUrl = propUrl !== undefined ? propUrl : storeUrl;
  const title = propTitle !== undefined ? propTitle : storeTitle;
  const onClose = propClose || storeClose;

  const [zoom, setZoom] = useState(1);
  const [prevUrl, setPrevUrl] = useState(imageUrl);

  if (prevUrl !== imageUrl) {
    setPrevUrl(imageUrl);
    setZoom(1);
  }

  useEffect(() => {
    if (!imageUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(z + 0.25, 3));
      } else if (e.key === '-') {
        setZoom((z) => Math.max(z - 0.25, 0.5));
      } else if (e.key === '0') {
        setZoom(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `gennety-photo-${Date.now()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div 
        className="absolute top-5 inset-x-6 flex items-center justify-between pointer-events-none z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-xl liquid-glass text-xs font-mono text-zinc-100 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="truncate max-w-xs">{title || 'Просмотр изображения'}</span>
        </div>

        {/* Floating Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-2xl liquid-glass shadow-2xl text-zinc-200">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="p-2 rounded-xl hover:bg-white/10 text-inherit transition-colors"
            title="Отдалить (-)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <button
            onClick={() => setZoom(1)}
            className="px-2.5 py-1 rounded-xl text-xs font-mono hover:bg-white/10 text-inherit transition-colors"
            title="Сбросить масштаб (100%)"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            className="p-2 rounded-xl hover:bg-white/10 text-inherit transition-colors"
            title="Приблизить (+)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <div className="w-[1px] h-4 bg-white/20 mx-1" />

          <button
            onClick={handleDownload}
            className="p-2 rounded-xl hover:bg-white/10 text-inherit transition-colors"
            title="Скачать фото"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-rose-500/20 hover:text-rose-300 text-inherit transition-colors"
            title="Закрыть (Esc)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div 
        className="max-w-[90vw] max-h-[85vh] overflow-auto flex items-center justify-center p-2 rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={title || 'Фото'}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="max-h-[80vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl transition-transform duration-150 cursor-grab active:cursor-grabbing"
        />
      </div>
    </div>
  );
};
