import React from 'react';
import { SOFTWARE_MAP, SoftwareItem } from '../data/software';
import { Sparkles, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TRANSLATIONS } from '../data/translations';

interface SoftwareFilterBarProps {
  selectedSoftware: string | null;
  onSelectSoftware: (softwareId: string | null) => void;
  allowedSoftwareKeys?: string[];
}

export const SoftwareFilterBar: React.FC<SoftwareFilterBarProps> = ({
  selectedSoftware,
  onSelectSoftware,
  allowedSoftwareKeys
}) => {
  const { lang } = useLanguage();
  const t = TRANSLATIONS.filterBar;

  const softwareList: SoftwareItem[] = Object.values(SOFTWARE_MAP).filter(sw => {
    if (!allowedSoftwareKeys) return true;
    return allowedSoftwareKeys.includes(sw.id);
  });

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-xs font-mono text-white/60 uppercase tracking-widest">
          <Sparkles size={13} className="text-amber-400" />
          <span>{t.title[lang]}</span>
        </div>

        {selectedSoftware && (
          <button
            onClick={() => onSelectSoftware(null)}
            className="flex items-center gap-1.5 text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full border border-amber-500/30"
          >
            <X size={12} />
            <span>{t.reset[lang]} ({SOFTWARE_MAP[selectedSoftware]?.name})</span>
          </button>
        )}
      </div>

      <div className="p-2.5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl overflow-x-auto flex items-center gap-2 scrollbar-none">
        <button
          onClick={() => onSelectSoftware(null)}
          className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-mono transition-all duration-200 border ${
            selectedSoftware === null
              ? 'bg-white/15 text-white border-white/30 shadow-md font-semibold'
              : 'bg-transparent text-white/60 border-transparent hover:text-white hover:bg-white/5'
          }`}
        >
          {t.allWorks[lang]}
        </button>

        <div className="w-px h-6 bg-white/10 flex-shrink-0" />

        {softwareList.map(sw => {
          const isSelected = selectedSoftware === sw.id;
          return (
            <button
              key={sw.id}
              onClick={() => onSelectSoftware(isSelected ? null : sw.id)}
              className={`group flex-shrink-0 flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-300 ${
                isSelected
                  ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-[0_0_15px_rgba(234,118,0,0.3)]'
                  : 'bg-black/40 border-white/10 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <img
                  src={sw.icon}
                  alt={sw.name}
                  className="w-full h-full object-contain filter drop-shadow transition-transform group-hover:scale-110"
                />
              </div>
              <span className="text-xs font-mono whitespace-nowrap">{sw.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
