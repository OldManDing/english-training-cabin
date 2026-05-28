import React, { useState } from 'react';
import { 
  Flag, Clock, Play, BookOpen, Sparkles, ChevronRight, 
  Headphones, Mic, BarChart2, TrendingUp,
  BookMarked, Edit2, Sliders, Volume2
} from 'lucide-react';
import { DailyPlan, SkillProfile } from '../types';
import type { ReviewGateStatus } from '../domain/review/reviewGate';
import LaunchReadinessNotice from './LaunchReadinessNotice';

interface TodayDashboardProps {
  onStartReading: () => void;
  onStartListening: () => void;
  onStartWriting: () => void;
  onStartTranslation: () => void;
  onStartVocabulary: () => void;
  onStartMockExam: () => void;
  onStartOnboarding: () => void;
  onViewReview: () => void;
  onStartSpeaking: () => void;
  onTriggerModal?: (title: string, body: string) => void;
  readingProgress: { completed: boolean; score?: number };
  examCountdown?: number;
  targetScore?: number;
  estimatedScore?: number;
  abilityEvidenceCount?: number;
  dailyPlan?: DailyPlan | null;
  reviewItemCount?: number;
  reviewGateStatus?: ReviewGateStatus;
  skillProfiles?: SkillProfile[];
  strategy: 'efficient' | 'review';
  onStrategyChange: (strategy: 'efficient' | 'review') => void;
}

export default function TodayDashboard({ 
  onStartReading, 
  onStartListening, 
  onStartWriting,
  onStartTranslation,
  onStartVocabulary,
  onStartMockExam,
  onStartOnboarding, 
  onViewReview, 
  onStartSpeaking,
  onTriggerModal,
  readingProgress,
  examCountdown = 0,
  targetScore = 550,
  estimatedScore,
  abilityEvidenceCount = 0,
  dailyPlan,
  reviewItemCount = 0,
  reviewGateStatus,
  skillProfiles = [],
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
    : displayedTask?.skillArea === 'speaking'
    ? '口语表达'
    : '阅读理解';
  const primaryTaskSummary = displayedTask?.type === 'diagnostic'
    ? '先建立能力画像，再进入个性化练习'
    : displayedTask?.type === 'review'
    ? '先消化到期错因，再进入新题训练'
    : displayedTask?.type === 'mock'
    ? '覆盖写作、听力、阅读、翻译，生成分项分数和复习清单'
    : displayedTask?.skillArea === 'listening'
    ? '包含 3 道长对话精听题'
    : displayedTask?.skillArea === 'writing'
    ? '包含 1 篇短文写作评阅'
    : displayedTask?.skillArea === 'translation'
    ? '包含 1 段中译英评阅'
    : displayedTask?.skillArea === 'vocabulary'
    ? '包含听音、释义辨析和语块例句'
    : displayedTask?.skillArea === 'speaking'
    ? '包含 1 轮重说和反馈对比'
    : '包含原创仔细阅读题组';
  const primaryActionLabel = displayedTask?.type === 'diagnostic'
    ? '开始诊断'
    : displayedTask?.type === 'review'
    ? '开始复习'
    : displayedTask?.type === 'mock'
    ? '开始模考'
    : '开始训练';
  const scoreProgress = estimatedScore
    ? Math.max(8, Math.min(100, Math.round((estimatedScore / Math.max(425, targetScore)) * 100)))
    : 8;
  const hasAbilityEvidence = skillProfiles.length > 0 || abilityEvidenceCount > 0;
  const quickActionLabel = displayedTask?.type === 'diagnostic'
    ? '下一步推荐'
    : displayedTask?.type === 'review'
    ? '到期复习'
    : displayedTask?.type === 'mock'
    ? '阶段模考'
    : hasAbilityEvidence || readingProgress.completed
    ? '继续训练'
    : '下一步推荐';
  const latestSkillScore = (skillArea: SkillProfile['skillArea']) => {
    const profile = skillProfiles
      .filter((item) => item.skillArea === skillArea)
      .sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt))[0];
    return profile?.score;
  };
  const describeScore = (score: number) => {
    if (score < 60) return { label: '需关注', className: 'text-red-600', bar: 'bg-rose-600' };
    if (score < 75) return { label: '薄弱', className: 'text-rose-500', bar: 'bg-orange-500' };
    if (score < 88) return { label: '稳定', className: 'text-[#1b6d24]', bar: 'bg-slate-600' };
    return { label: '优势', className: 'text-emerald-700', bar: 'bg-emerald-600' };
  };
  const skillDiagnosticRows = [
    { label: '阅读: 细节定位', score: latestSkillScore('reading') },
    { label: '听力: 长对话推断', score: latestSkillScore('listening') },
    { label: '翻译: 复杂句型结构', score: latestSkillScore('translation') },
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
    if (task.type === 'diagnostic') return { Icon: Sparkles, border: 'border-l-[#003178]', bg: 'bg-[#eef7fc]', icon: 'text-[#003178]' };
    if (task.type === 'mock') return { Icon: BarChart2, border: 'border-l-amber-500', bg: 'bg-amber-50', icon: 'text-amber-700' };
    if (task.type === 'review') return { Icon: BookMarked, border: 'border-l-rose-500', bg: 'bg-rose-50', icon: 'text-rose-600' };
    if (task.skillArea === 'listening') return { Icon: Headphones, border: 'border-l-emerald-500', bg: 'bg-emerald-50', icon: 'text-emerald-600' };
    if (task.skillArea === 'vocabulary') return { Icon: Volume2, border: 'border-l-emerald-500', bg: 'bg-emerald-50', icon: 'text-emerald-600' };
    if (task.skillArea === 'speaking') return { Icon: Mic, border: 'border-l-[#003178]', bg: 'bg-[#eef7fc]', icon: 'text-[#003178]' };
    if (task.skillArea === 'writing' || task.skillArea === 'translation') return { Icon: Edit2, border: 'border-l-amber-500', bg: 'bg-amber-50', icon: 'text-amber-700' };
    return { Icon: BookOpen, border: 'border-l-[#003178]', bg: 'bg-[#eef7fc]', icon: 'text-[#003178]' };
  };

  const triggerTimeEdit = () => {
    setShowTimeEditToast(true);
    setTimeout(() => {
      setShowTimeEditToast(false);
    }, 4000);
  };

  return (
    <div className="app-page-surface flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden bg-[#f7fbff] min-h-[calc(100svh-9rem)] lg:h-screen flex flex-col justify-between select-none relative">
      
      {/* Toast notifications */}
      {showTimeEditToast && (
        <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-[#003178] text-white px-4 sm:px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-bold border border-[#cfe6f2] animate-bounce">
          <Sparkles className="h-4 w-4 text-emerald-300 fill-emerald-300" />
          <span>⏰ 提示：您日常练习时间额度可通过左下角「设置」中随时调整！</span>
        </div>
      )}

      {/* Main Container Scrollable segment */}
      <div className="space-y-6 flex-1 overflow-y-auto pr-1 pb-8">
        
        {/* Top Header Row matching the exact screenshot header style */}
        <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center pb-4 border-b border-[#cfe6f2]">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#003178] tracking-tight">
              今日训练
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* AI Custom Adaptive Diagnostic Trigger */}
            <button
              onClick={onStartOnboarding}
              className="px-4 py-2 bg-[#003178] text-white hover:bg-[#0d47a1] rounded-full text-xs font-black flex items-center gap-1.5 shadow-md hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer pointer-events-auto border border-[#cfe6f2]"
            >
              <Sparkles className="h-4 w-4 text-emerald-300 fill-emerald-300 animate-pulse" />
              <span>入门能力诊断</span>
            </button>
            {/* Countdown Red Pill element */}
            <div className="px-4 py-2 bg-[#fff1f2] border border-[#ffe4e6] text-[#e11d48] rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs">
              <Clock className="h-4 w-4 animate-pulse text-[#e11d48]" />
              <span>距离考试还有 {examCountdown} 天</span>
            </div>
            {/* Top right circular User avatar */}
            <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
              <span className="text-xs font-bold text-slate-500">学</span>
            </div>
          </div>
        </header>

        {reviewGateStatus?.locked && (
          <section
            data-testid="review-gate-banner"
            className="overflow-hidden rounded-[2rem] border border-rose-100 bg-rose-50 p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-rose-600 px-3 py-1 text-[11px] font-black text-white">
                  先复习再开新题
                </span>
                <h3 className="mt-3 text-lg font-black text-[#003178] sm:text-xl">
                  今日必须先完成 {reviewGateStatus.remainingRequired} 条到期主动回忆
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  到期项会按优先级进入 1/3/7/14/30 天间隔计划。完成今日最低剂量后，专项练习、模考和口语训练自动解锁。
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-black sm:min-w-80">
                <div className="rounded-2xl bg-white/80 p-3">
                  <div className="text-2xl text-rose-700">{reviewGateStatus.dueCount}</div>
                  <div className="text-slate-500">到期复习</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <div className="text-2xl text-emerald-700">{reviewGateStatus.completedToday}</div>
                  <div className="text-slate-500">今日完成</div>
                </div>
                <button
                  type="button"
                  onClick={onViewReview}
                  className="rounded-2xl bg-[#003178] p-3 text-white transition hover:bg-[#0d47a1]"
                >
                  <div className="text-2xl">{reviewGateStatus.remainingRequired}</div>
                  <div>去复习</div>
                </button>
              </div>
            </div>
          </section>
        )}

        {!reviewGateStatus?.locked && reviewGateStatus && reviewGateStatus.dueCount > 0 && (
          <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900 shadow-sm">
            今日最低复习剂量已完成，新训练已解锁；剩余 {reviewGateStatus.dueCount} 条到期项仍建议在今天处理完。
          </section>
        )}

        {/* Row 1: Triple cards top grid layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
          
          {/* Card 1: 目标考试 */}
          <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-xs flex flex-col justify-between relative group hover:shadow-sm transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-[#434652]/80 flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-[#003178]" />
                目标考试
              </span>
              <span className="text-[10px] bg-[#ebf4f9] text-[#003178] border border-[#cfe6f2] px-2 py-0.5 rounded font-black">
                CET-4
              </span>
            </div>
            <div className="pt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-[#003178]">
                {targetScore}
              </span>
              <span className="text-sm font-bold text-[#434652]">分</span>
            </div>
            {/* Single thin visual progress ruler bar */}
            <div className="mt-3.5 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#003178]" style={{ width: `${scoreProgress}%` }} />
            </div>
            <div className="mt-2.5 flex justify-between items-center text-[10px] text-gray-400 font-bold">
              <span>{estimatedScore ? `当前预测：${estimatedScore}分` : '当前预测：等待诊断或练习证据'}</span>
              <span>{readingProgress.completed ? `最近阅读 ${readingProgress.score ?? 0}%` : `证据 ${abilityEvidenceCount} 条`}</span>
            </div>
          </div>

          {/* Card 2: 今日时间约束 */}
          <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-[#434652]/80 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#003178]" />
                今日时间约束
              </span>
              <button 
                onClick={triggerTimeEdit}
                className="text-gray-400 hover:text-[#003178] p-1 rounded-lg hover:bg-slate-50 transition-colors pointer-events-auto cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="pt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-[#003178]">{plannedMinutes}</span>
              <span className="text-lg font-bold text-[#003178]">m</span>
              <span className="text-xs font-bold text-[#434652]/70 ml-1">/ 建议 60m</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100/70">
              <span className={`text-[10px] border px-2 py-1 rounded-lg font-bold ${
                strategy === 'efficient'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {strategy === 'efficient' ? '高效模式' : '巩固模式'}
              </span>
            </div>
          </div>

          {/* Card 3: 继续上次训练 with left blue vertical highlight border */}
          <div className="bg-white border border-[#c3c6d4]/60 border-l-[5px] border-l-[#003178] rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-[#0d47a1] flex items-center gap-1.5">
                <Play className="h-3 w-3 fill-current text-[#003178]" />
                {quickActionLabel}
              </span>
            </div>
            <div className="pt-3">
              <h4 className="font-extrabold text-sm text-[#003178] truncate">
                {displayedTask?.title ?? '入门诊断'}
              </h4>
             <p className="text-[10.5px] text-gray-400 font-semibold mt-0.5">
               预计约 {displayedTask?.estimatedMinutes ?? 12} 分钟
             </p>
            </div>
            <div className="mt-2 text-right">
              <button 
                onClick={startPrimaryTask}
                className="px-4 py-1.5 bg-[#003178] hover:bg-[#0d47a1] text-white text-[10.5px] font-bold rounded-xl inline-flex items-center gap-1 hover:scale-[1.02] transition-transform pointer-events-auto cursor-pointer shadow-xs"
              >
                <span>进入</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

        </div>

        {/* Row 2: Split content grids */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          
          {/* LEFT 2 COLUMNS: Main prioritized training module and checklist queue */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Primary AI recommended task box */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-6.5 shadow-xs relative overflow-hidden group hover:border-[#003178] transition-colors">
              {/* Top background aesthetic circle */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#f0f9ff] rounded-full group-hover:scale-105 transition-transform" />
              
              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black text-white bg-rose-600 px-3 py-1 rounded-lg uppercase tracking-wider shadow-2xs">
                    最高优先级
                  </span>
                  <span className="text-xs font-bold text-[#003178] flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-[#003178]" />
                    {primarySkillLabel}
                  </span>
                </div>
                {/* Duration layout badge */}
                <div className="text-right">
                  <span className="block text-lg font-black text-[#003178]">{displayedTask?.estimatedMinutes ?? 12}<span className="text-xs font-bold text-[#434652] ml-0.5">m</span></span>
                  <span className="text-[9.5px] text-gray-400 font-bold block -mt-1">预计耗时</span>
                </div>
              </div>

              {/* Title of the prioritized task */}
              <div className="mt-3.5 relative z-10">
                <h3 className="text-xl sm:text-2xl font-black text-[#0d47a1] tracking-tight">
                  {displayedTask?.title ?? '入门诊断：建立初始能力画像'}
                </h3>
              </div>

              {/* AI explanation system block */}
              <div className="bg-[#e3f2fd]/85 border border-[#c7e3fc]/80 rounded-2xl p-4.5 mt-5 text-[11px] leading-relaxed select-none relative z-10">
                <div className="flex items-center gap-1.5 font-bold text-[#003178] mb-1.5">
                  <Sparkles className="h-4 w-4 text-[#003178] fill-[#003178]/10" />
                  <span>智能任务调度</span>
                </div>
                <p className="text-[#434652] font-semibold">
                  {displayedTask?.reason ?? '系统正在基于本地练习记录和复习队列，为您生成今日最高收益训练。'} 距考试仅剩 <span className="text-[#003178] font-black">{examCountdown}</span> 天。
                </p>
              </div>

              {/* Bottom footer button bar */}
              <div className="mt-5.5 pt-4.5 border-t border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative z-10">
                <span className="text-xs font-bold text-gray-400">
                  {primaryTaskSummary}
                </span>
                <button
                  onClick={startPrimaryTask}
                  className="w-full sm:w-auto justify-center px-6 py-3 bg-[#1b6d24] hover:bg-emerald-700 text-white text-xs font-black rounded-2xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all pointer-events-auto cursor-pointer shadow-xs"
                >
                  <Sparkles className="h-4 w-4 text-emerald-300 animate-pulse" />
                  <span>{primaryActionLabel}</span>
                </button>
              </div>
            </div>

            {/* List Header title */}
            <div className="pt-2">
              <h3 className="text-[#003178] font-black text-sm mb-4 flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 bg-[#0d47a1] rounded text-white text-[10px] font-black text-center leading-4">目</span>
                <span>待办训练队列</span>
              </h3>

              {/* Training checklists list */}
              <div className="space-y-4">
                {taskRows.map((task, index) => {
                  const visual = getTaskVisual(task);
                  const Icon = visual.Icon;
                  return (
                    <div
                      key={task.id}
                      onClick={() => startTask(task)}
                      className={`bg-white border border-[#c3c6d4]/60 border-l-[4px] ${visual.border} rounded-2xl p-4.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between group hover:shadow-2xs hover:border-[#003178]/50 transition-all cursor-pointer pointer-events-auto`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-10 h-10 rounded-xl ${visual.bg} border border-slate-100 flex items-center justify-center shrink-0`}>
                          <Icon className={`h-5 w-5 ${visual.icon}`} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-[#003178] text-sm truncate">
                            {task.title}
                          </h4>
                          <p className="text-xs text-gray-400 font-bold mt-0.5 line-clamp-1">
                            {task.reason} · {task.estimatedMinutes}m
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          startTask(task);
                        }}
                        className="p-2 text-gray-400 hover:text-[#003178] rounded-lg hover:bg-slate-50 transition-colors pointer-events-auto cursor-pointer"
                        aria-label={`执行今日第 ${index + 1} 个任务`}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  );
                })}

              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR COLUMN: Diagnostic progress widget layouts */}
          <div className="space-y-6">
            
            {/* Block 1: 核心弱项诊断 (Fully Interactive Trigger) */}
            <div 
              onClick={onStartOnboarding}
              className="bg-white border border-[#c3c6d4]/60 hover:border-[#003178] rounded-3xl p-5.5 shadow-xs space-y-4.5 cursor-pointer hover:shadow-2xs transition-all group pointer-events-auto relative overflow-hidden"
            >
              {/* Highlight subtle corner flash glow on hover */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#dbf1fe]/30 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-center pb-2.5 border-b border-gray-100">
                <span className="text-sm font-black text-[#003178] flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-[#003178] rounded-xs block" />
                  核心弱项诊断
                </span>
                <span className="text-[10px] text-[#003178] bg-[#eef7fc] group-hover:bg-[#003178] group-hover:text-white px-2 py-0.5 rounded font-black transition-all flex items-center gap-0.5 shadow-3xs">
                  <span>诊断库</span>
                  <ChevronRight className="h-2.5 w-2.5" />
                </span>
              </div>

              {/* Custom micro metric bars matching screen perfectly */}
              <div className="space-y-4">
                
                {skillDiagnosticRows.map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-[#434652]">{row.label}</span>
                      <span className={row.visual ? row.visual.className : 'text-slate-400'}>
                        {row.visual && typeof row.score === 'number' ? `${row.visual.label} ${row.score}%` : '待诊断'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.visual ? row.visual.bar : 'bg-slate-300'}`}
                        style={{ width: `${row.visual && typeof row.score === 'number' ? Math.max(8, row.score) : 12}%` }}
                      />
                    </div>
                  </div>
                ))}

              </div>

              <div className="pt-2.5 border-t border-gray-100/70 flex items-center justify-center">
                <span className="text-[10px] text-[#003178] font-black group-hover:underline flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500 fill-amber-400 animate-bounce" />
                  <span>启动入门诊断与能力画像</span>
                </span>
              </div>
            </div>

            {/* Block 2: 突破进展 layout */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5.5 shadow-xs flex items-center justify-between group hover:border-[#1b6d24] transition-colors relative">
              <div className="space-y-1">
                <span className="text-xs font-black text-[#434652] flex items-center gap-1.5">
                  <BarChart2 className="h-4 w-4 text-[#003178]" />
                  突破进展
                </span>
                <span className="block text-[11px] text-gray-400 font-bold pt-1">
                  {hasAbilityEvidence ? '训练证据增长' : '能力画像状态'}
                </span>
                <div className="flex items-baseline gap-2 pt-1 font-semibold">
                  <span className="text-xl text-[#434652] opacity-60">0</span>
                  <span className="text-xl text-gray-400">→</span>
                  <span className="text-3xl font-extrabold text-[#1b6d24]">{abilityEvidenceCount}</span>
                </div>
              </div>

              {/* Wavelet Trend indicator icon floating */}
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-150 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-600 stroke-[2.5]" />
              </div>
            </div>

            {/* Block 3: 待复习词汇/错题 simple alert card row block */}
            <div 
              onClick={onViewReview}
              className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-xs flex items-center justify-between cursor-pointer hover:border-[#003178] hover:shadow-2xs transition-all pointer-events-auto"
            >
              <div className="flex items-center gap-3">
                {/* Book stack badge with absolute counter */}
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <BookMarked className="h-5.5 w-5.5 text-[#003178]" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {reviewItemCount}
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-[#003178] text-xs">
                    待复习词汇/错题
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                    {reviewItemCount > 0 ? '建议在今日内完成' : '练习后生成真实错因'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-[#003178]" />
            </div>

            {/* Block 4: 训练策略切换 checkboxes with high simulation */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5.5 shadow-xs space-y-4">
              <span className="text-xs font-black text-[#0d47a1] flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-[#003178]" />
                训练策略切换
              </span>

              <div className="space-y-3 pt-1">
                {/* Strategy Option A: 高效模式 */}
                <div 
                  onClick={() => onStrategyChange('efficient')}
                  className={`border rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                    strategy === 'efficient' 
                      ? 'bg-[#eef7fc] border-[#cfe6f2] shadow-3xs' 
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div>
                    <h5 className="font-extrabold text-xs text-[#003178]">高效模式</h5>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">限时训练，强化干扰项辨析</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    strategy === 'efficient' ? 'border-[#003178] bg-[#003178]' : 'border-slate-350 bg-white'
                  }`}>
                    {strategy === 'efficient' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>

                {/* Strategy Option B: 巩固模式 */}
                <div 
                  onClick={() => onStrategyChange('review')}
                  className={`border rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                    strategy === 'review' 
                      ? 'bg-[#eef7fc] border-[#cfe6f2] shadow-3xs' 
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div>
                    <h5 className="font-extrabold text-xs text-[#1e333c]">巩固模式</h5>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">侧重基础巩固与详尽解析</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    strategy === 'review' ? 'border-[#003178] bg-[#003178]' : 'border-slate-350 bg-white'
                  }`}>
                    {strategy === 'review' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

        {onTriggerModal && (
          <LaunchReadinessNotice onOpen={onTriggerModal} />
        )}

      </div>

    </div>
  );
}
