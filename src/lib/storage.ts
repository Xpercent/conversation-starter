const PREFIX = 'conversation-starter:';

/** All access is wrapped — Safari private mode throws on both read and write. */
export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    /* quota or private mode — settings just won't persist */
  }
}

export function removeStored(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* nothing to clean up if storage was never reachable */
  }
}

/**
 * The swallow-everything version above is right for settings — a lost slider
 * position is not worth an error message. The topic bank is different: losing
 * someone's imported words silently is the worst outcome, so its writes go
 * through here and let the caller report the failure.
 */
export function writeStoredOrThrow(key: string, value: string): void {
  window.localStorage.setItem(PREFIX + key, value);
}
