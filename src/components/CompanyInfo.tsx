import React from 'react';
import { motion } from 'motion/react';
import { Target, Eye, HeartPulse } from 'lucide-react';

// ─── Shared bits ──────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const SectionTag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-block text-skin-primary font-bold text-xs tracking-[0.15em] mb-2">{children}</span>
);

const ABOUT_PARAGRAPHS = [
  'این شرکت با تکیه بر دانش فنی بومی، بهره‌گیری از فناوری‌های روز دنیا و همکاری تیمی از متخصصان حوزه‌های داروسازی، بیوتکنولوژی، مهندسی پزشکی و علوم پایه، توانسته است جایگاه ارزشمندی در توسعه محصولات دانش‌بنیان حوزه سلامت به دست آورد.',
  'نفس زیست فارمد پس از سال‌ها تحقیق و توسعه مستمر، موفق به بومی‌سازی و تسلط بر دانش فنی پیشرفته در حوزه‌های فرمولاسیون دارویی و مهندسی آیرودینامیک ذرات (Aerodynamic Particle Engineering) گردیده است. این دستاورد علمی راهبردی، زمینه تولید نخستین داروی استنشاقی پودر خشک (Dry Powder Inhaler - DPI) مبتنی بر دانش فنی بومی در ایران را فراهم ساخته و موجب کسب گواهی دانش‌بنیان نوع یک برای این مجموعه شده است.',
  'تعهد به نوآوری، کیفیت، توسعه پایدار، خودکفایی ملی و ارتقای سطح سلامت جامعه، از مهم‌ترین ارزش‌های سازمانی نفس زیست فارمد به شمار می‌رود. این شرکت با بهره‌گیری از استانداردهای سخت‌گیرانه کنترل کیفیت، همکاری با مراکز علمی و تحقیقاتی و تمرکز بر توسعه بازارهای داخلی و بین‌المللی، مسیر رشد و تعالی خود را با قدرت ادامه می‌دهد.',
];

const STATS = [
  { num: '۱۳۹۸', label: 'سال تأسیس' },
  { num: 'DPI', label: 'نخستین داروی استنشاقی پودر خشک بومی' },
  { num: '۵+', label: 'محصول تخصصی سلامت' },
  { num: 'نوع ۱', label: 'شرکت دانش‌بنیان' },
];

const VALUE_CHIPS = ['نوآوری', 'کیفیت', 'توسعه پایدار', 'خودکفایی ملی', 'ارتقای سلامت جامعه'];

// ─── Company info block (placed below catalogs & videos) ──────────────────────
const CompanyInfo: React.FC = () => {
  return (
    <div className="space-y-14 mb-12">

      {/* ── ABOUT ─────────────────────────────────────────────── */}
      <motion.section
        id="about"
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="scroll-mt-24"
      >
        <div className="text-center mb-8">
          <SectionTag>درباره ما</SectionTag>
          <h2 className="text-2xl font-black text-skin-text tracking-tight">دانش بومی، استانداردهای جهانی</h2>
          <p className="text-skin-muted text-sm max-w-2xl mx-auto mt-3 leading-relaxed">
            نفس زیست فارمد از سال ۱۳۹۸ با هدف توسعه فناوری‌های پیشرفته دارورسانی و تولید محصولات دارویی نوآورانه فعالیت می‌کند.
          </p>
        </div>

        <div className="bg-skin-card border border-skin-border rounded-2xl p-6 md:p-8">
          <div className="space-y-4 text-sm md:text-[15px] leading-loose text-skin-text/90 text-justify">
            {ABOUT_PARAGRAPHS.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-skin-border">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-skin-primary tracking-tight">{s.num}</p>
                <p className="text-[11px] text-skin-muted mt-1 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── MISSION / VISION / VALUES ─────────────────────────── */}
      <motion.section
        id="mission"
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5 }}
        className="scroll-mt-24"
      >
        <div className="text-center mb-8">
          <SectionTag>هویت سازمانی</SectionTag>
          <h2 className="text-2xl font-black text-skin-text tracking-tight">مأموریت و چشم‌انداز</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mission */}
          <div className="bg-skin-card border border-skin-border rounded-2xl p-6 hover:border-skin-primary/30 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-skin-primary/10 text-skin-primary flex items-center justify-center mb-4">
              <Target size={22} />
            </div>
            <h3 className="font-black text-skin-text mb-2">مأموریت شرکت</h3>
            <p className="text-sm text-skin-muted leading-relaxed">
              توسعه و تولید فرآورده‌های دارویی و تجهیزات پزشکی نوآورانه با بهره‌گیری از دانش فنی پیشرفته، به منظور بهبود کیفیت زندگی بیماران، ارتقای سطح سلامت جامعه و ایجاد دسترسی پایدار به درمان‌های مؤثر و ایمن.
            </p>
          </div>

          {/* Vision */}
          <div className="bg-skin-card border border-skin-border rounded-2xl p-6 hover:border-skin-primary/30 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-skin-primary/10 text-skin-primary flex items-center justify-center mb-4">
              <Eye size={22} />
            </div>
            <h3 className="font-black text-skin-text mb-2">چشم‌انداز شرکت</h3>
            <p className="text-sm text-skin-muted leading-relaxed">
              تبدیل شدن به یکی از شرکت‌های پیشرو منطقه در حوزه فناوری‌های دارورسانی پیشرفته، داروهای استنشاقی و محصولات نوآورانه سلامت با حضور مؤثر در بازارهای بین‌المللی.
            </p>
          </div>

          {/* Values */}
          <div className="bg-skin-card border border-skin-border rounded-2xl p-6 hover:border-skin-primary/30 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-skin-primary/10 text-skin-primary flex items-center justify-center mb-4">
              <HeartPulse size={22} />
            </div>
            <h3 className="font-black text-skin-text mb-3">ارزش‌های ما</h3>
            <div className="flex flex-wrap gap-2">
              {VALUE_CHIPS.map((v) => (
                <span key={v} className="text-xs font-bold bg-skin-primary/10 text-skin-primary px-3 py-1.5 rounded-full">{v}</span>
              ))}
            </div>
            <p className="text-xs text-skin-muted mt-4 leading-relaxed">
              این ارزش‌ها قطب‌نمای تمامی تصمیمات و فعالیت‌های نفس زیست فارمد هستند.
            </p>
          </div>
        </div>
      </motion.section>

    </div>
  );
};

export default CompanyInfo;
