import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fa from './locales/fa';
import en from './locales/en';
import ar from './locales/ar';
import ru from './locales/ru';
import type { SupportedLang } from '../types';

export const RTL_LANGS: SupportedLang[] = ['fa', 'ar'];

const savedLang = (() => {
  try {
    return (localStorage.getItem('nafas_lang') as SupportedLang | null) ?? 'fa';
  } catch {
    return 'fa' as SupportedLang;
  }
})();

// Apply direction immediately so there's no flash on reload
const initDir = RTL_LANGS.includes(savedLang) ? 'rtl' : 'ltr';
document.documentElement.setAttribute('dir', initDir);
document.documentElement.setAttribute('lang', savedLang);

i18n.use(initReactI18next).init({
  resources: {
    fa: { translation: fa },
    en: { translation: en },
    ar: { translation: ar },
    ru: { translation: ru },
  },
  lng: savedLang,
  fallbackLng: 'fa',
  interpolation: { escapeValue: false },
});

export default i18n;
