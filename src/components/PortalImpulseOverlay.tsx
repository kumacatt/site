import React, { useEffect, useRef } from 'react';
import { RealmType } from '../data/projects';

interface PortalImpulseOverlayProps {
  active: boolean;
  realm: RealmType;
  origin: { x: number; y: number };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rot: number;
  vRot: number;
  isSquare: boolean;
}

export const PortalImpulseOverlay: React.FC<PortalImpulseOverlayProps> = ({
  active,
  realm,
  origin
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);

    const ox = origin.x;
    const oy = origin.y;
    const maxDist = Math.hypot(
      Math.max(ox, width - ox),
      Math.max(oy, height - oy)
    ) * 1.15;

    // Palette per realm
    const isGamedev = realm === 'gamedev';
    const primaryColor = isGamedev ? '#F59E0B' : '#A855F7';
    const secondaryColor = isGamedev ? '#FEF08A' : '#F472B6';
    const glowColor = isGamedev ? 'rgba(245, 158, 11, 0.8)' : 'rgba(168, 85, 247, 0.8)';
    const particleColors = isGamedev
      ? ['#F59E0B', '#FBBF24', '#FEF08A', '#FFFFFF', '#D97706', '#FDE68A']
      : ['#C084FC', '#E879F9', '#A855F7', '#FFFFFF', '#818CF8', '#38BDF8'];

    // Generate burst particles radiating outward from click
    const particleCount = 36;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4;
      const speed = 7 + Math.random() * 16;
      particles.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        alpha: 1,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        isSquare: isGamedev
      });
    }

    const startTime = performance.now();
    const duration = 720; // ms

    const render = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, width, height);

      // 1. Central Core Flash (Fades in first 280ms)
      const coreAlpha = Math.max(0, 1 - progress * 3.2);
      if (coreAlpha > 0.01) {
        const coreRadius = 140 + progress * 240;
        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, coreRadius);
        grad.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha * 0.95})`);
        grad.addColorStop(0.25, isGamedev ? `rgba(251, 191, 36, ${coreAlpha * 0.8})` : `rgba(232, 121, 249, ${coreAlpha * 0.8})`);
        grad.addColorStop(0.65, isGamedev ? `rgba(245, 158, 11, ${coreAlpha * 0.4})` : `rgba(168, 85, 247, ${coreAlpha * 0.4})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ox, oy, coreRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Primary Shockwave Ring
      const p1 = 1 - Math.pow(1 - progress, 3);
      const r1 = maxDist * p1;
      const ring1Alpha = Math.max(0, Math.pow(1 - progress, 0.7));
      const ring1Width = Math.max(1.5, 9 * (1 - progress));

      if (ring1Alpha > 0.01 && r1 > 2) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ox, oy, r1, 0, Math.PI * 2);
        ctx.lineWidth = ring1Width;
        ctx.strokeStyle = isGamedev
          ? `rgba(254, 240, 138, ${ring1Alpha})`
          : `rgba(244, 114, 182, ${ring1Alpha})`;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 24;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Harmonic Echo Shockwave Ring (delayed by ~70ms)
      if (progress > 0.1) {
        const echoProg = (progress - 0.1) / 0.9;
        const p2 = 1 - Math.pow(1 - echoProg, 2.6);
        const r2 = maxDist * p2;
        const ring2Alpha = Math.max(0, Math.pow(1 - echoProg, 0.9) * 0.7);
        const ring2Width = Math.max(1, 5 * (1 - echoProg));

        if (ring2Alpha > 0.01 && r2 > 2) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(ox, oy, r2, 0, Math.PI * 2);
          ctx.lineWidth = ring2Width;
          ctx.strokeStyle = isGamedev
            ? `rgba(245, 158, 11, ${ring2Alpha})`
            : `rgba(168, 85, 247, ${ring2Alpha})`;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.restore();
        }
      }

      // 4. Flying Particles / Pixel Sparks
      ctx.save();
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.93;
        p.vy *= 0.93;
        p.rot += p.vRot;
        p.alpha = Math.max(0, 1 - progress * 1.35);

        if (p.alpha <= 0.01) continue;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;

        if (p.isSquare) {
          // Pixelated retro-dither spark
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else {
          // Luminous rounded orb
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // 5. Warp Veil: Smooth atmospheric transition curtain
      // Rises from progress 0.35 -> 1.0 to fully veil the portal before realm mounting
      if (progress > 0.3) {
        const veilProg = Math.min(1, (progress - 0.3) / 0.65);
        const veilAlpha = Math.pow(veilProg, 1.5);

        ctx.fillStyle = `rgba(5, 5, 7, ${veilAlpha})`;
        ctx.fillRect(0, 0, width, height);

        // Warm / Ethereal radial gradient over the veil
        const ambientGrad = ctx.createRadialGradient(ox, oy, 20, ox, oy, maxDist);
        ambientGrad.addColorStop(
          0,
          isGamedev
            ? `rgba(245, 158, 11, ${veilAlpha * 0.35})`
            : `rgba(168, 85, 247, ${veilAlpha * 0.35})`
        );
        ambientGrad.addColorStop(
          0.6,
          isGamedev
            ? `rgba(180, 83, 9, ${veilAlpha * 0.15})`
            : `rgba(126, 34, 206, ${veilAlpha * 0.15})`
        );
        ambientGrad.addColorStop(1, 'rgba(5, 5, 7, 0)');

        ctx.fillStyle = ambientGrad;
        ctx.fillRect(0, 0, width, height);
      }

      if (progress < 1) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [active, realm, origin]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none w-screen h-screen"
      style={{ willChange: 'transform, opacity' }}
      aria-hidden="true"
    />
  );
};
