/**
 * Centralized analytics event tracking for NAFAS
 * ARCH-01: Centralize ALL Analytics Event Tracking
 * 
 * This utility ensures all tracking calls are consistent and use the correct storage keys.
 */

import { STORAGE_KEYS } from '../constants/storageKeys';

export interface AnalyticsData {
  viewsByCatalog: Record<string, number>;
  daily: Record<string, number>;
}

/**
 * Records a catalog view event
 * Updates both per-catalog view counts and daily activity
 */
export function trackCatalogView(catalogId: string, _catalogTitle: string): void {
  try {
    const key = STORAGE_KEYS.ANALYTICS;
    const existing = localStorage.getItem(key);
    const data: AnalyticsData = existing ? JSON.parse(existing) : { viewsByCatalog: {}, daily: {} };
    
    const today = new Date().toISOString().split('T')[0]!;
    
    // Update per-catalog count
    data.viewsByCatalog[catalogId] = (data.viewsByCatalog[catalogId] ?? 0) + 1;
    
    // Update daily activity
    data.daily = data.daily ?? {};
    data.daily[today] = (data.daily[today] ?? 0) + 1;
    
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Silently fail - don't break user experience
  }
}

/**
 * Gets current analytics data
 */
export function getAnalytics(): AnalyticsData {
  try {
    const key = STORAGE_KEYS.ANALYTICS;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : { viewsByCatalog: {}, daily: {} };
  } catch {
    return { viewsByCatalog: {}, daily: {} };
  }
}

/**
 * Gets daily activity heatmap data for the last 91 days (13 weeks)
 * Used for SURPRISE-07: Reading Activity Heatmap
 */
export function getActivityHeatmapData(): Record<string, number> {
  const analytics = getAnalytics();
  return analytics.daily ?? {};
}

/**
 * Gets top viewed catalogs
 */
export function getTopCatalogs(limit = 10): Array<[string, number]> {
  const analytics = getAnalytics();
  return Object.entries(analytics.viewsByCatalog ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}
