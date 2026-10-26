import React, { useEffect, useRef, useState } from 'react';
import { SOFTWARE_MAP, SoftwareItem } from '../data/software';
import { getAssetUrl } from '../utils/asset';

interface NodeState {
  item: SoftwareItem;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
}

export const SoftwareGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });
  const nodesRef = useRef<NodeState[]>([]);
  const animFrameRef = useRef<number>();

  const softwareList = Object.values(SOFTWARE_MAP);

  // Sync state with ref for tick loop
  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
  }, [hoveredNode]);

  useEffect(() => {
    // Spatial distribution across canvas with generous spacing
    const layout = [
      { x: 0.22, y: 0.25 }, // blender
      { x: 0.52, y: 0.20 }, // unity
      { x: 0.82, y: 0.22 }, // godot
      { x: 0.18, y: 0.55 }, // zbrush
      { x: 0.48, y: 0.50 }, // substancep
      { x: 0.78, y: 0.52 }, // substanced
      { x: 0.32, y: 0.80 }, // marmoset
      { x: 0.12, y: 0.82 }, // clipstd
      { x: 0.62, y: 0.80 }, // photoshop
      { x: 0.88, y: 0.80 }, // illustrator
      { x: 0.38, y: 0.28 }, // figma
    ];

    nodesRef.current = softwareList.map((sw, i) => {
      const pos = layout[i % layout.length];
      return {
        item: sw,
        baseX: pos.x,
        baseY: pos.y,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.3,
      };
    });
  }, []);

  useEffect(() => {
    let t = 0;

    const tick = () => {
      t += 0.015;
      if (!containerRef.current) {
        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const mouse = mouseRef.current;
      const activeHovered = hoveredNodeRef.current;
      const nodes = nodesRef.current;

      // 1. Spring forces to home & gentle mouse sway
      nodes.forEach(node => {
        // If hovered, freeze in place so it stays steady
        if (activeHovered === node.item.id) {
          node.vx *= 0.5;
          node.vy *= 0.5;
          return;
        }

        // Natural floating zero-gravity drift
        const driftX = Math.sin(t * node.speed + node.phase) * 12;
        const driftY = Math.cos(t * node.speed * 0.85 + node.phase) * 12;

        const homeX = node.baseX * w + driftX;
        const homeY = node.baseY * h + driftY;

        // Smooth spring returning node to home position
        const k = 0.04;
        const damping = 0.88;

        let fx = (homeX - node.x) * k;
        let fy = (homeY - node.y) * k;

        // Gentle magnetic pull toward cursor
        if (mouse.active) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 160;

          if (dist < maxDist && dist > 5) {
            const pullForce = (1 - dist / maxDist) * 1.6;
            fx += (dx / dist) * pullForce;
            fy += (dy / dist) * pullForce;
          }
        }

        node.vx = (node.vx + fx) * damping;
        node.vy = (node.vy + fy) * damping;

        node.x += node.vx;
        node.y += node.vy;

        if (node.x === 0 && node.y === 0) {
          node.x = homeX;
          node.y = homeY;
        }
      });

      // 2. PAIRWISE COLLISION REPULSION (Icons push each other apart so they NEVER overlap!)
      const minDist = 78; // Minimum distance between icon centers
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < minDist && dist > 0.01) {
            const overlap = (minDist - dist) / minDist;
            const repelForce = overlap * 2.8;
            const nx = dx / dist;
            const ny = dy / dist;

            if (activeHovered !== a.item.id) {
              a.vx -= nx * repelForce;
              a.vy -= ny * repelForce;
              a.x -= nx * repelForce * 0.5;
              a.y -= ny * repelForce * 0.5;
            }

            if (activeHovered !== b.item.id) {
              b.vx += nx * repelForce;
              b.vy += ny * repelForce;
              b.x += nx * repelForce * 0.5;
              b.y += ny * repelForce * 0.5;
            }
          }
        }
      }

      // 3. Update positions directly on DOM elements
      nodes.forEach(node => {
        const el = document.getElementById(`graph-node-${node.item.id}`);
        if (el) {
          el.style.transform = `translate3d(${node.x - 28}px, ${node.y - 28}px, 0)`;
        }
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[360px] sm:h-[420px] overflow-hidden select-none"
    >
      {/* Floating Software Icons with collision avoidance */}
      {softwareList.map(sw => (
        <div
          key={sw.id}
          id={`graph-node-${sw.id}`}
          onMouseEnter={() => setHoveredNode(sw.id)}
          onMouseLeave={() => setHoveredNode(null)}
          className="absolute top-0 left-0 cursor-pointer p-2 z-10"
          style={{ willChange: 'transform' }}
        >
          {/* Tooltip on hover */}
          {hoveredNode === sw.id && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-black/90 backdrop-blur-md border border-white/20 text-[11px] font-mono text-amber-300 pointer-events-none shadow-xl z-30 animate-fade-in">
              {sw.name}
            </div>
          )}

          {/* Subtle White / Silver Holographic Dither Halo Underneath */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none -z-10 rounded-full transition-all duration-300 ${
              hoveredNode === sw.id ? 'opacity-75 scale-125' : 'opacity-35 scale-100'
            }`}
            style={{
              backgroundImage: `url(${getAssetUrl('/dither-sharp.svg')})`,
              backgroundRepeat: 'repeat',
              backgroundSize: '8px 8px',
              imageRendering: 'pixelated',
              maskImage: 'radial-gradient(circle 26px at center, black 0%, rgba(0,0,0,0.45) 50%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(circle 26px at center, black 0%, rgba(0,0,0,0.45) 50%, transparent 100%)',
              filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.6))',
            }}
          />

          {/* Clean pure icon with comfortable hit area */}
          <div
            className={`w-12 h-12 flex items-center justify-center transition-transform duration-200 ${
              hoveredNode === sw.id
                ? 'scale-130 filter drop-shadow-[0_0_20px_rgba(255,255,255,0.7)]'
                : 'hover:scale-120 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] opacity-85 hover:opacity-100'
            }`}
          >
            <img
              src={sw.icon}
              alt={sw.name}
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>
        </div>
      ))}
    </div>
  );
};
