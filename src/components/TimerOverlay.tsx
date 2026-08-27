import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SpeechStages, stagesReached } from './SpeechStages';
import { formatClock, durationParts, progressFraction } from '../lib/time';
import { useT } from '../i18n';
import type { ModeId } from '../data/topics';
import type { Rating } from '../lib/session';
import type { Phase } from '../state/phase';

interface Props {
  phase: Exclude<Phase, 'idle'>;
  topic: string;
  remaining: number;
  /** The active speech duration — drill passes its own shorter round here. */
  speechSeconds: number;
  researchSeconds: number;
  mode: ModeId;
  onDoneResearching: () => void;
  onStartSpeech: () => void;
  /** Drill only: self-rating tap, which also rolls straight into the next spin. */
  onRate: (rating: Rating) => void;
  onClose: () => void;
}

export function TimerOverlay({
  phase,
  topic,
  remaining,
  speechSeconds,
  researchSeconds,
  mode,
  onDoneResearching,
  onStartSpeech,
  onRate,
  onClose,
}: Props) {
  const t = useT();
  const primaryRef = useRef<HTMLButtonElement>(null);

  const isResearch = phase === 'research';
  const isDone = phase === 'done';
  const isLive = phase === 'speech';
  const isOffTheCuff = mode === 'off-the-cuff';
  const isDrill = mode === 'drill';

  // Move focus to the main action whenever the phase changes, so a keyboard
  // user always lands on the thing they most likely want next.
  useEffect(() => {
    primaryRef.current?.focus();
  }, [phase]);

  const total = isResearch ? researchSeconds : speechSeconds;
  const fraction = phase === 'ready' ? 0 : progressFraction(remaining, total);

  const status = isResearch
    ? t.timerResearch
    : phase === 'ready'
      ? t.timerReady
      : isDone
        ? t.timerDone
        : t.timerSpeak;

  const ariaLabel = isResearch
    ? t.ariaResearchTimer
    : phase === 'ready'
      ? t.ariaReadyToSpeak
      : t.ariaSpeechTimer;

  const speechParts = durationParts(speechSeconds);

  return createPortal(
    <div
      className={`timer-overlay ${isDone ? 'is-done' : ''} ${isLive ? 'is-live' : ''} ${
        isResearch ? 'is-research' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div className="timer-overlay-inner">
        <p className="timer-topic">{topic}</p>
        {isResearch && <p className="timer-phase">{t.timerPhaseResearching}</p>}

        <div className="timer-ring" style={{ ['--p' as string]: fraction }}>
          <span className="timer-digits">{formatClock(remaining)}</span>
        </div>

        <p className="timer-status">{status}</p>

        {phase === 'ready' && (
          <p className="timer-next">{t.upNext(t.duration(speechParts.minutes, speechParts.seconds))}</p>
        )}

        {isOffTheCuff && (isLive || isDone) && (
          <SpeechStages
            labels={[t.stageWhat, t.stageSoWhat, t.stageNowWhat]}
            reached={stagesReached(remaining, speechSeconds, isDone)}
          />
        )}

        {isDrill && isDone && <p className="rate-prompt">{t.ratePrompt}</p>}

        <div className="timer-actions">
          {isResearch && (
            <button ref={primaryRef} type="button" className="btn primary" onClick={onDoneResearching}>
              {t.doneResearching}
            </button>
          )}
          {phase === 'ready' && (
            <button ref={primaryRef} type="button" className="btn primary" onClick={onStartSpeech}>
              {t.readyToSpeak}
            </button>
          )}
          {isDrill && isDone && (
            /* The rating IS the "next" button — a tap saves the round and
               rolls straight into the next spin, so the loop never stops at
               a form. Close (below) exits the loop and saves without one. */
            <div className="rate-row">
              <button type="button" className="btn secondary rate" onClick={() => onRate(1)}>
                {t.rateStruggled}
              </button>
              <button ref={primaryRef} type="button" className="btn secondary rate" onClick={() => onRate(2)}>
                {t.rateOkay}
              </button>
              <button type="button" className="btn secondary rate" onClick={() => onRate(3)}>
                {t.rateSmooth}
              </button>
            </div>
          )}
          {(isLive || (isDone && !isDrill)) && (
            <button ref={primaryRef} type="button" className="btn secondary" onClick={onClose}>
              {t.close}
            </button>
          )}
          {(isResearch || phase === 'ready' || (isDone && isDrill)) && (
            <button type="button" className="btn ghost" onClick={onClose}>
              {t.close}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
