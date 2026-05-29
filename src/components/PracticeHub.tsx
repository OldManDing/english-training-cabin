import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Headphones,
  Languages,
  LibraryBig,
  ListChecks,
  PenLine,
  ShieldCheck,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { CET4_VOCABULARY_BANK } from '../data';
import {
  CET4_LISTENING_PRACTICE_QUESTIONS,
  CET4_CLOZE_PRACTICE_QUESTIONS,
  CET4_GRAMMAR_PRACTICE_QUESTIONS,
  CET4_MOCK_EXAM_BANK,
  CET4_QUESTION_BANK_COVERAGE,
  CET4_READING_BANK,
  CET4_READING_PRACTICE_QUESTIONS,
  CET4_TRANSLATION_PROMPT_BANK,
  CET4_WRITING_PROMPT_BANK,
} from '../questionBank';
import { DailyPlan, Passage, SkillProfile } from '../types';

type PracticeModuleId = 'vocabulary' | 'cloze' | 'grammar' | 'reading' | 'listening' | 'writing' | 'translation' | 'mock';

interface PracticeHubProps {
  examId: string;
  examName: string;
  onStartOnboarding: () => void;
  onStartVocabulary: () => void;
  onStartGrammar: () => void;
  onStartCloze: () => void;
  onStartReading: (passage: Passage) => void;
  onStartListening: () => void;
  onStartWriting: () => void;
  onStartTranslation: () => void;
  onStartMockExam: () => void;
  skillProfiles?: SkillProfile[];
  dailyPlan?: DailyPlan | null;
}

interface PracticeTone {
  pill: string;
  card: string;
  active: string;
  button: string;
}

interface PracticeModule {
  id: PracticeModuleId;
  Icon: LucideIcon;
  label: string;
  subtitle: string;
  count: string;
  duration: string;
  actionLabel: string;
  outcome: string;
  route: string[];
  skillArea: SkillProfile['skillArea'];
  recommendation?: string;
  tone: PracticeTone;
  onStart: () => void;
}

const TONES: Record<'blue' | 'green' | 'amber' | 'rose', PracticeTone> = {
  blue: {
    pill: 'border-[#cfe6f2] bg-[#eef7fc] text-[#003178]',
    card: 'border-[#cfe6f2] bg-white',
    active: 'border-[#003178] bg-[#003178] text-white shadow-lg shadow-blue-900/10',
    button: 'bg-[#003178] hover:bg-[#0d47a1] text-white',
  },
  green: {
    pill: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    card: 'border-emerald-100 bg-white',
    active: 'border-emerald-700 bg-emerald-700 text-white shadow-lg shadow-emerald-900/10',
    button: 'bg-[#1b6d24] hover:bg-emerald-700 text-white',
  },
  amber: {
    pill: 'border-amber-100 bg-amber-50 text-amber-700',
    card: 'border-amber-100 bg-white',
    active: 'border-amber-600 bg-amber-600 text-white shadow-lg shadow-amber-900/10',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  rose: {
    pill: 'border-rose-100 bg-rose-50 text-rose-700',
    card: 'border-rose-100 bg-white',
    active: 'border-rose-700 bg-rose-700 text-white shadow-lg shadow-rose-900/10',
    button: 'bg-rose-700 hover:bg-rose-800 text-white',
  },
};

export default function PracticeHub({
  examId,
  examName,
  onStartOnboarding,
  onStartVocabulary,
  onStartGrammar,
  onStartCloze,
  onStartReading,
  onStartListening,
  onStartWriting,
  onStartTranslation,
  onStartMockExam,
  skillProfiles = [],
  dailyPlan,
}: PracticeHubProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<PracticeModuleId>('vocabulary');
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const [visibleReadingCount, setVisibleReadingCount] = useState(8);
  const isCet4 = examId === 'cet4';

  const readingPassages = useMemo(() => CET4_READING_BANK.map((passage) => ({
    id: passage.id,
    title: passage.title,
    category: '原创模拟 · 仔细阅读',
    words: passage.content.split(/\s+/).filter(Boolean).length,
    duration: `${Math.max(12, passage.questions.length * 3)} 分钟`,
    questionCount: passage.questions.length,
    data: passage,
  })), []);
  const firstReadingPassage = readingPassages[0];
  const latestScoreBySkill = useMemo(() => {
    const result = new Map<SkillProfile['skillArea'], SkillProfile>();
    skillProfiles.forEach((profile) => {
      const current = result.get(profile.skillArea);
      if (!current || profile.lastUpdatedAt > current.lastUpdatedAt) result.set(profile.skillArea, profile);
    });
    return result;
  }, [skillProfiles]);
  const moduleIdForTask = (task: DailyPlan['tasks'][number]): PracticeModuleId | undefined => {
    const mode = String(task.payload?.mode ?? '');
    if (task.type === 'mock') return 'mock';
    if (mode.includes('cloze')) return 'cloze';
    if (mode.includes('grammar')) return 'grammar';
    if (['vocabulary', 'reading', 'listening', 'writing', 'translation'].includes(task.skillArea)) {
      return task.skillArea as PracticeModuleId;
    }
    return undefined;
  };
  const plannedModuleIds = new Set<PracticeModuleId>(
    dailyPlan?.tasks.map(moduleIdForTask).filter((id): id is PracticeModuleId => Boolean(id)) ?? [],
  );
  const latestProfileForModule = (moduleId: PracticeModuleId, skillArea: SkillProfile['skillArea']) => {
    const profiles = skillProfiles
      .filter((profile) => {
        const subSkill = profile.subSkillId.toLowerCase();
        if (moduleId === 'cloze') return subSkill.includes('cloze');
        if (moduleId === 'vocabulary') return profile.skillArea === 'vocabulary' && !subSkill.includes('cloze');
        return profile.skillArea === skillArea;
      })
      .sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt));
    return profiles[0] ?? latestScoreBySkill.get(skillArea);
  };
  const recommendationFor = (moduleId: PracticeModuleId, skillArea: SkillProfile['skillArea']) => {
    const profile = latestProfileForModule(moduleId, skillArea);
    if (plannedModuleIds.has(moduleId)) return '今日计划推荐';
    if (!profile) return '缺少诊断证据';
    if (profile.score < 60) return '诊断弱项优先';
    if (profile.score < 75) return '需要巩固';
    return '';
  };

  const modules: PracticeModule[] = [
    {
      id: 'vocabulary',
      Icon: Volume2,
      label: '词汇听音',
      subtitle: '先听单词和例句，再做词义辨析',
      count: `核心词汇 ${CET4_VOCABULARY_BANK.length} 个`,
      duration: '12m/组',
      actionLabel: '开始单词练习',
      outcome: '生成词汇能力证据，低信心或错误项进入主动回忆队列。',
      route: ['自动播报', '释义选择', '把握度标记', '错因入库'],
      skillArea: 'vocabulary',
      recommendation: recommendationFor('vocabulary', 'vocabulary'),
      tone: TONES.green,
      onStart: onStartVocabulary,
    },
    {
      id: 'cloze',
      Icon: ListChecks,
      label: '完形/选词填空',
      subtitle: '围绕上下文、词义辨析、固定搭配和句际逻辑做小题闭环',
      count: `完形/语境题 ${CET4_CLOZE_PRACTICE_QUESTIONS.length} 题`,
      duration: '12m/组',
      actionLabel: '开始完形填空训练',
      outcome: '补齐完形与选词填空能力证据，避免只背单词但不会进语境。',
      route: ['读上下文', '选词入空', '解释搭配', '错因复习'],
      skillArea: 'vocabulary',
      recommendation: recommendationFor('cloze', 'vocabulary'),
      tone: TONES.green,
      onStart: onStartCloze,
    },
    {
      id: 'grammar',
      Icon: ListChecks,
      label: '语法结构',
      subtitle: '训练时态、语态、非谓语、从句、连接词和固定搭配',
      count: `语法结构 ${CET4_GRAMMAR_PRACTICE_QUESTIONS.length} 题`,
      duration: '12m/组',
      actionLabel: '开始语法训练',
      outcome: '语法结果会写入 grammar 能力画像，并反向支撑写作、翻译和完形。',
      route: ['看句法线索', '选择结构', '解释规则', '写入画像'],
      skillArea: 'grammar',
      recommendation: recommendationFor('grammar', 'grammar'),
      tone: TONES.blue,
      onStart: onStartGrammar,
    },
    {
      id: 'reading',
      Icon: BookOpen,
      label: '仔细阅读',
      subtitle: '选择材料后进入定位、作答、错因反馈',
      count: `${readingPassages.length} 组材料 / ${CET4_READING_PRACTICE_QUESTIONS.length} 题`,
      duration: '12-18m',
      actionLabel: '开始仔细阅读训练',
      outcome: '每题保留定位线索、作答、把握度和阅读能力画像。',
      route: ['选材料', '读文章', '逐题提交', '查看错因'],
      skillArea: 'reading',
      recommendation: recommendationFor('reading', 'reading'),
      tone: TONES.blue,
      onStart: () => {
        if (firstReadingPassage) onStartReading(firstReadingPassage.data);
      },
    },
    {
      id: 'listening',
      Icon: Headphones,
      label: '长对话精听',
      subtitle: '进入后自动语音播报，可暂停、调速、重听',
      count: `${CET4_LISTENING_PRACTICE_QUESTIONS.length} 道听力题`,
      duration: '15m',
      actionLabel: '开始听力训练',
      outcome: '听力作答会记录关键词漏听、转折漏听和低信心证据。',
      route: ['自动播报', '作答', '把握度', '听力错因'],
      skillArea: 'listening',
      recommendation: recommendationFor('listening', 'listening'),
      tone: TONES.blue,
      onStart: onStartListening,
    },
    {
      id: 'writing',
      Icon: PenLine,
      label: '短文写作',
      subtitle: '先写作，再拿结构化反馈',
      count: `${CET4_WRITING_PROMPT_BANK.length} 题`,
      duration: '30m',
      actionLabel: '开始写作训练',
      outcome: '写作输出会形成结构、语法、表达升级和复习项。',
      route: ['读题', '先输出', 'AI/规则反馈', '写入画像'],
      skillArea: 'writing',
      recommendation: recommendationFor('writing', 'writing'),
      tone: TONES.amber,
      onStart: onStartWriting,
    },
    {
      id: 'translation',
      Icon: Languages,
      label: '段落翻译',
      subtitle: '中译英段落，先产出译文再评阅',
      count: `${CET4_TRANSLATION_PROMPT_BANK.length} 题`,
      duration: '30m',
      actionLabel: '开始翻译训练',
      outcome: '保留中文干扰、搭配错误、句法转换等弱项证据。',
      route: ['读中文', '先翻译', '结构反馈', '复习表达'],
      skillArea: 'translation',
      recommendation: recommendationFor('translation', 'translation'),
      tone: TONES.amber,
      onStart: onStartTranslation,
    },
    {
      id: 'mock',
      Icon: ClipboardCheck,
      label: '阶段模考',
      subtitle: '完整 CET-4 四模块提交后才计入阶段证据',
      count: `${CET4_MOCK_EXAM_BANK.length} 套组卷容量`,
      duration: '125m',
      actionLabel: '开始阶段模考',
      outcome: '一次生成写作、听力、阅读、翻译四项分数和阶段验证证据。',
      route: ['写作', '听力', '阅读', '翻译', '提交检查'],
      skillArea: 'reading',
      recommendation: plannedModuleIds.has('mock') ? '今日计划推荐' : '',
      tone: TONES.rose,
      onStart: onStartMockExam,
    },
  ];
  const orderedModules = [...modules].sort((left, right) => {
    const rank = (module: PracticeModule) => {
      const score = latestProfileForModule(module.id, module.skillArea)?.score;
      if (module.recommendation === '今日计划推荐') return 0;
      if (module.recommendation === '诊断弱项优先') return 1;
      if (module.recommendation === '缺少诊断证据') return 2;
      if (module.recommendation === '需要巩固') return 3;
      return typeof score === 'number' ? 10 + score : 20;
    };
    return rank(left) - rank(right);
  });
  const recommendedModuleId = orderedModules[0]?.id ?? 'vocabulary';
  const recommendedModule = orderedModules[0];
  const recommendedTask = dailyPlan?.tasks.find((task) => moduleIdForTask(task) === recommendedModuleId);
  const selectedModule = orderedModules.find((module) => module.id === selectedModuleId) ?? orderedModules[0];
  const selectedIcon = selectedModule.Icon;
  const visibleReadingPassages = readingPassages.slice(0, visibleReadingCount);

  useEffect(() => {
    if (!hasManualSelection) setSelectedModuleId(recommendedModuleId);
  }, [hasManualSelection, recommendedModuleId]);

  return (
    <div className="app-page-surface flex-1 overflow-y-auto overflow-x-hidden bg-[#f7fbff] p-4 sm:p-6 lg:h-screen lg:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white/92 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#003178]/10 px-3 py-1 text-xs font-black text-[#003178]">
                <LibraryBig className="h-4 w-4" />
                {examName} 专项训练工作台
              </div>
              <h2 className="text-2xl font-black leading-tight text-[#003178] sm:text-3xl">
                专项练习
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                选择一个能力，直接开始训练。
              </p>
            </div>
            <button
              type="button"
              onClick={onStartOnboarding}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#cfe6f2] bg-[#003178] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#07244f]"
            >
              <GraduationCap className="h-4 w-4 text-emerald-300" />
              入门诊断与能力画像
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ['阅读材料', readingPassages.length],
              ['词汇语块', CET4_VOCABULARY_BANK.length],
              ['语法完形', CET4_GRAMMAR_PRACTICE_QUESTIONS.length + CET4_CLOZE_PRACTICE_QUESTIONS.length],
              ['阅读题池', CET4_READING_PRACTICE_QUESTIONS.length],
              ['写译题', CET4_WRITING_PROMPT_BANK.length + CET4_TRANSLATION_PROMPT_BANK.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-3 text-center">
                <div className="text-2xl font-black text-[#003178]">{value}</div>
                <div className="text-[11px] font-black text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          {isCet4 && recommendedModule && (
            <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs font-black text-emerald-800">诊断驱动推荐</div>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
                    优先进入「{recommendedModule.label}」{recommendedTask?.reason ? ` · ${recommendedTask.reason}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={recommendedModule.onStart}
                  className="ui-button ui-button-success shrink-0"
                >
                  进入推荐专项
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </header>

        {!isCet4 && (
          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-900 shadow-sm">
            当前目标考试「{examName}」还处于题库建设阶段，暂不开放专项练习。请在设置或入门诊断中切回 CET-4 后继续训练。
          </section>
        )}

        {isCet4 && (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="专项练习模块">
          {orderedModules.map((module, index) => {
            const Icon = module.Icon;
            const isActive = selectedModuleId === module.id;
            return (
              <article
                key={module.id}
                className={`rounded-[2rem] border p-4 shadow-sm transition sm:p-5 ${
                  isActive ? module.tone.active : `${module.tone.card} hover:border-[#003178]/50 hover:shadow-md`
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setHasManualSelection(true);
                    setSelectedModuleId(module.id);
                  }}
                  aria-pressed={isActive}
                  className="w-full rounded-2xl text-left focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${
                      isActive ? 'border-white/30 bg-white/15 text-white' : module.tone.pill
                    }`}>
                      <Icon className="h-3.5 w-3.5" />
                      Step {index + 1}
                    </span>
                    <span className={`text-[11px] font-black ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                      {isActive ? '已选择' : module.duration}
                    </span>
                  </div>
                  {module.recommendation ? (
                    <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${
                      isActive ? 'bg-white/18 text-white' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {module.recommendation}
                    </span>
                  ) : null}
                  <h3 className={`mt-3 text-lg font-black ${isActive ? 'text-white' : 'text-[#071e27]'}`}>{module.label}</h3>
                  <p className={`mt-2 line-clamp-1 text-sm font-semibold leading-5 ${isActive ? 'text-white/82' : 'text-slate-500'}`}>
                    {module.subtitle}
                  </p>
                  <div className={`mt-3 text-xs font-black ${isActive ? 'text-white/78' : 'text-slate-500'}`}>
                    {module.count}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    module.onStart();
                  }}
                  className={`ui-button ui-button-full mt-4 ${
                    isActive ? 'bg-white text-[#003178] hover:bg-slate-50' : module.tone.button
                  }`}
                >
                  {module.actionLabel}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </article>
            );
          })}
        </section>
        )}

        {isCet4 && (
        <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${selectedModule.tone.pill}`}>
                  {React.createElement(selectedIcon, { className: 'h-4 w-4' })}
                  当前选择
                </span>
                <h3 className="mt-3 text-2xl font-black text-[#003178]">{selectedModule.label}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{selectedModule.duration}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{selectedModule.count}</span>
                  {selectedModule.recommendation ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{selectedModule.recommendation}</span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={selectedModule.onStart}
                aria-label={`进入当前${selectedModule.label}训练`}
                className={`ui-button shrink-0 ${selectedModule.tone.button}`}
              >
                进入当前训练
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
        </section>
        )}

        {isCet4 && selectedModule.id === 'reading' && (
          <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-[#cfe6f2] bg-[#eef7fc] px-2.5 py-1 text-[10px] font-black text-[#003178]">
                  阅读材料库
                </span>
                <h3 className="mt-3 text-lg font-black text-[#071e27]">按材料进入训练，避免一次性铺满全题库</h3>
              </div>
              <p className="text-xs font-bold leading-5 text-slate-500">
                当前显示 {visibleReadingPassages.length}/{readingPassages.length} 组，可继续展开。
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {visibleReadingPassages.map((passage) => (
                <article
                  key={passage.id}
                  className="flex min-h-40 flex-col justify-between rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:border-[#003178]/40 hover:bg-white"
                >
                  <div>
                    <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#003178]">
                      {passage.category}
                    </span>
                    <h4 className="mt-3 line-clamp-2 text-base font-black text-[#071e27]">{passage.title}</h4>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                      <span>{passage.words} 词</span>
                      <span>{passage.questionCount} 题</span>
                      <span>{passage.duration}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartReading(passage.data)}
                    className="ui-button ui-button-primary mt-4 w-full sm:w-auto"
                  >
                    <FileText className="h-4 w-4" />
                    开始仔细阅读训练
                  </button>
                </article>
              ))}
            </div>
            {visibleReadingCount < readingPassages.length && (
              <button
                type="button"
                onClick={() => setVisibleReadingCount((count) => Math.min(readingPassages.length, count + 8))}
                className="ui-button ui-button-secondary ui-button-full mt-4"
              >
                展开更多阅读材料
              </button>
            )}
          </section>
        )}

        {isCet4 && (
        <details className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left">
            <span className="inline-flex items-center gap-2 text-sm font-black text-[#003178]">
              <ShieldCheck className="h-4 w-4" />
              题库范围
            </span>
            <span className="text-xs font-bold text-slate-500">{examName} · 原创模拟</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#cfe6f2] bg-[#eef7fc] px-2.5 py-1 text-[10px] font-black text-[#003178]">
                <ListChecks className="h-3.5 w-3.5" />
                题型覆盖
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CET4_QUESTION_BANK_COVERAGE.slice(0, 8).map((item) => (
                  <div key={`${item.moduleId}-${item.questionTypeId}`}>
                    <CoverageCard item={item} tone="blue" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {[
                ['诊断', '按目标考试生成画像'],
                ['专项', '只显示当前题库'],
                ['模考', '使用 CET-4 结构卷'],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-2xl border border-emerald-100 bg-emerald-50/55 p-3">
                  <div className="text-xs font-black text-emerald-800">{title}</div>
                  <p className="mt-1 text-[11px] font-semibold text-slate-600">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </details>
        )}
      </div>
    </div>
  );
}

function CoverageCard({
  item,
  tone,
}: {
  item: {
    moduleId: string;
    questionTypeId: string;
    name: string;
    trainingRoute: string;
    builtInCount: number;
    officialCount: string;
    durationMinutes: number;
  };
  tone: 'blue' | 'green';
}) {
  const titleClassName = tone === 'green' ? 'text-emerald-800' : 'text-[#003178]';
  const cardClassName = tone === 'green'
    ? 'border-emerald-100 bg-emerald-50/55'
    : 'border-slate-100 bg-slate-50';

  return (
    <div className={`rounded-2xl border p-3 ${cardClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-xs font-black ${titleClassName}`}>{item.name}</div>
          <div className="mt-1 line-clamp-2 text-[10px] font-bold text-slate-500">{item.trainingRoute}</div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">
          {item.builtInCount}
        </span>
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-500">
        <span>结构 {item.officialCount}</span>
        <span>{item.durationMinutes}m</span>
      </div>
    </div>
  );
}
