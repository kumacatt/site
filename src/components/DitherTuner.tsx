import React, { useState, useEffect } from 'react';
import { Sliders, X, RotateCcw, Copy, Check, Settings, Sparkles, Waves, Droplets } from 'lucide-react';

// ==========================================
// 1. GAMEDEV DITHER SETTINGS
// ==========================================
export interface DitherSettings {
  edgeSharpness: number; // 0.5 (soft) to 3.0 (ultra-sharp)
  dissipation: number;   // 0.92 (fast fade) to 0.985 (long linger)
  fluidRadius: number;   // 1.0 (thin stream) to 5.0 (wide plume)
  baseOpacity: number;   // 0.0 (off) to 0.15 (distinct)
}

export const DEFAULT_DITHER_SETTINGS: DitherSettings = {
  edgeSharpness: 3.0,
  dissipation: 0.965,
  fluidRadius: 1.5,
  baseOpacity: 0.02,
};

const DITHER_STORAGE_KEY = 'kum_dither_settings_v2';

export const loadDitherSettings = (): DitherSettings => {
  try {
    const raw = localStorage.getItem(DITHER_STORAGE_KEY);
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

// ==========================================
// 2. DESIGN REFRACTION SETTINGS
// ==========================================
export interface RefractionSettings {
  specular: number;     // 0.0 (pure glass, no white) to 1.0 (bright glint)
  distortion: number;   // 10.0 to 70.0px (strength of ripple lens)
  chromatic: number;    // 0.0 to 2.0 (prism dispersion)
  dissipation: number;  // 0.91 to 0.990 (fade duration)
  waveRadius: number;   // 1.5 to 16.0px (wake thickness)
}

export const DEFAULT_REFRACTION_SETTINGS: RefractionSettings = {
  specular: 0.72,
  distortion: 60.0,
  chromatic: 1.50,
  dissipation: 0.985,
  waveRadius: 10,
};

const REFRACTION_STORAGE_KEY = 'kum_refraction_settings_v4';

export const loadRefractionSettings = (): RefractionSettings => {
  try {
    const raw = localStorage.getItem(REFRACTION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        specular: typeof parsed.specular === 'number' ? parsed.specular : DEFAULT_REFRACTION_SETTINGS.specular,
        distortion: typeof parsed.distortion === 'number' ? parsed.distortion : DEFAULT_REFRACTION_SETTINGS.distortion,
        chromatic: typeof parsed.chromatic === 'number' ? parsed.chromatic : DEFAULT_REFRACTION_SETTINGS.chromatic,
        dissipation: typeof parsed.dissipation === 'number' ? parsed.dissipation : DEFAULT_REFRACTION_SETTINGS.dissipation,
        waveRadius: typeof parsed.waveRadius === 'number' ? parsed.waveRadius : DEFAULT_REFRACTION_SETTINGS.waveRadius,
      };
    }
  } catch {}
  return DEFAULT_REFRACTION_SETTINGS;
};

// ==========================================
// UNIFIED TUNER COMPONENT
// ==========================================
export interface DitherTunerProps {
  currentRealm?: 'gamedev' | 'design' | null;
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  onSettingsChange?: (settings: DitherSettings) => void;
  onRefractionChange?: (settings: RefractionSettings) => void;
  onSwitchToGamedev?: () => void;
}

export const DitherTuner: React.FC<DitherTunerProps> = ({
  currentRealm = 'gamedev',
  isOpen: controlledIsOpen,
  onClose,
  onOpen,
  onSettingsChange,
  onRefractionChange,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleOpen = () => {
    if (onOpen) onOpen();
    setInternalIsOpen(true);
  };

  const handleClose = () => {
    if (onClose) onClose();
    setInternalIsOpen(false);
  };

  const [ditherSettings, setDitherSettings] = useState<DitherSettings>(loadDitherSettings);
  const [refractionSettings, setRefractionSettings] = useState<RefractionSettings>(loadRefractionSettings);
  const [copied, setCopied] = useState(false);

  const isDesign = currentRealm === 'design';

  // Listen to external toggle events from header or shortcuts
  useEffect(() => {
    const handleToggle = () => {
      if (isOpen) handleClose();
      else handleOpen();
    };
    window.addEventListener('kum-toggle-dither-tuner', handleToggle);
    return () => window.removeEventListener('kum-toggle-dither-tuner', handleToggle);
  }, [isOpen]);

  // Update GameDev Dither setting
  const updateDither = <K extends keyof DitherSettings>(key: K, value: number) => {
    setDitherSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(DITHER_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('kum-dither-settings', { detail: next }));
      if (onSettingsChange) onSettingsChange(next);
      return next;
    });
  };

  // Update Design Refraction setting
  const updateRefraction = <K extends keyof RefractionSettings>(key: K, value: number) => {
    setRefractionSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(REFRACTION_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('kum-refraction-settings', { detail: next }));
      if (onRefractionChange) onRefractionChange(next);
      return next;
    });
  };

  const applyDitherPreset = (preset: DitherSettings) => {
    setDitherSettings(preset);
    localStorage.setItem(DITHER_STORAGE_KEY, JSON.stringify(preset));
    window.dispatchEvent(new CustomEvent('kum-dither-settings', { detail: preset }));
    if (onSettingsChange) onSettingsChange(preset);
  };

  const applyRefractionPreset = (preset: RefractionSettings) => {
    setRefractionSettings(preset);
    localStorage.setItem(REFRACTION_STORAGE_KEY, JSON.stringify(preset));
    window.dispatchEvent(new CustomEvent('kum-refraction-settings', { detail: preset }));
    if (onRefractionChange) onRefractionChange(preset);
  };

  const handleReset = () => {
    if (isDesign) {
      applyRefractionPreset(DEFAULT_REFRACTION_SETTINGS);
    } else {
      applyDitherPreset(DEFAULT_DITHER_SETTINGS);
    }
  };

  const handleCopy = () => {
    let text = '';
    if (isDesign) {
      text = `// Refraction Settings Preset:
specular: ${refractionSettings.specular.toFixed(2)},
distortion: ${refractionSettings.distortion.toFixed(1)},
chromatic: ${refractionSettings.chromatic.toFixed(2)},
dissipation: ${refractionSettings.dissipation.toFixed(3)},
waveRadius: ${refractionSettings.waveRadius.toFixed(1)}`;
    } else {
      text = `// Dither Settings Preset:
edgeSharpness: ${ditherSettings.edgeSharpness.toFixed(2)},
dissipation: ${ditherSettings.dissipation.toFixed(3)},
fluidRadius: ${ditherSettings.fluidRadius.toFixed(1)},
baseOpacity: ${(ditherSettings.baseOpacity * 100).toFixed(1)}%`;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none pointer-events-auto">
      {/* Floating Toggle Pill (Always available when closed) */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          title={isDesign ? 'Настройки искажения воды' : 'Настройки дизера'}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full backdrop-blur-xl shadow-2xl transition-all text-xs font-mono group border ${
            isDesign
              ? 'bg-neutral-950/85 hover:bg-neutral-900 border-purple-500/35 text-purple-300 hover:text-white'
              : 'bg-neutral-950/85 hover:bg-neutral-900 border-amber-500/35 text-amber-300 hover:text-white'
          }`}
        >
          {isDesign ? (
            <>
              <Waves size={14} className="group-hover:rotate-12 transition-transform text-purple-400" />
              <span>Настройки искажения</span>
            </>
          ) : (
            <>
              <Sliders size={14} className="group-hover:rotate-45 transition-transform text-amber-400" />
              <span>Настройки дизера</span>
            </>
          )}
        </button>
      )}

      {/* Floating Tuner Modal Panel */}
      {isOpen && (
        <div
          className={`w-[340px] max-w-[calc(100vw-2rem)] p-5 rounded-3xl bg-neutral-950/95 backdrop-blur-2xl shadow-[0_10px_50px_rgba(0,0,0,0.85)] text-white space-y-4 animate-fade-in border box-border ${
            isDesign ? 'border-purple-500/35' : 'border-amber-500/35'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div
              className={`flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider ${
                isDesign ? 'text-purple-400' : 'text-amber-400'
              }`}
            >
              {isDesign ? (
                <>
                  <Waves size={15} className="text-purple-400" />
                  <span>Liquid Refraction Tuner</span>
                </>
              ) : (
                <>
                  <Settings size={15} className="text-amber-400" />
                  <span>Dither Edge Tuner</span>
                </>
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* ======================================================== */}
          {/* DESIGN REALM CONTROLS (Water Refraction & Distortion) */}
          {/* ======================================================== */}
          {isDesign ? (
            <>
              {/* Quick Style Presets for Refraction */}
              <div className="flex items-center gap-1.5 pb-1">
                <button
                  onClick={() =>
                    applyRefractionPreset({
                      specular: 0.0,
                      distortion: 30.0,
                      chromatic: 0.8,
                      dissipation: 0.960,
                      waveRadius: 3.0,
                    })
                  }
                  title="0% белого — кристально чистое преломление видео без белых бликов"
                  className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/80 hover:text-white transition-all text-center flex items-center justify-center gap-1"
                >
                  <Droplets size={10} />
                  <span>Чистое стекло</span>
                </button>
                <button
                  onClick={() => applyRefractionPreset(DEFAULT_REFRACTION_SETTINGS)}
                  title="Дефолтный насыщенный пресет преломления (specular 0.72, distortion 60, chromatic 1.5, dissipation 0.985, waveRadius 10)"
                  className="flex-1 py-1.5 px-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-[10px] font-mono text-purple-300 font-bold transition-all text-center"
                >
                  По умолчанию
                </button>
                <button
                  onClick={() =>
                    applyRefractionPreset({
                      specular: 0.35,
                      distortion: 35.0,
                      chromatic: 1.0,
                      dissipation: 0.965,
                      waveRadius: 4.0,
                    })
                  }
                  title="Мягкий деликатный баланс"
                  className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/70 hover:text-white transition-all text-center"
                >
                  Мягкий
                </button>
              </div>

              {/* Slider 1: Specular White Highlight Glint */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-white/80">Яркость белого блика (Specular):</span>
                  <span className="text-purple-400 font-bold tabular-nums min-w-[48px] text-right">
                    {refractionSettings.specular === 0 ? '0%' : `${(refractionSettings.specular * 100).toFixed(0)}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.02"
                  value={refractionSettings.specular}
                  onChange={e => updateRefraction('specular', parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer h-1.5 bg-white/15 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[9px] font-mono text-white/40">
                  <span className="text-purple-300 font-bold">0% Чистое стекло</span>
                  <span>50%</span>
                  <span>100% Яркий</span>
                </div>
              </div>

              {/* Slider 2: Distortion Strength */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/80">Сила искажения (Strength):</span>
                  <span className="text-purple-400 font-bold">{refractionSettings.distortion.toFixed(0)}px</span>
                </div>
                <input
                  type="range"
                  min="10.0"
                  max="70.0"
                  step="1.0"
                  value={refractionSettings.distortion}
                  onChange={e => updateRefraction('distortion', parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer h-1.5 bg-white/15 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[9px] font-mono text-white/40">
                  <span>10px Тонкое</span>
                  <span>40px Оптика</span>
                  <span>70px Глубокое</span>
                </div>
              </div>

              {/* Slider 3: Chromatic Dispersion (Prism) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/80">Хроматическая призма (Prism):</span>
                  <span className="text-purple-400 font-bold">{refractionSettings.chromatic.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={refractionSettings.chromatic}
                  onChange={e => updateRefraction('chromatic', parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer h-1.5 bg-white/15 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[9px] font-mono text-white/40">
                  <span>0 (Без призмы)</span>
                  <span>1.0 Баланс</span>
                  <span>2.0 Радуга</span>
                </div>
              </div>

              {/* Slider 4: Trail Dissipation */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/80">Длина шлейфа (Trail Life):</span>
                  <span className="text-purple-400 font-bold">
                    {((1 / (1 - refractionSettings.dissipation)) * 0.016).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.91"
                  max="0.990"
                  step="0.001"
                  value={refractionSettings.dissipation}
                  onChange={e => updateRefraction('dissipation', parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer h-1.5 bg-white/15 rounded-lg appearance-none"
                />
              </div>

              {/* Slider 5: Wave Radius */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/80">Радиус волны (Wave Radius):</span>
                  <span className="text-purple-400 font-bold">{refractionSettings.waveRadius.toFixed(1)}px</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="16.0"
                  step="0.5"
                  value={refractionSettings.waveRadius}
                  onChange={e => updateRefraction('waveRadius', parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer h-1.5 bg-white/15 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[9px] font-mono text-white/40">
                  <span>1.5px Тонкий</span>
                  <span>8px Средний</span>
                  <span>16px Широкий</span>
                </div>
              </div>
            </>
          ) : (
            // ========================================================
            // GAMEDEV REALM CONTROLS (Retro Bayer Dither)
            // ========================================================
            <>
              {/* Quick Style Presets */}
              <div className="flex items-center gap-1.5 pb-1">
                <button
                  onClick={() => applyDitherPreset(DEFAULT_DITHER_SETTINGS)}
                  title="Резкий ретро-дизер (По умолчанию)"
                  className="flex-1 py-1.5 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-bold transition-all text-center flex items-center justify-center gap-1"
                >
                  <Sparkles size={10} />
                  <span>Резкий</span>
                </button>
                <button
                  onClick={() =>
                    applyDitherPreset({
                      edgeSharpness: 1.6,
                      dissipation: 0.955,
                      fluidRadius: 2.4,
                      baseOpacity: 0.035,
                    })
                  }
                  className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/70 hover:text-white transition-all text-center"
                >
                  Баланс
                </button>
                <button
                  onClick={() =>
                    applyDitherPreset({
                      edgeSharpness: 0.8,
                      dissipation: 0.965,
                      fluidRadius: 3.5,
                      baseOpacity: 0.03,
                    })
                  }
                  className="flex-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/70 hover:text-white transition-all text-center"
                >
                  Мягкий
                </button>
              </div>

              {/* Slider 1: Edge Sharpness */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/80">Резкость края (Sharpness):</span>
                  <span className="text-amber-400 font-bold">{ditherSettings.edgeSharpness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.05"
                  value={ditherSettings.edgeSharpness}
                  onChange={e => updateDither('edgeSharpness', parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/15 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[9px] font-mono text-white/40">
                  <span>0.5 Мягкий</span>
                  <span>1.5 Баланс</span>
                  <span className="text-amber-400/80 font-bold">3.0 Резкий</span>
                </div>
              </div>

              {/* Slider 2: Dissipation / Trail Length */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/80">Длина шлейфа (Trail Life):</span>
                  <span className="text-amber-400 font-bold">
                    {((1 / (1 - ditherSettings.dissipation)) * 0.016).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.91"
                  max="0.985"
                  step="0.005"
                  value={ditherSettings.dissipation}
                  onChange={e => updateDither('dissipation', parseFloat(e.target.value))}
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
                  <span className="text-amber-400 font-bold">{ditherSettings.fluidRadius.toFixed(1)}px</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={ditherSettings.fluidRadius}
                  onChange={e => updateDither('fluidRadius', parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/15 rounded-lg appearance-none"
                />
              </div>

              {/* Slider 4: Base Dither Opacity */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-white/80">Фоновый дизер (Base Grid):</span>
                  <span className="text-amber-400 font-bold">{(ditherSettings.baseOpacity * 100).toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.10"
                  step="0.005"
                  value={ditherSettings.baseOpacity}
                  onChange={e => updateDither('baseOpacity', parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-white/15 rounded-lg appearance-none"
                />
              </div>
            </>
          )}

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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all font-semibold border ${
                isDesign
                  ? 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 text-purple-300 hover:text-purple-200'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300 hover:text-amber-200'
              }`}
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
