import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaptureJots } from './CaptureJots';
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
  /** Deep-research capture, owned by App so it survives phase changes. */
  cues: string[];
  notes: string;
  reflection: string;
  onCuesChange: (cues: string[]) => void;
  onNotesChange: (notes: string) => void;
  onReflectionChange: (reflection: string) => void;
  /** Markdown of the session as captured so far; null when there is no topic. */
  makeExport: () => { md: string; filename: string } | null;
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
  cues,
  notes,
  reflection,
  onCuesChange,
  onNotesChange,
  onReflectionChange,
  makeExport,
  onDoneResearching,
  onStartSpeech,
  onRate,
  onClose,
}: Props) {
  const t = useT();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle');

  const isResearch = phase === 'research';
  const isDone = phase === 'done';
  const isLive = phase === 'speech';
  const isOffTheCuff = mode === 'off-the-cuff';
  const isDrill = mode === 'drill';
  const isDeepResearch = mode === 'deep-research';

  // Move focus to the main action whenever the phase changes, so a keyboard
  // user always lands on the thing they most likely want next. In `ready`
  // that thing is the notes box — the untimed pause exists for writing.
  useEffect(() => {
    setCopyState('idle');
    if (notesRef.current) notesRef.current.focus();
    else primaryRef.current?.focus();
  }, [phase]);

  const handleCopy = async () => {
    const exported = makeExport();
    if (!exported) return;
    try {
      await navigator.clipboard.writeText(exported.md);
      setCopyState('ok');
    } catch {
      setCopyState('fail');
    }
  };

  const handleDownload = () => {
    const exported = makeExport();
    if (!exported) return;
    const url = URL.createObjectURL(new Blob([exported.md], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = exported.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

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

        {/* Cornell Record: jots while researching, still editable during the
            untimed Reduce pause — condensing means looking at what you wrote. */}
        {isDeepResearch && (isResearch || phase === 'ready') && (
          <div className="capture-block">
            <p className="capture-label">{t.jotsLabel}</p>
            <CaptureJots items={cues} onChange={onCuesChange} />
          </div>
        )}

        {isDeepResearch && phase === 'ready' && (
          <div className="capture-block">
            <label className="capture-label" htmlFor="capture-notes">
              {t.notesLabel}
            </label>
            <textarea
              ref={notesRef}
              id="capture-notes"
              className="capture-textarea"
              rows={4}
              value={notes}
              placeholder={t.notesPlaceholder}
              onChange={(event) => onNotesChange(event.target.value)}
            />
          </div>
        )}

        {isDeepResearch && isDone && (
          <div className="capture-block">
            <label className="capture-label" htmlFor="capture-reflection">
              {t.reflectLabel}
            </label>
            <textarea
              id="capture-reflection"
              className="capture-textarea"
              rows={3}
              value={reflection}
              placeholder={t.reflectPlaceholder}
              onChange={(event) => onReflectionChange(event.target.value)}
            />
          </div>
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
          {isDeepResearch && isDone && (
            <>
              <button type="button" className="btn secondary" onClick={handleCopy}>
                {copyState === 'ok' ? t.copied : copyState === 'fail' ? t.copyFailed : t.copyMarkdown}
              </button>
              <button type="button" className="btn secondary" onClick={handleDownload}>
                {t.downloadMarkdown}
              </button>
            </>
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
