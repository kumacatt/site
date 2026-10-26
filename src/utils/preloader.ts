import { getAssetUrl } from './asset';

// 1. Critical Tier 1 Assets: Portal Slideshow Artworks & Key Media
export const CRITICAL_PORTAL_ARTWORKS = [
  // Gamedev Portal Artworks
  getAssetUrl('/1_fragile_screen (1).jpg'),
  getAssetUrl('/1_fragile_screen (2).jpg'),
  getAssetUrl('/1_fragile_screen (3).jpg'),
  getAssetUrl('/1_Sinclair_web.jpg'),
  getAssetUrl('/1_speedsculpt_jab_P.png'),
  getAssetUrl('/1_speedsculpt_mushroom.png'),
  getAssetUrl('/1_fumel_web.jpg'),
  getAssetUrl('/1_whintercore_web.jpg'),
  getAssetUrl('/1_fishing_web.jpg'),
  getAssetUrl('/1_nitted_P.png'),
  getAssetUrl('/1_gamepromo_cover.png'),
  getAssetUrl('/1_MORPHINBeta_web.jpg'),

  // Design Portal Artworks (Selected showcase)
  getAssetUrl('/2_kashtan3doffice_P.png'),
  getAssetUrl('/2_env_P.png'),
  getAssetUrl('/2_Polyana_P.png'),
];

// Helper to preload a single image with caching
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Resilient: never fail the entire preload batch
    img.src = src;
  });
}

// Helper to ensure web fonts are parsed and ready
export function preloadFonts(): Promise<void> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    return document.fonts.ready.then(() => {}).catch(() => {});
  }
  return Promise.resolve();
}

// Background Idle Preloader Queue for Tier 2 project covers
let isBackgroundPreloadStarted = false;

export function startBackgroundPreload(urls: string[]) {
  if (isBackgroundPreloadStarted || typeof window === 'undefined') return;
  isBackgroundPreloadStarted = true;

  const queue = [...urls];
  const BATCH_SIZE = 2;

  const processBatch = () => {
    if (queue.length === 0) return;
    const batch = queue.splice(0, BATCH_SIZE);
    Promise.all(batch.map((url) => preloadImage(url))).finally(() => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => processBatch(), { timeout: 1000 });
      } else {
        setTimeout(processBatch, 200);
      }
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => processBatch(), { timeout: 1500 });
  } else {
    setTimeout(processBatch, 500);
  }
}
