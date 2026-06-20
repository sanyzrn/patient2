/**
 * Reading Streak Hook for NAFAS
 * SURPRISE-03: Reading Streak Gamification
 * 
 * Tracks consecutive days users open any catalog and shows a fire streak counter.
 */

import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string; // ISO date string
  totalDaysRead: number;
}

/**
 * Hook to track and manage reading streaks
 */
export function useReadingStreak() {
  const [streak, setStreak] = useState<StreakData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.READING_STREAK);
      return stored ? JSON.parse(stored) : getDefaultStreak();
    } catch {
      return getDefaultStreak();
    }
  });

  const recordRead = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]!;
    
    setStreak(prev => {
      // Already recorded today
      if (prev.lastReadDate === today) return prev;

      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]!;
      const isConsecutive = prev.lastReadDate === yesterday;
      
      const newStreak: StreakData = {
        currentStreak: isConsecutive ? prev.currentStreak + 1 : 1,
        longestStreak: Math.max(prev.longestStreak, isConsecutive ? prev.currentStreak + 1 : 1),
        lastReadDate: today,
        totalDaysRead: prev.totalDaysRead + 1,
      };

      try {
        localStorage.setItem(STORAGE_KEYS.READING_STREAK, JSON.stringify(newStreak));
      } catch {
        // Silently fail
      }

      return newStreak;
    });
  }, []);

  return { streak, recordRead };
}

/**
 * Gets default/empty streak data
 */
function getDefaultStreak(): StreakData {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: '',
    totalDaysRead: 0,
  };
}

/**
 * Check if we should show a milestone toast
 * Returns the milestone message if achieved, null otherwise
 */
export function checkStreakMilestone(streak: StreakData): string | null {
  const milestones = [3, 7, 14, 30, 60, 100];
  
  if (milestones.includes(streak.currentStreak)) {
    if (streak.currentStreak === 3) return '🔥 ۳ روز متوالی! دارید عادت می‌کنید!';
    if (streak.currentStreak === 7) return '🔥 ۷ روز متوالی! هفته داشتی!';
    if (streak.currentStreak === 14) return '🔥۱۴ روز متوالی! نمونه ایده‌ال هستید!';
    if (streak.currentStreak === 30) return '🔥 ۱ ماه! شما یک پرستار درآمدی هستید!';
    if (streak.currentStreak === 60) return '🔥 ۶۰ روز! نیروی ابرقهرمان!';
    if (streak.currentStreak === 100) return '🔥 ۱۰۰ روز! افسانه‌ای!';
  }
  
  return null;
}
