import React, { useEffect, useRef, useState } from 'react';
import { RealmType } from '../data/projects';

interface CustomCursorProps {
  currentRealm?: RealmType | null;
}

export const CustomCursor: React.FC<CustomCursorProps> = ({ currentRealm = 'gamedev' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);

  const isDesign = currentRealm === 'design';
  // Amber for Gamedev / Portal, Violet for Design
  const primaryRgba = isDesign ? '168, 85, 247' : '245, 158, 11';

  useEffect(() => {
    // Disable on mobile/touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let animFrameId: number;
    let targetX = -500;
    let targetY = -500;
    let currentX = -500;
    let currentY = -500;

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

    // Smooth 120 FPS animation loop for dither spotlight
    const updateLoop = () => {
      // Smooth lerp for fluid tracking
      currentX += (targetX - currentX) * 0.35;
      currentY += (targetY - currentY) * 0.35;

      if (containerRef.current) {
        containerRef.current.style.setProperty('--mouse-x', `${targetX}px`);
        containerRef.current.style.setProperty('--mouse-y', `${targetY}px`);
      }

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

  const radius = isPointer ? 210 : 160;

  return (
    <>
      {/* 1. DYNAMIC MOUSE-REACTIVE DITHER FIELD (Illuminates under cursor) */}
      <div
        ref={containerRef}
        className="pointer-events-none fixed inset-0 z-40 overflow-hidden transition-opacity duration-300"
        style={{
          opacity: isVisible ? 1 : 0,
          maskImage: `radial-gradient(circle ${radius}px at var(--mouse-x, -500px) var(--mouse-y, -500px), black 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.15) 75%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(circle ${radius}px at var(--mouse-x, -500px) var(--mouse-y, -500px), black 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.15) 75%, transparent 100%)`,
        }}
      >
        {/* Soft ambient spotlight glow */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle ${radius * 0.9}px at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(${primaryRgba}, ${
              isPointer ? 0.20 : 0.12
            }) 0%, rgba(${primaryRgba}, 0.03) 65%, transparent 100%)`,
          }}
        />

        {/* Luminous Bayer Dither Grid (dots brighten up under mouse) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, ${
              isPointer ? 0.8 : 0.55
            }) 1px, transparent 0), radial-gradient(rgba(${primaryRgba}, ${
              isPointer ? 0.9 : 0.7
            }) 1px, transparent 0)`,
            backgroundPosition: '0 0, 2px 2px',
            backgroundSize: '4px 4px',
            imageRendering: 'pixelated',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* 2. PRECISION MINIMAL PIN RETICLE (Replaces old yellow circle) */}
      <div
        ref={reticleRef}
        className="pointer-events-none fixed top-0 left-0 z-50 transition-opacity duration-200"
        style={{
          opacity: isVisible ? 1 : 0,
          willChange: 'transform',
        }}
      >
        {/* Crisp Center Pin Dot */}
        <div
          className="absolute -top-1 -left-1 w-2 h-2 rounded-full transition-transform duration-150"
          style={{
            backgroundColor: `rgb(${primaryRgba})`,
            boxShadow: `0 0 8px rgba(${primaryRgba}, 0.9)`,
            transform: isPointer ? 'scale(1.3)' : 'scale(1)',
          }}
        />

        {/* Subtle Interactive Targeting Ring on Hover */}
        <div
          className={`absolute -top-3.5 -left-3.5 w-7 h-7 rounded-full border border-dashed transition-all duration-200 ${
            isPointer ? 'opacity-80 scale-100' : 'opacity-0 scale-50'
          }`}
          style={{
            borderColor: `rgba(${primaryRgba}, 0.65)`,
            boxShadow: `0 0 10px rgba(${primaryRgba}, 0.25)`,
          }}
        />
      </div>
    </>
  );
};
