import { clean } from './names';
import { QS, SESSION_TYPES, type SessionDTO, type SessionTypeKey } from './types';

export type Submission = {
  name: string;
  sleep: number;
  fatigue: number;
  sore: number;
  stress: number;
  mood: number;
  rest: boolean;
  sessions: SessionDTO[];
};

type Result = { ok: true; value: Submission } | { ok: false; error: string };

function int(v: unknown, min: number, max: number): number | null {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) return null;
  return v;
}

/** Valide le corps JSON envoyé par le formulaire. Aucune valeur n'est reprise telle quelle. */
export function validateSubmission(body: unknown): Result {
  if (!body || typeof body !== 'object') return { ok: false, error: 'invalid_body' };
  const b = body as Record<string, unknown>;

  const name = clean(b.name);
  if (!name) return { ok: false, error: 'name' };

  const w: Record<string, number> = {};
  for (const k of QS) {
    const v = int(b[k], 1, 5);
    if (v === null) return { ok: false, error: k };
    w[k] = v;
  }

  if (typeof b.rest !== 'boolean') return { ok: false, error: 'rest' };
  const sessions: SessionDTO[] = [];
  if (!b.rest) {
    if (!Array.isArray(b.sessions) || b.sessions.length < 1 || b.sessions.length > 2) {
      return { ok: false, error: 'sessions' };
    }
    for (const raw of b.sessions) {
      const s = (raw ?? {}) as Record<string, unknown>;
      const rpe = int(s.rpe, 0, 10);
      const min = int(s.min, 1, 300);
      if (rpe === null || min === null) return { ok: false, error: 'sessions' };
      let type: SessionTypeKey | null = null;
      if (s.type !== null && s.type !== undefined && s.type !== '') {
        if (!(SESSION_TYPES as readonly string[]).includes(s.type as string)) {
          return { ok: false, error: 'sessions' };
        }
        type = s.type as SessionTypeKey;
      }
      sessions.push({ type, rpe, min });
    }
  }

  return {
    ok: true,
    value: {
      name,
      sleep: w.sleep,
      fatigue: w.fatigue,
      sore: w.sore,
      stress: w.stress,
      mood: w.mood,
      rest: b.rest,
      sessions,
    },
  };
}
