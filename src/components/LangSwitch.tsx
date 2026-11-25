'use client';

import { useLang } from './LangProvider';

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="tabs" role="group" aria-label="Langue / Language">
      {(['fr', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          className="tab lg"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
