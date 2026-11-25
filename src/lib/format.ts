import type { Lang } from './i18n-dict';
import type { SessionDTO } from './types';

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export const locale = (lang: Lang) => (lang === 'fr' ? 'fr-FR' : 'en-GB');

export const fmt = (lang: Lang, n: number) => Math.round(n).toLocaleString(locale(lang));

export function dec(lang: Lang, x: number, digits: number): string {
  const r = x.toFixed(digits);
  return lang === 'fr' ? r.replace('.', ',') : r;
}

/** Entier avec signe explicite : +120, -880. */
export const signed = (lang: Lang, n: number) => (n > 0 ? '+' : '') + fmt(lang, n);

export const typeLabel = (t: TFn, type: string | null) => (type ? t('ty.' + type) : '');

/** Texte récapitulatif de la charge de la veille. */
export function loadText(t: TFn, lang: Lang, rest: boolean, sessions: SessionDTO[], load: number): string {
  if (rest) return t('l.rest');
  if (sessions.length > 1) {
    const d = sessions
      .map((x) => `${typeLabel(t, x.type) || t('word.session')} ${x.rpe} × ${x.min} min`)
      .join(' + ');
    return t('l.many', { l: fmt(lang, load), d });
  }
  const s = sessions[0];
  return t('l.one', { l: fmt(lang, load), r: s ? s.rpe : 0, m: s ? s.min : 0 });
}

/** Classe de couleur du RCAC : vert entre 0,8 et 1,5, orange en dessous, rouge au-dessus. */
export function acwrClass(a: number | null): string {
  if (a === null) return '';
  return a > 1.5 ? 'bad' : a < 0.8 ? 'warn' : 'ok';
}
