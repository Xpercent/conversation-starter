import { useState } from 'react';
import { useT } from '../i18n';

interface Props {
  items: string[];
  onChange: (items: string[]) => void;
}

/**
 * One-line jots for the research phase — Cornell's Record step. Deliberately a
 * single-line input rather than a textarea: a big box over a running timer
 * invites writing prose instead of researching. Enter commits a line, the way
 * the topic editor's add-row works.
 */
export function CaptureJots({ items, onChange }: Props) {
  const t = useT();
  const [draft, setDraft] = useState('');

  const commit = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, text]);
    setDraft('');
  };

  return (
    <div className="capture-jots">
      {items.length > 0 && (
        <ul className="jot-list">
          {items.map((item, i) => (
            <li key={`${i}-${item}`} className="jot-item">
              <span className="jot-text">{item}</span>
              <button
                type="button"
                className="jot-delete"
                aria-label={t.jotDelete}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        className="jot-input"
        type="text"
        value={draft}
        placeholder={t.jotsPlaceholder}
        aria-label={t.jotsLabel}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
        /* Clicking "Done researching" blurs the input first — commit the
           half-typed line rather than dropping it. */
        onBlur={commit}
      />
    </div>
  );
}
