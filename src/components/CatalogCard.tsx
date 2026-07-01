import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Download, FileText, Link2, Printer, ChevronDown, Heart, Volume2, VolumeX, QrCode, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Catalog, SupportedLang } from '../types';
import SafeImage from './SafeImage';
import i18n, { RTL_LANGS, SPEECH_LANG_MAP } from '../i18n';
import { speakText, stopSpeaking } from '../utils/tts';
import { highlightText, isSafeHttpUrl } from '../utils/helpers';
import { useCachedCatalogs } from '../hooks/useCachedCatalogs';
import QrModal from './QrModal';

const LANG_BADGE: Record<SupportedLang, { label: string; flag: string; dir: 'rtl' | 'ltr' }> = {
  fa: { label: 'FA', flag: '🇮🇷', dir: 'rtl' },
  en: { label: 'EN', flag: '🇬🇧', dir: 'ltr' },
  ar: { label: 'AR', flag: '🇸🇦', dir: 'rtl' },
  ru: { label: 'RU', flag: '🇷🇺', dir: 'ltr' },
};

interface CatalogCardProps {
  catalog: Catalog;
  onClick: (catalog: Catalog, page?: number) => void;
  viewMode?: 'grid' | 'list';
  animationDelay?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (catalogId: string) => void;
  searchTerm?: string;
}

// Fix 3.8: Popover share/action menu component
const ActionPopover: React.FC<{
  catalog: Catalog;
  onClose: () => void;
  onShowQr?: () => void;
}> = ({ catalog, onClose, onShowQr }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleDownloadPdf = () => {
    if (catalog.pdfUrl && isSafeHttpUrl(catalog.pdfUrl)) {
      const a = document.createElement('a');
      a.href = catalog.pdfUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (catalog.pages[0] && isSafeHttpUrl(catalog.pages[0], true)) {
      // Fix 1.2: open in new tab for cross-origin resources
      window.open(catalog.pages[0], '_blank', 'noopener,noreferrer');
    } else {
      toast.error(t('viewer.invalidUrl'));
    }
    onClose();
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?cat=${catalog.id}&page=1`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('catalogCard.linkCopied'));
    } catch {
      toast.error(t('catalogCard.linkCopyError'));
    }
    onClose();
  };

  // SURPRISE-S06: Use native share if available
  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?cat=${catalog.id}&page=1`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: catalog.title,
          text: t('catalogCard.shareText', { title: catalog.title }),
          url,
        });
      } catch (err) {
        // User cancelled or error occurred, fall back to clipboard
        await handleCopyLink();
      }
    } else {
      await handleCopyLink();
    }
    onClose();
  };

  const handlePrint = () => {
    const firstPage = catalog.pages[0];
    if (!firstPage) { onClose(); return; }
    
    // Fix 13: Validate URL to prevent javascript: protocol XSS
    try {
      const url = new URL(firstPage, window.location.href);
      if (!['http:', 'https:', 'data:'].includes(url.protocol)) {
        throw new Error('Invalid URL protocol');
      }
    } catch {
      console.error('Invalid image URL:', firstPage);
      onClose();
      return;
    }
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      // Fix 13: Use createElement instead of innerHTML to prevent XSS
      const html = `<html><body style="margin:0;padding:0;"><img src="${firstPage.replace(/"/g, '&quot;')}" style="max-width:100%;height:auto;" onload="window.print();window.close();"/></body></html>`;
      doc.write(html);
      doc.close();
    }
    setTimeout(() => document.body.removeChild(iframe), 5000);
    onClose();
  };

  // SURPRISE-06: Patient Handout Generator
  const handlePatientHandout = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    // Escape interpolated values to prevent HTML injection in the print document.
    const esc = (s: unknown): string =>
      String(s ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c)
      );

    // The handout follows the catalog's own language (not the current UI
    // language), since it's printed material meant for that catalog's reader.
    const handoutLang = catalog.language ?? 'fa';
    const ht = i18n.getFixedT(handoutLang);
    const dir = RTL_LANGS.includes(handoutLang) ? 'rtl' : 'ltr';
    const fontImport = handoutLang === 'ru'
      ? "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700;900&display=swap');"
      : "@import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap');";
    const fontFamily = handoutLang === 'ru' ? "'Noto Sans', sans-serif" : "'Vazirmatn', sans-serif";
    const dateLocale = { fa: 'fa-IR', en: 'en-US', ar: 'ar-SA', ru: 'ru-RU' }[handoutLang];

    const html = `<!DOCTYPE html>
<html lang="${handoutLang}" dir="${dir}">
<head>
<meta charset="UTF-8">
<title>${esc(ht('catalogCard.handoutTitle', { title: catalog.title }))}</title>
<style>
  ${fontImport}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${fontFamily}; direction: ${dir}; color: #1a1a1a; background: white; }
  .page { max-width: 210mm; height: 297mm; margin: 0 auto; padding: 20mm; display: flex; flex-direction: column; }
  .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #b61615; padding-bottom: 16px; margin-bottom: 20px; }
  .logo { width: 48px; height: 48px; background: #b61615; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; flex-shrink: 0; }
  .company { font-weight: 900; font-size: 16px; }
  .company-sub { font-size: 12px; color: #6b7280; }
  .catalog-title { font-size: 26px; font-weight: 900; color: #b61615; margin-bottom: 8px; }
  .catalog-cover { width: 100px; height: 140px; object-fit: cover; border-radius: 12px; float: ${dir === 'rtl' ? 'left' : 'right'}; margin: 0 12px 12px 12px; border: 2px solid #e2e8f0; flex-shrink: 0; }
  .description { font-size: 14px; line-height: 1.8; color: #374151; margin-bottom: 16px; }
  .patient-section { margin-top: 16px; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 16px; flex-grow: 1; }
  .patient-section h3 { font-size: 14px; font-weight: 700; color: #6b7280; margin-bottom: 12px; }
  .field { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; font-size: 13px; }
  .field-label { font-weight: 700; min-width: 80px; color: #374151; }
  .field-line { flex: 1; border-bottom: 1px solid #d1d5db; min-height: 20px; }
  .footer { margin-top: auto; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  @media print {
    .page { padding: 15mm; margin: 0; }
    body { background: white; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">📚</div>
    <div>
      <div class="company">${esc(ht('catalogCard.handoutCompany'))}</div>
      <div class="company-sub">${esc(ht('catalogCard.handoutPortalTagline'))}</div>
    </div>
  </div>
  <h1 class="catalog-title">${esc(catalog.title)}</h1>
  <img src="${esc(catalog.coverImage)}" class="catalog-cover" alt="" onerror="this.style.display='none'" />
  <p class="description">${esc(catalog.description)}</p>
  <div class="patient-section">
    <h3>${esc(ht('catalogCard.handoutPatientInfo'))}</h3>
    <div class="field"><span class="field-label">${esc(ht('catalogCard.handoutPatientName'))}</span><div class="field-line"></div></div>
    <div class="field"><span class="field-label">${esc(ht('catalogCard.handoutDate'))}</span><div class="field-line"></div></div>
    <div class="field"><span class="field-label">${esc(ht('catalogCard.handoutDoctorName'))}</span><div class="field-line"></div></div>
    <div class="field"><span class="field-label">${esc(ht('catalogCard.handoutInstructions'))}</span><div class="field-line" style="min-height:40px"></div></div>
  </div>
  <div class="footer">nafaspharmed.com · ${esc(ht('catalogCard.handoutPageCount', { count: catalog.pageCount }))} · ${new Date().toLocaleDateString(dateLocale)}</div>
</div>
<script>window.onload = () => window.print();</script>
</body></html>`;

    win.document.write(html);
    win.document.close();
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 bottom-full mb-2 z-30 bg-skin-card border border-skin-border rounded-xl shadow-xl overflow-hidden min-w-[160px] animate-fade-in"
    >
      {(catalog.pdfUrl || catalog.pages[0]) && (
        <button
          onClick={handleDownloadPdf}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-skin-text hover:bg-skin-control-bg transition-colors text-right"
        >
          <Download size={14} className="text-skin-primary shrink-0" />
          {catalog.pdfUrl ? t('catalogCard.downloadPdf') : t('catalogCard.viewNewTab')}
        </button>
      )}
      <button
        onClick={handleShare}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-skin-text hover:bg-skin-control-bg transition-colors text-right"
      >
        <Link2 size={14} className="text-skin-primary shrink-0" />
        {t('catalogCard.shareLink')}
      </button>
      <button
        onClick={handlePrint}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-skin-text hover:bg-skin-control-bg transition-colors text-right"
      >
        <Printer size={14} className="text-skin-primary shrink-0" />
        {t('catalogCard.printFirstPage')}
      </button>
      {/* SURPRISE-06: Patient Handout Generator */}
      <button
        onClick={handlePatientHandout}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-skin-text hover:bg-skin-control-bg transition-colors text-right"
      >
        <FileText size={14} className="text-skin-primary shrink-0" />
        {t('catalogCard.patientHandout')}
      </button>
      {/* SURPRISE-02: QR Code button */}
      <button
        onClick={() => {
          onShowQr?.();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-skin-text hover:bg-skin-control-bg transition-colors text-right border-t border-skin-border"
      >
        <QrCode size={14} className="text-skin-primary shrink-0" />
        QR Code
      </button>
    </div>
  );
};

const CatalogCard: React.FC<CatalogCardProps> = ({
  catalog,
  onClick,
  viewMode = 'grid',
  animationDelay = 0,
  isFavorite = false,
  onToggleFavorite,
  searchTerm = '',
}) => {
  const { t } = useTranslation();
  const [showPopover, setShowPopover] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [shimmerActive, setShimmerActive] = useState(false);

  // UX-09: Load saved reading progress
  const [savedPage, setSavedPage] = useState<number | null>(null);
  // SURPRISE-09: Check if this catalog is cached
  const isCached = useCachedCatalogs(catalog.id);

  useEffect(() => {
    const timer = setTimeout(() => setShimmerActive(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // SURPRISE-04: Handle speech synthesis end
  useEffect(() => {
    if (!isSpeaking) return;
    const checkSpeech = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        setIsSpeaking(false);
        clearInterval(checkSpeech);
      }
    }, 100);
    return () => clearInterval(checkSpeech);
  }, [isSpeaking]);

  // UX-09: Load reading progress on mount
  useEffect(() => {
    const progress = localStorage.getItem(`nafas_progress_${catalog.id}`);
    if (progress) {
      setSavedPage(parseInt(progress, 10));
    }
  }, [catalog.id]);

  const langData = LANG_BADGE[catalog.language ?? 'fa'];

  if (viewMode === 'list') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animationDelay, duration: 0.3 }}
          className="group bg-skin-card border border-skin-border rounded-2xl overflow-hidden cursor-pointer
            shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]
            hover:border-skin-primary/30 transition-all duration-300 flex relative"
          onClick={() => onClick(catalog)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(catalog); } }}
          aria-label={t('catalogCard.openCatalogAria', { title: catalog.title })}
        >
          {/* Fix 2.4 list: accent bar on right (RTL) */}
          <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-skin-primary rounded-r-2xl" />

          {/* Cover */}
          <div className="shrink-0 w-20 h-20 m-3 rounded-xl overflow-hidden bg-skin-control-bg">
            <SafeImage
              src={catalog.coverImage}
              alt={catalog.title}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 p-3 pr-0 flex flex-col justify-center gap-1">
            <h3
              className="font-bold text-skin-text text-sm leading-snug line-clamp-2"
              {...(catalog.language ? { lang: catalog.language, dir: langData.dir } : {})}
            >
              {highlightText(catalog.title, searchTerm)}
            </h3>
            <div className="flex items-center gap-2 text-xs text-skin-muted">
              <span>{catalog.category}</span>
              <span>·</span>
              <span>{t('catalogCard.pageCount', { count: catalog.pageCount })}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-skin-muted">
              <span>{langData.flag}</span>
              <span>{langData.label}</span>
            </div>
          </div>

          {/* Actions */}
          <div
            className="flex flex-col items-center justify-center gap-1 p-3 pl-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* REMAINING-04: Heart button in list view */}
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(catalog.id)}
                className="p-2 rounded-lg hover:bg-skin-control-bg text-skin-muted hover:text-red-500 transition-all"
                title={isFavorite ? t('favorites.removeTooltip') : t('catalogCard.addFavorite')}
                aria-label={isFavorite ? t('favorites.removeTooltip') : t('catalogCard.addFavorite')}
              >
                <Heart
                  size={16}
                  className={isFavorite ? 'fill-red-500 text-red-500' : ''}
                />
              </button>
            )}

            {/* SURPRISE-04: Voice companion button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isSpeaking) {
                  stopSpeaking();
                  setIsSpeaking(false);
                } else {
                  speakText(
                    `${catalog.title}. ${catalog.description}`,
                    SPEECH_LANG_MAP[catalog.language ?? 'fa']
                  );
                  setIsSpeaking(true);
                }
              }}
              className={`p-2 rounded-lg transition-all ${
                isSpeaking
                  ? 'text-skin-primary bg-skin-primary/10'
                  : 'text-skin-muted hover:text-skin-primary hover:bg-skin-control-bg'
              }`}
              title={isSpeaking ? t('catalogCard.stopListening') : t('catalogCard.listenDescription')}
              aria-label={isSpeaking ? t('catalogCard.stopListening') : t('catalogCard.listenDescription')}
            >
              {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowPopover(v => !v)}
                className="p-2 rounded-lg bg-skin-control-bg hover:bg-skin-primary hover:text-white text-skin-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary"
                title={t('catalogCard.actions')}
                aria-label={t('catalogCard.actions')}
              >
                <ChevronDown size={14} />
              </button>
              {showPopover && (
                <ActionPopover catalog={catalog} onClose={() => setShowPopover(false)} onShowQr={() => setShowQrModal(true)} />
              )}
            </div>
          </div>
        </motion.div>
        {/* SURPRISE-02: QR Modal */}
        {showQrModal && <QrModal catalog={catalog} onClose={() => setShowQrModal(false)} />}
      </>
    );
  }

  // Grid mode
  return (
    <>
      <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay, duration: 0.35, ease: 'easeOut' }}
      className="group bg-skin-card border border-skin-border rounded-2xl overflow-hidden cursor-pointer
        shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]
        hover:border-skin-primary/30 transition-all duration-300 flex flex-col relative"
      onClick={() => onClick(catalog, savedPage ?? 0)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(catalog, savedPage ?? 0); } }}
      aria-label={t('catalogCard.openCatalogAria', { title: catalog.title })}
    >
      {/* Cover — aspect-[2/3] as redesigned */}
      <div className="relative aspect-[2/3] overflow-hidden bg-skin-control-bg group">
        <SafeImage
          src={catalog.coverImage}
          alt={catalog.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />

        {/* SURPRISE-09: Offline cache indicator */}
        {isCached && (
          <span className="absolute top-2 left-2 z-10 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <Package size={8} /> {t('catalogCard.offlineBadge')}
          </span>
        )}

        {/* REMAINING-04: Favorite button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(catalog.id);
            }}
            className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-md transition-all"
            title={isFavorite ? t('favorites.removeTooltip') : t('catalogCard.addFavorite')}
            aria-label={isFavorite ? t('favorites.removeTooltip') : t('catalogCard.addFavorite')}
          >
            <Heart
              size={18}
              className={isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}
            />
          </button>
        )}

        {/* Shimmer overlay on hover */}
        {shimmerActive && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                animation: 'cardShimmer 1s ease-in-out',
              }}
            />
          </div>
        )}

        {/* Always-visible title with gradient background */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pb-2">
          <h3
            className="text-white text-sm font-bold leading-tight line-clamp-2 mb-2"
            {...(catalog.language ? { lang: catalog.language, dir: langData.dir } : {})}
          >
            {highlightText(catalog.title, searchTerm)}
          </h3>
          {/* Badges */}
          <div className="flex gap-1.5">
            {catalog.category && (
              <span className="backdrop-blur-md bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/20">
                {catalog.category}
              </span>
            )}
            <span className="backdrop-blur-md bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/20">
              {langData.flag} {langData.label}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-skin-border bg-skin-card">
        <div className="flex items-center gap-1.5 text-xs text-skin-muted min-w-0 flex-1">
          {/* UX-09: Show resume chip if progress exists */}
          {savedPage !== null && savedPage > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(catalog, savedPage); }}
              className="text-[10px] font-bold text-skin-primary bg-skin-primary/10 border border-skin-primary/30 rounded-full px-2 py-1 hover:bg-skin-primary hover:text-white transition-all truncate"
              title={t('catalogCard.resumeFromPage', { page: savedPage + 1 })}
            >
              {t('catalogCard.resumeFromPage', { page: savedPage + 1 })}
            </button>
          ) : (
            <>
              <FileText size={11} className="shrink-0 text-skin-primary" />
              <span className="truncate text-skin-text font-medium text-[11px]">{catalog.title}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-skin-muted">{t('catalogCard.pageCountShort', { count: catalog.pageCount })}</span>
          <div className="relative">
            <button
              onClick={() => setShowPopover(v => !v)}
              className="p-1.5 rounded-lg hover:bg-skin-control-bg text-skin-muted hover:text-skin-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary"
              title={t('catalogCard.actions')}
              aria-label={t('catalogCard.actions')}
            >
              <BookOpen size={13} />
            </button>
            {showPopover && (
              <ActionPopover catalog={catalog} onClose={() => setShowPopover(false)} onShowQr={() => setShowQrModal(true)} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
    {/* SURPRISE-02: QR Modal */}
    {showQrModal && <QrModal catalog={catalog} onClose={() => setShowQrModal(false)} />}
    </>
  );
};

export default React.memo(CatalogCard);
