import React, { useState, useMemo } from 'react';
import { X, Search, Phone, Hash, Building2, Factory, ChevronDown } from 'lucide-react';

interface PhoneDirectoryProps {
  open: boolean;
  onClose: () => void;
}

interface Extension {
  unit: string;
  person: string;
  ext: string;
  group?: number; // sub-group within the office (1..5)
}

const MAIN_LINE = '02192001520';

// دفتر مرکزی (پژوهشگاه) — ترتیب و زیرگروه‌بندی واحدها
const OFFICE: Extension[] = [
  // ۱) مدیریت و هیأت مدیره
  { group: 1, unit: 'مدیر عامل', person: 'آقای دکتر شمالی', ext: '120' },
  { group: 1, unit: 'رئیس هیأت مدیره - مدیر بهره‌برداری', person: 'آقای دکتر روحی', ext: '111' },
  { group: 1, unit: 'نائب رئیس هیأت مدیره، مدیر ارشد مالی و اقتصادی', person: 'آقای دکتر سلیمی', ext: '116' },
  // ۲) توسعه کسب‌وکار، رگولاتوری، بازرگانی، R&D، اداری و منابع انسانی
  { group: 2, unit: 'مدیر توسعه کسب‌وکار، قائم‌مقام مدیر عامل', person: 'خانم سمن فلاح', ext: '121' },
  { group: 2, unit: 'توسعه کسب‌وکار', person: 'آقای متین جعفری', ext: '122' },
  { group: 2, unit: 'مدیر رگولاتوری و زنجیره تأمین', person: 'خانم پریسا خدابنده', ext: '420' },
  { group: 2, unit: 'بازرگانی', person: 'آقای میثم پورعباس', ext: '410' },
  { group: 2, unit: 'تحقیق و توسعه', person: 'خانم عذرا طبسی', ext: '710' },
  { group: 2, unit: 'مسئول دفتر مدیریت', person: 'آقای آرمین رهنما راد', ext: '113' },
  { group: 2, unit: 'مدیر منابع انسانی', person: 'آقای حسین قاسمی', ext: '114' },
  { group: 2, unit: 'منابع انسانی', person: 'آقای علی قاسمی', ext: '114' },
  { group: 2, unit: 'خدمات', person: 'آقای علی ملکی', ext: '115' },
  // ۳) مالی و حسابداری
  { group: 3, unit: 'اعتبارات', person: 'خانم لیلا یادگاری', ext: '118' },
  { group: 3, unit: 'مدیر مالی', person: 'آقای امیر سبزعلی', ext: '510' },
  { group: 3, unit: 'مالی و حسابداری', person: 'آقای علی سمندر', ext: '510' },
  { group: 3, unit: 'مالی و حسابداری', person: 'آقای میلاد خسروی', ext: '510' },
  { group: 3, unit: 'مالی و حسابداری', person: 'آقای محمدرضا گل‌افشانی', ext: '510' },
  { group: 3, unit: 'مالی و حسابداری', person: 'آقای حسین ربانی‌فر', ext: '510' },
  // ۴) فناوری اطلاعات و گرافیک
  { group: 4, unit: 'فناوری اطلاعات', person: 'آقای محمدرضا ساعد', ext: '101' },
  { group: 4, unit: 'فروش - گرافیست', person: 'آقای سعید زرینی', ext: '101' },
  // ۵) فروش و مدیکال
  { group: 5, unit: 'مدیر فروش', person: 'خانم سیده مریم حسینی', ext: '210' },
  { group: 5, unit: 'فروش', person: 'خانم زهره حسینی', ext: '220' },
  { group: 5, unit: 'فروش', person: 'خانم مهتاب خرم', ext: '230' },
  { group: 5, unit: 'مدیکال', person: 'خانم نفیسه امن‌زاده', ext: '240' },
  { group: 5, unit: 'فروش', person: 'آقای سید محمدرضا حسینی', ext: '240' },
];

// کارخانه
const FACTORY: Extension[] = [
  { unit: 'رئیس هیأت مدیره - مدیر بهره‌برداری', person: 'آقای دکتر روحی', ext: '620' },
  { unit: 'اداری', person: 'خانم عطیه آفرینی', ext: '610' },
  { unit: 'منابع انسانی و آموزش', person: 'آقای علیرضا روستایی', ext: '621' },
  { unit: 'رئیس تولید', person: 'آقای سید مهدی کسایی', ext: '670' },
  { unit: 'مدیر تضمین کیفیت', person: 'آقای علی‌بابا صفری', ext: '810' },
  { unit: 'مدیر کنترل کیفیت', person: 'خانم تارا رحمانیان', ext: '910' },
  { unit: 'مدیر تحقیق و توسعه', person: 'آقای عبدالرحیم نوری', ext: '720' },
  { unit: 'رئیس برنامه‌ریزی و انبار', person: 'آقای بنیامین اسدی', ext: '690' },
];

// Soft, gentle tints — subtle in both light and dark themes.
const GROUP_TINT: Record<number, string> = {
  1: 'bg-rose-400/10',
  2: 'bg-amber-400/10',
  3: 'bg-emerald-400/10',
  4: 'bg-sky-400/10',
  5: 'bg-violet-400/10',
};
const FACTORY_TINT = 'bg-orange-400/10';

const matches = (e: Extension, q: string) =>
  e.unit.toLowerCase().includes(q) || e.person.toLowerCase().includes(q) || e.ext.includes(q);

const Row: React.FC<{ e: Extension; tint: string }> = ({ e, tint }) => (
  <a href={`tel:${MAIN_LINE},,${e.ext}`} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${tint} hover:brightness-95 dark:hover:brightness-110`}>
    <span className="w-9 h-9 shrink-0 rounded-lg bg-skin-card text-skin-primary flex items-center justify-center border border-skin-border"><Phone size={15} /></span>
    <span className="flex-1 min-w-0">
      <span className="block text-sm font-medium text-skin-text truncate">{e.unit}</span>
      <span className="block text-xs text-skin-muted truncate">{e.person}</span>
    </span>
    <span className="text-sm font-bold text-skin-primary tabular-nums font-mono">{e.ext}</span>
  </a>
);

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; count: number; open: boolean; onClick: () => void }> = ({ icon, title, count, open, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center gap-2 px-4 py-3 bg-skin-card hover:bg-skin-control-bg/60 transition-colors border-b border-skin-border">
    <span className="text-skin-primary">{icon}</span>
    <span className="flex-1 text-right text-sm font-bold text-skin-text">{title}</span>
    <span className="text-[11px] text-skin-muted">{count} داخلی</span>
    <ChevronDown size={16} className={`text-skin-muted transition-transform ${open ? 'rotate-180' : ''}`} />
  </button>
);

const PhoneDirectory: React.FC<PhoneDirectoryProps> = ({ open, onClose }) => {
  const [q, setQ] = useState('');
  const [openOffice, setOpenOffice] = useState(false);
  const [openFactory, setOpenFactory] = useState(false);
  const term = q.trim().toLowerCase();

  const office = useMemo(() => term ? OFFICE.filter(e => matches(e, term)) : OFFICE, [term]);
  const factory = useMemo(() => term ? FACTORY.filter(e => matches(e, term)) : FACTORY, [term]);

  if (!open) return null;

  // While searching, auto-expand the groups that have matches.
  const showOffice = (term ? office.length > 0 : openOffice);
  const showFactory = (term ? factory.length > 0 : openFactory);
  const empty = office.length === 0 && factory.length === 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-skin-card rounded-2xl shadow-2xl border border-skin-border flex flex-col max-h-[82vh] overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-skin-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-skin-primary/10 text-skin-primary flex items-center justify-center"><Hash size={16} /></span>
            <div className="leading-tight">
              <p className="font-bold text-sm text-skin-text">دفترچهٔ تلفن داخلی</p>
              <p className="text-[11px] text-skin-muted">شمارهٔ مرکزی: ۰۲۱ ۹۲۰۰ ۱۵۲۰</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-skin-muted hover:bg-skin-control-bg" aria-label="بستن"><X size={18} /></button>
        </div>

        {/* Search */}
        <div className="shrink-0 p-3 border-b border-skin-border">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-skin-muted" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="جست‌وجوی واحد، شخص یا شماره…" className="w-full pr-9 pl-3 py-2 text-sm bg-skin-control-bg border border-skin-border rounded-xl outline-none focus:border-skin-primary" />
          </div>
        </div>

        {/* Accordion groups */}
        <div className="flex-1 overflow-y-auto">
          {empty ? (
            <p className="p-8 text-center text-sm text-skin-muted">نتیجه‌ای یافت نشد.</p>
          ) : (
            <>
              {/* دفتر مرکزی */}
              <SectionHeader icon={<Building2 size={16} />} title="دفتر مرکزی (پژوهشگاه)" count={office.length} open={showOffice} onClick={() => setOpenOffice(v => !v)} />
              {showOffice && (
                <div>
                  {office.map((e, i) => <Row key={`o${i}`} e={e} tint={GROUP_TINT[e.group ?? 0] ?? ''} />)}
                </div>
              )}

              {/* کارخانه */}
              <SectionHeader icon={<Factory size={16} />} title="کارخانه" count={factory.length} open={showFactory} onClick={() => setOpenFactory(v => !v)} />
              {showFactory && (
                <div>
                  {factory.map((e, i) => <Row key={`f${i}`} e={e} tint={FACTORY_TINT} />)}
                </div>
              )}
            </>
          )}
        </div>

        <p className="shrink-0 px-4 py-2 text-[10px] text-skin-muted border-t border-skin-border text-center">با لمس هر ردیف، شمارهٔ مرکزی به‌همراه داخلی شماره‌گیری می‌شود.</p>
      </div>
    </div>
  );
};

export default PhoneDirectory;
