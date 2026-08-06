import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCategories, replaceCategories, type Category } from '../data/topics';
import { saveTopics } from '../lib/topicsApi';
import { TopicImport } from './TopicImport';
import { useT } from '../i18n';

type Bucket = 'base' | 'singapore' | 'china';
type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

/** Structural clone so edits never mutate the imported module data in place. */
const clone = (categories: Category[]): Category[] =>
  categories.map((c) => ({
    ...c,
    label: { ...c.label },
    base: c.base.map((p) => ({ ...p })),
    extra: { singapore: [...c.extra.singapore], china: [...c.extra.china] },
  }));

export function TopicBankEditor() {
  const t = useT();
  const [categories, setCategories] = useState<Category[]>(() => clone(getCategories()));
  // Drill-in rather than accordion: opening a category replaces the list, so
  // the whole panel is devoted to the one being edited.
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimer = useRef<number | null>(null);

  /*
   * What was last written to storage, serialized. Comparing against this is what
   * makes saving idempotent: a re-render that didn't actually change anything
   * produces an identical payload and writes nothing.
   *
   * A boolean "dirty" flag can't do this job — it stays true after a save, so
   * anything that re-runs this effect (React Fast Refresh preserves refs and
   * re-runs effects) fires another write, which triggers another refresh, and
   * so on forever.
   */
  const lastSaved = useRef<string | null>(null);
  if (lastSaved.current === null) lastSaved.current = JSON.stringify(categories);

  // Debounced write-back — typing a topic shouldn't hit storage per keystroke.
  useEffect(() => {
    const payload = JSON.stringify(categories);
    if (payload === lastSaved.current) return;

    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = window.setTimeout(() => {
      // Claim it before the write so nothing can re-enter mid-flight.
      lastSaved.current = payload;
      saveTopics(categories)
        .then(() => {
          // Publish to the live bank so the spinner sees the edit immediately —
          // the stored copy alone doesn't reach the running app.
          replaceCategories(clone(categories));
          setSaveState('saved');
        })
        .catch(() => {
          lastSaved.current = null; // let the next edit retry
          setSaveState('failed');
        });
    }, 500);

    return () => {
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    };
  }, [categories]);

  const update = useCallback((next: Category[]) => {
    setCategories(next);
  }, []);

  const addTopic = (categoryId: string, bucket: Bucket, en: string, zh: string) => {
    update(
      categories.map((c) => {
        if (c.id !== categoryId) return c;
        if (bucket === 'base') return { ...c, base: [...c.base, { en, zh }] };
        if (bucket === 'singapore')
          return { ...c, extra: { ...c.extra, singapore: [...c.extra.singapore, en] } };
        return { ...c, extra: { ...c.extra, china: [...c.extra.china, zh || en] } };
      }),
    );
  };

  const removeTopic = (categoryId: string, bucket: Bucket, index: number) => {
    update(
      categories.map((c) => {
        if (c.id !== categoryId) return c;
        if (bucket === 'base') return { ...c, base: c.base.filter((_, i) => i !== index) };
        if (bucket === 'singapore')
          return {
            ...c,
            extra: { ...c.extra, singapore: c.extra.singapore.filter((_, i) => i !== index) },
          };
        return { ...c, extra: { ...c.extra, china: c.extra.china.filter((_, i) => i !== index) } };
      }),
    );
  };

  const editTopic = (
    categoryId: string,
    bucket: Bucket,
    index: number,
    locale: 'en' | 'zh',
    value: string,
  ) => {
    update(
      categories.map((c) => {
        if (c.id !== categoryId) return c;
        if (bucket === 'base') {
          return {
            ...c,
            base: c.base.map((p, i) => (i === index ? { ...p, [locale]: value } : p)),
          };
        }
        const key = bucket === 'singapore' ? 'singapore' : 'china';
        return {
          ...c,
          extra: { ...c.extra, [key]: c.extra[key].map((v, i) => (i === index ? value : v)) },
        };
      }),
    );
  };

  const needle = filter.trim().toLowerCase();
  const matches = (value: string) => !needle || value.toLowerCase().includes(needle);

  const countOf = (c: Category) =>
    c.base.length + c.extra.singapore.length + c.extra.china.length;

  const visible = useMemo(() => {
    if (!needle) return categories;
    return categories.filter((c) => {
      const haystack = [
        c.label.en,
        c.label.zh,
        ...c.base.flatMap((p) => [p.en, p.zh]),
        ...c.extra.singapore,
        ...c.extra.china,
      ];
      return haystack.some((s) => s.toLowerCase().includes(needle));
    });
  }, [categories, needle]);

  const openCategory = openCategoryId
    ? (categories.find((c) => c.id === openCategoryId) ?? null)
    : null;

  const toolbar = (
    <div className="topics-toolbar">
      <input
        className="topics-filter"
        type="search"
        value={filter}
        placeholder={t.filterTopics}
        onChange={(event) => setFilter(event.target.value)}
      />
      {saveState !== 'idle' && (
        <span className={`topics-save is-${saveState}`}>
          {saveState === 'saving' ? t.saving : saveState === 'saved' ? t.saved : t.saveFailed}
        </span>
      )}
    </div>
  );

  if (openCategory) {
    return (
      <div className="topics-editor">
        <div className="topics-drill-head">
          <button
            type="button"
            className="topics-back"
            onClick={() => setOpenCategoryId(null)}
            aria-label={t.backToCategories}
          >
            <span aria-hidden="true">‹</span>
            {t.backToCategories}
          </button>
          <span className="niche-emoji" aria-hidden="true">
            {openCategory.emoji}
          </span>
          <span className="topics-category-name">
            {openCategory.label.en} · {openCategory.label.zh}
          </span>
          <span className="topics-category-count">{t.topicCount(countOf(openCategory))}</span>
        </div>

        {toolbar}

        <div className="topics-list">
          <Bucketed
            title={t.bucketBase}
            bilingual
            rows={openCategory.base.map((p, i) => ({ index: i, en: p.en, zh: p.zh }))}
            onEdit={(i, locale, value) => editTopic(openCategory.id, 'base', i, locale, value)}
            onRemove={(i) => removeTopic(openCategory.id, 'base', i)}
            onAdd={(en, zh) => addTopic(openCategory.id, 'base', en, zh)}
            matches={matches}
          />
          <Bucketed
            title={t.bucketSingapore}
            rows={openCategory.extra.singapore.map((v, i) => ({ index: i, en: v, zh: '' }))}
            onEdit={(i, _l, value) => editTopic(openCategory.id, 'singapore', i, 'en', value)}
            onRemove={(i) => removeTopic(openCategory.id, 'singapore', i)}
            onAdd={(en) => addTopic(openCategory.id, 'singapore', en, '')}
            matches={matches}
          />
          <Bucketed
            title={t.bucketChina}
            rows={openCategory.extra.china.map((v, i) => ({ index: i, en: v, zh: '' }))}
            onEdit={(i, _l, value) => editTopic(openCategory.id, 'china', i, 'en', value)}
            onRemove={(i) => removeTopic(openCategory.id, 'china', i)}
            onAdd={(en) => addTopic(openCategory.id, 'china', '', en)}
            matches={matches}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="topics-editor">
      <TopicImport categories={categories} onApply={(next) => update(clone(next))} />

      {toolbar}

      <div className="topics-list">
        {visible.length === 0 && <p className="topics-empty">{t.emptyFilter}</p>}

        {visible.map((category) => (
          <button
            key={category.id}
            type="button"
            className="topics-category-head"
            onClick={() => setOpenCategoryId(category.id)}
          >
            <span className="niche-emoji" aria-hidden="true">
              {category.emoji}
            </span>
            <span className="topics-category-name">
              {category.label.en} · {category.label.zh}
            </span>
            <span className="topics-category-count">{t.topicCount(countOf(category))}</span>
            <span className="topics-chevron" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Bucketed({
  title,
  rows,
  bilingual = false,
  onEdit,
  onRemove,
  onAdd,
  matches,
}: {
  title: string;
  rows: { index: number; en: string; zh: string }[];
  bilingual?: boolean;
  onEdit: (index: number, locale: 'en' | 'zh', value: string) => void;
  onRemove: (index: number) => void;
  onAdd: (en: string, zh: string) => void;
  matches: (value: string) => boolean;
}) {
  const t = useT();
  const [draftEn, setDraftEn] = useState('');
  const [draftZh, setDraftZh] = useState('');
  const enRef = useRef<HTMLInputElement>(null);
  const zhRef = useRef<HTMLInputElement>(null);

  const en = draftEn.trim();
  const zh = draftZh.trim();
  // Shared topics are stored as index-aligned {en, zh} pairs, so both halves
  // are genuinely required — a half-filled pair would render blank in one of
  // the regional pools.
  const complete = bilingual ? Boolean(en && zh) : Boolean(en);

  /** Focus whichever half is missing rather than silently discarding the input. */
  const nudgeMissing = () => {
    if (!en) enRef.current?.focus();
    else if (bilingual && !zh) zhRef.current?.focus();
  };

  const commit = () => {
    if (!complete) {
      nudgeMissing();
      return;
    }
    onAdd(en, zh);
    setDraftEn('');
    setDraftZh('');
    enRef.current?.focus();
  };

  const shown = rows.filter((r) => matches(r.en) || matches(r.zh));

  return (
    <div className="topics-bucket">
      <h4 className="topics-bucket-title">{title}</h4>
      {shown.map((row) => (
        <div key={row.index} className="topics-row">
          <input
            className="topics-input"
            value={row.en}
            onChange={(event) => onEdit(row.index, 'en', event.target.value)}
          />
          {bilingual && (
            <input
              className="topics-input"
              value={row.zh}
              onChange={(event) => onEdit(row.index, 'zh', event.target.value)}
            />
          )}
          <button
            type="button"
            className="topics-delete"
            aria-label={t.deleteTopic}
            onClick={() => onRemove(row.index)}
          >
            ×
          </button>
        </div>
      ))}

      <div className="topics-row is-add">
        <input
          ref={enRef}
          className={`topics-input ${bilingual && zh && !en ? 'is-missing' : ''}`}
          value={draftEn}
          placeholder={bilingual ? 'English' : title}
          onChange={(event) => setDraftEn(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            // Enter moves on to the other half rather than failing silently.
            if (bilingual && en && !zh) zhRef.current?.focus();
            else commit();
          }}
        />
        {bilingual && (
          <input
            ref={zhRef}
            className={`topics-input ${en && !zh ? 'is-missing' : ''}`}
            value={draftZh}
            placeholder="中文"
            onChange={(event) => setDraftZh(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              if (!en) enRef.current?.focus();
              else commit();
            }}
          />
        )}
        <button
          type="button"
          className="topics-add"
          onClick={commit}
          aria-label={t.addTopic}
          /* Deliberately NOT aria-disabled: pressing it while incomplete
             does something useful — it focuses the half that's missing.
             data-incomplete only dims it as a hint. */
          data-incomplete={!complete ? '' : undefined}
        >
          +
        </button>
      </div>
      {bilingual && (en || zh) && !complete && (
        <p className="topics-hint">{t.bothLanguagesRequired}</p>
      )}
    </div>
  );
}
