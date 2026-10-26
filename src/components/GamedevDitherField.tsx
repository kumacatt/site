import React, { useEffect, useRef } from 'react';

// 4x4 Bayer Matrix for Ordered Dithering
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// Screen to canvas downscaling factor (crisp retro pixel resolution)
const PIXEL_SCALE = 4;

// Navier-Stokes fluid simulation grid resolution
const SIM_W = 128;
const SIM_H = 72;
const SIM_SIZE = SIM_W * SIM_H;

export const GamedevDitherField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let canvasW = 0;
    let canvasH = 0;
    let imageData: ImageData | null = null;
    let buf32: Uint32Array | null = null;

    // Pre-allocated Float32Array buffers for Navier-Stokes simulation
    const u = new Float32Array(SIM_SIZE);
    const v = new Float32Array(SIM_SIZE);
    const u_prev = new Float32Array(SIM_SIZE);
    const v_prev = new Float32Array(SIM_SIZE);
    const dens = new Float32Array(SIM_SIZE);
    const dens_prev = new Float32Array(SIM_SIZE);

    // Mouse tracking in simulation space
    let lastSimX = -100;
    let lastSimY = -100;
    let isMouseActive = false;

    const resize = () => {
      canvasW = Math.ceil(window.innerWidth / PIXEL_SCALE);
      canvasH = Math.ceil(window.innerHeight / PIXEL_SCALE);
      canvas.width = canvasW;
      canvas.height = canvasH;
      imageData = ctx.createImageData(canvasW, canvasH);
      buf32 = new Uint32Array(imageData.data.buffer);
    };

    resize();
    window.addEventListener('resize', resize);

    // 1. Semi-Lagrangian Advection for Velocity and Density
    const advect = (
      d: Float32Array,
      d0: Float32Array,
      vx: Float32Array,
      vy: Float32Array,
      dt: number
    ) => {
      const dtX = dt * SIM_W;
      const dtY = dt * SIM_H;

      for (let y = 1; y < SIM_H - 1; y++) {
        const row = y * SIM_W;
        for (let x = 1; x < SIM_W - 1; x++) {
          const idx = row + x;
          let px = x - dtX * vx[idx];
          let py = y - dtY * vy[idx];

          if (px < 0.5) px = 0.5;
          else if (px > SIM_W - 1.5) px = SIM_W - 1.5;
          if (py < 0.5) py = 0.5;
          else if (py > SIM_H - 1.5) py = SIM_H - 1.5;

          const x0 = px | 0;
          const x1 = x0 + 1;
          const y0 = py | 0;
          const y1 = y0 + 1;

          const sx = px - x0;
          const sy = py - y0;
          const r0 = y0 * SIM_W;
          const r1 = y1 * SIM_W;

          d[idx] =
            (1 - sx) * ((1 - sy) * d0[r0 + x0] + sy * d0[r1 + x0]) +
            sx * ((1 - sy) * d0[r0 + x1] + sy * d0[r1 + x1]);
        }
      }
    };

    // 2. Incompressibility Projection (creates natural swirling eddies and vortices like on lusion.co)
    const project = (
      vx: Float32Array,
      vy: Float32Array,
      p: Float32Array,
      div: Float32Array
    ) => {
      const hX = 1 / SIM_W;
      const hY = 1 / SIM_H;

      for (let y = 1; y < SIM_H - 1; y++) {
        const r = y * SIM_W;
        for (let x = 1; x < SIM_W - 1; x++) {
          const idx = r + x;
          div[idx] =
            -0.5 *
            (hX * (vx[idx + 1] - vx[idx - 1]) + hY * (vy[idx + SIM_W] - vy[idx - SIM_W]));
          p[idx] = 0;
        }
      }

      // 4 Gauss-Seidel relaxation steps (fast & visually smooth)
      for (let k = 0; k < 4; k++) {
        for (let y = 1; y < SIM_H - 1; y++) {
          const r = y * SIM_W;
          for (let x = 1; x < SIM_W - 1; x++) {
            p[r + x] =
              (div[r + x] +
                p[r + x - 1] +
                p[r + x + 1] +
                p[r - SIM_W + x] +
                p[r + SIM_W + x]) *
              0.25;
          }
        }
      }

      for (let y = 1; y < SIM_H - 1; y++) {
        const r = y * SIM_W;
        for (let x = 1; x < SIM_W - 1; x++) {
          const idx = r + x;
          vx[idx] -= (0.5 * (p[idx + 1] - p[idx - 1])) / hX;
          vy[idx] -= (0.5 * (p[idx + SIM_W] - p[idx - SIM_W])) / hY;
        }
      }
    };

    // Mouse Injection: injects fluid density and velocity along the mouse trajectory
    const handleMouseMove = (e: MouseEvent) => {
      const simX = (e.clientX / window.innerWidth) * SIM_W;
      const simY = (e.clientY / window.innerHeight) * SIM_H;

      if (!isMouseActive || lastSimX < 0) {
        lastSimX = simX;
        lastSimY = simY;
        isMouseActive = true;
        return;
      }

      const dx = simX - lastSimX;
      const dy = simY - lastSimY;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.1) {
        // Interpolate along movement vector for continuous liquid flow without gaps
        const steps = Math.min(12, Math.max(1, Math.ceil(dist / 1.5)));
        const stepDx = dx / steps;
        const stepDy = dy / steps;

        const force = Math.min(3.5, 0.4 + dist * 0.25);
        const radius = Math.min(4.5, 2.2 + dist * 0.18);

        for (let s = 0; s <= steps; s++) {
          const px = lastSimX + stepDx * s;
          const py = lastSimY + stepDy * s;

          const minX = Math.max(1, Math.floor(px - radius));
          const maxX = Math.min(SIM_W - 2, Math.ceil(px + radius));
          const minY = Math.max(1, Math.floor(py - radius));
          const maxY = Math.min(SIM_H - 2, Math.ceil(py + radius));

          for (let iy = minY; iy <= maxY; iy++) {
            const r = iy * SIM_W;
            const dyVal = iy - py;
            for (let ix = minX; ix <= maxX; ix++) {
              const dxVal = ix - px;
              const dSq = dxVal * dxVal + dyVal * dyVal;
              if (dSq < radius * radius) {
                const falloff = 1 - Math.sqrt(dSq) / radius;
                const idx = r + ix;
                // Inject density and directional velocity
                dens[idx] = Math.min(2.0, dens[idx] + falloff * 0.85);
                u[idx] += dx * force * falloff * 0.12;
                v[idx] += dy * force * falloff * 0.12;
              }
            }
          }
        }
      }

      lastSimX = simX;
      lastSimY = simY;
    };

    const handleMouseLeave = () => {
      isMouseActive = false;
      lastSimX = -100;
      lastSimY = -100;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    // 32-bit little-endian color: 0xAABBGGRR
    const makeColor = (r: number, g: number, b: number, a: number) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    };

    // 120 FPS Fluid Simulation + Bayer Dither Render Loop
    const render = () => {
      if (!ctx || !imageData || !buf32) return;

      // 1. Advance Navier-Stokes Fluid Simulation Step (~0.5ms)
      const dt = 0.016;

      // Swap buffers for velocity advection
      u_prev.set(u);
      v_prev.set(v);
      advect(u, u_prev, u_prev, v_prev, dt);
      advect(v, v_prev, u_prev, v_prev, dt);

      // Enforce incompressibility & vortex curling
      project(u, v, u_prev, v_prev);

      // Advect fluid density along computed velocity field
      dens_prev.set(dens);
      advect(dens, dens_prev, u, v, dt);

      // Natural viscous dissipation (fluid gracefully dissipates over ~1 second)
      for (let i = 0; i < SIM_SIZE; i++) {
        dens[i] *= 0.955;
        u[i] *= 0.965;
        v[i] *= 0.965;
      }

      // Clear render buffer
      buf32.fill(0);

      const simScaleX = (SIM_W - 1) / canvasW;
      const simScaleY = (SIM_H - 1) / canvasH;

      // 2. Render Fluid Density through Bayer Ordered Dithering Matrix
      for (let cy = 0; cy < canvasH; cy++) {
        const by = cy % 4;
        const bayerRow = BAYER_4X4[by];
        const rowOffset = cy * canvasW;

        // Map canvas Y to simulation space
        const simYFloat = cy * simScaleY;
        const simY0 = simYFloat | 0;
        const simY1 = simY0 + 1;
        const fracY = simYFloat - simY0;
        const r0 = simY0 * SIM_W;
        const r1 = simY1 * SIM_W;

        for (let cx = 0; cx < canvasW; cx++) {
          const bayerThreshold = bayerRow[cx % 4] / 16;
          let pixel = 0;

          // A. Base subtle dither field (1 dot per 4x4, ~4.5% opacity, keeps video pristine)
          if (bayerRow[cx % 4] === 0) {
            pixel = makeColor(255, 255, 255, 11);
          }

          // B. Bilinear sample fluid density at (cx, cy)
          const simXFloat = cx * simScaleX;
          const simX0 = simXFloat | 0;
          const simX1 = simX0 + 1;
          const fracX = simXFloat - simX0;

          const d00 = dens[r0 + simX0];
          const d10 = dens[r0 + simX1];
          const d01 = dens[r1 + simX0];
          const d11 = dens[r1 + simX1];

          const fluidDensity =
            (1 - fracX) * ((1 - fracY) * d00 + fracY * d01) +
            fracX * ((1 - fracY) * d10 + fracY * d11);

          // C. If fluid is present, threshold it through Bayer dither matrix!
          if (fluidDensity > 0.02) {
            // Authentic organic dither thresholding
            if (fluidDensity > bayerThreshold) {
              const alpha = Math.min(245, Math.floor(75 + fluidDensity * 165));
              // Luminous liquid amber pixel (RGB: 245, 158, 11)
              pixel = makeColor(245, 158, 11, alpha);
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
