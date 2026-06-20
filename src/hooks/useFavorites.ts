import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';

/**
 * REMAINING-04: Hook for managing favorite catalogs
 * Stores favorites in localStorage with persistence across sessions
 * BUG-V4-02: Now uses STORAGE_KEYS instead of magic strings
 */
export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (saved) {
        setFavorites(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(Array.from(favorites)));
    }
  }, [favorites, isLoading]);

  const isFavorite = useCallback((catalogId: string): boolean => {
    return favorites.has(catalogId);
  }, [favorites]);

  const addFavorite = useCallback((catalogId: string) => {
    setFavorites(prev => new Set([...prev, catalogId]));
  }, []);

  const removeFavorite = useCallback((catalogId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      newSet.delete(catalogId);
      return newSet;
    });
  }, []);

  const toggleFavorite = useCallback((catalogId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(catalogId)) {
        newSet.delete(catalogId);
      } else {
        newSet.add(catalogId);
      }
      return newSet;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFavorites(new Set());
  }, []);

  return {
    favorites: Array.from(favorites),
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    clearAll,
    isLoading,
  };
};
