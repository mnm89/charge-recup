'use client';

import { useState } from 'react';
import { RPE_LABELS } from '@/lib/i18n-dict';
import { formatDay } from '@/lib/dates';
import { loadText, locale, typeLabel } from '@/lib/format';
import { QS, SESSION_TYPES, type QKey, type SessionDTO, type SessionTypeKey } from '@/lib/types';
import { LangSwitch } from './LangSwitch';
import { useLang } from './LangProvider';

type SessionForm = { type: SessionTypeKey | ''; rpe: number | null; min: string };
type Done = { name: string; score: number; load: number; rest: boolean; sessions: SessionDTO[] };

const emptySession = (): SessionForm => ({ type: '', rpe: null, min: '' });
const emptyWellness = (): Record<QKey, number> => ({ sleep: 0, fatigue: 0, sore: 0, stress: 0, mood: 0 });
const MINUTE_SHORTCUTS = [30, 45, 60, 75, 90, 120];

/** Questionnaire du matin : nom, 5 notes de bien-être, séances de la veille (1 ou 2). */
export function QuestionnaireForm({ today, playerKey }: { today: string; playerKey?: string }) {
  const { lang, t } = useLang();
  const [name, setName] = useState('');
  const [w, setW] = useState<Record<QKey, number>>(emptyWellness());
  const [rest, setRest] = useState(false);
  const [sessions, setSessions] = useState<SessionForm[]>([emptySession()]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const patchSession = (i: number, patch: Partial<SessionForm>) =>
    setSessions((cur) => cur.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  function reset() {
    setName('');
    setW(emptyWellness());
    setRest(false);
    setSessions([emptySession()]);
    setErr('');
    setDone(null);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr('');

    const cleaned = name.replace(/\s+/g, ' ').trim();
    if (!cleaned) return setErr(t('e.name'));
    for (const k of QS) if (!w[k]) return setErr(t('e.q', { q: t('q.' + k) }));

    const payload: SessionDTO[] = [];
    if (!rest) {
      const n = sessions.length;
      for (let i = 0; i < n; i++) {
        const s = sessions[i];
        const min = Number(s.min);
        if (s.rpe === null) return setErr(n > 1 ? t('e.intN', { n: i + 1 }) : t('e.int1'));
        if (!min || min < 1) return setErr(n > 1 ? t('e.durN', { n: i + 1 }) : t('e.dur1'));
        payload.push({ type: s.type || null, rpe: s.rpe, min: Math.min(300, Math.round(min)) });
      }
    }

    setBusy(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleaned, ...w, rest, sessions: payload, key: playerKey }),
      });
      if (res.status === 403) return setErr(t('e.link'));
      if (!res.ok) return setErr(t('e.fail'));
      const out = (await res.json()) as { score: number; load: number };
      setDone({ name: cleaned, score: out.score, load: out.load, rest, sessions: payload });
    } catch {
      setErr(t('e.conn'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="top">
        <div className="brand">{t('brand')}</div>
        <div className="tools">
          <LangSwitch />
        </div>
      </div>

      <div className="head">
        <div className="date">
          {formatDay(today, locale(lang), { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1>{t('p.title')}</h1>
        <p className="muted">{t('p.sub')}</p>
      </div>

      {done ? (
        <div className="card stack">
          <h2>{done.name.split(' ')[0] ? t('thanks', { n: done.name.split(' ')[0] }) : t('thanks0')}</h2>
          <div>
            <div className="score">
              {done.score}
              <small> / 25</small>
            </div>
            <p className="muted">{t('done.score')}</p>
          </div>
          <p className="muted">{loadText(t, lang, done.rest, done.sessions, done.load)}</p>
          <p className="muted" style={{ fontSize: 13 }}>
            {t('done.note')}
          </p>
          <button type="button" className="btn ghost" onClick={reset}>
            {t('done.next')}
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          <div className="card">
            <label className="lbl" htmlFor="name">
              {t('name.label')}
            </label>
            <input
              id="name"
              type="text"
              maxLength={40}
              autoComplete="name"
              placeholder={t('name.ph')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>

          <div className="card">
            {QS.map((k) => (
              <div className="q" key={k}>
                <div className="q-title">{t('q.' + k)}</div>
                <div className="scale">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="opt"
                      aria-pressed={w[k] === v}
                      aria-label={t('q.aria', { q: t('q.' + k), v })}
                      onClick={() => setW((cur) => ({ ...cur, [k]: v }))}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="ends">
                  <span>1 {t(`q.${k}.lo`)}</span>
                  <span>5 {t(`q.${k}.hi`)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="card stack">
            <div>
              <h2>{t('sess.title')}</h2>
              <p className="muted">{t('sess.sub')}</p>
            </div>
            <label className="check">
              <input type="checkbox" checked={rest} onChange={(e) => setRest(e.target.checked)} />{' '}
              <span>{t('rest')}</span>
            </label>

            {!rest && (
              <div className="stack">
                {sessions.map((s, i) => (
                  <div
                    key={i}
                    className="stack"
                    style={{
                      gap: 14,
                      ...(i ? { borderTop: '1px solid var(--line)', paddingTop: 16 } : {}),
                    }}
                  >
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <h3 style={{ fontSize: 21 }}>{t('blk.title', { n: i + 1 })}</h3>
                      {i > 0 && (
                        <button
                          type="button"
                          className="dbtn"
                          onClick={() => setSessions((cur) => cur.slice(0, 1))}
                        >
                          {t('blk.remove')}
                        </button>
                      )}
                    </div>

                    <div className="q" style={{ borderTop: 0, paddingBlock: 0 }}>
                      <div className="q-title">
                        {t('ty.label')}{' '}
                        <span className="muted" style={{ fontWeight: 400 }}>
                          {t('optional')}
                        </span>
                      </div>
                      <div className="chips">
                        {SESSION_TYPES.map((k) => (
                          <button
                            key={k}
                            type="button"
                            className="chip"
                            aria-pressed={s.type === k}
                            onClick={() => patchSession(i, { type: s.type === k ? '' : k })}
                          >
                            {typeLabel(t, k)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="q" style={{ borderTop: 0, paddingBlock: 0 }}>
                      <div className="q-title">
                        {t('blk.int')}{' '}
                        <span className="muted" style={{ fontWeight: 400 }}>
                          {t('blk.intnote')}
                        </span>
                      </div>
                      <div className="scale rpe">
                        {Array.from({ length: 11 }, (_, r) => (
                          <button
                            key={r}
                            type="button"
                            className="opt"
                            aria-pressed={s.rpe === r}
                            aria-label={t('blk.aria', { n: i + 1, r })}
                            onClick={() => patchSession(i, { rpe: r })}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <div className="rpelabel">{s.rpe === null ? '' : RPE_LABELS[lang][s.rpe]}</div>
                    </div>

                    <div className="q" style={{ borderTop: 0, paddingBlock: 0 }}>
                      <label className="q-title" htmlFor={`min${i}`}>
                        {t('blk.dur')}
                      </label>
                      <input
                        id={`min${i}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={300}
                        placeholder={t('blk.ph')}
                        value={s.min}
                        onChange={(e) => patchSession(i, { min: e.target.value })}
                      />
                      <div className="chips">
                        {MINUTE_SHORTCUTS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            className="chip"
                            onClick={() => patchSession(i, { min: String(m) })}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {sessions.length < 2 && (
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ minHeight: 48, fontSize: 17 }}
                    onClick={() => setSessions((cur) => [...cur, emptySession()])}
                  >
                    {t('add2')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="err" role="alert">
            {err}
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? t('sending') : t('send')}
          </button>
        </form>
      )}

      <footer>{t('foot')}</footer>
    </>
  );
}
