import { Catalog, Video, Banner } from './types';

// Helper to generate placeholder pages
const generatePages = (name: string, count: number) =>
  Array.from({ length: count }, (_, i) =>
    `https://placehold.co/595x842/b61615/FFFFFF?text=${encodeURIComponent(name)}+-+${i + 1}&font=roboto`
  );

export const BANNERS: Banner[] = [
  {
    id: 'b1',
    type: 'text',
    title: 'پورتال آموزشی نفس زیست فارمد',
    description: 'به جامع‌ترین پایگاه دانش نفس فارمد خوش آمدید. در اینجا می‌توانید به جدیدترین کاتالوگ‌ها، بروشورهای دارویی و ویدئوهای آموزشی دسترسی داشته باشید.',
  }
];

export const CATALOGS: Catalog[] = [
  {
    id: 'tiotoriva',
    title: 'تیوتوریوا',
    description: 'کاتالوگ انگلیسی کپسول استنشاقی تیوتوریوا',
    coverImage: 'https://placehold.co/595x842/b61615/FFFFFF?text=Tiotoriva+-+1&font=roboto',
    pdfUrl: 'https://nafaspharmed.com/wp-content/uploads/2025/11/Tiotoriva_EN_.pdf',
    date: '۱۴۰۳/۰۸/۱۰',
    pageCount: 6,
    category: 'تنفسی',
    language: 'en',
    pages: generatePages('Tiotoriva', 6),
    toc: [
      { title: 'معرفی محصول', page: 0 },
      { title: 'مکانیسم اثر', page: 2 },
      { title: 'عوارض جانبی', page: 4 }
    ]
  },
  {
    id: 'coldanese',
    title: 'کلدانیز پلاس',
    description: 'کاتالوگ انگلیسی اسپری بینی کلدانیز پلاس',
    coverImage: 'https://placehold.co/595x842/b61615/FFFFFF?text=Coldanese+-+1&font=roboto',
    pdfUrl: 'https://nafaspharmed.com/wp-content/uploads/2025/11/Coldanese_EN_G.pdf',
    date: '۱۴۰۳/۰۸/۱۰',
    pageCount: 4,
    category: 'تنفسی',
    language: 'en',
    pages: generatePages('Coldanese', 4),
    toc: [
      { title: 'مقدمه', page: 0 },
      { title: 'دستور مصرف', page: 2 }
    ]
  },
  {
    id: 'megzolek',
    title: 'مگلوزک',
    description: 'کاتالوگ انگلیسی ساشه مگلوزک',
    coverImage: 'https://placehold.co/595x842/b61615/FFFFFF?text=Megzolek+-+1&font=roboto',
    pdfUrl: 'https://nafaspharmed.com/wp-content/uploads/2025/11/Megzolek_En.pdf',
    date: '۱۴۰۳/۰۸/۱۰',
    pageCount: 4,
    category: 'مکمل',
    language: 'en',
    pages: generatePages('Megzolek', 4)
  },
  {
    id: 'folinozit',
    title: 'فولینوزیت',
    description: 'کاتالوگ انگلیسی ساشه فولینوزیت',
    coverImage: 'https://placehold.co/595x842/b61615/FFFFFF?text=Folinozit+-+1&font=roboto',
    pdfUrl: 'https://nafaspharmed.com/wp-content/uploads/2025/11/Folinozit_En.pdf',
    date: '۱۴۰۳/۰۸/۱۰',
    pageCount: 4,
    category: 'مکمل',
    language: 'en',
    pages: generatePages('Folinozit', 4)
  }
];

export const VIDEOS: Video[] = [
  {
    id: 'v1',
    title: 'معرفی شرکت نفس فارمد',
    description: 'آشنایی با خط تولید و محصولات شرکت دانش بنیان نفس فارمد',
    coverImage: 'https://placehold.co/1280x720/1e293b/FFFFFF?text=Nafas+Pharmed+Intro',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    date: '۱۴۰۳/۰۹/۰۱',
    duration: '۰۳:۴۵'
  },
  {
    id: 'v2',
    title: 'نحوه مصرف اسپری بینی',
    description: 'آموزش صحیح استفاده از اسپری‌های بینی برای اثربخشی بهتر',
    coverImage: 'https://placehold.co/1280x720/b61615/FFFFFF?text=Nasal+Spray+Guide',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    date: '۱۴۰۳/۰۹/۱۵',
    duration: '۰۱:۲۰'
  }
];
