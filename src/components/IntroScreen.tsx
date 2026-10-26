import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Sparkles, Wand2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';
import { LanguageSwitch } from './LanguageSwitch';

// 4x4 Bayer Matrix for Ordered Dithering
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// Downscale factor for crisp retro dither pixels
const PIXEL_SCALE = 3;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
}

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
  onEnter: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onEnter }) => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.intro;

  const ditherCanvasRef = useRef<HTMLCanvasElement>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement>(null);

  const mouseRef = useRef<{ x: number; y: number; active: boolean; prevX: number; prevY: number }>({
    x: -1000,
    y: -1000,
    prevX: -1000,
    prevY: -1000,
    active: false,
  });

  const sparksRef = useRef<Spark[]>([]);
  const plasmaRef = useRef<PlasmaNode[]>([]);
  const animFrameRef = useRef<number>();
  const [isFading, setIsFading] = useState(false);
  const isFadingRef = useRef(false);

  // Trigger enter smoothly
  const handleProceed = () => {
    if (isFadingRef.current) return;
    isFadingRef.current = true;
    setIsFading(true);
    setTimeout(() => {
      onEnter();
    }, 700);
  };

  // Keyboard listener: "press any key to continue"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key) {
        handleProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dual Canvas Engine: Dithering + Frosted Blur Synergy
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
      // Blur canvas runs at standard resolution for ultra-smooth optical glow
      blurCanvas.width = Math.ceil(window.innerWidth / 2);
      blurCanvas.height = Math.ceil(window.innerHeight / 2);

      // Dither canvas runs at retro scale for distinct Bayer matrix pixels
      canvasW = Math.ceil(window.innerWidth / PIXEL_SCALE);
      canvasH = Math.ceil(window.innerHeight / PIXEL_SCALE);
      ditherCanvas.width = canvasW;
      ditherCanvas.height = canvasH;
      imageData = ditherCtx.createImageData(canvasW, canvasH);
      buf32 = new Uint32Array(imageData.data.buffer);
    };

    resize();
    window.addEventListener('resize', resize);

    // Initialize 6 drifting plasma color nodes (Amber, Violet, Fuchsia, Cyan, Gold)
    const colors = [
      { r: 245, g: 158, b: 11, rad: 280 }, // Warm Amber
      { r: 168, g: 85,  b: 247, rad: 320 }, // Electric Purple
      { r: 236, g: 72,  b: 153, rad: 260 }, // Hot Fuchsia
      { r: 6,   g: 182, b: 212, rad: 240 }, // Neon Cyan
      { r: 253, g: 224, b: 71,  rad: 220 }, // Goldenrod
      { r: 139, g: 92,  b: 246, rad: 300 }, // Deep Indigo
    ];

    plasmaRef.current = colors.map((col, i) => {
      const angle = (i / colors.length) * Math.PI * 2;
      const dist = 180 + Math.random() * 200;
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
        speed: 0.007 + Math.random() * 0.008,
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
        exitProgress = Math.min(1.0, exitProgress + 0.035);
      }

      // 1. Update Plasma Nodes (Smooth Floating Drifts + Mouse Gravitation)
      plasmaRef.current.forEach((node, i) => {
        const driftX = node.baseX + Math.sin(frame * node.speed + node.phase) * 160;
        const driftY = node.baseY + Math.cos(frame * node.speed * 0.8 + node.phase) * 120;

        let fx = (driftX - node.x) * 0.025;
        let fy = (driftY - node.y) * 0.025;

        // Attract toward mouse cursor
        if (mouse.active) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10 && dist < 500) {
            const pull = (1 - dist / 500) * 2.2;
            fx += (dx / dist) * pull;
            fy += (dy / dist) * pull;
          }
        }

        node.vx = (node.vx + fx) * 0.94;
        node.vy = (node.vy + fy) * 0.94;
        node.x += node.vx;
        node.y += node.vy;
      });

      // 2. Spawn Pixel Sparks on Mouse Movement
      if (mouse.active && (mouse.x !== mouse.prevX || mouse.y !== mouse.prevY)) {
        const mDist = Math.hypot(mouse.x - mouse.prevX, mouse.y - mouse.prevY);
        if (mDist > 2) {
          const sparkCount = Math.min(4, Math.ceil(mDist / 6));
          for (let s = 0; s < sparkCount; s++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2.5;
            const isGold = Math.random() > 0.4;
            sparksRef.current.push({
              x: mouse.x + (Math.random() - 0.5) * 16,
              y: mouse.y + (Math.random() - 0.5) * 16,
              vx: Math.cos(angle) * speed + (mouse.x - mouse.prevX) * 0.1,
              vy: Math.sin(angle) * speed + (mouse.y - mouse.prevY) * 0.1,
              life: 1.0,
              maxLife: 0.02 + Math.random() * 0.03,
              r: isGold ? 253 : 168,
              g: isGold ? 224 : 85,
              b: isGold ? 71 : 247,
            });
          }
        }
        mouse.prevX = mouse.x;
        mouse.prevY = mouse.y;
      }

      // Update Sparks
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const sp = sparksRef.current[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.96;
        sp.vy *= 0.96;
        sp.life -= sp.maxLife;
        if (sp.life <= 0) {
          sparksRef.current.splice(i, 1);
        }
      }

      // 3. Render Blur Canvas (Dreamlike Atmospheric Glow in Background)
      const bW = blurCanvas.width;
      const bH = blurCanvas.height;
      blurCtx.clearRect(0, 0, bW, bH);

      plasmaRef.current.forEach(node => {
        const bx = (node.x / window.innerWidth) * bW;
        const by = (node.y / window.innerHeight) * bH;
        const brad = (node.radius / window.innerWidth) * bW;

        const grad = blurCtx.createRadialGradient(bx, by, 0, bx, by, brad);
        grad.addColorStop(0, `rgba(${node.r}, ${node.g}, ${node.b}, 0.45)`);
        grad.addColorStop(0.5, `rgba(${node.r}, ${node.g}, ${node.b}, 0.18)`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        blurCtx.fillStyle = grad;
        blurCtx.beginPath();
        blurCtx.arc(bx, by, brad, 0, Math.PI * 2);
        blurCtx.fill();
      });

      // 4. Render Dither Canvas (Retro Bayer Ordered Dithering Matrix Overlay)
      buf32.fill(0);

      const mouseScaleX = mouse.x / PIXEL_SCALE;
      const mouseScaleY = mouse.y / PIXEL_SCALE;
      const mouseActive = mouse.active;

      // Precompute normalized node positions in dither scale
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

          // Compute composite plasma light intensity at (cx, cy)
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
              totalIntensity += weight * 0.45;
              accR += node.r * weight;
              accG += node.g * weight;
              accB += node.b * weight;
            }
          }

          // Add interactive mouse spotlight illumination
          if (mouseActive) {
            const mdx = cx - mouseScaleX;
            const mdy = cy - mouseScaleY;
            const mDist = Math.hypot(mdx, mdy);
            const mRadius = 110;
            if (mDist < mRadius) {
              const mGlow = Math.pow(1.0 - mDist / mRadius, 1.8);
              totalIntensity += mGlow * 0.95;
              accR += 253 * mGlow; // Warm golden halo
              accG += 224 * mGlow;
              accB += 71 * mGlow;
            }
          }

          // Subtle idle stardust breathing
          const idleWave = Math.sin(frame * 0.02 + (cx * 0.05 + cy * 0.05)) * 0.03;
          totalIntensity += 0.04 + idleWave;

          // Dissolve effect on screen exit
          if (exitProgress > 0) {
            totalIntensity -= exitProgress * 1.5;
          }

          let pixel = 0;

          // Dither Threshold Evaluation
          if (totalIntensity > 0.02) {
            const normalizedIntensity = Math.min(1.0, totalIntensity);
            // Sharp power contrast curve
            const shaped = Math.pow(normalizedIntensity, 1.4);

            if (shaped > bayerThresh) {
              const avgR = totalIntensity > 0.01 ? Math.min(255, Math.round(accR / totalIntensity)) : 255;
              const avgG = totalIntensity > 0.01 ? Math.min(255, Math.round(accG / totalIntensity)) : 255;
              const avgB = totalIntensity > 0.01 ? Math.min(255, Math.round(accB / totalIntensity)) : 255;

              // High-intensity core has glowing golden-white highlights
              let finalR = avgR;
              let finalG = avgG;
              let finalB = avgB;
              if (shaped > 0.7) {
                finalR = Math.min(255, avgR + 50);
                finalG = Math.min(255, avgG + 40);
                finalB = Math.min(255, avgB + 30);
              }

              const alpha = Math.min(235, Math.floor(60 + shaped * 175));
              pixel = makeColor(finalR, finalG, finalB, alpha);
            }
          }

          if (pixel !== 0) {
            buf32[rowOffset + cx] = pixel;
          }
        }
      }

      // Draw floating sparks onto buffer
      sparksRef.current.forEach(sp => {
        const sx = Math.floor(sp.x / PIXEL_SCALE);
        const sy = Math.floor(sp.y / PIXEL_SCALE);
        if (sx >= 0 && sx < canvasW && sy >= 0 && sy < canvasH) {
          const alpha = Math.floor(sp.life * 255);
          buf32[sy * canvasW + sx] = makeColor(sp.r, sp.g, sp.b, alpha);
          // 2x2 spark cluster for visibility
          if (sx + 1 < canvasW) buf32[sy * canvasW + sx + 1] = makeColor(sp.r, sp.g, sp.b, alpha);
          if (sy + 1 < canvasH) buf32[(sy + 1) * canvasW + sx] = makeColor(sp.r, sp.g, sp.b, alpha);
        }
      });

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
      onClick={handleProceed}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-8 sm:p-14 bg-[#050508] text-white cursor-pointer select-none transition-all duration-700 ease-out ${
        isFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. LAYER A: Dreamlike Chromatic Blur Glow (Smooth 48px Atmospheric Blur) */}
      <canvas
        ref={blurCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none filter blur-[48px] opacity-80"
        aria-hidden="true"
      />

      {/* 2. LAYER B: Retro Bayer Ordered Dither Matrix Overlay (Crisp Stardust Pixel Grain) */}
      <canvas
        ref={ditherCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[1] opacity-90"
        style={{
          imageRendering: 'pixelated',
        }}
        aria-hidden="true"
      />

      {/* 3. LAYER C: Soft frosted glass vignette for cinematic depth */}
      <div className="absolute inset-0 bg-[#050508]/30 backdrop-blur-[35px] pointer-events-none z-[2]" />

      {/* Top bar with subtle badge and language switcher */}
      <div className="relative z-20 w-full flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 text-xs font-mono text-white/50 uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          <Sparkles size={13} className="text-amber-400 animate-pulse" />
          <span>{t.portfolio[lang]}</span>
        </div>
        <LanguageSwitch />
      </div>

      {/* Center Hero Identity Card */}
      <div className="relative z-20 text-center max-w-2xl flex flex-col items-center space-y-4 my-auto pointer-events-none">
        {/* Glow halo behind title */}
        <div className="absolute -inset-10 bg-gradient-to-r from-amber-500/10 via-purple-600/15 to-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <h1 className="relative text-4xl sm:text-7xl font-black tracking-tight text-white uppercase font-sans drop-shadow-[0_10px_35px_rgba(0,0,0,0.9)]">
          {t.name[lang]}
        </h1>

        <p className="relative text-base sm:text-2xl font-mono text-white/90 tracking-wide font-light">
          {t.roles[lang]}
        </p>

        <p className="relative text-xs sm:text-sm font-mono text-white/55 max-w-md pt-2 leading-relaxed">
          {t.tagline[lang]}
        </p>
      </div>

      {/* Bottom Motivation Call to Action ("Press any key") */}
      <div className="relative z-20 flex flex-col items-center space-y-3 pb-6">
        <div className="group flex items-center gap-3 px-6 py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-amber-500/30 hover:border-amber-400/60 backdrop-blur-2xl text-xs sm:text-sm font-mono text-white transition-all shadow-[0_0_35px_rgba(245,158,11,0.2)] hover:shadow-[0_0_50px_rgba(245,158,11,0.4)] animate-pulse">
          <Wand2 size={14} className="text-amber-400 group-hover:rotate-45 transition-transform" />
          <span>{t.pressAnyKey[lang]}</span>
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-amber-300" />
        </div>
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
          {t.clickHint[lang]}
        </span>
      </div>
    </div>
  );
};
