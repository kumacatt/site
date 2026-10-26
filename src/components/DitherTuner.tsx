import React, { useState, useEffect } from 'react';
import { Sliders, X, RotateCcw, Copy, Check } from 'lucide-react';

export interface DitherSettings {
  edgeSharpness: number; // 0.5 (soft) to 3.0 (ultra-sharp)
  dissipation: number;   // 0.92 (fast fade) to 0.985 (long linger)
  fluidRadius: number;   // 1.5 (thin stream) to 5.0 (wide plume)
  baseOpacity: number;   // 0.0 (off) to 0.15 (distinct)
}

export const DEFAULT_DITHER_SETTINGS: DitherSettings = {
  edgeSharpness: 1.3,
  dissipation: 0.955,
  fluidRadius: 3.0,
  baseOpacity: 0.045,
};

const STORAGE_KEY = 'kum_dither_settings_v1';

export const loadDitherSettings = (): DitherSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        edgeSharpness: typeof parsed.edgeSharpness === 'number' ? parsed.edgeSharpness : DEFAULT_DITHER_SETTINGS.edgeSharpness,
        dissipation: typeof parsed.dissipation === 'number' ? parsed.dissipation : DEFAULT_DITHER_SETTINGS.dissipation,
        fluidRadius: typeof parsed.fluidRadius === 'number' ? parsed.fluidRadius : DEFAULT_DITHER_SETTINGS.fluidRadius,
        baseOpacity: typeof parsed.baseOpacity === 'number' ? parsed.baseOpacity : DEFAULT_DITHER_SETTINGS.baseOpacity,
      };
    }
  } catch {}
  return DEFAULT_DITHER_SETTINGS;
};

export const DitherTuner: React.FC<{
  currentRealm?: 'gamedev' | 'design' | null;
  onSettingsChange?: (settings: DitherSettings) => void;
}> = ({ currentRealm, onSettingsChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<DitherSettings>(loadDitherSettings);
  const [copied, setCopied] = useState(false);

  // Notify parent & window on change
  const updateSetting = <K extends keyof DitherSettings>(key: K, value: number) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('kum-dither-settings', { detail: next }));
      if (onSettingsChange) onSettingsChange(next);
      return next;
    });
  };

  const applyPreset = (preset: DitherSettings) => {
    setSettings(preset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
    window.dispatchEvent(new CustomEvent('kum-dither-settings', { detail: preset }));
    if (onSettingsChange) onSettingsChange(preset);
  };

  const handleReset = () => {
    applyPreset(DEFAULT_DITHER_SETTINGS);
  };

  const handleCopy = () => {
    const text = `// Dither Settings Preset:
edgeSharpness: ${settings.edgeSharpness.toFixed(2)},
dissipation: ${settings.dissipation.toFixed(3)},
fluidRadius: ${settings.fluidRadius.toFixed(1)},
baseOpacity: ${(settings.baseOpacity * 100).toFixed(1)}%`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Only display tuner when in GameDev realm where dither is active
  if (currentRealm !== 'gamedev') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-neutral-950/80 hover:bg-neutral-900 border border-amber-500/30 text-amber-300 hover:text-white backdrop-blur-xl shadow-2xl transition-all text-xs font-mono group"
        >
          <Sliders size={14} className="group-hover:rotate-45 transition-transform text-amber-400" />
          <span>Настройки дизера</span>
        </button>
      )}

      {/* Floating Tuner Modal Panel */}
      {isOpen && (
        <div className="w-80 p-5 rounded-3xl bg-neutral-950/90 border border-amber-500/30 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-white space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Sliders size={14} />
              <span>Dither Edge Tuner</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Quick Style Presets */}
          <div className="flex items-center gap-1.5 pb-1">
            <button
              onClick={() => applyPreset({ edgeSharpness: 0.75, dissipation: 0.965, fluidRadius: 3.5, baseOpacity: 0.035 })}
              className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/70 hover:text-white transition-all text-center"
            >
              Мягкий
            </button>
            <button
              onClick={() => applyPreset(DEFAULT_DITHER_SETTINGS)}
              className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/70 hover:text-white transition-all text-center"
            >
              Баланс
            </button>
            <button
              onClick={() => applyPreset({ edgeSharpness: 2.2, dissipation: 0.945, fluidRadius: 2.6, baseOpacity: 0.05 })}
              className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/70 hover:text-white transition-all text-center"
            >
              Резкий
            </button>
          </div>

          {/* Slider 1: Edge Sharpness */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-white/80">Резкость края (Sharpness):</span>
              <span className="text-amber-400 font-bold">{settings.edgeSharpness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.05"
              value={settings.edgeSharpness}
              onChange={e => updateSetting('edgeSharpness', parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/15 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[9px] font-mono text-white/40">
              <span>Мягкий</span>
              <span>Баланс</span>
              <span>Резкий</span>
            </div>
          </div>

          {/* Slider 2: Dissipation / Trail Length */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-white/80">Длина шлейфа (Trail Life):</span>
              <span className="text-amber-400 font-bold">
                {((1 / (1 - settings.dissipation)) * 0.016).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min="0.91"
              max="0.985"
              step="0.005"
              value={settings.dissipation}
              onChange={e => updateSetting('dissipation', parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/15 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[9px] font-mono text-white/40">
              <span>Короткий</span>
              <span>Средний</span>
              <span>Долгий</span>
            </div>
          </div>

          {/* Slider 3: Fluid Stream Radius */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-white/80">Толщина струи (Radius):</span>
              <span className="text-amber-400 font-bold">{settings.fluidRadius.toFixed(1)}px</span>
            </div>
            <input
              type="range"
              min="1.5"
              max="5.0"
              step="0.2"
              value={settings.fluidRadius}
              onChange={e => updateSetting('fluidRadius', parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/15 rounded-lg appearance-none"
            />
          </div>

          {/* Slider 4: Base Dither Opacity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-white/80">Фоновый дизер (Base Grid):</span>
              <span className="text-amber-400 font-bold">{(settings.baseOpacity * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.12"
              step="0.005"
              value={settings.baseOpacity}
              onChange={e => updateSetting('baseOpacity', parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/15 rounded-lg appearance-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10">
            <button
              onClick={handleReset}
              title="Сбросить к значениям по умолчанию"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-mono transition-colors"
            >
              <RotateCcw size={12} />
              <span>Сброс</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-mono transition-all font-semibold"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
