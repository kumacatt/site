import React, { useEffect, useState } from 'react';
import { Project, getLocalized } from '../data/projects';
import { SOFTWARE_MAP } from '../data/software';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';
import { getAssetUrl } from '../utils/asset';
import {
  X,
  Share2,
  Check,
  Maximize2,
  Sparkles,
  Layers,
  Film
} from 'lucide-react';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose }) => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.projectModal;
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeMedia, setActiveMedia] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-2xl transition-opacity duration-300"
      />

      {/* Modal Dialog Window */}
      <div className="relative w-full max-w-5xl my-auto rounded-3xl border border-white/15 bg-neutral-950/90 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-neutral-950/80 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono uppercase tracking-wider text-white/80">
              {project.realm === 'gamedev' ? t.realmGamedev[lang] : t.realmDesign[lang]}
            </span>
            <span className="text-white/40 text-xs font-mono">•</span>
            <span className="text-white/60 text-xs font-mono">{project.year}</span>
          </div>

          <div className="flex items-center gap-2">
            {project.artstationUrl && (
              <a
                href={project.artstationUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="ArtStation"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#13AFF0]/15 hover:bg-[#13AFF0]/25 border border-[#13AFF0]/30 text-xs font-mono text-[#13AFF0] hover:text-white transition-all shadow-md"
              >
                <img src={getAssetUrl('/artstation.webp')} alt="ArtStation" className="w-3.5 h-3.5 object-contain" />
                <span>ArtStation →</span>
              </a>
            )}

            <button
              onClick={handleCopyLink}
              title={t.copyLink[lang]}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono text-white/80 hover:text-white transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
              <span>{copied ? t.copied[lang] : t.copyLink[lang]}</span>
            </button>

            <button
              onClick={onClose}
              title={t.close[lang]}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-8 scrollbar-thin">
          {/* Video Player (if project has gameplay video like Fragile) */}
          {project.videoUrl && (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl">
              <video
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full max-h-[55vh] object-contain mx-auto"
              >
                <source src={project.videoUrl} type="video/mp4" />
              </video>
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Film size={11} />
                <span>{project.realm === 'gamedev' ? 'Геймплей' : 'Видео проекта'}</span>
              </div>
            </div>
          )}

          {/* Hero Banner / High-Res Full Image */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-2xl group">
            <img
              src={displayImage}
              alt={getLocalized(project.title, lang)}
              className={`w-full max-h-[65vh] object-contain mx-auto transition-transform duration-300 ${
                isZoomed ? 'scale-125 cursor-zoom-out' : 'cursor-zoom-in'
              }`}
              onClick={() => setIsZoomed(!isZoomed)}
            />

            <div className="absolute bottom-3 right-3 z-10">
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                title={t.clickToZoom[lang]}
                className="p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:text-white transition-colors"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          {/* ALL MEDIA & PREVIEWS STRIP */}
          {allMediaImages.length > 1 && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-white/40 uppercase tracking-widest block">
                {t.allMedia[lang]}:
              </span>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                {allMediaImages.map((img, i) => {
                  const isCover = img === project.cover;
                  const isFull = img === project.fullImage;
                  let label = lang === 'ru' ? `Кадр ${i + 1}` : `Frame ${i + 1}`;
                  if (isCover) label = lang === 'ru' ? 'Превью' : 'Preview';
                  else if (isFull) label = lang === 'ru' ? 'Оригинал' : 'Full Res';

                  return (
                    <button
                      key={i}
                      onClick={() => setActiveMedia(img)}
                      className={`relative w-28 h-20 rounded-xl overflow-hidden border flex-shrink-0 transition-all ${
                        displayImage === img
                          ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105 shadow-lg'
                          : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                      }`}
                    >
                      <img src={img} alt={label} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm py-0.5 text-center text-[9px] font-mono text-white/80 uppercase">
                        {label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title & Metadata Strip */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="flex gap-2 flex-wrap mb-2">
                {project.subcategories.map(tag => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono uppercase"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-sans">
                {getLocalized(project.title, lang)}
              </h1>

              <p className="mt-2 text-sm sm:text-base text-white/80 font-mono leading-relaxed max-w-2xl">
                {getLocalized(project.shortDescription, lang)}
              </p>
            </div>

            {/* Software Stack Pills */}
            <div className="flex flex-col items-start md:items-end gap-2 flex-shrink-0">
              <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest">
                {t.tools[lang]}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {project.software.map(swKey => {
                  const sw = SOFTWARE_MAP[swKey];
                  if (!sw) return null;
                  return (
                    <div
                      key={swKey}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 backdrop-blur-md shadow-sm"
                    >
                      <img src={sw.icon} alt={sw.name} className="w-4 h-4 object-contain" />
                      <span className="text-xs font-mono text-white/90">{sw.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Details Bar (Роль, Год, Формат) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-xs font-mono text-white/50 uppercase block mb-1">
                {t.role[lang]}
              </span>
              <span className="text-sm sm:text-base font-mono text-white/90 font-medium">
                {getLocalized(project.role, lang)}
              </span>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-xs font-mono text-white/50 uppercase block mb-1">
                {t.year[lang]}
              </span>
              <span className="text-sm sm:text-base font-mono text-white/90 font-medium">
                {project.year}
              </span>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-xs font-mono text-white/50 uppercase block mb-1">
                {t.format[lang]}
              </span>
              <span className="text-sm sm:text-base font-mono text-amber-300 font-medium">
                {project.type === 'case' ? t.formatCase[lang] : t.formatShot[lang]}
              </span>
            </div>
          </div>

          {/* Full Article Content (if present) */}
          {article && (
            <div className="space-y-6 pt-2">
              {article.overview && (
                <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <h3 className="text-sm sm:text-base font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-2">
                    <Sparkles size={15} /> {t.aboutProject[lang]}
                  </h3>
                  <p className="text-sm sm:text-base font-mono text-white/80 leading-relaxed">
                    {getLocalized(article.overview, lang)}
                  </p>
                </div>
              )}

              {/* Technical Specs Badges */}
              {article.specs && article.specs.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {article.specs.map((spec, sIdx) => (
                      <div key={sIdx} className="border-l-2 border-amber-500/50 pl-3.5 py-1">
                        <span className="text-xs font-mono text-white/50 block mb-0.5">
                          {getLocalized(spec.label, lang)}
                        </span>
                        <span className="text-sm sm:text-base font-mono text-white font-medium">
                          {getLocalized(spec.value, lang)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Before/After comparison slider (if available) */}
              {article.beforeAfter && (
                <div className="space-y-3">
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
        </div>
      </div>
    </div>
  );
};
