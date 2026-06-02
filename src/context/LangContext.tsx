import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getString } from '../i18n/strings';
import type { Lang } from '../types';

const STORAGE_KEY = 'surgical_training_lang';

interface LangContextValue {
  lang: Lang;
  setLang: (next: Lang | string) => void;
  t: (key: string) => unknown;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }): JSX.Element {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return (v === 'en' ? 'en' : 'ar') as Lang;
    } catch {
      return 'ar';
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback((next: Lang | string) => {
    const v = next === 'en' ? 'en' : 'ar';
    setLangState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {}
  }, []);

  const t = useCallback((key: string) => getString(lang, key), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
