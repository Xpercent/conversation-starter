import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SpeechStages, stagesReached } from './SpeechStages';
import { formatClock, durationParts, progressFraction } from '../lib/time';
import { useT } from '../i18n';
import type { Phase } from '../state/phase';

interface Props {
  phase: Exclude<Phase, 'idle'>;
  topic: string;
  remaining: number;
  speechSeconds: number;
  researchSeconds: number;
  isOffTheCuff: boolean;
  onDoneResearching: () => void;
  onStartSpeech: () => void;
  onClose: () => void;
}

export function TimerOverlay({
  phase,
  topic,
  remaining,
  speechSeconds,
  researchSeconds,
  isOffTheCuff,
  onDoneResearching,
  onStartSpeech,
  onClose,
}: Props) {
  const t = useT();
  const primaryRef = useRef<HTMLButtonElement>(null);

  const isResearch = phase === 'research';
  const isDone = phase === 'done';
  const isLive = phase === 'speech';

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
          {(isLive || isDone) && (
            <button ref={primaryRef} type="button" className="btn secondary" onClick={onClose}>
              {t.close}
            </button>
          )}
          {(isResearch || phase === 'ready') && (
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
