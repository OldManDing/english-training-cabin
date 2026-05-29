import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, Languages, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { PracticeCompletionReport } from '../types';
import { buildSubjectivePracticeReport, SubjectivePracticeAnalysis } from '../domain/practice/reports';
import { trackTelemetry } from '../lib/telemetry';
import { apiRequest } from '../lib/api';
import { CET4_TRANSLATION_PROMPT_BANK, CET4_WRITING_PROMPT_BANK } from '../questionBank';

type SubjectiveMode = 'writing' | 'translation';

interface SubjectiveTrainingProps {
  mode: SubjectiveMode;
  onBack: () => void;
  onComplete: (score: number, report: PracticeCompletionReport) => void;
}

const TASKS: Record<SubjectiveMode, {
  title: string;
  label: string;
  plannedMinutes: number;
  questionTypeId: string;
  placeholder: string;
}> = {
  writing: {
    title: '短文写作训练',
    label: 'Writing',
    plannedMinutes: 30,
    questionTypeId: 'short-essay',
    placeholder: 'Write your essay here. Try to include a clear topic sentence, one example, and a conclusion.',
  },
  translation: {
    title: '段落翻译训练',
    label: 'Translation',
    plannedMinutes: 30,
    questionTypeId: 'paragraph-translation',
    placeholder: 'Translate the paragraph here. Focus on English sentence structure rather than word-by-word translation.',
  },
};

export default function SubjectiveTraining({ mode, onBack, onComplete }: SubjectiveTrainingProps) {
  const task = TASKS[mode];
  const promptBank = mode === 'writing' ? CET4_WRITING_PROMPT_BANK : CET4_TRANSLATION_PROMPT_BANK;
  const [taskIndex, setTaskIndex] = useState(0);
  const [startedAt] = useState(() => new Date().toISOString());
  const [answer, setAnswer] = useState('');
  const [analysis, setAnalysis] = useState<SubjectivePracticeAnalysis | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const promptItem = promptBank[taskIndex % promptBank.length];

  useEffect(() => {
    setTaskIndex(0);
    setAnswer('');
    setAnalysis(null);
    setErrorMessage(null);
  }, [mode]);

  const handleNextPrompt = () => {
    setTaskIndex((current) => (current + 1) % promptBank.length);
    setAnswer('');
    setAnalysis(null);
    setErrorMessage(null);
  };

  const handleEvaluate = async () => {
    setErrorMessage(null);
    setIsEvaluating(true);
    const started = performance.now();

    try {
      const result = await apiRequest<SubjectivePracticeAnalysis>('/api/ai/evaluate-subjective', {
        method: 'POST',
        body: JSON.stringify({
          moduleId: mode,
          prompt: promptItem.prompt,
          answer,
        }),
      });
      setAnalysis(result);
      trackTelemetry('subjective_evaluated', {
        mode,
        latencyMs: Math.round(performance.now() - started),
      });
    } catch (error) {
      console.error(error);
      setErrorMessage('AI 反馈暂时不可用，请稍后重试。');
      trackTelemetry('client_error', { area: `${mode}_evaluation` });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleComplete = () => {
    if (!analysis) return;

    const report = buildSubjectivePracticeReport({
      examId: 'cet4',
      moduleId: mode,
      questionTypeId: task.questionTypeId,
      modeId: `${mode}-practice`,
      plannedMinutes: task.plannedMinutes,
      startedAt,
      prompt: promptItem.prompt,
      answer,
      analysis,
    });
    onComplete(analysis.score, report);
  };

  const Icon = mode === 'translation' ? Languages : FileText;

  return (
    <div className="app-page-surface flex-1 min-h-[100svh] lg:h-screen overflow-hidden bg-[#f7fbff] flex flex-col">
      <header className="min-h-16 px-4 sm:px-6 py-3 border-b border-[#cfe6f2] bg-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onBack}
            aria-label="返回专项练习"
            className="p-2 rounded-xl text-[#003178] hover:bg-[#dbf1fe] cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-[#003178] flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {task.title}
            </h2>
            <p className="text-[11px] text-slate-400 font-bold">CET-4 {task.label} · AI 反馈 · 错因复习入队</p>
          </div>
        </div>
        <span className="rounded-full border border-[#cfe6f2] bg-[#eef7fc] px-3 py-1 text-xs font-black text-[#003178]">
          {task.plannedMinutes} 分钟 · 题库 {taskIndex + 1}/{promptBank.length}
        </span>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <section className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col gap-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dbf1fe] px-3 py-1 text-[10px] font-black text-[#003178]">
              <Sparkles className="h-3.5 w-3.5" />
              任务说明
            </span>
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-black text-[#003178]">{promptItem.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {promptItem.syllabusFocus.map((focus) => (
                      <span key={focus} className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-500">
                        {focus}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNextPrompt}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#cfe6f2] bg-white px-3 text-xs font-black text-[#003178] transition hover:bg-[#eef7fc]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  换一道题
                </button>
              </div>
              <p className="whitespace-pre-line text-sm font-semibold leading-relaxed text-slate-700">{promptItem.prompt}</p>
            </div>
          </div>

          <label className="flex-1 min-h-[320px] flex flex-col gap-2">
            <span className="text-xs font-black text-slate-500">你的作答</span>
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder={task.placeholder}
              className="flex-1 min-h-[260px] rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003178]/30"
            />
          </label>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleEvaluate}
            disabled={isEvaluating || answer.trim().length < 20}
            className="w-full rounded-2xl bg-[#003178] px-5 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-[#0d47a1] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isEvaluating ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI 正在评阅
              </span>
            ) : '提交并获取 AI 反馈'}
          </button>
        </section>

        <section className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <h3 className="text-sm font-black text-[#003178]">结构化反馈</h3>
            <span className="text-3xl font-black text-emerald-700">{analysis?.score ?? '--'}</span>
          </div>

          {!analysis ? (
            <div className="flex-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 sm:p-6 text-sm font-bold leading-relaxed text-slate-400">
              提交作答后，这里会显示错因标签、具体修改建议和参考版本。完成训练会自动写入本地复习队列与能力地图。
            </div>
          ) : (
            <div className="flex-1 space-y-5 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {analysis.mistakeReasons.map((reason) => (
                  <span key={reason} className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700 border border-rose-100">
                    {reason}
                  </span>
                ))}
              </div>

              <div className="space-y-3">
                {analysis.comments.map((comment) => (
                  <p key={comment} className="rounded-2xl bg-[#eef7fc] p-3 text-xs font-bold leading-relaxed text-slate-700">
                    {comment}
                  </p>
                ))}
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <h4 className="mb-2 text-xs font-black text-emerald-800">下一步动作</h4>
                <ul className="space-y-2 text-xs font-bold leading-relaxed text-emerald-900">
                  {analysis.nextActions.map((action) => (
                    <li key={action}>· {action}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-2 text-xs font-black text-slate-700">参考改写</h4>
                <p className="whitespace-pre-line text-xs font-semibold leading-relaxed text-slate-700">
                  {analysis.sampleAnswer}
                </p>
              </div>

              <button
                onClick={handleComplete}
                className="w-full rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-emerald-800 inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                完成训练并写入能力画像
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
