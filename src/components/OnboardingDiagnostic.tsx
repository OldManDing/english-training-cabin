import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  FilePenLine,
  GraduationCap,
  ListChecks,
  Mic,
  Play,
  Target,
  Volume2,
  X,
} from 'lucide-react';
import { StudyGoal } from '../types';
import {
  buildOnboardingDiagnosticReport,
  DiagnosticAnswerMap,
  OnboardingDiagnosticReport,
  ONBOARDING_DIAGNOSTIC_ITEMS,
} from '../domain/diagnostic/onboardingDiagnostic';

interface OnboardingDiagnosticProps {
  onDismiss: () => void;
  onSetScoreLimit?: (score: number) => void;
  onCompleteDiagnostic?: (result: {
    targetScore: number;
    examDate: string;
    dailyMinutes: number;
    prioritySkills: StudyGoal['prioritySkills'];
    skillProfiles: OnboardingDiagnosticReport['skillProfiles'];
    diagnosticReport: OnboardingDiagnosticReport;
  }) => Promise<void> | void;
}

const skillLabels: Record<string, string> = {
  reading: '阅读',
  listening: '听力',
  translation: '翻译',
  writing: '写作',
  speaking: '口语',
};

const skillIcons: Record<string, React.ReactNode> = {
  reading: <BookOpenCheck className="h-4 w-4" />,
  listening: <ListChecks className="h-4 w-4" />,
  translation: <FilePenLine className="h-4 w-4" />,
  writing: <FilePenLine className="h-4 w-4" />,
  speaking: <Mic className="h-4 w-4" />,
};

function getDaysRemaining(date: string): number {
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

function getAnswerPreview(value: string | undefined): string {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '未作答';
  return normalized.length > 42 ? `${normalized.slice(0, 42)}...` : normalized;
}

export default function OnboardingDiagnostic({
  onDismiss,
  onSetScoreLimit,
  onCompleteDiagnostic,
}: OnboardingDiagnosticProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [targetScore, setTargetScore] = useState<number>(550);
  const [countdownDate, setCountdownDate] = useState<string>('2026-06-13');
  const [dailyMinutes, setDailyMinutes] = useState<number>(45);
  const [answers, setAnswers] = useState<DiagnosticAnswerMap>({});
  const [startedAt, setStartedAt] = useState<string>(() => new Date().toISOString());
  const [report, setReport] = useState<OnboardingDiagnosticReport | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [speakingItemId, setSpeakingItemId] = useState<string | null>(null);

  const answeredCount = ONBOARDING_DIAGNOSTIC_ITEMS.filter((item) => (answers[item.id] ?? '').trim().length > 0).length;
  const canSubmitDiagnostic = answeredCount === ONBOARDING_DIAGNOSTIC_ITEMS.length && !isSaving;
  const daysRemaining = getDaysRemaining(countdownDate);
  const diagnosticMinutes = Math.max(8, Math.round(dailyMinutes * 0.25));
  const practiceMinutes = Math.max(12, Math.round(dailyMinutes * 0.45));
  const reviewMinutes = Math.max(6, dailyMinutes - diagnosticMinutes - practiceMinutes);
  const setAnswer = (itemId: string, value: string) => {
    setAnswers((current) => ({ ...current, [itemId]: value }));
    setSaveError(null);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakDiagnosticContext = (itemId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      setSaveError('当前浏览器不支持语音播报，请先查看听力转写完成诊断。');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.86;
    utterance.onend = () => setSpeakingItemId(null);
    utterance.onerror = () => setSpeakingItemId(null);
    setSpeakingItemId(itemId);
    window.speechSynthesis.speak(utterance);
  };

  const goBack = () => {
    setSaveError(null);
    window.speechSynthesis?.cancel();
    setSpeakingItemId(null);
    if (step === 1) {
      onDismiss();
      return;
    }
    setStep((current) => (current - 1) as 1 | 2 | 3 | 4);
  };

  const beginQuestions = () => {
    setStartedAt(new Date().toISOString());
    setStep(3);
  };

  const submitDiagnostic = async () => {
    if (!canSubmitDiagnostic) return;
    const diagnosticReport = buildOnboardingDiagnosticReport({
      answers,
      targetScore,
      dailyMinutes,
      startedAt,
    });
    setReport(diagnosticReport);
    setIsSaving(true);
    setSaveError(null);

    try {
      if (onCompleteDiagnostic) {
        await onCompleteDiagnostic({
          targetScore,
          examDate: countdownDate,
          dailyMinutes,
          prioritySkills: diagnosticReport.weakestSkills as StudyGoal['prioritySkills'],
          skillProfiles: diagnosticReport.skillProfiles,
          diagnosticReport,
        });
      } else if (onSetScoreLimit) {
        onSetScoreLimit(targetScore);
      }
      setStep(4);
    } catch (error) {
      console.error('Failed to save diagnostic result:', error);
      setSaveError('诊断已经完成，但保存到本地能力画像失败。请重试一次。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="app-page-surface flex-1 min-h-[100svh] overflow-y-auto overflow-x-hidden bg-[#f7fbff] p-4 sm:p-6 lg:h-screen lg:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-3xl border border-sky-100 bg-white/85 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#003178] shadow-xs transition hover:border-[#003178]"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 1 ? '返回今日训练' : '上一步'}
          </button>
          <div className="flex items-center justify-center gap-2 text-xs font-black text-slate-500">
            {[1, 2, 3, 4].map((item) => (
              <span
                key={item}
                className={`h-2.5 rounded-full transition-all ${step >= item ? 'w-8 bg-[#003178]' : 'w-2.5 bg-slate-200'}`}
                aria-label={`第 ${item} 步`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-500 shadow-xs transition hover:border-rose-200 hover:text-rose-600"
          >
            <X className="h-4 w-4" />
            退出诊断
          </button>
        </div>

        {step === 1 && (
          <section className="grid min-h-[calc(100svh-160px)] items-center gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-lg sm:p-8">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#003178]/10 px-3 py-1 text-xs font-black text-[#003178]">
                <GraduationCap className="h-4 w-4" />
                入门诊断
              </div>
              <h1 className="text-3xl font-black leading-tight text-[#071e27] sm:text-5xl">
                入门诊断：先做题，再生成今日训练路线。
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
                这一步不再用自评冒充诊断。系统会让你完成阅读、听力转写、翻译、写作、口语表达初筛 5 个小任务，
                根据答案规则评分，并把 session、attempt、review item 和 skill profile 写入本地学习证据。
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ['5 项', '真实任务'],
                  ['规则评分', '可解释弱项'],
                  ['自动写入', '今日计划依据'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-2xl font-black text-[#003178]">{value}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1b6d24] px-6 text-sm font-black text-white shadow-md transition hover:bg-emerald-700 sm:w-auto"
              >
                <Play className="h-4 w-4 fill-white" />
                开始诊断
              </button>
            </div>

            <div className="rounded-[2rem] border border-[#cfe6f2] bg-[#f0f9ff]/80 p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-black text-[#003178]">验收口径</h2>
              <div className="space-y-3">
                {[
                  '必须有可作答题目，不能只点“生成”。',
                  '必须按答案产生不同分数和弱项排序。',
                  '必须能返回上一步修改目标或答案。',
                  '必须留下 attempts 与复习项，今日任务才有真实依据。',
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-700">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-md sm:p-8">
              <h2 className="flex items-center gap-2 text-2xl font-black text-[#003178]">
                <Target className="h-6 w-6" />
                学习目标设置
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                目标只决定训练强度和计划节奏；能力画像必须由下一步真实题目评分生成。
              </p>

              <div className="mt-7 space-y-7">
                <div>
                  <label className="mb-3 block text-sm font-black text-slate-700">目标分数</label>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <input
                      type="range"
                      min="425"
                      max="710"
                      step="5"
                      value={targetScore}
                      onChange={(event) => setTargetScore(Number(event.target.value))}
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[#dbf1fe] accent-[#003178]"
                    />
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3 text-3xl font-black text-[#003178]">
                      {targetScore}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-xs font-bold text-slate-400">
                    <span>425 过线</span>
                    <span>550 稳妥</span>
                    <span>710 满分</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                      <Calendar className="h-4 w-4" />
                      考试日期
                    </label>
                    <input
                      type="date"
                      value={countdownDate}
                      onChange={(event) => setCountdownDate(event.target.value)}
                      className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-[#003178]"
                    />
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-[#dbf1fe] p-4">
                    <div className="text-xs font-black text-[#003178]">距离目标</div>
                    <div className="mt-1 text-3xl font-black text-[#003178]">{daysRemaining} 天</div>
                  </div>
                </div>

                <div>
                  <label className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                    <Clock className="h-4 w-4" />
                    每日可投入时间
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[30, 45, 60, 90].map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setDailyMinutes(minutes)}
                        className={`min-h-12 rounded-2xl border px-3 text-sm font-black transition ${
                          dailyMinutes === minutes
                            ? 'border-[#003178] bg-[#003178] text-white shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#003178] hover:text-[#003178]'
                        }`}
                      >
                        {minutes} 分钟
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-[#071e27]">今日预算预览</h3>
              <div className="mt-5 space-y-3">
                {[
                  ['入门诊断', diagnosticMinutes, 'bg-blue-600'],
                  ['弱项专项', practiceMinutes, 'bg-emerald-600'],
                  ['错因复习', reviewMinutes, 'bg-amber-500'],
                ].map(([label, minutes, color]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-600">
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                      {label}
                    </span>
                    <span className="text-[#003178]">{minutes} 分钟</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={beginQuestions}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#003178] px-5 text-sm font-black text-white shadow-md transition hover:bg-[#0d47a1]"
              >
                进入真实诊断
                <ChevronRight className="h-4 w-4" />
              </button>
            </aside>
          </section>
        )}

        {step === 3 && (
          <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-[#003178]">真实小题诊断</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      请先完成作答。提交后会按答案生成分数、弱项和复习项。
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#003178]/10 px-4 py-2 text-sm font-black text-[#003178]">
                    {answeredCount}/{ONBOARDING_DIAGNOSTIC_ITEMS.length} 已完成
                  </div>
                </div>
              </div>

              {ONBOARDING_DIAGNOSTIC_ITEMS.map((item, index) => (
                <article key={item.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {skillIcons[item.skillArea]}
                        {index + 1}. {skillLabels[item.skillArea]} · {item.title}
                      </div>
                      <h3 className="text-lg font-black text-[#071e27]">{item.contextLabel}</h3>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-[#003178]">
                      {item.kind === 'single-choice' ? '客观题' : '产出题'}
                    </span>
                  </div>

                  {item.skillArea === 'listening' ? (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-black text-[#003178]">听力材料</div>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
                            请先播放材料并作答；听不清时再展开转写。这里使用浏览器语音合成播报原创诊断材料。
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakDiagnosticContext(item.id, item.context)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#003178] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0d47a1]"
                        >
                          <Volume2 className="h-4 w-4" />
                          {speakingItemId === item.id ? '正在播放...' : '播放听力材料'}
                        </button>
                      </div>
                      <details className="mt-3 rounded-2xl border border-sky-100 bg-white p-3 text-sm font-semibold leading-7 text-slate-600">
                        <summary className="cursor-pointer text-xs font-black text-[#003178]">听不清时查看听力转写</summary>
                        <p className="mt-2">{item.context}</p>
                      </details>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                      {item.context}
                    </div>
                  )}
                  <p className="mt-4 text-sm font-black text-[#071e27]">{item.prompt}</p>

                  {item.kind === 'single-choice' ? (
                    <div className="mt-4 grid gap-2">
                      {item.options.map((option) => {
                        const selected = answers[item.id] === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setAnswer(item.id, option.id)}
                            className={`min-h-12 rounded-2xl border px-4 text-left text-sm font-bold transition ${
                              selected
                                ? 'border-[#003178] bg-[#003178] text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-[#003178] hover:text-[#003178]'
                            }`}
                          >
                            {option.id}. {option.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      aria-label={`${item.title}作答`}
                      value={answers[item.id] ?? ''}
                      onChange={(event) => setAnswer(item.id, event.target.value)}
                      placeholder={item.placeholder}
                      className="mt-4 min-h-36 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-7 text-slate-700 outline-none transition focus:border-[#003178] focus:ring-2 focus:ring-[#003178]/10"
                    />
                  )}
                </article>
              ))}
            </div>

            <aside className="h-fit rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm lg:sticky lg:top-6">
              <h3 className="text-lg font-black text-[#071e27]">诊断提交前检查</h3>
              <div className="mt-4 space-y-3">
                {ONBOARDING_DIAGNOSTIC_ITEMS.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs font-black text-[#003178]">{skillLabels[item.skillArea]} · {item.title}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{getAnswerPreview(answers[item.id])}</div>
                  </div>
                ))}
              </div>
              {saveError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  {saveError}
                </div>
              ) : null}
              <button
                type="button"
                disabled={!canSubmitDiagnostic}
                onClick={submitDiagnostic}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1b6d24] px-5 text-sm font-black text-white shadow-md transition enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? '正在写入能力画像...' : '提交诊断并生成画像'}
                <CheckCircle className="h-4 w-4" />
              </button>
            </aside>
          </section>
        )}

        {step === 4 && report && (
          <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-lg sm:p-8">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                  <CheckCircle className="h-4 w-4" />
                  诊断完成
                </div>
                <h2 className="text-3xl font-black text-[#003178]">您的能力画像已生成</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  已写入 {report.attempts.length} 条作答证据、{report.skillProfiles.length} 条能力画像、
                  {report.reviewItems.length} 条复习项。今日任务会优先处理最低分弱项。
                </p>
              </div>
              <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-5 text-center">
                <div className="text-xs font-black text-[#003178]">综合诊断分</div>
                <div className="mt-1 text-5xl font-black text-[#003178]">{report.averageScore}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-5">
              {report.details.map((detail) => (
                <div
                  key={detail.itemId}
                  data-testid={`diagnostic-score-${detail.skillArea}`}
                  className={`rounded-[1.5rem] border p-4 ${
                    detail.score >= 70 ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-600">{skillLabels[detail.skillArea]}</span>
                    <span className="text-2xl font-black text-[#003178]">{detail.score}</span>
                  </div>
                  <div className="mt-2 text-sm font-black text-[#071e27]">{detail.title}</div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{detail.feedback}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <h3 className="text-sm font-black text-amber-900">下一步训练重点</h3>
                  <p className="mt-1 text-sm font-bold leading-6 text-amber-800">
                    优先训练 {report.weakestSkills.map((skill) => skillLabels[skill]).join('、')}。
                    复习队列会先安排低分题的主动回忆、挖空补全和输出复述。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-[#003178] transition hover:border-[#003178]"
              >
                <ArrowLeft className="h-4 w-4" />
                返回修改答案
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1b6d24] px-8 text-sm font-black text-white shadow-md transition hover:bg-emerald-700"
              >
                开启今日训练
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
