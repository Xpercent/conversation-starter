import { useRef, useState } from 'react';
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_ID, type Category } from '../data/topics';
import { ACCEPTED_EXTENSIONS, parseTopicFile, type Bucket, type ImportedRow } from '../lib/importTopics';
import { planImport, toCsv } from '../lib/mergeTopics';
import { validateBank } from '../lib/topicsSchema';
import { useT } from '../i18n';

interface Props {
  categories: Category[];
  onApply: (categories: Category[]) => void;
}

/** Parsed and waiting for a decision. Nothing is committed at this stage. */
type Pending =
  | { kind: 'rows'; rows: ImportedRow[] }
  | { kind: 'bank'; categories: Category[] };

type Stage = 'idle' | 'reading' | 'preview';

function download(filename: string, contents: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking immediately can cancel the download in Safari; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const TEMPLATE = `category,en,zh,region
General,Nostalgia,怀旧,shared
General,The best kopi order,,singapore
Fitness,,晨跑还是夜跑,china
`;

export function TopicImport({ categories, onApply }: Props) {
  const t = useT();
  const [stage, setStage] = useState<Stage>('idle');
  const [pending, setPending] = useState<Pending | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fallbackBucket, setFallbackBucket] = useState<Bucket>('base');
  const fileInput = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage('idle');
    setPending(null);
    setErrors([]);
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleFile = async (file: File) => {
    setStage('reading');
    setErrors([]);
    setNotice(null);

    const result = await parseTopicFile(file);

    // A .json upload is a whole exported bank, so it goes through the real
    // schema rather than the row path — and it must pass before it is offered.
    if (result.bank !== undefined) {
      const validated = validateBank(result.bank);
      if (!validated.ok) {
        setErrors(validated.errors);
        setStage('idle');
        return;
      }
      setPending({ kind: 'bank', categories: validated.categories });
      setStage('preview');
      return;
    }

    if (result.rows.length === 0) {
      setErrors(result.errors);
      setStage('idle');
      return;
    }

    setErrors(result.errors);
    setPending({ kind: 'rows', rows: result.rows });
    setStage('preview');
  };

  const apply = (mode: 'merge' | 'replace') => {
    if (!pending) return;

    if (pending.kind === 'bank') {
      onApply(pending.categories);
      setNotice(t.importBankFile(pending.categories.length));
      reset();
      return;
    }

    const plan = planImport(categories, pending.rows, {
      mode,
      fallbackCategoryId: DEFAULT_CATEGORY_ID,
      fallbackBucket,
    });
    onApply(plan.categories);
    setNotice(t.importDone(plan.added));
    reset();
  };

  // Recomputed on every render rather than memoised: it is a pure fold over a
  // list someone just picked by hand, and it has to track the bucket selector.
  const preview =
    pending?.kind === 'rows'
      ? planImport(categories, pending.rows, {
          mode: 'merge',
          fallbackCategoryId: DEFAULT_CATEGORY_ID,
          fallbackBucket,
        })
      : null;

  return (
    <div className="topics-import">
      {stage !== 'preview' && (
        <>
          <div
            className={`import-drop ${dragging ? 'is-dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
          >
            <p className="import-title">{t.importTitle}</p>
            <p className="import-blurb">{t.importBlurb}</p>
            <div className="import-actions">
              <button
                type="button"
                className="import-button"
                onClick={() => fileInput.current?.click()}
                disabled={stage === 'reading'}
              >
                {stage === 'reading' ? t.importReading : t.importChoose}
              </button>
              <span className="import-hint">{t.importDrop}</span>
            </div>
            <input
              ref={fileInput}
              className="import-file"
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </div>

          <div className="import-tools">
            <button
              type="button"
              className="import-link"
              onClick={() => download('topics-template.csv', TEMPLATE, 'text/csv')}
            >
              {t.importTemplate}
            </button>
            <button
              type="button"
              className="import-link"
              onClick={() =>
                download(
                  'topics.json',
                  JSON.stringify(categories, null, 2) + '\n',
                  'application/json',
                )
              }
            >
              {t.exportJson}
            </button>
            <button
              type="button"
              className="import-link"
              onClick={() => download('topics.csv', toCsv(categories), 'text/csv')}
            >
              {t.exportCsv}
            </button>
            <button
              type="button"
              className="import-link is-danger"
              onClick={() => {
                if (window.confirm(t.resetConfirm)) {
                  onApply(DEFAULT_CATEGORIES);
                  setNotice(null);
                }
              }}
            >
              {t.resetDefaults}
            </button>
          </div>
        </>
      )}

      {stage === 'preview' && pending && (
        <div className="import-preview">
          <p className="import-title">{t.importPreviewTitle}</p>

          {pending.kind === 'bank' ? (
            <p className="import-summary">{t.importBankFile(pending.categories.length)}</p>
          ) : (
            preview && (
              <>
                <p className="import-summary">
                  {t.importSummary(
                    pending.rows.length,
                    preview.touchedCategories + preview.newCategories.length,
                  )}
                </p>
                <ul className="import-notes">
                  {preview.duplicates > 0 && <li>{t.importDuplicateNote(preview.duplicates)}</li>}
                  {preview.mirrored > 0 && <li>{t.importMirroredNote(preview.mirrored)}</li>}
                  {preview.newCategories.length > 0 && (
                    <li>{t.importNewCategoryNote(preview.newCategories.length)}</li>
                  )}
                </ul>

                <label className="import-fallback">
                  {t.importFallback}
                  <select
                    value={fallbackBucket}
                    onChange={(event) => setFallbackBucket(event.target.value as Bucket)}
                  >
                    <option value="base">{t.bucketBase}</option>
                    <option value="singapore">{t.bucketSingapore}</option>
                    <option value="china">{t.bucketChina}</option>
                  </select>
                </label>
              </>
            )
          )}

          <div className="import-actions">
            <button type="button" className="import-button is-primary" onClick={() => apply('merge')}>
              {pending.kind === 'bank' ? t.importReplace : t.importMerge}
            </button>
            {pending.kind === 'rows' && (
              <button type="button" className="import-button" onClick={() => apply('replace')}>
                {t.importReplace}
              </button>
            )}
            <button type="button" className="import-link" onClick={reset}>
              {t.importCancel}
            </button>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="import-errors">
          <p className="import-errors-title">{t.importProblems}</p>
          <ul>
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {notice && <p className="import-notice">{notice}</p>}
    </div>
  );
}
