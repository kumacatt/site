import React, { useEffect, useRef } from 'react';
import { loadDitherSettings, DitherSettings } from '../utils/tunerSettings';

// 4x4 Bayer Matrix for Ordered Dithering
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// Screen to canvas downscaling factor (retro pixel scale for GameDev)
const PIXEL_SCALE = 4;

interface GamedevDitherFieldProps {
  active?: boolean;
  isPaused?: boolean;
}

export const GamedevDitherField: React.FC<GamedevDitherFieldProps> = ({ active = true, isPaused = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const isPausedRef = useRef(isPaused);
  const transitionFramesRef = useRef(60);
  const scheduleRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    activeRef.current = active;
    if (active) {
      transitionFramesRef.current = 60;
      scheduleRenderRef.current?.();
    }
  }, [active]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (!isPaused && (activeRef.current || transitionFramesRef.current > 0) && !document.hidden) {
      scheduleRenderRef.current?.();
    }
  }, [isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let isLoopRunning = false;
    let canvasW = 0;
    let canvasH = 0;
    let imageData: ImageData | null = null;
    let buf32: Uint32Array | null = null;

    // Load dynamic tuner settings (persisted in localStorage or default)
    let currentSettings: DitherSettings = loadDitherSettings();

    const handleDitherUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<DitherSettings>;
      if (customEvent.detail) {
        currentSettings = { ...customEvent.detail };
      }
    };
    window.addEventListener('kum-dither-settings', handleDitherUpdate);

    // Aspect-ratio matching simulation grid (guarantees 100% square cells and zero horizontal stretching)
    const simH = 72;
    let simW = Math.max(32, Math.min(256, Math.round(simH * (window.innerWidth / Math.max(1, window.innerHeight)))));
    let simSize = simW * simH;

    let u = new Float32Array(simSize);
    let v = new Float32Array(simSize);
    let u_prev = new Float32Array(simSize);
    let v_prev = new Float32Array(simSize);
    let dens = new Float32Array(simSize);
    let dens_prev = new Float32Array(simSize);

    // Mouse tracking in simulation space
    let lastSimX = -100;
    let lastSimY = -100;
    let lastSimTime = 0;
    let isMouseActive = false;

    // Mobile mode detection & autonomous firefly particles
    let isMobile = window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024);

    interface FireflyAgent {
      x: number;
      y: number;
      prevX: number;
      prevY: number;
      phase: number;
      glow: number;
    }

    const fireflies: FireflyAgent[] = [
      { x: 0.5, y: 0.35, prevX: 0.5, prevY: 0.35, phase: 0.0, glow: 1.0 },
      { x: 0.5, y: 0.65, prevX: 0.5, prevY: 0.65, phase: 2.1, glow: 1.0 },
      { x: 0.5, y: 0.50, prevX: 0.5, prevY: 0.50, phase: 4.3, glow: 1.0 },
    ];
    let fireflyTime = 0;

    const resize = () => {
      isMobile = window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024);
      const aspect = window.innerWidth / Math.max(1, window.innerHeight);
      const newSimW = Math.max(32, Math.min(256, Math.round(simH * aspect)));
      const newSimSize = newSimW * simH;

      if (newSimW !== simW) {
        simW = newSimW;
        simSize = newSimSize;
        u = new Float32Array(simSize);
        v = new Float32Array(simSize);
        u_prev = new Float32Array(simSize);
        v_prev = new Float32Array(simSize);
        dens = new Float32Array(simSize);
        dens_prev = new Float32Array(simSize);
      }

      canvasW = Math.ceil(window.innerWidth / PIXEL_SCALE);
      canvasH = Math.ceil(window.innerHeight / PIXEL_SCALE);
      canvas.width = canvasW;
      canvas.height = canvasH;
      imageData = ctx.createImageData(canvasW, canvasH);
      buf32 = new Uint32Array(imageData.data.buffer);
    };

    resize();
    window.addEventListener('resize', resize);

    // 1. Semi-Lagrangian Advection
    const advect = (
      d: Float32Array,
      d0: Float32Array,
      vx: Float32Array,
      vy: Float32Array,
      dt: number
    ) => {
      const dtX = dt * simW;
      const dtY = dt * simH;

      for (let y = 1; y < simH - 1; y++) {
        const row = y * simW;
        for (let x = 1; x < simW - 1; x++) {
          const idx = row + x;
          let px = x - dtX * vx[idx];
          let py = y - dtY * vy[idx];

          if (px < 0.5) px = 0.5;
          else if (px > simW - 1.5) px = simW - 1.5;
          if (py < 0.5) py = 0.5;
          else if (py > simH - 1.5) py = simH - 1.5;

          const x0 = px | 0;
          const x1 = x0 + 1;
          const y0 = py | 0;
          const y1 = y0 + 1;

          const sx = px - x0;
          const sy = py - y0;
          const r0 = y0 * simW;
          const r1 = y1 * simW;

          d[idx] =
            (1 - sx) * ((1 - sy) * d0[r0 + x0] + sy * d0[r1 + x0]) +
            sx * ((1 - sy) * d0[r0 + x1] + sy * d0[r1 + x1]);
        }
      }
    };

    // 2. Incompressibility Projection
    const project = (
      vx: Float32Array,
      vy: Float32Array,
      p: Float32Array,
      div: Float32Array
    ) => {
      const hX = 1 / simW;
      const hY = 1 / simH;

      for (let y = 1; y < simH - 1; y++) {
        const r = y * simW;
        for (let x = 1; x < simW - 1; x++) {
          const idx = r + x;
          div[idx] =
            -0.5 *
            (hX * (vx[idx + 1] - vx[idx - 1]) + hY * (vy[idx + simW] - vy[idx - simW]));
          p[idx] = 0;
        }
      }

      for (let k = 0; k < 4; k++) {
        for (let y = 1; y < simH - 1; y++) {
          const r = y * simW;
          for (let x = 1; x < simW - 1; x++) {
            p[r + x] =
              (div[r + x] +
                p[r + x - 1] +
                p[r + x + 1] +
                p[r - simW + x] +
                p[r + simW + x]) *
              0.25;
          }
        }
      }

      for (let y = 1; y < simH - 1; y++) {
        const r = y * simW;
        for (let x = 1; x < simW - 1; x++) {
          const idx = r + x;
          vx[idx] -= (0.5 * (p[idx + 1] - p[idx - 1])) / hX;
          vy[idx] -= (0.5 * (p[idx + simW] - p[idx - simW])) / hY;
        }
      }
    };

    // Unified Pointer Injection (Mouse and Touch)
    const handlePointerMove = (clientX: number, clientY: number) => {
      if (activeRef.current === false) return;
      const simX = (clientX / window.innerWidth) * simW;
      const simY = (clientY / window.innerHeight) * simH;

      const now = performance.now();
      const dt = lastSimTime > 0 ? Math.max(1, now - lastSimTime) : 16.67;
      lastSimTime = now;

      if (!isMouseActive || lastSimX < 0) {
        lastSimX = simX;
        lastSimY = simY;
        isMouseActive = true;
        return;
      }

      const dx = simX - lastSimX;
      const dy = simY - lastSimY;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.08) {
        // Speed normalized to ~60fps frame displacement
        const vNorm = (dist / dt) * 16.67;

        // Dynamic speed-dependent wave radius: faster movement = broader splash!
        const baseRadius = currentSettings.fluidRadius || 3.5;
        const speedFactor = 0.35 + 1.85 * (1 - Math.exp(-vNorm / 3.0));
        const radius = baseRadius * speedFactor;

        // Dynamic force: energetic flicks impart much stronger velocity impulse
        const force = Math.min(4.5, 0.4 + vNorm * 0.35);

        const steps = Math.min(22, Math.max(1, Math.ceil(dist / Math.max(1.2, radius * 0.4))));
        const stepDx = dx / steps;
        const stepDy = dy / steps;

        for (let s = 0; s <= steps; s++) {
          const px = lastSimX + stepDx * s;
          const py = lastSimY + stepDy * s;

          const minX = Math.max(1, Math.floor(px - radius));
          const maxX = Math.min(simW - 2, Math.ceil(px + radius));
          const minY = Math.max(1, Math.floor(py - radius));
          const maxY = Math.min(simH - 2, Math.ceil(py + radius));

          for (let iy = minY; iy <= maxY; iy++) {
            const r = iy * simW;
            const dyVal = iy - py;
            for (let ix = minX; ix <= maxX; ix++) {
              const dxVal = ix - px;
              const dSq = dxVal * dxVal + dyVal * dyVal;
              if (dSq < radius * radius) {
                const falloff = 1 - Math.sqrt(dSq) / radius;
                const idx = r + ix;
                dens[idx] = Math.min(2.5, dens[idx] + falloff * 0.95);
                u[idx] += dx * force * falloff * 0.14;
                v[idx] += dy * force * falloff * 0.14;
              }
            }
          }
        }
      }

      lastSimX = simX;
      lastSimY = simY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches[0]) {
        isMouseActive = false;
        const t = e.touches[0];
        handlePointerMove(t.clientX, t.clientY);
        const simX = (t.clientX / window.innerWidth) * simW;
        const simY = (t.clientY / window.innerHeight) * simH;
        triggerSplash(simX, simY, 1.2);
      }
    };

    const handleMouseLeave = () => {
      isMouseActive = false;
      lastSimX = -100;
      lastSimY = -100;
      lastSimTime = 0;
    };

    // Radial Click Dither Shockwave
    const triggerSplash = (cx: number, cy: number, strength = 1.0) => {
      const radius = Math.min(simH * 0.45, (currentSettings.fluidRadius || 3.5) * 2.4 * strength);
      const force = 5.2 * strength;
      const minX = Math.max(1, Math.floor(cx - radius));
      const maxX = Math.min(simW - 2, Math.ceil(cx + radius));
      const minY = Math.max(1, Math.floor(cy - radius));
      const maxY = Math.min(simH - 2, Math.ceil(cy + radius));

      for (let iy = minY; iy <= maxY; iy++) {
        const r = iy * simW;
        const dy = iy - cy;
        for (let ix = minX; ix <= maxX; ix++) {
          const dx = ix - cx;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.01 && dist < radius) {
            const normDist = dist / radius;
            const waveProfile = Math.sin(normDist * Math.PI);
            const normX = dx / dist;
            const normY = dy / dist;
            const idx = r + ix;
            u[idx] += normX * force * waveProfile;
            v[idx] += normY * force * waveProfile;
            dens[idx] = Math.min(3.0, dens[idx] + waveProfile * 2.6 * strength);
          }
        }
      }
    };

    // Expanding Realm Transition Wave (Retro cybernetic energy surge)
    const triggerTransitionShockwave = (normX = 0.5, normY = 0.08) => {
      const cx = normX * simW;
      const cy = normY * simH;
      let frame = 0;
      const totalFrames = 24;

      const step = () => {
        frame++;
        const progress = frame / totalFrames;
        const radius = 6 + progress * (simH * 1.15);
        const force = 7.5 * (1 - progress * 0.4);
        const densityStrength = 3.2 * (1 - progress * 0.35);

        const ringThickness = 5.0 + progress * 2.5;
        const minX = Math.max(1, Math.floor(cx - radius - ringThickness));
        const maxX = Math.min(simW - 2, Math.ceil(cx + radius + ringThickness));
        const minY = Math.max(1, Math.floor(cy - radius - ringThickness));
        const maxY = Math.min(simH - 2, Math.ceil(cy + radius + ringThickness));

        for (let iy = minY; iy <= maxY; iy++) {
          const r = iy * simW;
          const dy = iy - cy;
          for (let ix = minX; ix <= maxX; ix++) {
            const dx = ix - cx;
            const dist = Math.hypot(dx, dy);
            const ringDist = Math.abs(dist - radius);
            if (ringDist < ringThickness && dist > 0.01) {
              const falloff = 1 - ringDist / ringThickness;
              const smoothFalloff = falloff * falloff;
              const normX = dx / dist;
              const normY = dy / dist;
              const idx = r + ix;
              u[idx] += normX * force * smoothFalloff * 0.24;
              v[idx] += normY * force * smoothFalloff * 0.24;
              dens[idx] = Math.min(3.2, dens[idx] + densityStrength * smoothFalloff * 0.45);
            }
          }
        }

        if (frame < totalFrames) {
          requestAnimationFrame(step);
        }
      };
      step();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (activeRef.current === false) return;
      if ((e.target as HTMLElement)?.closest('.dither-tuner, input, select, textarea')) return;
      const simX = (e.clientX / window.innerWidth) * simW;
      const simY = (e.clientY / window.innerHeight) * simH;
      triggerSplash(simX, simY, 1.4);
    };

    const handleTransition = (e: Event) => {
      const customEvent = e as CustomEvent<{ toRealm: string; clientX?: number; clientY?: number }>;
      if (customEvent.detail?.toRealm === 'gamedev') {
        const nx = typeof customEvent.detail.clientX === 'number' ? customEvent.detail.clientX / window.innerWidth : 0.5;
        const ny = typeof customEvent.detail.clientY === 'number' ? customEvent.detail.clientY / window.innerHeight : 0.08;
        triggerTransitionShockwave(nx, ny);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleMouseLeave, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('kum-realm-transition', handleTransition);
    document.addEventListener('mouseleave', handleMouseLeave);

    const makeColor = (r: number, g: number, b: number, a: number) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    };

    // Render loop
    const render = () => {
      if (document.hidden || isPausedRef.current || (!activeRef.current && transitionFramesRef.current <= 0)) {
        isLoopRunning = false;
        return;
      }
      if (!activeRef.current) {
        transitionFramesRef.current--;
      }
      if (!ctx || !imageData || !buf32) {
        isLoopRunning = false;
        return;
      }

      const dt = 0.016;

      // Advance and inject autonomous mobile fireflies
      if (isMobile) {
        fireflyTime += 0.016;
        for (let i = 0; i < fireflies.length; i++) {
          const f = fireflies[i];
          if (i === 0) {
            f.x = 0.50 + 0.35 * Math.sin(fireflyTime * 0.45) + 0.10 * Math.cos(fireflyTime * 1.12);
            f.y = 0.35 + 0.22 * Math.cos(fireflyTime * 0.38) + 0.08 * Math.sin(fireflyTime * 0.95);
          } else if (i === 1) {
            f.x = 0.50 + 0.36 * Math.cos(fireflyTime * 0.32 + 1.8) + 0.09 * Math.sin(fireflyTime * 0.85);
            f.y = 0.65 + 0.24 * Math.sin(fireflyTime * 0.48 + 0.5) + 0.08 * Math.cos(fireflyTime * 1.05);
          } else {
            f.x = 0.50 + 0.33 * Math.sin(fireflyTime * 0.58 + 3.2) + 0.12 * Math.cos(fireflyTime * 0.67);
            f.y = 0.50 + 0.35 * Math.cos(fireflyTime * 0.40 + 2.1) + 0.09 * Math.sin(fireflyTime * 0.88);
          }
          f.glow = 0.70 + 0.30 * Math.sin(fireflyTime * 2.5 + f.phase);

          const simX = f.x * simW;
          const simY = f.y * simH;
          const prevSimX = f.prevX * simW;
          const prevSimY = f.prevY * simH;
          const dx = simX - prevSimX;
          const dy = simY - prevSimY;
          const dist = Math.hypot(dx, dy);

          f.prevX = f.x;
          f.prevY = f.y;

          if (dist > 0.0001) {
            const radius = (currentSettings.fluidRadius || 3.5) * 0.95;
            const force = 3.6;
            const minX = Math.max(1, Math.floor(simX - radius));
            const maxX = Math.min(simW - 2, Math.ceil(simX + radius));
            const minY = Math.max(1, Math.floor(simY - radius));
            const maxY = Math.min(simH - 2, Math.ceil(simY + radius));

            for (let iy = minY; iy <= maxY; iy++) {
              const r = iy * simW;
              const dyVal = iy - simY;
              for (let ix = minX; ix <= maxX; ix++) {
                const dxVal = ix - simX;
                const dSq = dxVal * dxVal + dyVal * dyVal;
                if (dSq < radius * radius) {
                  const falloff = 1 - Math.sqrt(dSq) / radius;
                  const idx = r + ix;
                  dens[idx] = Math.min(2.8, dens[idx] + falloff * 0.75);
                  u[idx] += dx * force * falloff * 0.28;
                  v[idx] += dy * force * falloff * 0.28;
                }
              }
            }
          }
        }
      }

      u_prev.set(u);
      v_prev.set(v);
      advect(u, u_prev, u_prev, v_prev, dt);
      advect(v, v_prev, u_prev, v_prev, dt);
      project(u, v, u_prev, v_prev);

      dens_prev.set(dens);
      advect(dens, dens_prev, u, v, dt);

      const dissipation = currentSettings.dissipation;
      for (let i = 0; i < simSize; i++) {
        dens[i] *= dissipation;
        u[i] *= 0.965;
        v[i] *= 0.965;
      }

      buf32.fill(0);

      // Isotropic sampling mapping
      const simScaleX = (simW - 1) / canvasW;
      const simScaleY = (simH - 1) / canvasH;

      for (let cy = 0; cy < canvasH; cy++) {
        const by = cy % 4;
        const bayerRow = BAYER_4X4[by];
        const rowOffset = cy * canvasW;

        const simYFloat = cy * simScaleY;
        const simY0 = simYFloat | 0;
        const simY1 = Math.min(simH - 1, simY0 + 1);
        const fracY = simYFloat - simY0;
        const r0 = simY0 * simW;
        const r1 = simY1 * simW;

        for (let cx = 0; cx < canvasW; cx++) {
          let pixel = 0;

          const simXFloat = cx * simScaleX;
          const simX0 = simXFloat | 0;
          const simX1 = Math.min(simW - 1, simX0 + 1);
          const fracX = simXFloat - simX0;

          const d00 = dens[r0 + simX0];
          const d10 = dens[r0 + simX1];
          const d01 = dens[r1 + simX0];
          const d11 = dens[r1 + simX1];

          const fluidDensity =
            (1 - fracX) * ((1 - fracY) * d00 + fracY * d01) +
            fracX * ((1 - fracY) * d10 + fracY * d11);

          const bayerThreshold = bayerRow[cx % 4] / 16;

          // A. Base subtle resting dither field
          if (currentSettings.baseOpacity > 0 && bayerRow[cx % 4] === 0) {
            const baseAlpha = Math.floor(currentSettings.baseOpacity * 255);
            pixel = makeColor(255, 255, 255, baseAlpha);
          }

          // B. Threshold dynamic fluid density
          if (fluidDensity > 0.015) {
            const normalizedDensity = Math.min(1.0, fluidDensity * 0.85);
            const shapedDensity = Math.pow(normalizedDensity, currentSettings.edgeSharpness);

            if (shapedDensity > bayerThreshold) {
              const alpha = Math.min(250, Math.floor(75 + shapedDensity * 175));
              if (shapedDensity > 0.72) {
                // Hot golden highlight core
                pixel = makeColor(253, 224, 71, alpha);
              } else {
                // Liquid amber dither pixel
                pixel = makeColor(245, 158, 11, alpha);
              }
            }
          }

          if (pixel !== 0) {
            buf32[rowOffset + cx] = pixel;
          }
        }
      }

      // Render glowing golden firefly sparks on mobile
      if (isMobile) {
        for (const f of fireflies) {
          const px = Math.round(f.x * (canvasW - 1));
          const py = Math.round(f.y * (canvasH - 1));
          const coreAlpha = Math.floor(255 * f.glow);
          const haloAlpha = Math.floor(180 * f.glow);
          const coreColor = makeColor(254, 240, 138, coreAlpha);
          const haloColor = makeColor(245, 158, 11, haloAlpha);

          for (let oy = -1; oy <= 1; oy++) {
            const cy = py + oy;
            if (cy < 0 || cy >= canvasH) continue;
            const row = cy * canvasW;
            for (let ox = -1; ox <= 1; ox++) {
              const cx = px + ox;
              if (cx < 0 || cx >= canvasW) continue;
              const isCenter = ox === 0 && oy === 0;
              buf32[row + cx] = isCenter ? coreColor : haloColor;
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      animId = requestAnimationFrame(render);
    };

    const scheduleRender = () => {
      if (!isLoopRunning && !document.hidden && !isPausedRef.current && (activeRef.current || transitionFramesRef.current > 0)) {
        isLoopRunning = true;
        animId = requestAnimationFrame(render);
      }
    };
    scheduleRenderRef.current = scheduleRender;

    const handleVisibilityChange = () => {
      if (!document.hidden && !isPausedRef.current && (activeRef.current || transitionFramesRef.current > 0)) {
        scheduleRender();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    scheduleRender();

    return () => {
      cancelAnimationFrame(animId);
      isLoopRunning = false;
      scheduleRenderRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('kum-realm-transition', handleTransition);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('kum-dither-settings', handleDitherUpdate);
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
