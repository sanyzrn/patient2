// Single source of truth for the company's product line, shown in the
// "محصولات" section. Descriptions are kept roughly equal in length so the
// product cards render at a uniform height.

export interface Product {
  id: string;
  name: string;          // Persian brand name
  englishName: string;   // Latin brand name
  category: string;      // therapeutic / product category
  description: string;
  image: string;         // square product image
  link: string;          // official product page
  matchKeyword: string;  // used to link a product to its catalog, if any
}

export const PRODUCTS: Product[] = [
  {
    id: 'tiotoriva',
    name: 'تیوتوریوا',
    englishName: 'TioToriva',
    category: 'داروهای تنفسی',
    description:
      'داروی استنشاقی پودر خشک حاوی ۱۸ میکروگرم تیوتروپیوم، آنتاگونیست طولانی‌اثر گیرنده‌های موسکارینی (LAMA). به‌عنوان درمان نگهدارندهٔ روزانهٔ بیماری مزمن انسدادی ریه (COPD)، راه‌های هوایی را گشاد کرده و عملکرد ریوی را بهبود می‌بخشد.',
    image: 'https://nafaspharmed.com/up/wp-content/uploads/2026/05/TiotorivaSq.webp',
    link: 'https://nafaspharmed.com/tio-toriva/',
    matchKeyword: 'تیوتوریوا',
  },
  {
    id: 'coldanese',
    name: 'کلدانیز پلاس',
    englishName: 'Coldanese Plus',
    category: 'سلامت دستگاه تنفسی',
    description:
      'فرآورده‌ای حمایتی با فرمولاسیون تخصصی برای دستگاه تنفسی فوقانی. در تسکین علائم عفونت‌های شایع ویروسی نظیر سرماخوردگی و آنفلوانزا، کاهش گرفتگی و حمایت از روند بهبود طبیعی بدن نقش مؤثری ایفا می‌کند.',
    image: 'https://nafaspharmed.com/up/wp-content/uploads/2026/05/Coldanesep.webp',
    link: 'https://nafaspharmed.com/coldanese-plus/',
    matchKeyword: 'کلدانیز',
  },
  {
    id: 'meglozek',
    name: 'مگلوزک',
    englishName: 'Meglozek',
    category: 'سلامت اطفال و کودکان',
    description:
      'مکمل تخصصی متناسب با نیازهای فیزیولوژیک کودکان و نوزادان. با ترکیبات ایمن و سازگار و پروفایل تحمل‌پذیری مطلوب، به تأمین ریزمغذی‌های ضروری و حمایت از رشد و سلامت کودکان کمک می‌کند.',
    image: 'https://nafaspharmed.com/up/wp-content/uploads/2026/05/meglozeksq.webp',
    link: 'https://nafaspharmed.com/meglozek/',
    matchKeyword: 'مگلوزک',
  },
  {
    id: 'folinozit',
    name: 'فولینوزیت',
    englishName: 'Folinozit',
    category: 'سلامت زنان',
    description:
      'مکمل تخصصی سلامت بانوان با ترکیبی هدفمند از فولات و ریزمغذی‌های ضروری. از فرآیندهای متابولیک، سلامت دوران باروری و عملکرد طبیعی بدن حمایت کرده و کمبودهای تغذیه‌ای رایج را جبران می‌کند.',
    image: 'https://nafaspharmed.com/up/wp-content/uploads/2026/05/foli.webp',
    link: 'https://nafaspharmed.com/folinozit/',
    matchKeyword: 'فولینوزیت',
  },
  {
    id: 'capsulizer',
    name: 'کپسولایزر',
    englishName: 'Capsulizer',
    category: 'تجهیزات پزشکی',
    description:
      'دستگاه استنشاق کپسولی با طراحی ارگونومیک که دارورسانی پودر خشک به ریه‌ها را بهینه می‌کند. آزادسازی دقیق دوز، تأیید بصری مصرف کامل دارو و کاربری آسان برای همهٔ گروه‌های سنی به‌ویژه سالمندان را فراهم می‌سازد.',
    image: 'https://nafaspharmed.com/up/wp-content/uploads/2026/05/capsulizer1.webp',
    link: 'https://nafaspharmed.com/capsulizer/',
    matchKeyword: 'کپسولایزر',
  },
];
