import React, { useState } from 'react';
import { 
  Flag, Clock, BookOpen, Sparkles, ChevronRight,
  Headphones, Mic, BarChart2,
  BookMarked, Edit2, History, Sliders, Volume2
} from 'lucide-react';
import { Attempt, DailyPlan, PracticeSession, ReviewItem, SkillProfile } from '../types';
import { buildMotivationSnapshot, buildTodayCoachInsight } from '../domain/productCoach';
import type { ReviewGateStatus } from '../domain/review/reviewGate';
import LaunchReadinessNotice from './LaunchReadinessNotice';

interface TodayDashboardProps {
  onStartReading: () => void;
  onStartListening: () => void;
  onStartWriting: () => void;
  onStartTranslation: () => void;
  onStartVocabulary: () => void;
  onStartGrammar: () => void;
  onStartCloze: () => void;
  onStartMockExam: () => void;
  onStartOnboarding: () => void;
  onViewReview: () => void;
  onViewHistory: () => void;
  onStartSpeaking: () => void;
  onOpenSettings?: () => void;
  onTriggerModal?: (title: string, body: string) => void;
  readingProgress: { completed: boolean; score?: number };
  examCountdown?: number;
  targetScore?: number;
  targetExamName?: string;
  estimatedScore?: number;
  abilityEvidenceCount?: number;
  dailyPlan?: DailyPlan | null;
  reviewItemCount?: number;
  answeredQuestionCount?: number;
  reviewGateStatus?: ReviewGateStatus;
  skillProfiles?: SkillProfile[];
  persistedAttempts?: Attempt[];
  persistedPracticeSessions?: PracticeSession[];
  persistedReviewItems?: ReviewItem[];
  strategy: 'efficient' | 'review';
  onStrategyChange: (strategy: 'efficient' | 'review') => void;
}

export default function TodayDashboard({ 
  onStartReading, 
  onStartListening, 
  onStartWriting,
  onStartTranslation,
  onStartVocabulary,
  onStartGrammar,
  onStartCloze,
  onStartMockExam,
  onStartOnboarding, 
  onViewReview, 
  onViewHistory,
  onStartSpeaking,
  onOpenSettings,
  onTriggerModal,
  readingProgress,
  examCountdown = 0,
  targetScore = 550,
  targetExamName = '大学英语四级',
  estimatedScore,
  abilityEvidenceCount = 0,
  dailyPlan,
  reviewItemCount = 0,
  answeredQuestionCount = 0,
  reviewGateStatus,
  skillProfiles = [],
  persistedAttempts = [],
  persistedPracticeSessions = [],
  persistedReviewItems = [],
  strategy,
  onStrategyChange,
}: TodayDashboardProps) {
  
  const [showTimeEditToast, setShowTimeEditToast] = useState(false);
  const topTask = dailyPlan?.tasks[0];
  const primaryPracticeTask = dailyPlan?.tasks.find((task) => task.type === 'practice');
  const plannedMinutes = dailyPlan?.plannedMinutes ?? 45;
  const displayedTask = topTask ?? primaryPracticeTask;
  const primarySkillLabel = displayedTask?.type === 'diagnostic'
    ? '入门诊断'
    : displayedTask?.type === 'review'
    ? '错因复习'
    : displayedTask?.type === 'mock'
    ? '阶段模考'
    : displayedTask?.skillArea === 'listening'
    ? '听力理解'
    : displayedTask?.skillArea === 'writing'
    ? '写作输出'
    : displayedTask?.skillArea === 'translation'
    ? '段落翻译'
    : displayedTask?.skillArea === 'vocabulary'
    ? '词汇语块'
    : displayedTask?.skillArea === 'grammar'
    ? '语法完形'
    : displayedTask?.skillArea === 'speaking'
    ? '口语表达'
    : '阅读理解';
  const primaryTaskSummary = displayedTask?.type === 'diagnostic'
    ? '建立画像'
    : displayedTask?.type === 'review'
    ? '重做到期错题'
    : displayedTask?.type === 'mock'
    ? '完整模考'
    : displayedTask?.skillArea === 'listening'
    ? '长对话精听'
    : displayedTask?.skillArea === 'writing'
    ? '短文写作'
    : displayedTask?.skillArea === 'translation'
    ? '段落翻译'
    : displayedTask?.skillArea === 'vocabulary'
    ? '词汇听音'
    : displayedTask?.skillArea === 'grammar'
    ? '语法完形'
    : displayedTask?.skillArea === 'speaking'
    ? '口语重说'
    : '仔细阅读';
  const primaryActionLabel = displayedTask?.type === 'diagnostic'
    ? '开始诊断'
    : displayedTask?.type === 'review'
    ? '错题重做'
    : displayedTask?.type === 'mock'
    ? '开始模考'
    : '开始训练';
  const scoreProgress = estimatedScore
    ? Math.max(8, Math.min(100, Math.round((estimatedScore / Math.max(425, targetScore)) * 100)))
    : 8;
  const hasAbilityEvidence = skillProfiles.length > 0 || abilityEvidenceCount > 0;
  const coachInsight = buildTodayCoachInsight({
    dailyPlan,
    skillProfiles,
    reviewItemCount,
    answeredQuestionCount,
    abilityEvidenceCount,
    estimatedScore,
    targetScore,
  });
  const motivation = buildMotivationSnapshot({
    sessions: persistedPracticeSessions,
    attempts: persistedAttempts,
    reviewItems: persistedReviewItems,
  });
  const quickActionLabel = displayedTask?.type === 'diagnostic'
    ? '下一步推荐'
    : displayedTask?.type === 'review'
    ? '到期错题'
    : displayedTask?.type === 'mock'
    ? '阶段模考'
    : hasAbilityEvidence || readingProgress.completed
    ? '继续训练'
    : '下一步推荐';
  const latestProfile = (predicate: (profile: SkillProfile) => boolean) => {
    const profile = skillProfiles
      .filter(predicate)
      .sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt))[0];
    return profile;
  };
  const latestSkillScore = (skillArea: SkillProfile['skillArea']) => {
    const profile = latestProfile((item) => item.skillArea === skillArea);
    return profile?.score;
  };
  const latestSubSkillScore = (keyword: string) => {
    const normalizedKeyword = keyword.toLowerCase();
    const profile = latestProfile((item) => item.subSkillId.toLowerCase().includes(normalizedKeyword));
    return profile?.score;
  };
  const describeScore = (score: number) => {
    if (score < 60) return { label: '需关注', className: 'text-red-600', bar: 'bg-rose-600' };
    if (score < 75) return { label: '薄弱', className: 'text-rose-500', bar: 'bg-orange-500' };
    if (score < 88) return { label: '稳定', className: 'text-[#1b6d24]', bar: 'bg-slate-600' };
    return { label: '优势', className: 'text-emerald-700', bar: 'bg-emerald-600' };
  };
  const skillDiagnosticRows = [
    { key: 'reading', label: '阅读: 细节定位', score: latestSkillScore('reading') },
    { key: 'listening', label: '听力: 长对话推断', score: latestSkillScore('listening') },
    { key: 'cloze', label: '完形: 语境填空', score: latestSubSkillScore('cloze') },
    { key: 'grammar', label: '语法: 结构搭配', score: latestSkillScore('grammar') },
    { key: 'translation', label: '翻译: 复杂句型结构', score: latestSkillScore('translation') },
  ].map((item) => ({
    ...item,
    visual: typeof item.score === 'number' ? describeScore(item.score) : null,
  }));

  const startTask = (task = displayedTask) => {
    if (!task || task.type === 'diagnostic') {
      onStartOnboarding();
      return;
    }
    if (task.type === 'review') {
      onViewReview();
      return;
    }
    if (task.type === 'mock') {
      onStartMockExam();
      return;
    }
    const mode = String(task.payload?.mode ?? '');
    if (mode.includes('cloze')) {
      onStartCloze();
      return;
    }
    if (mode.includes('grammar')) {
      onStartGrammar();
      return;
    }
    if (task.type === 'speaking' || task.skillArea === 'speaking') {
      onStartSpeaking();
      return;
    }
    if (task.skillArea === 'listening') {
      onStartListening();
      return;
    }
    if (task.skillArea === 'writing') {
      onStartWriting();
      return;
    }
    if (task.skillArea === 'translation') {
      onStartTranslation();
      return;
    }
    if (task.skillArea === 'vocabulary') {
      onStartVocabulary();
      return;
    }
    if (task.skillArea === 'grammar') {
      onStartGrammar();
      return;
    }
    onStartReading();
  };

  const startPrimaryTask = () => startTask(displayedTask);

  const taskRows = dailyPlan?.tasks.length ? dailyPlan.tasks : [
    {
      id: 'fallback-diagnostic',
      type: 'diagnostic' as const,
      title: '入门诊断：建立初始能力画像',
      skillArea: 'reading' as const,
      estimatedMinutes: 12,
      priority: 'high' as const,
      reason: '完成诊断后，系统会基于真实弱项安排训练。',
      payload: {},
    },
  ];

  const getTaskVisual = (task: DailyPlan['tasks'][number]) => {
    if (task.type === 'mock') return { Icon: BarChart2, border: 'border-l-[#003178]', bg: 'bg-[#eef7fc]', icon: 'text-[#003178]' };
    if (task.type === 'review') return { Icon: BookMarked, border: 'border-l-[#003178]', bg: 'bg-[#f8fafc]', icon: 'text-[#003178]' };
    const mode = String(task.payload?.mode ?? '');
    if (task.type === 'diagnostic') return { Icon: Sparkles, border: 'border-l-[#003178]', bg: 'bg-[#eef7fc]', icon: 'text-[#003178]' };
    if (mode.includes('cloze') || mode.includes('grammar')) return { Icon: Sliders, border: 'border-l-[#003178]', bg: 'bg-[#f8fafc]', icon: 'text-[#003178]' };
    if (task.skillArea === 'listening') return { Icon: Headphones, border: 'border-l-[#003178]', bg: 'bg-[#f8fafc]', icon: 'text-[#003178]' };
    if (task.skillArea === 'vocabulary') return { Icon: Volume2, border: 'border-l-[#003178]', bg: 'bg-[#f8fafc]', icon: 'text-[#003178]' };
    if (task.skillArea === 'grammar') return { Icon: Sliders, border: 'border-l-[#003178]', bg: 'bg-[#f8fafc]', icon: 'text-[#003178]' };
    if (task.skillArea === 'speaking') return { Icon: Mic, border: 'border-l-[#003178]', bg: 'bg-[#eef7fc]', icon: 'text-[#003178]' };
    if (task.skillArea === 'writing' || task.skillArea === 'translation') return { Icon: Edit2, border: 'border-l-[#003178]', bg: 'bg-[#f8fafc]', icon: 'text-[#003178]' };
    return { Icon: BookOpen, border: 'border-l-[#003178]', bg: 'bg-[#eef7fc]', icon: 'text-[#003178]' };
  };

  const triggerTimeEdit = () => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
    setShowTimeEditToast(true);
    setTimeout(() => {
      setShowTimeEditToast(false);
    }, 4000);
  };

  return (
    <div className="app-page-surface ui-page relative select-none">
      {showTimeEditToast && (
        <div className="fixed left-4 right-4 top-4 z-50 flex items-center gap-2.5 rounded-2xl border border-[#cfe6f2] bg-[#003178] px-4 py-3 text-xs font-bold text-white shadow-xl sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-5">
          <Sparkles className="h-4 w-4 text-emerald-300" />
          <span>训练时间可在「设置」中调整。</span>
        </div>
      )}

      <div className="ui-page-content flex-1 space-y-5 overflow-y-auto pb-8">
        <header className="ui-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="ui-page-eyebrow mb-3">
                <BookOpen className="h-4 w-4" />
                今日教练
              </div>
              <h2 className="text-2xl font-black tracking-tight text-[#101828] sm:text-3xl">
                今日训练
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                只保留一个最该做的主动作，并说明为什么做、做完会改变什么。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onStartOnboarding}
                className="ui-button ui-button-primary"
              >
                <Sparkles className="h-4 w-4 text-emerald-300" />
                入门能力诊断
              </button>
              <button
                type="button"
                onClick={onViewHistory}
                className="ui-button ui-button-secondary"
              >
                <History className="h-4 w-4" />
                专项已答
              </button>
              <div className="ui-chip">
                <Clock className="h-4 w-4 text-[#003178]" />
                距离考试还有 {examCountdown} 天
              </div>
            </div>
          </div>
        </header>

        {!hasAbilityEvidence && (
          <section data-testid="three-minute-start" className="ui-panel-soft">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="ui-chip ui-chip-accent">3 分钟启动</span>
                <h3 className="mt-3 text-lg font-black text-[#003178]">先选目标、做小诊断、生成今日计划</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  新用户不需要先理解所有模块；完成诊断后，首页会直接给出今天最该做的一项。
                </p>
              </div>
              <button type="button" onClick={onStartOnboarding} className="ui-button ui-button-primary shrink-0">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                立即启动
              </button>
            </div>
          </section>
        )}

        {reviewGateStatus?.locked && (
          <section data-testid="review-gate-banner" className="ui-panel-soft">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <span className="ui-chip ui-chip-accent">建议先复习</span>
                <h3 className="mt-3 text-lg font-black text-[#003178]">
                  今日还有 {reviewGateStatus.remainingRequired} 道高优先级到期错题
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  错题会按到期顺序提醒，但不会阻止你进入语法、专项和模考。
                </p>
              </div>
              <button
                type="button"
                onClick={onViewReview}
                className="ui-button ui-button-primary shrink-0"
              >
                去复习
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {!reviewGateStatus?.locked && reviewGateStatus && reviewGateStatus.dueCount > 0 && (
          <section className="ui-panel-soft text-sm font-semibold leading-6 text-slate-700">
            今日错题剂量已完成；剩余 {reviewGateStatus.dueCount} 道可稍后处理。
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
          <div className="ui-panel border-l-4 border-l-[#003178]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <span className="ui-chip ui-chip-accent">今天先做 · {primarySkillLabel}</span>
                <h3 data-testid="today-primary-task-title" className="mt-4 text-2xl font-black leading-tight text-[#0d47a1] sm:text-3xl">
                  {coachInsight.headline}
                </h3>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  {coachInsight.reason}
                </p>
              </div>
              <span className="ui-chip shrink-0">
                <Clock className="h-4 w-4 text-[#003178]" />
                {displayedTask?.estimatedMinutes ?? 12} 分钟
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-black">
              <span className="ui-chip">{primaryTaskSummary}</span>
              <span className="ui-chip">{targetExamName}</span>
              <span className="ui-chip">证据 {abilityEvidenceCount} 条</span>
              <span className="ui-chip">{strategy === 'efficient' ? '高效模式' : '巩固模式'}</span>
            </div>

            <div data-testid="today-coach-insight" className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ['完成收益', coachInsight.expectedGain],
                ['判断证据', coachInsight.proof],
                ['当前风险', coachInsight.risk],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-[#dde5ee] bg-[#f8fafc] p-3">
                  <div className="text-[11px] font-black text-[#003178]">{title}</div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h4 data-testid="today-quick-task-title" className="text-sm font-black text-slate-500">
                {quickActionLabel}：{displayedTask?.title ?? '入门诊断'}
              </h4>
              <button
                type="button"
                data-testid="today-primary-task-action"
                onClick={startPrimaryTask}
                className="ui-button ui-button-primary ui-button-full sm:w-auto"
              >
                <span>{primaryActionLabel}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <aside className="ui-panel-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500">
                  <Flag className="h-3.5 w-3.5 text-[#003178]" />
                  目标
                </span>
                <div className="mt-2 text-3xl font-black text-[#003178]">{targetScore}</div>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {estimatedScore ? `当前预测 ${estimatedScore} 分` : '等待诊断或练习证据'}
                </p>
              </div>
              <button
                type="button"
                onClick={triggerTimeEdit}
                aria-label="调整今日训练时间"
                className="ui-button ui-button-icon"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-[#003178]" style={{ width: `${scoreProgress}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-black">
              <div className="ui-metric">
                <div className="text-xl text-[#003178]">{plannedMinutes}m</div>
                <div className="text-slate-500">今日时间</div>
              </div>
              <button
                type="button"
                onClick={onViewReview}
                className="ui-metric text-left transition hover:border-[#003178]/30"
              >
                <div className="text-xl text-[#003178]">{reviewItemCount}</div>
                <div className="text-slate-500">待复习</div>
              </button>
              <button
                type="button"
                onClick={onViewHistory}
                className="ui-metric text-left transition hover:border-[#003178]/30"
              >
                <div data-testid="today-answered-question-count" className="text-xl text-[#003178]">{answeredQuestionCount}</div>
                <div className="text-slate-500">已答</div>
              </button>
            </div>
            <div data-testid="motivation-snapshot" className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-3">
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-black">
                <div>
                  <div className="text-lg text-[#003178]">{motivation.streakDays}</div>
                  <div className="text-slate-500">连续天</div>
                </div>
                <div>
                  <div data-testid="motivation-weekly-attempts" className="text-lg text-[#003178]">{motivation.weeklyAttempts}</div>
                  <div className="text-slate-500">本周答</div>
                </div>
                <div>
                  <div className="text-lg text-[#003178]">{motivation.repairedMistakes}</div>
                  <div className="text-slate-500">已修复</div>
                </div>
              </div>
              <p className="mt-2 text-xs font-bold leading-5 text-slate-600">{motivation.message}</p>
            </div>
          </aside>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="ui-panel">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-black text-[#101828]">今日队列</h3>
              <span className="text-xs font-bold text-slate-500">{taskRows.length} 项</span>
            </div>
            <div className="mt-4 space-y-3">
              {taskRows.map((task, index) => {
                const visual = getTaskVisual(task);
                const Icon = visual.Icon;
                return (
                  <article
                    key={task.id}
                    data-testid={`today-task-row-${task.type}-${task.skillArea}-${index}`}
                    onClick={() => startTask(task)}
                    className={`flex cursor-pointer flex-col gap-3 rounded-2xl border border-[#dde5ee] border-l-4 ${visual.border} bg-white p-4 transition hover:border-[#003178]/40 sm:flex-row sm:items-center sm:justify-between`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${visual.bg}`}>
                        <Icon className={`h-5 w-5 ${visual.icon}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-black text-[#003178]">{task.title}</h4>
                        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                          {task.reason} · {task.estimatedMinutes}m
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        startTask(task);
                      }}
                      className="ui-button ui-button-icon shrink-0"
                      aria-label={`执行今日第 ${index + 1} 个任务`}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            <section className="ui-panel">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-black text-[#101828]">能力证据</h3>
                <button
                  type="button"
                  onClick={onStartOnboarding}
                  className="ui-button ui-button-secondary ui-button-compact"
                >
                  复测
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {skillDiagnosticRows.map((row) => (
                  <div key={row.key} data-testid={`today-skill-diagnostic-${row.key}`} className="space-y-1.5">
                    <div className="flex justify-between gap-3 text-xs font-bold">
                      <span className="text-slate-600">{row.label}</span>
                      <span className={row.visual ? row.visual.className : 'text-slate-400'}>
                        {row.visual && typeof row.score === 'number' ? `${row.visual.label} ${row.score}%` : '待诊断'}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${row.visual ? row.visual.bar : 'bg-slate-300'}`}
                        style={{ width: `${row.visual && typeof row.score === 'number' ? Math.max(8, row.score) : 12}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="ui-panel">
              <div className="flex items-center gap-2 text-xs font-black text-[#003178]">
                <Sliders className="h-4 w-4" />
                训练策略
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {[
                  ['efficient', '高效模式', '限时训练，优先推进弱项'],
                  ['review', '巩固模式', '放慢节奏，优先消化错因'],
                ].map(([value, label, detail]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onStrategyChange(value as 'efficient' | 'review')}
                    className={`rounded-2xl border p-3 text-left transition ${
                      strategy === value
                        ? 'border-[#cfe6f2] bg-[#eef7fc] text-[#003178]'
                        : 'border-[#dde5ee] bg-white text-slate-600 hover:border-[#003178]/30'
                    }`}
                  >
                    <div className="text-xs font-black">{label}</div>
                    <div className="mt-1 text-[11px] font-semibold">{detail}</div>
                  </button>
                ))}
              </div>
            </section>

            <button
              type="button"
              onClick={onViewReview}
              aria-label="查看待复习事项"
              className="ui-panel-soft flex w-full cursor-pointer items-center justify-between gap-4 text-left transition hover:border-[#003178]/30"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
                  <BookMarked className="h-5 w-5 text-[#003178]" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white">
                    {reviewItemCount}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#003178]">复习队列</h4>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {reviewItemCount > 0 ? '建议今天处理' : '练习后生成真实错因'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </section>

        {onTriggerModal && (
          <div className="pt-1">
            <LaunchReadinessNotice onOpen={onTriggerModal} />
          </div>
        )}
      </div>
    </div>
  );
}
