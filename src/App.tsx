import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import Fuse from 'fuse.js';
import {
  BookOpen, Video, Search, Sun, Moon, Book, SlidersHorizontal,
  LayoutGrid, List, ArrowUp, X, ChevronUp, Flag, Globe,
  BookMarked, Play, Languages, Clock, AlertTriangle, Heart, MessageCircle,
  Phone, MapPin, Factory, Briefcase, Bot, Hash
} from 'lucide-react';

const LinkedinIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
    <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.05c.53-1 1.83-2.2 3.77-2.2 4.03 0 4.78 2.65 4.78 6.1V24h-4v-7.1c0-1.7-.03-3.9-2.38-3.9-2.38 0-2.75 1.86-2.75 3.78V24h-4V8z" />
  </svg>
);

import { CatalogProvider, useCatalogs } from './context/CatalogContext';
import ErrorBoundary from './components/ErrorBoundary';
import HeroSlider from './components/HeroSlider';
import CatalogCard from './components/CatalogCard';
import VideoCard from './components/VideoCard';
import VideoPlayer from './components/VideoPlayer';
import SkeletonCard from './components/SkeletonCard';
import ProductsSection from './components/ProductsSection';
import CompanyInfo from './components/CompanyInfo';
import ChatBot from './components/ChatBot';
import PhoneDirectory from './components/PhoneDirectory';
import CommandPalette, { PaletteCommand } from './components/CommandPalette';
import { Catalog, Video as VideoType } from './types';
import { dateToNumber, highlightText } from './utils/helpers';
import { useCountUp } from './hooks/useCountUp';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useFavorites } from './hooks/useFavorites';
import { useReadingStreak, checkStreakMilestone } from './hooks/useReadingStreak';
import { LOGO_URL, LOGO_URL_DARK, DBS_LOGO_URL, DBS_URL, APP_VERSION } from './constants/brand';

// ARCH-03: Lazy load heavy components
const BookViewer = React.lazy(() => import('./components/BookViewer'));
const AdminLogin = React.lazy(() => import('./components/AdminLogin'));
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));

// Loading fallback component for lazy-loaded components
const LoadingSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm">
    <div className="w-8 h-8 border-4 border-skin-border border-t-skin-primary rounded-full animate-spin" />
  </div>
);

// ─── Theme System ─────────────────────────────────────────────────────────────
type Theme = 'light' | 'dark' | 'reading';

// Theme: defaults to light; the user's choice is persisted in the browser.
function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('nafas_theme') as Theme | null;
    return saved ?? 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nafas_theme', theme);
  }, [theme]);

  return { theme, setTheme };
}

// ─── Scroll Progress Bar ──────────────────────────────────────────────────────
// Fix 4: Scroll progress is now passed as prop from InnerApp to avoid duplicate listeners
const ScrollProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-[100] bg-transparent">
      <div
        className="h-full bg-skin-primary transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  count?: number;
}> = ({ icon, title, count }) => {
  const animatedCount = useCountUp(count ?? 0, 600);
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-skin-primary">{icon}</span>
          <h2 className="text-xl font-black text-skin-text tracking-tight">{title}</h2>
        </div>
        {count !== undefined && count > 0 && (
          <span className="text-xs font-bold bg-skin-primary/10 text-skin-primary px-2.5 py-1 rounded-full border border-skin-primary/20 tabular-nums">
            {animatedCount}
          </span>
        )}
      </div>
      {/* Full-width gradient rule */}
      <div className="h-px w-full" style={{
        background: 'linear-gradient(to left, transparent, var(--color-border) 30%, var(--color-border) 70%, transparent)'
      }} />
    </div>
  );
};

// ─── Stats Bar ────────────────────────────────────────────────────────────────
const StatsBar: React.FC<{ catalogCount: number; videoCount: number }> = ({ catalogCount, videoCount }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const catCount = useCountUp(visible ? catalogCount : 0, 800);
  const vidCount = useCountUp(visible ? videoCount : 0, 800);

  return (
    <div ref={ref} className="bg-skin-card border-y border-skin-border mb-8">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-3 flex items-center justify-center gap-6 md:gap-10 flex-wrap">
        <div className="flex items-center gap-2 text-skin-muted text-sm">
          <BookOpen size={15} className="text-skin-primary" />
          <span className="font-bold text-skin-text tabular-nums">{catCount}</span>
          <span>کاتالوگ آموزشی</span>
        </div>
        <div className="w-px h-4 bg-skin-border hidden sm:block" />
        <div className="flex items-center gap-2 text-skin-muted text-sm">
          <Play size={15} className="text-skin-primary" />
          <span className="font-bold text-skin-text tabular-nums">{vidCount}</span>
          <span>ویدئوی آموزشی</span>
        </div>
        <div className="w-px h-4 bg-skin-border hidden sm:block" />
        <div className="flex items-center gap-2 text-skin-muted text-sm">
          <Languages size={15} className="text-skin-primary" />
          <span className="font-bold text-skin-text">FA / EN</span>
        </div>
      </div>
    </div>
  );
};

// ─── Recently Viewed Row (Fix 3.1) ───────────────────────────────────────────
const RecentlyViewed: React.FC<{
  catalogs: Catalog[];
  onOpen: (catalog: Catalog) => void;
  onClear: () => void;
}> = ({ catalogs, onOpen, onClear }) => {
  if (catalogs.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-bold text-skin-text">
          <Clock size={14} className="text-skin-primary" />
          آخرین مشاهده‌ها
        </div>
        <button onClick={onClear} className="text-xs text-skin-muted hover:text-skin-primary transition-colors flex items-center gap-1">
          <X size={12} />
          پاک کردن
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {catalogs.map(cat => (
          <button
            key={cat.id}
            onClick={() => onOpen(cat)}
            className="shrink-0 flex flex-col gap-1.5 w-28 text-right group"
          >
            <div className="w-28 h-20 rounded-xl overflow-hidden bg-skin-control-bg border border-skin-border group-hover:border-skin-primary/40 transition-colors shadow-sm">
              <img src={cat.coverImage} alt={cat.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='80' viewBox='0 0 112 80'%3E%3Crect width='112' height='80' fill='%23f1f5f9'/%3E%3C/svg%3E`; }} />
            </div>
            <p className="text-[11px] text-skin-text font-medium truncate w-full">{cat.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Favorites Row (BUG-V4-01: Wire favorites to UI) ──────────────────────────
const FavoritesRow: React.FC<{
  catalogs: Catalog[];
  onOpen: (catalog: Catalog) => void;
  onToggleFavorite: (id: string) => void;
}> = ({ catalogs, onOpen, onToggleFavorite }) => {
  if (catalogs.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3 text-sm font-bold text-skin-text">
        <Heart size={14} className="text-red-500 fill-red-500" />
        علاقه‌مندی‌ها
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {catalogs.map(cat => (
          <button key={cat.id} onClick={() => onOpen(cat)}
            className="shrink-0 flex flex-col gap-1.5 w-28 text-right group">
            <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-skin-control-bg border border-skin-border group-hover:border-red-400/40 transition-colors shadow-sm">
              <img src={cat.coverImage} alt={cat.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='80' viewBox='0 0 112 80'%3E%3Crect width='112' height='80' fill='%23f1f5f9'/%3E%3C/svg%3E`; }} />
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(cat.id); }}
                className="absolute top-1 left-1 p-1 rounded-full bg-white/80 text-red-500 hover:bg-white transition-colors"
                title="حذف از علاقه‌مندی‌ها"
              >
                <Heart size={10} className="fill-red-500" />
              </button>
            </div>
            <p className="text-[11px] text-skin-text font-medium truncate w-full">{cat.title}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Empty State (Fix 2.6) ────────────────────────────────────────────────────
const EmptyState: React.FC<{
  searchTerm: string;
  hasCategory: boolean;
  onClearSearch: () => void;
  onClearCategory: () => void;
}> = ({ searchTerm, hasCategory, onClearSearch, onClearCategory }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center px-4">
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-4 opacity-50">
      <circle cx="35" cy="35" r="22" stroke="currentColor" strokeWidth="2.5" className="text-skin-border" />
      <path d="M53 53L67 67" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-skin-border" />
      <path d="M27 35h16M35 27v16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-skin-primary/40" />
    </svg>
    {searchTerm ? (
      <>
        <p className="text-skin-text font-bold text-base mb-1">نتیجه‌ای برای «{searchTerm}» یافت نشد</p>
        <p className="text-skin-muted text-sm mb-4">عبارت جستجو را تغییر دهید یا جستجو را پاک کنید.</p>
        <button onClick={onClearSearch} className="px-4 py-2 bg-skin-primary text-white rounded-xl text-sm font-bold hover:bg-skin-primary-hover transition-colors">
          پاک کردن جستجو
        </button>
      </>
    ) : hasCategory ? (
      <>
        <p className="text-skin-text font-bold text-base mb-1">کاتالوگی در این دسته‌بندی یافت نشد</p>
        <button onClick={onClearCategory} className="mt-3 px-4 py-2 bg-skin-primary text-white rounded-xl text-sm font-bold hover:bg-skin-primary-hover transition-colors">
          مشاهده همه دسته‌ها
        </button>
      </>
    ) : (
      <p className="text-skin-text font-bold text-base">هیچ کاتالوگی یافت نشد</p>
    )}
  </div>
);

// ─── Scroll To Top Button (Fix 2.10) ─────────────────────────────────────────
const ScrollToTop: React.FC<{ scrollProgress: number }> = ({ scrollProgress }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <motion.button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="relative w-12 h-12 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary rounded-full"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label="بازگشت به بالای صفحه"
    >
      <svg width="48" height="48" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="2.5" />
        <circle
          cx="24" cy="24" r={radius}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.2s' }}
        />
      </svg>
      <div className="relative z-10 w-8 h-8 bg-skin-card border border-skin-border rounded-full flex items-center justify-center shadow-sm">
        <ArrowUp size={14} className="text-skin-primary" />
      </div>
    </motion.button>
  );
};

// ─── Footer (Fix 2.9) ─────────────────────────────────────────────────────────
const Footer: React.FC<{ theme: Theme; setTheme: (t: Theme) => void }> = ({ theme, setTheme }) => {
  const [extOpen, setExtOpen] = useState(false);
  return (
    <footer className="bg-skin-card border-t border-skin-border mt-16">
      {/* Gradient top line */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(to right, transparent, var(--color-primary) 30%, var(--color-primary) 70%, transparent)' }} />
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Logo + company */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-3">
              <img src={theme === 'dark' ? LOGO_URL_DARK : LOGO_URL} alt="نفس زیست فارمد" className="h-10 w-auto object-contain" />
              <div>
                <p className="text-xs text-skin-muted text-center md:text-right">پورتال آموزش بیمار</p>
                <p className="text-xs font-bold text-skin-primary mt-0.5 text-center md:text-right">مراقب شما در هر نفس</p>
              </div>
            </div>
            <p className="text-xs text-skin-muted leading-relaxed mt-2 text-center md:text-justify max-w-sm">
              شرکت دانش‌بنیان نفس زیست فارمد از سال ۱۳۹۸ با هدف توسعه داروهای استنشاقی پیشرفته و ارتقای سلامت جامعه آغاز به کار کرده است.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <p className="text-sm font-bold text-skin-text">دسترسی سریع</p>
            <div className="flex flex-col items-center md:items-start gap-3 text-xs text-skin-muted">
              {[
                { label: 'کاتالوگ‌ها', href: '#catalogs' },
                { label: 'ویدئوها', href: '#videos' },
                { label: 'محصولات', href: '#products' },
                { label: 'درباره ما', href: '#about' },
                { label: 'ارتباط با ما', href: 'mailto:info@nafaspharmed.com' },
              ].map(({ label, href }) => (
                <a key={label} href={href} className="hover:text-skin-primary transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-skin-border"></span>
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <p className="text-sm font-bold text-skin-text">ارتباط با ما</p>
            <div className="flex flex-col items-center md:items-start text-xs text-skin-muted space-y-3 w-full">
              <a href="tel:02192001520" className="flex items-center gap-2 hover:text-skin-primary transition-colors">
                <Phone size={14} className="text-skin-primary shrink-0" /> <span dir="ltr">۰۲۱ ۹۲۰۰ ۱۵۲۰</span>
              </a>
              <button onClick={() => setExtOpen(true)} className="flex items-center gap-2 hover:text-skin-primary transition-colors">
                <Hash size={14} className="text-skin-primary shrink-0" /> تلفن داخلی واحدها
              </button>
              <details className="group w-full md:w-auto">
                <summary className="flex items-center justify-center md:justify-start gap-2 cursor-pointer hover:text-skin-primary transition-colors list-none [&::-webkit-details-marker]:hidden">
                  <MapPin size={14} className="text-skin-primary shrink-0" /> آدرس دفتر مرکزی
                  <ChevronUp size={12} className="rotate-180 group-open:rotate-0 transition-transform mr-1" />
                </summary>
                <p className="mt-2 text-center md:text-right leading-relaxed md:pr-6 mx-auto md:mx-0 max-w-[260px] md:max-w-none">تهران، بلوار پژوهش، پژوهشگاه ملی و مهندسی ژنتیک، ساختمان بیوتک سنتر، واحد ۱۰۱</p>
              </details>
              <details className="group w-full md:w-auto">
                <summary className="flex items-center justify-center md:justify-start gap-2 cursor-pointer hover:text-skin-primary transition-colors list-none [&::-webkit-details-marker]:hidden">
                  <Factory size={14} className="text-skin-primary shrink-0" /> آدرس کارخانه
                  <ChevronUp size={12} className="rotate-180 group-open:rotate-0 transition-transform mr-1" />
                </summary>
                <p className="mt-2 text-center md:text-right leading-relaxed md:pr-6 mx-auto md:mx-0 max-w-[260px] md:max-w-none">صفادشت، بلوار مطهری شمالی (پدم)، کوچهٔ دوم شرقی، پلاک ۴، مجموعهٔ پیشتاز</p>
              </details>
              
              <div className="flex items-center justify-center md:justify-start gap-2 pt-2 w-full md:w-auto">
                <a href="https://ble.ir/nafaspharmedproductbot" target="_blank" rel="noopener noreferrer" title="ربات هوشمند بله" className="w-9 h-9 rounded-xl bg-skin-control-bg hover:bg-skin-primary hover:text-white flex items-center justify-center transition-colors"><Bot size={16} /></a>
                <a href="https://www.linkedin.com/company/nafas-zist-pharmed/" target="_blank" rel="noopener noreferrer" title="لینکدین" className="w-9 h-9 rounded-xl bg-skin-control-bg hover:bg-skin-primary hover:text-white flex items-center justify-center transition-colors"><LinkedinIcon /></a>
                <a href="https://jobvision.ir/companies/48055/%D8%A7%D8%B3%D8%AA%D8%AE%D8%AF%D8%A7%D9%85-%D8%AF%D8%A7%D8%B1%D9%88%D8%B3%D8%A7%D8%B2%DB%8C-%D9%86%D9%81%D8%B3-%D8%B2%DB%8C%D8%B3%D8%AA-%D9%81%D8%A7%D8%B1%D9%85%D8%AF" target="_blank" rel="noopener noreferrer" title="فرصت‌های شغلی (جاب‌ویژن)" className="w-9 h-9 rounded-xl bg-skin-control-bg hover:bg-skin-primary hover:text-white flex items-center justify-center transition-colors"><Briefcase size={16} /></a>
                <a href="https://nafaspharmed.com" target="_blank" rel="noopener noreferrer" title="وب‌سایت" className="w-9 h-9 rounded-xl bg-skin-control-bg hover:bg-skin-primary hover:text-white flex items-center justify-center transition-colors"><Globe size={16} /></a>
              </div>
            </div>
          </div>
        </div>

        <PhoneDirectory open={extOpen} onClose={() => setExtOpen(false)} />

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-skin-border">
          <p className="text-xs text-skin-muted order-2 md:order-1">© {new Date().getFullYear()} نفس زیست فارمد. تمامی حقوق محفوظ است.</p>
          
          <a href={DBS_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] text-skin-muted md:opacity-75 hover:opacity-100 transition-opacity group order-1 md:order-2" dir="ltr">
            <span className="font-bold tracking-wide">DBS Graphic</span>
            <img src={DBS_LOGO_URL} alt="DBS Graphic" className="h-3.5 w-auto object-contain" />
            <span className="font-sans">طراحی شده توسط</span>
          </a>
        </div>

        {/* Version */}
        <div className="mt-4 text-center">
          <span className="text-[10px] font-mono text-skin-muted/60 tracking-wide">نسخه {APP_VERSION}</span>
        </div>
      </div>
    </footer>
  );
};

// ─── Main Inner App ───────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'default', label: 'پیش‌فرض' },
  { value: 'date_desc', label: 'جدیدترین' },
  { value: 'date_asc', label: 'قدیمی‌ترین' },
  { value: 'alpha', label: 'الفبایی' },
];

function useRecentCatalogs() {
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('nafas_recent') ?? '[]'); } catch { return []; }
  });

  const addRecent = useCallback((id: string) => {
    setRecent(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, 5);
      localStorage.setItem('nafas_recent', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    localStorage.removeItem('nafas_recent');
    setRecent([]);
  }, []);

  return { recent, addRecent, clearRecent };
}

const InnerApp: React.FC = () => {
  // BUG-V4-05: Section error fallback component
  const SectionError: React.FC<{ section: string }> = ({ section }) => (
    <div className="py-8 text-center text-skin-muted text-sm">
      <AlertTriangle size={20} className="mx-auto mb-2 text-amber-500" />
      <p>خطا در نمایش بخش «{section}»</p>
    </div>
  );

  const { catalogs, videos, isLoading, error } = useCatalogs();
  const { theme, setTheme } = useTheme();
  const isOnline = useOnlineStatus();
  const { favorites, toggleFavorite, isFavorite, clearAll: clearFavorites } = useFavorites();
  const { recordRead, streak } = useReadingStreak();
  const [chatOpen, setChatOpen] = useState(false);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('default');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [langFilter, setLangFilter] = useState<'fa' | 'en' | null>(null);
  const [videoSearch, setVideoSearch] = useState('');

  // Modal state
  const [openCatalog, setOpenCatalog] = useState<Catalog | null>(null);
  const [openCatalogPage, setOpenCatalogPage] = useState(0);
  const [openVideo, setOpenVideo] = useState<VideoType | null>(null);

  // Admin state
  const [viewMode, setViewMode] = useState<'main' | 'admin-login' | 'admin'>('main');

  // SURPRISE-01: Command Palette
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Header scroll behavior
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Fix 10: Mobile nav active section tracking
  const [activeSection, setActiveSection] = useState<'catalogs' | 'products' | 'videos' | null>('catalogs');
  const catalogsSectionRef = useRef<HTMLElement>(null);
  const productsSectionRef = useRef<HTMLElement>(null);
  const videosSectionRef = useRef<HTMLElement>(null);

  // URL deep link
  const [urlCatNotFound, setUrlCatNotFound] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Recently viewed
  const { recent, addRecent, clearRecent } = useRecentCatalogs();

  // -- Scroll tracking --
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const el = document.documentElement;
      const progress = el.scrollTop / (el.scrollHeight - el.clientHeight);
      setScrollProgress(isNaN(progress) ? 0 : progress * 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); };
  }, []);

  // Active-section tracking via a scroll-spy: the active section is the last
  // one whose top has scrolled above a line just below the sticky header.
  // This is robust even for short sections (where the old observer mis-fired).
  useEffect(() => {
    const sections: [typeof activeSection, React.RefObject<HTMLElement | null>][] = [
      ['catalogs', catalogsSectionRef],
      ['videos', videosSectionRef],
      ['products', productsSectionRef],
    ];
    const onScrollSpy = () => {
      const line = 130; // px from the top of the viewport (clears the header)
      let current: typeof activeSection = 'catalogs';
      for (const [id, ref] of sections) {
        const el = ref.current;
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      // Once the last section (products) has fully scrolled above the line —
      // i.e. we're down in the footer — clear the highlight entirely.
      const products = productsSectionRef.current;
      if (products && products.getBoundingClientRect().bottom <= line) current = null;
      setActiveSection(current);
    };
    onScrollSpy();
    window.addEventListener('scroll', onScrollSpy, { passive: true });
    window.addEventListener('resize', onScrollSpy);
    return () => {
      window.removeEventListener('scroll', onScrollSpy);
      window.removeEventListener('resize', onScrollSpy);
    };
  }, []);

  // Note: isLoading comes from real context loading state, no fake timeout needed

  // -- URL deep link handling --
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const catId = params.get('cat');
    const page = parseInt(params.get('page') ?? '1', 10) - 1;
    // REMAINING-08: Handle video deep linking
    const vidId = params.get('vid');
    
    if (catId && catalogs.length > 0) {
      const cat = catalogs.find(c => c.id === catId);
      if (cat) {
        setOpenCatalog(cat);
        setOpenCatalogPage(Math.max(0, page));
        addRecent(cat.id);
      } else {
        setUrlCatNotFound(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => searchRef.current?.focus(), 300);
      }
    }
    
    // REMAINING-08: Open video from URL parameter
    if (vidId && videos.length > 0) {
      const vid = videos.find(v => v.id === vidId);
      if (vid) {
        setOpenVideo(vid);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogs, videos]);

  // Fix 1.3: popstate handler
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      if (!params.get('cat')) {
        setOpenCatalog(null);
      }
      // REMAINING-08: Handle video URL cleanup on back
      if (!params.get('vid')) {
        setOpenVideo(null);
      }
      // Fix 1.11: admin history
      if (!window.location.hash.includes('admin')) {
        if (viewMode === 'admin' || viewMode === 'admin-login') setViewMode('main');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [viewMode]);

  // BUG-N03: PWA update notification listener
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const { update } = (e as CustomEvent).detail;
      toast(
        (t) => (
          <div className="flex items-center gap-3 text-sm">
            <span>نسخه جدیدی آماده است.</span>
            <button
              onClick={() => { update?.(); toast.dismiss(t.id); }}
              className="shrink-0 px-3 py-1 bg-skin-primary text-white rounded-lg text-xs font-bold hover:bg-skin-primary-hover transition-colors"
            >
              بروزرسانی
            </button>
          </div>
        ),
        { duration: Infinity, icon: '🔄' }
      );
    };
    window.addEventListener('nafas-sw-update', handleUpdate);
    return () => window.removeEventListener('nafas-sw-update', handleUpdate);
  }, []);

  // REMAINING-02: '/' key search shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && 
          !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) &&
          !(e.target as HTMLElement).isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Fix 1.11: Push/pop admin hash
  const enterAdmin = useCallback(() => {
    window.history.pushState({}, '', '#admin');
    setViewMode('admin-login');
  }, []);

  const exitAdmin = useCallback(() => {
    if (window.location.hash === '#admin') window.history.back();
    else window.history.replaceState({}, '', window.location.pathname + window.location.search);
    setViewMode('main');
  }, []);

  // Catalog open/close
  const handleOpenCatalog = useCallback((catalog: Catalog, page = 0) => {
    setOpenCatalog(catalog);
    setOpenCatalogPage(page);
    addRecent(catalog.id);
    recordRead(); // SURPRISE-03: Track reading streak
    const milestone = checkStreakMilestone(streak);
    if (milestone) toast.success(milestone);
    window.history.pushState({}, '', `${window.location.pathname}?cat=${catalog.id}&page=${page + 1}`);
  }, [addRecent, recordRead, streak]);

  const handleCloseViewer = useCallback(() => {
    setOpenCatalog(null);
    const params = new URLSearchParams(window.location.search);
    if (params.get('cat')) {
      window.history.pushState({}, '', window.location.pathname);
    }
  }, []);

  // REMAINING-08: Video open/close handlers for URL management
  const handleOpenVideo = useCallback((video: VideoType) => {
    setOpenVideo(video);
    window.history.pushState({}, '', `${window.location.pathname}?vid=${video.id}`);
  }, []);

  const handleCloseVideo = useCallback(() => {
    setOpenVideo(null);
    const params = new URLSearchParams(window.location.search);
    if (params.get('vid')) {
      window.history.pushState({}, '', window.location.pathname);
    }
  }, []);

  // Categories
  const categories = useMemo(() => {
    const cats = new Set(catalogs.map(c => c.category));
    return Array.from(cats).filter(Boolean);
  }, [catalogs]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of catalogs) {
      const key = cat.category;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [catalogs]);

  // Processed catalogs
  // SURPRISE-05: Fuzzy search with Fuse.js
  const fuse = useMemo(() => new Fuse(catalogs, {
    keys: [
      { name: 'title', weight: 0.6 },
      { name: 'category', weight: 0.25 },
      { name: 'description', weight: 0.15 },
    ],
    threshold: 0.35,
    includeScore: true,
    ignoreLocation: true,
    useExtendedSearch: false,
    minMatchCharLength: 2,
  }), [catalogs]);

  const processedCatalogs = useMemo(() => {
    let result = [...catalogs];
    if (searchTerm.trim()) {
      if (searchTerm.trim().length >= 2) {
        // SURPRISE-05: Use fuzzy search for 2+ characters
        const results = fuse.search(searchTerm.trim());
        result = results.map(r => r.item);
      } else if (searchTerm.trim().length === 1) {
        // Simple includes for single char (Fuse is overkill)
        const q = searchTerm.toLowerCase();
        result = result.filter(c =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
        );
      }
    }
    if (selectedCategory) result = result.filter(c => c.category === selectedCategory);
    if (langFilter) result = result.filter(c => c.language === langFilter);
    if (sortBy === 'date_desc') result.sort((a, b) => dateToNumber(b.date) - dateToNumber(a.date));
    else if (sortBy === 'date_asc') result.sort((a, b) => dateToNumber(a.date) - dateToNumber(b.date));
    else if (sortBy === 'alpha') result.sort((a, b) => a.title.localeCompare(b.title, 'fa'));
    return result;
  }, [catalogs, selectedCategory, langFilter, searchTerm, sortBy, fuse]);

  // Recent catalogs objects
  const recentCatalogs = useMemo(() => {
    return recent.map(id => catalogs.find(c => c.id === id)).filter((c): c is Catalog => !!c);
  }, [recent, catalogs]);

  const showRecentRow = recentCatalogs.length > 0 && !searchTerm && !selectedCategory;

  // Favorites catalogs objects (BUG-V4-01)
  const favoriteCatalogs = useMemo(() => {
    return favorites.map(id => catalogs.find(c => c.id === id)).filter((c): c is Catalog => !!c);
  }, [favorites, catalogs]);

  const filteredVideos = useMemo(() => {
    const query = videoSearch.trim().toLowerCase();
    if (!query) return videos;
    return videos.filter(v =>
      v.title.toLowerCase().includes(query) ||
      v.description.toLowerCase().includes(query)
    );
  }, [videos, videoSearch]);

  const showFavoritesRow = favoriteCatalogs.length > 0 && !searchTerm && !selectedCategory;

  const [logoClicks, setLogoClicks] = useState(0);
  useEffect(() => {
    if (logoClicks >= 5) { enterAdmin(); setLogoClicks(0); }
  }, [logoClicks, enterAdmin]);

  // SURPRISE-01: Command Palette keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Build command palette commands
  const paletteCommands: PaletteCommand[] = useMemo(() => [
    // Theme commands
    { id: 'theme-light', label: 'پوسته روشن', group: 'تم', action: () => setTheme('light'), keywords: ['روشن', 'light'] },
    { id: 'theme-dark', label: 'پوسته تاریک', group: 'تم', action: () => setTheme('dark'), keywords: ['تاریک', 'dark'] },
    { id: 'theme-reading', label: 'پوسته مطالعه', group: 'تم', action: () => setTheme('reading'), keywords: ['مطالعه', 'reading'] },

    // Navigation commands
    { id: 'go-catalogs', label: 'رفتن به کاتالوگ‌ها', group: 'ناوبری', action: () => catalogsSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), keywords: ['کاتالوگ'] },
    { id: 'go-videos', label: 'رفتن به ویدئوها', group: 'ناوبری', action: () => videosSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), keywords: ['ویدئو', 'video'] },
    { id: 'go-products', label: 'رفتن به محصولات', group: 'ناوبری', action: () => productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), keywords: ['محصول'] },

    // Admin commands
    { id: 'admin-panel', label: 'باز کردن پنل مدیریت', group: 'مدیریت', action: () => { setViewMode('admin-login'); setShowCommandPalette(false); }, keywords: ['مدیریت', 'admin'] },

    // Clear commands
    { id: 'clear-recent', label: 'پاک کردن تاریخچه مشاهده', group: 'پاکسازی', action: () => { clearRecent(); toast.success('تاریخچه پاک شد'); }, keywords: ['تاریخچه', 'recent'] },
    { id: 'clear-favorites', label: 'پاک کردن علاقه‌مندی‌ها', group: 'پاکسازی', action: () => { clearFavorites(); toast.success('علاقه‌مندی‌ها پاک شد'); }, keywords: ['علاقه', 'favorites'] },

    // Catalog quick open
    ...catalogs.slice(0, 8).map(cat => ({
      id: `cat-${cat.id}`,
      label: cat.title,
      group: 'کاتالوگ‌ها',
      action: () => { handleOpenCatalog(cat); setShowCommandPalette(false); },
      keywords: [cat.title, cat.category],
    })),
  ], [catalogs, handleOpenCatalog, clearRecent, clearFavorites, setTheme, setViewMode, setShowCommandPalette]);

  // -- Admin views --
  if (viewMode === 'admin-login') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <AdminLogin onLogin={() => setViewMode('admin')} onBack={exitAdmin} />
        </Suspense>
      </ErrorBoundary>
    );
  }
  if (viewMode === 'admin') {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <AdminPanel onClose={exitAdmin} />
        </Suspense>
        <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Vazirmatn, sans-serif', direction: 'rtl' } }} />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-skin-base" dir="rtl">
      <ScrollProgressBar progress={scrollProgress} />
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'Vazirmatn, sans-serif', direction: 'rtl', fontSize: '13px' } }} />

      {/* SURPRISE-01: Command Palette */}
      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} commands={paletteCommands} />

      {/* REMAINING-03: Online/Offline Status Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -32, opacity: 0 }}
            className="fixed top-[2px] inset-x-0 z-[99] bg-amber-500 text-white text-center text-xs py-1.5 font-bold flex items-center justify-center gap-2"
          >
            <span>📡</span>
            آفلاین هستید — محتوای ذخیره‌شده نمایش داده می‌شود
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-[2px] z-30 transition-all duration-300 ${
          scrolled
            ? 'glass-effect shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
            : 'bg-skin-base/95 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 h-16 flex items-center gap-3">
          {/* Logo */}
          <button
            onClick={() => setLogoClicks(c => c + 1)}
            className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary rounded-lg"
            aria-label="نفس زیست فارمد"
          >
            <img src={theme === 'dark' ? LOGO_URL_DARK : LOGO_URL} alt="نفس زیست فارمد" className="h-9 w-auto object-contain" />
            <div className="hidden sm:block">
              <p className="text-[10px] text-skin-primary font-bold leading-none">مراقب شما در هر نفس</p>
            </div>
          </button>

          {/* Desktop search */}
          <div className="hidden md:flex flex-1 max-w-sm mx-auto relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-skin-muted pointer-events-none" />
            <input
              ref={searchRef}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو... ( / )"
              className={`w-full bg-skin-control-bg border rounded-xl py-2 pr-8 pl-3 text-sm outline-none transition-all focus:ring-2 focus:ring-skin-primary/20 focus:border-skin-primary ${urlCatNotFound ? 'border-amber-400 ring-2 ring-amber-200 animate-pulse' : 'border-skin-border'}`}
            />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 mr-auto">
            {/* Fix 2.13: Animated theme toggle */}
            <div className="flex items-center gap-1 bg-skin-control-bg rounded-xl p-1">
              {([['light', <Sun size={13} />, 'روشن'], ['dark', <Moon size={13} />, 'تاریک'], ['reading', <Book size={13} />, 'مطالعه']] as [Theme, React.ReactNode, string][]).map(([t, icon, label]) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  title={label}
                  aria-label={label}
                  className={`relative p-1.5 rounded-lg transition-all ${theme === t ? 'bg-skin-card text-skin-primary shadow-sm' : 'text-skin-muted hover:text-skin-text'}`}
                >
                  <AnimatePresence mode="wait">
                    {theme === t && (
                      <motion.div
                        key={t}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="absolute inset-0"
                      />
                    )}
                  </AnimatePresence>
                  {icon}
                </button>
              ))}
            </div>


          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden px-3 sm:px-4 pb-3">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-skin-muted pointer-events-none" />
            <input
              ref={searchRef}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو... ( / )"
              className={`w-full bg-skin-control-bg border rounded-xl py-2 pr-8 pl-3 text-sm outline-none focus:border-skin-primary ${urlCatNotFound ? 'border-amber-400 animate-pulse' : 'border-skin-border'}`}
            />
          </div>
        </div>
      </header>

      {/* Fix 3.10: URL not found banner */}
      <AnimatePresence>
        {urlCatNotFound && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-[1600px] mx-auto px-3 sm:px-4 mt-3"
          >
            <div className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl px-4 py-3 text-sm">
              <p>کاتالوگ مورد نظر یافت نشد. می‌توانید با جستجو آن را پیدا کنید.</p>
              <button onClick={() => setUrlCatNotFound(false)} className="shrink-0 text-amber-600 hover:text-amber-800"><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 py-6">
        {/* BUG-N02: Real loading state and error display */}
        {error && !isLoading && (
          <div className="mb-4">
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle size={14} className="shrink-0" />
              <p>خطا در بارگذاری داده‌ها — از داده‌های محلی استفاده می‌شود.</p>
            </div>
          </div>
        )}

        {/* Hero Slider */}
        <HeroSlider />

        {/* Stats Bar */}
        <StatsBar catalogCount={catalogs.length} videoCount={videos.length} />

        {/* Recently Viewed */}
        {showRecentRow && (
          <RecentlyViewed
            catalogs={recentCatalogs}
            onOpen={(cat) => handleOpenCatalog(cat)}
            onClear={clearRecent}
          />
        )}

        {/* Favorites Row (BUG-V4-01) */}
        {showFavoritesRow && (
          <FavoritesRow
            catalogs={favoriteCatalogs}
            onOpen={(cat) => handleOpenCatalog(cat)}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {/* ─── CATALOGS SECTION ─────────────────────────────────────────────── */}
        <ErrorBoundary fallback={<SectionError section="کاتالوگ‌ها" />}>
          <section id="catalogs" ref={catalogsSectionRef} className="mb-12">
            <SectionHeader icon={<BookOpen size={20} />} title="کاتالوگ‌های آموزشی" count={processedCatalogs.length} />

          {/* Filters row */}
          <div className="flex flex-col gap-3 mb-5">
            {/* Category pills + lang filters */}
            <div className="flex items-center gap-3">
              {/* Category pills (scrollable) */}
              <div className="relative flex-1 min-w-0">
                {/* Left fade mask */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-skin-base to-transparent z-10 pointer-events-none" />
                {/* Right fade mask */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-skin-base to-transparent z-10 pointer-events-none" />
                <div className="flex gap-2 overflow-x-auto scrollbar-hide px-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${!selectedCategory ? 'bg-skin-primary text-white border-skin-primary border-r-4' : 'bg-skin-control-bg text-skin-control-text border-skin-border hover:border-skin-primary/30'}`}
                  >
                    همه
                    <span className="mr-1 opacity-60">({catalogs.length})</span>
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${selectedCategory === cat ? 'bg-skin-primary text-white border-skin-primary border-r-4' : 'bg-skin-control-bg text-skin-control-text border-skin-border hover:border-skin-primary/30'}`}
                    >
                      {cat}
                      <span className="mr-1 opacity-60">({categoryCounts[cat] ?? 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fix 3.2: Language quick filter */}
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setLangFilter(langFilter === 'fa' ? null : 'fa')}
                  title="فیلتر فارسی"
                  className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all border-2 ${langFilter === 'fa' ? 'bg-skin-primary/10 border-skin-primary' : 'border-skin-border hover:border-skin-primary/30'}`}
                >
                  🇮🇷
                </button>
                <button
                  onClick={() => setLangFilter(langFilter === 'en' ? null : 'en')}
                  title="فیلتر انگلیسی"
                  className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all border-2 ${langFilter === 'en' ? 'bg-skin-primary/10 border-skin-primary' : 'border-skin-border hover:border-skin-primary/30'}`}
                >
                  🇬🇧
                </button>
              </div>
            </div>

            {/* Sort + display mode */}
            <div className="flex items-center gap-2 justify-between">
              {/* Fix 1.14: aria-live for results count */}
              <output aria-live="polite" className="text-xs text-skin-muted">
                {processedCatalogs.length} کاتالوگ
              </output>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs bg-skin-control-bg border border-skin-border rounded-xl px-2 py-1.5 outline-none focus:border-skin-primary text-skin-control-text"
                >
                  {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <div className="flex gap-1 bg-skin-control-bg rounded-xl p-1">
                  <button
                    onClick={() => setDisplayMode('grid')}
                    className={`p-1.5 rounded-lg transition-all ${displayMode === 'grid' ? 'bg-skin-card text-skin-primary shadow-sm' : 'text-skin-muted hover:text-skin-text'}`}
                    aria-label="نمایش گرید"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    onClick={() => setDisplayMode('list')}
                    className={`p-1.5 rounded-lg transition-all ${displayMode === 'list' ? 'bg-skin-card text-skin-primary shadow-sm' : 'text-skin-muted hover:text-skin-text'}`}
                    aria-label="نمایش لیست"
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Grid/List */}
          {isLoading ? (
            <div className={displayMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4' : 'flex flex-col gap-3'}>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} viewMode={displayMode} />)}
            </div>
          ) : processedCatalogs.length === 0 ? (
            <div className={displayMode === 'grid' ? 'grid grid-cols-1' : 'flex flex-col'}>
              <EmptyState
                searchTerm={searchTerm}
                hasCategory={!!selectedCategory}
                onClearSearch={() => setSearchTerm('')}
                onClearCategory={() => setSelectedCategory(null)}
              />
            </div>
          ) : (
            <div className={displayMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4' : 'flex flex-col gap-3'}>
              {processedCatalogs.map((catalog, index) => (
                <CatalogCard
                  key={catalog.id}
                  catalog={catalog}
                  onClick={handleOpenCatalog}
                  viewMode={displayMode}
                  animationDelay={Math.min(index, 7) * 0.05}
                  isFavorite={isFavorite(catalog.id)}
                  onToggleFavorite={toggleFavorite}
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          )}
          </section>
        </ErrorBoundary>

        {/* ─── VIDEOS SECTION ───────────────────────────────────────────────── */}
        <ErrorBoundary fallback={<SectionError section="ویدئوها" />}>
          {videos.length > 0 && (
            <section id="videos" ref={videosSectionRef} className="mb-12">
              <SectionHeader icon={<Video size={20} />} title="ویدئوهای آموزشی" count={videos.length} />

              {/* BUG-V4-08: Video search feature */}
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1 max-w-xs">
                  <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-skin-muted pointer-events-none" />
                  <input
                    value={videoSearch}
                    onChange={e => setVideoSearch(e.target.value)}
                    placeholder="جستجو در ویدئوها..."
                    className="w-full bg-skin-control-bg border border-skin-border rounded-xl py-1.5 pr-8 pl-3 text-xs outline-none focus:border-skin-primary"
                  />
                </div>
                {videoSearch && (
                  <button onClick={() => setVideoSearch('')} className="text-xs text-skin-muted hover:text-skin-primary transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Filtered videos */}
              {filteredVideos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredVideos.map(video => (
                    <VideoCard key={video.id} video={video} onClick={handleOpenVideo} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Video size={40} className="text-skin-border mb-3 opacity-50" />
                  <p className="text-skin-muted text-sm">ویدئویی با این معیار یافت نشد</p>
                </div>
              )}
            </section>
          )}
        </ErrorBoundary>

        {/* ─── PRODUCTS SECTION (below catalogs & videos) ───────────────────── */}
        <ErrorBoundary fallback={<SectionError section="محصولات" />}>
          <ProductsSection catalogs={catalogs} onOpenCatalog={handleOpenCatalog} sectionRef={productsSectionRef} />
        </ErrorBoundary>

        {/* ─── COMPANY INFO (about · mission · advantages · slogan) ─────────── */}
        <ErrorBoundary fallback={<SectionError section="درباره شرکت" />}>
          <CompanyInfo />
        </ErrorBoundary>

        {/* ─── FOOTER ──────────────────────────────────────────────────────────── */}
        <Footer theme={theme} setTheme={setTheme} />
      </main>


      {/* ─── Bottom Mobile Nav (floating pill) ─────────────────────────────── */}
      {/* Stays above the chat backdrop (un-dimmed) while the chat is open. */}
      <nav id="mobile-nav" className={`md:hidden fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 flex items-center gap-1 bg-skin-card/90 backdrop-blur-xl border border-skin-border rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.16)] px-2 py-1.5 ${chatOpen ? 'z-[70]' : 'z-40'}`}>
        {([
          { key: 'catalogs', icon: <BookOpen size={18} />, label: 'کاتالوگ', onClick: () => { setChatOpen(false); catalogsSectionRef.current?.scrollIntoView({ behavior: 'smooth' }); } },
          { key: 'videos', icon: <Video size={18} />, label: 'ویدئو', onClick: () => { setChatOpen(false); videosSectionRef.current?.scrollIntoView({ behavior: 'smooth' }); } },
          { key: 'products', icon: <BookMarked size={18} />, label: 'محصولات', onClick: () => { setChatOpen(false); productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' }); } },
          { key: 'chat', icon: <MessageCircle size={18} />, label: 'گفت‌وگو', onClick: () => setChatOpen(o => !o) },
        ] as { key: string; icon: React.ReactNode; label: string; onClick: () => void }[]).map(item => {
          // While the chat is open, only the chat icon is highlighted; the rest reset.
          const isActive = chatOpen ? item.key === 'chat' : activeSection === item.key;
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`flex flex-col items-center gap-0.5 rounded-full px-3.5 py-1.5 transition-all ${isActive ? 'bg-skin-primary/10 text-skin-primary' : 'text-skin-muted hover:text-skin-primary'}`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom padding so content clears the floating nav */}
      <div className="md:hidden h-24" />

      {/* ─── MODALS ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {openCatalog && (
          <ErrorBoundary key="book-viewer">
            <Suspense fallback={<LoadingSpinner />}>
              <BookViewer
                catalog={openCatalog}
                onClose={handleCloseViewer}
                initialPage={openCatalogPage}
                allCatalogs={catalogs}
                onOpenCatalog={handleOpenCatalog}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openVideo && (
          <ErrorBoundary key="video-player">
            <VideoPlayer video={openVideo} onClose={handleCloseVideo} />
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* ─── FABs ────────────────────────────────────────────────────────────── */}
      {/* Scroll to top */}
      <AnimatePresence>
        {scrollProgress > 10 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-5 right-4 md:bottom-6 md:right-6 z-30"
          >
            <ScrollToTop scrollProgress={scrollProgress} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat assistant launcher. On mobile it lives in the bottom nav, so this is desktop-only. */}
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        aria-label="دستیار گفت‌وگو"
        className="hidden md:flex fixed md:bottom-6 md:left-6 z-30 w-14 h-14 rounded-full bg-skin-primary hover:bg-skin-primary-hover text-white shadow-[0_10px_30px_rgba(182,22,21,0.35)] items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        <MessageCircle size={24} />
        <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-skin-base" />
      </button>

      {/* Headless chatbot panel (talks to the WordPress plugin endpoints) */}
      <ChatBot open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <CatalogProvider>
        <InnerApp />
      </CatalogProvider>
    </ErrorBoundary>
  );
}
