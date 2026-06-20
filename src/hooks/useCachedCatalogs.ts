import { useState, useEffect } from 'react';

/**
 * SURPRISE-09: Offline-First Cache Progress Indicator
 * Detects which catalogs are cached for offline access
 */
export function useCachedCatalogs(catalogIds: string[]): Set<string> {
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!('caches' in window)) {
      return;
    }

    const checkCached = async () => {
      try {
        const cache = await caches.open('assets-cache');
        const keys = await cache.keys();
        const keySet = new Set(keys.map(k => k.url));
        
        // Check which catalogs are in the cache
        const cached = new Set<string>();
        for (const id of catalogIds) {
          // Check if any cache URL contains this catalog ID
          for (const url of keySet) {
            if (url.includes(id)) {
              cached.add(id);
              break;
            }
          }
        }
        
        setCachedIds(cached);
      } catch (err) {
        console.debug('Cache check error:', err);
      }
    };

    checkCached();
  }, [catalogIds]);

  return cachedIds;
}
