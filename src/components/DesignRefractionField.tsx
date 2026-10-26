import React, { useEffect, useRef } from 'react';
import { loadRefractionSettings, RefractionSettings } from '../utils/tunerSettings';

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
uniform vec3 u_firefly0;
uniform vec3 u_firefly1;
uniform vec3 u_firefly2;

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

  // 3. Aspect-corrected displacement vector (physical isotropic screen pixels)
  vec2 disp = vel * (u_distortion * 0.0014);
  disp.x /= screenAspect;

  // Convert screen displacement to coverUv displacement without aspect stretching
  vec2 coverDisp = disp;
  if (screenAspect > videoAspect) {
    float scale = screenAspect / videoAspect;
    coverDisp.y /= scale;
  } else {
    float scale = videoAspect / screenAspect;
    coverDisp.x /= scale;
  }

  // 4. Chromatic dispersion (prism Red/Blue split)
  // Scaled by 0.40 so rainbow fringes are vividly and beautifully visible
  float chrom = u_chromatic * 0.40;
  vec2 uvR = clamp(coverUv + coverDisp * (1.0 + chrom), 0.001, 0.999);
  vec2 uvG = clamp(coverUv + coverDisp, 0.001, 0.999);
  vec2 uvB = clamp(coverUv + coverDisp * (1.0 - chrom), 0.001, 0.999);

  float r = texture2D(u_video, uvR).r;
  float g = texture2D(u_video, uvG).g;
  float b = texture2D(u_video, uvB).b;

  // 5. Specular water surface glint (0.0 = pure clear glass, no white)
  float slope = speed * 1.6 + density * 0.45;
  float spec = pow(clamp(slope * 1.5, 0.0, 1.0), 1.4) * (u_specular * 0.75);

  vec3 col = clamp(vec3(r, g, b) + vec3(spec, spec, spec * 1.1), 0.0, 1.0);

  // 6. Luminous celestial fireflies in mobile mode
  vec2 screenUv = vec2(vUv.x, 1.0 - vUv.y);
  if (u_firefly0.z > 0.01) {
    vec2 d0 = (screenUv - u_firefly0.xy);
    d0.x *= screenAspect;
    float dist0 = length(d0);
    if (dist0 < 0.04) {
      float sp0 = pow(1.0 - dist0 / 0.04, 2.5) * u_firefly0.z;
      col += vec3(0.95, 0.85, 1.0) * sp0 * 0.70;
    }
  }

  if (u_firefly1.z > 0.01) {
    vec2 d1 = (screenUv - u_firefly1.xy);
    d1.x *= screenAspect;
    float dist1 = length(d1);
    if (dist1 < 0.04) {
      float sp1 = pow(1.0 - dist1 / 0.04, 2.5) * u_firefly1.z;
      col += vec3(0.95, 0.85, 1.0) * sp1 * 0.70;
    }
  }

  if (u_firefly2.z > 0.01) {
    vec2 d2 = (screenUv - u_firefly2.xy);
    d2.x *= screenAspect;
    float dist2 = length(d2);
    if (dist2 < 0.04) {
      float sp2 = pow(1.0 - dist2 / 0.04, 2.5) * u_firefly2.z;
      col += vec3(0.95, 0.85, 1.0) * sp2 * 0.70;
    }
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

interface DesignRefractionFieldProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  active?: boolean;
  isPaused?: boolean;
}

export const DesignRefractionField: React.FC<DesignRefractionFieldProps> = ({
  videoRef,
  canvasRef: externalRef,
  active = true,
  isPaused = false,
}) => {
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalRef || internalRef;
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

    // Initialize WebGL context
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false }) ||
               (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return;

    let animId = 0;
    let isLoopRunning = false;

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
    const uFirefly0Loc = gl.getUniformLocation(program, 'u_firefly0');
    const uFirefly1Loc = gl.getUniformLocation(program, 'u_firefly1');
    const uFirefly2Loc = gl.getUniformLocation(program, 'u_firefly2');

    gl.uniform1i(uVideoLoc, 0); // TEXTURE0
    gl.uniform1i(uFluidLoc, 1); // TEXTURE1

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

    // Aspect-ratio matching simulation grid (guarantees 100% square cells and zero horizontal stretching)
    const simH = 72;
    let simW = Math.max(32, Math.min(256, Math.round(simH * (window.innerWidth / Math.max(1, window.innerHeight)))));
    let simSize = simW * simH;

    // Fluid Texture (Texture 1) - square cell RGBA
    const fluidTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, fluidTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    let fluidData = new Uint8Array(simSize * 4);
    fluidData.fill(128); // neutral 0 velocity
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, simW, simH, 0, gl.RGBA, gl.UNSIGNED_BYTE, fluidData);

    // Canvas Resize (Native DPI for razor-sharp 1080p/4K rendering, clamped to 1.5 max for GPU efficiency)
    const resize = () => {
      isMobile = window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(window.innerWidth * dpr);
      const h = Math.round(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }

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
        fluidData = new Uint8Array(simSize * 4);
        fluidData.fill(128);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, fluidTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, simW, simH, 0, gl.RGBA, gl.UNSIGNED_BYTE, fluidData);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Navier-Stokes fluid simulation buffers
    let u = new Float32Array(simSize);
    let v = new Float32Array(simSize);
    let u_prev = new Float32Array(simSize);
    let v_prev = new Float32Array(simSize);
    let dens = new Float32Array(simSize);
    let dens_prev = new Float32Array(simSize);

    let lastSimX = -100;
    let lastSimY = -100;
    let lastSimTime = 0;
    let isMouseActive = false;

    // Semi-Lagrangian Advection
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

    // Incompressibility Projection
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

    // Unified Pointer Movement (Mouse and Touch)
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
        // Speed normalized to ~60fps frame displacement in grid cells
        const vNorm = (dist / dt) * 16.67;

        // Dynamic speed-dependent wave radius: faster movement = broader splash!
        const baseRadius = currentSettings.waveRadius || 10;
        const speedFactor = 0.35 + 1.85 * (1 - Math.exp(-vNorm / 3.0));
        const radius = baseRadius * speedFactor;

        // Dynamic force: energetic flicks impart much stronger velocity impulse
        const force = Math.min(5.5, 0.5 + vNorm * 0.45);

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
              // True Euclidean circular distance in square grid cells
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

    // Radial Click Shockwave (drops a tactile pebble into the liquid)
    const triggerSplash = (cx: number, cy: number, strength = 1.0) => {
      const radius = Math.min(simH * 0.45, (currentSettings.waveRadius || 10) * 1.8 * strength);
      const force = 6.2 * strength;
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
            dens[idx] = Math.min(3.2, dens[idx] + waveProfile * 2.5 * strength);
          }
        }
      }
    };

    // Expanding Realm Transition Wave across the entire screen
    const triggerTransitionShockwave = (normX = 0.5, normY = 0.08) => {
      const cx = normX * simW;
      const cy = normY * simH;
      let frame = 0;
      const totalFrames = 24;

      const step = () => {
        frame++;
        const progress = frame / totalFrames;
        const radius = 6 + progress * (simH * 1.15);
        const force = 8.5 * (1 - progress * 0.4);
        const densityStrength = 3.0 * (1 - progress * 0.35);

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
              u[idx] += normX * force * smoothFalloff * 0.25;
              v[idx] += normY * force * smoothFalloff * 0.25;
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
      if (customEvent.detail?.toRealm === 'design') {
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

    // WebGL 60-120 FPS Render Loop
    const render = () => {
      if (document.hidden || isPausedRef.current || (!activeRef.current && transitionFramesRef.current <= 0)) {
        isLoopRunning = false;
        return;
      }
      if (!activeRef.current) {
        transitionFramesRef.current--;
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
            const radius = (currentSettings.waveRadius || 10) * 0.75;
            const force = 4.2;
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
                  dens[idx] = Math.min(2.8, dens[idx] + falloff * 0.85);
                  u[idx] += dx * force * falloff * 0.32;
                  v[idx] += dy * force * falloff * 0.32;
                }
              }
            }
          }
        }
      }

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
      for (let i = 0; i < simSize; i++) {
        dens[i] *= dissipation;
        u[i] *= 0.965;
        v[i] *= 0.965;
      }

      // 2. Pack Simulation into Texture Buffer
      for (let i = 0; i < simSize; i++) {
        const o = i * 4;
        fluidData[o] = Math.max(0, Math.min(255, Math.round(128 + u[i] * 42)));
        fluidData[o + 1] = Math.max(0, Math.min(255, Math.round(128 + v[i] * 42)));
        fluidData[o + 2] = Math.max(0, Math.min(255, Math.round(dens[i] * 102)));
        fluidData[o + 3] = 255;
      }

      // Upload fluid texture with hardware bilinear filtering
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, fluidTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, simW, simH, gl.RGBA, gl.UNSIGNED_BYTE, fluidData);

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

      // Firefly uniforms for mobile
      if (isMobile) {
        gl.uniform3f(uFirefly0Loc, fireflies[0].x, fireflies[0].y, fireflies[0].glow);
        gl.uniform3f(uFirefly1Loc, fireflies[1].x, fireflies[1].y, fireflies[1].glow);
        gl.uniform3f(uFirefly2Loc, fireflies[2].x, fireflies[2].y, fireflies[2].glow);
      } else {
        gl.uniform3f(uFirefly0Loc, 0, 0, 0);
        gl.uniform3f(uFirefly1Loc, 0, 0, 0);
        gl.uniform3f(uFirefly2Loc, 0, 0, 0);
      }

      // 5. Draw Hardware-Accelerated Quad
      gl.drawArrays(gl.TRIANGLES, 0, 6);

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
