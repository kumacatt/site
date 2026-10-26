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
    <header className="fixed top-0 left-0 right-0 z-40 px-3 sm:px-8 py-3 sm:py-4 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        {/* Left: Brand / Logo button */}
        <button
          onClick={onOpenPortal}
          title={t.portal[lang]}
          className="flex items-center gap-2 group p-2 sm:px-3.5 sm:py-2 rounded-2xl bg-black/55 backdrop-blur-xl border border-white/10 hover:border-white/30 transition-all shadow-lg flex-shrink-0"
        >
          <Compass size={15} className="text-amber-400 group-hover:rotate-45 transition-transform flex-shrink-0" />
          <span className="hidden sm:inline text-xs font-bold text-white tracking-widest uppercase font-sans">
            {t.name[lang]}
          </span>
        </button>

        {/* Center: Realm Toggle Pill — ALWAYS VISIBLE on both Mobile & Desktop */}
        <div className="flex items-center p-1 rounded-2xl bg-black/65 backdrop-blur-2xl border border-white/15 shadow-2xl mx-1 sm:mx-2 flex-shrink-0">
          <button
            onClick={() => onSelectRealm('gamedev')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-mono transition-all duration-300 ${
              currentRealm === 'gamedev'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-md font-semibold'
                : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Gamepad2 size={13} className="flex-shrink-0" />
            <span className="hidden sm:inline">{t.gamedev[lang]}</span>
            <span className="sm:hidden">Gamedev</span>
          </button>

          <div className="w-px h-4 bg-white/10 mx-0.5 sm:mx-1 flex-shrink-0" />

          <button
            onClick={() => onSelectRealm('design')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-mono transition-all duration-300 ${
              currentRealm === 'design'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-md font-semibold'
                : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Palette size={13} className="flex-shrink-0" />
            <span className="hidden sm:inline">{t.design[lang]}</span>
            <span className="sm:hidden">{lang === 'ru' ? 'Дизайн' : 'Design'}</span>
          </button>
        </div>

        {/* Right Controls: Full Bar on Desktop (`md:flex`) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Language Switcher */}
          <LanguageSwitch />

          <button
            onClick={handleCopyCurrentLink}
            title={t.copyTabLink[lang]}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 hover:border-white/30 text-xs font-mono text-white/70 hover:text-white transition-all"
          >
            {copied ? (
              <Check size={13} className="text-emerald-400" />
            ) : (
              <Share2 size={13} />
            )}
            <span>#{currentRealm}</span>
          </button>

          <button
            onClick={() => onScrollTo('about')}
            className="px-3.5 py-2 rounded-xl bg-black/50 backdrop-blur-xl border border-white/10 hover:border-white/30 text-xs font-mono text-white/75 hover:text-white transition-all"
          >
            {t.about[lang]}
          </button>

          <button
            onClick={() => onScrollTo('contacts')}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-xs font-mono text-white transition-all font-medium"
          >
            {t.contacts[lang]}
          </button>

          {/* Dither & Visual FX Settings Gear */}
          <button
            onClick={onToggleSettings}
            title={lang === 'ru' ? 'Настройки дизера' : 'Dither Settings'}
            className="p-2.5 rounded-xl bg-black/50 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 transition-all flex items-center justify-center group"
          >
            <Settings size={15} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Right Controls on Mobile (`md:hidden`): Language Switch + Hamburger */}
        <div className="md:hidden flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitch />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Меню навигации"
            className="w-9 h-9 rounded-xl bg-black/60 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Collapsed items: Share, About, Contacts, Portal) */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-4 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-white/15 shadow-2xl flex flex-col gap-2.5 pointer-events-auto animate-fade-in">
          {/* Quick Share Link */}
          <button
            onClick={() => {
              handleCopyCurrentLink();
            }}
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/90 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Share2 size={14} className="text-amber-400" />
              <span>{t.copyTabLink[lang]}</span>
            </span>
            <span className="text-[11px] font-mono text-white/50">
              {copied ? <span className="text-emerald-400 font-bold">{t.copied[lang]}</span> : `#${currentRealm}`}
            </span>
          </button>

          {/* About Me */}
          <button
            onClick={() => {
              onScrollTo('about');
              setMobileMenuOpen(false);
            }}
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white/90 transition-colors text-left"
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
            className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-mono text-white transition-colors text-left font-medium"
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
            className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-mono text-amber-300 transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Settings size={14} className="text-amber-400" />
              <span>{lang === 'ru' ? 'Настройки дизера' : 'Dither Settings'}</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400/70 font-bold">⚙️</span>
          </button>

          {/* Portal Switcher */}
          <button
            onClick={() => {
              onOpenPortal();
              setMobileMenuOpen(false);
            }}
            className="flex items-center justify-between p-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-mono text-amber-300 transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Compass size={14} />
              <span>{t.portal[lang]}</span>
            </span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      )}
    </header>
  );
};
