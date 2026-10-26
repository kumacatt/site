import React, { useEffect, useRef } from 'react';
import { RealmType } from '../data/projects';
import {
  loadDitherSettings,
  DitherSettings,
  loadRefractionSettings,
  RefractionSettings,
} from './DitherTuner';

// 4x4 Bayer Matrix for Ordered Dithering
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// Screen to canvas downscaling factor (retro pixel scale for gamedev / crisp sampling for refraction)
const PIXEL_SCALE = 4;

// Navier-Stokes fluid simulation grid resolution
const SIM_W = 128;
const SIM_H = 72;
const SIM_SIZE = SIM_W * SIM_H;

interface GamedevDitherFieldProps {
  realm?: RealmType | null;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export const GamedevDitherField: React.FC<GamedevDitherFieldProps> = ({ realm = 'gamedev', videoRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDesign = realm === 'design';

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

    // Offscreen canvas for sampling underlying video in Design realm (Optical Refraction)
    const offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

    // Load dynamic tuner settings (GameDev Dither & Design Refraction)
    let currentSettings: DitherSettings = loadDitherSettings();
    let currentRefraction: RefractionSettings = loadRefractionSettings();

    const handleDitherUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<DitherSettings>;
      if (customEvent.detail) {
        currentSettings = { ...customEvent.detail };
      }
    };

    const handleRefractionUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<RefractionSettings>;
      if (customEvent.detail) {
        currentRefraction = { ...customEvent.detail };
      }
    };

    window.addEventListener('kum-dither-settings', handleDitherUpdate);
    window.addEventListener('kum-refraction-settings', handleRefractionUpdate);

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
      offscreenCanvas.width = canvasW;
      offscreenCanvas.height = canvasH;
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

      if (dist > 0.08) {
        // Interpolate along movement vector for continuous liquid flow without gaps
        const steps = Math.min(14, Math.max(1, Math.ceil(dist / 1.4)));
        const stepDx = dx / steps;
        const stepDy = dy / steps;

        // Radius dynamically adapted from Tuner for both realms
        const baseRadius = isDesign ? currentRefraction.waveRadius : currentSettings.fluidRadius;
        const radius = Math.min(baseRadius * 1.5, baseRadius * 0.75 + dist * 0.16);
        const force = isDesign ? Math.min(4.5, 0.6 + dist * 0.35) : Math.min(3.5, 0.4 + dist * 0.25);

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

    // 60-120 FPS Fluid Simulation + Render Loop
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

      // Dissipation rate dynamically adapted per realm
      const dissipation = isDesign ? currentRefraction.dissipation : currentSettings.dissipation;
      for (let i = 0; i < SIM_SIZE; i++) {
        dens[i] *= dissipation;
        u[i] *= 0.965;
        v[i] *= 0.965;
      }

      // Check whether there is active motion in the field to optimize resting state
      let hasMotion = false;
      for (let i = 0; i < SIM_SIZE; i += 6) {
        if (dens[i] > 0.005 || Math.abs(u[i]) > 0.002 || Math.abs(v[i]) > 0.002) {
          hasMotion = true;
          break;
        }
      }

      // Clear render buffer
      buf32.fill(0);

      const simScaleX = (SIM_W - 1) / canvasW;
      const simScaleY = (SIM_H - 1) / canvasH;

      // If in Design realm and we have motion, sample current video frame to displace it
      let vidBuf32: Uint32Array | null = null;
      if (isDesign && hasMotion && videoRef?.current && offscreenCtx) {
        const video = videoRef.current;
        if (video.readyState >= 2 && !video.paused) {
          try {
            offscreenCtx.drawImage(video, 0, 0, canvasW, canvasH);
            const vidImg = offscreenCtx.getImageData(0, 0, canvasW, canvasH);
            vidBuf32 = new Uint32Array(vidImg.data.buffer);
          } catch {
            vidBuf32 = null;
          }
        }
      }

      // 2. Render Fluid
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
          let pixel = 0;

          // Map canvas X to simulation space
          const simXFloat = cx * simScaleX;
          const simX0 = simXFloat | 0;
          const simX1 = simX0 + 1;
          const fracX = simXFloat - simX0;

          // Bilinear sample fluid density at (cx, cy)
          const d00 = dens[r0 + simX0];
          const d10 = dens[r0 + simX1];
          const d01 = dens[r1 + simX0];
          const d11 = dens[r1 + simX1];

          const fluidDensity =
            (1 - fracX) * ((1 - fracY) * d00 + fracY * d01) +
            fracX * ((1 - fracY) * d10 + fracY * d11);

          if (isDesign) {
            // ==========================================
            // === DESIGN & IDENTITY: OPTICAL REFRACTION
            // ==========================================
            // Dynamic liquid refraction with adjustable specular glint & distortion
            if (hasMotion) {
              const u00 = u[r0 + simX0];
              const u10 = u[r0 + simX1];
              const u01 = u[r1 + simX0];
              const u11 = u[r1 + simX1];
              const vx =
                (1 - fracX) * ((1 - fracY) * u00 + fracY * u01) +
                fracX * ((1 - fracY) * u10 + fracY * u11);

              const v00 = v[r0 + simX0];
              const v10 = v[r0 + simX1];
              const v01 = v[r1 + simX0];
              const v11 = v[r1 + simX1];
              const vy =
                (1 - fracX) * ((1 - fracY) * v00 + fracY * v01) +
                fracX * ((1 - fracY) * v10 + fracY * v11);

              const speedSq = vx * vx + vy * vy;

              if (speedSq > 0.0001 || fluidDensity > 0.005) {
                const speed = Math.sqrt(speedSq);
                const dispStrength = currentRefraction.distortion;
                const dispX = vx * dispStrength;
                const dispY = vy * dispStrength;

                // Tunable specular sheen (If specular is 0.0, maxSpec is 0 -> pure video deformation!)
                const waveSlope = speed * 1.5 + fluidDensity * 0.45;
                const maxSpec = Math.round(180 * currentRefraction.specular);
                const specular = maxSpec > 0
                  ? Math.min(maxSpec, Math.floor(Math.pow(Math.min(1.0, waveSlope * 1.5), 1.35) * maxSpec))
                  : 0;

                if (vidBuf32) {
                  // Refraction with Chromatic Dispersion
                  const chrom = currentRefraction.chromatic;
                  const rMult = 1.0 + chrom * 0.35;
                  const bMult = 1.0 - chrom * 0.35;

                  // Red channel offset
                  const rx = Math.max(0, Math.min(canvasW - 1, (cx + dispX * rMult) | 0));
                  const ry = Math.max(0, Math.min(canvasH - 1, (cy + dispY * rMult) | 0));
                  const r = vidBuf32[ry * canvasW + rx] & 0xff;

                  // Green channel center
                  const gx = Math.max(0, Math.min(canvasW - 1, (cx + dispX) | 0));
                  const gy = Math.max(0, Math.min(canvasH - 1, (cy + dispY) | 0));
                  const g = (vidBuf32[gy * canvasW + gx] >> 8) & 0xff;

                  // Blue channel offset
                  const bx = Math.max(0, Math.min(canvasW - 1, (cx + dispX * bMult) | 0));
                  const by = Math.max(0, Math.min(canvasH - 1, (cy + dispY * bMult) | 0));
                  const b = (vidBuf32[by * canvasW + bx] >> 16) & 0xff;

                  // Composite displaced image with specular highlight
                  const outR = Math.min(255, r + specular);
                  const outG = Math.min(255, g + specular);
                  const outB = Math.min(255, b + Math.floor(specular * 1.1));

                  // Alpha blend: smoothly overlays distorted ripples over undisturbed background video
                  const alpha = Math.min(255, Math.floor(Math.min(1.0, speed * 2.8 + fluidDensity * 1.6) * 255));
                  pixel = makeColor(outR, outG, outB, alpha);
                } else if (specular > 0) {
                  // Fallback transparent sheen if video buffer is loading
                  pixel = makeColor(255, 255, 255, specular);
                }
              }
            }
          } else {
            // ==========================================
            // === GAMEDEV REALM: RETRO BAYER DITHER
            // ==========================================
            const bayerThreshold = bayerRow[cx % 4] / 16;

            // A. Base subtle resting dither field
            if (currentSettings.baseOpacity > 0 && bayerRow[cx % 4] === 0) {
              const baseAlpha = Math.floor(currentSettings.baseOpacity * 255);
              pixel = makeColor(255, 255, 255, baseAlpha);
            }

            // B. Threshold dynamic fluid density
            if (fluidDensity > 0.015) {
              // Edge Sharpness power curve:
              // < 1.0 = soft, gradual dissolve fringes
              // 1.0–1.8 = balanced retro Bayer dither edge
              // 2.5–3.0 = sharp, crunchy retro threshold edge
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
      window.removeEventListener('kum-dither-settings', handleDitherUpdate);
      window.removeEventListener('kum-refraction-settings', handleRefractionUpdate);
    };
  }, [isDesign, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-[1] transition-opacity duration-500 ${
        isDesign ? 'opacity-95' : 'opacity-100'
      }`}
      style={{
        imageRendering: isDesign ? 'auto' : 'pixelated',
        filter: 'none',
        willChange: 'transform, opacity',
      }}
      aria-hidden="true"
    />
  );
};
