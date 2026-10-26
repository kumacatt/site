import React, { useEffect, useRef } from 'react';
import { RealmType } from '../data/projects';
import { getAssetUrl } from '../utils/asset';
import { GamedevDitherField } from './GamedevDitherField';
import { DesignRefractionField } from './DesignRefractionField';

interface AmbientBackgroundProps {
  currentRealm?: RealmType | null;
  isPaused?: boolean;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ currentRealm = 'gamedev', isPaused = false }) => {
  const gamedevVideoRef = useRef<HTMLVideoElement>(null);
  const designVideoRef = useRef<HTMLVideoElement>(null);
  const designCanvasRef = useRef<HTMLCanvasElement>(null);
  const scrollDimmerRef = useRef<HTMLDivElement>(null);

  // Dynamic scroll-based blur and rich darkening ("затемнение приличное такое")
  useEffect(() => {
    let ticking = false;

    const updateVisuals = () => {
      const scrollY = window.scrollY;
      // Reaches full effect over 600px of scrolling (past the hero)
      const scrollProgress = Math.min(1, Math.max(0, scrollY / 600));
      // Smooth cubic-like easing for natural depth transition
      const ease = scrollProgress * scrollProgress * (3 - 2 * scrollProgress);

      // Blur increases smoothly up to 24px
      const blurAmount = ease * 24;
      // Video brightness drops significantly from 0.65/0.70 down to 0.16/0.18
      const gamedevBrightness = Math.max(0.16, 0.65 - ease * 0.49);
      const designBrightness = Math.max(0.18, 0.70 - ease * 0.52);

      const gamedevFilter = `blur(${blurAmount.toFixed(1)}px) brightness(${gamedevBrightness.toFixed(2)}) saturate(1.2)`;
      const designFilter = `blur(${blurAmount.toFixed(1)}px) brightness(${designBrightness.toFixed(2)}) saturate(1.25)`;

      if (gamedevVideoRef.current) gamedevVideoRef.current.style.filter = gamedevFilter;
      if (designVideoRef.current) designVideoRef.current.style.filter = designFilter;
      if (designCanvasRef.current) designCanvasRef.current.style.filter = designFilter;

      // Darkening scrim smoothly reaches 0.82 opacity
      if (scrollDimmerRef.current) {
        scrollDimmerRef.current.style.opacity = (ease * 0.82).toFixed(3);
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateVisuals);
        ticking = true;
      }
    };

    // Apply initial state
    updateVisuals();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track previous realm for smooth fallback shockwaves
  const prevRealmRef = useRef<RealmType | null>(currentRealm);

  // Video play/pause management with visibility & modal pause support
  useEffect(() => {
    const syncPlayback = () => {
      const shouldPlay = !document.hidden && !isPaused;
      if (!shouldPlay) {
        gamedevVideoRef.current?.pause();
        designVideoRef.current?.pause();
        return;
      }

      if (currentRealm === 'design') {
        designVideoRef.current?.play().catch(() => {});
        gamedevVideoRef.current?.pause();
      } else {
        gamedevVideoRef.current?.play().catch(() => {});
        designVideoRef.current?.pause();
      }
    };

    syncPlayback();

    const handleVisibility = () => syncPlayback();
    document.addEventListener('visibilitychange', handleVisibility);

    if (prevRealmRef.current && prevRealmRef.current !== currentRealm) {
      window.dispatchEvent(
        new CustomEvent('kum-realm-transition', {
          detail: {
            toRealm: currentRealm,
            clientX: window.innerWidth * 0.5,
            clientY: 52,
          },
        })
      );
    }
    prevRealmRef.current = currentRealm;

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentRealm, isPaused]);

  const isDesign = currentRealm === 'design';

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

      {/* 2. Design Realm Video Stream (Source for WebGL Refraction) */}
      <video
        ref={designVideoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
      >
        <source src={getAssetUrl('/2_Polyana_F.mp4')} type="video/mp4" />
      </video>

      {/* 3. Realm Fields: Both remain mounted with cross-fading opacity for fluid transition shockwaves */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          !isDesign ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
        }`}
        style={{ willChange: 'opacity' }}
      >
        <GamedevDitherField active={!isDesign} isPaused={isPaused} />
      </div>

      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          isDesign ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
        }`}
        style={{ willChange: 'opacity' }}
      >
        <DesignRefractionField videoRef={designVideoRef} canvasRef={designCanvasRef} active={isDesign} isPaused={isPaused} />
      </div>

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

      {/* Scroll-based dynamic deep darkening overlay ("затемнение приличное такое") */}
      <div
        ref={scrollDimmerRef}
        className="absolute inset-0 bg-[#040407] pointer-events-none z-15 will-change-[opacity]"
        style={{ opacity: 0 }}
      />

      {/* Dark Vignette Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060609] via-transparent to-[#060609]/70" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#060609]/40 to-[#060609]/90" />
    </div>
  );
};
