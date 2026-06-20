/**
 * ARCH-02: Centralized storage key definitions
 * Use these keys instead of magic strings throughout the codebase
 */

export const STORAGE_KEYS = {
  CATALOGS: 'nafas_catalogs',
  VIDEOS: 'nafas_videos',
  BANNERS: 'nafas_banners',
  RECENT: 'nafas_recent',
  FAVORITES: 'nafas_favorites',
  THEME: 'nafas_theme',
  ANALYTICS: 'nafas_analytics',
  READING_STREAK: 'nafas_streak',
  PROGRESS: (id: string) => `nafas_progress_${id}`,
  KB_HINT: 'nafas_kb_hint_shown',
  WELCOMED: 'nafas_welcomed',
} as const;
