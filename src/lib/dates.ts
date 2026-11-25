const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(s: unknown): s is string {
  if (typeof s !== 'string' || !YMD.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Jour courant (AAAA-MM-JJ) dans le fuseau horaire de l'équipe. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Ajoute n jours à une date AAAA-MM-JJ (n peut être négatif). */
export function shift(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Date AAAA-MM-JJ -> objet Date à minuit UTC, pour les colonnes SQL `date`. */
export function ymdToDb(date: string): Date {
  return new Date(date + 'T00:00:00.000Z');
}

export function dbToYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Affichage localisé d'une date AAAA-MM-JJ. */
export function formatDay(
  date: string,
  locale: string,
  opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' },
): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { ...opts, timeZone: 'UTC' });
}
