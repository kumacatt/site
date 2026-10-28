import React, { useEffect, useState } from 'react';
import { Project, getLocalized, PROJECTS } from '../data/projects';
import { SOFTWARE_MAP } from '../data/software';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { FullscreenLightbox } from './FullscreenLightbox';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';
import { getAssetUrl } from '../utils/asset';
import {
  X,
  Share2,
  Check,
  Maximize2,
  Sparkles,
  Film,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
  onNavigateProject?: (projectId: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose, onNavigateProject }) => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.projectModal;
  const [copied, setCopied] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);

  // Compute realm projects for Next / Prev navigation
  const realmProjects = project ? PROJECTS.filter((p) => p.realm === project.realm) : [];
  const currentIndex = project ? realmProjects.findIndex((p) => p.id === project.id) : -1;
  const prevProject = currentIndex > 0 ? realmProjects[currentIndex - 1] : null;
  const nextProject = currentIndex >= 0 && currentIndex < realmProjects.length - 1 ? realmProjects[currentIndex + 1] : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLightboxOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && prevProject && onNavigateProject) {
        onNavigateProject(prevProject.id);
      } else if (e.key === 'ArrowRight' && nextProject && onNavigateProject) {
        onNavigateProject(nextProject.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isLightboxOpen, prevProject, nextProject, onNavigateProject]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (project) {
      document.body.style.overflow = 'hidden';
      // Default to fullImage if available, else cover
      setActiveMedia(project.fullImage || project.cover);
    } else {
      document.body.style.overflow = '';
      setActiveMedia(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [project]);

  if (!project) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#project/${project.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const article = project.article;
  const displayImage = activeMedia || project.fullImage || project.cover;

  // Collect ALL media for this project: Preview (cover), Full Image, and extra resources
  const allMediaImages = Array.from(
    new Set([
      project.cover,
      project.fullImage,
      ...(project.additionalImages || [])
    ].filter(Boolean) as string[])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 md:p-8 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-2xl transition-opacity duration-300"
      />

      {/* Floating Prev Project Arrow (Desktop / Tablet) */}
      {prevProject && onNavigateProject && (
        <button
          onClick={() => onNavigateProject(prevProject.id)}
          title={`${t.prevProject[lang]}: ${getLocalized(prevProject.title, lang)}`}
          className="hidden md:flex fixed left-3 lg:left-6 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/75 hover:bg-black/95 backdrop-blur-xl border border-white/20 hover:border-amber-400 text-white/80 hover:text-amber-300 items-center justify-center transition-all shadow-2xl hover:scale-110 active:scale-95 group cursor-pointer"
          aria-label={t.prevProject[lang]}
        >
          <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Floating Next Project Arrow (Desktop / Tablet) */}
      {nextProject && onNavigateProject && (
        <button
          onClick={() => onNavigateProject(nextProject.id)}
          title={`${t.nextProject[lang]}: ${getLocalized(nextProject.title, lang)}`}
          className="hidden md:flex fixed right-3 lg:right-6 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/75 hover:bg-black/95 backdrop-blur-xl border border-white/20 hover:border-amber-400 text-white/80 hover:text-amber-300 items-center justify-center transition-all shadow-2xl hover:scale-110 active:scale-95 group cursor-pointer"
          aria-label={t.nextProject[lang]}
        >
          <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Modal Dialog Window */}
      <div className="relative w-full max-w-6xl my-auto rounded-3xl border border-white/15 bg-neutral-950/95 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.95)] overflow-hidden z-10 flex flex-col max-h-[94vh]">
        {/* Floating Close Button in top right */}
        <button
          onClick={onClose}
          title={t.close[lang]}
          className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-40 w-10 h-10 rounded-full bg-black/70 hover:bg-black/95 backdrop-blur-xl border border-white/20 hover:border-white/50 flex items-center justify-center text-white/80 hover:text-white transition-all shadow-2xl hover:scale-105 active:scale-95 group cursor-pointer"
        >
          <X size={18} className="transition-transform group-hover:rotate-90 duration-200" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto scrollbar-thin flex-1">
          {/* Video Player (if project has gameplay video like Fragile) */}
          {project.videoUrl && (
            <div className="relative w-full bg-black flex items-center justify-center overflow-hidden border-b border-white/10">
              <video
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full max-h-[70vh] sm:max-h-[78vh] object-contain mx-auto"
              >
                <source src={project.videoUrl} type="video/mp4" />
              </video>
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5 shadow-lg">
                <Film size={11} />
                <span>{project.realm === 'gamedev' ? t.videoGameplay[lang] : t.videoProject[lang]}</span>
              </div>
            </div>
          )}

          {/* Hero Artwork - Edge-to-edge stretched across the preview window, NO nested borders */}
          <div
            onClick={() => setIsLightboxOpen(true)}
            className="relative w-full bg-black/60 flex items-center justify-center overflow-hidden group cursor-zoom-in min-h-[300px] sm:min-h-[440px]"
          >
            <img
              src={displayImage}
              alt={getLocalized(project.title, lang)}
              className="w-full max-h-[75vh] sm:max-h-[82vh] object-contain mx-auto select-none transition-transform duration-300 group-hover:scale-[1.01]"
            />

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/25 text-white text-xs sm:text-sm font-mono shadow-2xl scale-95 group-hover:scale-100 transition-transform">
                <Maximize2 size={16} className="text-amber-400" />
                <span>{lang === 'ru' ? 'Развернуть на весь экран (Зум & Панорама)' : 'Fullscreen View (Zoom & Pan)'}</span>
              </div>
            </div>

            {/* Bottom-right Fullscreen Badge */}
            <div className="absolute bottom-3.5 right-3.5 sm:bottom-4 sm:right-4 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                title={lang === 'ru' ? 'Развернуть на весь экран' : 'Fullscreen'}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/80 hover:bg-black/95 backdrop-blur-md border border-white/25 text-white/90 hover:text-white transition-all shadow-xl text-xs font-mono group-hover:border-amber-400/50"
              >
                <Maximize2 size={14} className="text-amber-400" />
                <span>{lang === 'ru' ? 'На весь экран' : 'Fullscreen'}</span>
              </button>
            </div>
          </div>

          {/* ALL MEDIA & PREVIEWS STRIP (when project has multiple frames) */}
          {allMediaImages.length > 1 && (
            <div className="w-full px-6 sm:px-10 py-3 bg-black/40 border-b border-white/10 flex items-center gap-3 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest flex-shrink-0">
                {t.allMedia[lang]}:
              </span>
              <div className="flex items-center gap-2.5">
                {allMediaImages.map((img, i) => {
                  const isCover = img === project.cover;
                  const isFull = img === project.fullImage;
                  let label = lang === 'ru' ? `Кадр ${i + 1}` : `Frame ${i + 1}`;
                  if (isCover) label = lang === 'ru' ? 'Превью' : 'Preview';
                  else if (isFull) label = lang === 'ru' ? 'Оригинал' : 'Full Res';

                  const isSelected = displayImage === img;

                  return (
                    <button
                      key={i}
                      onClick={() => setActiveMedia(img)}
                      className={`relative w-24 h-16 rounded-xl overflow-hidden flex-shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105'
                          : 'opacity-50 hover:opacity-100 hover:scale-100'
                      }`}
                    >
                      <img src={img} alt={label} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/75 py-0.5 text-center text-[9px] font-mono text-white/80 uppercase">
                        {label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Project Details Section */}
          <div className="p-6 sm:p-10 space-y-8">
            {/* Title & Metadata Strip with Actions */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-white/10">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono uppercase tracking-wider text-white/85">
                    {project.realm === 'gamedev' ? t.realmGamedev[lang] : t.realmDesign[lang]}
                  </span>
                  <span className="text-white/40 text-xs font-mono">•</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-white/70">
                    {project.year}
                  </span>

                  {project.subcategories.map(tag => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono uppercase"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <h1 className={`text-3xl sm:text-4xl lg:text-5xl text-white tracking-wide ${
                  project.realm === 'gamedev' ? 'font-normal font-heading' : 'font-bold font-sans'
                }`}>
                  {getLocalized(project.title, lang)}
                </h1>

                <p className="mt-2 text-sm sm:text-base text-white/80 font-mono leading-relaxed max-w-3xl">
                  {getLocalized(project.shortDescription, lang)}
                </p>
              </div>

              {/* Actions: ArtStation & Copy Link */}
              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap md:self-start">
                {project.artstationUrl && (
                  <a
                    href={project.artstationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="ArtStation"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#13AFF0]/15 hover:bg-[#13AFF0]/25 border border-[#13AFF0]/30 text-xs font-mono text-[#13AFF0] hover:text-white transition-all shadow-md"
                  >
                    <img src={getAssetUrl('/artstation.webp')} alt="ArtStation" className="w-3.5 h-3.5 object-contain" />
                    <span>ArtStation →</span>
                  </a>
                )}

                <button
                  onClick={handleCopyLink}
                  title={t.copyLink[lang]}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono text-white/80 hover:text-white transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                  <span>{copied ? t.copied[lang] : t.copyLink[lang]}</span>
                </button>
              </div>
            </div>

            {/* Quick Specs & Software Stack */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-4 border-b border-white/10">
              <div className="flex flex-wrap items-center gap-6 sm:gap-10 text-xs sm:text-sm font-mono">
                <div>
                  <span className="text-white/40 uppercase text-[10px] sm:text-[11px] block mb-0.5 tracking-wider">
                    {t.role[lang]}
                  </span>
                  <span className="text-white/90 font-medium">{getLocalized(project.role, lang)}</span>
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/10" />
                <div>
                  <span className="text-white/40 uppercase text-[10px] sm:text-[11px] block mb-0.5 tracking-wider">
                    {t.year[lang]}
                  </span>
                  <span className="text-white/90 font-medium">{project.year}</span>
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/10" />
                <div>
                  <span className="text-white/40 uppercase text-[10px] sm:text-[11px] block mb-0.5 tracking-wider">
                    {t.format[lang]}
                  </span>
                  <span className="text-amber-300 font-medium">
                    {project.type === 'case' ? t.formatCase[lang] : t.formatShot[lang]}
                  </span>
                </div>
              </div>

              {/* Software Stack */}
              {project.software.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] sm:text-[11px] font-mono text-white/40 uppercase tracking-widest mr-1">
                    {t.tools[lang]}:
                  </span>
                  {project.software.map(swKey => {
                    const sw = SOFTWARE_MAP[swKey];
                    if (!sw) return null;
                    return (
                      <div
                        key={swKey}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/90"
                      >
                        <img src={sw.icon} alt={sw.name} className="w-3.5 h-3.5 object-contain" />
                        <span>{sw.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Full Article Content (if present) */}
            {article && (
              <div className="space-y-6 pt-2">
                {article.overview && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border-l-2 border-amber-400 space-y-2">
                    <h3 className="text-xs sm:text-sm font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-2">
                      <Sparkles size={14} /> {t.aboutProject[lang]}
                    </h3>
                    <p className="text-sm sm:text-base font-mono text-white/80 leading-relaxed">
                      {getLocalized(article.overview, lang)}
                    </p>
                  </div>
                )}

                {/* Technical Specs Badges */}
                {article.specs && article.specs.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                    {article.specs.map((spec, sIdx) => (
                      <div key={sIdx} className="border-l-2 border-amber-500/40 pl-3.5 py-1">
                        <span className="text-xs font-mono text-white/45 block mb-0.5">
                          {getLocalized(spec.label, lang)}
                        </span>
                        <span className="text-sm sm:text-base font-mono text-white font-medium">
                          {getLocalized(spec.value, lang)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive Before/After comparison slider (if available) */}
                {article.beforeAfter && (
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-white/60 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={13} className="text-amber-400" />
                        {t.wireframeVsFinal[lang]}
                      </span>
                      <span className="text-[11px] font-mono text-white/40">
                        {t.dragSlider[lang]}
                      </span>
                    </div>
                    <BeforeAfterSlider
                      beforeImage={article.beforeAfter.beforeImage}
                      afterImage={article.beforeAfter.afterImage}
                      beforeLabel={getLocalized(article.beforeAfter.beforeLabel, lang)}
                      afterLabel={getLocalized(article.beforeAfter.afterLabel, lang)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Prev / Next Project Switcher Footer */}
            {(prevProject || nextProject) && onNavigateProject && (
              <div className="pt-8 border-t border-white/10 flex items-center justify-between gap-4">
                {prevProject ? (
                  <button
                    onClick={() => onNavigateProject(prevProject.id)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/15 hover:border-amber-400/50 text-white transition-all group text-left max-w-[48%]"
                  >
                    <ChevronLeft size={20} className="text-amber-400 group-hover:-translate-x-1 transition-transform flex-shrink-0" />
                    <div className="overflow-hidden">
                      <span className="text-[10px] font-mono uppercase text-white/40 block tracking-wider">
                        {t.prevProject[lang]}
                      </span>
                      <span className="text-xs sm:text-sm font-mono font-medium truncate block">
                        {getLocalized(prevProject.title, lang)}
                      </span>
                    </div>
                  </button>
                ) : (
                  <div />
                )}

                {nextProject && (
                  <button
                    onClick={() => onNavigateProject(nextProject.id)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/15 hover:border-amber-400/50 text-white transition-all group text-right max-w-[48%] ml-auto"
                  >
                    <div className="overflow-hidden">
                      <span className="text-[10px] font-mono uppercase text-white/40 block tracking-wider">
                        {t.nextProject[lang]}
                      </span>
                      <span className="text-xs sm:text-sm font-mono font-medium truncate block">
                        {getLocalized(nextProject.title, lang)}
                      </span>
                    </div>
                    <ChevronRight size={20} className="text-amber-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Edge-to-Edge Pan & Zoom Lightbox */}
      <FullscreenLightbox
        isOpen={isLightboxOpen}
        images={allMediaImages}
        currentIndex={Math.max(0, allMediaImages.indexOf(displayImage))}
        title={getLocalized(project.title, lang)}
        onClose={() => setIsLightboxOpen(false)}
        onSelectIndex={(idx) => setActiveMedia(allMediaImages[idx])}
      />
    </div>
  );
};
