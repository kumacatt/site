import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Move,
  Maximize2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FullscreenLightboxProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  title?: string;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
}

export const FullscreenLightbox: React.FC<FullscreenLightboxProps> = ({
  isOpen,
  images,
  currentIndex,
  title,
  onClose,
  onSelectIndex,
}) => {
  const { lang } = useLanguage();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset transform when image changes or lightbox opens
  const resetTransform = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetTransform();
    }
  }, [isOpen, currentIndex, resetTransform]);

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        onSelectIndex((currentIndex - 1 + images.length) % images.length);
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        onSelectIndex((currentIndex + 1) % images.length);
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        resetTransform();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onSelectIndex, resetTransform]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  // Zoom Helpers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(5, Number((prev * 1.35).toFixed(2))));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(1, Number((prev / 1.35).toFixed(2)));
      if (next <= 1.05) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return next;
    });
  };

  const handleToggleZoom = () => {
    if (scale > 1.1) {
      resetTransform();
    } else {
      setScale(2.5);
    }
  };

  // Wheel Zoom (Mouse)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.833;
    setScale((prev) => {
      const next = Math.min(5, Math.max(1, Number((prev * zoomFactor).toFixed(2))));
      if (next <= 1.05) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return next;
    });
  };

  // Mouse Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Dragging & Pinch to Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    } else if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDistRef.current;
      const next = Math.min(5, Math.max(1, Number((initialPinchScaleRef.current * ratio).toFixed(2))));
      setScale(next);
      if (next <= 1.05) {
        setPan({ x: 0, y: 0 });
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    initialPinchDistRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center select-none overflow-hidden touch-none"
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Floating Bar: Title, Zoom info, Close button */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          {title && (
            <h2 className="text-white/90 text-sm sm:text-base font-mono font-medium truncate max-w-xs sm:max-w-md">
              {title}
            </h2>
          )}
          {images.length > 1 && (
            <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-mono text-amber-300">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onClose}
            title={lang === 'ru' ? 'Закрыть (Esc)' : 'Close (Esc)'}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-xs sm:text-sm transition-all shadow-xl active:scale-95"
          >
            <X size={16} />
            <span className="hidden sm:inline font-sans">{lang === 'ru' ? 'Закрыть' : 'Close'}</span>
            <span className="hidden sm:inline text-white/40 text-[10px]">ESC</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Artwork Stage */}
      <div
        className="w-full h-full flex items-center justify-center cursor-default"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleToggleZoom}
      >
        <img
          src={currentImage}
          alt={title || 'Artwork Preview'}
          draggable={false}
          className="max-w-[94vw] max-h-[88vh] object-contain select-none will-change-transform"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
        />
      </div>

      {/* Previous Image Chevron */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectIndex((currentIndex - 1 + images.length) % images.length);
          }}
          title={lang === 'ru' ? 'Предыдущее изображение (←)' : 'Previous (←)'}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-black/60 hover:bg-black/85 backdrop-blur-xl border border-white/20 hover:border-amber-400/50 flex items-center justify-center text-white/80 hover:text-white transition-all shadow-2xl active:scale-95"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Next Image Chevron */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectIndex((currentIndex + 1) % images.length);
          }}
          title={lang === 'ru' ? 'Следующее изображение (→)' : 'Next (→)'}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-black/60 hover:bg-black/85 backdrop-blur-xl border border-white/20 hover:border-amber-400/50 flex items-center justify-center text-white/80 hover:text-white transition-all shadow-2xl active:scale-95"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Bottom Floating Control Deck: Zoom, Pan Indicator, Reset */}
      <div className="absolute bottom-5 inset-x-0 z-30 flex flex-col items-center gap-3 pointer-events-none px-4">
        {/* Floating Pan Hint when zoomed */}
        {scale > 1 && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-mono text-amber-300 shadow-xl animate-fade-in pointer-events-auto">
            <Move size={12} />
            <span>{lang === 'ru' ? 'Зажмите и тяните для перемещения' : 'Click & drag to pan image'}</span>
          </div>
        )}

        {/* Zoom Control Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-neutral-950/85 backdrop-blur-2xl border border-white/20 shadow-2xl pointer-events-auto">
          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            title={lang === 'ru' ? 'Отдалить (-)' : 'Zoom out (-)'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 disabled:opacity-30 disabled:hover:bg-white/5 flex items-center justify-center text-white transition-colors active:scale-95"
          >
            <ZoomOut size={16} />
          </button>

          {/* Current Zoom Percentage Pill (Click resets) */}
          <button
            onClick={resetTransform}
            title={lang === 'ru' ? 'Сбросить зум (1:1)' : 'Reset zoom (1:1)'}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs sm:text-sm font-mono text-white/90 hover:text-white transition-colors"
          >
            {Math.round(scale * 100)}%
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            disabled={scale >= 5}
            title={lang === 'ru' ? 'Приблизить (+)' : 'Zoom in (+)'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 disabled:opacity-30 disabled:hover:bg-white/5 flex items-center justify-center text-white transition-colors active:scale-95"
          >
            <ZoomIn size={16} />
          </button>

          <div className="w-px h-6 bg-white/15 mx-1" />

          {/* Reset button */}
          <button
            onClick={resetTransform}
            title={lang === 'ru' ? 'Исходный размер' : 'Reset view'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors active:scale-95"
          >
            <RotateCcw size={16} />
          </button>

          {/* Double-click hint */}
          <div className="hidden md:flex items-center px-2.5 text-[11px] font-mono text-white/40">
            {lang === 'ru' ? '2× клик — зум' : '2× click to zoom'}
          </div>
        </div>

        {/* Thumbnail Navigation Strip (if multiple frames exist) */}
        {images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-[90vw] p-1.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 shadow-xl scrollbar-none pointer-events-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => onSelectIndex(idx)}
                className={`relative w-14 h-10 sm:w-16 sm:h-11 rounded-lg overflow-hidden border flex-shrink-0 transition-all ${
                  currentIndex === idx
                    ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105'
                    : 'border-white/15 opacity-60 hover:opacity-100 hover:border-white/40'
                }`}
              >
                <img src={img} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
