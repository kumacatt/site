import React, { useState, useEffect, useRef } from 'react';
import { RealmType } from '../data/projects';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';
import { LanguageSwitch } from './LanguageSwitch';
import { getAssetUrl } from '../utils/asset';

// 4x4 Bayer Matrix for Ordered Dithering
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// Lightweight, web-optimized versions (1920px max dimension, 150-500KB)
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
].map(getAssetUrl);

const DESIGN_PORTAL_ARTWORKS = [
  '/2_kashtan_web.jpg',
  '/2_kashtan3doffice_P.png',
  '/2_Polyana_web.jpg',
  '/2_env_web.jpg',
  '/2_sity_env.png',
  '/2_blender-work_web.jpg'
].map(getAssetUrl);

interface PortalViewProps {
  onSelectRealm: (realm: RealmType) => void;
}

// Memory-efficient two-slot slide layer with persistent DOM nodes and 1000ms CSS crossfades
const PortalSlideLayer: React.FC<{
  images: string[];
  startIndex?: number;
  intervalMs?: number;
  hovered: boolean;
  alt: string;
}> = ({ images, startIndex = 0, intervalMs = 3000, hovered, alt }) => {
  useEffect(() => {
    images.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);

  const safeStart = startIndex >= 0 && startIndex < images.length ? startIndex : 0;
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [srcA, setSrcA] = useState(images[safeStart]);
  const [srcB, setSrcB] = useState(images[(safeStart + 1) % images.length]);

  const nextIdxRef = useRef((safeStart + 1) % images.length);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setActiveSlot(prevSlot => {
        if (prevSlot === 'A') {
          timeoutRef.current = window.setTimeout(() => {
            const nextIdx = (nextIdxRef.current + 1) % images.length;
            nextIdxRef.current = nextIdx;
            setSrcA(images[nextIdx]);
          }, 1100);
          return 'B';
        } else {
          timeoutRef.current = window.setTimeout(() => {
            const nextIdx = (nextIdxRef.current + 1) % images.length;
            nextIdxRef.current = nextIdx;
            setSrcB(images[nextIdx]);
          }, 1100);
          return 'A';
        }
      });
    }, intervalMs);

    return () => {
      clearInterval(timer);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [images, intervalMs]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden transition-all duration-700 ease-out ${
        hovered
          ? 'scale-105 filter grayscale-0 brightness-90 opacity-100'
          : 'scale-100 filter grayscale-[80%] brightness-45 opacity-70'
      }`}
      style={{ willChange: 'transform, filter, opacity' }}
    >
      <img
        src={srcA}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out ${
          activeSlot === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0'
        }`}
        style={{ willChange: 'opacity' }}
      />
      <img
        src={srcB}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out ${
          activeSlot === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0'
        }`}
        style={{ willChange: 'opacity' }}
      />
    </div>
  );
};

// =========================================================================
// 1. GAMEDEV INTERACTIVE BAYER DITHER OVERLAY (Tactile Cyber-Analog Energy)
// =========================================================================
const PortalDitherCanvas: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -100, y: -100, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const PIXEL_SCALE = 3;
    let w = 0;
    let h = 0;
    let imageData: ImageData | null = null;
    let buf32: Uint32Array | null = null;

    let targetGlow = 0;
    let currentGlow = 0;
    let ripplePhase = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.ceil(rect.width / PIXEL_SCALE);
      h = Math.ceil(rect.height / PIXEL_SCALE);
      canvas.width = w;
      canvas.height = h;
      imageData = ctx.createImageData(w, h);
      buf32 = new Uint32Array(imageData.data.buffer);
    };

    resize();
    window.addEventListener('resize', resize);

    const makeColor = (r: number, g: number, b: number, a: number) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / PIXEL_SCALE;
      mouseRef.current.y = (e.clientY - rect.top) / PIXEL_SCALE;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseLeave);
    }

    const render = () => {
      targetGlow = active ? 1.0 : 0.0;
      currentGlow += (targetGlow - currentGlow) * 0.08;
      ripplePhase += 0.04;

      if (!buf32 || !imageData) {
        animId = requestAnimationFrame(render);
        return;
      }

      if (currentGlow < 0.01 && !mouseRef.current.active) {
        buf32.fill(0);
        ctx.clearRect(0, 0, w, h);
        animId = requestAnimationFrame(render);
        return;
      }

      buf32.fill(0);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const mActive = mouseRef.current.active;

      for (let cy = 0; cy < h; cy++) {
        const by = cy % 4;
        const bRow = BAYER_4X4[by];
        const rowOffset = cy * w;

        for (let cx = 0; cx < w; cx++) {
          const bayerThresh = bRow[cx % 4] / 16.0;
          let intensity = 0;

          // Mouse spotlight in Bayer matrix
          if (mActive) {
            const dx = cx - mx;
            const dy = cy - my;
            const dist = Math.hypot(dx, dy);
            const radius = 110;
            if (dist < radius) {
              const falloff = 1.0 - dist / radius;
              // Concentric ripple rings
              const ripple = Math.sin(dist * 0.15 - ripplePhase * 2.0) * 0.15;
              intensity += Math.pow(Math.max(0, falloff + ripple), 1.6) * 1.1 * currentGlow;
            }
          }

          // Subtle idle breathing grid
          const ambient = Math.sin(ripplePhase + (cx * 0.06 + cy * 0.06)) * 0.03 * currentGlow;
          intensity += ambient;

          let pixel = 0;
          if (intensity > 0.02) {
            const shaped = Math.pow(Math.min(1.0, intensity), 1.3);
            if (shaped > bayerThresh) {
              // Warm amber to golden core
              const isCore = shaped > 0.65;
              const r = isCore ? 253 : 245;
              const g = isCore ? 224 : 158;
              const b = isCore ? 71 : 11;
              const alpha = Math.min(235, Math.floor(60 + shaped * 175));
              pixel = makeColor(r, g, b, alpha);
            }
          }

          if (pixel !== 0) {
            buf32[rowOffset + cx] = pixel;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-20 mix-blend-screen transition-opacity duration-500 ${
        active ? 'opacity-90' : 'opacity-0'
      }`}
      style={{ imageRendering: 'pixelated' }}
      aria-hidden="true"
    />
  );
};

// =========================================================================
// 2. DESIGN INTERACTIVE LIQUID REFRACTION OVERLAY (Silky Optical Glass Caustics)
// =========================================================================
const PortalRefractionCanvas: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean; prevX: number; prevY: number }>({
    x: -100,
    y: -100,
    prevX: -100,
    prevY: -100,
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0;
    let h = 0;

    interface Ripple {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      speed: number;
      life: number;
    }

    const ripples: Ripple[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.round(rect.width);
      h = Math.round(rect.height);
      canvas.width = w;
      canvas.height = h;
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.active = true;

      const dist = Math.hypot(x - mouseRef.current.prevX, y - mouseRef.current.prevY);
      if (dist > 8 && ripples.length < 16) {
        ripples.push({
          x,
          y,
          radius: 4,
          maxRadius: 80 + Math.random() * 50,
          speed: 1.8 + Math.random() * 1.2,
          life: 1.0,
        });
        mouseRef.current.prevX = x;
        mouseRef.current.prevY = y;
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseLeave);
    }

    const render = () => {
      ctx.clearRect(0, 0, w, h);

      if (active || ripples.length > 0) {
        // Draw fluid liquid glass caustic ripples
        for (let i = ripples.length - 1; i >= 0; i--) {
          const r = ripples[i];
          r.radius += r.speed;
          r.life -= 0.025;

          if (r.life <= 0 || r.radius >= r.maxRadius) {
            ripples.splice(i, 1);
            continue;
          }

          // Luminous liquid chromatic prism caustics (cyan, magenta, white)
          const alpha = r.life * 0.45;

          // Outer cyan refraction fringe
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius + 2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.5})`;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Core glossy white/violet refraction glint
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(236, 72, 153, ${alpha * 0.6})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Highlight crest
          ctx.beginPath();
          ctx.arc(r.x, r.y, Math.max(1, r.radius - 1.5), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Spotlight water sheen directly under cursor
        if (mouseRef.current.active && active) {
          const mx = mouseRef.current.x;
          const my = mouseRef.current.y;
          const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 120);
          grad.addColorStop(0, 'rgba(168, 85, 247, 0.28)');
          grad.addColorStop(0.5, 'rgba(236, 72, 153, 0.12)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(mx, my, 120, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-20 transition-opacity duration-500 filter blur-[0.5px] ${
        active ? 'opacity-90' : 'opacity-0'
      }`}
      aria-hidden="true"
    />
  );
};

// =========================================================================
// MAIN PORTAL VIEW COMPONENT
// =========================================================================
export const PortalView: React.FC<PortalViewProps> = ({ onSelectRealm }) => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.portal;
  const [hovered, setHovered] = useState<RealmType | null>(null);

  const randomGamedevStart = React.useMemo(
    () => Math.floor(Math.random() * GAMEDEV_PORTAL_ARTWORKS.length),
    []
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050507] flex flex-col md:flex-row select-none">
      {/* Top Brand Name — Uses Gropled-Bold (font-sans) for Design by default */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-30 pointer-events-none space-y-1">
        <h1
          className={`text-base md:text-xl uppercase transition-all duration-300 ${
            hovered === 'gamedev'
              ? 'font-heading font-normal tracking-wide text-amber-300'
              : 'font-sans font-black tracking-tight text-white'
          }`}
        >
          {hovered === 'gamedev'
            ? t.realm1Title[lang]
            : lang === 'ru'
            ? 'Дизайн и айдентика'
            : 'Design & Identity'}
        </h1>
        <p className="text-[11px] font-mono tracking-wider text-white/50 uppercase">
          {t.name[lang]} • {t.portfolio[lang]}
        </p>
      </div>

      {/* Top right language switch and realm tags */}
      <div className="absolute top-6 right-6 md:top-8 md:right-8 z-30 flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-white/35 pointer-events-none">
          <span className={hovered === 'gamedev' ? 'text-amber-300 font-bold' : ''}>#gamedev</span>
          <span>•</span>
          <span className={hovered === 'design' ? 'text-purple-300 font-bold' : ''}>#design</span>
        </div>
        <LanguageSwitch />
      </div>

      {/* ========================================================================= */}
      {/* LEFT HALF: Gamedev / CG (With Interactive Bayer Dithering Matrix Field)   */}
      {/* ========================================================================= */}
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
          startIndex={randomGamedevStart}
          intervalMs={3000}
          hovered={hovered === 'gamedev'}
          alt="Gamedev & CG"
        />

        {/* Interactive Bayer Dithering Canvas Overlay */}
        <PortalDitherCanvas active={hovered === 'gamedev'} />

        {/* Dreamlike atmospheric tint */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/30 to-transparent transition-opacity duration-700 z-10 ${
            hovered === 'gamedev' ? 'opacity-70' : 'opacity-90'
          }`}
        />
        {hovered === 'gamedev' && (
          <div className="absolute bottom-1/3 left-1/3 w-96 h-96 rounded-full bg-amber-500/20 blur-[130px] pointer-events-none animate-pulse z-10" />
        )}

        {/* Content Block */}
        <div className="relative z-20 space-y-2">
          <span className="text-[11px] font-mono tracking-widest text-amber-300 uppercase block font-medium">
            {t.realm1[lang]}
          </span>

          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal text-white tracking-wide uppercase transition-colors group-hover:text-amber-200 font-heading">
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

      {/* ========================================================================= */}
      {/* RIGHT HALF: Дизайн / Айдентика (With Interactive Liquid Glass Refraction) */}
      {/* ========================================================================= */}
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

        {/* Interactive Liquid Refraction Canvas Overlay */}
        <PortalRefractionCanvas active={hovered === 'design'} />

        {/* Dreamlike atmospheric tint */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/30 to-transparent transition-opacity duration-700 z-10 ${
            hovered === 'design' ? 'opacity-70' : 'opacity-90'
          }`}
        />
        {hovered === 'design' && (
          <div className="absolute top-1/3 right-1/3 w-96 h-96 rounded-full bg-purple-600/20 blur-[130px] pointer-events-none animate-pulse z-10" />
        )}

        {/* Content Block */}
        <div className="relative z-20 space-y-2">
          <span className="text-[11px] font-mono tracking-widest text-purple-300 uppercase block font-medium">
            {t.realm2[lang]}
          </span>

          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight uppercase transition-colors group-hover:text-purple-200 font-sans">
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
