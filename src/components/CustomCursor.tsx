import React, { useEffect, useRef, useState } from 'react';
import { RealmType } from '../data/projects';
import { getAssetUrl } from '../utils/asset';

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
    // Disable on touch devices
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

    // Tight 120 FPS loop updating CSS variables with 0ms lag
    const updateLoop = () => {
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

  // Radius is tight, sharp and defined (90px standard, 125px on interactive items)
  const radius = isPointer ? 125 : 90;

  return (
    <>
      {/* 1. PERMANENT BASE DITHER SCREEN (Always visible across background, sharp 2x2 square pixels) */}
      <div
        className="pointer-events-none fixed inset-0 z-20 overflow-hidden opacity-20"
        style={{
          backgroundImage: `url(${getAssetUrl('/dither-sharp.svg')})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '8px 8px',
          imageRendering: 'pixelated',
        }}
        aria-hidden="true"
      />

      {/* 2. TIGHT & SHARP INTERACTIVE DITHER SPOTLIGHT (Illuminates sharply around the mouse) */}
      <div
        ref={containerRef}
        className="pointer-events-none fixed inset-0 z-30 overflow-hidden transition-opacity duration-200"
        style={{
          opacity: isVisible ? 1 : 0,
          // Crisp, tight radial mask with sharp falloff (not overly diffuse)
          maskImage: `radial-gradient(circle ${radius}px at var(--mouse-x, -500px) var(--mouse-y, -500px), black 0%, black 50%, rgba(0,0,0,0.3) 80%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(circle ${radius}px at var(--mouse-x, -500px) var(--mouse-y, -500px), black 0%, black 50%, rgba(0,0,0,0.3) 80%, transparent 100%)`,
        }}
      >
        {/* Illuminated sharp Bayer pixels (2x2 square pixels) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${getAssetUrl('/dither-sharp-glow.svg')})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '8px 8px',
            imageRendering: 'pixelated',
          }}
        />

        {/* Ambient realm spotlight glow */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle ${radius * 0.9}px at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(${primaryRgba}, ${
              isPointer ? 0.32 : 0.22
            }) 0%, rgba(${primaryRgba}, 0.05) 65%, transparent 100%)`,
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* 3. RETRO PIXEL RETICLE CURSOR (Sharp 3px pixel square) */}
      {isVisible && (
        <div
          ref={reticleRef}
          className="pointer-events-none fixed top-0 left-0 z-50"
          style={{ willChange: 'transform' }}
        >
          {/* Sharp Pixel Pin (No blur, crisp retro square) */}
          <div
            className="absolute -top-1 -left-1 w-2.5 h-2.5 transition-transform duration-100"
            style={{
              backgroundColor: `rgb(${primaryRgba})`,
              boxShadow: `0 0 6px rgba(${primaryRgba}, 0.95)`,
              transform: isPointer ? 'scale(1.3)' : 'scale(1)',
              imageRendering: 'pixelated',
            }}
          />

          {/* Dotted Reticle Border when hovering interactive elements */}
          <div
            className={`absolute -top-3.5 -left-3.5 w-7 h-7 border border-dashed transition-all duration-150 ${
              isPointer ? 'opacity-85 scale-100' : 'opacity-0 scale-50'
            }`}
            style={{
              borderColor: `rgba(${primaryRgba}, 0.8)`,
              boxShadow: `0 0 8px rgba(${primaryRgba}, 0.3)`,
            }}
          />
        </div>
      )}
    </>
  );
};
