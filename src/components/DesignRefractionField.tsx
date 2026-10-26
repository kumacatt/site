import React, { useEffect, useRef } from 'react';
import { loadRefractionSettings, RefractionSettings } from './DitherTuner';

// Navier-Stokes fluid simulation grid resolution
const SIM_W = 128;
const SIM_H = 72;
const SIM_SIZE = SIM_W * SIM_H;

// Vertex Shader: full-screen quad
const VS_SOURCE = `
attribute vec2 a_pos;
varying vec2 vUv;
void main() {
  vUv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Fragment Shader: hardware bilinear texture sampling with optical liquid refraction & chromatic dispersion
const FS_SOURCE = `
precision highp float;
varying vec2 vUv;

uniform sampler2D u_video;
uniform sampler2D u_fluid;
uniform float u_distortion;
uniform float u_chromatic;
uniform float u_specular;
uniform vec2 u_resolution;
uniform vec2 u_videoSize;

void main() {
  // 1. Aspect-ratio preserving object-cover UVs for video
  vec2 coverUv = vUv;
  float screenAspect = u_resolution.x / u_resolution.y;
  float videoAspect = u_videoSize.x / u_videoSize.y;
  if (screenAspect > videoAspect) {
    float scale = screenAspect / videoAspect;
    coverUv.y = (coverUv.y - 0.5) / scale + 0.5;
  } else {
    float scale = videoAspect / screenAspect;
    coverUv.x = (coverUv.x - 0.5) / scale + 0.5;
  }

  // Flip Y coordinate so video is rendered right-side up
  coverUv.y = 1.0 - coverUv.y;

  // 2. Hardware bilinear sample of fluid field (velocity in R & G, density in B)
  vec2 fluidUv = vec2(vUv.x, 1.0 - vUv.y);
  vec4 fluid = texture2D(u_fluid, fluidUv);
  vec2 vel = (fluid.rg - 0.5) * 2.0;
  float density = fluid.b;
  float speed = length(vel);

  // If fluid is at rest, render undistorted native 1080p video directly
  if (speed < 0.0005 && density * 0.5 < 0.001) {
    gl_FragColor = texture2D(u_video, coverUv);
    return;
  }

  // 3. Aspect-corrected displacement vector
  vec2 disp = vel * (u_distortion * 0.0014);
  disp.x /= screenAspect;

  // 4. Chromatic dispersion (prism Red/Blue split)
  // Scaled by 0.40 so rainbow fringes are vividly and beautifully visible
  float chrom = u_chromatic * 0.40;
  vec2 uvR = clamp(coverUv + disp * (1.0 + chrom), 0.001, 0.999);
  vec2 uvG = clamp(coverUv + disp, 0.001, 0.999);
  vec2 uvB = clamp(coverUv + disp * (1.0 - chrom), 0.001, 0.999);

  float r = texture2D(u_video, uvR).r;
  float g = texture2D(u_video, uvG).g;
  float b = texture2D(u_video, uvB).b;

  // 5. Specular water surface glint (0.0 = pure clear glass, no white)
  float slope = speed * 1.6 + density * 0.45;
  float spec = pow(clamp(slope * 1.5, 0.0, 1.0), 1.4) * (u_specular * 0.75);

  gl_FragColor = vec4(clamp(vec3(r, g, b) + vec3(spec, spec, spec * 1.1), 0.0, 1.0), 1.0);
}
`;

interface DesignRefractionFieldProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export const DesignRefractionField: React.FC<DesignRefractionFieldProps> = ({ videoRef, canvasRef: externalRef }) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalRef || internalRef;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize WebGL context
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false }) ||
               (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return;

    let animId: number;

    // Load dynamic tuner settings
    let currentSettings: RefractionSettings = loadRefractionSettings();
    const handleSettingsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<RefractionSettings>;
      if (customEvent.detail) {
        currentSettings = { ...customEvent.detail };
      }
    };
    window.addEventListener('kum-refraction-settings', handleSettingsUpdate);

    // Compile Shader Program
    const createShader = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const vs = createShader(gl.VERTEX_SHADER, VS_SOURCE);
    const fs = createShader(gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Full-screen Quad Buffer [-1, -1] to [1, 1]
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Uniform Locations
    const uVideoLoc = gl.getUniformLocation(program, 'u_video');
    const uFluidLoc = gl.getUniformLocation(program, 'u_fluid');
    const uDistortionLoc = gl.getUniformLocation(program, 'u_distortion');
    const uChromaticLoc = gl.getUniformLocation(program, 'u_chromatic');
    const uSpecularLoc = gl.getUniformLocation(program, 'u_specular');
    const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const uVideoSizeLoc = gl.getUniformLocation(program, 'u_videoSize');

    gl.uniform1i(uVideoLoc, 0); // TEXTURE0
    gl.uniform1i(uFluidLoc, 1); // TEXTURE1

    // Video Texture (Texture 0)
    const videoTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Initialize with a dark fallback
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([10, 8, 14, 255]));

    // Fluid Texture (Texture 1) - 128x72 RGBA
    const fluidTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fluidTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const fluidData = new Uint8Array(SIM_SIZE * 4);
    fluidData.fill(128); // neutral 0 velocity
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SIM_W, SIM_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, fluidData);

    // Canvas Resize (Native DPI for razor-sharp 1080p/4K rendering)
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(window.innerWidth * dpr);
      const h = Math.round(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Navier-Stokes fluid simulation buffers
    const u = new Float32Array(SIM_SIZE);
    const v = new Float32Array(SIM_SIZE);
    const u_prev = new Float32Array(SIM_SIZE);
    const v_prev = new Float32Array(SIM_SIZE);
    const dens = new Float32Array(SIM_SIZE);
    const dens_prev = new Float32Array(SIM_SIZE);

    let lastSimX = -100;
    let lastSimY = -100;
    let isMouseActive = false;

    // Semi-Lagrangian Advection
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

    // Incompressibility Projection
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

    // Mouse Movement
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
        const steps = Math.min(14, Math.max(1, Math.ceil(dist / 1.4)));
        const stepDx = dx / steps;
        const stepDy = dy / steps;

        const baseRadius = currentSettings.waveRadius;
        const radius = Math.min(baseRadius * 1.5, baseRadius * 0.75 + dist * 0.16);
        const force = Math.min(4.5, 0.6 + dist * 0.35);

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

    // WebGL 60-120 FPS Render Loop
    const render = () => {
      const dt = 0.016;

      // 1. Advance Navier-Stokes Simulation
      u_prev.set(u);
      v_prev.set(v);
      advect(u, u_prev, u_prev, v_prev, dt);
      advect(v, v_prev, u_prev, v_prev, dt);
      project(u, v, u_prev, v_prev);

      dens_prev.set(dens);
      advect(dens, dens_prev, u, v, dt);

      // Dissipation from settings
      const dissipation = currentSettings.dissipation;
      for (let i = 0; i < SIM_SIZE; i++) {
        dens[i] *= dissipation;
        u[i] *= 0.965;
        v[i] *= 0.965;
      }

      // 2. Pack Simulation into 128x72 Texture Buffer
      for (let i = 0; i < SIM_SIZE; i++) {
        const o = i * 4;
        fluidData[o] = Math.max(0, Math.min(255, Math.round(128 + u[i] * 42)));
        fluidData[o + 1] = Math.max(0, Math.min(255, Math.round(128 + v[i] * 42)));
        fluidData[o + 2] = Math.max(0, Math.min(255, Math.round(dens[i] * 102)));
        fluidData[o + 3] = 255;
      }

      // Upload fluid texture with hardware bilinear filtering
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, fluidTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SIM_W, SIM_H, gl.RGBA, gl.UNSIGNED_BYTE, fluidData);

      // 3. Upload Native Video Texture directly to GPU
      const video = videoRef.current;
      if (video && video.readyState >= 2 && !video.paused) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.uniform2f(uVideoSizeLoc, video.videoWidth || 1920, video.videoHeight || 1080);
      } else {
        gl.uniform2f(uVideoSizeLoc, 1920, 1080);
      }

      // 4. Update Uniforms
      gl.uniform1f(uDistortionLoc, currentSettings.distortion);
      gl.uniform1f(uChromaticLoc, currentSettings.chromatic);
      gl.uniform1f(uSpecularLoc, currentSettings.specular);
      gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);

      // 5. Draw Hardware-Accelerated Quad
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('kum-refraction-settings', handleSettingsUpdate);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteTexture(videoTexture);
      gl.deleteTexture(fluidTexture);
      gl.deleteBuffer(quadBuffer);
    };
  }, [videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-1000 opacity-65"
      style={{
        willChange: 'opacity, filter',
      }}
      aria-hidden="true"
    />
  );
};
