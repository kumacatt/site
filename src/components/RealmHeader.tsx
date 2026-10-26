import React, { useState } from 'react';
import { RealmType } from '../data/projects';
import { Gamepad2, Palette, Share2, Check, Compass, Menu, X, ArrowUpRight, Settings } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';
import { LanguageSwitch } from './LanguageSwitch';

interface RealmHeaderProps {
  currentRealm: RealmType;
  onSelectRealm: (realm: RealmType) => void;
  onOpenPortal: () => void;
  onScrollTo: (sectionId: string) => void;
  onToggleSettings?: () => void;
}

export const RealmHeader: React.FC<RealmHeaderProps> = ({
  currentRealm,
  onSelectRealm,
  onOpenPortal,
  onScrollTo,
  onToggleSettings
}) => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.header;
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCopyCurrentLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${currentRealm}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-2.5 sm:px-8 lg:px-12 py-3 sm:py-5 pointer-events-none transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        {/* Left: Brand / Logo button */}
        <button
          onClick={onOpenPortal}
          title={t.portal[lang]}
          className="flex items-center gap-2 group px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 hover:border-amber-400/40 hover:bg-black/75 transition-all shadow-xl flex-shrink-0 active:scale-95"
        >
          <Compass size={18} className="text-amber-400 group-hover:rotate-45 transition-transform duration-300 flex-shrink-0" />
          <span className="hidden sm:inline text-sm font-bold text-white tracking-widest uppercase font-sans">
            {t.name[lang]}
          </span>
        </button>

        {/* Center: Realm Toggle Pill — Highly visible, prominent & clean */}
        <div className="flex items-center p-1 sm:p-2 rounded-2xl bg-neutral-950/85 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)] mx-1 sm:mx-4 flex-shrink-0">
          <button
            onClick={(e) => {
              if (currentRealm !== 'gamedev') {
                window.dispatchEvent(
                  new CustomEvent('kum-realm-transition', {
                    detail: {
                      toRealm: 'gamedev',
                      clientX: e.clientX,
                      clientY: e.clientY,
                    },
                  })
                );
              }
              onSelectRealm('gamedev');
            }}
            className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-mono uppercase tracking-wider font-bold transition-all duration-300 active:scale-95 ${
              currentRealm === 'gamedev'
                ? 'bg-gradient-to-r from-amber-500/35 via-amber-500/25 to-amber-600/35 text-amber-300 border border-amber-400/60 shadow-[0_0_24px_rgba(245,158,11,0.35)]'
                : 'text-neutral-400 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            <Gamepad2 size={16} className={`flex-shrink-0 ${currentRealm === 'gamedev' ? 'text-amber-400' : 'text-neutral-400'}`} />
            <span>{t.gamedev[lang]}</span>
          </button>

          <div className="w-px h-5 sm:h-6 bg-white/15 mx-0.5 sm:mx-1.5 flex-shrink-0" />

          <button
            onClick={(e) => {
              if (currentRealm !== 'design') {
                window.dispatchEvent(
                  new CustomEvent('kum-realm-transition', {
                    detail: {
                      toRealm: 'design',
                      clientX: e.clientX,
                      clientY: e.clientY,
                    },
                  })
                );
              }
              onSelectRealm('design');
            }}
            className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-mono uppercase tracking-wider font-bold transition-all duration-300 active:scale-95 ${
              currentRealm === 'design'
                ? 'bg-gradient-to-r from-purple-500/35 via-purple-500/25 to-fuchsia-600/35 text-purple-200 border border-purple-400/60 shadow-[0_0_24px_rgba(168,85,247,0.35)]'
                : 'text-neutral-400 hover:text-white hover:bg-white/10 border border-transparent'
            }`}
          >
            <Palette size={16} className={`flex-shrink-0 ${currentRealm === 'design' ? 'text-purple-300' : 'text-neutral-400'}`} />
            <span>{t.design[lang]}</span>
          </button>
        </div>

        {/* Right Controls: Full Bar on Desktop (`md:flex`) */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Language Switcher */}
          <LanguageSwitch />

          <button
            onClick={() => onScrollTo('about')}
            className="px-4 py-2.5 rounded-xl bg-black/55 backdrop-blur-xl border border-white/15 hover:border-white/35 text-xs sm:text-sm font-mono text-white/85 hover:text-white transition-all shadow-md active:scale-95"
          >
            {t.about[lang]}
          </button>

          <button
            onClick={() => onScrollTo('contacts')}
            className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-xl border border-white/25 text-xs sm:text-sm font-mono text-white transition-all font-semibold shadow-md active:scale-95"
          >
            {t.contacts[lang]}
          </button>

          {/* Dither & Visual FX Settings Gear */}
          <button
            onClick={onToggleSettings}
            title={lang === 'ru' ? 'Настройки дизера' : 'Dither Settings'}
            className="p-2.5 rounded-xl bg-black/55 hover:bg-white/15 backdrop-blur-xl border border-white/15 hover:border-amber-500/50 text-amber-400 hover:text-amber-300 transition-all flex items-center justify-center group shadow-md active:scale-95"
          >
            <Settings size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Right Controls on Mobile (`md:hidden`): About, Contacts, Language Switch + Hamburger */}
        <div className="md:hidden flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => onScrollTo('about')}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-xl border border-white/15 hover:border-white/35 text-xs font-mono text-white/90 hover:text-white transition-all shadow-md active:scale-95"
          >
            {t.about[lang]}
          </button>

          <button
            onClick={() => onScrollTo('contacts')}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-xl border border-white/25 text-xs font-mono text-white transition-all font-semibold shadow-md active:scale-95"
          >
            {t.contacts[lang]}
          </button>

          <LanguageSwitch />

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Меню навигации"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black/70 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white/90 hover:text-white transition-colors active:scale-95"
          >
            {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Collapsed items: Share, About, Contacts, Portal) */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 p-4 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-col gap-3 pointer-events-auto animate-fade-in">
          {/* Quick Share Link */}
          <button
            onClick={() => {
              handleCopyCurrentLink();
            }}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-mono text-white/90 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Share2 size={16} className="text-amber-400" />
              <span>{t.copyTabLink[lang]}</span>
            </span>
            <span className="text-xs font-mono text-white/50">
              {copied ? <span className="text-emerald-400 font-bold">{t.copied[lang]}</span> : `#${currentRealm}`}
            </span>
          </button>

          {/* About Me */}
          <button
            onClick={() => {
              onScrollTo('about');
              setMobileMenuOpen(false);
            }}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-mono text-white/90 transition-colors text-left"
          >
            <span>{t.about[lang]}</span>
            <span className="text-white/40">→</span>
          </button>

          {/* Contacts */}
          <button
            onClick={() => {
              onScrollTo('contacts');
              setMobileMenuOpen(false);
            }}
            className="flex items-center justify-between p-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-mono text-white transition-colors text-left font-medium"
          >
            <span>{t.contacts[lang]}</span>
            <span className="text-white/40">→</span>
          </button>

          {/* Dither Tuner in Mobile Menu */}
          <button
            onClick={() => {
              if (onToggleSettings) onToggleSettings();
              setMobileMenuOpen(false);
            }}
            className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-sm font-mono text-amber-300 transition-colors text-left"
          >
            <span className="flex items-center gap-2.5">
              <Settings size={16} className="text-amber-400" />
              <span>{lang === 'ru' ? 'Настройки дизера' : 'Dither Settings'}</span>
            </span>
            <span className="text-xs font-mono text-amber-400/70 font-bold">⚙️</span>
          </button>

          {/* Portal Switcher */}
          <button
            onClick={() => {
              onOpenPortal();
              setMobileMenuOpen(false);
            }}
            className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-sm font-mono text-amber-300 transition-colors text-left"
          >
            <span className="flex items-center gap-2.5">
              <Compass size={16} />
              <span>{t.portal[lang]}</span>
            </span>
            <ArrowUpRight size={16} />
          </button>
        </div>
      )}
    </header>
  );
};
