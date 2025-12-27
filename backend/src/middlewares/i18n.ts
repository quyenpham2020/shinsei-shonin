import { Request, Response, NextFunction } from 'express';
import i18n from '../i18n';

declare global {
  namespace Express {
    interface Request {
      __: (phrase: string, replacements?: Record<string, string>) => string;
    }
  }
}

export const i18nMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get language from Accept-Language header or query parameter
  const headerLang = req.headers['accept-language'];
  const queryLang = req.query.lang as string;

  let locale = 'ja'; // default

  if (queryLang && ['ja', 'en', 'vi'].includes(queryLang)) {
    locale = queryLang;
  } else if (headerLang) {
    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,ja;q=0.8")
    const primaryLang = headerLang.split(',')[0].split('-')[0].toLowerCase();
    if (['ja', 'en', 'vi'].includes(primaryLang)) {
      locale = primaryLang;
    }
  }

  i18n.setLocale(locale);
  req.__ = (phrase: string, replacements?: Record<string, string>) => {
    return i18n.__(phrase, replacements);
  };

  next();
};
