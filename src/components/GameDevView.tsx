import React, { useState, useMemo } from 'react';
import { PROJECTS } from '../data/projects';
import { ProjectCard } from './ProjectCard';
import { AboutSection } from './AboutSection';
import { ContactSection } from './ContactSection';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';
import { ArrowDown, Gamepad2 } from 'lucide-react';

interface GameDevViewProps {
  onOpenProject: (id: string) => void;
}

export const GameDevView: React.FC<GameDevViewProps> = ({ onOpenProject }) => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.gamedevView;
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const gamedevProjects = useMemo(() => {
    return PROJECTS.filter(p => p.realm === 'gamedev');
  }, []);

  const categories = [
    { id: 'all', label: t.filterAll[lang] },
    { id: 'Game Dev', label: t.filterGames[lang] },
    { id: '3D Art', label: t.filter3D[lang] },
    { id: '2D Art', label: t.filter2D[lang] }
  ];

  const filteredProjects = useMemo(() => {
    return gamedevProjects.filter(project => {
      if (selectedCategory === 'all') return true;
      return project.subcategories.some(tag => tag.toLowerCase() === selectedCategory.toLowerCase());
    });
  }, [gamedevProjects, selectedCategory]);

  const scrollToWorks = () => {
    const el = document.getElementById('works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative z-10 w-full">
      {/* 1. Spacious Hero Welcome Screen: Ambient Video breathes, Title in Bottom-Left */}
      <section className="relative min-h-[82vh] sm:min-h-[88vh] flex flex-col justify-end pt-28 pb-10 sm:pb-16 px-4 sm:px-6 md:px-10 lg:px-12 w-full">
        <div className="space-y-4 max-w-3xl relative z-10">
          {/* Realm Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono uppercase tracking-wider backdrop-blur-md">
            <Gamepad2 size={13} />
            <span>01 / Gamedev & CG</span>
          </div>

          {/* Large Title in Bottom-Left with Keleti font */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal text-white tracking-wide uppercase font-heading drop-shadow-2xl">
            {t.title[lang]}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg font-mono text-white/75 leading-relaxed drop-shadow max-w-2xl">
            {t.subtitle[lang]}
          </p>

          {/* Interactive Scroll Cue Button */}
          <div className="pt-2">
            <button
              onClick={scrollToWorks}
              className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-xl text-xs sm:text-sm font-mono text-white transition-all group shadow-lg"
            >
              <span>{lang === 'ru' ? 'Смотреть работы' : 'Explore projects'}</span>
              <ArrowDown size={14} className="group-hover:translate-y-1 transition-transform text-amber-400" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. Showcase Bento Grid Section (Full-width window span) */}
      <div id="works" className="pt-8 sm:pt-14 pb-20 px-4 sm:px-6 md:px-10 lg:px-12 w-full">
        {/* Simple & Clean Filter Tabs with comfortable touch sizes */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-mono transition-all duration-200 border ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm font-semibold'
                    : 'bg-black/40 text-white/70 border-white/10 hover:text-white hover:border-white/25'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="text-xs sm:text-sm font-mono text-white/40">
            {filteredProjects.length} {lang === 'ru' ? 'работ' : 'projects'}
          </div>
        </div>

        {/* Bento Grid: dense packing with native aspect-ratio awareness */}
        {filteredProjects.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-white/[0.02] border border-white/10 text-white/40 font-mono text-sm">
            {lang === 'ru' ? 'Работ в категории пока нет' : 'No projects in this category'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 auto-rows-[280px] sm:auto-rows-[310px] md:auto-rows-[340px] grid-flow-dense gap-4 sm:gap-5 md:gap-6">
            {filteredProjects.map((project, idx) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={idx}
                onOpen={onOpenProject}
              />
            ))}
          </div>
        )}
      </div>

      {/* About Section */}
      <AboutSection realm="gamedev" />

      {/* Contact Section */}
      <ContactSection realm="gamedev" />
    </div>
  );
};
