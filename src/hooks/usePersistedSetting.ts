import { useEffect, useState } from 'react';
import { readStored, writeStored } from '../lib/storage';

/**
 * State backed by localStorage. `parse` returning null falls back to `initial`,
 * which protects against stale values written by an older build.
 */
export function usePersistedSetting<T>(
  key: string,
  initial: T,
  parse: (raw: string) => T | null,
  serialize: (value: T) => string = String,
) {
  const [value, setValue] = useState<T>(() => {
    const raw = readStored(key);
    if (raw === null) return initial;
    const parsed = parse(raw);
    return parsed === null ? initial : parsed;
  });

  useEffect(() => {
    writeStored(key, serialize(value));
  }, [key, value]); // eslint-disable-line react-hooks/exhaustive-deps

  return [value, setValue] as const;
}

export const parseNumber = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

export const parseBoolean = (raw: string): boolean | null =>
  raw === 'true' ? true : raw === 'false' ? false : null;

export const parseOneOf =
  <T extends string>(allowed: readonly T[]) =>
  (raw: string): T | null =>
    (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
