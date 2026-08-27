import type { Dict } from './en';

/**
 * Typing this as `Dict` is the enforcement mechanism: add a key to en.ts and
 * this file fails to compile until it is translated.
 */
export const zh: Dict = {
  brandMark: '交谈话题',
  brandLine: '抽个话题，开口就说。',

  modeOffTheCuff: '即兴开讲',
  modeDeepResearch: '深度研究',
  modeDrill: '速练',
  modeOffTheCuffBlurb: '几乎不用准备，练的就是临场反应。',
  modeDeepResearchBlurb: '先抽题，再设一个查资料的计时器，准备好了就开始演讲计时。',
  modeDrillBlurb: '快速轮换——抽一个，开口说，自评一下，马上下一个。',
  modeLabel: '练习模式',

  regionLabel: '地区',
  regionEnglish: 'English',
  regionSingapore: 'Singapore',
  regionChina: '中文',

  reelReady: '准备好了',
  reelDrawing: '抽取中…',
  reelYourTopic: '你的话题',
  reelPlaceholder: '开始吧？',

  spin: '抽话题',
  spinAgain: '再抽一次',
  spinning: '抽取中…',
  close: '关闭',
  done: '完成',
  doneResearching: '资料查完了',
  readyToSpeak: '我准备好了',
  categoryLabel: '话题分类',

  timerResearch: '查资料。',
  timerReady: '准备完毕。',
  timerSpeak: '开讲。',
  timerDone: '时间到。',
  timerPhaseResearching: '查资料中',
  ariaResearchTimer: '查资料计时',
  ariaReadyToSpeak: '准备开讲',
  ariaSpeechTimer: '演讲计时',
  stageWhat: '是什么？',
  stageSoWhat: '所以呢？',
  stageNowWhat: '然后呢？',

  ratePrompt: '这一轮说得怎么样？',
  rateStruggled: '吃力',
  rateOkay: '还行',
  rateSmooth: '流畅',
  sessionSaveFailed: '本次练习没有保存——浏览器存储不可用。',

  settings: '设置',
  settingsBlurb: '各模式的计时长度。',
  settingsOpen: '打开设置',
  tabTimers: '计时',
  tabTopics: '话题库',
  speech: '演讲',
  research: '查资料',
  researchHint: '仅深度研究模式',
  drill: '速练每轮',
  drillHint: '仅速练模式',
  muteSound: '静音',
  savedForNextTime: '已保存，下次继续用。',

  topicsBlurb: '添加、删除或上传你自己的话题。所有内容只保存在这个浏览器里。',
  bucketBase: '通用（所有地区）',
  bucketSingapore: '仅新加坡',
  bucketChina: '仅中文',
  addTopic: '添加话题',
  filterTopics: '搜索话题…',
  deleteTopic: '删除',
  undo: '撤销',
  saving: '保存中…',
  saved: '已保存',
  saveFailed: '保存失败',
  emptyFilter: '没有匹配的话题。',
  backToCategories: '所有分类',
  bothLanguagesRequired: '通用话题需要同时填写英文和中文。',

  importTitle: '上传话题表',
  importBlurb:
    '支持 CSV、Excel 或纯文本文件 —— 一行一个词也可以。不知道怎么填？先下载模板：里面每一列都写了说明，直接覆盖示例就行。',
  importChoose: '选择文件',
  importDrop: '或拖到这里',
  importReading: '读取中…',
  importTemplate: '下载模板',
  importTemplateCsv: `category,en,zh,region,notes 说明 — 看完可以整列删掉
日常,The best advice you ignored,你没听进去的那句忠告,shared,"中英文都填。shared 表示每个地区都能抽到。"
日常,The best kopi order,,singapore,"仅新加坡。英文填在 en 列，zh 留空。"
日常,,躺平,china,"仅中国。中文填在 zh 列，en 留空。"
面试准备,Tell me about a failure,说说你的一次失败,shared,"不存在的分类会自动新建。"
,,随便一个词,,"不填 category 和 region，就放到你在应用里选的位置。"
,,,,"region 可以填：shared、singapore、china。每一列都可以留空。"
,,,,"看完把这六行示例删掉，换成你自己的话题。"
`,
  importFallback: '未分类的话题放入',
  importPreviewTitle: '准备导入',
  importCancel: '取消',
  importMerge: '添加到我的话题库',
  importReplace: '全部替换',
  importProblems: '这个文件有问题',
  exportJson: '导出 JSON',
  exportCsv: '导出 CSV',
  resetDefaults: '恢复原始话题',
  resetConfirm: '删除你自己的话题并恢复原始内容？此操作无法撤销。',


  creditBy: '由 Jinininn 制作',
  creditOriginal: '灵感来自 unprompted.cool',

  errorTitle: '出了点问题',
  errorBody: '刷新页面就能继续练习，你的计时设置还在。',
  errorRetry: '重试',

  duration: (minutes, seconds) =>
    minutes === 0 ? `${seconds} 秒` : seconds === 0 ? `${minutes} 分钟` : `${minutes} 分 ${seconds} 秒`,
  startTimer: (label) => `开始 ${label} 计时`,
  startResearch: (label) => `开始 ${label} 查资料`,
  upNext: (label) => `接下来：${label} 演讲。`,
  announceTopic: (topic) => `你的话题：${topic}`,
  topicCount: (n) => `${n} 个话题`,
  importSummary: (topics, categories) => `${categories} 个分类，共 ${topics} 个话题。`,
  importDuplicateNote: (n) => `其中 ${n} 个已在你的话题库里，将会跳过。`,
  importMirroredNote: (n) =>
    `其中 ${n} 个只有一种语言，另一种会沿用同样的文字，这样在每个地区都能出现。`,
  importNewCategoryNote: (n) => `将新建 ${n} 个分类。`,
  importBankFile: (n) => `这是一个完整的话题库，包含 ${n} 个分类。导入后会替换你现在的话题库。`,
  importDone: (n) => `已添加 ${n} 个话题。`,
};
