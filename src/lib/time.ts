export const SPEECH_DEFAULT = 60;
export const SPEECH_MIN_MIN = 1;
export const SPEECH_MAX_MIN = 10;

export const RESEARCH_DEFAULT = 600;
export const RESEARCH_MIN_MIN = 1;
export const RESEARCH_MAX_MIN = 60;

/**
 * Drill rounds are seconds, not minutes — one word, one quick answer, next.
 * A whole-minute floor would make the fastest possible round 1:00, which is
 * exactly the length that turns a drill into a speech.
 */
export const DRILL_DEFAULT = 45;
export const DRILL_MIN_S = 15;
export const DRILL_MAX_S = 300;
export const DRILL_STEP_S = 15;

/**
 * Durations are stored in seconds but are always a whole number of minutes,
 * so a malformed or out-of-range stored value snaps back to something sane.
 */
export function clampMinutes(seconds: number, minMin: number, maxMin: number, fallback: number): number {
  if (!Number.isFinite(seconds)) return fallback;
  const minutes = Math.round(seconds / 60);
  return Math.min(maxMin, Math.max(minMin, minutes)) * 60;
}

export const clampSpeech = (s: number) =>
  clampMinutes(s, SPEECH_MIN_MIN, SPEECH_MAX_MIN, SPEECH_DEFAULT);

export const clampResearch = (s: number) =>
  clampMinutes(s, RESEARCH_MIN_MIN, RESEARCH_MAX_MIN, RESEARCH_DEFAULT);

export const clampDrill = (s: number): number => {
  if (!Number.isFinite(s)) return DRILL_DEFAULT;
  const snapped = Math.round(s / DRILL_STEP_S) * DRILL_STEP_S;
  return Math.min(DRILL_MAX_S, Math.max(DRILL_MIN_S, snapped));
};

/** M:SS for the big countdown digits. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function durationParts(totalSeconds: number): { minutes: number; seconds: number } {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return { minutes: Math.floor(safe / 60), seconds: safe % 60 };
}

/** Ring fill, 0..1. */
export function progressFraction(remaining: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - remaining / total));
}
