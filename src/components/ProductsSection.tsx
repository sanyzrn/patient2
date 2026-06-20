import React, { useRef, useState } from 'react';
import {
  BookMarked, BookOpen, ExternalLink, Wind, ThermometerSnowflake, Baby, Flower2, Stethoscope, type LucideIcon
} from 'lucide-react';
import { Catalog } from '../types';
import { PRODUCTS } from '../constants/products';

interface ProductsSectionProps {
  catalogs: Catalog[];
  onOpenCatalog: (c: Catalog) => void;
  sectionRef?: React.RefObject<HTMLElement | null>;
}

// Category-relevant icon per product (replaces the old 1…5 numbering).
const PRODUCT_ICONS: Record<string, LucideIcon> = {
  tiotoriva: Wind,
  coldanese: ThermometerSnowflake,
  megzolek: Baby,
  folinozit: Flower2,
  capsulizer: Stethoscope,
};

const ProductsSection: React.FC<ProductsSectionProps> = ({ catalogs, onOpenCatalog, sectionRef }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // RTL-safe active-slide tracking: pick the card whose centre is closest
  // to the scroller's centre (only relevant while the carousel is active).
  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const center = el.getBoundingClientRect().left + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const r = (child as HTMLElement).getBoundingClientRect();
      const c = r.left + r.width / 2;
      const d = Math.abs(c - center);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setActive(best);
  };

  const goToSlide = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    (el.children[i] as HTMLElement | undefined)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  return (
    <section ref={sectionRef} id="products" className="mb-12 scroll-mt-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-skin-primary"><BookMarked size={20} /></span>
            <h2 className="text-xl font-black text-skin-text tracking-tight">محصولات</h2>
          </div>
          <span className="text-xs font-bold bg-skin-primary/10 text-skin-primary px-2.5 py-1 rounded-full border border-skin-primary/20 tabular-nums">
            {PRODUCTS.length}
          </span>
        </div>
        <div className="h-px w-full" style={{ background: 'linear-gradient(to left, transparent, var(--color-border) 30%, var(--color-border) 70%, transparent)' }} />
        <p className="text-sm text-skin-muted mt-3">طیفی از فرآورده‌های دارویی، مکمل‌های تخصصی و تجهیزات پزشکی نوآورانه</p>
      </div>

      {/* Mobile carousel (one product per slide) · Desktop: all five in one row */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex lg:grid lg:grid-cols-5 gap-3 items-stretch overflow-x-auto lg:overflow-visible snap-x snap-mandatory scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0"
      >
        {PRODUCTS.map((product) => {
          const matchingCatalog = catalogs.find(c =>
            c.title.toLowerCase().includes(product.matchKeyword.toLowerCase()) ||
            c.category.toLowerCase().includes(product.matchKeyword.toLowerCase())
          );
          const Icon = PRODUCT_ICONS[product.id] ?? Wind;
          return (
            <article
              key={product.id}
              className="snap-center shrink-0 w-[80%] xs:w-[64%] sm:w-[46%] lg:w-auto bg-skin-card border border-skin-border rounded-2xl overflow-hidden flex flex-col hover:border-skin-primary/30 hover:shadow-[0_14px_40px_rgba(0,0,0,0.09)] lg:hover:-translate-y-1 transition-all"
            >
              {/* Square image — fills the card edge-to-edge (no white framing) */}
              <div className="relative aspect-square bg-white overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                />
                <span className="absolute top-3 right-3 w-10 h-10 rounded-xl bg-gradient-to-br from-skin-primary to-skin-primary-hover text-white flex items-center justify-center shadow-md">
                  <Icon size={20} />
                </span>
                <span className="absolute top-3 left-3 text-[11px] font-bold text-skin-primary bg-skin-primary/10 backdrop-blur-sm px-3 py-1 rounded-full">
                  {product.category}
                </span>
              </div>

              {/* Details */}
              <div className="p-4 flex flex-col gap-2.5 flex-1">
                <div>
                  <h3 className="font-black text-skin-text text-base leading-tight">{product.name}</h3>
                  <p className="text-[11px] font-bold text-skin-muted mt-0.5 tracking-wide" dir="ltr" style={{ textAlign: 'right' }}>{product.englishName}</p>
                </div>

                <p className="text-[12.5px] text-skin-muted leading-relaxed text-justify">{product.description}</p>

                <div className="mt-auto pt-2 flex flex-col gap-2">
                  {matchingCatalog && (
                    <button
                      onClick={() => onOpenCatalog(matchingCatalog)}
                      className="flex items-center justify-center gap-1.5 w-full border border-skin-primary/40 text-skin-primary hover:bg-skin-primary/10 text-xs font-bold py-2 rounded-xl transition-colors"
                    >
                      <BookOpen size={13} />
                      مشاهده کاتالوگ
                    </button>
                  )}

                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full bg-skin-primary hover:bg-skin-primary-hover text-white text-xs font-bold py-2 rounded-xl transition-colors"
                  >
                    صفحه محصول
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Pagination dots (carousel viewports only) */}
      <div className="flex lg:hidden items-center justify-center gap-2 mt-4">
        {PRODUCTS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => goToSlide(i)}
            aria-label={`محصول ${i + 1}`}
            className={`h-2 rounded-full transition-all ${active === i ? 'w-6 bg-skin-primary' : 'w-2 bg-skin-border'}`}
          />
        ))}
      </div>
    </section>
  );
};

export default ProductsSection;
