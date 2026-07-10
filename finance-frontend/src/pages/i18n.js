import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationRU from './locales/ru/translation.json';
import translationTR from './locales/tr/translation.json';
import translationEN from './locales/en/translation.json';

const resources = {
  ru: { translation: translationRU },
  tr: { translation: translationTR },
  en: { translation: translationEN }
};

i18n
  .use(LanguageDetector) // Автоопределение языка
  .use(initReactI18next) // Интеграция с React
  .init({
    resources,
    fallbackLng: 'ru', // Если язык пользователя не найден, включаем русский
    interpolation: {
      escapeValue: false // React сам защищает от XSS
    }
  });

export default i18n;