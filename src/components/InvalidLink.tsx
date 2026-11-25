'use client';

import { LangSwitch } from './LangSwitch';
import { useLang } from './LangProvider';

export function InvalidLink() {
  const { t } = useLang();
  return (
    <>
      <div className="top">
        <div className="brand">{t('brand')}</div>
        <div className="tools">
          <LangSwitch />
        </div>
      </div>
      <div className="card stack">
        <h2>{t('invalid.title')}</h2>
        <p className="muted">{t('invalid.text')}</p>
      </div>
    </>
  );
}
