import React, { useEffect, useRef } from 'react';

// 4x4 Bayer Ordered Dithering Matrix
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

const SCALE = 4; // 1 canvas pixel = 4x4 screen pixels (crisp retro pixel-art grid)

export const GamedevDitherField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -500, y: -500, targetX: -500, targetY: -500, active: false });
  const scrollRef = useRef({
    energy: 0,
    lastY: 0,
    direction: 0, // 1 for scrolling down, -1 for scrolling up
  });
  const cardRectsRef = useRef<{ left: number; top: number; right: number; bottom: number }[]>([]);

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

    // Resize canvas to scaled-down retro pixel buffer
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

    // Track mouse coordinates (converted to canvas pixels)
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX / SCALE;
      mouseRef.current.targetY = e.clientY / SCALE;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    // Track scroll velocity and direction
    scrollRef.current.lastY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const deltaY = currentY - scrollRef.current.lastY;
      scrollRef.current.lastY = currentY;

      const speed = Math.abs(deltaY);
      if (speed > 0.5) {
        scrollRef.current.direction = deltaY > 0 ? 1 : -1;
        // Accumulate scroll energy capped at max 25
        scrollRef.current.energy = Math.min(25, scrollRef.current.energy + speed * 0.35);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cache card positions in canvas space every 200ms to keep query overhead negligible
    const updateCardRects = () => {
      const cards = document.querySelectorAll('[data-bento-card="true"]');
      const rects: { left: number; top: number; right: number; bottom: number }[] = [];
      const viewH = window.innerHeight;
      const viewW = window.innerWidth;

      cards.forEach(el => {
        const r = el.getBoundingClientRect();
        // Only include cards near or in viewport
        if (r.bottom >= -50 && r.top <= viewH + 50 && r.right >= 0 && r.left <= viewW) {
          rects.push({
            left: Math.floor(r.left / SCALE),
            top: Math.floor(r.top / SCALE),
            right: Math.ceil(r.right / SCALE),
            bottom: Math.ceil(r.bottom / SCALE),
          });
        }
      });
      cardRectsRef.current = rects;
    };

    updateCardRects();
    const cardInterval = setInterval(updateCardRects, 250);

    // Little-endian 32-bit colors (0xAABBGGRR)
    // Amber primary: RGB(245, 158, 11)
    const makeColor = (r: number, g: number, b: number, a: number) => {
      return (a << 24) | (b << 16) | (g << 8) | r;
    };

    // 120 FPS render loop
    const render = () => {
      if (!ctx || !imageData || !buf32) return;

      // Smooth lerp mouse coordinates
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.4;
      mouse.y += (mouse.targetY - mouse.y) * 0.4;

      // Decay scroll energy smoothly
      scrollRef.current.energy *= 0.88;
      const currentScrollEnergy = scrollRef.current.energy;
      const isScrolling = currentScrollEnergy > 0.15;
      const scrollDir = scrollRef.current.direction;

      // Mouse spotlight radius in canvas units (~22 units = 88px on screen)
      const spotRadius = 22;
      const spotRadiusSq = spotRadius * spotRadius;
      const hasMouse = mouse.active && mouse.x >= -50 && mouse.x <= width + 50;

      const cardRects = cardRectsRef.current;
      const cardCount = cardRects.length;

      // Clear buffer to fully transparent
      buf32.fill(0);

      // Loop through all canvas pixels (480 x 270 = ~0.08ms per frame in typed array)
      for (let y = 0; y < height; y++) {
        const by = y % 4;
        const bayerRow = BAYER_4X4[by];
        const rowOffset = y * width;

        for (let x = 0; x < width; x++) {
          const bx = x % 4;
          const bayerThreshold = bayerRow[bx] / 16;
          let pixelColor = 0;

          // 1. Subtle Base Dither Field (Only 1 sparse dot out of 16, very low opacity ~6%)
          // This keeps the background video clearly visible without visual clutter
          if (bayerRow[bx] === 0) {
            pixelColor = makeColor(255, 255, 255, 14); // 5.5% white
          }

          // 2. Interactive Mouse Spotlight with RAGGED Bayer Dither Edge
          if (hasMouse) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < spotRadiusSq) {
              const dist = Math.sqrt(distSq);
              const t = 1 - (dist / spotRadius);
              // Quadratic falloff curve for authentic ragged pixel dropoff
              const intensity = t * t * 1.15;

              if (intensity > bayerThreshold) {
                // Pixel falls within ragged dither boundary!
                const alpha = Math.min(240, Math.floor(70 + t * 170));
                // Luminous amber pixel
                pixelColor = makeColor(245, 158, 11, alpha);
              }
            }
          }

          // 3. Scroll-Reactive Card Halo & Motion Wake
          if (isScrolling && cardCount > 0) {
            for (let i = 0; i < cardCount; i++) {
              const card = cardRects[i];
              // Check if pixel is within the card's outer halo margin
              // Halo margin: sides 6 units (24px), trailing edge 14 units (56px)
              const topMargin = scrollDir === 1 ? 14 : 5; // Trailing wake above card when scrolling down
              const bottomMargin = scrollDir === -1 ? 14 : 5; // Trailing wake below card when scrolling up
              const sideMargin = 6;

              if (
                x >= card.left - sideMargin &&
                x <= card.right + sideMargin &&
                y >= card.top - topMargin &&
                y <= card.bottom + bottomMargin
              ) {
                // If pixel is INSIDE the card itself, skip it (the card is solid on top)
                if (x >= card.left && x <= card.right && y >= card.top && y <= card.bottom) {
                  continue;
                }

                // Calculate distance to nearest card edge
                let distToCard = 0;
                if (x < card.left) distToCard = Math.max(distToCard, card.left - x);
                if (x > card.right) distToCard = Math.max(distToCard, x - card.right);
                if (y < card.top) distToCard = Math.max(distToCard, card.top - y);
                if (y > card.bottom) distToCard = Math.max(distToCard, y - card.bottom);

                const maxMargin = Math.max(topMargin, bottomMargin, sideMargin);
                const wakeFalloff = Math.max(0, 1 - (distToCard / maxMargin));
                const wakeIntensity = wakeFalloff * Math.min(1.0, currentScrollEnergy * 0.14);

                if (wakeIntensity > bayerThreshold) {
                  const wakeAlpha = Math.min(220, Math.floor(wakeIntensity * 210));
                  // Blend wake color with any existing pixel
                  pixelColor = makeColor(245, 158, 11, Math.max(wakeAlpha, pixelColor >>> 24));
                  break; // Card found, proceed to next pixel
                }
              }
            }
          }

          if (pixelColor !== 0) {
            buf32[rowOffset + x] = pixelColor;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(cardInterval);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
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
