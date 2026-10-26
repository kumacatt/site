import React from 'react';
import { RealmType } from '../data/projects';
import { SoftwareGraph } from './SoftwareGraph';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';

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
        </div>

        {/* Right Column: Floating Software Constellation */}
        <div className="lg:col-span-7 flex items-center justify-center">
          <SoftwareGraph />
        </div>
      </div>
    </section>
  );
};
