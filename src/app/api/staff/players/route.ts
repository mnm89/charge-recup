import { NextResponse } from 'next/server';
import { isStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Supprime un joueur : toutes les réponses listées (et leurs séances, en cascade).
 * C'est la seule opération qui retire des données ; rien n'est supprimé automatiquement.
 */
export async function DELETE(req: Request) {
  if (!isStaff()) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = body?.ids;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 5000 ||
    !ids.every((x) => typeof x === 'string' && x.length > 0 && x.length < 64)
  ) {
    return NextResponse.json({ ok: false, error: 'invalid_ids' }, { status: 400 });
  }

  const { count } = await prisma.dailyEntry.deleteMany({ where: { id: { in: ids as string[] } } });
  return NextResponse.json({ ok: true, deleted: count });
}
