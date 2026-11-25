export const QS = ['sleep', 'fatigue', 'sore', 'stress', 'mood'] as const;
export type QKey = (typeof QS)[number];

export const SESSION_TYPES = ['muscu', 'training', 'combo', 'match', 'other'] as const;
export type SessionTypeKey = (typeof SESSION_TYPES)[number];

export type SessionDTO = {
  type: SessionTypeKey | null;
  /** Intensité ressentie, 0 (repos) à 10 (maximal). */
  rpe: number;
  /** Durée en minutes. */
  min: number;
};

/** Une réponse du matin : bien-être du jour + séances de la veille. */
export type EntryDTO = {
  sleep: number;
  fatigue: number;
  sore: number;
  stress: number;
  mood: number;
  rest: boolean;
  sessions: SessionDTO[];
  /** Horodatage (ms) de la dernière mise à jour. */
  ts: number;
};

/** Une ligne de la base, telle que lue par le tableau de bord. */
export type EntryItem = {
  id: string;
  name: string;
  /** Jour de la réponse, AAAA-MM-JJ. */
  date: string;
  entry: EntryDTO;
};

/** Un joueur après regroupement des variantes de nom. */
export type PlayerGroup = {
  key: string;
  name: string;
  names: string[];
  ids: string[];
  days: Record<string, EntryDTO>;
  first: string;
};

export type Status = 'ok' | 'warn' | 'bad' | 'none';

export type HistoryRow = {
  date: string;
  score: number;
  load: number;
  rest: boolean;
  sessions: SessionDTO[];
};

export type PlayerStats = {
  key: string;
  name: string;
  names: string[];
  /** Identifiants des lignes de la base à supprimer pour retirer ce joueur. */
  ids: string[];
  status: Status;
  /** Bien-être du jour, de 5 à 25. null si pas de réponse ce jour-là. */
  score: number | null;
  /** Écart avec la moyenne personnelle des 14 jours précédents. */
  delta: number | null;
  /** Charge de la veille. */
  yday: number | null;
  acute: number | null;
  chronic: number | null;
  /** RCAC / ACWR : charge aiguë ÷ charge chronique. */
  acwr: number | null;
  /** Indice de fraîcheur : charge chronique − charge aiguë. */
  fresh: number | null;
  mono: number | null;
  strain: number | null;
  strainDelta: number | null;
  flags: { k: QKey; v: number }[];
  history: HistoryRow[];
};

export type StaffPayload = {
  viewDay: string;
  today: string;
  players: PlayerStats[];
  chart: { labels: string[]; values: (number | null)[] };
};
