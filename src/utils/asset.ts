/**
 * Resolves public asset paths against Vite's base URL.
 * In production on GitHub Pages (repo: 'site'), it prefixes with '/site/'.
 * In local dev, it keeps root '/'.
 */
export const getAssetUrl = (path: string | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const clean = path.replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? `${base}${clean}` : `${base}/${clean}`;
};
