import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, Languages, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Attempt, PracticeCompletionReport } from '../types';
import { buildSubjectivePracticeReport, SubjectivePracticeAnalysis } from '../domain/practice/reports';
import { readAttemptTextAnswer } from '../domain/practice/attemptReplay';
import {
  SubjectivePracticeDraft,
  clampDraftIndex,
  clearPracticeDraft,
  loadPracticeDraft,
  practiceDraftKeys,
  savePracticeDraft,
} from '../domain/practice/draftProgress';
import { trackTelemetry } from '../lib/telemetry';
import { apiRequest } from '../lib/api';
import { CET4_TRANSLATION_PROMPT_BANK, CET4_WRITING_PROMPT_BANK } from '../questionBank';

type SubjectiveMode = 'writing' | 'translation';

interface SubjectiveTrainingProps {
  mode: SubjectiveMode;
  initialPromptId?: string;
  replayAttempt?: Attempt;
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

const WRITING_PROMPT_CN: Record<string, string> = {
  'writing-consistent-practice': '围绕“英语学习中持续练习的价值”写短文，需要有明确观点、理由和例子。',
  'writing-campus-volunteering': '围绕“大学生是否应该参加校园志愿活动”写短文，需要表明观点并至少给出一个例子。',
  'writing-digital-tools': '围绕“学生如何理性使用数字工具”写短文，需要同时讨论好处和可能风险。',
  'writing-sustainable-campus': '围绕“学生如何建设可持续校园”写短文，需要写出具体行动及其影响。',
  'writing-time-management': '围绕“大学生时间管理的重要性”写短文，需要说明问题并提出一种方法。',
  'writing-public-services': '围绕“技术如何改善公共服务”写短文，需要提到一个好处和一个担忧。',
  'writing-reading-habits': '围绕“大学生如何养成良好阅读习惯”写短文，需要给出实用建议。',
  'writing-food-waste': '围绕“减少校园食物浪费”写短文，需要说明意义和学生可采取的行动。',
  'writing-mental-health': '围绕“大学生为什么应该关注心理健康”写短文，需要包含一个例子。',
  'writing-public-transport': '围绕“公共交通在城市生活中的价值”写短文，需要讨论好处和一个可能问题。',
  'writing-cultural-heritage': '围绕“保护文化遗产”写短文，需要说明重要性以及年轻人如何参与。',
  'writing-teamwork': '围绕“团队合作在大学学习中的重要性”写短文，需要表明观点并给出理由。',
  'writing-online-privacy': '围绕“学生如何保护在线隐私”写短文，需要包含至少两种实用方法。',
  'writing-rural-tourism': '围绕“乡村旅游”写短文，需要讨论它如何惠及当地社区以及应保护什么。',
  'writing-independent-learning': '围绕“自主学习”写短文，需要说明学生独立学习需要哪些条件。',
  'writing-community-service': '围绕“社区服务”写短文，需要说明学生能从中学到什么。',
  'writing-exam-preparation': '围绕“有效备考”写短文，需要讨论准确率、速度和复盘。',
  'writing-ai-feedback': '围绕“学习中的 AI 反馈”写短文，需要讨论如何正确使用。',
};

const findSubjectivePromptIndex = (
  promptBank: typeof CET4_WRITING_PROMPT_BANK | typeof CET4_TRANSLATION_PROMPT_BANK,
  promptId?: string,
) => {
  if (!promptId) return 0;
  const targetIndex = promptBank.findIndex((item) => item.id === promptId);
  return targetIndex >= 0 ? targetIndex : 0;
};

const loadSubjectiveDraftState = (
  mode: SubjectiveMode,
  promptBank: typeof CET4_WRITING_PROMPT_BANK | typeof CET4_TRANSLATION_PROMPT_BANK,
  initialPromptId?: string,
  replayAttempt?: Attempt,
) => {
  const targetIndex = findSubjectivePromptIndex(promptBank, initialPromptId);
  const replayPrompt = promptBank[targetIndex];
  if (initialPromptId && replayAttempt && replayPrompt) {
    return {
      restored: false,
      replayed: true,
      startedAt: new Date().toISOString(),
      taskIndex: targetIndex,
      answer: readAttemptTextAnswer(replayAttempt),
      analysis: replayAttempt.aiFeedback ? {
        score: replayAttempt.aiFeedback.score ?? (replayAttempt.isCorrect ? 80 : 60),
        mistakeReasons: replayAttempt.aiFeedback.mistakeReasons,
        comments: replayAttempt.aiFeedback.comments,
        nextActions: replayAttempt.aiFeedback.nextActions,
        sampleAnswer: replayPrompt.sampleAnswer,
        confidence: replayAttempt.aiFeedback.confidence,
      } satisfies SubjectivePracticeAnalysis : null,
    };
  }

  const fallback = {
    restored: false,
    replayed: false,
    startedAt: new Date().toISOString(),
    taskIndex: targetIndex,
    answer: '',
    analysis: null,
  };
  const draft = loadPracticeDraft<SubjectivePracticeDraft>(practiceDraftKeys.subjective(mode));
  if (!draft || draft.version !== 1 || draft.mode !== mode) return fallback;

  const draftTaskIndex = clampDraftIndex(draft.taskIndex, promptBank.length);
  if (initialPromptId && draftTaskIndex !== targetIndex) return fallback;

  return {
    restored: !initialPromptId,
    replayed: false,
    startedAt: draft.startedAt ?? fallback.startedAt,
    taskIndex: initialPromptId ? targetIndex : draftTaskIndex,
    answer: typeof draft.answer === 'string' ? draft.answer : '',
    analysis: null,
  };
};

export default function SubjectiveTraining({ mode, initialPromptId, replayAttempt, onBack, onComplete }: SubjectiveTrainingProps) {
  const task = TASKS[mode];
  const promptBank = mode === 'writing' ? CET4_WRITING_PROMPT_BANK : CET4_TRANSLATION_PROMPT_BANK;
  const [initialDraft] = useState(() => loadSubjectiveDraftState(mode, promptBank, initialPromptId, replayAttempt));
  const isFirstModeSync = useRef(true);
  const draftKey = practiceDraftKeys.subjective(mode);
  const [taskIndex, setTaskIndex] = useState(initialDraft.taskIndex);
  const [startedAt, setStartedAt] = useState(() => initialDraft.startedAt);
  const [answer, setAnswer] = useState(initialDraft.answer);
  const [analysis, setAnalysis] = useState<SubjectivePracticeAnalysis | null>(initialDraft.analysis);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const promptItem = promptBank[taskIndex % promptBank.length];
  const writingChinesePrompt = mode === 'writing'
    ? WRITING_PROMPT_CN[promptItem.id] ?? `围绕“${promptItem.title}”写短文；重点覆盖：${promptItem.syllabusFocus.join('、')}。`
    : null;

  useEffect(() => {
    if (isFirstModeSync.current) {
      isFirstModeSync.current = false;
      return;
    }
    const nextDraft = loadSubjectiveDraftState(mode, promptBank, initialPromptId, replayAttempt);
    setTaskIndex(nextDraft.taskIndex);
    setStartedAt(nextDraft.startedAt);
    setAnswer(nextDraft.answer);
    setAnalysis(nextDraft.analysis);
    setErrorMessage(null);
  }, [mode, initialPromptId, replayAttempt]);

  const handleNextPrompt = () => {
    const nextTaskIndex = (taskIndex + 1) % promptBank.length;
    setTaskIndex(nextTaskIndex);
    setAnswer('');
    setAnalysis(null);
    setErrorMessage(null);
    savePracticeDraft<SubjectivePracticeDraft>(draftKey, {
      version: 1,
      mode,
      startedAt,
      taskIndex: nextTaskIndex,
      answer: '',
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAnswerChange = (nextAnswer: string) => {
    setAnswer(nextAnswer);
    setAnalysis(null);
    setErrorMessage(null);
    savePracticeDraft<SubjectivePracticeDraft>(draftKey, {
      version: 1,
      mode,
      startedAt,
      taskIndex,
      answer: nextAnswer,
      updatedAt: new Date().toISOString(),
    });
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
      questionId: promptItem.id,
      questionTypeId: task.questionTypeId,
      modeId: `${mode}-practice`,
      plannedMinutes: task.plannedMinutes,
      startedAt,
      prompt: promptItem.prompt,
      answer,
      analysis,
    });
    clearPracticeDraft(draftKey);
    onComplete(analysis.score, report);
  };

  const Icon = mode === 'translation' ? Languages : FileText;

  return (
    <div className="app-page-surface ui-page overflow-hidden">
      <header className="ui-page-header-compact flex min-h-16 flex-col gap-3 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onBack}
            aria-label="返回专项练习"
            className="ui-button ui-button-secondary ui-button-icon"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-[#003178] flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {task.title}
            </h2>
            <p className="text-[11px] text-slate-400 font-bold">CET-4 {task.label} · AI 反馈 · 错因复习入队</p>
            {initialDraft.replayed ? (
              <span
                data-testid="subjective-attempt-replayed"
                className="mt-1 inline-flex rounded-full bg-[#eef7fc] px-2.5 py-1 text-[11px] font-black text-[#003178]"
              >
                已回显上次作答
              </span>
            ) : initialDraft.restored ? (
              <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
                已恢复上次草稿
              </span>
            ) : null}
          </div>
        </div>
        <span className="rounded-full border border-[#cfe6f2] bg-[#eef7fc] px-3 py-1 text-xs font-black text-[#003178]">
          {task.plannedMinutes} 分钟 · 题库 {taskIndex + 1}/{promptBank.length}
        </span>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <section className="ui-panel flex flex-col gap-5">
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
                  className="ui-button ui-button-secondary ui-button-compact"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  换一道题
                </button>
              </div>
              <p className="whitespace-pre-line text-sm font-semibold leading-relaxed text-slate-700">{promptItem.prompt}</p>
              {writingChinesePrompt ? (
                <p className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
                  中文题意：{writingChinesePrompt}
                </p>
              ) : null}
            </div>
          </div>

          <label className="flex-1 min-h-[320px] flex flex-col gap-2">
            <span className="text-xs font-black text-slate-500">你的作答</span>
            <textarea
              value={answer}
              onChange={(event) => handleAnswerChange(event.target.value)}
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
            className="ui-button ui-button-primary ui-button-full"
          >
            {isEvaluating ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI 正在评阅
              </span>
            ) : '提交并获取 AI 反馈'}
          </button>
        </section>

        <section className="ui-panel flex flex-col gap-5">
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
                className="ui-button ui-button-primary ui-button-full"
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
