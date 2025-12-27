import 'react-i18next';
import common from '../i18n/locales/ja/common.json';
import auth from '../i18n/locales/ja/auth.json';
import application from '../i18n/locales/ja/application.json';
import user from '../i18n/locales/ja/user.json';
import validation from '../i18n/locales/ja/validation.json';
import feedback from '../i18n/locales/ja/feedback.json';
import revenue from '../i18n/locales/ja/revenue.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      auth: typeof auth;
      application: typeof application;
      user: typeof user;
      validation: typeof validation;
      feedback: typeof feedback;
      revenue: typeof revenue;
    };
  }
}
