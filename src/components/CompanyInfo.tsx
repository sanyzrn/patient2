import React from 'react';
import { motion } from 'motion/react';
import { Target, Eye, HeartPulse } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ─── Shared bits ──────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const SectionTag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-block text-skin-primary font-bold text-xs tracking-[0.15em] mb-2">{children}</span>
);

// ─── Company info block (placed below catalogs & videos) ──────────────────────
const CompanyInfo: React.FC = () => {
  const { t } = useTranslation();

  const ABOUT_PARAGRAPHS = [t('company.aboutP1'), t('company.aboutP2'), t('company.aboutP3')];
  const STATS = [
    { num: t('company.statYear'), label: t('company.statYearLabel') },
    { num: 'DPI', label: t('company.statDpiLabel') },
    { num: t('company.statProducts'), label: t('company.statProductsLabel') },
    { num: t('company.statType'), label: t('company.statTypeLabel') },
  ];
  const VALUE_CHIPS = [
    t('company.valueInnovation'), t('company.valueQuality'), t('company.valueSustainableDev'),
    t('company.valueSelfSufficiency'), t('company.valueHealthImprovement'),
  ];

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
          <SectionTag>{t('company.aboutTag')}</SectionTag>
          <h2 className="text-2xl font-black text-skin-text tracking-tight">{t('company.aboutTitle')}</h2>
          <p className="text-skin-muted text-sm max-w-2xl mx-auto mt-3 leading-relaxed">
            {t('company.aboutIntro')}
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
          <SectionTag>{t('company.identityTag')}</SectionTag>
          <h2 className="text-2xl font-black text-skin-text tracking-tight">{t('company.missionVisionTitle')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mission */}
          <div className="bg-skin-card border border-skin-border rounded-2xl p-6 hover:border-skin-primary/30 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-skin-primary/10 text-skin-primary flex items-center justify-center mb-4">
              <Target size={22} />
            </div>
            <h3 className="font-black text-skin-text mb-2">{t('company.missionTitle')}</h3>
            <p className="text-sm text-skin-muted leading-relaxed">
              {t('company.missionText')}
            </p>
          </div>

          {/* Vision */}
          <div className="bg-skin-card border border-skin-border rounded-2xl p-6 hover:border-skin-primary/30 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-skin-primary/10 text-skin-primary flex items-center justify-center mb-4">
              <Eye size={22} />
            </div>
            <h3 className="font-black text-skin-text mb-2">{t('company.visionTitle')}</h3>
            <p className="text-sm text-skin-muted leading-relaxed">
              {t('company.visionText')}
            </p>
          </div>

          {/* Values */}
          <div className="bg-skin-card border border-skin-border rounded-2xl p-6 hover:border-skin-primary/30 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-skin-primary/10 text-skin-primary flex items-center justify-center mb-4">
              <HeartPulse size={22} />
            </div>
            <h3 className="font-black text-skin-text mb-3">{t('company.valuesTitle')}</h3>
            <div className="flex flex-wrap gap-2">
              {VALUE_CHIPS.map((v) => (
                <span key={v} className="text-xs font-bold bg-skin-primary/10 text-skin-primary px-3 py-1.5 rounded-full">{v}</span>
              ))}
            </div>
            <p className="text-xs text-skin-muted mt-4 leading-relaxed">
              {t('company.valuesFooter')}
            </p>
          </div>
        </div>
      </motion.section>

    </div>
  );
};

export default CompanyInfo;
