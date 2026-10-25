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
      className={`relative inline-flex items-center p-0.5 rounded-xl bg-black/60 backdrop-blur-xl border border-white/15 shadow-md select-none font-mono text-[11px] ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang('ru')}
        className={`px-2.5 py-1 rounded-lg transition-all duration-200 ${
          lang === 'ru'
            ? 'bg-white/20 text-white font-bold shadow-sm'
            : 'text-white/40 hover:text-white/80'
        }`}
      >
        RU
      </button>
      <div className="w-px h-3 bg-white/10 mx-0.5" />
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2.5 py-1 rounded-lg transition-all duration-200 ${
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
