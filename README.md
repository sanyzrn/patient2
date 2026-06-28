<div dir="rtl">

# آموزش و حمایت از بیمار | نفس زیست فارمد

پورتال جامع آموزش و حمایت از بیماران شرکت **نفس زیست فارمد**؛ شامل کاتالوگ‌های آموزشی تعاملی، بروشورهای دارویی (PDF با حالت کتاب‌خوان)، ویدئوهای آموزشی و پنل مدیریت محتوا.

اپلیکیشن یک **SPA** مبتنی بر React 19 + TypeScript است که به‌صورت **PWA** قابل نصب روی موبایل و دسکتاپ بوده و با یک بک‌اند سبک PHP برای ذخیرهٔ محتوا و احراز هویت مدیر کار می‌کند.

---

## ✨ امکانات

- **کاتالوگ‌های آموزشی** با جست‌وجوی پیشرفته (عنوان، توضیح و فهرست مطالب) به کمک Fuse.js
- **کتاب‌خوان PDF تعاملی** (`BookViewer`) با حالت ورق‌زدن، هایلایت، یادداشت‌گذاری و خروجی JSON یادداشت‌ها
- **پخش‌کنندهٔ ویدئو** آموزشی
- **پنل مدیریت** کامل برای ویرایش کاتالوگ‌ها، ویدئوها و بنرها (با جست‌وجو، CRUD، آمار، ورود/خروجی JSON و تغییر رمز عبور) بدون نیاز به استقرار مجدد
- **Command Palette** (جست‌وجوی سریع با صفحه‌کلید)، **علاقه‌مندی‌ها**، **رکورد مطالعه**، **QR Code** و افکت‌های UX
- **PWA**: کش آفلاین، نصب‌پذیری، به‌روزرسانی خودکار (Workbox)
- کاملاً **راست‌چین (RTL) و فارسی** با فونت وزیرمتن

---

## 🧱 پشتهٔ فنی

| لایه | فناوری |
|------|--------|
| فرانت‌اند | React 19، TypeScript 5.9، Vite 7 |
| استایل | Tailwind CSS 4 |
| انیمیشن | Motion |
| نمودار | Recharts |
| PDF | pdfjs-dist + react-pageflip |
| جست‌وجو | Fuse.js |
| PWA | vite-plugin-pwa (Workbox) |
| بک‌اند | PHP (بدون فریم‌ورک) |

---

## 📁 ساختار پروژه

</div>

```
.
├── index.html              # نقطهٔ ورود؛ data.js را قبل از اپ بارگذاری می‌کند
├── data.ts                 # دادهٔ پیش‌فرض کاتالوگ‌ها/ویدئوها/بنرها (منبع حقیقت)
├── vite.config.ts          # پیکربندی Vite + PWA + chunking
├── eslint.config.js        # پیکربندی ESLint (flat config)
├── .env.example            # نمونهٔ متغیرهای محیطی
├── scripts/
│   ├── dev-api.mjs         # سرور Mock API برای توسعه (احراز هویت/ذخیرهٔ محتوا)
│   └── sync-data.mjs       # data.ts → public/data.js
├── public/                 # دارایی‌های استاتیک + بک‌اند PHP
│   ├── api.php             # API مدیریت: ورود، ذخیرهٔ محتوا، تغییر رمز (توکن X-Admin-Token)
│   ├── rate_limit.php      # محدودسازی نرخ درخواست + throttle لاگین
│   ├── admin-credentials-manager.php  # ابزار CLI مدیریت رمز ادمین (bcrypt)
│   ├── data.js             # خروجی همگام‌شدهٔ data.ts
│   └── icon-*.png, favicon.svg, .htaccess
├── storage/                # خارج از ریشهٔ وب؛ رمز/توکن/محتوا (در .gitignore)
└── src/
    ├── main.tsx            # bootstrap React
    ├── App.tsx             # کامپوننت ریشه و مسیریابی
    ├── components/         # BookViewer, AdminPanel, CommandPalette, ...
    ├── context/            # CatalogContext
    ├── hooks/              # useFavorites, useReadingStreak, useCachedCatalogs, useFocusTrap, ...
    ├── utils/              # helpers, analytics, tts
    ├── constants/          # products, storageKeys, brand
    └── types.ts
```

<div dir="rtl">

---

## 🚀 راه‌اندازی

### پیش‌نیازها
- Node.js نسخهٔ ۱۸ یا بالاتر
- برای بک‌اند: PHP نسخهٔ ۸ یا بالاتر

### نصب و اجرای محیط توسعه

</div>

```bash
npm install
cp .env.example .env   # سپس مقادیر را در صورت نیاز ویرایش کنید
npm run dev            # اجرای هم‌زمان Mock API (:3001) و Vite (:5173)
```

<div dir="rtl">

رمز ادمینِ محیط توسعه از متغیر `DEV_ADMIN_PASSWORD` خوانده می‌شود؛ اگر تنظیم نشود مقدار `changeme-dev-only` استفاده می‌شود.

### اسکریپت‌ها

</div>

```bash
npm run dev        # اجرای هم‌زمان Mock API و Vite (cross-platform با concurrently)
npm run dev:api    # فقط Mock API
npm run typecheck  # بررسی نوع‌ها (tsc --noEmit)
npm run lint       # اجرای ESLint
npm run build      # ابتدا tsc --noEmit و سپس build تولیدی (بیلد روی خطای نوع شکست می‌خورد)
npm run preview    # پیش‌نمایش بیلد تولیدی
npm run sync-data  # همگام‌سازی data.ts → public/data.js
```

<div dir="rtl">

---

## 🔐 متغیرهای محیطی

نمونهٔ کامل در `.env.example` آمده است. فایل `.env` **هرگز نباید commit شود** (در `.gitignore` است). متغیرهای فرانت‌اند با پیشوند `VITE_` هستند:

</div>

```bash
# فرانت‌اند (Vite)
VITE_API_BASE_URL=.
VITE_WP_BASE_URL=https://nafaspharmed.com

# سرور توسعه (scripts/dev-api.mjs)
DEV_ADMIN_PASSWORD=changeme-dev-only
```

<div dir="rtl">

متغیرهای سمت سرور (PHP) باید در محیط وب‌سرور تنظیم شوند، نه در کد:

| متغیر | کاربرد |
|-------|--------|
| `NAFAS_ADMIN_PASSWORD_HASH` | هش bcrypt رمز ادمین؛ تا قبل از تنظیم آن، API پاسخ `503 Admin not configured` می‌دهد |
| `NAFAS_STORAGE_DIR` | مسیر مطلق محل ذخیرهٔ فایل‌های مخفی (خارج از ریشهٔ وب) |
| `ALLOWED_ORIGINS` | فهرست دامنه‌های مجاز CORS (با کاما جدا شوند)، مثلاً `https://patient.nafaspharmed.com` |

> اگر `ALLOWED_ORIGINS` تنظیم نشده باشد، به‌طور پیش‌فرض فقط `localhost:5173` و `localhost:3000` (محیط توسعه) مجاز هستند — هیچ‌گاه از `*` استفاده نمی‌شود.

### تأمین (provision) رمز مدیر

رمز ادمین **هرگز** در سورس یا باندل کلاینت ذخیره نمی‌شود و فقط به‌صورت هش bcrypt سمت سرور وجود دارد.

۱) ساخت هش bcrypt:

</div>

```bash
php -r "echo password_hash('your-strong-password', PASSWORD_BCRYPT), PHP_EOL;"
```

<div dir="rtl">

۲) مقدار هش را در اولین اجرا از طریق متغیر `NAFAS_ADMIN_PASSWORD_HASH` به بک‌اند بدهید. تا وقتی تنظیم نشود، API به‌جای ساختِ حساب با رمزِ معلوم، پاسخ `503 Admin not configured` می‌دهد.

۳) رمز را از بخش **تنظیمات ← تغییر رمز عبور** پنل مدیریت (یا ابزار CLI زیر) تغییر دهید. رمز پیش‌فرضِ قبلی در تاریخچهٔ git لو رفته و نباید دوباره استفاده شود.

### ابزار CLI مدیریت رمز (فقط روی سرور)

</div>

```bash
php public/admin-credentials-manager.php set <new-password>
php public/admin-credentials-manager.php show
php public/admin-credentials-manager.php reset          # پاک‌کردن credentials
php public/admin-credentials-manager.php clear-tokens
```

<div dir="rtl">

---

## 🔄 جریان داده

دادهٔ پیش‌فرض در `data.ts` نگه‌داری می‌شود. با اجرای `npm run sync-data` به `public/data.js` کپی می‌شود و `index.html` آن را قبل از اجرای React بارگذاری می‌کند. در محیط تولید، پنل مدیریت محتوا را از طریق `api.php` ذخیره می‌کند (در `storage/data/content.json`، خارج از ریشهٔ وب) و اپ نسخهٔ سروری را روی دادهٔ پیش‌فرض اولویت می‌دهد.

---

## 🛡️ نکات امنیتی استقرار

- فایل‌های مخفی/حالت بک‌اند (`.admin-credentials.json`، `.admin-tokens.json` و `data/content.json`) زیر پوشهٔ **`storage/` خارج از ریشهٔ وب** ذخیره می‌شوند و هرگز سرو نمی‌شوند؛ این پوشه در `.gitignore` است. محل آن را با `NAFAS_STORAGE_DIR` می‌توان تغییر داد.
- رمز ادمین با **bcrypt** هش می‌شود و توکن نشست با `random_bytes` ساخته و با `hash_equals` مقایسه می‌شود. اعتبارسنجی توکن روی هر درخواست، دیگر فایل توکن را بازنویسی نمی‌کند.
- لاگین مدیر در برابر brute-force محافظت می‌شود (حداکثر ۱۰ تلاش ناموفق در ۱۵ دقیقه برای هر IP). نرخ‌محدودیِ عمومی فقط روی درخواست‌های POST اعمال می‌شود، نه روی GETِ عمومی محتوا.
- آدرس‌ها (کاور، PDF و صفحات) هم سمت سرور و هم سمت کلاینت اعتبارسنجی می‌شوند و تنها `http(s)`/`data` پذیرفته می‌شود.
- CORS در همهٔ endpointهای PHP به `ALLOWED_ORIGINS` محدود است (بدون `*`). CSP اسکریپت‌های inline را مجاز نمی‌داند و هدر HSTS تنظیم شده است.

---

## 📦 استقرار

پس از `npm run build`، محتویات پوشهٔ `dist/` را روی هاست استاتیک قرار دهید و فایل‌های PHP داخل `public/` را روی یک سرور PHP منتشر کنید. پوشهٔ `storage/` را خارج از ریشهٔ وب بسازید و `NAFAS_ADMIN_PASSWORD_HASH` را تنظیم کنید. فایل `.htaccess` برای مسیریابی SPA و هدرهای امنیتی موجود است.

---

> شرکت نفس زیست فارمد — تمامی حقوق محفوظ است.

</div>
