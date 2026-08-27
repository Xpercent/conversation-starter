import type { Locale, ModeId, Region } from '../data/topics';

export type Rating = 1 | 2 | 3;

/**
 * One practice session, written when a session finishes (or is closed with
 * captured text in it). This shape is deliberately Postgres-ready: if the app
 * ever grows accounts, these records sync as-is, so nothing here may depend on
 * browser-only types.
 *
 * `topicText` is a snapshot, not a reference. The bank is user-editable and
 * wholesale-replaceable via upload, so a record keyed by topic id would orphan
 * itself the first time someone re-imported their word list.
 */
export interface SessionRecord {
  id: string;
  /** ISO 8601. */
  createdAt: string;
  topicText: string;
  categoryId: string;
  /** Snapshotted in the session's language, for the same reason as topicText. */
  categoryLabel: string;
  mode: ModeId;
  language: Locale;
  region: Region;
  /** Self-rating from drill mode: 1 struggled, 2 okay, 3 smooth. */
  rating: Rating | null;
  /** Deep-research capture. Null in other modes — never empty strings. */
  cues: string[] | null;
  notes: string | null;
  reflection: string | null;
}

const MODES: readonly string[] = ['off-the-cuff', 'deep-research', 'drill'];
const LOCALES: readonly string[] = ['en', 'zh'];
const REGIONS: readonly string[] = ['english', 'singapore', 'china'];

const isNullableString = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';

function isSessionRecord(value: unknown): value is SessionRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    r.id.length > 0 &&
    typeof r.createdAt === 'string' &&
    !Number.isNaN(Date.parse(r.createdAt)) &&
    typeof r.topicText === 'string' &&
    r.topicText.length > 0 &&
    typeof r.categoryId === 'string' &&
    typeof r.categoryLabel === 'string' &&
    MODES.includes(r.mode as string) &&
    LOCALES.includes(r.language as string) &&
    REGIONS.includes(r.region as string) &&
    (r.rating === null || r.rating === 1 || r.rating === 2 || r.rating === 3) &&
    (r.cues === null ||
      (Array.isArray(r.cues) && r.cues.every((c) => typeof c === 'string'))) &&
    isNullableString(r.notes) &&
    isNullableString(r.reflection)
  );
}

/**
 * Unlike the topic bank there is no bundled fallback for session history, so
 * this filters bad rows instead of discarding the lot: one record mangled by
 * an older build must not take four hundred good ones with it. A value that is
 * not an array at all is beyond salvaging and returns null.
 */
export function validateSessions(parsed: unknown): SessionRecord[] | null {
  if (!Array.isArray(parsed)) return null;
  return parsed.filter(isSessionRecord);
}

export function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Double-quoted YAML scalar — safe for topics containing `:` or `"`. */
const yamlQuote = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/**
 * Deterministic markdown — the app knows which text came from which phase, and
 * that IS the structure. Sections a session never had are omitted entirely: an
 * off-the-cuff record renders as frontmatter plus the topic, with no empty
 * `## Cues` heading to haunt the note.
 */
export function sessionToMarkdown(record: SessionRecord): string {
  const lines: string[] = [
    '---',
    `topic: ${yamlQuote(record.topicText)}`,
    `date: ${record.createdAt}`,
    `mode: ${record.mode}`,
    `category: ${yamlQuote(record.categoryLabel)}`,
    `language: ${record.language}`,
    `region: ${record.region}`,
  ];
  if (record.rating !== null) lines.push(`rating: ${record.rating}`);
  lines.push('---', '', `# ${record.topicText}`);

  const cues = (record.cues ?? []).map((c) => c.trim()).filter(Boolean);
  if (cues.length > 0) {
    lines.push('', '## Cues', '');
    for (const cue of cues) lines.push(`- ${cue}`);
  }

  const notes = record.notes?.trim();
  if (notes) lines.push('', '## Notes', '', notes);

  const reflection = record.reflection?.trim();
  if (reflection) lines.push('', '## Reflection', '', reflection);

  return lines.join('\n') + '\n';
}

/** `2026-08-27 topic-fragment.md` — date-first so a folder of notes sorts itself. */
export function sessionFileName(record: SessionRecord): string {
  const date = record.createdAt.slice(0, 10);
  const fragment = record.topicText
    .replace(/[\\/:*?"<>|#^[\]\n\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
    .trim();
  return `${date} ${fragment || 'session'}.md`;
}
