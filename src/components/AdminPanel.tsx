import React, { useState } from 'react';
import {
  BookOpen, Video, Image, BarChart2, Plus, Edit2, Trash2,
  Save, ArrowRight, Database, Upload, Download, AlertTriangle,
  LayoutGrid, FileText, ChevronLeft, Copy, Search, Settings, LogOut, KeyRound
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCatalogs } from '../context/CatalogContext';
import { Catalog, Video as VideoType, Banner } from '../types';
import { API_URL } from '../config';
import ConfirmDialog from './ConfirmDialog';
import { getActivityHeatmapData, getTopCatalogs } from '../utils/analytics';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

type Tab = 'catalogs' | 'videos' | 'banners' | 'analytics' | 'settings';

interface AdminPanelProps {
  onClose: () => void;
}

// --- CSV Export helper (Fix 3.9) ---
function exportCatalogsCSV(catalogs: Catalog[]) {
  const header = 'id,title,category,language,pageCount,date\n';
  const rows = catalogs.map(c =>
    [c.id, `"${c.title}"`, `"${c.category}"`, c.language ?? 'fa', c.pageCount, `"${c.date}"`].join(',')
  ).join('\n');
  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'catalogs_export.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('فایل CSV خروجی گرفته شد.');
}

// Empty catalog form
const emptyCatalog = (): Catalog => ({
  id: crypto.randomUUID(), // Fix 25: Use crypto.randomUUID() instead of Date.now()
  title: '', description: '', coverImage: '', pages: [],
  date: '', pageCount: 0, category: '', language: 'fa', pdfUrl: ''
});

const emptyVideo = (): VideoType => ({
  id: crypto.randomUUID(), // Fix 25: Use crypto.randomUUID() instead of Date.now()
  title: '', description: '', coverImage: '',
  videoUrl: '', date: '', duration: ''
});

const emptyBanner = (): Banner => ({
  id: crypto.randomUUID(), // Fix 25: Use crypto.randomUUID() instead of Date.now()
  type: 'text', title: '', description: '', imageUrl: '', mobileImageUrl: '', link: ''
});

// --- Catalog Form ---
const CatalogForm: React.FC<{
  initial?: Catalog;
  onSave: (c: Catalog) => void;
  onCancel: () => void;
  existingCategories?: string[];
}> = ({ initial, onSave, onCancel, existingCategories = [] }) => {
  const [form, setForm] = useState<Catalog>(initial ?? emptyCatalog());
  const [pagesText, setPagesText] = useState((initial?.pages ?? []).join('\n'));
  const [tocText, setTocText] = useState((initial?.toc ?? []).map(t => `${t.page}|${t.title}`).join('\n'));

  const handleSave = () => {
    // Fix 17: Add validation for all required fields
    if (!form.title.trim()) { toast.error('عنوان الزامی است.'); return; }
    if (!form.description.trim()) { toast.error('توضیحات الزامی است.'); return; }
    if (!form.coverImage.trim()) { toast.error('آدرس تصویر کاور الزامی است.'); return; }
    if (!form.date.trim()) { toast.error('تاریخ الزامی است.'); return; }
    if (!form.category.trim()) { toast.error('دسته‌بندی الزامی است.'); return; }
    const pages = pagesText.split('\n').map(s => s.trim()).filter(Boolean);
    if (pages.length === 0) { toast.error('حداقل یک URL صفحه الزامی است.'); return; }
    
    // REMAINING-01: Parse TOC from textarea format "صفحه|عنوان"
    const toc = tocText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [pageStr, ...titleParts] = line.split('|');
        const page = parseInt((pageStr ?? '').trim(), 10);
        const title = titleParts.join('|').trim();
        return !isNaN(page) && title ? { page, title } : null;
      })
      .filter((entry) => entry !== null) as { page: number; title: string }[];
    
    onSave({ ...form, pages, pageCount: pages.length, toc: toc.length > 0 ? toc : undefined });
  };

  const fi = (field: keyof Catalog, value: string | number) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-1 gap-3">
        {([['title', 'عنوان'], ['description', 'توضیحات'], ['coverImage', 'آدرس تصویر کاور'], ['pdfUrl', 'آدرس PDF (اختیاری)'], ['date', 'تاریخ']] as [keyof Catalog, string][]).map(([field, label]) => (
          <div key={field}>
            <label className="text-xs text-skin-muted mb-1 block">{label}</label>
            <input
              className="w-full p-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all"
              value={(form[field] as string) ?? ''}
              onChange={(e) => fi(field, e.target.value)}
              placeholder={label}
            />
          </div>
        ))}
        {/* SURPRISE-03: Category field with autocomplete */}
        <div>
          <label className="text-xs text-skin-muted mb-1 block">دسته‌بندی</label>
          <input
            list="category-suggestions"
            className="w-full p-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all"
            value={form.category ?? ''}
            onChange={(e) => fi('category', e.target.value)}
            placeholder="دسته‌بندی"
          />
          <datalist id="category-suggestions">
            {existingCategories.map(cat => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-xs text-skin-muted mb-1 block">زبان</label>
          <select
            className="w-full p-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none"
            value={form.language ?? 'fa'}
            onChange={(e) => fi('language', e.target.value)}
          >
            <option value="fa">فارسی (FA)</option>
            <option value="en">انگلیسی (EN)</option>
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-skin-muted">آدرس صفحات (هر خط یک URL)</label>
            {/* SURPRISE-S04: Copy all URLs button */}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(pagesText).then(() => toast.success('تمام آدرس‌ها کپی شدند.'));
              }}
              className="text-[10px] text-skin-muted hover:text-skin-primary flex items-center gap-1 transition-colors"
              title="کپی تمام آدرس‌ها"
            >
              <Copy size={10} /> کپی همه
            </button>
          </div>
          <textarea
            className="w-full p-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all resize-y font-mono"
            rows={5}
            value={pagesText}
            onChange={(e) => setPagesText(e.target.value)}
            placeholder="https://example.com/page1.jpg"
            dir="ltr"
          />
        </div>
        <div>
          <label className="text-xs text-skin-muted mb-1 block">فهرست مطالب (اختیاری - صفحه|عنوان)</label>
          <textarea
            className="w-full p-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all resize-y font-mono"
            rows={4}
            value={tocText}
            onChange={(e) => setTocText(e.target.value)}
            placeholder="1|درس اول&#10;5|درس دوم"
          />
        </div>
        <div>
          <label className="text-xs text-skin-muted mb-1 block">تعداد صفحات</label>
          <p className="text-sm font-bold text-skin-text p-2 bg-skin-control-bg rounded-lg">
            {pagesText.split('\n').filter(Boolean).length} صفحه
          </p>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 bg-skin-primary hover:bg-skin-primary-hover text-white py-2 rounded-xl font-bold text-sm transition-colors">
          <Save size={14} /> ذخیره
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-skin-control-bg hover:bg-skin-control-hover text-skin-control-text rounded-xl text-sm font-medium transition-colors">
          انصراف
        </button>
      </div>
    </div>
  );
};

// --- Video Form ---
const VideoForm: React.FC<{
  initial?: VideoType;
  onSave: (v: VideoType) => void;
  onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState<VideoType>(initial ?? emptyVideo());
  const fi = (field: keyof VideoType, value: string) => setForm(f => ({ ...f, [field]: value }));

  // Fix 8: Add Persian labels for video form fields
  const VIDEO_FIELD_LABELS: Partial<Record<keyof VideoType, string>> = {
    title: 'عنوان ویدئو',
    description: 'توضیحات',
    coverImage: 'آدرس تصویر کاور',
    videoUrl: 'آدرس ویدئو',
    date: 'تاریخ',
    duration: 'مدت زمان (مثلاً ۵:۳۰)',
  };

  return (
    <div className="space-y-3 p-4">
      {(['title', 'description', 'coverImage', 'videoUrl', 'date', 'duration'] as (keyof VideoType)[]).map(field => (
        <div key={field}>
          <label className="text-xs text-skin-muted mb-1 block">{VIDEO_FIELD_LABELS[field] ?? field}</label>
          <input
            className="w-full p-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all"
            value={(form[field] as string) ?? ''}
            onChange={(e) => fi(field, e.target.value)}
            placeholder={VIDEO_FIELD_LABELS[field] ?? field}
            dir={field === 'videoUrl' || field === 'coverImage' ? 'ltr' : undefined}
          />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <button onClick={() => { if (!form.title.trim()) { toast.error('عنوان الزامی است.'); return; } onSave(form); }}
          className="flex-1 flex items-center justify-center gap-2 bg-skin-primary hover:bg-skin-primary-hover text-white py-2 rounded-xl font-bold text-sm transition-colors">
          <Save size={14} /> ذخیره
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-skin-control-bg hover:bg-skin-control-hover text-skin-control-text rounded-xl text-sm font-medium transition-colors">انصراف</button>
      </div>
    </div>
  );
};

// --- Banner Form ---
const BannerForm: React.FC<{
  initial?: Banner;
  onSave: (b: Banner) => void;
  onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState<Banner>(initial ?? emptyBanner());
  const fi = (field: keyof Banner, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="space-y-3 p-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-skin-muted mb-1 block">نوع بنر</label>
            <select className="w-full p-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none"
              value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value as 'text' | 'image' }))}>
              <option value="text">متنی (Text)</option>
              <option value="image">تصویری (Image)</option>
            </select>
          </div>
          {([
            ['title', 'عنوان'],
            ['description', 'توضیحات'],
            ['imageUrl', 'آدرس تصویر (دسکتاپ)'],
            ['mobileImageUrl', 'آدرس تصویر (موبایل)'],
            ['link', 'لینک مقصد'],
          ] as [keyof Banner, string][]).map(([field, label]) => (
            <div key={field}>
              <label className="text-xs text-skin-muted mb-1 block">{label}</label>
              <input className="w-full p-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none transition-all"
                value={(form[field] as string) ?? ''} onChange={(e) => fi(field, e.target.value)} placeholder={label}
                dir={(field === 'imageUrl' || field === 'mobileImageUrl' || field === 'link') ? 'ltr' : undefined} />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={() => onSave(form)}
              className="flex-1 flex items-center justify-center gap-2 bg-skin-primary hover:bg-skin-primary-hover text-white py-2 rounded-xl font-bold text-sm transition-colors">
              <Save size={14} /> ذخیره
            </button>
            <button onClick={onCancel} className="px-4 py-2 bg-skin-control-bg hover:bg-skin-control-hover text-skin-control-text rounded-xl text-sm font-medium transition-colors">انصراف</button>
          </div>
        </div>

        {/* MISSING-02: Live preview panel */}
        <div className="border border-skin-border rounded-xl overflow-hidden">
          <p className="text-xs text-skin-muted px-3 py-1.5 border-b border-skin-border bg-skin-control-bg font-medium">پیش‌نمایش</p>
          <div className="h-24 relative bg-gradient-to-l from-skin-primary/10 to-transparent flex items-center px-4">
            {form.type === 'image' && form.imageUrl ? (
              <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover absolute inset-0" onError={() => {}} />
            ) : (
              <div>
                <p className="font-black text-skin-text text-sm">{form.title || 'عنوان بنر'}</p>
                <p className="text-xs text-skin-muted mt-0.5 line-clamp-2">{form.description || 'توضیحات بنر'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Change Password Form ---
const ChangePasswordForm: React.FC = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!current || !next) { toast.error('همهٔ فیلدها الزامی است.'); return; }
    if (next.length < 8) { toast.error('رمز جدید باید حداقل ۸ کاراکتر باشد.'); return; }
    if (next !== confirm) { toast.error('رمز جدید و تکرار آن یکسان نیست.'); return; }
    const token = sessionStorage.getItem('admin_token');
    if (!token) { toast.error('نشست منقضی شده است. دوباره وارد شوید.'); return; }

    setBusy(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ action: 'change_password', current_password: current, new_password: next }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'رمز عبور تغییر کرد.');
        setCurrent(''); setNext(''); setConfirm('');
      } else {
        toast.error(data.error || 'تغییر رمز ناموفق بود.');
      }
    } catch {
      toast.error('ارتباط با سرور برقرار نشد.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 max-w-md">
      {([
        ['current', 'رمز فعلی', current, setCurrent],
        ['next', 'رمز جدید (حداقل ۸ کاراکتر)', next, setNext],
        ['confirm', 'تکرار رمز جدید', confirm, setConfirm],
      ] as [string, string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([key, label, value, setter]) => (
        <div key={key}>
          <label className="text-xs text-skin-muted mb-1 block">{label}</label>
          <input
            type="password"
            dir="ltr"
            className="w-full p-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all"
            value={value}
            onChange={(e) => setter(e.target.value)}
            placeholder={label}
          />
        </div>
      ))}
      <button onClick={busy ? undefined : submit} disabled={busy}
        className="flex items-center justify-center gap-2 bg-skin-primary hover:bg-skin-primary-hover text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors disabled:opacity-60">
        <KeyRound size={14} /> {busy ? 'در حال ذخیره...' : 'تغییر رمز عبور'}
      </button>
    </div>
  );
};

// ─── Main AdminPanel ──────────────────────────────────────────────────────────
const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { catalogs, videos, banners, addCatalog, updateCatalog, deleteCatalog, addVideo, updateVideo, deleteVideo, addBanner, updateBanner, deleteBanner, resetToDefault, importData, saveToServer, isSavingToServer } = useCatalogs();
  const [activeTab, setActiveTab] = useState<Tab>('catalogs');
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');

  // Reset the search box whenever the active tab changes.
  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setAddingNew(false);
    setEditingCatalog(null);
    setEditingVideo(null);
    setEditingBanner(null);
    setSearch('');
  };

  const q = search.trim().toLowerCase();
  const filteredCatalogs = q
    ? catalogs.filter(c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
    : catalogs;
  const filteredVideos = q
    ? videos.filter(v => v.title.toLowerCase().includes(q))
    : videos;
  const filteredBanners = q
    ? banners.filter(b => (b.title ?? '').toLowerCase().includes(q))
    : banners;

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState<{
    open: boolean; title: string; message: string;
    onConfirm: () => void; danger?: boolean;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const confirm = (title: string, message: string, onConfirm: () => void, danger = false) => {
    setConfirmState({ open: true, title, message, onConfirm, danger });
  };

  const handleDeleteCatalog = (id: string) =>
    confirm('حذف کاتالوگ', 'آیا مطمئن هستید؟ این عملیات قابل بازگشت نیست.', () => { deleteCatalog(id); toast.success('کاتالوگ حذف شد.'); }, true);

  const handleDeleteVideo = (id: string) =>
    confirm('حذف ویدئو', 'آیا مطمئن هستید؟', () => { deleteVideo(id); toast.success('ویدئو حذف شد.'); }, true);

  const handleDeleteBanner = (id: string) =>
    confirm('حذف بنر', 'آیا مطمئن هستید؟', () => { deleteBanner(id); toast.success('بنر حذف شد.'); }, true);

  const handleResetToDefault = () => {
    confirm(
      'بازگشت به حالت پیش‌فرض',
      'آیا مطمئن هستید؟ تمام تغییرات شما حذف و به حالت اولیه باز می‌گردد.',
      () => resetToDefault(() => Promise.resolve(true)),
      true
    );
  };

  const handleSaveToServer = async () => {
    const result = await saveToServer();
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };

  const handleLogout = () => {
    confirm('خروج از حساب', 'از پنل مدیریت خارج می‌شوید. ادامه می‌دهید؟', () => {
      sessionStorage.removeItem('admin_token');
      toast.success('خارج شدید.');
      onClose();
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (Array.isArray(json.catalogs)) {
          importData(json.catalogs, json.videos || [], json.banners);
          toast.success('داده‌ها با موفقیت وارد شدند.');
        } else toast.error('فرمت فایل نامعتبر است.');
      } catch { toast.error('خطا در خواندن فایل.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ catalogs, videos, banners }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nafas_data.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('فایل خروجی ایجاد شد.');
  };

  // Analytics data
  const topCatalogs = getTopCatalogs(10);
  const topCatalogCards = getTopCatalogs(3);
  const heatmapData = getActivityHeatmapData();
  const activityDays = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const key = date.toISOString().split('T')[0]!;
    return { date: key, count: heatmapData[key] ?? 0 };
  });
  const maxActivity = Math.max(1, ...activityDays.map(day => day.count));

  const viewsChartData = topCatalogs.map(([id, count]) => ({
    name: catalogs.find(c => c.id === id)?.title?.slice(0, 12) ?? id.slice(0, 8),
    بازدید: count,
  }));

  // Sidebar nav items
  // SURPRISE-03: Calculate existing categories for autocomplete
  const existingCategories = Array.from(new Set(catalogs.map(c => c.category).filter(Boolean)));

  const navItems: { id: Tab; icon: React.ReactNode; label: string; count?: number }[] = [
    { id: 'catalogs', icon: <BookOpen size={18} />, label: 'کاتالوگ‌ها', count: catalogs.length },
    { id: 'videos', icon: <Video size={18} />, label: 'ویدئوها', count: videos.length },
    { id: 'banners', icon: <Image size={18} />, label: 'بنرها', count: banners.length },
    { id: 'analytics', icon: <BarChart2 size={18} />, label: 'آمار' },
    { id: 'settings', icon: <Settings size={18} />, label: 'تنظیمات' },
  ];

  return (
    <div className="min-h-screen bg-skin-base flex flex-col">
      {/* Top bar */}
      <div className="bg-skin-card border-b border-skin-border px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-skin-primary/10 text-skin-primary flex items-center justify-center">
            <LayoutGrid size={16} />
          </div>
          <div>
            <h1 className="font-bold text-skin-text text-base">پنل مدیریت</h1>
            <p className="text-xs text-skin-muted hidden sm:block">نفس زیست فارمد</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSaveToServer} disabled={isSavingToServer}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-skin-primary hover:bg-skin-primary-hover text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-60">
            <Save size={12} />
            <span className="hidden sm:inline">{isSavingToServer ? 'در حال ذخیره...' : 'ذخیره روی سرور'}</span>
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950 text-red-600 rounded-lg text-xs font-medium transition-colors" title="خروج">
            <LogOut size={14} />
            <span className="hidden sm:inline">خروج</span>
          </button>
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-skin-control-bg hover:bg-skin-control-hover text-skin-control-text rounded-lg text-xs font-medium transition-colors">
            <ArrowRight size={14} />
            <span className="hidden sm:inline">بازگشت به سایت</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (desktop) — Fix 2.12 */}
        <div className={`hidden md:flex flex-col border-l border-skin-border bg-skin-card transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
          <div className="p-2 space-y-1 flex-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => switchTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? 'bg-skin-primary/10 text-skin-primary' : 'text-skin-muted hover:bg-skin-control-bg hover:text-skin-text'}`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-right">{item.label}</span>
                    {item.count !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === item.id ? 'bg-skin-primary text-white' : 'bg-skin-control-hover text-skin-muted'}`}>
                        {item.count}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-skin-border">
            <button onClick={() => setSidebarCollapsed(v => !v)} className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-skin-control-bg text-skin-muted hover:text-skin-text transition-colors">
              <ChevronLeft size={16} className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden flex border-b border-skin-border bg-skin-card overflow-x-auto scrollbar-hide w-full absolute top-[57px] z-20">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => switchTab(item.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === item.id ? 'border-skin-primary text-skin-primary' : 'border-transparent text-skin-muted hover:text-skin-text'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto md:pt-0 pt-12">
          {/* CATALOGS */}
          {activeTab === 'catalogs' && (
            <div>
              <div className="flex items-center justify-between gap-3 p-4 border-b border-skin-border sticky top-0 bg-skin-base z-10">
                <h2 className="font-bold text-skin-text flex items-center gap-2"><BookOpen size={16} className="text-skin-primary" /> کاتالوگ‌ها ({catalogs.length})</h2>
                <button onClick={() => { setAddingNew(true); setEditingCatalog(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-skin-primary hover:bg-skin-primary-hover text-white rounded-lg text-xs font-bold transition-colors">
                  <Plus size={12} /> افزودن
                </button>
              </div>

              <div className="p-3 border-b border-skin-border">
                <div className="relative">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-skin-muted" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجو در عنوان یا دسته‌بندی…"
                    className="w-full pr-9 pl-3 py-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none transition-all" />
                </div>
              </div>

              {addingNew && !editingCatalog && (
                <div className="border-b border-skin-border bg-skin-card/50">
                  <div className="px-4 pt-3 pb-1 text-xs font-bold text-skin-primary">افزودن کاتالوگ جدید</div>
                  <CatalogForm existingCategories={existingCategories} onSave={(c) => { addCatalog(c); setAddingNew(false); toast.success('کاتالوگ اضافه شد.'); }} onCancel={() => setAddingNew(false)} />
                </div>
              )}

              {filteredCatalogs.length === 0 && (
                <div className="p-10 text-center text-sm text-skin-muted">
                  {catalogs.length === 0 ? 'هنوز کاتالوگی اضافه نشده است.' : 'نتیجه‌ای یافت نشد.'}
                </div>
              )}

              <div className="divide-y divide-skin-border">
                {filteredCatalogs.map(cat => (
                  <div key={cat.id}>
                    {editingCatalog?.id === cat.id ? (
                      <div className="bg-skin-card/50">
                        <div className="px-4 pt-3 pb-1 text-xs font-bold text-skin-primary">ویرایش کاتالوگ</div>
                        <CatalogForm
                          initial={cat}
                          existingCategories={existingCategories}
                          onSave={(c) => { updateCatalog(cat.id, c); setEditingCatalog(null); toast.success('ذخیره شد.'); }}
                          onCancel={() => setEditingCatalog(null)}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-skin-control-bg/50 transition-colors">
                        <img src={cat.coverImage} alt={cat.title} className="w-10 h-10 rounded-lg object-cover bg-skin-control-bg shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23f1f5f9\'/%3E%3C/svg%3E'; }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-skin-text truncate">{cat.title}</p>
                          <p className="text-xs text-skin-muted">{cat.category} · {cat.pageCount} صفحه · {cat.language?.toUpperCase()}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setEditingCatalog(cat)} className="p-1.5 rounded-lg hover:bg-skin-control-bg text-skin-muted hover:text-skin-primary transition-colors"><Edit2 size={13} /></button>
                          <button onClick={() => {
                            addCatalog({ ...cat, id: crypto.randomUUID(), title: `${cat.title} (کپی)` });
                            toast.success('کاتالوگ تکثیر شد');
                          }} className="p-1.5 rounded-lg hover:bg-skin-control-bg text-skin-muted hover:text-skin-primary transition-colors"><Copy size={13} /></button>
                          <button onClick={() => handleDeleteCatalog(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-skin-muted hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIDEOS */}
          {activeTab === 'videos' && (
            <div>
              <div className="flex items-center justify-between gap-3 p-4 border-b border-skin-border sticky top-0 bg-skin-base z-10">
                <h2 className="font-bold text-skin-text flex items-center gap-2"><Video size={16} className="text-skin-primary" /> ویدئوها ({videos.length})</h2>
                <button onClick={() => { setAddingNew(true); setEditingVideo(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-skin-primary hover:bg-skin-primary-hover text-white rounded-lg text-xs font-bold transition-colors">
                  <Plus size={12} /> افزودن
                </button>
              </div>
              <div className="p-3 border-b border-skin-border">
                <div className="relative">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-skin-muted" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجو در عنوان…"
                    className="w-full pr-9 pl-3 py-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none transition-all" />
                </div>
              </div>
              {addingNew && !editingVideo && (
                <div className="border-b border-skin-border bg-skin-card/50">
                  <VideoForm onSave={(v) => { addVideo(v); setAddingNew(false); toast.success('ویدئو اضافه شد.'); }} onCancel={() => setAddingNew(false)} />
                </div>
              )}
              {filteredVideos.length === 0 && (
                <div className="p-10 text-center text-sm text-skin-muted">
                  {videos.length === 0 ? 'هنوز ویدئویی اضافه نشده است.' : 'نتیجه‌ای یافت نشد.'}
                </div>
              )}
              <div className="divide-y divide-skin-border">
                {filteredVideos.map(vid => (
                  <div key={vid.id}>
                    {editingVideo?.id === vid.id ? (
                      <div className="bg-skin-card/50">
                        <VideoForm initial={vid} onSave={(v) => { updateVideo(vid.id, v); setEditingVideo(null); toast.success('ذخیره شد.'); }} onCancel={() => setEditingVideo(null)} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-skin-control-bg/50 transition-colors">
                        <img src={vid.coverImage} alt={vid.title} className="w-16 h-10 rounded-lg object-cover bg-skin-control-bg shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'64\' height=\'40\' viewBox=\'0 0 64 40\'%3E%3Crect width=\'64\' height=\'40\' fill=\'%23f1f5f9\'/%3E%3C/svg%3E'; }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-skin-text truncate">{vid.title}</p>
                          <p className="text-xs text-skin-muted">{vid.duration ?? '—'} · {vid.date}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setEditingVideo(vid)} className="p-1.5 rounded-lg hover:bg-skin-control-bg text-skin-muted hover:text-skin-primary transition-colors"><Edit2 size={13} /></button>
                          <button onClick={() => handleDeleteVideo(vid.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-skin-muted hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BANNERS */}
          {activeTab === 'banners' && (
            <div>
              <div className="flex items-center justify-between gap-3 p-4 border-b border-skin-border sticky top-0 bg-skin-base z-10">
                <h2 className="font-bold text-skin-text flex items-center gap-2"><Image size={16} className="text-skin-primary" /> بنرها ({banners.length})</h2>
                <button onClick={() => { setAddingNew(true); setEditingBanner(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-skin-primary hover:bg-skin-primary-hover text-white rounded-lg text-xs font-bold transition-colors">
                  <Plus size={12} /> افزودن
                </button>
              </div>
              <div className="p-3 border-b border-skin-border">
                <div className="relative">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-skin-muted" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجو در عنوان…"
                    className="w-full pr-9 pl-3 py-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none transition-all" />
                </div>
              </div>
              {addingNew && !editingBanner && (
                <div className="border-b border-skin-border bg-skin-card/50">
                  <BannerForm onSave={(b) => { addBanner(b); setAddingNew(false); toast.success('بنر اضافه شد.'); }} onCancel={() => setAddingNew(false)} />
                </div>
              )}
              {filteredBanners.length === 0 && (
                <div className="p-10 text-center text-sm text-skin-muted">
                  {banners.length === 0 ? 'هنوز بنری اضافه نشده است.' : 'نتیجه‌ای یافت نشد.'}
                </div>
              )}
              <div className="divide-y divide-skin-border">
                {filteredBanners.map(ban => (
                  <div key={ban.id}>
                    {editingBanner?.id === ban.id ? (
                      <div className="bg-skin-card/50">
                        <BannerForm initial={ban} onSave={(b) => { updateBanner(ban.id, b); setEditingBanner(null); toast.success('ذخیره شد.'); }} onCancel={() => setEditingBanner(null)} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-skin-control-bg/50 transition-colors">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ban.type === 'image' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                          {ban.type === 'image' ? <Image size={14} /> : <FileText size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-skin-text truncate">{ban.title || '(بی‌عنوان)'}</p>
                          <p className="text-xs text-skin-muted">{ban.type === 'image' ? 'تصویری' : 'متنی'}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setEditingBanner(ban)} className="p-1.5 rounded-lg hover:bg-skin-control-bg text-skin-muted hover:text-skin-primary transition-colors"><Edit2 size={13} /></button>
                          <button onClick={() => handleDeleteBanner(ban.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-skin-muted hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="p-4 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-skin-text flex items-center gap-2"><BarChart2 size={16} className="text-skin-primary" /> آمار و تحلیل</h2>
                {/* Fix 3.9: CSV export */}
                <button onClick={() => exportCatalogsCSV(catalogs)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-skin-control-bg hover:bg-skin-control-hover text-skin-control-text rounded-lg text-xs font-medium transition-colors">
                  <Download size={12} /> خروجی CSV
                </button>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'کاتالوگ', value: catalogs.length, icon: <BookOpen size={16} /> },
                  { label: 'ویدئو', value: videos.length, icon: <Video size={16} /> },
                  { label: 'بنر', value: banners.length, icon: <Image size={16} /> },
                ].map(s => (
                  <div key={s.label} className="bg-skin-card border border-skin-border rounded-xl p-3 text-center">
                    <div className="text-skin-primary mb-1 flex justify-center">{s.icon}</div>
                    <p className="text-2xl font-black text-skin-text">{s.value}</p>
                    <p className="text-xs text-skin-muted">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-skin-card border border-skin-border rounded-xl p-4">
                  <h3 className="text-sm font-bold text-skin-text mb-3">۳ کاتالوگ پربازدید</h3>
                  <div className="space-y-2">
                    {topCatalogCards.length > 0 ? topCatalogCards.map(([id, count], index) => (
                      <div key={id} className="flex items-center gap-3 text-sm">
                        <span className="w-6 h-6 rounded-lg bg-skin-primary/10 text-skin-primary flex items-center justify-center text-xs font-bold">{index + 1}</span>
                        <span className="flex-1 min-w-0 truncate text-skin-text">{catalogs.find(c => c.id === id)?.title ?? id}</span>
                        <span className="text-xs font-bold text-skin-muted tabular-nums">{count}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-skin-muted">هنوز بازدیدی ثبت نشده است.</p>
                    )}
                  </div>
                </div>

                <div className="bg-skin-card border border-skin-border rounded-xl p-4">
                  <h3 className="text-sm font-bold text-skin-text mb-3">فعالیت ۱۴ روز اخیر</h3>
                  <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
                    {activityDays.map(day => (
                      <div
                        key={day.date}
                        title={`${day.date}: ${day.count}`}
                        className="h-8 rounded-md border border-skin-border"
                        style={{
                          backgroundColor: day.count === 0
                            ? 'var(--color-bg-control)'
                            : `color-mix(in srgb, var(--color-primary) ${Math.max(18, (day.count / maxActivity) * 100)}%, var(--color-bg-card))`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Views chart */}
              {viewsChartData.length > 0 && (
                <div className="bg-skin-card border border-skin-border rounded-xl p-4">
                  <h3 className="text-sm font-bold text-skin-text mb-3">بازدید کاتالوگ‌ها</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={viewsChartData} layout="vertical" margin={{ right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="بازدید" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Data management */}
              <div className="bg-skin-card border border-skin-border rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-skin-text flex items-center gap-2"><Database size={14} className="text-skin-primary" /> مدیریت داده</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 bg-skin-control-bg hover:bg-skin-control-hover text-skin-control-text rounded-xl text-xs font-medium cursor-pointer transition-colors justify-center">
                    <Upload size={12} /> وارد کردن JSON
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                  <button onClick={handleExportJSON} className="flex items-center gap-2 px-3 py-2 bg-skin-control-bg hover:bg-skin-control-hover text-skin-control-text rounded-xl text-xs font-medium transition-colors justify-center">
                    <Download size={12} /> خروجی JSON
                  </button>
                </div>
                <button onClick={handleResetToDefault} className="w-full flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950 text-red-600 rounded-xl text-xs font-medium transition-colors justify-center">
                  <AlertTriangle size={12} /> بازگشت به حالت پیش‌فرض
                </button>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === 'settings' && (
            <div className="p-4 space-y-6">
              <h2 className="font-bold text-skin-text flex items-center gap-2"><Settings size={16} className="text-skin-primary" /> تنظیمات</h2>

              <div className="bg-skin-card border border-skin-border rounded-xl p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-skin-text flex items-center gap-2"><KeyRound size={14} className="text-skin-primary" /> تغییر رمز عبور</h3>
                  <p className="text-xs text-skin-muted mt-1">برای امنیت بیشتر، رمز پیش‌فرض را در اولین فرصت تغییر دهید.</p>
                </div>
                <ChangePasswordForm />
              </div>

              <div className="bg-skin-card border border-skin-border rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-skin-text flex items-center gap-2"><LogOut size={14} className="text-red-600" /> نشست</h3>
                <p className="text-xs text-skin-muted">با خروج، نشست فعلی پایان می‌یابد و برای ورود دوباره باید رمز عبور را وارد کنید.</p>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950 text-red-600 rounded-xl text-xs font-bold transition-colors">
                  <LogOut size={14} /> خروج از حساب
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        danger={confirmState.danger}
        onConfirm={() => { confirmState.onConfirm(); setConfirmState(s => ({ ...s, open: false })); }}
        onCancel={() => setConfirmState(s => ({ ...s, open: false }))}
      />
    </div>
  );
};

export default AdminPanel;
