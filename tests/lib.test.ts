import test from 'node:test';
import assert from 'node:assert/strict';
import { analyse, buildStaffPayload, loadOf } from '../src/lib/metrics';
import { groupPlayers, slug } from '../src/lib/names';
import { shift, todayIn, isYmd } from '../src/lib/dates';
import { validateSubmission } from '../src/lib/validate';
import type { EntryDTO, EntryItem, PlayerGroup } from '../src/lib/types';

const VD = '2026-11-12';

function entry(load: number, extra: Partial<EntryDTO> = {}): EntryDTO {
  return {
    sleep: 3,
    fatigue: 3,
    sore: 3,
    stress: 3,
    mood: 3,
    rest: false,
    sessions: [{ type: null, rpe: 1, min: load }],
    ts: 1,
    ...extra,
  };
}
function group(days: Record<string, EntryDTO>): PlayerGroup {
  return { key: 'x', name: 'X', names: ['X'], ids: [], days, first: Object.keys(days).sort()[0] };
}

test('dates', () => {
  assert.equal(shift('2026-11-30', 1), '2026-12-01');
  assert.equal(shift('2026-03-01', -1), '2026-02-28');
  assert.equal(isYmd('2026-02-30'), false);
  assert.equal(isYmd('2026-11-12'), true);
  assert.equal(todayIn('Africa/Tunis', new Date('2026-11-12T23:30:00Z')), '2026-11-13');
});

test('exemple de la diapositive : charge 1780, monotonie 4,70, contrainte 8361', () => {
  const loads = [250, 310, 350, 400, 250, 220];
  const days: Record<string, EntryDTO> = {};
  loads.forEach((l, i) => (days[shift(VD, -i)] = entry(l)));
  const a = analyse(group(days), VD);
  assert.ok(a.mono !== null && Math.abs(a.mono - 4.697) < 0.01);
  assert.ok(a.strain !== null && Math.round(a.strain) === 8361);
});

test('RCAC, charge aiguë, chronique et fraîcheur', () => {
  const days: Record<string, EntryDTO> = {};
  for (let i = 0; i <= 20; i++) {
    const rpe = [5, 6, 3, 7, 4, 6, 2][i % 7];
    const min = [60, 90, 45, 75, 60, 90, 30][i % 7] + (i < 7 ? 40 : 0);
    days[shift(VD, -i)] = entry(0, { sessions: [{ type: 'combo', rpe, min }] });
  }
  const a = analyse(group(days), VD);
  assert.equal(a.score, 15);
  assert.equal(a.yday, 500);
  assert.equal(Math.round(a.acute!), 3660);
  assert.equal(Math.round(a.chronic!), 2780);
  assert.equal(a.acwr!.toFixed(2), '1.32');
  assert.equal(Math.round(a.fresh!), -880);
  assert.equal(a.mono!.toFixed(2), '2.07');
  assert.equal(a.status, 'warn'); // bien-être 15 <= 18
});

test('surcharge : RCAC > 1,5 => alerte', () => {
  const days: Record<string, EntryDTO> = {};
  for (let i = 0; i <= 20; i++) {
    const rpe = i < 7 ? 9 : [5, 6, 3, 7, 4, 6, 2][i % 7];
    const min = [60, 90, 45, 75, 60, 90, 30][i % 7] + (i < 7 ? 40 : 0);
    days[shift(VD, -i)] = entry(0, { sessions: [{ type: 'combo', rpe, min }] });
  }
  const a = analyse(group(days), VD);
  assert.equal(a.acwr!.toFixed(2), '1.75');
  assert.equal(a.status, 'bad');
});

test('contrainte comparée à la moyenne perso', () => {
  const hi = [300, 310, 290, 305, 300, 295, 310];
  const lo = [100, 500, 80, 450, 150, 500, 60];
  const days: Record<string, EntryDTO> = {};
  for (let i = 0; i < 36; i++) days[shift(VD, -i)] = entry(i < 7 ? hi[i] : lo[i % 7]);
  const a = analyse(group(days), VD);
  assert.equal(Math.round(a.strain!), 91840);
  assert.ok(a.strainDelta! > 30);
});

test('repos = charge nulle, pas de réponse = null', () => {
  assert.equal(loadOf(entry(500, { rest: true, sessions: [] })), 0);
  const a = analyse(group({ [shift(VD, -3)]: entry(100) }), VD);
  assert.equal(a.status, 'none');
  assert.equal(a.score, null);
});

test('regroupement des noms (cas réels)', () => {
  const mk = (name: string, date: string, id: string): EntryItem => ({ id, name, date, entry: entry(100) });
  const items: EntryItem[] = [
    mk('Nabil azouzi', '2026-11-09', '1'),
    mk('Azouzi nabil', '2026-11-10', '2'),
    mk('Azouzinabil nabil', '2026-11-11', '3'),
    mk('Karamosli elyes', '2026-11-09', '4'),
    mk('Karamosli', '2026-11-10', '5'),
    mk('Miladi fahmi', '2026-11-09', '6'),
    mk('Miladi famhi', '2026-11-10', '7'),
    mk('Miladi nabil', '2026-11-09', '8'),
    mk('Kadhi ahmed', '2026-11-09', '9'),
    mk('Kadhi ahmad', '2026-11-10', '10'),
    mk('Gerant', '2026-11-10', '11'),
    mk('Miladi', '2026-11-11', '12'), // ambigu : reste seul
  ];
  const g = groupPlayers(items);
  const byName = (n: string) => g.find((x) => x.names.includes(n))!;
  assert.equal(byName('Azouzi nabil'), byName('Nabil azouzi'));
  assert.equal(byName('Azouzi nabil'), byName('Azouzinabil nabil'));
  assert.equal(byName('Azouzi nabil').name, 'Azouzi nabil');
  assert.equal(byName('Karamosli').name, 'Karamosli elyes');
  assert.equal(byName('Miladi fahmi'), byName('Miladi famhi'));
  assert.notEqual(byName('Miladi fahmi'), byName('Miladi nabil'));
  assert.equal(byName('Kadhi ahmed'), byName('Kadhi ahmad'));
  assert.notEqual(byName('Gerant'), byName('Kadhi ahmed'));
  assert.equal(byName('Miladi').names.length, 1);
  assert.equal(g.length, 7);
});

test('regroupement : toutes les variantes d\'Azouzi, avec ou sans « Azouzi » seul', () => {
  const mk = (name: string, i: number): EntryItem => ({ id: String(i), name, date: `2026-11-1${i}`, entry: entry(100) });
  for (const names of [
    ['Azouzi', 'Azouzi c', 'Azouzi nabile', 'Azzouzi'],
    ['Azouzi c', 'Azouzi nabile', 'Azzouzi'],
    ['Azzouzi', 'Azouzi nabile'],
  ]) {
    const g = groupPlayers(names.map(mk));
    assert.equal(g.length, 1, names.join(' / '));
    assert.equal(g[0].names.length, names.length);
  }
});

test('slug', () => {
  assert.equal(slug('  Méd Ali  Ben-Othmen '), 'med-ali-ben-othmen');
  assert.equal(slug('???'), 'x');
});

test('payload du staff : jour passé et joueurs arrivés plus tard', () => {
  const items: EntryItem[] = [
    { id: 'a', name: 'Ali', date: '2026-11-10', entry: entry(100) },
    { id: 'b', name: 'Omar', date: '2026-11-12', entry: entry(100) },
  ];
  const p = buildStaffPayload(items.filter((i) => i.date <= '2026-11-11'), '2026-11-11', '2026-11-12');
  assert.equal(p.players.length, 1);
  assert.equal(p.chart.values.length, 14);
});

test('validation des réponses', () => {
  const ok = validateSubmission({
    name: '  Ali   Ben  ',
    sleep: 3, fatigue: 4, sore: 2, stress: 5, mood: 1,
    rest: false,
    sessions: [{ type: 'combo', rpe: 6, min: 60 }, { type: '', rpe: 7, min: 90 }],
  });
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.value.name, 'Ali Ben');
    assert.equal(ok.value.sessions[1].type, null);
  }
  const bad = [
    { name: '', sleep: 3, fatigue: 3, sore: 3, stress: 3, mood: 3, rest: true, sessions: [] },
    { name: 'A', sleep: 6, fatigue: 3, sore: 3, stress: 3, mood: 3, rest: true, sessions: [] },
    { name: 'A', sleep: 3, fatigue: 3, sore: 3, stress: 3, mood: 3, rest: false, sessions: [] },
    { name: 'A', sleep: 3, fatigue: 3, sore: 3, stress: 3, mood: 3, rest: false, sessions: [{ type: null, rpe: 11, min: 10 }] },
    { name: 'A', sleep: 3, fatigue: 3, sore: 3, stress: 3, mood: 3, rest: false, sessions: [{ type: null, rpe: 5, min: 0 }] },
    { name: 'A', sleep: 3, fatigue: 3, sore: 3, stress: 3, mood: 3, rest: false, sessions: [{ type: 'zzz', rpe: 5, min: 10 }] },
    { name: 'A', sleep: 3, fatigue: 3, sore: 3, stress: 3, mood: 3, rest: false,
      sessions: [1, 2, 3].map(() => ({ type: null, rpe: 5, min: 10 })) },
  ];
  for (const b of bad) assert.equal(validateSubmission(b).ok, false, JSON.stringify(b));
});
