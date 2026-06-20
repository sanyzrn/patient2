import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCatalogs } from '../context/CatalogContext';
import SafeImage from './SafeImage';

// Animated mesh SVG background for text banners
const MeshBackground: React.FC = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <pattern id="heroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#heroGrid)" className="text-skin-primary" />
  </svg>
);

const HeroSlider: React.FC = () => {
  const { banners, catalogs } = useCatalogs();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const SLIDE_DURATION = 5000;

  const goTo = (i: number) => {
    const len = banners?.length || 0;
    if (len === 0) return;
    setCurrentIndex(((i % len) + len) % len);
    setSlideProgress(0);
  };

  useEffect(() => {
    if (!banners || banners.length <= 1 || isPaused) return;

    setSlideProgress(0);
    progressInterval.current = setInterval(() => {
      setSlideProgress(p => {
        if (p >= 100) {
          setCurrentIndex(prev => (prev + 1) % (banners?.length || 1));
          return 0;
        }
        return p + (100 / (SLIDE_DURATION / 50));
      });
    }, 50);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [banners, isPaused]); // Fix 9: Remove currentIndex to prevent memory leak

  useEffect(() => {
    if (banners && currentIndex >= banners.length) setCurrentIndex(0);
  }, [banners, currentIndex]);

  if (!banners || banners.length === 0) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 40) goTo(currentIndex + (dx < 0 ? 1 : -1));
    touchStartX.current = null;
  };

  const currentBanner = banners[currentIndex];
  const isTextBanner = currentBanner?.type === 'text';

  return (
    <div
      className="relative mb-10 overflow-hidden rounded-[2rem] border border-skin-border/50 shadow-sm min-h-[340px] md:min-h-[380px] flex items-center"
      style={{ background: isTextBanner ? undefined : 'transparent' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="بنرهای معرفی"
    >
      {/* Gradient bg only for text banners */}
      {isTextBanner && (
        <div className="absolute inset-0 bg-gradient-to-l from-skin-primary/15 via-transparent to-transparent" />
      )}

      {/* Fix 1.7: decorative blobs only on text banners */}
      {isTextBanner && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-skin-primary opacity-10 blur-[120px] rounded-full pointer-events-none z-0" />
          <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-skin-primary opacity-10 blur-[80px] rounded-full pointer-events-none z-0" />
          <MeshBackground />
        </>
      )}

      <AnimatePresence mode="sync">
        {banners.map((banner, index) => {
          if (index !== currentIndex) return null;
          return (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="absolute inset-0 w-full h-full flex items-center px-8 md:px-14"
            >
              {banner.type === 'text' ? (
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 w-full">
                  <div className="text-center md:text-right flex-1">
                    <h2
                      className="text-3xl md:text-5xl font-black text-skin-text mb-4 leading-tight tracking-tight"
                      style={{ textShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
                    >
                      {banner.title}
                    </h2>
                    <p className="text-skin-muted text-base md:text-lg max-w-2xl mx-auto md:mx-0 leading-relaxed">
                      {banner.description}
                    </p>
                    {banner.link && (
                      <a
                        href={banner.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-6 bg-skin-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-skin-primary-hover transition-colors shadow-md"
                      >
                        مشاهده بیشتر
                      </a>
                    )}
                    {/* Catalog count badge */}
                    {catalogs.length > 0 && (
                      <div className="mt-4 inline-flex items-center gap-2 bg-skin-primary/10 text-skin-primary text-sm font-bold px-4 py-1.5 rounded-full border border-skin-primary/20">
                        <BookOpen size={14} />
                        {catalogs.length} کاتالوگ آموزشی
                      </div>
                    )}
                  </div>
                  <div className="hidden md:flex items-center justify-center bg-skin-card/40 backdrop-blur-md rounded-3xl p-8 border border-skin-border/50 shadow-inner">
                    {banner.imageUrl ? (
                      <SafeImage src={banner.imageUrl} alt={banner.title ?? ''} className="w-32 h-32 object-contain" />
                    ) : (
                      <BookOpen size={80} strokeWidth={1} className="text-skin-primary opacity-80" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 w-full h-full">
                  {banner.link ? (
                    <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      <picture>
                        {banner.mobileImageUrl && (
                          <source media="(max-width: 768px)" srcSet={banner.mobileImageUrl} />
                        )}
                        <SafeImage
                          src={banner.imageUrl ?? ''}
                          alt={banner.title ?? 'تصویر بنر'}
                          className="w-full h-full object-cover"
                        />
                      </picture>
                    </a>
                  ) : (
                    <picture>
                      {banner.mobileImageUrl && (
                        <source media="(max-width: 768px)" srcSet={banner.mobileImageUrl} />
                      )}
                      <SafeImage
                        src={banner.imageUrl ?? ''}
                        alt={banner.title ?? 'تصویر بنر'}
                        className="w-full h-full object-cover"
                      />
                    </picture>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Navigation arrows (desktop) — always visible, subtle on desktop */}
      {/* BUG-V4-03: HeroSlider Navigation Arrows Permanently Invisible - FIXED */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => goTo(currentIndex - 1)}
            aria-label="بنر قبلی"
            className="hidden md:flex absolute right-4 z-20 p-2 bg-skin-card/70 hover:bg-skin-card text-skin-text rounded-full shadow-lg transition-all opacity-70 hover:opacity-100 border border-skin-border backdrop-blur-sm items-center justify-center"
            style={{ top: '50%', transform: 'translateY(-50%)' }}
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => goTo(currentIndex + 1)}
            aria-label="بنر بعدی"
            className="hidden md:flex absolute left-4 z-20 p-2 bg-skin-card/70 hover:bg-skin-card text-skin-text rounded-full shadow-lg transition-all opacity-70 hover:opacity-100 border border-skin-border backdrop-blur-sm items-center justify-center"
            style={{ top: '50%', transform: 'translateY(-50%)' }}
          >
            <ChevronLeft size={20} />
          </button>
        </>
      )}

      {/* Redesign 2.2: Progress bar indicators instead of dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-4 right-4 flex gap-2 z-20">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`نمایش بنر ${i + 1}`}
              aria-current={i === currentIndex}
              className="flex-1 h-1 rounded-full overflow-hidden bg-white/30 hover:bg-white/50 transition-colors"
            >
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i === currentIndex ? `${slideProgress}%` : i < currentIndex ? '100%' : '0%'
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroSlider;
