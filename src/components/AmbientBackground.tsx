import React, { useEffect, useRef } from 'react';
import { RealmType } from '../data/projects';
import { getAssetUrl } from '../utils/asset';

interface AmbientBackgroundProps {
  currentRealm?: RealmType | null;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ currentRealm = 'gamedev' }) => {
  const gamedevVideoRef = useRef<HTMLVideoElement>(null);
  const designVideoRef = useRef<HTMLVideoElement>(null);
  const ditherRef = useRef<HTMLDivElement>(null);

  // Dynamic scroll-based subtle blur for surreal depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const blurAmount = Math.min(18, scrollY * 0.025);
      const gamedevFilter = `blur(${blurAmount}px) brightness(0.65) saturate(1.2)`;
      const designFilter = `blur(${blurAmount}px) brightness(0.70) saturate(1.25)`;
      if (gamedevVideoRef.current) gamedevVideoRef.current.style.filter = gamedevFilter;
      if (designVideoRef.current) designVideoRef.current.style.filter = designFilter;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Ensure playback starts reliably on mount and realm switch
  useEffect(() => {
    if (currentRealm === 'design' && designVideoRef.current) {
      designVideoRef.current.play().catch(() => {});
    } else if (gamedevVideoRef.current) {
      gamedevVideoRef.current.play().catch(() => {});
    }
  }, [currentRealm]);

  const isDesign = currentRealm === 'design';

  // Fast 120 FPS mouse tracking for the Gamedev analog dither spotlight
  useEffect(() => {
    if (isDesign) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let animFrameId: number;
    let targetX = -500;
    let targetY = -500;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const updateLoop = () => {
      if (ditherRef.current) {
        ditherRef.current.style.setProperty('--bg-mouse-x', `${targetX}px`);
        ditherRef.current.style.setProperty('--bg-mouse-y', `${targetY}px`);
      }
      animFrameId = requestAnimationFrame(updateLoop);
    };

    animFrameId = requestAnimationFrame(updateLoop);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDesign]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#060609]">
      {/* 1. Gamedev Realm Video */}
      <video
        ref={gamedevVideoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
          !isDesign ? 'opacity-60' : 'opacity-0'
        }`}
        style={{ willChange: 'opacity, filter' }}
      >
        <source src={getAssetUrl('/bg-video.mp4')} type="video/mp4" />
      </video>

      {/* 2. Design Realm Video (From project "Поляна" - 100% clean, no dither) */}
      <video
        ref={designVideoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
          isDesign ? 'opacity-65' : 'opacity-0'
        }`}
        style={{ willChange: 'opacity, filter' }}
      >
        <source src={getAssetUrl('/2_Polyana_F.mp4')} type="video/mp4" />
      </video>

      {/* 3. GAMEDEV EXCLUSIVE: Analog Stepped Dither Spotlight strictly on background (Behind content z-10) */}
      {!isDesign && (
        <div ref={ditherRef} className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
          {/* Permanent Base 8x8 Dither: Crisp 2x2 square pixels visible everywhere in background */}
          <div
            className="absolute inset-0 opacity-16"
            style={{
              backgroundImage: `url(${getAssetUrl('/dither-sharp.svg')})`,
              backgroundRepeat: 'repeat',
              backgroundSize: '8px 8px',
              imageRendering: 'pixelated',
            }}
          />

          {/* Stepped Analog Spotlight: Tight 65px radius with sharp stepped discrete rings */}
          <div
            className="absolute inset-0"
            style={{
              maskImage: `radial-gradient(circle 65px at var(--bg-mouse-x, -500px) var(--bg-mouse-y, -500px), 
                black 0px, 
                black 20px, 
                rgba(0,0,0,0.65) 20px, 
                rgba(0,0,0,0.65) 42px, 
                rgba(0,0,0,0.2) 42px, 
                rgba(0,0,0,0.2) 65px, 
                transparent 65px)`,
              WebkitMaskImage: `radial-gradient(circle 65px at var(--bg-mouse-x, -500px) var(--bg-mouse-y, -500px), 
                black 0px, 
                black 20px, 
                rgba(0,0,0,0.65) 20px, 
                rgba(0,0,0,0.65) 42px, 
                rgba(0,0,0,0.2) 42px, 
                rgba(0,0,0,0.2) 65px, 
                transparent 65px)`,
            }}
          >
            {/* Luminous Bayer dither pixels */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${getAssetUrl('/dither-sharp-glow.svg')})`,
                backgroundRepeat: 'repeat',
                backgroundSize: '8px 8px',
                imageRendering: 'pixelated',
              }}
            />
            {/* Stepped warm amber beam */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle 60px at var(--bg-mouse-x, -500px) var(--bg-mouse-y, -500px), 
                  rgba(245, 158, 11, 0.38) 0px, 
                  rgba(245, 158, 11, 0.22) 20px, 
                  rgba(245, 158, 11, 0.08) 42px, 
                  transparent 60px)`,
                mixBlendMode: 'screen',
              }}
            />
          </div>
        </div>
      )}

      {/* Dreamlike Ambient Color Orbs matching the active realm */}
      <div
        className={`absolute top-1/4 left-1/5 w-[500px] h-[500px] rounded-full blur-[160px] transition-colors duration-1000 animate-pulse ${
          isDesign ? 'bg-purple-600/15' : 'bg-cyan-600/10'
        }`}
      />
      <div
        className={`absolute bottom-1/3 right-1/6 w-[600px] h-[600px] rounded-full blur-[170px] transition-colors duration-1000 animate-pulse ${
          isDesign ? 'bg-pink-600/15' : 'bg-amber-500/15'
        }`}
      />

      {/* Dark Vignette Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060609] via-transparent to-[#060609]/70" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#060609]/40 to-[#060609]/90" />
    </div>
  );
};
