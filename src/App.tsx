import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  DEFAULT_CATEGORY_ID,
  categoryLabel,
  defaultRegion,
  getCategoryById,
  getPool,
  getSelectableCategories,
  getTopicsVersion,
  localeForRegion,
  subscribeTopics,
  type ModeId,
  type Region,
} from './data/topics';
import { DICTS, I18nContext } from './i18n';
import { audio } from './lib/audio';
import { newSessionId, type Rating } from './lib/session';
import { appendSession } from './lib/sessionsStore';
import { clampDrill, clampResearch, clampSpeech, DRILL_DEFAULT, durationParts } from './lib/time';
import { phaseReducer } from './state/phase';
import { useSpinner } from './hooks/useSpinner';
import { useTimer } from './hooks/useTimer';
import {
  parseBoolean,
  parseNumber,
  parseOneOf,
  usePersistedSetting,
} from './hooks/usePersistedSetting';
import { SegmentedSwitch } from './components/SegmentedSwitch';
import { CategorySelect } from './components/CategorySelect';
import { Reel } from './components/Reel';
import { TimerOverlay } from './components/TimerOverlay';
import { SettingsModal } from './components/SettingsModal';

const REGIONS: Region[] = ['english', 'singapore', 'china'];

export function App() {
  const [region, setRegion] = usePersistedSetting<Region>(
    'region',
    defaultRegion(),
    parseOneOf(REGIONS),
  );
  const [mode, setMode] = useState<ModeId>('off-the-cuff');
  const [categoryId, setCategoryId] = useState<string>(DEFAULT_CATEGORY_ID);
  const [phase, dispatch] = useReducer(phaseReducer, 'idle');

  const [speechSeconds, setSpeechSeconds] = usePersistedSetting('speech', 60, (raw) => {
    const n = parseNumber(raw);
    return n === null ? null : clampSpeech(n);
  });
  const [researchSeconds, setResearchSeconds] = usePersistedSetting('research', 600, (raw) => {
    const n = parseNumber(raw);
    return n === null ? null : clampResearch(n);
  });
  const [drillSeconds, setDrillSeconds] = usePersistedSetting('drill', DRILL_DEFAULT, (raw) => {
    const n = parseNumber(raw);
    return n === null ? null : clampDrill(n);
  });
  const [muted, setMuted] = usePersistedSetting('muted', false, parseBoolean);

  const [settingsOpen, setSettingsOpen] = useState(false);
  // Sticky until the next successful save — the overlay that failed is usually
  // already gone by the time anyone could read a notice inside it.
  const [saveFailed, setSaveFailed] = useState(false);

  const locale = localeForRegion(region);
  const t = DICTS[locale];

  // Editing the bank must reach the spinner straight away.
  // Without this the memo below keeps its old pool — its inputs haven't
  // changed — so a freshly added topic stays invisible until a reload.
  const bankVersion = useSyncExternalStore(subscribeTopics, getTopicsVersion);
  const pool = useMemo(
    () => getPool(region, mode, categoryId),
    [region, mode, categoryId, bankVersion],
  );
  const selectableCategories = useMemo(() => getSelectableCategories(), [bankVersion]);

  useEffect(() => {
    audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);

  const onTick = useCallback((volume: number) => audio.tick(volume), []);
  const onLand = useCallback(() => audio.gong(), []);
  const { topic, landed, spinning, tickKey, spin } = useSpinner({
    pool: pool.topics,
    poolKey: pool.key,
    onTick,
    onLand,
  });

  const speechTimer = useTimer(() => {
    dispatch({ type: 'speechComplete' });
    audio.fanfare();
  });
  const researchTimer = useTimer(() => {
    dispatch({ type: 'researchComplete' });
    // Show the full speech duration while paused in `ready`, rather than the
    // 0:00 the speech timer would otherwise still be sitting on.
    speechTimer.setRemaining(speechSeconds);
    audio.fanfare();
  });

  const active = phase !== 'idle';
  const controlsDisabled = spinning || active;
  const timer = phase === 'research' ? researchTimer : speechTimer;

  // Drill rounds run on their own, much shorter clock.
  const activeSpeechSeconds = mode === 'drill' ? drillSeconds : speechSeconds;

  const startSpeech = useCallback(() => {
    dispatch({ type: 'startSpeech' });
    speechTimer.start(activeSpeechSeconds);
  }, [speechTimer, activeSpeechSeconds]);

  const handleStart = () => {
    audio.unlock();
    if (mode === 'deep-research') {
      dispatch({ type: 'start', mode });
      researchTimer.start(researchSeconds);
    } else {
      dispatch({ type: 'start', mode });
      speechTimer.start(activeSpeechSeconds);
    }
  };

  const handleDoneResearching = () => {
    researchTimer.stop();
    dispatch({ type: 'researchComplete' });
    speechTimer.setRemaining(speechSeconds);
    audio.chime();
  };

  /**
   * One session, one record — written only when the session reached `done`.
   * Closing mid-speech is a bail, not a session. topicText and categoryLabel
   * are snapshotted because the bank is replaceable out from under them (see
   * session.ts).
   */
  const storeSession = useCallback(
    (rating: Rating | null) => {
      if (phase !== 'done') return;
      const topicText = landed ?? topic ?? '';
      if (!topicText) return;
      const category = getCategoryById(pool.categoryId);
      try {
        appendSession({
          id: newSessionId(),
          createdAt: new Date().toISOString(),
          topicText,
          categoryId: pool.categoryId,
          categoryLabel: category ? categoryLabel(category, locale) : pool.categoryId,
          mode,
          language: locale,
          region,
          rating,
          cues: null,
          notes: null,
          reflection: null,
        });
        setSaveFailed(false);
      } catch {
        setSaveFailed(true);
      }
    },
    [phase, landed, topic, pool.categoryId, locale, mode, region],
  );

  const handleClose = useCallback(() => {
    storeSession(null);
    speechTimer.stop();
    researchTimer.stop();
    dispatch({ type: 'reset' });
  }, [storeSession, speechTimer, researchTimer]);

  /** Drill: the rating tap saves the round and rolls straight into the next spin. */
  const handleRate = useCallback(
    (rating: Rating) => {
      // First thing in the gesture, same as handleSpin — iOS audio contexts.
      audio.unlock();
      storeSession(rating);
      speechTimer.stop();
      researchTimer.stop();
      dispatch({ type: 'reset' });
      spin();
    },
    [storeSession, speechTimer, researchTimer, spin],
  );

  const handleSpin = () => {
    // Must be the first thing in the gesture or iOS leaves the context suspended.
    audio.unlock();
    spin();
  };

  // Escape pops the topmost overlay only; it must not kill a running timer.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (settingsOpen) setSettingsOpen(false);
      else if (active) handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen, active, handleClose]);

  const shellRef = useRef<HTMLDivElement>(null);
  const inert = active || settingsOpen;

  const researchParts = durationParts(researchSeconds);
  const activeSpeechParts = durationParts(activeSpeechSeconds);

  const eyebrow = spinning ? t.reelDrawing : landed ? t.reelYourTopic : t.reelReady;
  const spinLabel = spinning ? t.spinning : landed ? t.spinAgain : t.spin;

  return (
    <I18nContext.Provider value={t}>
      <div className="page">
        <div className="atmosphere" aria-hidden="true" />

        <div ref={shellRef} {...(inert ? { inert: '' } : {})}>
          <header className="brand">
            <h1 className="brand-mark">{t.brandMark}</h1>
            <p className="brand-line">{t.brandLine}</p>
          </header>

          <main className="stage">
            <div className="stage-body">
              <div className="controls">
                <SegmentedSwitch
                  ariaLabel={t.modeLabel}
                  options={[
                    { id: 'off-the-cuff', label: t.modeOffTheCuff, emoji: '🧠' },
                    { id: 'deep-research', label: t.modeDeepResearch, emoji: '🔍' },
                    { id: 'drill', label: t.modeDrill, emoji: '⚡' },
                  ]}
                  value={mode}
                  onChange={(next) => setMode(next as ModeId)}
                  disabled={controlsDisabled}
                />

                <SegmentedSwitch
                  className="region-switch"
                  ariaLabel={t.regionLabel}
                  options={[
                    { id: 'english', label: t.regionEnglish },
                    { id: 'singapore', label: t.regionSingapore },
                    { id: 'china', label: t.regionChina },
                  ]}
                  value={region}
                  onChange={(next) => setRegion(next as Region)}
                  disabled={controlsDisabled}
                />

                <p className="mode-blurb">
                  {mode === 'off-the-cuff'
                    ? t.modeOffTheCuffBlurb
                    : mode === 'deep-research'
                      ? t.modeDeepResearchBlurb
                      : t.modeDrillBlurb}
                </p>

                {mode !== 'deep-research' && (
                  <CategorySelect
                    categories={selectableCategories}
                    value={categoryId}
                    locale={locale}
                    label={t.categoryLabel}
                    disabled={controlsDisabled}
                    onChange={setCategoryId}
                  />
                )}
              </div>

              <Reel
                topic={topic}
                spinning={spinning}
                landed={Boolean(landed)}
                tickKey={tickKey}
                eyebrow={eyebrow}
                placeholder={t.reelPlaceholder}
              />

              <div className="actions">
                <div className="actions-main">
                  <button
                    type="button"
                    className="btn primary"
                    onClick={handleSpin}
                    disabled={controlsDisabled}
                  >
                    {spinLabel}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={handleStart}
                    disabled={!landed || controlsDisabled}
                  >
                    {mode === 'deep-research'
                      ? t.startResearch(t.duration(researchParts.minutes, researchParts.seconds))
                      : t.startTimer(t.duration(activeSpeechParts.minutes, activeSpeechParts.seconds))}
                  </button>
                </div>

                <div className="controls-row settings">
                  <button
                    type="button"
                    className="settings-trigger"
                    aria-label={t.settingsOpen}
                    onClick={() => setSettingsOpen(true)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </main>

          {saveFailed && (
            <p className="save-warning" role="alert">
              {t.sessionSaveFailed}
            </p>
          )}

          <footer className="page-credit">
            {t.creditBy}
            <span aria-hidden="true"> · </span>
            <a href="https://www.unprompted.cool/" target="_blank" rel="noreferrer noopener">
              {t.creditOriginal}
            </a>
          </footer>
        </div>

        {/* Stays empty during the spin — announcing every step would emit
            hundreds of messages and lock up a screen reader. */}
        <p className="sr-only" aria-live="polite">
          {!spinning && landed ? t.announceTopic(landed) : ''}
        </p>

        {active && (
          <TimerOverlay
            phase={phase}
            topic={landed ?? topic ?? ''}
            remaining={timer.remaining}
            speechSeconds={activeSpeechSeconds}
            researchSeconds={researchSeconds}
            mode={mode}
            onDoneResearching={handleDoneResearching}
            onStartSpeech={startSpeech}
            onRate={handleRate}
            onClose={handleClose}
          />
        )}

        <SettingsModal
          open={settingsOpen}
          speechSeconds={speechSeconds}
          researchSeconds={researchSeconds}
          drillSeconds={drillSeconds}
          muted={muted}
          onSpeechChange={setSpeechSeconds}
          onResearchChange={setResearchSeconds}
          onDrillChange={setDrillSeconds}
          onMutedChange={setMuted}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    </I18nContext.Provider>
  );
}
