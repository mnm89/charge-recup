import { db } from '@/prisma/db'
import { dbToYmd, ymdToDb } from './dates'
import { buildStaffPayload } from './metrics'
import { TYPE_FROM_DB } from './session-type'
import type { EntryItem, StaffPayload } from './types'

/**
 * Lit toutes les réponses jusqu'à `viewDay` et calcule le tableau du staff.
 * Les calculs ont besoin de 28 à 56 jours d'historique, et la liste des joueurs
 * vient de toutes les réponses : on lit donc tout ce qui précède le jour affiché.
 */
export async function loadStaffPayload(viewDay: string, today: string): Promise<StaffPayload> {
  const rows = await db.orm.charge_recup.DailyEntry.where((m, { fns }) =>
    fns.lte(m.entryDate, viewDay),
  )
    .orderBy([(e) => e.entryDate.asc(), (e) => e.createdAt.asc()])
    .include('sessions', (sessions) => sessions.orderBy((s) => s.position.asc()))
    .all()
    .toArray()

  const items: EntryItem[] = rows.map((r) => ({
    id: r.id,
    name: r.playerName,
    date: r.entryDate,
    entry: {
      sleep: r.sleep,
      fatigue: r.fatigue,
      sore: r.soreness,
      stress: r.stress,
      mood: r.mood,
      rest: r.isRest,
      ts: r.updatedAt.getTime(),
      sessions: r.sessions.map((s) => ({
        type: s.type ? TYPE_FROM_DB[s.type] : null,
        rpe: s.rpe,
        min: s.minutes,
      })),
    },
  }))

  return buildStaffPayload(items, viewDay, today)
}
