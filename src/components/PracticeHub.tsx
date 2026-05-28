import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Headphones,
  Languages,
  LibraryBig,
  ListChecks,
  PenLine,
  Route,
  ShieldCheck,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { CET4_VOCABULARY_BANK } from '../data';
import {
  CET4_QUESTION_BANK_COVERAGE,
  CET4_READING_BANK,
  CET4_TRANSLATION_PROMPT_BANK,
  CET4_WRITING_PROMPT_BANK,
  DEGREE_ENGLISH_MOCK_EXAM,
  DEGREE_ENGLISH_QUESTION_BANK_COVERAGE,
} from '../questionBank';
import { Passage } from '../types';

type PracticeModuleId = 'vocabulary' | 'reading' | 'listening' | 'writing' | 'translation' | 'mock';

interface PracticeHubProps {
  onStartOnboarding: () => void;
  onStartVocabulary: () => void;
  onStartReading: (passage: Passage) => void;
  onStartListening: () => void;
  onStartWriting: () => void;
  onStartTranslation: () => void;
  onStartMockExam: () => void;
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
  onStartOnboarding,
  onStartVocabulary,
  onStartReading,
  onStartListening,
  onStartWriting,
  onStartTranslation,
  onStartMockExam,
}: PracticeHubProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<PracticeModuleId>('vocabulary');
  const [visibleReadingCount, setVisibleReadingCount] = useState(8);

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
      tone: TONES.green,
      onStart: onStartVocabulary,
    },
    {
      id: 'reading',
      Icon: BookOpen,
      label: '仔细阅读',
      subtitle: '选择材料后进入定位、作答、错因反馈',
      count: `${readingPassages.length} 组材料`,
      duration: '12-18m',
      actionLabel: '开始仔细阅读训练',
      outcome: '每题保留定位线索、作答、把握度和阅读能力画像。',
      route: ['选材料', '读文章', '逐题提交', '查看错因'],
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
      count: '250+ 听力题',
      duration: '15m',
      actionLabel: '开始听力训练',
      outcome: '听力作答会记录关键词漏听、转折漏听和低信心证据。',
      route: ['自动播报', '作答', '把握度', '听力错因'],
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
      tone: TONES.amber,
      onStart: onStartTranslation,
    },
    {
      id: 'mock',
      Icon: ClipboardCheck,
      label: '阶段模考',
      subtitle: '完整 CET-4 四模块提交后才计入阶段证据',
      count: '1 套标准结构',
      duration: '125m',
      actionLabel: '开始阶段模考',
      outcome: '一次生成写作、听力、阅读、翻译四项分数和阶段验证证据。',
      route: ['写作', '听力', '阅读', '翻译', '提交检查'],
      tone: TONES.rose,
      onStart: onStartMockExam,
    },
  ];
  const selectedModule = modules.find((module) => module.id === selectedModuleId) ?? modules[0];
  const selectedIcon = selectedModule.Icon;
  const visibleReadingPassages = readingPassages.slice(0, visibleReadingCount);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_38%,#fff7ed_100%)] p-4 sm:p-6 lg:h-screen lg:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white/92 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#003178]/10 px-3 py-1 text-xs font-black text-[#003178]">
                <LibraryBig className="h-4 w-4" />
                专项训练工作台
              </div>
              <h2 className="text-2xl font-black leading-tight text-[#003178] sm:text-3xl">
                专项练习：先选训练目标，再进入可评分练习
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                专项练习不再把题库、说明和入口混成一屏长列表。先选择要训练的能力，再进入作答、反馈、错因入库和能力画像更新。
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

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['阅读材料', readingPassages.length],
              ['核心词汇', CET4_VOCABULARY_BANK.length],
              ['写译题', CET4_WRITING_PROMPT_BANK.length + CET4_TRANSLATION_PROMPT_BANK.length],
              ['题型结构', CET4_QUESTION_BANK_COVERAGE.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-3 text-center">
                <div className="text-2xl font-black text-[#003178]">{value}</div>
                <div className="text-[11px] font-black text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="专项练习模块">
          {modules.map((module, index) => {
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
                  onClick={() => setSelectedModuleId(module.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${
                      isActive ? 'border-white/30 bg-white/15 text-white' : module.tone.pill
                    }`}>
                      <Icon className="h-3.5 w-3.5" />
                      Step {index + 1}
                    </span>
                    <span className={`text-[11px] font-black ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                      {module.duration}
                    </span>
                  </div>
                  <h3 className={`mt-3 text-lg font-black ${isActive ? 'text-white' : 'text-[#071e27]'}`}>{module.label}</h3>
                  <p className={`mt-2 min-h-10 text-sm font-semibold leading-5 ${isActive ? 'text-white/82' : 'text-slate-500'}`}>
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
                  className={`mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black shadow-sm transition ${
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

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${selectedModule.tone.pill}`}>
                  {React.createElement(selectedIcon, { className: 'h-4 w-4' })}
                  当前训练路径
                </span>
                <h3 className="mt-3 text-2xl font-black text-[#003178]">{selectedModule.label}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{selectedModule.outcome}</p>
              </div>
              <button
                type="button"
                onClick={selectedModule.onStart}
                aria-label={`进入当前${selectedModule.label}训练`}
                className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black shadow-sm transition ${selectedModule.tone.button}`}
              >
                进入当前训练
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {selectedModule.route.map((step, index) => (
                <div key={step} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#003178] text-[10px] font-black text-white">
                      {index + 1}
                    </span>
                    <span className="text-xs font-black text-[#071e27]">{step}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
              <Route className="h-4 w-4" />
              闭环证据
            </span>
            <div className="mt-4 space-y-3">
              {[
                ['作答先行', '用户必须先输入答案或选择选项，不直接展示参考答案。'],
                ['反馈可解释', '结果包含错因、定位线索或结构化改写建议。'],
                ['数据可沉淀', '完成后写入 PracticeSession、Attempt、ReviewItem 或 SkillProfile。'],
              ].map(([title, detail]) => (
                <div key={title} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <div>
                    <div className="text-xs font-black text-[#071e27]">{title}</div>
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        {selectedModule.id === 'reading' && (
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
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#003178] px-4 text-xs font-black text-white transition hover:bg-[#0d47a1] sm:w-auto"
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
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[#cfe6f2] bg-white px-4 text-sm font-black text-[#003178] transition hover:bg-[#eef7fc]"
              >
                展开更多阅读材料
              </button>
            )}
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe6f2] bg-[#eef7fc] px-2.5 py-1 text-[10px] font-black text-[#003178]">
                  <ListChecks className="h-3.5 w-3.5" />
                  CET-4 覆盖
                </span>
                <h3 className="mt-3 text-lg font-black text-[#071e27]">主要题型覆盖清单</h3>
              </div>
              <p className="text-xs font-bold leading-5 text-slate-500">原创模拟题，不冒充官方真题。</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CET4_QUESTION_BANK_COVERAGE.slice(0, 6).map((item) => (
                <div key={`${item.moduleId}-${item.questionTypeId}`}>
                  <CoverageCard item={item} tone="blue" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  学位英语结构
                </span>
                <h3 className="mt-3 text-lg font-black text-[#071e27]">去年大纲已转成可验证结构</h3>
              </div>
              <p className="text-xs font-bold leading-5 text-slate-500">
                不考听力 · {DEGREE_ENGLISH_MOCK_EXAM.totalQuestionCount} 题 · 120 分钟
              </p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DEGREE_ENGLISH_QUESTION_BANK_COVERAGE.slice(0, 6).map((item) => (
                <div key={`degree-${item.moduleId}-${item.questionTypeId}`}>
                  <CoverageCard item={item} tone="green" />
                </div>
              ))}
            </div>
          </div>
        </section>
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
