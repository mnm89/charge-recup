import type { SessionTypeKey } from './types';

/** Clés de l'application <-> valeurs de l'énumération SQL `SessionType`. */
export const TYPE_TO_DB = {
  muscu: 'MUSCU',
  training: 'TRAINING',
  combo: 'COMBO',
  match: 'MATCH',
  other: 'OTHER',
} as const satisfies Record<SessionTypeKey, string>;

export const TYPE_FROM_DB = {
  MUSCU: 'muscu',
  TRAINING: 'training',
  COMBO: 'combo',
  MATCH: 'match',
  OTHER: 'other',
} as const satisfies Record<string, SessionTypeKey>;
