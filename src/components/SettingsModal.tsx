import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { durationParts } from '../lib/time';
import {
  SPEECH_MIN_MIN,
  SPEECH_MAX_MIN,
  RESEARCH_MIN_MIN,
  RESEARCH_MAX_MIN,
  DRILL_MIN_S,
  DRILL_MAX_S,
  DRILL_STEP_S,
} from '../lib/time';
import { TopicBankEditor } from './TopicBankEditor';

interface Props {
  open: boolean;
  speechSeconds: number;
  researchSeconds: number;
  drillSeconds: number;
  muted: boolean;
  onSpeechChange: (seconds: number) => void;
  onResearchChange: (seconds: number) => void;
  onDrillChange: (seconds: number) => void;
  onMutedChange: (muted: boolean) => void;
  onClose: () => void;
}

/**
 * Seconds-based throughout so drill's sub-minute rounds fit the same control:
 * speech and research pass a 60-second step, which makes them whole-minute
 * sliders exactly as before.
 */
function DurationField({
  label,
  seconds,
  minSeconds,
  maxSeconds,
  stepSeconds,
  hint,
  onChange,
}: {
  label: string;
  seconds: number;
  minSeconds: number;
  maxSeconds: number;
  stepSeconds: number;
  hint?: string;
  onChange: (seconds: number) => void;
}) {
  const t = useT();
  const { minutes, seconds: rest } = durationParts(seconds);
  const minParts = durationParts(minSeconds);
  const maxParts = durationParts(maxSeconds);
  return (
    <div className="duration-field">
      <div className="duration-head">
        <span className="duration-label">{label}</span>
        <span className="duration-value">{t.duration(minutes, rest)}</span>
      </div>
      <input
        className="duration-slider"
        type="range"
        min={minSeconds}
        max={maxSeconds}
        step={stepSeconds}
        value={seconds}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="duration-ends">
        <span>{t.duration(minParts.minutes, minParts.seconds)}</span>
        <span>{t.duration(maxParts.minutes, maxParts.seconds)}</span>
      </div>
      {hint && <p className="duration-hint">{hint}</p>}
    </div>
  );
}

export function SettingsModal({
  open,
  speechSeconds,
  researchSeconds,
  drillSeconds,
  muted,
  onSpeechChange,
  onResearchChange,
  onDrillChange,
  onMutedChange,
  onClose,
}: Props) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'timers' | 'topics'>('timers');

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="settings-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`settings-panel ${tab === 'topics' ? 'is-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t.settings}
      >
        <div className="settings-panel-head">
          <h2 className="settings-panel-title">{t.settings}</h2>
          <p className="settings-panel-blurb">
            {tab === 'timers' ? t.settingsBlurb : t.topicsBlurb}
          </p>
        </div>

        <div className="settings-tabs" role="tablist" aria-label={t.settings}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'timers'}
            className={`settings-tab ${tab === 'timers' ? 'is-active' : ''}`}
            onClick={() => setTab('timers')}
          >
            {t.tabTimers}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'topics'}
            className={`settings-tab ${tab === 'topics' ? 'is-active' : ''}`}
            onClick={() => setTab('topics')}
          >
            {t.tabTopics}
          </button>
        </div>

        {tab === 'timers' ? (
          <>
            <DurationField
              label={t.speech}
              seconds={speechSeconds}
              minSeconds={SPEECH_MIN_MIN * 60}
              maxSeconds={SPEECH_MAX_MIN * 60}
              stepSeconds={60}
              onChange={onSpeechChange}
            />
            <DurationField
              label={t.research}
              seconds={researchSeconds}
              minSeconds={RESEARCH_MIN_MIN * 60}
              maxSeconds={RESEARCH_MAX_MIN * 60}
              stepSeconds={60}
              hint={t.researchHint}
              onChange={onResearchChange}
            />
            <DurationField
              label={t.drill}
              seconds={drillSeconds}
              minSeconds={DRILL_MIN_S}
              maxSeconds={DRILL_MAX_S}
              stepSeconds={DRILL_STEP_S}
              hint={t.drillHint}
              onChange={onDrillChange}
            />
            <div className="settings-mute">
              <input
                id="mute-toggle"
                type="checkbox"
                checked={muted}
                onChange={(event) => onMutedChange(event.target.checked)}
              />
              <label htmlFor="mute-toggle">{t.muteSound}</label>
            </div>
            <p className="settings-note">{t.savedForNextTime}</p>
          </>
        ) : (
          <TopicBankEditor />
        )}

        <p className="settings-about">
          {t.creditBy}
          <span aria-hidden="true"> · </span>
          <a href="https://www.unprompted.cool/" target="_blank" rel="noreferrer noopener">
            {t.creditOriginal}
          </a>
        </p>

        <button type="button" className="btn primary settings-done" onClick={onClose}>
          {t.done}
        </button>
      </div>
    </div>,
    document.body,
  );
}
