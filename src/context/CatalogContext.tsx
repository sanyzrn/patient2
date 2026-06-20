import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Catalog, Video, Banner } from '../types';
import { CATALOGS as INITIAL_CATALOGS, VIDEOS as INITIAL_VIDEOS, BANNERS as INITIAL_BANNERS } from '../initialData';
import { API_URL } from '../config';
import { STORAGE_KEYS } from '../constants/storageKeys';

// Fix 4.5: Validate catalog fields before accepting
function isValidCatalog(c: unknown): c is Catalog {
  if (!c || typeof c !== 'object') return false;
  const cat = c as Record<string, unknown>;
  if (typeof cat['id'] !== 'string' || !cat['id']) {
    console.warn('[CatalogContext] Skipping catalog: missing id', c);
    return false;
  }
  if (typeof cat['title'] !== 'string' || !cat['title']) {
    console.warn('[CatalogContext] Skipping catalog: missing title', c);
    return false;
  }
  if (!Array.isArray(cat['pages'])) {
    console.warn('[CatalogContext] Skipping catalog: pages is not array', c);
    return false;
  }
  if (typeof cat['coverImage'] !== 'string' || !cat['coverImage']) {
    console.warn('[CatalogContext] Skipping catalog: missing coverImage', c);
    return false;
  }
  return true;
}

interface CatalogContextType {
  catalogs: Catalog[];
  videos: Video[];
  banners: Banner[];
  isSavingToServer: boolean;
  isLoading: boolean;
  error: string | null;
  addCatalog: (catalog: Catalog) => void;
  updateCatalog: (id: string, updatedCatalog: Catalog) => void;
  deleteCatalog: (id: string) => void;
  addVideo: (video: Video) => void;
  updateVideo: (id: string, updatedVideo: Video) => void;
  deleteVideo: (id: string) => void;
  addBanner: (banner: Banner) => void;
  updateBanner: (id: string, updatedBanner: Banner) => void;
  deleteBanner: (id: string) => void;
  resetToDefault: (onConfirmNeeded: () => Promise<boolean>) => void;
  importData: (catalogs: Catalog[], videos: Video[], banners?: Banner[]) => void;
  saveToServer: () => Promise<{ success: boolean; message: string }>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSavingToServer, setIsSavingToServer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fix 5: Removed unused AbortController - using AbortSignal.timeout is sufficient
    // No need for controller.abort() in cleanup since the timeout handles aborting

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Priority 1: API call with timeout
        try {
          const res = await fetch(API_URL, { signal: AbortSignal.timeout(4000) });
          if (res.ok) {
            const json = await res.json();
            const validCatalogs = Array.isArray(json.catalogs) ? (json.catalogs as unknown[]).filter(isValidCatalog) : [];
            const validVideos = Array.isArray(json.videos) ? json.videos : [];
            const validBanners = Array.isArray(json.banners) ? json.banners : [];
            
            // Only use API data if it has valid catalogs
            if (validCatalogs.length > 0) {
              setCatalogs(validCatalogs);
              setVideos(validVideos.length > 0 ? validVideos : INITIAL_VIDEOS);
              setBanners(validBanners.length > 0 ? validBanners : INITIAL_BANNERS);
              setIsLoaded(true);
              setIsLoading(false);
              return;
            }
          }
        } catch (apiErr) {
          console.debug('API load failed, trying next source:', apiErr);
        }

        // Priority 2: External file (window.NAFAS_DATA from data.ts)
        if (window.NAFAS_DATA) {
          const validCatalogs = (window.NAFAS_DATA.catalogs || []).filter(isValidCatalog);
          const validVideos = Array.isArray(window.NAFAS_DATA.videos) ? window.NAFAS_DATA.videos : [];
          const validBanners = Array.isArray(window.NAFAS_DATA.banners) ? window.NAFAS_DATA.banners : [];
          
          // Only use window.NAFAS_DATA if it has valid catalogs
          if (validCatalogs.length > 0) {
            setCatalogs(validCatalogs);
            setVideos(validVideos.length > 0 ? validVideos : INITIAL_VIDEOS);
            setBanners(validBanners.length > 0 ? validBanners : INITIAL_BANNERS);
            setIsLoaded(true);
            setIsLoading(false);
            return;
          }
        }

        // Priority 3: LocalStorage
        const savedCatalogs = localStorage.getItem(STORAGE_KEYS.CATALOGS);
        const savedVideos = localStorage.getItem(STORAGE_KEYS.VIDEOS);
        const savedBanners = localStorage.getItem(STORAGE_KEYS.BANNERS);
        try {
          const parsed = savedCatalogs ? JSON.parse(savedCatalogs) : null;
          const validCatalogs = Array.isArray(parsed) ? parsed.filter(isValidCatalog) : [];
          setCatalogs(validCatalogs.length > 0 ? validCatalogs : INITIAL_CATALOGS);
        } catch { setCatalogs(INITIAL_CATALOGS); }
        try { 
          const parsed = savedVideos ? JSON.parse(savedVideos) : null;
          setVideos(Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_VIDEOS);
        } catch { setVideos(INITIAL_VIDEOS); }
        try {
          const parsed = savedBanners ? JSON.parse(savedBanners) : null;
          setBanners(Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BANNERS);
        } catch { setBanners(INITIAL_BANNERS); }
        setIsLoaded(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        // Fallback: Always ensure we have data
        setCatalogs(INITIAL_CATALOGS);
        setVideos(INITIAL_VIDEOS);
        setBanners(INITIAL_BANNERS);
        setIsLoaded(true);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Keep localStorage in sync for offline fallback
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CATALOGS, JSON.stringify(catalogs));
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
      localStorage.setItem(STORAGE_KEYS.BANNERS, JSON.stringify(banners));
    } catch (err) {
      // Quota exceeded or storage unavailable (private mode) — offline cache is best-effort.
      console.warn('[CatalogContext] Unable to cache data in localStorage:', err);
    }
  }, [catalogs, videos, banners, isLoaded]);

  const saveToServer = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    // Fix 4.2: Remove VITE_ADMIN_PASSWORD - use session token instead
    const token = sessionStorage.getItem('admin_token');
    if (!token) return { success: false, message: 'توکن احراز‌هویت موجود نیست. لطفاً دوباره وارد شوید.' };
    
    setIsSavingToServer(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ action: 'save_data', catalogs, videos, banners }),
        signal: AbortSignal.timeout(10000),
      });
      const json = await res.json();
      if (res.ok && json.success) return { success: true, message: 'داده‌ها روی سرور ذخیره شدند.' };
      return { success: false, message: json.error || 'خطای سرور' };
    } catch (err) {
      console.error('Save error:', err);
      return { success: false, message: 'ارتباط با سرور برقرار نشد.' };
    } finally {
      setIsSavingToServer(false);
    }
  }, [catalogs, videos, banners]);

  const addCatalog = useCallback((catalog: Catalog) => setCatalogs(prev => [catalog, ...prev]), []);
  const updateCatalog = useCallback((id: string, updated: Catalog) => setCatalogs(prev => prev.map(c => c.id === id ? updated : c)), []);
  const deleteCatalog = useCallback((id: string) => setCatalogs(prev => prev.filter(c => c.id !== id)), []);
  const addVideo = useCallback((video: Video) => setVideos(prev => [video, ...prev]), []);
  const updateVideo = useCallback((id: string, updated: Video) => setVideos(prev => prev.map(v => v.id === id ? updated : v)), []);
  const deleteVideo = useCallback((id: string) => setVideos(prev => prev.filter(v => v.id !== id)), []);
  const addBanner = useCallback((banner: Banner) => setBanners(prev => [...prev, banner]), []);
  const updateBanner = useCallback((id: string, updated: Banner) => setBanners(prev => prev.map(b => b.id === id ? updated : b)), []);
  const deleteBanner = useCallback((id: string) => setBanners(prev => prev.filter(b => b.id !== id)), []);

  // BUG-V4-06: Make resetToDefault use useCallback for proper memoization
  const resetToDefault = useCallback((onConfirmNeeded: () => Promise<boolean>) => {
    onConfirmNeeded().then(confirmed => {
      if (confirmed) {
        setCatalogs(INITIAL_CATALOGS);
        setVideos(INITIAL_VIDEOS);
        setBanners(INITIAL_BANNERS);
        localStorage.removeItem(STORAGE_KEYS.CATALOGS);
        localStorage.removeItem(STORAGE_KEYS.VIDEOS);
        localStorage.removeItem(STORAGE_KEYS.BANNERS);
      }
    }).catch(err => {
      console.error('Reset error:', err);
    });
  }, []);

  const importData = (newCatalogs: Catalog[], newVideos: Video[], newBanners?: Banner[]) => {
    setCatalogs(newCatalogs);
    setVideos(newVideos);
    if (newBanners) setBanners(newBanners);
  };

  return (
    <CatalogContext.Provider value={{
      catalogs, videos, banners, isSavingToServer, isLoading, error,
      addCatalog, updateCatalog, deleteCatalog,
      addVideo, updateVideo, deleteVideo,
      addBanner, updateBanner, deleteBanner,
      resetToDefault, importData, saveToServer,
    }}>
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalogs = () => {
  const context = useContext(CatalogContext);
  if (context === undefined) throw new Error('useCatalogs must be used within a CatalogProvider');
  return context;
};
