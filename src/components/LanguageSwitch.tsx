import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface LanguageSwitchProps {
  className?: string;
}

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({ className = '' }) => {
  const { lang, setLang } = useLanguage();

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`relative inline-flex items-center p-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/15 shadow-md select-none font-mono text-xs sm:text-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang('ru')}
        className={`px-3 py-1.5 rounded-lg transition-all duration-200 ${
          lang === 'ru'
            ? 'bg-white/20 text-white font-bold shadow-sm'
            : 'text-white/40 hover:text-white/80'
        }`}
      >
        RU
      </button>
      <div className="w-px h-3.5 bg-white/10 mx-0.5" />
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-3 py-1.5 rounded-lg transition-all duration-200 ${
          lang === 'en'
            ? 'bg-white/20 text-white font-bold shadow-sm'
            : 'text-white/40 hover:text-white/80'
        }`}
      >
        EN
      </button>
    </div>
  );
};
