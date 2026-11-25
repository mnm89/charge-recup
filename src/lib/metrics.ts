import { shift } from './dates';
import { groupPlayers } from './names';
import {
  QS,
  type EntryDTO,
  type EntryItem,
  type PlayerGroup,
  type PlayerStats,
  type StaffPayload,
  type Status,
} from './types';

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const notNull = (x: number | null): x is number => x !== null;

/** Bien-être du jour : somme de 5 notes de 1 à 5, soit 5 à 25. */
export function entryScore(e: EntryDTO): number {
  return QS.reduce((s, k) => s + (Number(e[k]) || 0), 0);
}

/** Charge d'une journée : somme de (intensité × minutes) sur les séances. Repos = 0. */
export function loadOf(e: EntryDTO): number {
  if (e.rest) return 0;
  return sum(e.sessions.map((x) => (Number(x.rpe) || 0) * (Number(x.min) || 0)));
}

/**
 * Indicateurs d'un joueur pour le jour `viewDay`.
 *
 * Une réponse datée D décrit les séances de la veille (D-1). La charge du jour J est
 * donc lue dans la réponse du jour J+1.
 */
export function analyse(p: PlayerGroup, viewDay: string): PlayerStats {
  const e = p.days[viewDay];
  const loadOn = (D: string): number | null => {
    const n = p.days[shift(D, 1)];
    return n ? loadOf(n) : null;
  };

  const L28: (number | null)[] = [];
  for (let i = 28; i >= 1; i--) L28.push(loadOn(shift(viewDay, -i)));
  const k28 = L28.filter(notNull);
  const k7 = L28.slice(-7).filter(notNull);

  // Charge aiguë : 7 derniers jours. Charge chronique : moyenne hebdomadaire sur 28 jours.
  const acute = k7.length >= 3 ? (sum(k7) / k7.length) * 7 : null;
  const chronic = k28.length >= 10 ? (sum(k28) / k28.length) * 7 : null;
  const acwr = acute !== null && chronic !== null && chronic > 0 ? acute / chronic : null;

  // Monotonie : charge moyenne par jour ÷ écart-type, sur la semaine.
  let mono: number | null = null;
  if (k7.length >= 5) {
    const m = sum(k7) / k7.length;
    const sd = Math.sqrt(sum(k7.map((x) => (x - m) * (x - m))) / k7.length);
    if (sd > 0) mono = m / sd;
  }

  // Contrainte : charge de la semaine (somme réelle) × monotonie.
  const strainAt = (D0: string): number | null => {
    const a: number[] = [];
    for (let q = 7; q >= 1; q--) {
      const lq = loadOn(shift(D0, -q));
      if (lq !== null) a.push(lq);
    }
    if (a.length < 5) return null;
    const mm = sum(a) / a.length;
    const ss = Math.sqrt(sum(a.map((x) => (x - mm) * (x - mm))) / a.length);
    return ss > 0 ? sum(a) * (mm / ss) : null;
  };
  const strain = strainAt(viewDay);
  const prevS: number[] = [];
  for (let w = 1; w <= 4; w++) {
    const sv = strainAt(shift(viewDay, -7 * w));
    if (sv !== null) prevS.push(sv);
  }
  const strainDelta =
    strain !== null && prevS.length >= 2 ? strain / (sum(prevS) / prevS.length) - 1 : null;

  const score = e ? entryScore(e) : null;
  const prev = Object.keys(p.days)
    .filter((d) => d < viewDay)
    .sort()
    .slice(-14)
    .map((d) => entryScore(p.days[d]));
  const delta = e && score !== null && prev.length >= 3 ? score - sum(prev) / prev.length : null;

  // Statut : alerte si le bien-être est bas ou chute, ou si le RCAC sort de 0,8 à 1,5.
  let status: Status = 'none';
  if (e && score !== null) {
    status = 'ok';
    if (score <= 18 || (acwr !== null && acwr < 0.8) || (delta !== null && delta <= -3)) {
      status = 'warn';
    }
    if (score <= 14 || (acwr !== null && acwr > 1.5) || (delta !== null && delta <= -4)) {
      status = 'bad';
    }
  }

  const flags = e ? QS.filter((k) => Number(e[k]) <= 2).map((k) => ({ k, v: e[k] })) : [];

  const history = Object.keys(p.days)
    .filter((d) => d <= viewDay)
    .sort()
    .reverse()
    .slice(0, 60)
    .map((d) => ({
      date: d,
      score: entryScore(p.days[d]),
      load: loadOf(p.days[d]),
      rest: p.days[d].rest,
      sessions: p.days[d].sessions,
    }));

  return {
    key: p.key,
    name: p.name,
    names: p.names,
    ids: p.ids,
    status,
    score,
    delta,
    yday: L28[27],
    acute,
    chronic,
    acwr,
    fresh: acute !== null && chronic !== null ? chronic - acute : null,
    mono,
    strain,
    strainDelta,
    flags,
    history,
  };
}

/** Charge totale de l'équipe, par jour, sur les 14 jours précédant `viewDay`. */
export function teamChart(groups: PlayerGroup[], viewDay: string) {
  const labels: string[] = [];
  const values: (number | null)[] = [];
  for (let i = 14; i >= 1; i--) {
    const D = shift(viewDay, -i);
    let total = 0;
    let any = false;
    for (const g of groups) {
      const n = g.days[shift(D, 1)];
      if (n) {
        total += loadOf(n);
        any = true;
      }
    }
    values.push(any ? total : null);
    labels.push(D.slice(8));
  }
  return { labels, values };
}

/** Tout ce que le tableau du staff affiche pour un jour donné. */
export function buildStaffPayload(items: EntryItem[], viewDay: string, today: string): StaffPayload {
  const groups = groupPlayers(items).filter((g) => !g.first || g.first <= viewDay);
  return {
    viewDay,
    today,
    players: groups.map((g) => analyse(g, viewDay)),
    chart: teamChart(groups, viewDay),
  };
}
