'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LangSwitch } from './LangSwitch';
import { useLang } from './LangProvider';

export function StaffLogin() {
  const { t } = useLang();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/staff');
        router.refresh();
        return;
      }
      setErr(res.status === 401 ? t('login.err') : t('e.fail'));
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
        <h1>{t('login.title')}</h1>
      </div>
      <form className="card stack" onSubmit={submit}>
        <label className="lbl" htmlFor="pw">
          {t('login.pw')}
        </label>
        <input
          id="pw"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="err" role="alert">
          {err}
        </div>
        <button className="btn" type="submit" disabled={busy || !password}>
          {t('login.btn')}
        </button>
      </form>
    </>
  );
}
