import React, { useEffect, useRef, useState } from 'react';
import { RealmType } from '../data/projects';

interface CustomCursorProps {
  currentRealm?: RealmType | null;
}

export const CustomCursor: React.FC<CustomCursorProps> = ({ currentRealm = 'gamedev' }) => {
  const reticleRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);

  const isDesign = currentRealm === 'design';

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let animFrameId: number;
    let targetX = -500;
    let targetY = -500;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!isVisible) setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest('button, a, input, [role="button"], .group, [data-interactive="true"]');
        setIsPointer(!!interactive);
      }
    };

    const updateLoop = () => {
      if (reticleRef.current) {
        reticleRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      }
      animFrameId = requestAnimationFrame(updateLoop);
    };

    animFrameId = requestAnimationFrame(updateLoop);

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      ref={reticleRef}
      className="pointer-events-none fixed top-0 left-0 z-50 transition-opacity duration-200"
      style={{
        opacity: isVisible ? 1 : 0,
        willChange: 'transform',
      }}
    >
      {isDesign ? (
        /* DESIGN REALM: Previous sleek circular minimal cursor (100% clean, no dither) */
        <>
          {/* Outer Smooth Circular Ring */}
          <div
            className="absolute rounded-full border border-purple-400/40 transition-all duration-200 ease-out"
            style={{
              width: isPointer ? 38 : 24,
              height: isPointer ? 38 : 24,
              transform: `translate3d(${isPointer ? -19 : -12}px, ${isPointer ? -19 : -12}px, 0)`,
              backgroundColor: isPointer ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
              backdropFilter: isPointer ? 'blur(1px)' : 'none',
            }}
          />
          {/* Inner Purple Pin Dot */}
          <div
            className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.9)]"
          />
        </>
      ) : (
        /* GAMEDEV REALM: Sharp Retro Pixel Reticle Pin */
        <>
          {/* Crisp Center Pixel Pin */}
          <div
            className="absolute -top-1 -left-1 w-2.5 h-2.5 transition-transform duration-100"
            style={{
              backgroundColor: '#f59e0b',
              boxShadow: '0 0 6px rgba(245, 158, 11, 0.95)',
              transform: isPointer ? 'scale(1.3)' : 'scale(1)',
              borderRadius: '1px',
            }}
          />

          {/* Dotted Reticle Target when hovering interactive elements */}
          <div
            className={`absolute -top-3.5 -left-3.5 w-7 h-7 border border-dashed border-amber-400/80 transition-all duration-150 ${
              isPointer ? 'opacity-90 scale-100' : 'opacity-0 scale-50'
            }`}
            style={{
              boxShadow: '0 0 8px rgba(245, 158, 11, 0.3)',
            }}
          />
        </>
      )}
    </div>
  );
};
