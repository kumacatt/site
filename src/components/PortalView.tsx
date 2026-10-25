import React, { useState, useEffect } from 'react';
import { RealmType } from '../data/projects';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';
import { LanguageSwitch } from './LanguageSwitch';

// Lightweight, web-optimized versions (1920px max dimension, 150-500KB)
// Decodes in 2-3ms instead of choking GPU memory with 77-megapixel raw print files!
const GAMEDEV_PORTAL_ARTWORKS = [
  '/1_fragile_screen (1).jpg',
  '/1_fragile_screen (2).jpg',
  '/1_fragile_screen (3).jpg',
  '/1_Sinclair_web.jpg',
  '/1_speedsculpt_jab_P.png',
  '/1_speedsculpt_mushroom.png',
  '/1_fumel_web.jpg',
  '/1_whintercore_web.jpg',
  '/1_fishing_web.jpg',
  '/1_nitted_P.png',
  '/1_gamepromo_cover.png',
  '/1_MORPHINBeta_web.jpg'
];

const DESIGN_PORTAL_ARTWORKS = [
  '/2_kashtan_web.jpg',
  '/2_kashtan3doffice_P.png',
  '/2_Polyana_web.jpg',
  '/2_env_web.jpg',
  '/2_sity_env.png',
  '/2_blender-work_web.jpg'
];

interface PortalViewProps {
  onSelectRealm: (realm: RealmType) => void;
}

// Memory-efficient slide layer: only holds CURRENT and (during 1s transition) PREVIOUS image in VRAM
const PortalSlideLayer: React.FC<{
  images: string[];
  intervalMs?: number;
  hovered: boolean;
  alt: string;
}> = ({ images, intervalMs = 3000, hovered, alt }) => {
  const [currentIdx, setCurrentIdx] = useState(() => Math.floor(Math.random() * images.length));
  const [prevIdx, setPrevIdx] = useState<number | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIdx(current => {
        setPrevIdx(current);
        return (current + 1) % images.length;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [images.length, intervalMs]);

  // Clean up previous image texture from GPU after crossfade finishes (1000ms)
  useEffect(() => {
    if (prevIdx !== null) {
      const cleanTimer = setTimeout(() => {
        setPrevIdx(null);
      }, 1050);
      return () => clearTimeout(cleanTimer);
    }
  }, [prevIdx, currentIdx]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 1. Previous image fading out over 1000ms */}
      {prevIdx !== null && (
        <img
          key={`prev-${images[prevIdx]}`}
          src={images[prevIdx]}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out opacity-0 ${
            hovered
              ? 'scale-105 filter grayscale-0 brightness-85'
              : 'scale-100 filter grayscale-[80%] brightness-40'
          }`}
          style={{ willChange: 'opacity' }}
        />
      )}

      {/* 2. Current active image smoothly fading in */}
      <img
        key={`curr-${images[currentIdx]}`}
        src={images[currentIdx]}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-in-out ${
          hovered
            ? 'opacity-100 scale-105 filter grayscale-0 brightness-85 z-10'
            : 'opacity-60 scale-100 filter grayscale-[80%] brightness-40 z-10'
        }`}
        style={{ willChange: 'opacity, transform, filter' }}
      />
    </div>
  );
};

export const PortalView: React.FC<PortalViewProps> = ({ onSelectRealm }) => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.portal;
  const [hovered, setHovered] = useState<RealmType | null>(null);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050507] flex flex-col md:flex-row select-none">
      {/* Top Brand Name */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-30 pointer-events-none">
        <h1 className="text-sm md:text-base font-bold tracking-widest text-white uppercase font-sans">
          {t.name[lang]}
        </h1>
        <p className="text-[10px] font-mono tracking-wider text-white/40 uppercase mt-0.5">
          {t.portfolio[lang]}
        </p>
      </div>

      {/* Top right language switch and hints */}
      <div className="absolute top-6 right-6 md:top-8 md:right-8 z-30 flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-white/30 pointer-events-none">
          <span>#gamedev</span>
          <span>•</span>
          <span>#design</span>
        </div>
        <LanguageSwitch />
      </div>

      {/* LEFT HALF: Gamedev / CG (Cycling full artworks every 3s at 60 FPS) */}
      <div
        onMouseEnter={() => setHovered('gamedev')}
        onMouseLeave={() => setHovered(null)}
        onClick={() => onSelectRealm('gamedev')}
        className={`group relative h-1/2 md:h-full cursor-pointer overflow-hidden flex flex-col justify-end p-8 md:p-14 border-b md:border-b-0 md:border-r border-white/10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hovered === 'gamedev'
            ? 'md:flex-[1.5]'
            : hovered === 'design'
            ? 'md:flex-[0.85] opacity-40'
            : 'md:flex-1'
        }`}
      >
        {/* Memory-efficient crossfade layer */}
        <PortalSlideLayer
          images={GAMEDEV_PORTAL_ARTWORKS}
          intervalMs={3000}
          hovered={hovered === 'gamedev'}
          alt="Gamedev & CG"
        />

        {/* Dreamlike tint */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/30 to-transparent transition-opacity duration-700 z-20 ${
            hovered === 'gamedev' ? 'opacity-70' : 'opacity-90'
          }`}
        />
        {hovered === 'gamedev' && (
          <div className="absolute bottom-1/3 left-1/3 w-96 h-96 rounded-full bg-amber-500/20 blur-[130px] pointer-events-none animate-pulse z-20" />
        )}

        {/* Content Block */}
        <div className="relative z-20 space-y-2">
          <span className="text-[11px] font-mono tracking-widest text-amber-300 uppercase block">
            {t.realm1[lang]}
          </span>

          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight uppercase transition-colors group-hover:text-amber-200">
              {t.realm1Title[lang]}
            </h2>
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 group-hover:text-white group-hover:border-amber-400 group-hover:bg-amber-500/20 transition-all flex-shrink-0 ml-4">
              <ArrowUpRight size={18} />
            </div>
          </div>

          <p className="text-xs sm:text-sm font-mono text-white/60 max-w-sm">
            {t.realm1Desc[lang]}
          </p>
        </div>
      </div>

      {/* RIGHT HALF: Дизайн / Айдентика (Cycling full artworks every 3s at 60 FPS) */}
      <div
        onMouseEnter={() => setHovered('design')}
        onMouseLeave={() => setHovered(null)}
        onClick={() => onSelectRealm('design')}
        className={`group relative h-1/2 md:h-full cursor-pointer overflow-hidden flex flex-col justify-end p-8 md:p-14 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hovered === 'design'
            ? 'md:flex-[1.5]'
            : hovered === 'gamedev'
            ? 'md:flex-[0.85] opacity-40'
            : 'md:flex-1'
        }`}
      >
        {/* Memory-efficient crossfade layer */}
        <PortalSlideLayer
          images={DESIGN_PORTAL_ARTWORKS}
          intervalMs={3000}
          hovered={hovered === 'design'}
          alt="Дизайн"
        />

        {/* Dreamlike tint */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/30 to-transparent transition-opacity duration-700 z-20 ${
            hovered === 'design' ? 'opacity-70' : 'opacity-90'
          }`}
        />
        {hovered === 'design' && (
          <div className="absolute top-1/3 right-1/3 w-96 h-96 rounded-full bg-purple-600/20 blur-[130px] pointer-events-none animate-pulse z-20" />
        )}

        {/* Content Block */}
        <div className="relative z-20 space-y-2">
          <span className="text-[11px] font-mono tracking-widest text-purple-300 uppercase block">
            {t.realm2[lang]}
          </span>

          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight uppercase transition-colors group-hover:text-purple-200">
              {t.realm2Title[lang]}
            </h2>
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 group-hover:text-white group-hover:border-purple-400 group-hover:bg-purple-500/20 transition-all flex-shrink-0 ml-4">
              <ArrowUpRight size={18} />
            </div>
          </div>

          <p className="text-xs sm:text-sm font-mono text-white/60 max-w-sm">
            {t.realm2Desc[lang]}
          </p>
        </div>
      </div>
    </div>
  );
};
