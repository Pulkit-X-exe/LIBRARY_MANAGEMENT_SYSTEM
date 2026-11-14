/**
 * Helper to resolve image paths (e.g. /uploads/profiles/...) 
 * ensuring it points to the remote backend when frontend is hosted separately (e.g. on Vercel)
 */
export function getImageUrl(path, fallback = '') {
  if (!path) return fallback;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const rawApiUrl = import.meta.env.VITE_API_URL || '';
  const cleanApiUrl = rawApiUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return cleanApiUrl ? `${cleanApiUrl}${cleanPath}` : cleanPath;
}

