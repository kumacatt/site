import React, { useState } from 'react';
import { Send, Copy, Check, Mail } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';

export const ContactSection: React.FC = () => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.contact;
  const [copiedEmail, setCopiedEmail] = useState(false);
  const myEmail = 'kumacat@yandex.ru';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(myEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const socialLinks = [
    {
      name: 'Telegram Канал',
      url: 'https://t.me/KUMACATs',
      color: '#229ED9',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
      )
    },
    {
      name: 'Itch.io',
      url: 'https://cordit.itch.io/',
      color: '#FA5C5C',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M2.5 5.5v3.6c0 .7.3 1.4.8 1.9.5.5 1.2.8 1.9.8.7 0 1.4-.3 1.9-.8.5-.5.8-1.2.8-1.9 0 .7.3 1.4.8 1.9.5.5 1.2.8 1.9.8.7 0 1.4-.3 1.9-.8.5-.5.8-1.2.8-1.9 0 .7.3 1.4.8 1.9.5.5 1.2.8 1.9.8.7 0 1.4-.3 1.9-.8.5-.5.8-1.2.8-1.9V5.5c-6.8 0-14.8 0-21.6 0zm3.3 8.3c.7 0 1.4.3 1.9.8.5.5.8 1.2.8 1.9v2.1H5.8v-2.1c0-.7.3-1.4.8-1.9.5-.5 1.2-.8 1.9-.8zm12.4 0c.7 0 1.4.3 1.9.8.5.5.8 1.2.8 1.9v2.1h-2.7v-2.1c0-.7.3-1.4.8-1.9.5-.5 1.2-.8 1.9-.8z" />
        </svg>
      )
    },
    {
      name: 'X (Twitter)',
      url: 'https://x.com/KUMACATT',
      color: '#FFFFFF',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/igor-churakov-b08ba8226/?isSelfProfile=true',
      color: '#0A66C2',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      )
    },
    {
      name: 'ArtStation',
      url: 'https://www.artstation.com/kumacat',
      color: '#13AFF0',
      icon: (
        <img src="/artstation.webp" alt="ArtStation" className="w-5 h-5 object-contain" />
      )
    }
  ];

  return (
    <section id="contacts" className="relative py-24 px-4 sm:px-8 max-w-7xl mx-auto w-full border-t border-white/10">
      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-10">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-white/40 block mb-2">
            {t.contacts[lang]}
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase font-sans">
            {t.title[lang]}
          </h2>
          <p className="mt-3 text-sm sm:text-base font-mono text-white/70 max-w-md mx-auto">
            {t.subtitle[lang]}
          </p>
        </div>

        {/* 1. DIRECT CONTACT BLOCK (Telegram ЛС + Email) */}
        <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Telegram DM */}
          <a
            href="https://t.me/KUMACATT"
            target="_blank"
            rel="noopener noreferrer"
            className="group p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#229ED9]/50 transition-all flex flex-col items-center text-center space-y-2.5 shadow-lg"
          >
            <div className="w-11 h-11 rounded-full bg-[#229ED9]/15 border border-[#229ED9]/30 flex items-center justify-center text-[#229ED9] group-hover:scale-110 transition-transform">
              <Send size={19} />
            </div>
            <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
              {t.tgDm[lang]}
            </span>
            <span className="text-sm sm:text-base font-bold text-white font-mono group-hover:text-[#229ED9] transition-colors">
              @KUMACATT
            </span>
          </a>

          {/* Email Card */}
          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col items-center text-center space-y-2.5 shadow-lg">
            <div className="w-11 h-11 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Mail size={19} />
            </div>
            <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
              {t.emailLabel[lang]}
            </span>
            <button
              onClick={handleCopyEmail}
              className="text-sm sm:text-base font-bold text-white font-mono hover:text-amber-300 transition-colors flex items-center gap-1.5"
            >
              <span>{myEmail}</span>
              {copiedEmail ? (
                <Check size={14} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <Copy size={14} className="text-white/40 flex-shrink-0" />
              )}
            </button>
            {copiedEmail && (
              <span className="text-xs font-mono text-emerald-400">{t.copiedBuffer[lang]}</span>
            )}
          </div>
        </div>

        {/* 2. SOCIALS (Icons only) */}
        <div className="w-full pt-4 space-y-4">
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest block">
            {t.socials[lang]}
          </span>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {socialLinks.map(soc => (
              <a
                key={soc.name}
                href={soc.url}
                target="_blank"
                rel="noopener noreferrer"
                title={soc.name}
                className="w-12 h-12 rounded-2xl bg-black/40 hover:bg-white/[0.08] border border-white/10 hover:border-white/30 backdrop-blur-xl flex items-center justify-center transition-all transform hover:scale-110 shadow-md group"
              >
                <div className="transition-transform group-hover:scale-115" style={{ color: soc.color }}>
                  {soc.icon}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-white/30 gap-2">
        <span>© {new Date().getFullYear()} {lang === 'ru' ? 'Игорь Чураков' : 'Igor Churakov'}. {t.allRightsReserved[lang]}</span>
        <span>Gamedev • CG • Graphic Design</span>
      </div>
    </section>
  );
};
