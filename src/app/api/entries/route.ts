import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TZ } from '@/lib/config';
import { todayIn, ymdToDb } from '@/lib/dates';
import { slug } from '@/lib/names';
import { TYPE_TO_DB } from '@/lib/session-type';
import { validateSubmission } from '@/lib/validate';

export const dynamic = 'force-dynamic';

/**
 * Enregistre la réponse du matin d'un joueur.
 * Même nom + même jour = la réponse précédente est remplacée.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  // Lien secret facultatif : si PLAYER_KEY est défini, le formulaire doit le renvoyer.
  const required = process.env.PLAYER_KEY;
  if (required && (body as { key?: unknown } | null)?.key !== required) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const v = validateSubmission(body);
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
  const s = v.value;

  // Le jour est calculé côté serveur, dans le fuseau de l'équipe : l'horloge du téléphone n'intervient pas.
  const date = todayIn(TZ);
  const entryDate = ymdToDb(date);
  const nameKey = slug(s.name);

  const fields = {
    playerName: s.name,
    sleep: s.sleep,
    fatigue: s.fatigue,
    soreness: s.sore,
    stress: s.stress,
    mood: s.mood,
    isRest: s.rest,
  };

  await prisma.$transaction(async (tx) => {
    const entry = await tx.dailyEntry.upsert({
      where: { nameKey_entryDate: { nameKey, entryDate } },
      create: { ...fields, nameKey, entryDate },
      update: fields,
    });
    await tx.trainingSession.deleteMany({ where: { entryId: entry.id } });
    if (s.sessions.length > 0) {
      await tx.trainingSession.createMany({
        data: s.sessions.map((x, i) => ({
          entryId: entry.id,
          position: i,
          type: x.type ? TYPE_TO_DB[x.type] : null,
          rpe: x.rpe,
          minutes: x.min,
        })),
      });
    }
  });

  const score = s.sleep + s.fatigue + s.sore + s.stress + s.mood;
  const load = s.rest ? 0 : s.sessions.reduce((t, x) => t + x.rpe * x.min, 0);
  return NextResponse.json({ ok: true, date, score, load });
}
