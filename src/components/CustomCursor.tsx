import React, { useEffect, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only enable on desktop with fine pointer
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest('button, a, input, [role="button"], .group');
        setIsPointer(!!interactive);
      }
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Outer Glow Ring */}
      <div
        className="fixed top-0 left-0 rounded-full border border-amber-400/30 transition-transform duration-200 ease-out pointer-events-none"
        style={{
          width: isPointer ? 48 : 28,
          height: isPointer ? 48 : 28,
          transform: `translate3d(${pos.x - (isPointer ? 24 : 14)}px, ${
            pos.y - (isPointer ? 24 : 14)
          }px, 0)`,
          backgroundColor: isPointer ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
          backdropFilter: isPointer ? 'blur(2px)' : 'none'
        }}
      />
      {/* Inner Pin Dot */}
      <div
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)] pointer-events-none"
        style={{
          transform: `translate3d(${pos.x - 4}px, ${pos.y - 4}px, 0)`
        }}
      />
    </div>
  );
};
