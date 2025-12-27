import { I18n } from 'i18n';
import path from 'path';

const i18n = new I18n({
  locales: ['ja', 'en', 'vi'],
  defaultLocale: 'ja',
  directory: path.join(__dirname, 'locales'),
  updateFiles: false,
  syncFiles: false,
  objectNotation: true,
  register: global,
});

export default i18n;
