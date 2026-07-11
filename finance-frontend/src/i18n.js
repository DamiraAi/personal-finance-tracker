import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импортируем словари для Login / Общих страниц
import translationRU from './locales/ru/translation.json';
import translationTR from './locales/tr/translation.json';
import translationEN from './locales/en/translation.json';

// Импортируем словари для Dashboard
import dashboardRU from './locales/ru/dashboard.json';
import dashboardTR from './locales/tr/dashboard.json';
import dashboardEN from './locales/en/dashboard.json';

const resources = {
  ru: { 
    translation: translationRU,
    dashboard: dashboardRU 
  },
  tr: { 
    translation: translationTR,
    dashboard: dashboardTR 
  },
  en: { 
    translation: translationEN,
    dashboard: dashboardEN 
  }
};

i18n
  .use(LanguageDetector) // Автоопределение языка
  .use(initReactI18next) // Интеграция с React
  .init({
    resources,
    fallbackLng: 'ru', // Если язык пользователя не найден, включаем русский
    // Обрезаем региональный код (например, "en-US" -> "en"),
    // иначе i18next не найдёт наши ресурсы, зарегистрированные
    // только под короткими кодами ru/en/tr
    load: 'languageOnly',
    supportedLngs: ['ru', 'en', 'tr'],
    nonExplicitSupportedLngs: true,
    ns: ['translation', 'dashboard'], // Регистрируем оба пространства имен
    defaultNS: 'translation', // По умолчанию (например, для логина) используется translation
    interpolation: {
      escapeValue: false // React сам защищает от XSS
    }
  });

export default i18n;