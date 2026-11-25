'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DICT, type Lang } from '@/lib/i18n-dict';
import type { TFn } from '@/lib/format';

function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = DICT[lang][key] ?? DICT.fr[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: TFn };
const LangContext = createContext<Ctx | null>(null);

/** Langue de l'interface : français par défaut, choix mémorisé sur l'appareil. */
export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cr-lang');
      if (saved === 'fr' || saved === 'en') setLangState(saved);
    } catch {
      /* stockage indisponible : on garde le français */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('cr-lang', l);
    } catch {
      /* ignoré */
    }
  }, []);

  const t = useCallback<TFn>((key, vars) => translate(lang, key, vars), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang doit être utilisé dans <LangProvider>.');
  return ctx;
}
