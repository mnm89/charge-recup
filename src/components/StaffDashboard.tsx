'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDay, shift } from '@/lib/dates';
import { acwrClass, dec, fmt, locale, signed, typeLabel } from '@/lib/format';
import type { HistoryRow, PlayerStats, StaffPayload } from '@/lib/types';
import { LangSwitch } from './LangSwitch';
import { useLang } from './LangProvider';

const RANK = { bad: 0, warn: 1, ok: 2, none: 3 } as const;

/** Tableau du staff : réponses du jour, indicateurs par joueur, historique, graphique d'équipe. */
export function StaffDashboard({ data }: { data: StaffPayload }) {
  const { lang, t } = useLang();
  const router = useRouter();
  const { viewDay, today, players, chart } = data;

  const [openHist, setOpenHist] = useState<Record<string, boolean>>({});
  const [pendingDel, setPendingDel] = useState<string | null>(null);
  const [delErr, setDelErr] = useState('');
  const [busy, setBusy] = useState(false);

  const goDay = (d: string) => router.push(d === today ? '/staff' : `/staff?day=${d}`);

  async function remove(p: PlayerStats) {
    setBusy(true);
    setDelErr('');
    try {
      const r = await fetch('/api/staff/players', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: p.ids }),
      });
      if (!r.ok) throw new Error('delete failed');
      router.refresh();
    } catch {
      setDelErr(t('del.fail'));
    } finally {
      setPendingDel(null);
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/staff/logout', { method: 'POST' });
    router.push('/staff/login');
    router.refresh();
  }

  const answered = players
    .filter((p) => p.status !== 'none')
    .sort((a, b) => RANK[a.status] - RANK[b.status] || (a.score ?? 0) - (b.score ?? 0));
  const missing = players.filter((p) => p.status === 'none');
  const count = { bad: 0, warn: 0, ok: 0 };
  for (const p of answered) count[p.status as 'bad' | 'warn' | 'ok']++;
  const isToday = viewDay === today;

  function deleteUI(p: PlayerStats) {
    if (pendingDel === p.key) {
      return (
        <div className="delrow">
          <span className="delask">{t('del.ask', { n: p.name })}</span>
          <span className="delbtns">
            <button type="button" className="dbtn danger" disabled={busy} onClick={() => remove(p)}>
              {busy ? t('del.busy') : t('del.yes')}
            </button>
            <button type="button" className="dbtn" onClick={() => setPendingDel(null)}>
              {t('del.no')}
            </button>
          </span>
        </div>
      );
    }
    return (
      <div className="delrow">
        <button type="button" className="dbtn" onClick={() => setPendingDel(p.key)}>
          {t('del')}
        </button>
      </div>
    );
  }

  function history(p: PlayerStats) {
    if (!p.history.length) return null;
    const sessionText = (h: HistoryRow) =>
      h.rest
        ? t('h.rest')
        : h.sessions
            .map((x) => `${typeLabel(t, x.type) || t('word.session')} ${x.rpe} × ${x.min} min`)
            .join(' + ');
    return (
      <details
        className="hist"
        open={!!openHist[p.key]}
        onToggle={(e) => {
          const isOpen = (e.currentTarget as HTMLDetailsElement).open;
          setOpenHist((cur) => (cur[p.key] === isOpen ? cur : { ...cur, [p.key]: isOpen }));
        }}
      >
        <summary>
          {t('hist')}{' '}
          <span className="muted" style={{ fontWeight: 400 }}>
            ({p.history.length})
          </span>
        </summary>
        <div className="histbox">
          <table>
            <thead>
              <tr>
                <th>{t('h.date')}</th>
                <th>{t('h.well')}</th>
                <th>{t('h.load')}</th>
                <th>{t('h.sess')}</th>
              </tr>
            </thead>
            <tbody>
              {p.history.map((h) => (
                <tr key={h.date}>
                  <td>{formatDay(h.date, locale(lang))}</td>
                  <td>{h.score}/25</td>
                  <td>{fmt(lang, h.load)}</td>
                  <td>{sessionText(h)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    );
  }

  function strainSub(p: PlayerStats) {
    if (p.strainDelta === null) return null;
    const d = p.strainDelta;
    const pc = Math.round(d * 100);
    const up = d >= 0.3;
    return (
      <em className={up ? 'warn' : ''}>
        {up ? '▲' : d <= -0.3 ? '▼' : '≈'} {pc > 0 ? '+' : ''}
        {pc} % {t('m.vsavg')}
      </em>
    );
  }

  function freshClass(p: PlayerStats): string {
    if (p.fresh === null || p.chronic === null || !(p.chronic > 0) || p.acute === null) return '';
    return acwrClass(p.acute / p.chronic);
  }

  function card(p: PlayerStats) {
    const sc = p.score === null ? '' : p.score <= 14 ? 'bad' : p.score <= 18 ? 'warn' : 'ok';
    return (
      <div className="card pl">
        <div className="pl-top">
          <div className="pl-name">{p.name}</div>
          <span className={`pill ${p.status}`}>{t('s.' + p.status)}</span>
        </div>
        <div className="mets">
          <div className="met">
            <span>{t('m.well')}</span>
            <b className={sc}>{p.score}/25</b>
            {p.delta !== null && (
              <span className="muted" style={{ fontSize: 13, display: 'inline', textTransform: 'none', letterSpacing: 0 }}>
                {' '}
                ({p.delta > 0 ? '+' : ''}
                {dec(lang, p.delta, 1)})
              </span>
            )}
          </div>
          <div className="met">
            <span>{t('m.load')}</span>
            <b>{p.yday === null ? '—' : fmt(lang, p.yday)}</b>
          </div>
          <div className="met">
            <span>{t('m.acute')}</span>
            <b>{p.acute === null ? '—' : fmt(lang, p.acute)}</b>
          </div>
          <div className="met">
            <span>{t('m.chronic')}</span>
            <b>{p.chronic === null ? '—' : fmt(lang, p.chronic)}</b>
          </div>
          <div className="met">
            <span>{t('m.acwr')}</span>
            <b className={acwrClass(p.acwr)}>{p.acwr === null ? '—' : dec(lang, p.acwr, 2)}</b>
          </div>
          <div className="met">
            <span>{t('m.fresh')}</span>
            <b className={freshClass(p)}>{p.fresh === null ? '—' : signed(lang, p.fresh)}</b>
          </div>
          <div className="met">
            <span>{t('m.mono')}</span>
            <b className={p.mono !== null && p.mono > 2 ? 'warn' : ''}>
              {p.mono === null ? '—' : dec(lang, p.mono, 2)}
            </b>
          </div>
          <div className="met">
            <span>{t('m.strain')}</span>
            <b>{p.strain === null ? '—' : fmt(lang, p.strain)}</b>
            {strainSub(p)}
          </div>
        </div>
        {p.flags.length > 0 && (
          <div className="flags">
            {p.flags.map((f) => (
              <span className="flag" key={f.k}>
                {t('q.' + f.k)} {f.v}/5
              </span>
            ))}
          </div>
        )}
        {p.names.length > 1 && (
          <p className="muted" style={{ fontSize: 13 }}>
            {t('alias', { n: p.names.filter((x) => x !== p.name).join(', ') })}
          </p>
        )}
        {history(p)}
        {deleteUI(p)}
      </div>
    );
  }

  function teamChart() {
    const { labels, values } = chart;
    const max = Math.max(...values.map((v) => v ?? 0));
    if (!max) return <p className="muted">{t('chart.empty')}</p>;
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    let top = Math.ceil(max / step) * step;
    if (top / step < 2) top = 2 * step;
    const W = 420, H = 150, Lm = 44, R = 8, T = 10, B = 22;
    const ih = H - T - B;
    const bw = (W - Lm - R) / 14;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 320, maxWidth: '100%' }} role="img" aria-label={t('chart.aria')}>
        {[0, 0.5, 1].map((f) => {
          const y = T + ih - ih * f;
          return (
            <g key={f}>
              <line className="grid" x1={Lm} x2={W - R} y1={y} y2={y} />
              <text x={Lm - 6} y={y + 4} textAnchor="end">
                {fmt(lang, top * f)}
              </text>
            </g>
          );
        })}
        {values.map((v, i) => {
          const x = Lm + i * bw + bw * 0.18;
          const w = bw * 0.64;
          const h = v === null ? 0 : (ih * v) / top;
          return (
            <g key={i}>
              {v !== null && (
                <rect className="bar" x={x} y={T + ih - h} width={w} height={Math.max(h, 1)} rx={2} style={{ fill: 'var(--accent)' }} />
              )}
              {(i % 2 === 1 || i === 13) && (
                <text x={x + w / 2} y={H - 6} textAnchor="middle">
                  {labels[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <>
      <div className="top">
        <div className="brand">{t('brand')}</div>
        <div className="tools">
          <LangSwitch />
          <div className="tabs">
            <Link href="/" className="tab">
              {t('tab.player')}
            </Link>
            <span className="tab" aria-selected="true" role="tab">
              {t('tab.staff')}
            </span>
          </div>
          <button type="button" className="dbtn" onClick={logout}>
            {t('logout')}
          </button>
        </div>
      </div>

      <section className="stack">
        <div className="head" style={{ paddingBottom: 4 }}>
          <div className="daynav">
            <button type="button" className="dn" aria-label={t('day.prev')} onClick={() => goDay(shift(viewDay, -1))}>
              ‹
            </button>
            <div className="date">
              {formatDay(viewDay, locale(lang), { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <button
              type="button"
              className="dn"
              aria-label={t('day.next')}
              disabled={viewDay >= today}
              onClick={() => goDay(shift(viewDay, 1))}
            >
              ›
            </button>
            {!isToday && (
              <button type="button" className="dtoday" onClick={() => goDay(today)}>
                {t('day.today')}
              </button>
            )}
          </div>
          <h1>{t('staff.title')}</h1>
        </div>

        <div className="sum">
          <span className="pill none">{t('sum.resp', { a: answered.length, b: players.length })}</span>
          {count.bad > 0 && (
            <span className="pill bad">{count.bad > 1 ? t('sum.badN', { n: count.bad }) : t('sum.bad1')}</span>
          )}
          {count.warn > 0 && <span className="pill warn">{t('sum.warn', { n: count.warn })}</span>}
          {count.ok > 0 && <span className="pill ok">{t('sum.ok', { n: count.ok })}</span>}
        </div>

        <div className="stack">
          {answered.length === 0 ? (
            <div className="card empty">
              {players.length ? (isToday ? t('empty.today') : t('empty.day')) : t('empty.none')}
            </div>
          ) : (
            answered.map((p) => <div key={p.key}>{card(p)}</div>)
          )}
        </div>
        <div className="err" role="alert">
          {delErr}
        </div>

        {missing.length > 0 && (
          <div className="card stack">
            <h2>{isToday ? t('missing') : t('missing.past')}</h2>
            <div className="stack" style={{ gap: 6 }}>
              {missing.map((p) => (
                <div className="stack" style={{ gap: 4 }} key={p.key}>
                  <div className="mrow">
                    <span>{p.name}</span>
                    {deleteUI(p)}
                  </div>
                  {history(p)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card stack">
          <h2>{t('chart.title')}</h2>
          <div className="chartbox">
            {teamChart()}
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            {t('chart.note')}
          </p>
        </div>

        <details className="card">
          <summary>{t('how')}</summary>
          {['how1', 'how2', 'how3', 'how4', 'how5', 'how6', 'how7', 'how8'].map((k) => (
            <p key={k} dangerouslySetInnerHTML={{ __html: t(k) }} />
          ))}
        </details>
      </section>

      <footer>{t('foot')}</footer>
    </>
  );
}
