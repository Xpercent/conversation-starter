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
} from '../lib/time';
import { TopicBankEditor } from './TopicBankEditor';

interface Props {
  open: boolean;
  speechSeconds: number;
  researchSeconds: number;
  muted: boolean;
  onSpeechChange: (seconds: number) => void;
  onResearchChange: (seconds: number) => void;
  onMutedChange: (muted: boolean) => void;
  onClose: () => void;
}

function DurationField({
  label,
  seconds,
  minMinutes,
  maxMinutes,
  hint,
  onChange,
}: {
  label: string;
  seconds: number;
  minMinutes: number;
  maxMinutes: number;
  hint?: string;
  onChange: (seconds: number) => void;
}) {
  const t = useT();
  const { minutes, seconds: rest } = durationParts(seconds);
  return (
    <div className="duration-field">
      <div className="duration-head">
        <span className="duration-label">{label}</span>
        <span className="duration-value">{t.duration(minutes, rest)}</span>
      </div>
      <input
        className="duration-slider"
        type="range"
        min={minMinutes}
        max={maxMinutes}
        step={1}
        value={Math.round(seconds / 60)}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value) * 60)}
      />
      <div className="duration-ends">
        <span>{t.duration(minMinutes, 0)}</span>
        <span>{t.duration(maxMinutes, 0)}</span>
      </div>
      {hint && <p className="duration-hint">{hint}</p>}
    </div>
  );
}

export function SettingsModal({
  open,
  speechSeconds,
  researchSeconds,
  muted,
  onSpeechChange,
  onResearchChange,
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
              minMinutes={SPEECH_MIN_MIN}
              maxMinutes={SPEECH_MAX_MIN}
              onChange={onSpeechChange}
            />
            <DurationField
              label={t.research}
              seconds={researchSeconds}
              minMinutes={RESEARCH_MIN_MIN}
              maxMinutes={RESEARCH_MAX_MIN}
              hint={t.researchHint}
              onChange={onResearchChange}
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
