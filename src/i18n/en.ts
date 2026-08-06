/**
 * Interpolated strings are functions rather than templates with placeholders:
 * arity and types are checked at compile time, and each locale is free to
 * reorder or restructure the sentence however it needs to.
 */
export const en = {
  brandMark: 'Conversation Starter',
  brandLine: 'Spin a topic and speak.',

  // Modes
  modeOffTheCuff: 'Off the cuff',
  modeDeepResearch: 'Deep research',
  modeOffTheCuffBlurb: 'Minimal prep. Try to think quick on your feet.',
  modeDeepResearchBlurb:
    "Spin a topic, set a research timer, then start the speech timer whenever you're ready.",
  modeLabel: 'Practice mode',

  // Regions
  regionLabel: 'Region',
  regionEnglish: 'English',
  regionSingapore: 'Singapore',
  regionChina: '中文',

  // Reel
  reelReady: 'Ready',
  reelDrawing: 'Drawing…',
  reelYourTopic: 'Your topic',
  reelPlaceholder: 'Ready?',

  // Actions
  spin: 'Spin',
  spinAgain: 'Spin again',
  spinning: 'Spinning…',
  close: 'Close',
  done: 'Done',
  doneResearching: 'Done researching',
  readyToSpeak: "I'm ready to speak",
  categoryLabel: 'Topic category',

  // Timer
  timerResearch: 'Research.',
  timerReady: 'Research done.',
  timerSpeak: 'Speak.',
  timerDone: 'Time.',
  timerPhaseResearching: 'Researching',
  ariaResearchTimer: 'Research timer',
  ariaReadyToSpeak: 'Ready to speak',
  ariaSpeechTimer: 'Speech timer',
  stageWhat: 'What?',
  stageSoWhat: 'So what?',
  stageNowWhat: 'Now what?',

  // Settings
  settings: 'Settings',
  settingsBlurb: 'Timer lengths in whole minutes.',
  settingsOpen: 'Open settings',
  tabTimers: 'Timers',
  tabTopics: 'Topics',
  speech: 'Speech',
  research: 'Research',
  researchHint: 'Deep research only',
  muteSound: 'Mute sound effects',
  savedForNextTime: 'Saved for next time.',

  // Topic editor
  topicsBlurb: 'Add, remove, or upload your own topics. Everything stays in this browser.',
  bucketBase: 'Shared (all regions)',
  bucketSingapore: 'Singapore only',
  bucketChina: 'China only',
  addTopic: 'Add topic',
  filterTopics: 'Filter topics…',
  deleteTopic: 'Delete',
  undo: 'Undo',
  saving: 'Saving…',
  saved: 'Saved',
  saveFailed: 'Save failed',
  emptyFilter: 'No topics match that filter.',
  backToCategories: 'All categories',
  bothLanguagesRequired: 'Shared topics need both English and 中文.',

  // Import / export
  importTitle: 'Upload a word list',
  importBlurb:
    'CSV, Excel, or a plain text file — a bare list of words, one per line, is enough. Not sure how to lay it out? Start from the template: it explains every column, and you type straight over the examples.',
  importChoose: 'Choose a file',
  importDrop: 'or drop one here',
  importReading: 'Reading…',
  importTemplate: 'Download a template',
  /*
   * The template teaches the format by being the format. The `notes` column is
   * not one the importer recognises, so it is ignored on the way back in — which
   * means the instructions can sit right next to the rows they describe instead
   * of in a README nobody opens. The last row has no topic text at all, so it is
   * skipped too.
   */
  importTemplateCsv: `category,en,zh,region,notes — read me, then delete this column
General,The best advice you ignored,你没听进去的那句忠告,shared,"Both languages filled in. ""shared"" means every region can draw it."
General,The best kopi order,,singapore,"Singapore only. English goes in the en column; leave zh empty."
General,,躺平,china,"China only. Chinese goes in the zh column; leave en empty."
Interview Prep,Tell me about a failure,说说你的一次失败,shared,"A category that doesn't exist yet gets created for you."
,Anything at all,,,"Leave category and region empty and it lands wherever you choose in the app."
,,,,"region can be: shared, singapore, or china. Every column is optional."
,,,,"Now delete these six example rows and type your own topics."
`,
  importFallback: 'Put uncategorised topics in',
  importPreviewTitle: 'Ready to import',
  importCancel: 'Cancel',
  importMerge: 'Add to my bank',
  importReplace: 'Replace everything',
  importProblems: 'Problems with that file',
  exportJson: 'Export as JSON',
  exportCsv: 'Export as CSV',
  resetDefaults: 'Reset to the original topics',
  resetConfirm: 'Delete your own topics and restore the originals? This cannot be undone.',

  // Credit
  creditBy: 'Made by Jinininn',
  creditOriginal: 'Inspired by unprompted.cool',

  // Errors
  errorTitle: 'Something went wrong',
  errorBody: 'Reload the page to keep practicing. Your timer settings are still saved.',
  errorRetry: 'Try again',

  // Interpolated
  duration: (minutes: number, seconds: number): string =>
    minutes === 0
      ? `${seconds} sec`
      : seconds === 0
        ? `${minutes} min`
        : `${minutes} min ${seconds} sec`,
  startTimer: (label: string): string => `Start ${label} timer`,
  startResearch: (label: string): string => `Start ${label} research`,
  upNext: (label: string): string => `Up next: ${label} to speak.`,
  announceTopic: (topic: string): string => `Your topic: ${topic}`,
  topicCount: (n: number): string => `${n} topic${n === 1 ? '' : 's'}`,
  importSummary: (topics: number, categories: number): string =>
    `${topics} topic${topics === 1 ? '' : 's'} across ${categories} categor${categories === 1 ? 'y' : 'ies'}.`,
  importDuplicateNote: (n: number): string =>
    `${n} ${n === 1 ? 'is' : 'are'} already in your bank and will be skipped.`,
  importMirroredNote: (n: number): string =>
    `${n} ${n === 1 ? 'has' : 'have'} only one language — the same text will be used for the other, so ${n === 1 ? 'it stays' : 'they stay'} visible in every region.`,
  importNewCategoryNote: (n: number): string =>
    `${n} new categor${n === 1 ? 'y' : 'ies'} will be created.`,
  importBankFile: (n: number): string =>
    `A complete topic bank with ${n} categor${n === 1 ? 'y' : 'ies'}. Importing it replaces yours.`,
  importDone: (n: number): string => `Added ${n} topic${n === 1 ? '' : 's'}.`,
} as const;

/**
 * Widens the literal string types from `as const` back to `string`, while
 * preserving function signatures exactly. Without this, zh.ts would be required
 * to repeat the English text verbatim rather than translate it.
 */
export type Dict = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => infer R
    ? (...args: A) => R
    : string;
};
