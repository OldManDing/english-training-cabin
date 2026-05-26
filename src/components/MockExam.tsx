import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Headphones, Loader2, PenLine, Sparkles } from 'lucide-react';
import { CET4_MOCK_EXAM } from '../questionBank';
import { buildMockExamReport, MockExamReportResult } from '../domain/practice/mockExam';
import { PracticeCompletionReport } from '../types';

type Choice = 'A' | 'B' | 'C' | 'D';

interface MockExamProps {
  onBack: () => void;
  onComplete: (score: number, report: PracticeCompletionReport) => void;
}

export default function MockExam({ onBack, onComplete }: MockExamProps) {
  const [startedAt] = useState(() => new Date().toISOString());
  const [choices, setChoices] = useState<Record<string, Choice | undefined>>({});
  const [writingAnswer, setWritingAnswer] = useState('');
  const [translationAnswer, setTranslationAnswer] = useState('');
  const [result, setResult] = useState<MockExamReportResult | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const allChoiceQuestions = useMemo(
    () => [...CET4_MOCK_EXAM.listening.questions, ...CET4_MOCK_EXAM.reading.questions],
    [],
  );
  const answeredChoiceCount = allChoiceQuestions.filter((question) => choices[question.id]).length;
  const canSubmit = answeredChoiceCount === allChoiceQuestions.length
    && writingAnswer.trim().length >= 40
    && translationAnswer.trim().length >= 20;

  const speakListening = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(CET4_MOCK_EXAM.listening.transcript);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  };

  const submitMockExam = () => {
    const nextResult = buildMockExamReport({
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

  return (
    <div className="flex-1 min-h-[calc(100svh-9rem)] lg:h-screen overflow-y-auto bg-[radial-gradient(circle_at_12%_0,#dff4ff,transparent_28%),linear-gradient(180deg,#f7fbff_0%,#fffaf2_100%)] p-4 sm:p-6 lg:p-8">
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
                {CET4_MOCK_EXAM.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                覆盖写作、听力、阅读、翻译四个 CET-4 笔试模块。提交后会生成分项分数、错因复习项和能力图谱证据。
              </p>
              <p className="mt-2 text-xs font-bold leading-5 text-amber-700">
                {CET4_MOCK_EXAM.sourceNotice}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-black sm:min-w-[320px]">
              <div className="rounded-2xl bg-[#eef7fc] p-3 text-[#003178]">
                <div className="text-2xl">{CET4_MOCK_EXAM.plannedMinutes}</div>
                <div>分钟</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <div className="text-2xl">{answeredChoiceCount}/{allChoiceQuestions.length}</div>
                <div>客观题</div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                <div className="text-2xl">{result?.score ?? '--'}</div>
                <div>模考分</div>
              </div>
            </div>
          </div>
        </header>

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
            <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-black text-[#003178]">
                <PenLine className="h-5 w-5" />
                写作
              </div>
              <p className="text-sm font-semibold leading-7 text-slate-700">{CET4_MOCK_EXAM.writing.prompt}</p>
              <textarea
                data-testid="mock-writing-answer"
                value={writingAnswer}
                onChange={(event) => setWritingAnswer(event.target.value)}
                className="mt-4 min-h-44 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700 outline-none focus:ring-2 focus:ring-[#003178]/25"
                placeholder="Write your essay here..."
              />
            </section>

            <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-black text-[#003178]">
                  <Headphones className="h-5 w-5" />
                  听力
                </div>
                <button
                  type="button"
                  onClick={speakListening}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#003178] px-4 text-xs font-black text-white hover:bg-[#0d47a1]"
                >
                  <Headphones className="h-4 w-4" />
                  播放听力材料
                </button>
              </div>
              <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-500">
                听力文本用于浏览器语音播报兜底，实际训练应先听后答；这里保留文本是为了本地验收和无音频环境可用。
              </div>
              <QuestionList
                questions={CET4_MOCK_EXAM.listening.questions}
                choices={choices}
                onSelect={(questionId, choice) => setChoices((current) => ({ ...current, [questionId]: choice }))}
              />
            </section>

            <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 text-sm font-black text-[#003178]">阅读</div>
              <p className="rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                {CET4_MOCK_EXAM.reading.passage}
              </p>
              <QuestionList
                questions={CET4_MOCK_EXAM.reading.questions}
                choices={choices}
                onSelect={(questionId, choice) => setChoices((current) => ({ ...current, [questionId]: choice }))}
              />
            </section>

            <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-black text-[#003178]">
                <PenLine className="h-5 w-5" />
                翻译
              </div>
              <p className="text-sm font-semibold leading-7 text-slate-700">{CET4_MOCK_EXAM.translation.prompt}</p>
              <textarea
                data-testid="mock-translation-answer"
                value={translationAnswer}
                onChange={(event) => setTranslationAnswer(event.target.value)}
                className="mt-4 min-h-36 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700 outline-none focus:ring-2 focus:ring-[#003178]/25"
                placeholder="Translate the paragraph here..."
              />
            </section>

            <div className="sticky bottom-4 z-20 rounded-[2rem] border border-[#cfe6f2] bg-white/95 p-4 shadow-xl backdrop-blur">
              <button
                type="button"
                data-testid="mock-exam-submit"
                onClick={submitMockExam}
                disabled={!canSubmit}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#003178] px-5 text-sm font-black text-white hover:bg-[#0d47a1] disabled:bg-slate-300"
              >
                <ClipboardCheck className="h-4 w-4" />
                提交阶段模考并生成评分
              </button>
              {!canSubmit && (
                <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
                  需要完成全部客观题，并填写写作和翻译，才能提交。
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionList({
  questions,
  choices,
  onSelect,
}: {
  questions: typeof CET4_MOCK_EXAM.listening.questions;
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
