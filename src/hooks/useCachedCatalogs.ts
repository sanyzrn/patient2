import { useState, useEffect } from 'react';

/**
 * SURPRISE-09: Offline-First Cache Progress Indicator
 * Reports whether a single catalog is cached for offline access.
 *
 * Takes a primitive `catalogId` (stable across renders) so the effect does not
 * re-run — and re-open Cache Storage — on every render.
 */
export function useCachedCatalogs(catalogId: string): boolean {
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (!('caches' in window)) return;
    let cancelled = false;
    (async () => {
      try {
        const cache = await caches.open('assets-cache');
        const keys = await cache.keys();
        const found = keys.some(k => k.url.includes(catalogId));
        if (!cancelled) setIsCached(found);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [catalogId]);

  return isCached;
}
