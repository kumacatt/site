import React, { useState, useEffect, useRef } from 'react';
import { RealmType } from '../data/projects';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';
import { LanguageSwitch } from './LanguageSwitch';
import { getAssetUrl } from '../utils/asset';
import { loadRefractionSettings, RefractionSettings } from '../utils/tunerSettings';

// 4x4 Bayer Matrix for Ordered Dithering
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// Lightweight, web-optimized versions (1920px max dimension, 150-500KB)
const GAMEDEV_PORTAL_ARTWORKS = [
  '/1_fragile_screen (1).jpg',
  '/1_fragile_screen (2).jpg',
  '/1_fragile_screen (3).jpg',
  '/1_Sinclair_web.jpg',
  '/1_speedsculpt_jab_P.png',
  '/1_speedsculpt_mushroom.png',
  '/1_fumel_web.jpg',
  '/1_whintercore_web.jpg',
  '/1_fishing_web.jpg',
  '/1_nitted_P.png',
  '/1_gamepromo_cover.png',
  '/1_MORPHINBeta_web.jpg'
].map(getAssetUrl);

const DESIGN_PORTAL_ARTWORKS = [
  '/2_kashtan3doffice_P.png',
  '/2_env_P.png',
  '/2_Polyana_P.png'
].map(getAssetUrl);

interface PortalViewProps {
  onSelectRealm: (realm: RealmType) => void;
  onBackToIntro?: () => void;
}

// Memory-efficient two-slot slide layer with persistent DOM nodes and 1000ms CSS crossfades
const PortalSlideLayer: React.FC<{
  images: string[];
  startIndex?: number;
  intervalMs?: number;
  hovered: boolean;
  alt: string;
}> = ({ images, startIndex = 0, intervalMs = 3000, hovered, alt }) => {
  useEffect(() => {
    images.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);

  const safeStart = startIndex >= 0 && startIndex < images.length ? startIndex : 0;
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [srcA, setSrcA] = useState(images[safeStart]);
  const [srcB, setSrcB] = useState(images[(safeStart + 1) % images.length]);

  const nextIdxRef = useRef((safeStart + 1) % images.length);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setActiveSlot(prevSlot => {
        if (prevSlot === 'A') {
          timeoutRef.current = window.setTimeout(() => {
            const nextIdx = (nextIdxRef.current + 1) % images.length;
            nextIdxRef.current = nextIdx;
            setSrcA(images[nextIdx]);
          }, 1100);
          return 'B';
        } else {
          timeoutRef.current = window.setTimeout(() => {
            const nextIdx = (nextIdxRef.current + 1) % images.length;
            nextIdxRef.current = nextIdx;
            setSrcB(images[nextIdx]);
          }, 1100);
          return 'A';
        }
      });
    }, intervalMs);

    return () => {
      clearInterval(timer);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [images, intervalMs]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden transition-all duration-700 ease-out ${
        hovered
          ? 'scale-105 filter grayscale-0 brightness-90 opacity-100'
          : 'scale-100 filter grayscale-[80%] brightness-45 opacity-70'
      }`}
      style={{ willChange: 'transform, filter, opacity' }}
    >
      <img
        src={srcA}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out ${
          activeSlot === 'A' ? 'opacity-100 z-10' : 'opacity-0 z-0'
        }`}
        style={{ willChange: 'opacity' }}
      />
      <img
        src={srcB}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out ${
          activeSlot === 'B' ? 'opacity-100 z-10' : 'opacity-0 z-0'
        }`}
        style={{ willChange: 'opacity' }}
      />
    </div>
  );
};

// =========================================================================
// 1. GAMEDEV INTERACTIVE BAYER DITHER OVERLAY (Tactile Angled Matrix Energy)
// =========================================================================
const PortalDitherCanvas: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ normX: number; normY: number; active: boolean }>({
    normX: -100,
    normY: -100,
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let isLoopRunning = false;
    const PIXEL_SCALE = 3;
    let w = 0;
    let h = 0;
    let imageData: ImageData | null = null;
    let buf32: Uint32Array | null = null;

    let targetGlow = 0;
    let currentGlow = 0;
    let ripplePhase = 0;

    // Dynamically synchronize canvas size with container (eliminating flex-transition stretching)
    const syncCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.ceil(rect.width / PIXEL_SCALE);
      const targetH = Math.ceil(rect.height / PIXEL_SCALE);
      if (targetW > 0 && targetH > 0 && (canvas.width !== targetW || canvas.height !== targetH)) {
        canvas.width = targetW;
        canvas.height = targetH;
        w = targetW;
        h = targetH;
        imageData = ctx.createImageData(w, h);
        buf32 = new Uint32Array(imageData.data.buffer);
      }
    };

    syncCanvasSize();

    const makeColor = (r: number, g: number, b: number, a: number) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    };

    // Normalized mouse coordinates ensure 1:1 pinpoint cursor tracking across all screen sizes
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        mouseRef.current.normX = (e.clientX - rect.left) / rect.width;
        mouseRef.current.normY = (e.clientY - rect.top) / rect.height;
        mouseRef.current.active = true;
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          mouseRef.current.normX = (e.touches[0].clientX - rect.left) / rect.width;
          mouseRef.current.normY = (e.touches[0].clientY - rect.top) / rect.height;
          mouseRef.current.active = true;
        }
      }
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseLeave);
      parent.addEventListener('touchmove', handleTouchMove, { passive: true });
      parent.addEventListener('touchstart', handleTouchMove, { passive: true });
      parent.addEventListener('touchend', handleMouseLeave, { passive: true });
    }

    const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024));

    const render = () => {
      if (document.hidden) {
        isLoopRunning = false;
        return;
      }

      syncCanvasSize();

      targetGlow = active ? 1.0 : (isMobile ? 0.35 : 0.0);
      currentGlow += (targetGlow - currentGlow) * 0.08;
      ripplePhase += 0.035;

      if (!buf32 || !imageData || w === 0 || h === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      if (currentGlow < 0.01 && !mouseRef.current.active) {
        buf32.fill(0);
        ctx.clearRect(0, 0, w, h);
        animId = requestAnimationFrame(render);
        return;
      }

      buf32.fill(0);

      const mx = mouseRef.current.normX * w;
      const my = mouseRef.current.normY * h;
      const mActive = mouseRef.current.active && active;

      for (let cy = 0; cy < h; cy++) {
        const by = cy % 4;
        const bRow = BAYER_4X4[by];
        const rowOffset = cy * w;

        for (let cx = 0; cx < w; cx++) {
          const bayerThresh = bRow[cx % 4] / 16.0;

          // Wave equation: ~7 degree angled moving raster stripes (loved by user)
          const stripeWave = Math.sin((cx * 0.07 + cy * 0.014) - ripplePhase * 1.4);

          // Moving raster stripes baseline
          let intensity = Math.max(0, stripeWave * 0.16 + 0.04) * currentGlow;

          // Mouse excitation: NO CIRCLES! Directly energizes and sharpens the stripes under cursor
          if (mActive) {
            const dx = cx - mx;
            const dy = cy - my;
            const dist = Math.hypot(dx, dy);
            const radius = 95;
            if (dist < radius) {
              const falloff = 1.0 - dist / radius;
              const smoothFalloff = falloff * falloff;
              intensity += (stripeWave * 0.45 + 0.55) * smoothFalloff * 0.95 * currentGlow;
            }
          }

          let pixel = 0;
          if (intensity > 0.02) {
            const shaped = Math.pow(Math.min(1.0, intensity), 1.25);
            if (shaped > bayerThresh) {
              const isCore = shaped > 0.6;
              const r = isCore ? 253 : 245;
              const g = isCore ? 224 : 158;
              const b = isCore ? 71 : 11;
              const alpha = Math.min(235, Math.floor(50 + shaped * 185));
              pixel = makeColor(r, g, b, alpha);
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

    const scheduleRender = () => {
      if (!isLoopRunning && !document.hidden) {
        isLoopRunning = true;
        animId = requestAnimationFrame(render);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        scheduleRender();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    scheduleRender();

    return () => {
      cancelAnimationFrame(animId);
      isLoopRunning = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseLeave);
        parent.removeEventListener('touchmove', handleTouchMove);
        parent.removeEventListener('touchstart', handleTouchMove);
        parent.removeEventListener('touchend', handleMouseLeave);
      }
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-20 mix-blend-screen transition-opacity duration-500 ${
        active ? 'opacity-90' : 'opacity-0'
      }`}
      style={{ imageRendering: 'pixelated' }}
      aria-hidden="true"
    />
  );
};

// =========================================================================
// 2. DESIGN INTERACTIVE LIQUID REFRACTION OVERLAY (Authentic WebGL Fluid Mechanics)
// =========================================================================

const VS_PORTAL = `
attribute vec2 a_pos;
varying vec2 vUv;
void main() {
  vUv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FS_PORTAL = `
precision highp float;
varying vec2 vUv;

uniform sampler2D u_tex0;
uniform sampler2D u_tex1;
uniform sampler2D u_fluid;
uniform float u_fade;
uniform float u_distortion;
uniform float u_chromatic;
uniform float u_specular;
uniform vec2 u_resolution;
uniform vec2 u_imgSize0;
uniform vec2 u_imgSize1;
uniform float u_time;
uniform float u_glow;
uniform vec2 u_mouse;
uniform float u_mouseActive;

vec2 getCoverUv(vec2 uv, vec2 imgSize) {
  vec2 cUv = uv;
  float screenAspect = max(0.01, u_resolution.x) / max(0.01, u_resolution.y);
  float imgAspect = max(0.01, imgSize.x) / max(0.01, imgSize.y);
  if (screenAspect > imgAspect) {
    float scale = screenAspect / imgAspect;
    cUv.y = (cUv.y - 0.5) / scale + 0.5;
  } else {
    float scale = imgAspect / screenAspect;
    cUv.x = (cUv.x - 0.5) / scale + 0.5;
  }
  cUv.y = 1.0 - cUv.y;
  return cUv;
}

void main() {
  vec2 fluidUv = vec2(vUv.x, 1.0 - vUv.y);
  vec4 fluid = texture2D(u_fluid, fluidUv);
  vec2 vel = (fluid.rg - 0.5) * 2.0;
  float density = fluid.b;
  float speed = length(vel);

  float screenAspect = max(0.01, u_resolution.x) / max(0.01, u_resolution.y);

  // 1. Fluid Velocity Displacement (only active on hover via u_glow)
  vec2 fluidDisp = vel * (u_distortion * 0.0014) * u_glow;
  fluidDisp.x /= screenAspect;

  float chrom = u_chromatic * 0.35 * u_glow;

  // 2. Optical Glass Fluted Stripe Refraction (activates smoothly only on hover!)
  vec2 domCoord = vec2(vUv.x, 1.0 - vUv.y) * u_resolution;
  vec2 mousePixel = u_mouse * u_resolution;

  // Phase of the angled moving stripes (identical ~7 degree angle: cx * 0.07 + cy * 0.014 in 3px units)
  float stripePhase = (domCoord.x * 0.0233333 + domCoord.y * 0.0046666) - u_time * 1.4;

  // Fluid velocity and ripples dynamically warp the stripe refraction wave
  stripePhase += (vel.x * 2.5 + vel.y * 1.5 + density * 5.0) * u_glow;

  // Normal vector perpendicular to the stripes
  vec2 stripeNormal = normalize(vec2(0.07, 0.014));
  stripeNormal.x /= screenAspect;

  // Optical slope (derivative of the fluted glass surface)
  float stripeWave = sin(stripePhase);
  float stripeSlope = cos(stripePhase);

  // Mouse excitation: when cursor is near, the stripe distortion intensifies gracefully
  float mouseDist = length(domCoord - mousePixel);
  float mouseExcitation = 0.0;
  if (u_mouseActive > 0.5 && mouseDist < 300.0) {
    float falloff = 1.0 - mouseDist / 300.0;
    mouseExcitation = falloff * falloff * 1.2;
  }

  // Refined optical stripe displacement factor (calibrated for elegant, non-overwhelming refraction)
  // Strictly scaled by u_glow: zero distortion when not hovered!
  float stripeDistortPower = (0.007 + mouseExcitation * 0.012 + speed * 0.008) * (u_distortion / 60.0) * u_glow;
  vec2 stripeDisp = stripeNormal * (stripeSlope * stripeDistortPower);

  // Combined total displacement (fluid motion + moving fluted stripes)
  vec2 totalDisp = fluidDisp + stripeDisp;

  // Aspect-corrected displacement for image 0
  float imgAspect0 = max(0.01, u_imgSize0.x) / max(0.01, u_imgSize0.y);
  vec2 coverDisp0 = totalDisp;
  if (screenAspect > imgAspect0) {
    coverDisp0.y /= (screenAspect / imgAspect0);
  } else {
    coverDisp0.x /= (imgAspect0 / screenAspect);
  }

  vec2 baseUv0 = getCoverUv(vUv, u_imgSize0);
  vec2 uvR0 = clamp(baseUv0 + coverDisp0 * (1.0 + chrom), 0.001, 0.999);
  vec2 uvG0 = clamp(baseUv0 + coverDisp0, 0.001, 0.999);
  vec2 uvB0 = clamp(baseUv0 + coverDisp0 * (1.0 - chrom), 0.001, 0.999);

  vec4 col0 = vec4(
    texture2D(u_tex0, uvR0).r,
    texture2D(u_tex0, uvG0).g,
    texture2D(u_tex0, uvB0).b,
    1.0
  );

  vec4 col = col0;
  if (u_fade > 0.001) {
    float imgAspect1 = max(0.01, u_imgSize1.x) / max(0.01, u_imgSize1.y);
    vec2 coverDisp1 = totalDisp;
    if (screenAspect > imgAspect1) {
      coverDisp1.y /= (screenAspect / imgAspect1);
    } else {
      coverDisp1.x /= (imgAspect1 / screenAspect);
    }

    vec2 baseUv1 = getCoverUv(vUv, u_imgSize1);
    vec2 uvR1 = clamp(baseUv1 + coverDisp1 * (1.0 + chrom), 0.001, 0.999);
    vec2 uvG1 = clamp(baseUv1 + coverDisp1, 0.001, 0.999);
    vec2 uvB1 = clamp(baseUv1 + coverDisp1 * (1.0 - chrom), 0.001, 0.999);

    vec4 col1 = vec4(
      texture2D(u_tex1, uvR1).r,
      texture2D(u_tex1, uvG1).g,
      texture2D(u_tex1, uvB1).b,
      1.0
    );
    col = mix(col0, col1, u_fade);
  }

  // Refined, subtle holographic glass sheen along the stripe crests (fades to 0 when not hovered)
  float crest = pow(max(0.0, stripeWave * 0.5 + 0.5), 3.5);
  vec3 glassSheen = vec3(0.65, 0.35, 1.00) * (crest * (0.04 + mouseExcitation * 0.08) * u_glow);
  col.rgb += glassSheen;

  // Glossy specular water sheen (also scaled by u_glow)
  float slope = (speed * 1.6 + density * 0.5) * u_glow;
  float spec = pow(clamp(slope * 1.5, 0.0, 1.0), 1.3) * (u_specular * 0.70);

  gl_FragColor = vec4(clamp(col.rgb + vec3(spec * 0.9, spec * 0.8, spec * 1.15), 0.0, 1.0), 1.0);
}
`;

const PortalRefractionCanvas: React.FC<{
  images: string[];
  hovered: boolean;
  intervalMs?: number;
}> = ({ images, hovered, intervalMs = 3000 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredRef = useRef(hovered);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext('webgl', { alpha: false, antialias: false, depth: false }) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return;

    let animId = 0;
    let isLoopRunning = false;
    let currentSettings: RefractionSettings = loadRefractionSettings();

    const handleSettingsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<RefractionSettings>;
      if (customEvent.detail) {
        currentSettings = { ...customEvent.detail };
      }
    };
    window.addEventListener('kum-refraction-settings', handleSettingsUpdate);

    // Compile Shaders
    const createShader = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const vs = createShader(gl.VERTEX_SHADER, VS_PORTAL);
    const fs = createShader(gl.FRAGMENT_SHADER, FS_PORTAL);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Full-screen Quad
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

    // Uniform locations
    const uTex0Loc = gl.getUniformLocation(program, 'u_tex0');
    const uTex1Loc = gl.getUniformLocation(program, 'u_tex1');
    const uFluidLoc = gl.getUniformLocation(program, 'u_fluid');
    const uFadeLoc = gl.getUniformLocation(program, 'u_fade');
    const uDistortionLoc = gl.getUniformLocation(program, 'u_distortion');
    const uChromaticLoc = gl.getUniformLocation(program, 'u_chromatic');
    const uSpecularLoc = gl.getUniformLocation(program, 'u_specular');
    const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const uImgSize0Loc = gl.getUniformLocation(program, 'u_imgSize0');
    const uImgSize1Loc = gl.getUniformLocation(program, 'u_imgSize1');
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');
    const uGlowLoc = gl.getUniformLocation(program, 'u_glow');
    const uMouseLoc = gl.getUniformLocation(program, 'u_mouse');
    const uMouseActiveLoc = gl.getUniformLocation(program, 'u_mouseActive');

    gl.uniform1i(uTex0Loc, 0);
    gl.uniform1i(uTex1Loc, 1);
    gl.uniform1i(uFluidLoc, 2);

    // Create textures
    const createTex = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([12, 10, 18, 255]));
      return t;
    };

    const tex0 = createTex();
    const tex1 = createTex();

    // Dynamic Square-Cell Simulation Grid (Zero aspect stretching)
    const simH = 72;
    const initRect = canvas.getBoundingClientRect();
    const initAspect = initRect.width > 0 && initRect.height > 0 ? initRect.width / initRect.height : 1.0;
    let simW = Math.max(32, Math.min(256, Math.round(simH * initAspect)));
    let simSize = simW * simH;

    // Fluid texture (Texture 2)
    const fluidTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, fluidTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    let fluidData = new Uint8Array(simSize * 4);
    fluidData.fill(128);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, simW, simH, 0, gl.RGBA, gl.UNSIGNED_BYTE, fluidData);

    // Preload HTMLImageElements
    const imageElements: HTMLImageElement[] = [];
    images.forEach((src) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      imageElements.push(img);
    });

    const updateTexFromImage = (tex: WebGLTexture | null, img: HTMLImageElement) => {
      if (!tex || !img.complete || img.naturalWidth === 0) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    };

    let currentIdx = 0;
    let nextIdx = 1 % images.length;
    let fadeStartTime = 0;
    const FADE_DURATION = 800; // Crisp 800ms crossfade
    let isFading = false;

    // Load initial image
    imageElements.forEach((img, idx) => {
      if (img.complete && img.naturalWidth > 0) {
        if (idx === 0) updateTexFromImage(tex0, img);
      } else {
        img.onload = () => {
          if (idx === currentIdx) updateTexFromImage(tex0, img);
        };
      }
    });

    // Slideshow interval
    const slideTimer = setInterval(() => {
      if (isFading || imageElements.length < 2) return;
      nextIdx = (currentIdx + 1) % imageElements.length;
      gl.activeTexture(gl.TEXTURE1);
      updateTexFromImage(tex1, imageElements[nextIdx]);
      fadeStartTime = performance.now();
      isFading = true;
    }, intervalMs);

    // Navier-Stokes fluid buffers
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
    let targetGlow = 0;
    let currentGlow = 0;
    let ripplePhase = 0;
    let mouseNormX = -100;
    let mouseNormY = -100;
    let isMouseInside = false;

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
          div[idx] = -0.5 * (hX * (vx[idx + 1] - vx[idx - 1]) + hY * (vy[idx + simW] - vy[idx - simW]));
          p[idx] = 0;
        }
      }

      for (let iter = 0; iter < 10; iter++) {
        for (let y = 1; y < simH - 1; y++) {
          const r = y * simW;
          for (let x = 1; x < simW - 1; x++) {
            const idx = r + x;
            p[idx] = (div[idx] + p[idx - 1] + p[idx + 1] + p[idx - simW] + p[idx + simW]) * 0.25;
          }
        }
      }

      for (let y = 1; y < simH - 1; y++) {
        const r = y * simW;
        for (let x = 1; x < simW - 1; x++) {
          const idx = r + x;
          vx[idx] -= 0.5 * (p[idx + 1] - p[idx - 1]) * simW;
          vy[idx] -= 0.5 * (p[idx + simW] - p[idx - simW]) * simH;
        }
      }
    };

    // Unified Pointer Movement (Mouse and Touch)
    const handlePointerMove = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const normX = (clientX - rect.left) / rect.width;
      const normY = (clientY - rect.top) / rect.height;

      // Only inject force when cursor is within the Design half card bounds
      if (normX < 0 || normX > 1 || normY < 0 || normY > 1) {
        isMouseInside = false;
        if (isMouseActive) {
          isMouseActive = false;
          lastSimX = -100;
          lastSimY = -100;
        }
        return;
      }

      mouseNormX = normX;
      mouseNormY = normY;
      isMouseInside = true;

      const simX = normX * simW;
      const simY = normY * simH;

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

        // Portal card: refined, localized wave radius (proportional to half-screen card)
        const portalBaseRadius = (currentSettings.waveRadius || 10) * 0.38;
        const speedFactor = 0.4 + 1.15 * (1 - Math.exp(-vNorm / 3.0));
        const radius = portalBaseRadius * speedFactor;

        // Delicate, tactile fluid force
        const force = Math.min(3.0, 0.35 + vNorm * 0.22);

        // Multi-step interpolation ensures smooth, continuous fluid trails even during fast flicks
        const steps = Math.min(18, Math.max(1, Math.ceil(dist / Math.max(1.0, radius * 0.4))));
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
                dens[idx] = Math.min(1.6, dens[idx] + falloff * 0.55);
                u[idx] += dx * force * falloff * 0.09;
                v[idx] += dy * force * falloff * 0.09;
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

    const handleMouseLeave = () => {
      isMouseActive = false;
      isMouseInside = false;
      lastSimX = -100;
      lastSimY = -100;
      lastSimTime = 0;
    };

    // Refined Click Shockwave on Design Portal Card
    const triggerSplash = (cx: number, cy: number, strength = 1.0) => {
      const portalBaseRadius = (currentSettings.waveRadius || 10) * 0.42;
      const radius = Math.min(simH * 0.22, portalBaseRadius * 1.35 * strength);
      const force = 3.5 * strength;
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
            dens[idx] = Math.min(1.8, dens[idx] + waveProfile * 1.2 * strength);
          }
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return;

      const simX = normX * simW;
      const simY = normY * simH;
      triggerSplash(simX, simY, 1.2);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches[0]) {
        const t = e.touches[0];
        handlePointerMove(t.clientX, t.clientY);
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const normX = (t.clientX - rect.left) / rect.width;
          const normY = (t.clientY - rect.top) / rect.height;
          if (normX >= 0 && normX <= 1 && normY >= 0 && normY <= 1) {
            triggerSplash(normX * simW, normY * simH, 1.2);
          }
        }
      }
    };

    const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024));

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleMouseLeave, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      if (document.hidden) {
        isLoopRunning = false;
        return;
      }

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // Real-time resolution sync (prevents stretching during flex-grow animation)
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const targetW = Math.max(1, Math.round(rect.width * dpr));
      const targetH = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        gl.viewport(0, 0, targetW, targetH);
      }
      gl.uniform2f(uResolutionLoc, targetW, targetH);

      // Square-cell aspect ratio sync
      const curAspect = rect.width / Math.max(1, rect.height);
      const targetSimW = Math.max(32, Math.min(256, Math.round(simH * curAspect)));
      if (Math.abs(targetSimW - simW) >= 4) {
        simW = targetSimW;
        simSize = simW * simH;
        u = new Float32Array(simSize);
        v = new Float32Array(simSize);
        u_prev = new Float32Array(simSize);
        v_prev = new Float32Array(simSize);
        dens = new Float32Array(simSize);
        dens_prev = new Float32Array(simSize);
        fluidData = new Uint8Array(simSize * 4);
        fluidData.fill(128);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, fluidTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, simW, simH, 0, gl.RGBA, gl.UNSIGNED_BYTE, fluidData);
      }

      // Handle Crossfade animation
      let uFadeVal = 0.0;
      if (isFading) {
        const elapsed = performance.now() - fadeStartTime;
        uFadeVal = Math.min(1.0, elapsed / FADE_DURATION);
        if (uFadeVal >= 1.0) {
          currentIdx = nextIdx;
          gl.activeTexture(gl.TEXTURE0);
          updateTexFromImage(tex0, imageElements[currentIdx]);
          uFadeVal = 0.0;
          isFading = false;
        }
      }
      gl.uniform1f(uFadeLoc, uFadeVal);

      // Uniform image natural dimensions
      const curImg = imageElements[currentIdx];
      const nxtImg = imageElements[nextIdx];
      gl.uniform2f(uImgSize0Loc, curImg?.naturalWidth || 1920, curImg?.naturalHeight || 1080);
      gl.uniform2f(uImgSize1Loc, nxtImg?.naturalWidth || 1920, nxtImg?.naturalHeight || 1080);

      // Step Navier-Stokes simulation
      u_prev.set(u);
      v_prev.set(v);
      dens_prev.set(dens);

      advect(u, u_prev, u_prev, v_prev, 0.016);
      advect(v, v_prev, u_prev, v_prev, 0.016);
      advect(dens, dens_prev, u, v, 0.016);

      project(u, v, u_prev, v_prev);

      const decay = 0.965;
      for (let i = 0; i < simSize; i++) {
        u[i] *= decay;
        v[i] *= decay;
        dens[i] *= decay;
      }

      // Upload fluid simulation field to Texture 2
      for (let i = 0; i < simSize; i++) {
        const p = i * 4;
        fluidData[p] = Math.min(255, Math.max(0, Math.floor((u[i] + 1.0) * 127.5)));
        fluidData[p + 1] = Math.min(255, Math.max(0, Math.floor((v[i] + 1.0) * 127.5)));
        fluidData[p + 2] = Math.min(255, Math.max(0, Math.floor(dens[i] * 255)));
        fluidData[p + 3] = 255;
      }
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, fluidTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, simW, simH, gl.RGBA, gl.UNSIGNED_BYTE, fluidData);

      // Bind slide textures
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, tex1);

      // Uniform parameters calibrated for half-card portal elegance
      gl.uniform1f(uDistortionLoc, currentSettings.distortion * 0.60);
      gl.uniform1f(uChromaticLoc, currentSettings.chromatic * 0.60);
      gl.uniform1f(uSpecularLoc, currentSettings.specular * 0.70);

      // Angled Dither Stripes with Fluid Refraction Uniforms
      targetGlow = (hoveredRef.current || (isMobile && !isMouseInside)) ? (hoveredRef.current ? 1.0 : 0.45) : 0.0;
      currentGlow += (targetGlow - currentGlow) * 0.08;
      ripplePhase += 0.035;

      gl.uniform1f(uTimeLoc, ripplePhase);
      gl.uniform1f(uGlowLoc, currentGlow);
      gl.uniform2f(uMouseLoc, mouseNormX, mouseNormY);
      gl.uniform1f(uMouseActiveLoc, isMouseInside && hoveredRef.current ? 1.0 : 0.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    const scheduleRender = () => {
      if (!isLoopRunning && !document.hidden) {
        isLoopRunning = true;
        animId = requestAnimationFrame(render);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        scheduleRender();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    scheduleRender();

    return () => {
      cancelAnimationFrame(animId);
      isLoopRunning = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(slideTimer);
      window.removeEventListener('kum-refraction-settings', handleSettingsUpdate);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [images, intervalMs]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden transition-all duration-700 ease-out ${
        hovered
          ? 'scale-105 filter grayscale-0 brightness-90 opacity-100'
          : 'scale-100 filter grayscale-[80%] brightness-45 opacity-70'
      }`}
      style={{ willChange: 'transform, filter, opacity' }}
    >
      <canvas ref={canvasRef} className="w-full h-full object-cover block" aria-hidden="true" />
    </div>
  );
};

// =========================================================================
// MAIN PORTAL VIEW COMPONENT
// =========================================================================
export const PortalView: React.FC<PortalViewProps> = ({ onSelectRealm, onBackToIntro }) => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.portal;
  const [hovered, setHovered] = useState<RealmType | null>(null);

  const randomGamedevStart = React.useMemo(
    () => Math.floor(Math.random() * GAMEDEV_PORTAL_ARTWORKS.length),
    []
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050507] flex flex-col md:flex-row select-none">
      {/* Top Brand Name — Click returns to IntroScreen */}
      <div
        onClick={onBackToIntro}
        className="absolute top-6 left-6 md:top-8 md:left-8 z-30 space-y-1 cursor-pointer group pointer-events-auto"
        title={lang === 'ru' ? 'Вернуться на приветственный экран' : 'Back to welcome screen'}
      >
        <h1
          className={`text-base md:text-xl uppercase transition-all duration-300 group-hover:text-amber-300 ${
            hovered === 'gamedev'
              ? 'font-heading font-normal tracking-wide text-amber-300'
              : 'font-sans font-black tracking-tight text-white'
          }`}
        >
          {hovered === 'gamedev'
            ? t.realm1Title[lang]
            : lang === 'ru'
            ? 'Дизайн и айдентика'
            : 'Design & Identity'}
        </h1>
        <p className="text-[11px] font-mono tracking-wider text-white/50 group-hover:text-white/80 transition-colors uppercase">
          {t.name[lang]} • {t.portfolio[lang]}
        </p>
      </div>

      {/* Top right language switch and realm tags */}
      <div className="absolute top-6 right-6 md:top-8 md:right-8 z-30 flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-white/35 pointer-events-none">
          <span className={hovered === 'gamedev' ? 'text-amber-300 font-bold' : ''}>#gamedev</span>
          <span>•</span>
          <span className={hovered === 'design' ? 'text-purple-300 font-bold' : ''}>#design</span>
        </div>
        <LanguageSwitch />
      </div>

      {/* ========================================================================= */}
      {/* LEFT HALF: Gamedev / CG (With Interactive Bayer Dithering Matrix Field)   */}
      {/* ========================================================================= */}
      <div
        onMouseEnter={() => setHovered('gamedev')}
        onMouseLeave={() => setHovered(null)}
        onClick={() => onSelectRealm('gamedev')}
        className={`group relative h-1/2 md:h-full cursor-pointer overflow-hidden flex flex-col justify-end p-8 md:p-14 border-b md:border-b-0 md:border-r border-white/10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hovered === 'gamedev'
            ? 'md:flex-[1.5]'
            : hovered === 'design'
            ? 'md:flex-[0.85] opacity-40'
            : 'md:flex-1'
        }`}
      >
        {/* Memory-efficient crossfade layer */}
        <PortalSlideLayer
          images={GAMEDEV_PORTAL_ARTWORKS}
          startIndex={randomGamedevStart}
          intervalMs={3000}
          hovered={hovered === 'gamedev'}
          alt="Gamedev & CG"
        />

        {/* Interactive Bayer Dithering Canvas Overlay */}
        <PortalDitherCanvas active={hovered === 'gamedev'} />

        {/* Dreamlike atmospheric tint */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/30 to-transparent transition-opacity duration-700 z-10 ${
            hovered === 'gamedev' ? 'opacity-70' : 'opacity-90'
          }`}
        />
        {hovered === 'gamedev' && (
          <div className="absolute bottom-1/3 left-1/3 w-96 h-96 rounded-full bg-amber-500/20 blur-[130px] pointer-events-none animate-pulse z-10" />
        )}

        {/* Content Block */}
        <div className="relative z-20 space-y-2">
          <span className="text-[11px] font-mono tracking-widest text-amber-300 uppercase block font-medium">
            {t.realm1[lang]}
          </span>

          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal text-white tracking-wide uppercase transition-colors group-hover:text-amber-200 font-heading">
              {t.realm1Title[lang]}
            </h2>
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 group-hover:text-white group-hover:border-amber-400 group-hover:bg-amber-500/20 transition-all flex-shrink-0 ml-4">
              <ArrowUpRight size={18} />
            </div>
          </div>

          <p className="text-xs sm:text-sm font-mono text-white/60 max-w-sm">
            {t.realm1Desc[lang]}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT HALF: Дизайн / Айдентика (With Interactive Liquid Glass Refraction) */}
      {/* ========================================================================= */}
      <div
        onMouseEnter={() => setHovered('design')}
        onMouseLeave={() => setHovered(null)}
        onClick={() => onSelectRealm('design')}
        className={`group relative h-1/2 md:h-full cursor-pointer overflow-hidden flex flex-col justify-end p-8 md:p-14 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hovered === 'design'
            ? 'md:flex-[1.5]'
            : hovered === 'gamedev'
            ? 'md:flex-[0.85] opacity-40'
            : 'md:flex-1'
        }`}
      >
        {/* Genuine WebGL Navier-Stokes Liquid Refraction Artwork Layer */}
        <PortalRefractionCanvas
          images={DESIGN_PORTAL_ARTWORKS}
          hovered={hovered === 'design'}
          intervalMs={3000}
        />

        {/* Dreamlike atmospheric tint */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/30 to-transparent transition-opacity duration-700 z-10 ${
            hovered === 'design' ? 'opacity-70' : 'opacity-90'
          }`}
        />
        {hovered === 'design' && (
          <div className="absolute top-1/3 right-1/3 w-96 h-96 rounded-full bg-purple-600/20 blur-[130px] pointer-events-none animate-pulse z-10" />
        )}

        {/* Content Block */}
        <div className="relative z-20 space-y-2">
          <span className="text-[11px] font-mono tracking-widest text-purple-300 uppercase block font-medium">
            {t.realm2[lang]}
          </span>

          <div className="flex items-baseline justify-between">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight uppercase transition-colors group-hover:text-purple-200 font-sans">
              {t.realm2Title[lang]}
            </h2>
            <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/60 group-hover:text-white group-hover:border-purple-400 group-hover:bg-purple-500/20 transition-all flex-shrink-0 ml-4">
              <ArrowUpRight size={18} />
            </div>
          </div>

          <p className="text-xs sm:text-sm font-mono text-white/60 max-w-sm">
            {t.realm2Desc[lang]}
          </p>
        </div>
      </div>
    </div>
  );
};
