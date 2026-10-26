import React, { useEffect, useRef } from 'react';
import { RealmType } from '../data/projects';
import { getAssetUrl } from '../utils/asset';
import { GamedevDitherField } from './GamedevDitherField';
import { DesignRefractionField } from './DesignRefractionField';

interface AmbientBackgroundProps {
  currentRealm?: RealmType | null;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ currentRealm = 'gamedev' }) => {
  const gamedevVideoRef = useRef<HTMLVideoElement>(null);
  const designVideoRef = useRef<HTMLVideoElement>(null);

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

      {/* 3. Realm Fields: GameDev Retro Bayer Dither vs Design Full-Res WebGL Refraction */}
      {!isDesign && <GamedevDitherField />}
      {isDesign && <DesignRefractionField videoRef={designVideoRef} />}

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
