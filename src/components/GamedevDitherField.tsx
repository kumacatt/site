import React, { useEffect, useRef } from 'react';

// 4x4 Bayer Ordered Dithering Matrix
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

const SCALE = 4; // 1 canvas pixel = 4x4 screen pixels (crisp retro pixel resolution)

interface WaterRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  age: number;
  maxAge: number;
  strength: number;
}

export const GamedevDitherField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({
    x: -500,
    y: -500,
    targetX: -500,
    targetY: -500,
    lastEmitX: -500,
    lastEmitY: -500,
    active: false,
  });

  const ripplesRef = useRef<WaterRipple[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let imageData: ImageData | null = null;
    let buf32: Uint32Array | null = null;

    const resize = () => {
      width = Math.ceil(window.innerWidth / SCALE);
      height = Math.ceil(window.innerHeight / SCALE);
      canvas.width = width;
      canvas.height = height;
      imageData = ctx.createImageData(width, height);
      buf32 = new Uint32Array(imageData.data.buffer);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      const cx = e.clientX / SCALE;
      const cy = e.clientY / SCALE;
      mouseRef.current.targetX = cx;
      mouseRef.current.targetY = cy;
      mouseRef.current.active = true;

      // Calculate speed since last ripple emission
      const m = mouseRef.current;
      const dx = cx - m.lastEmitX;
      const dy = cy - m.lastEmitY;
      const dist = Math.hypot(dx, dy);

      // Emit expanding water ripple wave when moving
      if (dist >= 2.5) {
        m.lastEmitX = cx;
        m.lastEmitY = cy;

        ripplesRef.current.push({
          x: cx,
          y: cy,
          radius: 3,
          maxRadius: Math.min(26, 9 + dist * 1.5),
          age: 0,
          maxAge: 22, // ~350ms duration (quick water-like dissipation)
          strength: Math.min(1.0, 0.45 + dist * 0.15),
        });

        // Cap ripple count to prevent memory overhead
        if (ripplesRef.current.length > 25) {
          ripplesRef.current.shift();
        }
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    // Little-endian 32-bit color helper: 0xAABBGGRR
    const makeColor = (r: number, g: number, b: number, a: number) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    };

    const render = () => {
      if (!ctx || !imageData || !buf32) return;

      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * 0.45;
      m.y += (m.targetY - m.y) * 0.45;

      // Clear frame to transparent
      buf32.fill(0);

      // 1. Subtle Base Dither Field (Only 1 dot per 4x4 block, ~5% opacity)
      // Keeps background video completely crisp and unclouded
      for (let y = 0; y < height; y++) {
        const by = y % 4;
        const bayerRow = BAYER_4X4[by];
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          if (bayerRow[x % 4] === 0) {
            buf32[rowOffset + x] = makeColor(255, 255, 255, 12); // 4.7% white
          }
        }
      }

      // 2. Water Ripples & Wake Trails (Expanding dither waves on motion)
      const ripples = ripplesRef.current;
      for (let rIdx = ripples.length - 1; rIdx >= 0; rIdx--) {
        const rip = ripples[rIdx];
        rip.age++;
        rip.radius += (rip.maxRadius - rip.radius) * 0.14;

        if (rip.age >= rip.maxAge) {
          ripples.splice(rIdx, 1);
          continue;
        }

        const lifeT = rip.age / rip.maxAge; // 0 (birth) to 1 (death)
        const waveFade = (1 - lifeT) * rip.strength;
        const waveThickness = 4.0;
        const currentRadius = rip.radius;

        // Bounding box for local ripple computation
        const minX = Math.max(0, Math.floor(rip.x - currentRadius - waveThickness));
        const maxX = Math.min(width - 1, Math.ceil(rip.x + currentRadius + waveThickness));
        const minY = Math.max(0, Math.floor(rip.y - currentRadius - waveThickness));
        const maxY = Math.min(height - 1, Math.ceil(rip.y + currentRadius + waveThickness));

        for (let y = minY; y <= maxY; y++) {
          const by = y % 4;
          const bayerRow = BAYER_4X4[by];
          const rowOffset = y * width;
          const dy = y - rip.y;

          for (let x = minX; x <= maxX; x++) {
            const dx = x - rip.x;
            const dist = Math.hypot(dx, dy);
            const waveDiff = Math.abs(dist - currentRadius);

            if (waveDiff < waveThickness) {
              const crestStrength = (1 - waveDiff / waveThickness) * waveFade;
              const threshold = bayerRow[x % 4] / 16;

              if (crestStrength > threshold) {
                const alpha = Math.min(230, Math.floor(crestStrength * 210));
                // Luminous amber water wave pixel
                const existing = buf32[rowOffset + x] >>> 24;
                if (alpha > existing) {
                  buf32[rowOffset + x] = makeColor(245, 158, 11, alpha);
                }
              }
            }
          }
        }
      }

      // 3. Compact Mouse Core Spotlight with RAGGED Bayer Dither Edge
      if (m.active && m.x >= -30 && m.x <= width + 30) {
        const spotRadius = 16; // ~64px screen radius (tight and compact)
        const spotRadiusSq = spotRadius * spotRadius;
        const minX = Math.max(0, Math.floor(m.x - spotRadius));
        const maxX = Math.min(width - 1, Math.ceil(m.x + spotRadius));
        const minY = Math.max(0, Math.floor(m.y - spotRadius));
        const maxY = Math.min(height - 1, Math.ceil(m.y + spotRadius));

        for (let y = minY; y <= maxY; y++) {
          const by = y % 4;
          const bayerRow = BAYER_4X4[by];
          const rowOffset = y * width;
          const dy = y - m.y;

          for (let x = minX; x <= maxX; x++) {
            const dx = x - m.x;
            const distSq = dx * dx + dy * dy;

            if (distSq < spotRadiusSq) {
              const dist = Math.sqrt(distSq);
              const t = 1 - (dist / spotRadius);
              // Quadratic drop for authentic ragged pixel fadeout
              const intensity = t * t * 1.1;
              const threshold = bayerRow[x % 4] / 16;

              if (intensity > threshold) {
                const alpha = Math.min(240, Math.floor(80 + t * 160));
                const existing = buf32[rowOffset + x] >>> 24;
                if (alpha > existing) {
                  buf32[rowOffset + x] = makeColor(245, 158, 11, alpha);
                }
              }
            }
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
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
      style={{
        imageRendering: 'pixelated',
      }}
      aria-hidden="true"
    />
  );
};
