import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonJa from './locales/ja/common.json';
import authJa from './locales/ja/auth.json';
import applicationJa from './locales/ja/application.json';
import userJa from './locales/ja/user.json';
import validationJa from './locales/ja/validation.json';
import feedbackJa from './locales/ja/feedback.json';
import revenueJa from './locales/ja/revenue.json';
import weeklyReportJa from './locales/ja/weeklyReport.json';
import passwordJa from './locales/ja/password.json';

import commonEn from './locales/en/common.json';
import authEn from './locales/en/auth.json';
import applicationEn from './locales/en/application.json';
import userEn from './locales/en/user.json';
import validationEn from './locales/en/validation.json';
import feedbackEn from './locales/en/feedback.json';
import revenueEn from './locales/en/revenue.json';
import weeklyReportEn from './locales/en/weeklyReport.json';
import passwordEn from './locales/en/password.json';

import commonVi from './locales/vi/common.json';
import authVi from './locales/vi/auth.json';
import applicationVi from './locales/vi/application.json';
import userVi from './locales/vi/user.json';
import validationVi from './locales/vi/validation.json';
import feedbackVi from './locales/vi/feedback.json';
import revenueVi from './locales/vi/revenue.json';
import weeklyReportVi from './locales/vi/weeklyReport.json';
import passwordVi from './locales/vi/password.json';

const resources = {
  ja: {
    common: commonJa,
    auth: authJa,
    application: applicationJa,
    user: userJa,
    validation: validationJa,
    feedback: feedbackJa,
    revenue: revenueJa,
    weeklyReport: weeklyReportJa,
    password: passwordJa,
  },
  en: {
    common: commonEn,
    auth: authEn,
    application: applicationEn,
    user: userEn,
    validation: validationEn,
    feedback: feedbackEn,
    revenue: revenueEn,
    weeklyReport: weeklyReportEn,
    password: passwordEn,
  },
  vi: {
    common: commonVi,
    auth: authVi,
    application: applicationVi,
    user: userVi,
    validation: validationVi,
    feedback: feedbackVi,
    revenue: revenueVi,
    weeklyReport: weeklyReportVi,
    password: passwordVi,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ja',
    defaultNS: 'common',
    ns: ['common', 'auth', 'application', 'user', 'validation', 'feedback', 'revenue', 'weeklyReport', 'password'],

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
