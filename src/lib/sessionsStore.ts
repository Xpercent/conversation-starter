import { readStored, removeStored, writeStoredOrThrow } from './storage';
import { validateSessions, type SessionRecord } from './session';

const KEY = 'sessions';

/**
 * Session history, same discipline as the topic bank (topicsStore.ts):
 * anything unreadable is discarded rather than repaired, and the stored copy
 * is removed so the same bad value is not re-parsed on every load. Individual
 * bad rows are dropped by `validateSessions` while the rest survive — session
 * history has no bundled fallback, so wholesale discard would be data loss.
 */
export function loadSessions(): SessionRecord[] {
  const raw = readStored(KEY);
  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeStored(KEY);
    return [];
  }

  const sessions = validateSessions(parsed);
  if (sessions === null) {
    removeStored(KEY);
    return [];
  }
  return sessions;
}

/**
 * Throws on quota failure or unavailable storage (Safari private mode), so the
 * caller can make the failure visible — losing someone's reflection silently
 * is the worst outcome (see storage.ts on writeStoredOrThrow).
 */
export function appendSession(record: SessionRecord): void {
  const sessions = loadSessions();
  sessions.push(record);
  writeStoredOrThrow(KEY, JSON.stringify(sessions));
}

export const sessionCount = (): number => loadSessions().length;
