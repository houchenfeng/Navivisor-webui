import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { MOCK_I18N, type II18nTexts } from '../data/i18n';

type Lang = 'zh' | 'en';

interface II18nContext {
  lang: Lang;
  t: II18nTexts;
  toggleLang: () => void;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<II18nContext | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh');
  const t = useMemo(() => { const found = MOCK_I18N.find((item) => item.lang === lang); return found ?? MOCK_I18N[0]; }, [lang]);
  const toggleLang = () => { setLang((prev) => (prev === 'zh' ? 'en' : 'zh')); };
  return <I18nContext.Provider value={{ lang, t, toggleLang, setLang }}>{children}</I18nContext.Provider>;
}

export function useI18n(): II18nContext {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
