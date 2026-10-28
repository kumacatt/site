import React from 'react';
import { RealmType } from '../data/projects';
import { SoftwareGraph } from './SoftwareGraph';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';
import { getAssetUrl } from '../utils/asset';
import { FileDown } from 'lucide-react';

interface AboutSectionProps {
  realm?: RealmType | null;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ realm = 'gamedev' }) => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.about;
  const isDesign = realm === 'design';

  return (
    <section id="about" className="relative py-20 px-4 sm:px-8 max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Alive, informal, honest text */}
        <div className="lg:col-span-5 space-y-5">
          <h2 className={`text-3xl sm:text-5xl uppercase text-white ${
            isDesign
              ? 'font-sans font-black tracking-tight'
              : 'font-heading font-normal tracking-wide'
          }`}>
            {t.title[lang]}
          </h2>

          <div className="space-y-4 text-sm sm:text-base font-mono text-white/80 leading-relaxed">
            <p>{t.p1[lang]}</p>
            <p>{t.p2[lang]}</p>
            <p>{t.p3[lang]}</p>
          </div>

          <div className="pt-2 flex flex-wrap gap-2 text-xs font-mono text-white/50">
            <span>#gamedev</span>
            <span>•</span>
            <span>#3dart</span>
            <span>•</span>
            <span>#2dconcept</span>
            <span>•</span>
            <span>#techart</span>
            <span>•</span>
            <span>#branding</span>
          </div>

          {/* Action Row: Download CV & Availability */}
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <a
              href={getAssetUrl('/Igor_Churakov_CV.pdf')}
              download="Igor_Churakov_CV.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 hover:border-amber-400 text-amber-200 text-xs sm:text-sm font-mono font-bold tracking-wider uppercase transition-all shadow-lg active:scale-95 group"
            >
              <FileDown size={16} className="text-amber-400 group-hover:-translate-y-0.5 transition-transform" />
              <span>{t.downloadCv[lang]}</span>
            </a>

            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-mono select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{t.availableStatus[lang]}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Floating Software Constellation */}
        <div className="lg:col-span-7 flex items-center justify-center">
          <SoftwareGraph />
        </div>
      </div>
    </section>
  );
};
