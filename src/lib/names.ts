import type { EntryDTO, EntryItem, PlayerGroup } from './types';

/*
 * Regroupement des noms.
 *
 * Les joueurs écrivent leur nom librement. Un même joueur peut donc apparaître sous
 * plusieurs écritures. On les regroupe à la lecture, sans jamais modifier la base :
 *  - ordre inversé            "Nabil Azouzi" / "Azouzi Nabil"
 *  - fautes de frappe         "Miladi Fahmi" / "Miladi Famhi"
 *  - nom collé                "Azouzinabil"
 *  - nom incomplet            "Karamosli" -> "Karamosli Elyes", seulement s'il n'y a
 *                             qu'un seul candidat (sinon "Miladi" resterait seul).
 */

export function clean(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

/** Minuscules, sans accents. */
export function norm(s: string): string {
  return clean(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Clé stable d'un nom : lettres et chiffres séparés par des tirets. */
export function slug(s: string): string {
  const r = norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return r || 'x';
}

export function tok(s: string): string[] {
  return norm(s).split(/[^a-z0-9]+/).filter(Boolean);
}

/** Distance d'édition avec transposition (Damerau, variante OSA). */
export function osa(a: string, b: string): number {
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) d[i] = [i];
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function tokEq(a: string, b: string): boolean {
  if (a === b) return true;
  const m = Math.min(a.length, b.length);
  const th = m >= 9 ? 2 : m >= 4 ? 1 : 0;
  return th > 0 && Math.abs(a.length - b.length) <= th && osa(a, b) <= th;
}

/** Chaque mot de A correspond à un mot distinct de B. */
function covered(A: string[], B: string[]): boolean {
  const used: number[] = [];
  return A.every((a) => {
    for (let i = 0; i < B.length; i++) {
      if (!used.includes(i) && tokEq(a, B[i])) {
        used.push(i);
        return true;
      }
    }
    return false;
  });
}

function perms<T>(a: T[]): T[][] {
  if (a.length <= 1) return [a];
  const out: T[][] = [];
  a.forEach((x, i) => {
    for (const r of perms(a.slice(0, i).concat(a.slice(i + 1)))) out.push([x, ...r]);
  });
  return out;
}

/** Lettres des mots collées, dans tous les ordres (jusqu'à 3 mots). */
function compacts(T: string[]): string[] {
  const arr = T.length <= 3 ? perms(T) : [T, [...T].sort()];
  return arr.map((a) => a.join(''));
}

const clen = (T: string[]) => T.join('').length;

function compEq(A: string[], B: string[]): boolean {
  const ca = compacts(A);
  const cb = compacts(B);
  return ca.some((x) =>
    cb.some((y) => {
      const L = Math.max(x.length, y.length);
      const th = L >= 12 ? 2 : L >= 5 ? 1 : 0;
      return Math.abs(x.length - y.length) <= th && osa(x, y) <= th;
    }),
  );
}

function sameP(A: string[], B: string[]): boolean {
  return (A.length === B.length && covered(A, B)) || compEq(A, B);
}

/** B est une écriture plus complète de A (prénom seul, nom répété...). */
function isSuper(A: string[], B: string[]): boolean {
  if (clen(B) <= clen(A)) return false;
  if (A.some((x) => x.length >= 4) && covered(A, B)) return true;
  // une initiale isolée (« Azouzi c ») est ignorée : « Azouzi » doit se retrouver dans le nom plus complet
  const core = A.filter((x) => x.length > 1);
  if (core.length > 0 && core.length < A.length && core.some((x) => x.length >= 5) && covered(core, B)) return true;
  const ca = compacts(A);
  const cb = compacts(B);
  if (ca[0].length < 6) return false;
  return ca.some((x) => cb.some((y) => y.includes(x)));
}

type Group = { name: string; toks: string[]; items: EntryItem[] };
type Cluster = { groups: Group[] };

/**
 * Regroupe les lignes par joueur. Passer les lignes triées par date croissante rend
 * le choix du nom d'origine déterministe.
 */
export function groupPlayers(items: EntryItem[]): PlayerGroup[] {
  const bs: Record<string, Group> = {};
  for (const it of items) {
    const nm = clean(it.name);
    if (!nm) continue;
    const k = slug(nm);
    (bs[k] ??= { name: nm, toks: tok(nm), items: [] }).items.push(it);
  }

  // Passe 1 : même personne (ordre, fautes, nom collé).
  const cl: Cluster[] = [];
  for (const k of Object.keys(bs).sort()) {
    const g = bs[k];
    const hit = cl.find((c) => c.groups.some((h) => sameP(g.toks, h.toks)));
    if (hit) hit.groups.push(g);
    else cl.push({ groups: [g] });
  }

  // Passe 2 : nom incomplet rattaché à un seul candidat plus complet.
  const minLen = (c: Cluster) => Math.min(...c.groups.map((g) => clen(g.toks)));
  cl.sort((a, b) => minLen(a) - minLen(b));
  for (let i = 0; i < cl.length; ) {
    const c = cl[i];
    const cands = cl.filter(
      (d) => d !== c && c.groups.some((gc) => d.groups.some((gd) => isSuper(gc.toks, gd.toks))),
    );
    if (cands.length === 1) {
      cands[0].groups = cands[0].groups.concat(c.groups);
      cl.splice(i, 1);
    } else i++;
  }

  return cl.map((c) => {
    const names: string[] = [];
    const cnt: Record<string, number> = {};
    const ids: string[] = [];
    const days: Record<string, EntryDTO> = {};
    for (const g of c.groups) {
      if (!names.includes(g.name)) names.push(g.name);
      cnt[g.name] = (cnt[g.name] ?? 0) + g.items.length;
      for (const it of g.items) {
        ids.push(it.id);
        const cur = days[it.date];
        if (!cur || it.entry.ts > cur.ts) days[it.date] = it.entry;
      }
    }
    // Nom affiché : le plus complet, puis le plus fréquent, puis le plus court.
    names.sort(
      (a, b) =>
        tok(b).length - tok(a).length ||
        cnt[b] - cnt[a] ||
        a.length - b.length ||
        (a < b ? -1 : 1),
    );
    return {
      key: c.groups.map((g) => slug(g.name)).sort()[0],
      name: names[0],
      names,
      ids,
      days,
      first: Object.keys(days).sort()[0] ?? '',
    };
  });
}
