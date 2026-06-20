import React, { useState, useRef, useEffect, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { toast } from 'react-hot-toast';
import { Catalog } from '../types';
import {
  X, ChevronRight, ChevronLeft, Maximize, Minimize,
  Volume2, VolumeX, FileDown, DownloadCloud, ZoomIn, ZoomOut,
  Book, Smartphone, ChevronUp, ChevronDown, Share2, List, PackageOpen
} from 'lucide-react';
import SafeImage from './SafeImage';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { trackCatalogView } from '../utils/analytics';

interface BookViewerProps {
  catalog: Catalog;
  onClose: () => void;
  initialPage?: number;
  allCatalogs?: Catalog[];
  onOpenCatalog?: (catalog: Catalog) => void;
}

const PAGE_FLIP_SOUND_URL = 'https://nafaspharmed.com/mp3/paper.mp3';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const getDistance = (touches: React.TouchList) =>
  Math.hypot(touches[0]!.clientX - touches[1]!.clientX, touches[0]!.clientY - touches[1]!.clientY);

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;

// Page components
const Page = React.forwardRef<HTMLDivElement, { number: number; children?: React.ReactNode }>(
  (props, ref) => (
    <div ref={ref} className="relative bg-white overflow-hidden select-none">
      {props.children}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">{props.number}</div>
    </div>
  )
);
Page.displayName = 'Page';

const PdfPage = React.forwardRef<HTMLDivElement, {
  doc: pdfjsLib.PDFDocumentProxy | null;
  pageNumber: number;
  onRendered?: (dataUrl: string) => void;
}>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let renderTask: ReturnType<pdfjsLib.PDFPageProxy['render']> | null = null;
    let isSetup = true;
    const renderPage = async () => {
      if (!props.doc) return;
      try {
        const page = await props.doc.getPage(props.pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas || !isSetup) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        renderTask = page.render({ canvasContext: context, canvas: canvas, viewport });
        await renderTask.promise;
        if (isSetup) {
          setRendered(true);
          if (props.onRendered) props.onRendered(canvas.toDataURL('image/jpeg', 0.8));
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', err);
        }
      }
    };
    renderPage();
    return () => { isSetup = false; renderTask?.cancel(); };
  }, [props.doc, props.pageNumber]);

  return (
    <div ref={ref} className="relative bg-white overflow-hidden select-none">
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-xs text-gray-400">در حال تبدیل صفحه...</div>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-auto" />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">{props.pageNumber}</div>
    </div>
  );
});
PdfPage.displayName = 'PdfPage';

// Main BookViewer
const BookViewer: React.FC<BookViewerProps> = ({ catalog, onClose, initialPage = 0, allCatalogs = [], onOpenCatalog }) => {
  const bookRef = useRef<{ pageFlip: () => { flipNext: () => void; flipPrev: () => void; flip: (n: number) => void; pages: { length: number } } }>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const thumbStripRef = useRef<HTMLDivElement>(null);

  const usePdfMode = !!catalog.pdfUrl && catalog.pages.length === 0;
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 400, height: 600 });
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(usePdfMode);
  const [pdfError, setPdfError] = useState('');
  const [pdfThumbnails, setPdfThumbnails] = useState<Record<number, string>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [forceSinglePage, setForceSinglePage] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const hasToc = Array.isArray(catalog.toc) && catalog.toc.length > 0;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showTopPanel, setShowTopPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  // Virtual rendering for thumbnails (show 13 at a time)
  const VIRTUAL_WINDOW_SIZE = 13;
  const [virtualStart, setVirtualStart] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);

  const gesture = useRef({
    startX: 0, startY: 0, startPanX: 0, startPanY: 0,
    startDist: 0, startZoom: 1,
    mode: 'none' as 'none' | 'swipe' | 'pan' | 'pinch',
  });

  // Centralized scroll lock
  useBodyScrollLock(true);

  // Keyboard hint toast on first open
  useEffect(() => {
    const shown = localStorage.getItem('nafas_kb_hint_shown');
    if (!shown) {
      setTimeout(() => {
        toast('نکته: از کلیدهای ← → برای ورق زدن استفاده کنید.', { icon: '⌨️', duration: 4000 });
        localStorage.setItem('nafas_kb_hint_shown', '1');
      }, 1000);
    }
  }, []);

  // Track view on catalog open
  useEffect(() => {
    trackCatalogView(catalog.id, catalog.title);
  }, [catalog.id, catalog.title]);

  // Load PDF
  useEffect(() => {
    if (usePdfMode && catalog.pdfUrl) {
      setIsLoadingPdf(true);
      const loadingTask = pdfjsLib.getDocument(catalog.pdfUrl);
      loadingTask.promise.then(doc => {
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setIsLoadingPdf(false);
      }).catch(err => {
        console.error('Error loading PDF:', err);
        setPdfError('خطا در دریافت کاتالوگ PDF');
        setIsLoadingPdf(false);
      });
      return () => { loadingTask.destroy(); };
    }
  }, [usePdfMode, catalog.pdfUrl]);

  // Focus trap
  const getFocusable = useCallback((root: HTMLElement): HTMLElement[] => {
    return Array.from(root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
  }, []);

  useEffect(() => {
    lastFocusedRef.current = document.activeElement as HTMLElement;
    const root = dialogRef.current;
    if (!root) return;
    const focusables = getFocusable(root);
    (focusables[0] ?? root).focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = getFocusable(root);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); lastFocusedRef.current?.focus?.(); };
  }, [getFocusable, onClose]);

  // Thumb strip scroll
  useEffect(() => {
    const strip = thumbStripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>(`[data-thumb="${currentPage}"]`);
    if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); bookRef.current?.pageFlip()?.flipNext(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); bookRef.current?.pageFlip()?.flipPrev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Audio & jump to page
  useEffect(() => {
    audioRef.current = new Audio(PAGE_FLIP_SOUND_URL);
    audioRef.current.volume = 0.4;
    if (initialPage > 0) {
      setTimeout(() => bookRef.current?.pageFlip().flip(initialPage), 500);
    }
  }, [initialPage]);

  // Responsive sizing
  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const isSmallScreen = windowWidth < 768;
      setIsMobile(isSmallScreen);
      const isSingle = isSmallScreen || forceSinglePage;
      const availableWidth = Math.min(windowWidth * 0.95, isSingle ? 600 : 1100);
      const availableHeight = windowHeight * 0.78;
      const aspectRatio = 842 / 595;
      let bookWidth = isSingle ? Math.min(availableWidth, availableHeight / aspectRatio) : availableWidth / 2;
      let bookHeight = bookWidth * aspectRatio;
      if (bookHeight > availableHeight) { bookHeight = availableHeight; bookWidth = bookHeight / aspectRatio; }
      if (bookWidth > availableWidth) { bookWidth = availableWidth; bookHeight = bookWidth * aspectRatio; }
      setDimensions({ width: Math.floor(bookWidth), height: Math.floor(bookHeight) });
    };
    handleResize();
    let timer: ReturnType<typeof setTimeout>;
    const debounced = () => { clearTimeout(timer); timer = setTimeout(handleResize, 150); };
    window.addEventListener('resize', debounced);
    return () => { window.removeEventListener('resize', debounced); clearTimeout(timer); };
  }, [forceSinglePage]);

  // Fullscreen handler
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Reset pan on zoom reset
  useEffect(() => { if (zoomLevel <= 1) setPan({ x: 0, y: 0 }); }, [zoomLevel]);

  const playSound = useCallback(() => {
    if (isSoundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [isSoundEnabled]);

  const onFlip = useCallback((e: { data: number }) => {
    setCurrentPage(e.data);
    playSound();
    const newUrl = `${window.location.pathname}?cat=${catalog.id}&page=${e.data + 1}`;
    window.history.replaceState({}, '', newUrl);
    localStorage.setItem(`nafas_progress_${catalog.id}`, String(e.data));
  }, [playSound, catalog.id]);

  // Analytics: view count
  useEffect(() => {
    const statsStr = localStorage.getItem('nafas_analytics');
    const stats = statsStr ? JSON.parse(statsStr) : { viewsByCatalog: {}, timeByCatalogPage: {} };
    stats.viewsByCatalog[catalog.id] = (stats.viewsByCatalog[catalog.id] || 0) + 1;
    localStorage.setItem('nafas_analytics', JSON.stringify(stats));
  }, [catalog.id]);

  // Analytics: time per page
  useEffect(() => {
    const startTime = Date.now();
    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      if (duration > 0) {
        const statsStr = localStorage.getItem('nafas_analytics');
        const stats = statsStr ? JSON.parse(statsStr) : { viewsByCatalog: {}, timeByCatalogPage: {} };
        if (!stats.timeByCatalogPage) stats.timeByCatalogPage = {};
        if (!stats.timeByCatalogPage[catalog.id]) stats.timeByCatalogPage[catalog.id] = {};
        const currentDur = stats.timeByCatalogPage[catalog.id][currentPage] || 0;
        stats.timeByCatalogPage[catalog.id][currentPage] = currentDur + duration;
        localStorage.setItem('nafas_analytics', JSON.stringify(stats));
      }
    };
  }, [currentPage, catalog.id]);

  const nextFlip = () => bookRef.current?.pageFlip().flipNext();
  const prevFlip = () => bookRef.current?.pageFlip().flipPrev();
  const goToPage = (index: number) => bookRef.current?.pageFlip().flip(index);
  const onInit = useCallback((e: { object: { pages: { length: number } } }) => setTotalPages(e.object.pages.length), []);

  // Update virtual thumbnail window when current page changes
  useEffect(() => {
    const totalPages = usePdfMode ? (pdfDoc?.numPages ?? 0) : catalog.pages.length;
    const newStart = Math.max(0, currentPage - Math.floor(VIRTUAL_WINDOW_SIZE / 2));
    setVirtualStart(Math.min(newStart, Math.max(0, totalPages - VIRTUAL_WINDOW_SIZE)));
  }, [currentPage, usePdfMode, pdfDoc, catalog.pages.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen().catch(console.error);
    else document.exitFullscreen();
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(Math.round((prev + 0.1) * 10) / 10, ZOOM_MAX));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(Math.round((prev - 0.1) * 10) / 10, ZOOM_MIN));
  const handleZoomReset = () => setZoomLevel(1);

  // Desktop: zoom with the mouse wheel (the viewer has no scroll of its own).
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY === 0) return;
    setZoomLevel(prev => {
      const next = prev + (e.deltaY < 0 ? 0.1 : -0.1);
      return Math.min(Math.max(Math.round(next * 10) / 10, ZOOM_MIN), ZOOM_MAX);
    });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    if (catalog.pdfUrl) {
      link.href = catalog.pdfUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } else if (catalog.pages[0]) {
      window.open(catalog.pages[0], '_blank', 'noopener,noreferrer');
    }
  };

  const handleSaveOffline = async () => {
    setIsCaching(true);
    try {
      const cache = await caches.open('assets-cache');
      if (usePdfMode && catalog.pdfUrl) await cache.add(catalog.pdfUrl).catch(() => {});
      else await Promise.allSettled(catalog.pages.map(p => cache.add(p)));
      toast.success('کاتالوگ برای استفاده آفلاین ذخیره شد.');
    } catch { toast.error('خطا در ذخیره‌سازی آفلاین.'); }
    setIsCaching(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('لینک صفحه کپی شد!');
  };

  // Gesture handlers
  const startGesture = (clientX: number, clientY: number, mode: 'swipe' | 'pan') => {
    setIsGesturing(true);
    gesture.current.startX = clientX; gesture.current.startY = clientY; gesture.current.mode = mode;
    if (mode === 'pan') { gesture.current.startPanX = pan.x; gesture.current.startPanY = pan.y; }
  };
  const moveGesture = (clientX: number, clientY: number) => {
    if (gesture.current.mode === 'pan') {
      const dx = clientX - gesture.current.startX;
      const dy = clientY - gesture.current.startY;
      setPan({ x: gesture.current.startPanX + dx, y: gesture.current.startPanY + dy });
    }
  };
  const endGesture = (clientX: number, clientY: number) => {
    setIsGesturing(false);
    if (gesture.current.mode === 'swipe') {
      const dx = clientX - gesture.current.startX;
      const dy = clientY - gesture.current.startY;
      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) prevFlip(); else nextFlip();
      }
    }
    gesture.current.mode = 'none';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsGesturing(true); gesture.current.mode = 'pinch';
      gesture.current.startDist = getDistance(e.touches); gesture.current.startZoom = zoomLevel;
    } else if (e.touches.length === 1) {
      startGesture(e.touches[0]!.clientX, e.touches[0]!.clientY, zoomLevel > 1 ? 'pan' : 'swipe');
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (gesture.current.mode === 'pinch' && e.touches.length === 2) {
      const dist = getDistance(e.touches);
      setZoomLevel(Math.min(Math.max((dist / gesture.current.startDist) * gesture.current.startZoom, ZOOM_MIN), ZOOM_MAX));
    } else if (e.touches.length === 1) {
      moveGesture(e.touches[0]!.clientX, e.touches[0]!.clientY);
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    endGesture(e.changedTouches[0]!.clientX, e.changedTouches[0]!.clientY);
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan with the mouse when zoomed in; let the flipbook handle clicks otherwise.
    if (e.button !== 0 || zoomLevel <= 1) return;
    e.preventDefault();
    startGesture(e.clientX, e.clientY, 'pan');
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (gesture.current.mode !== 'none') { e.preventDefault(); moveGesture(e.clientX, e.clientY); }
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (gesture.current.mode !== 'none') endGesture(e.clientX, e.clientY);
  };

  // Reading progress
  const totalPagesForProgress = totalPages || catalog.pages.length || 1;
  const readingProgress = Math.min(100, Math.round(((currentPage + 1) / totalPagesForProgress) * 100));

  // Reading time estimate
  const SECS_PER_PAGE = 45;
  const totalPagesNum = totalPages || catalog.pages.length;
  const pagesLeft = Math.max(0, totalPagesNum - (currentPage + 1));
  const minutesLeft = Math.ceil((pagesLeft * SECS_PER_PAGE) / 60);

  const canPan = zoomLevel > 1;

  return (
    <div
      ref={el => { containerRef.current = el; dialogRef.current = el; }}
      role="dialog"
      aria-modal="true"
      aria-label="نمایش کاتالوگ"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-skin-overlay backdrop-blur-md animate-fade-in touch-none select-none overflow-hidden"
    >
      {/* TOP PANEL */}
      <div className={`shrink-0 transition-all duration-300 ${showTopPanel ? 'opacity-100' : 'opacity-0 pointer-events-none -translate-y-full h-0'}`}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-skin-card/80 backdrop-blur-md border-b border-skin-border">
          {/* TOC */}
          {hasToc && (
            <div className="relative">
              <button onClick={() => setShowToc(v => !v)} className={`p-2 rounded-lg border border-skin-border transition-colors ${showToc ? 'bg-skin-primary text-white' : 'bg-skin-control-bg text-skin-control-text hover:bg-skin-control-hover'}`}>
                <List size={16} />
              </button>
              {showToc && (
                <div className="absolute top-full right-0 mt-1 bg-skin-card border border-skin-border rounded-xl shadow-xl p-2 z-20 min-w-[180px]">
                  <p className="text-xs font-bold text-skin-muted px-2 py-1">فهرست مطالب</p>
                  {catalog.toc!.map((item, i) => (
                    <button key={i} onClick={() => { goToPage(item.page); setShowToc(false); }}
                      className="w-full flex items-center justify-between gap-2 text-right px-2 py-1.5 rounded-lg text-xs text-skin-text hover:bg-skin-control-bg transition-colors">
                      <span>{item.title}</span>
                      <span className="text-skin-muted">ص {item.page + 1}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Title + Page */}
          <div className="flex-1 min-w-0 text-center">
            <p className="text-sm font-bold text-skin-text truncate">{catalog.title}</p>
            <div className="flex flex-col gap-0.5 items-center">
              <p className="text-xs text-skin-muted">صفحه {currentPage + 1} از {totalPagesNum}</p>
              {pagesLeft > 0 && <p className="text-xs text-skin-muted">≈{minutesLeft} دقیقه مانده</p>}
              {pagesLeft === 0 && <p className="text-xs text-skin-primary font-semibold">پایان رسید! 🎉</p>}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <div className="hidden md:flex items-center gap-1">
              {/* Zoom controls (desktop) */}
              <button onClick={handleZoomOut} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors" title="کوچک‌نمایی"><ZoomOut size={14} /></button>
              <button onClick={handleZoomReset} className="text-[10px] text-skin-muted font-mono w-9 text-center hover:text-skin-primary transition-colors" title="بازنشانی بزرگ‌نمایی">{Math.round(zoomLevel * 100)}%</button>
              <button onClick={handleZoomIn} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors" title="بزرگ‌نمایی"><ZoomIn size={14} /></button>
              <div className="w-px h-4 bg-skin-border mx-1" />
              <button onClick={() => setForceSinglePage(!forceSinglePage)} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors" title={forceSinglePage ? 'دو صفحه' : 'تک صفحه'}>{forceSinglePage ? <Book size={14} /> : <Smartphone size={14} />}</button>
              <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors" title={isSoundEnabled ? 'قطع صدا' : 'پخش صدا'}>{isSoundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}</button>
              <button onClick={toggleFullscreen} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors" title="تمام‌صفحه">{isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}</button>
              <button onClick={isCaching ? undefined : handleSaveOffline} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors" title="ذخیره آفلاین">{isCaching ? <PackageOpen size={14} className="animate-pulse" /> : <DownloadCloud size={14} />}</button>
              <button onClick={handleDownload} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors" title="دانلود"><FileDown size={14} /></button>
              <button onClick={handleShare} className="p-1.5 text-skin-control-text hover:bg-skin-control-hover rounded transition-colors" title="اشتراک‌گذاری"><Share2 size={14} /></button>
            </div>
            <button onClick={() => setShowTopPanel(false)} className="p-1 rounded-full bg-skin-control-bg hover:bg-skin-control-hover text-skin-muted transition-colors"><ChevronUp size={14} /></button>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-skin-primary/10 hover:bg-skin-primary/20 text-skin-primary transition-colors"><X size={16} /></button>
          </div>
        </div>

        {/* Reading progress bar */}
        <div className="h-[3px] bg-skin-border">
          <div
            className="h-full bg-skin-primary transition-all duration-300"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      </div>

      {/* Floating expand (top panel) */}
      {!showTopPanel && (
        <button
          onClick={() => setShowTopPanel(true)}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-skin-card/80 backdrop-blur-sm border border-skin-border rounded-full p-2 shadow-lg text-skin-muted hover:text-skin-primary transition-all"
        >
          <ChevronDown size={14} />
        </button>
      )}

      {/* Book container */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        style={{ cursor: isGesturing ? 'grabbing' : canPan ? 'grab' : 'default' }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Nav arrows */}
        <button onClick={(e) => { e.stopPropagation(); nextFlip(); }} className="hidden md:flex absolute right-6 z-10 p-3 bg-skin-primary/90 hover:bg-skin-primary text-white rounded-full shadow-lg transition-colors">
          <ChevronRight size={20} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); prevFlip(); }} className="hidden md:flex absolute left-6 z-10 p-3 bg-skin-primary/90 hover:bg-skin-primary text-white rounded-full shadow-lg transition-colors">
          <ChevronLeft size={20} />
        </button>

        {isLoadingPdf && (
          <div className="flex flex-col items-center justify-center gap-3 text-skin-muted">
            <div className="w-12 h-12 border-4 border-skin-border border-t-skin-primary rounded-full animate-spin" />
            <p className="text-sm">در حال بارگذاری PDF...</p>
          </div>
        )}
        {pdfError && <div className="text-red-500 text-sm">{pdfError}</div>}

        {!isLoadingPdf && !pdfError && (
          <div style={{ transform: `scale(${zoomLevel}) translate(${pan.x}px, ${pan.y}px)`, transition: isGesturing ? 'none' : 'transform 0.15s ease-out' }}>
            {/* @ts-ignore */}
            <HTMLFlipBook
              ref={bookRef}
              width={dimensions.width}
              height={dimensions.height}
              size="fixed"
              minWidth={100}
              maxWidth={2000}
              minHeight={150}
              maxHeight={3000}
              drawShadow={true}
              maxShadowOpacity={0.3}
              flippingTime={700}
              usePortrait={isMobile || forceSinglePage}
              startPage={0}
              showCover={false}
              mobileScrollSupport={false}
              clickEventForward={true}
              useMouseEvents={!canPan}
              swipeDistance={0}
              showPageCorners={false}
              onInit={onInit}
              onFlip={onFlip}
              className="shadow-2xl"
            >
              {usePdfMode && pdfDoc
                ? Array.from(new Array(pdfDoc.numPages), (_, index) => (
                    <PdfPage
                      key={index}
                      doc={pdfDoc}
                      pageNumber={index + 1}
                      onRendered={(dataUrl) => setPdfThumbnails(prev => ({ ...prev, [index]: dataUrl }))}
                    />
                  ))
                : catalog.pages.map((pageUrl, index) => (
                    <Page key={index} number={index + 1}>
                      <SafeImage
                        src={pageUrl}
                        alt={`صفحه ${index + 1}`}
                        className="w-full h-full object-cover select-none"
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        loading="lazy"
                        decoding="async"
                      />
                    </Page>
                  ))
              }
            </HTMLFlipBook>
          </div>
        )}
      </div>

      {/* BOTTOM PANEL */}
      <div className={`shrink-0 transition-all duration-300 ${showBottomPanel ? 'opacity-100' : 'opacity-0 pointer-events-none translate-y-full h-0'}`}>
        <div className="bg-skin-card/80 backdrop-blur-md border-t border-skin-border">
          {/* Toolbar row — collapse button is available on every screen size */}
          <div className="flex items-center justify-between gap-1 px-3 py-1.5 border-b border-skin-border">
            <div className="flex md:hidden items-center gap-1">
              <button onClick={handleZoomOut} className="p-2 text-skin-muted hover:text-skin-primary rounded"><ZoomOut size={16} /></button>
              <button onClick={handleZoomReset} className="text-[10px] text-skin-muted font-mono w-9 text-center">{Math.round(zoomLevel * 100)}%</button>
              <button onClick={handleZoomIn} className="p-2 text-skin-muted hover:text-skin-primary rounded"><ZoomIn size={16} /></button>
            </div>
            <div className="flex md:hidden items-center gap-1">
              <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} className="p-2 text-skin-muted hover:text-skin-primary rounded">{isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
              <button onClick={isCaching ? undefined : handleSaveOffline} className="p-2 text-skin-muted hover:text-skin-primary rounded">{isCaching ? <PackageOpen size={16} className="animate-pulse" /> : <DownloadCloud size={16} />}</button>
              <button onClick={handleDownload} className="p-2 text-skin-muted hover:text-skin-primary rounded"><FileDown size={16} /></button>
              <button onClick={handleShare} className="p-2 text-skin-muted hover:text-skin-primary rounded"><Share2 size={16} /></button>
            </div>
            <span className="hidden md:block text-xs text-skin-muted">صفحه {currentPage + 1} از {totalPagesNum}</span>
            <button onClick={() => setShowBottomPanel(false)} className="p-1.5 rounded-full bg-skin-control-bg hover:bg-skin-control-hover text-skin-muted transition-colors" title="جمع کردن نوار پایین"><ChevronDown size={14} /></button>
          </div>

          {/* Thumbnail strip */}
          <div ref={thumbStripRef} className="flex gap-2 overflow-x-auto scrollbar-hide p-2">
            {usePdfMode && pdfDoc
              ? (() => {
                  const visibleIndices = Array.from({ length: Math.min(VIRTUAL_WINDOW_SIZE, pdfDoc.numPages) }, (_, i) => virtualStart + i);
                  return visibleIndices.map(idx => (
                    <button
                      key={idx}
                      data-thumb={idx}
                      onClick={() => goToPage(idx)}
                      className={`shrink-0 h-16 w-12 rounded border-2 overflow-hidden flex items-center justify-center bg-white transition-all ${currentPage === idx ? 'border-skin-primary scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      {pdfThumbnails[idx] ? <img src={pdfThumbnails[idx]} alt={`${idx + 1}`} className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">{idx + 1}</span>}
                    </button>
                  ));
                })()
              : (() => {
                  const visibleIndices = Array.from({ length: Math.min(VIRTUAL_WINDOW_SIZE, catalog.pages.length) }, (_, i) => virtualStart + i);
                  return visibleIndices.map(idx => (
                    <button
                      key={idx}
                      data-thumb={idx}
                      onClick={() => goToPage(idx)}
                      className={`shrink-0 h-16 w-12 rounded border-2 overflow-hidden transition-all ${currentPage === idx ? 'border-skin-primary scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <SafeImage src={catalog.pages[idx]} alt={`ص ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </button>
                  ));
                })()
            }
          </div>

          {/* Related catalogs — part of the bottom panel so it collapses together */}
          {(() => {
            const relatedCatalogs = allCatalogs
              .filter(c => c.category === catalog.category && c.id !== catalog.id)
              .slice(0, 4);

            return relatedCatalogs.length > 0 ? (
              <div className="px-4 py-3 border-t border-skin-border">
                <p className="text-xs text-skin-muted mb-2 font-medium">ممکن است برایتان مفید باشد</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {relatedCatalogs.map(rc => (
                    <button
                      key={rc.id}
                      onClick={() => {
                        onClose();
                        setTimeout(() => onOpenCatalog?.(rc), 100);
                      }}
                      className="shrink-0 flex items-center gap-2 bg-skin-control-bg hover:bg-skin-control-hover rounded-xl px-3 py-2 text-xs text-skin-text transition-colors border border-skin-border hover:border-skin-primary/30"
                    >
                      <img src={rc.coverImage} alt="" className="w-8 h-10 object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2740%27 viewBox=%270 0 32 40%27%3E%3Crect width=%2732%27 height=%2740%27 fill=%27%23f1f5f9%27/%3E%3C/svg%3E'; }} />
                      <span className="max-w-[80px] text-right leading-tight line-clamp-2">{rc.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* Floating bottom expand */}
      {!showBottomPanel && (
        <button
          onClick={() => setShowBottomPanel(true)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-skin-card/80 backdrop-blur-sm border border-skin-border rounded-full p-2 shadow-lg text-skin-muted hover:text-skin-primary transition-all"
        >
          <ChevronUp size={14} />
        </button>
      )}
    </div>
  );
};

export default BookViewer;
