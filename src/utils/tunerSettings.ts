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

export const DITHER_STORAGE_KEY = 'kum_dither_settings_v2';

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

export const REFRACTION_STORAGE_KEY = 'kum_refraction_settings_v4';

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
