import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';
import { LanguageSwitch } from './LanguageSwitch';

interface Bead {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  baseX: number;
  baseY: number;
  speed: number;
  phase: number;
}

interface IntroScreenProps {
  onEnter: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onEnter }) => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.intro;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });
  const beadsRef = useRef<Bead[]>([]);
  const animFrameRef = useRef<number>();
  const [isFading, setIsFading] = useState(false);

  // Trigger enter smoothly
  const handleProceed = () => {
    if (isFading) return;
    setIsFading(true);
    setTimeout(() => {
      onEnter();
    }, 600);
  };

  // Keyboard listener: "press any key to continue"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger on modifiers alone if unwanted, but user said "any key"
      if (e.key) {
        handleProceed();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize interactive beads
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const colors = [
      'rgba(245, 158, 11, 0.45)', // amber
      'rgba(234, 88, 12, 0.35)',  // orange
      'rgba(168, 85, 247, 0.45)', // purple
      'rgba(236, 72, 153, 0.35)', // pink
      'rgba(6, 182, 212, 0.35)',  // cyan
      'rgba(255, 255, 255, 0.4)'  // ethereal white
    ];

    const beadsCount = Math.min(45, Math.floor(width / 35));
    beadsRef.current = Array.from({ length: beadsCount }, () => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      return {
        x,
        y,
        baseX: x,
        baseY: y,
        vx: 0,
        vy: 0,
        radius: 40 + Math.random() * 80, // large soft glow beads
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 0.005 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
      };
    });

    let t = 0;
    const ctx = canvas.getContext('2d');

    const render = () => {
      t += 1;
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;

      beadsRef.current.forEach(bead => {
        // Floating organic drift
        const targetX = bead.baseX + Math.sin(t * bead.speed + bead.phase) * 80;
        const targetY = bead.baseY + Math.cos(t * bead.speed * 0.8 + bead.phase) * 80;

        let fx = (targetX - bead.x) * 0.02;
        let fy = (targetY - bead.y) * 0.02;

        // Interaction with mouse: beads gently react and gravitate
        if (mouse.active) {
          const dx = mouse.x - bead.x;
          const dy = mouse.y - bead.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 280;

          if (dist < maxDist && dist > 0) {
            // Gentle swirl/gravity
            const force = (1 - dist / maxDist) * 3;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        }

        bead.vx = (bead.vx + fx) * 0.92;
        bead.vy = (bead.vy + fy) * 0.92;

        bead.x += bead.vx;
        bead.y += bead.vy;

        // Draw soft glowing orb
        const gradient = ctx.createRadialGradient(
          bead.x,
          bead.y,
          0,
          bead.x,
          bead.y,
          bead.radius
        );
        gradient.addColorStop(0, bead.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bead.x, bead.y, bead.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
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
      {/* Background canvas with dynamic beads */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none filter blur-[32px] opacity-75"
      />

      {/* Frosted dreamlike dark overlay */}
      <div className="absolute inset-0 bg-[#050508]/40 backdrop-blur-[60px] pointer-events-none" />

      {/* Top bar with subtle badge and language switcher */}
      <div className="relative z-20 w-full flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 text-xs font-mono text-white/40 uppercase tracking-widest">
          <Sparkles size={13} className="text-amber-400/80 animate-pulse" />
          <span>{t.portfolio[lang]}</span>
        </div>
        <LanguageSwitch />
      </div>

      {/* Center Hero Identity */}
      <div className="relative z-10 text-center max-w-2xl flex flex-col items-center space-y-4 my-auto">
        <h1 className="text-4xl sm:text-7xl font-black tracking-tight text-white uppercase font-sans drop-shadow-2xl">
          {t.name[lang]}
        </h1>

        <p className="text-base sm:text-2xl font-mono text-white/80 tracking-wide font-light">
          {t.roles[lang]}
        </p>

        <p className="text-xs sm:text-sm font-mono text-white/50 max-w-md pt-2 leading-relaxed">
          {t.tagline[lang]}
        </p>
      </div>

      {/* Bottom Motivation Call to Action ("Press any key") */}
      <div className="relative z-10 flex flex-col items-center space-y-3 pb-6">
        <div className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 backdrop-blur-xl text-xs sm:text-sm font-mono text-white/90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.08)] animate-pulse">
          <span>{t.pressAnyKey[lang]}</span>
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </div>
        <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
          {t.clickHint[lang]}
        </span>
      </div>
    </div>
  );
};
