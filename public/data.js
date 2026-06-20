/**
 * ═══════════════════════════════════════════════════════════
 *  SOURCE OF TRUTH — نسخه اصلی داده‌ها
 * ═══════════════════════════════════════════════════════════
 *
 *  This file is the canonical data source for the Nafas Pharmed
 *  patient-education portal. After any edit, run:
 *
 *      npm run sync-data
 *
 *  to copy this file to `public/data.js`, which the production
 *  site loads as a fallback when the PHP API is unavailable.
 *
 *  DO NOT edit `public/data.js` directly — always edit this file.
 * ═══════════════════════════════════════════════════════════
 */

window.NAFAS_DATA = {
  catalogs: [
    {
      "id": "1767171413189",
      "title": "کاتالوگ فارسی محصولات",
      "description": "کاتالوگ فارسی محصولات",
      "date": "آخرین بروزرسانی: ۱۴۰۱/۱۰/۱۰",
      "pdfUrl": "https://patient.nafaspharmed.com/doc/Nafas_General_catalog.pdf",
      "coverImage": "https://patient.nafaspharmed.com/doc/cat_fa/general/01.jpg",
      "pages": [
        "https://patient.nafaspharmed.com/doc/cat_fa/general/01.jpg",
        "https://patient.nafaspharmed.com/doc/cat_fa/general/02.jpg",
        "https://patient.nafaspharmed.com/doc/cat_fa/general/03.jpg",
        "https://patient.nafaspharmed.com/doc/cat_fa/general/04.jpg",
        "https://patient.nafaspharmed.com/doc/cat_fa/general/05.jpg",
        "https://patient.nafaspharmed.com/doc/cat_fa/general/06.jpg",
        "https://patient.nafaspharmed.com/doc/cat_fa/general/07.jpg"
      ],
      "pageCount": 7,
      "category": "عمومی",
      "language": "fa"
    },
    {
      "id": "1767083039275",
      "title": "فولینوزیت",
      "description": "کاتالوگ فارسی فولینوزیت",
      "date": "آخرین بروزرسانی: ۱۴۰۴/۱۰/۹",
      "pdfUrl": "https://patient.nafaspharmed.com/doc/cat_fa/Folinozit_Fa.pdf",
      "coverImage": "https://patient.nafaspharmed.com/doc/cat_fa/folinozit/Folinozit_A5_dpi600.jpg",
      "pages": [
        "https://patient.nafaspharmed.com/doc/cat_fa/folinozit/Folinozit_A5_dpi600.jpg",
        "https://patient.nafaspharmed.com/doc/cat_fa/folinozit/Folinozit_A5_dpi600_02.jpg"
      ],
      "pageCount": 2,
      "category": "فولینوزیت",
      "language": "fa"
    },
    {
      "id": "1767082937884",
      "title": "تیوتوریوا",
      "description": "کاتالوگ فارسی تیوتوریوا",
      "date": "آخرین بروزرسانی: ۱۴۰۴/۱۰/۹",
      "pdfUrl": "https://patient.nafaspharmed.com/doc/cat_fa/Tiotoriva_Fa.pdf",
      "coverImage": "https://patient.nafaspharmed.com/doc/cat_fa/tiotoriva/Tiotoriva_A5_dpi600.jpg",
      "pages": [
        "https://patient.nafaspharmed.com/doc/cat_fa/tiotoriva/Tiotoriva_A5_dpi600.jpg",
        "https://patient.nafaspharmed.com/doc/cat_fa/tiotoriva/Tiotoriva_02_251224.jpg"
      ],
      "pageCount": 2,
      "category": "تیوتوریوا",
      "language": "fa"
    },
    {
      "id": "1767082754900",
      "title": "کلدانیز پلاس",
      "description": "کاتالوگ فارسی اسپری بینی کلدانیز پلاس",
      "date": "آخرین بروزرسانی: ۱۴۰۴/۱۰/۹",
      "pdfUrl": "https://patient.nafaspharmed.com/doc/cat_fa/Coldanese_Fa_B.pdf",
      "coverImage": "https://patient.nafaspharmed.com/doc/cat_fa/coldanese/Coldanese_A5_dpi600_B.jpg",
      "pages": [
        "https://patient.nafaspharmed.com/doc/cat_fa/coldanese/Coldanese_A5_dpi600_B.jpg",
        "https://patient.nafaspharmed.com/doc/cat_fa/coldanese/Coldanese_02_251224.jpg"
      ],
      "pageCount": 2,
      "category": "کلدانیز پلاس",
      "language": "fa"
    },
    {
      "id": "1767082343417",
      "title": "فولینوزیت (en)",
      "description": "ساشه فولینوزیت",
      "date": "آخرین بروزرسانی: ۱۴۰۴/۱۰/۹",
      "pdfUrl": "https://patient.nafaspharmed.com/doc/folinozit_en.pdf",
      "coverImage": "https://patient.nafaspharmed.com/doc/cat_en/folinozit/01.jpg",
      "pages": [
        "https://patient.nafaspharmed.com/doc/cat_en/folinozit/01.jpg",
        "https://patient.nafaspharmed.com/doc/cat_en/folinozit/02.jpg",
        "https://patient.nafaspharmed.com/doc/cat_en/folinozit/03.jpg",
        "https://patient.nafaspharmed.com/doc/cat_en/folinozit/04.jpg"
      ],
      "pageCount": 4,
      "category": "فولینوزیت",
      "language": "en"
    },
    {
      "id": "1767081414879",
      "title": "تیوتوریوا (en)",
      "description": "کاتالوگ انگلیسی کپسول استنشاقی تیوتوریوا",
      "date": "آخرین بروزرسانی: ۱۴۰۴/۱۰/۹",
      "pdfUrl": "https://patient.nafaspharmed.com/doc/Titoriva_En.pdf",
      "coverImage": "https://patient.nafaspharmed.com/doc/cat_en/tiotoriva/01.jpg",
      "pages": [
        "https://patient.nafaspharmed.com/doc/cat_en/tiotoriva/01.jpg",
        "https://patient.nafaspharmed.com/doc/cat_en/tiotoriva/02.jpg",
        "https://patient.nafaspharmed.com/doc/cat_en/tiotoriva/03.jpg",
        "https://patient.nafaspharmed.com/doc/cat_en/tiotoriva/04.jpg"
      ],
      "pageCount": 4,
      "category": "تیوتوریوا",
      "language": "en"
    },
    {
      "id": "1767079164462",
      "title": "کلدانیز پلاس (en)",
      "description": "کاتالوگ انگلیسی اسپری بینی کلدانیز پلاس",
      "date": "آخرین بروزرسانی: ۱۴۰۴/۱۰/۹",
      "pdfUrl": "https://patient.nafaspharmed.com/doc/Coldanese_En.pdf",
      "coverImage": "https://patient.nafaspharmed.com/doc/cat_en/coldanese/01.jpg",
      "pages": [
        "https://patient.nafaspharmed.com/doc/cat_en/coldanese/01.jpg",
        "https://patient.nafaspharmed.com/doc/cat_en/coldanese/02.jpg",
        "https://patient.nafaspharmed.com/doc/cat_en/coldanese/03.jpg",
        "https://patient.nafaspharmed.com/doc/cat_en/coldanese/04.jpg"
      ],
      "pageCount": 4,
      "category": "کلدانیز پلاس",
      "language": "en"
    }
  ],
  videos: [
    {
      "id": "1767080972524",
      "title": "نحوه استعلام اصالت کالا",
      "description": "نحوه استعلام اصالت کالا",
      "date": "بروز شده در: ۱۴۰۴/۱۰/۹",
      "videoUrl": "https://nafaspharmed.com/wp-content/uploads/2025/12/esalat.mp4",
      "coverImage": "https://nafaspharmed.com/wp-content/uploads/2025/12/esalat.jpg",
      "duration": "02:46"
    },
    {
      "id": "1767080934597",
      "title": "نحوه استفاده از کپسولایزر",
      "description": "نحوه استفاده از کپسولایزر",
      "date": "بروز شده در: ۱۴۰۴/۱۰/۹",
      "videoUrl": "https://nafaspharmed.com/wp-content/uploads/2025/11/Capsulizer_Use-1.mp4",
      "coverImage": "https://nafaspharmed.com/wp-content/uploads/2025/12/capsulizer_ban.jpg",
      "duration": "02:04"
    }
  ],
  banners: [
    {
      "id": "b1",
      "type": "text",
      "title": "پورتال آموزشی نفس زیست فارمد",
      "description": "به جامع‌ترین پایگاه دانش نفس فارمد خوش آمدید. کاتالوگ‌ها، بروشورهای دارویی و ویدئوهای آموزشی."
    }
  ]
};
