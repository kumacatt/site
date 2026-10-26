import React, { useState, useRef, useEffect } from 'react';
import { Project, getLocalized } from '../data/projects';
import { SOFTWARE_MAP } from '../data/software';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';
import { getAssetUrl } from '../utils/asset';

interface ProjectCardProps {
  project: Project;
  onOpen: (id: string) => void;
  index?: number;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, index = 0 }) => {
  const { lang } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [scrollYVelocity, setScrollYVelocity] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Lusion-style scroll velocity reaction
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const delta = currentScrollY - lastScrollY;
          // Clamp scroll velocity tilt to subtle -4 to 4 deg
          const velocityTilt = Math.max(-4, Math.min(4, delta * 0.12));
          setScrollYVelocity(velocityTilt);
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    setTilt({ x: rotateX, y: rotateY });

    // Update CSS variables for interactive card edge dither shader
    cardRef.current.style.setProperty('--card-mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--card-mouse-y', `${y}px`);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  // Bento Grid layout sizing based on work's actual aspect ratio
  const getSpanClasses = () => {
    switch (project.span) {
      case 'vertical':
        // Tall portrait work (e.g. 1.png, 2.png) spans 2 rows
        return 'col-span-1 row-span-2 min-h-[460px] sm:min-h-[560px]';
      case 'wide':
        // Ultra-wide panorama (e.g. 7.png, 9.png) spans 2 columns
        return 'col-span-1 md:col-span-2 row-span-1 min-h-[260px] sm:min-h-[300px]';
      case 'horizontal':
        // Landscape 16:9 (e.g. 4.png, 5.png, 6.png) spans 2 columns on desktop
        return 'col-span-1 md:col-span-2 row-span-1 min-h-[260px] sm:min-h-[300px]';
      case 'square':
      default:
        // Square 1:1 works (e.g. 3.png, 8.PNG)
        return 'col-span-1 row-span-1 min-h-[260px] sm:min-h-[300px]';
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={() => onOpen(project.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative cursor-pointer select-none rounded-2xl overflow-hidden bg-neutral-950/70 border border-white/5 hover:border-white/25 transition-all duration-500 ease-out ${getSpanClasses()}`}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x + scrollYVelocity}deg) rotateY(${tilt.y}deg) scale3d(${
          isHovered ? 1.015 : 1
        }, ${isHovered ? 1.015 : 1}, 1)`,
        transition: isHovered
          ? 'transform 0.1s ease-out, border-color 0.3s ease'
          : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease',
        willChange: 'transform'
      }}
    >
      {/* Artwork Image (Full coverage tailored to aspect ratio) */}
      <img
        src={project.cover}
        alt={getLocalized(project.title, lang)}
        loading="lazy"
        className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-[0.92] group-hover:brightness-100"
      />

      {/* Discrete Case Badge */}
      {project.type === 'case' && (
        <div className="absolute top-3 right-3 z-10 opacity-70 group-hover:opacity-0 transition-opacity">
          <span className="w-2 h-2 rounded-full bg-amber-400 block shadow-[0_0_10px_rgba(245,158,11,0.9)]" />
        </div>
      )}

      {/* OVERLAY: Appears strictly on hover */}
      <div
        className={`absolute inset-0 z-20 p-5 sm:p-6 flex flex-col justify-between bg-black/75 backdrop-blur-md transition-all duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Procedural Dither Edge Shader (crawls in along the sides with the blur) */}
        <div
          className={`absolute inset-0 pointer-events-none -z-10 overflow-hidden transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        >
          {/* Left Side Bayer Dither Ramp */}
          <div
            className="absolute top-0 bottom-0 left-0 w-12 transition-transform duration-300 ease-out"
            style={{
              transform: isHovered ? 'translateX(0)' : 'translateX(-12px)',
              maskImage: `url(${getAssetUrl('/dither-edge-ramp.svg')})`,
              WebkitMaskImage: `url(${getAssetUrl('/dither-edge-ramp.svg')})`,
              maskRepeat: 'repeat-y',
              WebkitMaskRepeat: 'repeat-y',
              maskSize: '48px 8px',
              WebkitMaskSize: '48px 8px',
              background: project.realm === 'gamedev'
                ? 'linear-gradient(to right, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.1) 65%, transparent 100%)'
                : 'linear-gradient(to right, rgba(168, 85, 247, 0.4) 0%, rgba(168, 85, 247, 0.1) 65%, transparent 100%)',
            }}
          />

          {/* Right Side Bayer Dither Ramp (Flipped) */}
          <div
            className="absolute top-0 bottom-0 right-0 w-12 transition-transform duration-300 ease-out"
            style={{
              transform: isHovered ? 'scaleX(-1) translateX(0)' : 'scaleX(-1) translateX(-12px)',
              maskImage: `url(${getAssetUrl('/dither-edge-ramp.svg')})`,
              WebkitMaskImage: `url(${getAssetUrl('/dither-edge-ramp.svg')})`,
              maskRepeat: 'repeat-y',
              WebkitMaskRepeat: 'repeat-y',
              maskSize: '48px 8px',
              WebkitMaskSize: '48px 8px',
              background: project.realm === 'gamedev'
                ? 'linear-gradient(to right, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.1) 65%, transparent 100%)'
                : 'linear-gradient(to right, rgba(168, 85, 247, 0.4) 0%, rgba(168, 85, 247, 0.1) 65%, transparent 100%)',
            }}
          />

          {/* Interactive Mouse Highlight inside Card */}
          <div
            className="absolute inset-0 transition-opacity duration-150"
            style={{
              background: `radial-gradient(circle 120px at var(--card-mouse-x, 50%) var(--card-mouse-y, 50%), ${
                project.realm === 'gamedev' ? 'rgba(245, 158, 11, 0.10)' : 'rgba(168, 85, 247, 0.10)'
              } 0%, transparent 100%)`,
              mixBlendMode: 'screen',
            }}
          />
        </div>

        {/* Top strip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {project.subcategories.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-md bg-white/15 text-xs font-mono text-white/90 uppercase"
              >
                {tag}
              </span>
            ))}
          </div>

          {project.type === 'case' ? (
            <span className="flex items-center gap-1 text-xs font-mono text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/30">
              <BookOpen size={11} />
              {TRANSLATIONS.projectCard.case[lang]}
            </span>
          ) : (
            <span className="text-xs font-mono text-white/60">{project.year}</span>
          )}
        </div>

        {/* Bottom strip */}
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-xl sm:text-2xl font-normal text-white tracking-wide font-heading">
                {getLocalized(project.title, lang)}
              </h3>
              <p className="text-xs sm:text-sm font-mono text-white/70 line-clamp-1 mt-0.5">
                {getLocalized(project.role, lang)}
              </p>
            </div>

            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white flex-shrink-0 group-hover:bg-white/20 transition-all">
              <ArrowUpRight size={15} />
            </div>
          </div>

          {/* Software Icons Row */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-white/10 flex-wrap">
            {project.software.map(swKey => {
              const sw = SOFTWARE_MAP[swKey];
              if (!sw) return null;
              return (
                <div
                  key={swKey}
                  title={sw.name}
                  className="w-6 h-6 rounded-lg bg-black/60 border border-white/15 p-1 flex items-center justify-center shadow-sm"
                >
                  <img
                    src={sw.icon}
                    alt={sw.name}
                    className="w-full h-full object-contain filter drop-shadow"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
