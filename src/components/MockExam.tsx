import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  Headphones,
  ListChecks,
  Loader2,
  PenLine,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { CET4_MOCK_EXAM_BANK, type Cet4MockChoiceQuestion } from '../questionBank';
import { buildMockExamReport, MockExamReportResult } from '../domain/practice/mockExam';
import { PracticeCompletionReport } from '../types';

type Choice = 'A' | 'B' | 'C' | 'D';
type MockSectionId = 'writing' | 'listening' | 'reading' | 'translation' | 'review';

interface MockExamProps {
  onBack: () => void;
  onComplete: (score: number, report: PracticeCompletionReport) => void;
}

export default function MockExam({ onBack, onComplete }: MockExamProps) {
  const [startedAt] = useState(() => new Date().toISOString());
  const [activeSection, setActiveSection] = useState<MockSectionId>('writing');
  const [choices, setChoices] = useState<Record<string, Choice | undefined>>({});
  const [writingAnswer, setWritingAnswer] = useState('');
  const [translationAnswer, setTranslationAnswer] = useState('');
  const [result, setResult] = useState<MockExamReportResult | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState(CET4_MOCK_EXAM_BANK[0].id);
  const paper = CET4_MOCK_EXAM_BANK.find((item) => item.id === selectedPaperId) ?? CET4_MOCK_EXAM_BANK[0];

  const listeningAnsweredCount = paper.listening.questions.filter((question) => choices[question.id]).length;
  const readingAnsweredCount = paper.reading.questions.filter((question) => choices[question.id]).length;
  const writingCharCount = writingAnswer.trim().length;
  const translationCharCount = translationAnswer.trim().length;
  const writingReady = writingCharCount >= 40;
  const listeningReady = listeningAnsweredCount === paper.listening.questions.length;
  const readingReady = readingAnsweredCount === paper.reading.questions.length;
  const translationReady = translationCharCount >= 20;
  const canSubmit = writingReady && listeningReady && readingReady && translationReady;

  const sections: Array<{
    id: MockSectionId;
    label: string;
    shortLabel: string;
    time: string;
    status: string;
    ready: boolean;
  }> = [
    {
      id: 'writing',
      label: '写作',
      shortLabel: '写作',
      time: '30m',
      status: writingReady ? '已完成' : `还差 ${Math.max(0, 40 - writingCharCount)} 字符`,
      ready: writingReady,
    },
    {
      id: 'listening',
      label: '听力',
      shortLabel: '听力',
      time: '25m',
      status: `${listeningAnsweredCount}/${paper.listening.questions.length} 题`,
      ready: listeningReady,
    },
    {
      id: 'reading',
      label: '阅读',
      shortLabel: '阅读',
      time: '40m',
      status: `${readingAnsweredCount}/${paper.reading.questions.length} 题`,
      ready: readingReady,
    },
    {
      id: 'translation',
      label: '翻译',
      shortLabel: '翻译',
      time: '30m',
      status: translationReady ? '已完成' : `还差 ${Math.max(0, 20 - translationCharCount)} 字符`,
      ready: translationReady,
    },
    {
      id: 'review',
      label: '提交检查',
      shortLabel: '检查',
      time: '提交',
      status: canSubmit ? '可提交' : '仍有未完成项',
      ready: canSubmit,
    },
  ];
  const activeSectionIndex = sections.findIndex((section) => section.id === activeSection);
  const incompleteSections = sections.filter((section) => section.id !== 'review' && !section.ready);
  const completedSectionCount = sections.filter((section) => section.id !== 'review' && section.ready).length;
  const firstIncompleteSection = incompleteSections[0];

  const speakListening = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(paper.listening.transcript);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  };

  const selectPaper = (paperId: string) => {
    setSelectedPaperId(paperId);
    setActiveSection('writing');
    setChoices({});
    setWritingAnswer('');
    setTranslationAnswer('');
    setResult(null);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  const submitMockExam = () => {
    if (!canSubmit) {
      setActiveSection(firstIncompleteSection?.id ?? 'review');
      return;
    }

    const nextResult = buildMockExamReport({
      paper,
      answers: {
        choices,
        writingAnswer,
        translationAnswer,
      },
      startedAt,
    });
    setResult(nextResult);
  };

  const persistResult = async () => {
    if (!result) return;
    setIsCompleting(true);
    try {
      await Promise.resolve(onComplete(result.score, result.report));
    } finally {
      setIsCompleting(false);
    }
  };

  const goToRelativeSection = (offset: number) => {
    const next = sections[Math.max(0, Math.min(sections.length - 1, activeSectionIndex + offset))];
    setActiveSection(next.id);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'writing':
        return (
          <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={<PenLine className="h-5 w-5" />}
              eyebrow="Part I"
              title="写作：先完成可评分输出"
              detail="建议先写作，避免被后续客观题打断表达结构。"
            />
            <p className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
              {paper.writing.prompt}
            </p>
            <textarea
              data-testid="mock-writing-answer"
              value={writingAnswer}
              onChange={(event) => setWritingAnswer(event.target.value)}
              className="mt-4 min-h-64 w-full rounded-3xl border border-slate-200 bg-[#fbfdff] p-4 text-sm font-semibold leading-7 text-slate-700 outline-none focus:ring-2 focus:ring-[#003178]/25"
              placeholder="Write your essay here..."
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">{writingCharCount} 字符</span>
              <span className={`rounded-full px-3 py-1 ${writingReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {writingReady ? '写作已达提交条件' : '先写满 40 个字符再进入最终提交'}
              </span>
            </div>
          </section>
        );
      case 'listening':
        return (
          <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <SectionHeader
                icon={<Headphones className="h-5 w-5" />}
                eyebrow="Part II"
                title="听力：先听后答"
                detail="先播放材料，再完成所有听力选择题。转写默认折叠，作为无音频环境兜底。"
              />
              <button
                type="button"
                onClick={speakListening}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#003178] px-4 text-xs font-black text-white hover:bg-[#0d47a1]"
              >
                <Volume2 className="h-4 w-4" />
                播放听力材料
              </button>
            </div>
            <details className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-500">
              <summary className="cursor-pointer text-sm font-black text-[#003178]">查看听力转写兜底</summary>
              <p className="mt-3 whitespace-pre-line">{paper.listening.transcript}</p>
            </details>
            <QuestionList
              questions={paper.listening.questions}
              choices={choices}
              onSelect={(questionId, choice) => setChoices((current) => ({ ...current, [questionId]: choice }))}
            />
          </section>
        );
      case 'reading':
        return (
          <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={<FileText className="h-5 w-5" />}
              eyebrow="Part III"
              title="阅读：读文章后集中作答"
              detail="阅读题和听力题分开推进，避免长页面混答造成漏题。"
            />
            <p className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
              {paper.reading.passage}
            </p>
            <QuestionList
              questions={paper.reading.questions}
              choices={choices}
              onSelect={(questionId, choice) => setChoices((current) => ({ ...current, [questionId]: choice }))}
            />
          </section>
        );
      case 'translation':
        return (
          <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={<PenLine className="h-5 w-5" />}
              eyebrow="Part IV"
              title="翻译：最后做输出校准"
              detail="提交前保留翻译编辑区，便于对照写作输出和词汇选择。"
            />
            <p className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
              {paper.translation.prompt}
            </p>
            <textarea
              data-testid="mock-translation-answer"
              value={translationAnswer}
              onChange={(event) => setTranslationAnswer(event.target.value)}
              className="mt-4 min-h-56 w-full rounded-3xl border border-slate-200 bg-[#fbfdff] p-4 text-sm font-semibold leading-7 text-slate-700 outline-none focus:ring-2 focus:ring-[#003178]/25"
              placeholder="Translate the paragraph here..."
            />
            <div className="mt-3 text-xs font-black text-slate-500">{translationCharCount} 字符</div>
          </section>
        );
      case 'review':
        return (
          <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={<ListChecks className="h-5 w-5" />}
              eyebrow="Submit"
              title="提交前检查"
              detail="系统只允许完整模考进入评分，避免半套卷污染阶段提分证据。"
            />
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {sections.filter((section) => section.id !== 'review').map((section) => (
                <button
                  key={`review-${section.id}`}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    section.ready
                      ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                      : 'border-amber-100 bg-amber-50 text-amber-800'
                  }`}
                >
                  <div className="text-sm font-black">{section.label}</div>
                  <div className="mt-2 text-xs font-bold">{section.status}</div>
                </button>
              ))}
            </div>
            {incompleteSections.length > 0 ? (
              <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-800">
                仍需完成：{incompleteSections.map((section) => section.label).join('、')}。点击上方卡片返回对应模块。
              </p>
            ) : (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-800">
                四个模块均已完成，可以提交并生成阶段模考报告。
              </p>
            )}
          </section>
        );
    }
  };

  return (
    <div className="app-page-surface flex-1 min-h-[calc(100svh-9rem)] lg:h-screen overflow-y-auto bg-[#f7fbff] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-[2rem] border border-[#cfe6f2] bg-white/92 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={onBack}
                className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#cfe6f2] bg-[#eef7fc] px-4 text-xs font-black text-[#003178] hover:bg-white"
              >
                <ArrowLeft className="h-4 w-4" />
                返回今日训练
              </button>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#003178]/10 px-3 py-1 text-xs font-black text-[#003178]">
                <ClipboardCheck className="h-4 w-4" />
                阶段模考
              </div>
              <h2 className="mt-3 text-2xl font-black leading-tight text-[#003178] sm:text-3xl">
                {paper.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                覆盖写作、听力、阅读、翻译四个 CET-4 笔试模块。提交后会生成分项分数、错因复习项和能力图谱证据。
              </p>
              <p className="mt-2 text-xs font-bold leading-5 text-amber-700">
                {paper.sourceNotice}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-black sm:min-w-[320px]">
              <div className="rounded-2xl bg-[#eef7fc] p-3 text-[#003178]">
                <div className="text-2xl">{paper.plannedMinutes}</div>
                <div>分钟</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <div className="text-2xl">{completedSectionCount}/4</div>
                <div>模块完成</div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                <div className="text-2xl">{result?.score ?? '--'}</div>
                <div>模考分</div>
              </div>
            </div>
          </div>
        </header>

        {!result && (
          <section className="rounded-[2rem] border border-[#cfe6f2] bg-white/85 p-4 shadow-sm sm:p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px_360px] xl:items-center">
              <div className="min-w-0">
                <div className="text-sm font-black text-[#003178]">模考规则：按正式卷顺序推进，最后统一提交评分</div>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  单项练习可以随时返回修改；阶段模考报告只在写作、听力、阅读、翻译全部完成后生成，避免半套卷污染提分证据。
                </p>
              </div>
              <label className="flex min-w-0 flex-col gap-1 text-xs font-black text-[#003178]">
                选择模拟卷
                <div className="ui-select-shell">
                  <select
                    value={selectedPaperId}
                    onChange={(event) => selectPaper(event.target.value)}
                    className="ui-select"
                  >
                    {CET4_MOCK_EXAM_BANK.map((item, index) => (
                      <option key={item.id} value={item.id}>
                        {`第 ${index + 1} 套：${item.title}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="ui-select-icon" />
                </div>
              </label>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-black text-slate-500">
                {sections.filter((section) => section.id !== 'review').map((section, index) => (
                  <button
                    key={`flow-${section.id}`}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`rounded-2xl px-2 py-2 transition ${
                      section.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 hover:bg-[#eef7fc] hover:text-[#003178]'
                    }`}
                  >
                    <span className="block text-xs">{index + 1}</span>
                    <span>{section.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {result ? (
          <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm sm:p-6" data-testid="mock-exam-result">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  模考报告已生成
                </div>
                <h3 className="mt-3 text-2xl font-black text-[#003178]">综合模拟得分 {result.score}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  本次生成 {result.report.attempts.length} 条作答证据、{result.report.reviewItems.length} 个错因复习项和 {result.report.skillProfiles.length} 个能力画像节点。
                </p>
              </div>
              <button
                type="button"
                data-testid="mock-exam-persist"
                onClick={persistResult}
                disabled={isCompleting}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1b6d24] px-5 text-sm font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
              >
                {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                写入能力图谱与复习队列
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.sectionScores.map((section) => (
                <div key={section.moduleId} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-xs font-black text-slate-500">{section.label}</div>
                  <div className="mt-2 text-3xl font-black text-[#003178]">{section.score}</div>
                  {section.totalCount ? (
                    <div className="mt-1 text-[11px] font-bold text-slate-500">
                      {section.correctCount}/{section.totalCount} 题正确
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] font-bold text-slate-500">主观题启发式评分</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="space-y-5">
            <nav className="rounded-[2rem] border border-[#cfe6f2] bg-white/95 p-3 shadow-sm">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    data-testid={`mock-section-${section.id}`}
                    onClick={() => setActiveSection(section.id)}
                    className={`min-h-20 rounded-2xl border p-3 text-left transition ${
                      activeSection === section.id
                        ? 'border-[#003178] bg-[#003178] text-white shadow-md'
                        : section.ready
                          ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                          : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-[#003178]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black">{section.shortLabel}</span>
                      {section.ready ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    </div>
                    <div className="mt-2 text-[11px] font-bold opacity-85">{section.time} · {section.status}</div>
                  </button>
                ))}
              </div>
            </nav>

            {renderActiveSection()}

            <div className="sticky bottom-4 z-20 rounded-[2rem] border border-[#cfe6f2] bg-white/95 p-4 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => goToRelativeSection(-1)}
                    disabled={activeSectionIndex === 0}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-[#003178] disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一模块
                  </button>
                  <button
                    type="button"
                    onClick={() => goToRelativeSection(1)}
                    disabled={activeSectionIndex === sections.length - 1}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-[#003178] disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    下一模块
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  data-testid="mock-exam-submit"
                  onClick={submitMockExam}
                  data-incomplete={canSubmit ? undefined : 'true'}
                  className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition lg:w-auto ${
                    canSubmit
                      ? 'bg-[#003178] text-white hover:bg-[#0d47a1]'
                      : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  {canSubmit ? '提交阶段模考并生成评分' : '定位未完成模块'}
                </button>
              </div>
              {!canSubmit && (
                <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
                  仍需完成：{incompleteSections.map((section) => section.label).join('、')}。系统会把提交动作锁定到完整模考证据。
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  detail,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-full bg-[#003178]/10 px-3 py-1 text-xs font-black text-[#003178]">
        {icon}
        {eyebrow}
      </div>
      <h3 className="mt-3 text-xl font-black text-[#071e27] sm:text-2xl">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{detail}</p>
    </div>
  );
}

function QuestionList({
  questions,
  choices,
  onSelect,
}: {
  questions: Cet4MockChoiceQuestion[];
  choices: Record<string, Choice | undefined>;
  onSelect: (questionId: string, choice: Choice) => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      {questions.map((question) => (
        <article key={question.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="rounded-full bg-[#eef7fc] px-2.5 py-1 text-[10px] font-black text-[#003178]">
                {question.title}
              </span>
              <h4 className="mt-3 text-sm font-black text-[#071e27]">{question.prompt}</h4>
            </div>
            <span className="text-[10px] font-black text-slate-400">{question.questionTypeId}</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {(['A', 'B', 'C', 'D'] as Choice[]).map((choice) => (
              <button
                key={choice}
                type="button"
                data-testid={`mock-choice-${question.id}-${choice}`}
                onClick={() => onSelect(question.id, choice)}
                className={`min-h-11 rounded-2xl border px-3 py-2 text-left text-xs font-bold transition ${
                  choices[question.id] === choice
                    ? 'border-[#003178] bg-[#003178] text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#003178]/40'
                }`}
              >
                {choice}. {question.options[choice]}
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
