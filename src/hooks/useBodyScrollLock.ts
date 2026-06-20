// Fix 4.10: Reentrant-safe body scroll lock using Set (WeakSet has no .size property)
import { useEffect, useRef } from 'react';

// Use a regular Set which HAS a .size property (WeakSet doesn't)
const activeLocks = new Set<object>();
let savedScrollY = 0;

export function useBodyScrollLock(isActive: boolean) {
  const lockRef = useRef<object>({});

  useEffect(() => {
    const lock = lockRef.current;
    if (!isActive) return;

    const isFirst = activeLocks.size === 0;
    activeLocks.add(lock);

    if (isFirst) {
      savedScrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.width = '100%';
    }

    return () => {
      activeLocks.delete(lock);
      if (activeLocks.size === 0) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [isActive]);
}
