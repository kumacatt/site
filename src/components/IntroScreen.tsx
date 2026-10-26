import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';
import { LanguageSwitch } from './LanguageSwitch';
import { RealmType } from '../data/projects';

// 4x4 Bayer Matrix for Ordered Dithering
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// Scale factor for crisp retro dither pixels
const PIXEL_SCALE = 3;

interface PlasmaNode {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  phase: number;
  r: number;
  g: number;
  b: number;
}

interface IntroScreenProps {
  onEnter: (targetRealm?: RealmType) => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onEnter }) => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.intro;

  const ditherCanvasRef = useRef<HTMLCanvasElement>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement>(null);

  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false,
  });

  const plasmaRef = useRef<PlasmaNode[]>([]);
  const animFrameRef = useRef<number>();
  const [isFading, setIsFading] = useState(false);
  const isFadingRef = useRef(false);

  // Dynamic Scroll Accumulator & Glow feedback
  const scrollEnergyRef = useRef(0);
  const currentGlowRef = useRef(0);

  // Trigger enter smoothly with dither dissolve
  const handleProceed = (targetRealm?: RealmType) => {
    if (isFadingRef.current) return;
    isFadingRef.current = true;
    setIsFading(true);
    setTimeout(() => {
      onEnter(targetRealm);
    }, 700);
  };

  // Requires a bit stronger/firmer scrolling to skip, charging dither energy as you scroll
  const addScrollDelta = (delta: number) => {
    if (isFadingRef.current) return;
    const SCROLL_THRESHOLD = 340; // Decisive scroll threshold
    scrollEnergyRef.current = Math.min(1.2, scrollEnergyRef.current + delta / SCROLL_THRESHOLD);
    if (scrollEnergyRef.current >= 1.0) {
      handleProceed();
    }
  };

  // Keyboard, Click, Wheel, and Touch listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key) {
        handleProceed();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaY) + Math.abs(e.deltaX) * 0.5;
      addScrollDelta(delta);
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const currentY = e.touches[0].clientY;
        const diff = Math.abs(currentY - touchStartY);
        touchStartY = currentY;
        addScrollDelta(diff * 1.8);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Dual Canvas Engine: Dithering + Frosted Blur Synergy (Moody Dark Void Aesthetic)
  useEffect(() => {
    const ditherCanvas = ditherCanvasRef.current;
    const blurCanvas = blurCanvasRef.current;
    if (!ditherCanvas || !blurCanvas) return;

    const ditherCtx = ditherCanvas.getContext('2d', { alpha: true });
    const blurCtx = blurCanvas.getContext('2d', { alpha: true });
    if (!ditherCtx || !blurCtx) return;

    let canvasW = 0;
    let canvasH = 0;
    let imageData: ImageData | null = null;
    let buf32: Uint32Array | null = null;

    const resize = () => {
      blurCanvas.width = Math.ceil(window.innerWidth / 2);
      blurCanvas.height = Math.ceil(window.innerHeight / 2);

      canvasW = Math.ceil(window.innerWidth / PIXEL_SCALE);
      canvasH = Math.ceil(window.innerHeight / PIXEL_SCALE);
      ditherCanvas.width = canvasW;
      ditherCanvas.height = canvasH;
      imageData = ditherCtx.createImageData(canvasW, canvasH);
      buf32 = new Uint32Array(imageData.data.buffer);
    };

    resize();
    window.addEventListener('resize', resize);

    // 6 drifting plasma nodes with deep moody colors (restrained, dark void palette)
    const colors = [
      { r: 245, g: 158, b: 11, rad: 300 }, // Warm Amber
      { r: 168, g: 85,  b: 247, rad: 340 }, // Electric Purple
      { r: 236, g: 72,  b: 153, rad: 260 }, // Hot Fuchsia
      { r: 6,   g: 182, b: 212, rad: 240 }, // Neon Cyan
      { r: 253, g: 224, b: 71,  rad: 220 }, // Gold
      { r: 139, g: 92,  b: 246, rad: 300 }, // Indigo
    ];

    plasmaRef.current = colors.map((col, i) => {
      const angle = (i / colors.length) * Math.PI * 2;
      const dist = 160 + Math.random() * 200;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      return {
        x,
        y,
        baseX: x,
        baseY: y,
        vx: 0,
        vy: 0,
        radius: col.rad,
        speed: 0.006 + Math.random() * 0.006,
        phase: Math.random() * Math.PI * 2,
        r: col.r,
        g: col.g,
        b: col.b,
      };
    });

    let frame = 0;
    let exitProgress = 0;

    const makeColor = (r: number, g: number, b: number, a: number) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    };

    const render = () => {
      frame++;
      if (!buf32 || !imageData) return;

      const mouse = mouseRef.current;
      const isExiting = isFadingRef.current;
      if (isExiting) {
        exitProgress = Math.min(1.0, exitProgress + 0.04);
      }

      // Natural decay of accumulated scroll energy when user pauses scrolling
      if (!isExiting) {
        scrollEnergyRef.current = Math.max(0, scrollEnergyRef.current - 0.012);
      }
      // Smooth interpolation for silky visual glow
      currentGlowRef.current += (scrollEnergyRef.current - currentGlowRef.current) * 0.22;
      const glow = Math.min(1.0, Math.max(0, currentGlowRef.current));

      // Dynamic canvas opacity based on scroll energy
      ditherCanvas.style.opacity = `${(0.60 + glow * 0.38).toFixed(2)}`;
      blurCanvas.style.opacity = `${(0.25 + glow * 0.30).toFixed(2)}`;

      // 1. Update Plasma Nodes (Slow, organic atmospheric drifts)
      plasmaRef.current.forEach((node) => {
        const driftX = node.baseX + Math.sin(frame * node.speed + node.phase) * 140;
        const driftY = node.baseY + Math.cos(frame * node.speed * 0.8 + node.phase) * 110;

        let fx = (driftX - node.x) * 0.02;
        let fy = (driftY - node.y) * 0.02;

        if (mouse.active) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10 && dist < 450) {
            const pull = (1 - dist / 450) * 1.6;
            fx += (dx / dist) * pull;
            fy += (dy / dist) * pull;
          }
        }

        node.vx = (node.vx + fx) * 0.95;
        node.vy = (node.vy + fy) * 0.95;
        node.x += node.vx;
        node.y += node.vy;
      });

      // 2. Render Blur Canvas (Deep, dark ambient atmospheric glow)
      const bW = blurCanvas.width;
      const bH = blurCanvas.height;
      blurCtx.clearRect(0, 0, bW, bH);

      plasmaRef.current.forEach(node => {
        const bx = (node.x / window.innerWidth) * bW;
        const by = (node.y / window.innerHeight) * bH;
        const brad = (node.radius / window.innerWidth) * bW;

        // Controlled subtle alpha that warms up during scroll charging
        const grad = blurCtx.createRadialGradient(bx, by, 0, bx, by, brad);
        const centerAlpha = (0.12 + glow * 0.18).toFixed(3);
        const midAlpha = (0.03 + glow * 0.08).toFixed(3);
        grad.addColorStop(0, `rgba(${node.r}, ${node.g}, ${node.b}, ${centerAlpha})`);
        grad.addColorStop(0.5, `rgba(${node.r}, ${node.g}, ${node.b}, ${midAlpha})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        blurCtx.fillStyle = grad;
        blurCtx.beginPath();
        blurCtx.arc(bx, by, brad, 0, Math.PI * 2);
        blurCtx.fill();
      });

      // 3. Render Dither Canvas (Moody, restrained Bayer Ordered Dithering Matrix)
      buf32.fill(0);

      const mouseScaleX = mouse.x / PIXEL_SCALE;
      const mouseScaleY = mouse.y / PIXEL_SCALE;
      const mouseActive = mouse.active;

      const nodesData = plasmaRef.current.map(n => ({
        x: n.x / PIXEL_SCALE,
        y: n.y / PIXEL_SCALE,
        radSq: Math.pow(n.radius / PIXEL_SCALE, 2),
        rad: n.radius / PIXEL_SCALE,
        r: n.r,
        g: n.g,
        b: n.b,
      }));

      for (let cy = 0; cy < canvasH; cy++) {
        const by = cy % 4;
        const bRow = BAYER_4X4[by];
        const rowOffset = cy * canvasW;

        for (let cx = 0; cx < canvasW; cx++) {
          const bayerThresh = bRow[cx % 4] / 16.0;

          let totalIntensity = 0;
          let accR = 0;
          let accG = 0;
          let accB = 0;

          for (let n = 0; n < nodesData.length; n++) {
            const node = nodesData[n];
            const dx = cx - node.x;
            const dy = cy - node.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < node.radSq) {
              const falloff = 1.0 - Math.sqrt(dSq) / node.rad;
              const weight = falloff * falloff;
              // Node intensity expands significantly when scrolling
              totalIntensity += weight * (0.16 + glow * 0.26);
              accR += node.r * weight;
              accG += node.g * weight;
              accB += node.b * weight;
            }
          }

          // Expanding radiant center glow during scrolling
          if (glow > 0.005) {
            const cdx = cx - canvasW * 0.5;
            const cdy = cy - canvasH * 0.5;
            const cDist = Math.hypot(cdx, cdy);
            const cMax = Math.hypot(canvasW * 0.5, canvasH * 0.5);
            const cFalloff = Math.max(0, 1.0 - cDist / cMax);
            const cWeight = cFalloff * cFalloff * glow;
            totalIntensity += cWeight * 0.36;
            accR += 253 * cWeight;
            accG += 215 * cWeight;
            accB += 75 * cWeight;
          }

          // Gentle mouse spotlight (soft, not blinding)
          if (mouseActive) {
            const mdx = cx - mouseScaleX;
            const mdy = cy - mouseScaleY;
            const mDist = Math.hypot(mdx, mdy);
            const mRadius = 110;
            if (mDist < mRadius) {
              const mGlow = Math.pow(1.0 - mDist / mRadius, 2.0);
              totalIntensity += mGlow * 0.35;
              accR += 245 * mGlow;
              accG += 180 * mGlow;
              accB += 40 * mGlow;
            }
          }

          // Breathing stardust (subtle, delicate)
          const idleWave = Math.sin(frame * 0.02 + (cx * 0.08 + cy * 0.08)) * 0.015;
          totalIntensity += 0.012 + idleWave;

          if (exitProgress > 0) {
            totalIntensity -= exitProgress * 1.5;
          }

          let pixel = 0;

          // Extremely subtle resting dot (1 per 16 pixels, barely visible stardust)
          if (bRow[cx % 4] === 0 && exitProgress === 0) {
            pixel = makeColor(255, 255, 255, 5);
          }

          if (totalIntensity > 0.025) {
            const normalizedIntensity = Math.min(1.0, totalIntensity);
            // Lower exponent as you scroll = denser, broader, more brilliant dither field!
            const shaped = Math.pow(normalizedIntensity, 1.6 - glow * 0.55);

            if (shaped > bayerThresh) {
              const avgR = totalIntensity > 0.01 ? Math.min(255, Math.round(accR / totalIntensity)) : 255;
              const avgG = totalIntensity > 0.01 ? Math.min(255, Math.round(accG / totalIntensity)) : 255;
              const avgB = totalIntensity > 0.01 ? Math.min(255, Math.round(accB / totalIntensity)) : 255;

              let finalR = avgR;
              let finalG = avgG;
              let finalB = avgB;
              if (shaped > (0.68 - glow * 0.18)) {
                finalR = Math.min(255, avgR + 30 + Math.round(glow * 40));
                finalG = Math.min(255, avgG + 20 + Math.round(glow * 35));
                finalB = Math.min(255, avgB + 15);
              }

              const alpha = Math.min(250, Math.floor(30 + shaped * (135 + glow * 95)));
              pixel = makeColor(finalR, finalG, finalB, alpha);
            }
          }

          if (pixel !== 0) {
            buf32[rowOffset + cx] = pixel;
          }
        }
      }

      ditherCtx.putImageData(imageData, 0, 0);
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
    mouseRef.current.active = true;
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  return (
    <div
      onClick={() => handleProceed()}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-8 sm:p-14 bg-[#030305] text-white cursor-pointer select-none transition-all duration-700 ease-out overflow-hidden ${
        isFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. Atmospheric Soft Blur Glow (Controlled, deep subtle glow behind void) */}
      <canvas
        ref={blurCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0 filter blur-[56px] opacity-25"
        aria-hidden="true"
      />

      {/* 2. Deep Moody Dark Vignette */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#030305]/60 to-[#030305]/95 pointer-events-none z-[1]" />

      {/* 3. Retro Bayer Dither Matrix Stardust Overlay */}
      <canvas
        ref={ditherCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[15] opacity-60 mix-blend-screen"
        style={{
          imageRendering: 'pixelated',
        }}
        aria-hidden="true"
      />

      {/* Top bar with sleek pill badge and language switcher */}
      <div className="relative z-20 w-full flex items-center justify-between pt-2 pointer-events-auto">
        <div className="flex items-center gap-2 text-xs font-mono text-white/60 uppercase tracking-widest bg-white/[0.04] hover:bg-white/[0.08] px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-xl transition-colors">
          <Sparkles size={13} className="text-amber-400/90" />
          <span>{t.portfolio[lang]}</span>
        </div>
        <LanguageSwitch />
      </div>

      {/* Center Hero Identity Card */}
      <div className="relative z-20 text-center max-w-3xl flex flex-col items-center space-y-4 my-auto pointer-events-none">
        <h1 className="relative text-4xl sm:text-7xl md:text-8xl font-black tracking-tight text-white uppercase font-sans drop-shadow-[0_10px_35px_rgba(0,0,0,0.95)]">
          {t.name[lang]}
        </h1>

        {/* Clickable Roles Navigation: Games -> Gamedev, CG -> Gamedev, Design -> Design */}
        <div className="relative flex items-center justify-center gap-1.5 sm:gap-3 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleProceed('gamedev');
            }}
            title={lang === 'ru' ? 'Сфера GameDev' : 'GameDev realm'}
            className="group px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl text-base sm:text-xl font-mono text-white/50 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all duration-300 cursor-pointer"
          >
            <span className="font-medium tracking-wider">{t.roleGames[lang]}</span>
          </button>

          <span className="text-white/20 select-none pointer-events-none">•</span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleProceed('gamedev');
            }}
            title={lang === 'ru' ? 'Сфера CG' : 'CG realm'}
            className="group px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl text-base sm:text-xl font-mono text-white/50 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all duration-300 cursor-pointer"
          >
            <span className="font-medium tracking-wider">{t.roleCg[lang]}</span>
          </button>

          <span className="text-white/20 select-none pointer-events-none">•</span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleProceed('design');
            }}
            title={lang === 'ru' ? 'Сфера Дизайн' : 'Design realm'}
            className="group px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl text-base sm:text-xl font-mono text-white/50 hover:text-purple-300 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30 transition-all duration-300 cursor-pointer"
          >
            <span className="font-medium tracking-wider">{t.roleDesign[lang]}</span>
          </button>
        </div>
      </div>

      {/* Bottom Call to Action ("Press any key") — Clean luxury glass without icons */}
      <div className="relative z-20 flex flex-col items-center pb-6 pointer-events-auto">
        <div className="group flex items-center px-8 py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 hover:border-amber-500/40 backdrop-blur-xl text-xs sm:text-sm font-mono text-white transition-all shadow-[0_4px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_0_35px_rgba(245,158,11,0.25)]">
          <span className="font-medium text-white/90 group-hover:text-amber-200 transition-colors">
            {t.pressAnyKey[lang]}
          </span>
        </div>
      </div>
    </div>
  );
};
