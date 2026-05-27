import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Lightbulb,
  ListTodo,
  Play,
  RefreshCw,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { MemoryReviewTask, ReviewCompletionEvidence, ReviewItem } from '../types';
import type { ReviewGateStatus } from '../domain/review/reviewGate';

interface ReviewSectionProps {
  onTriggerModal?: (title: string, body: string) => void;
  persistedReviewCount?: number;
  persistedReviewItems?: ReviewItem[];
  reviewGateStatus?: ReviewGateStatus;
  onCompleteReviewItem?: (reviewItemId: string, evidence: ReviewCompletionEvidence) => Promise<void> | void;
}

function isDue(item: ReviewItem): boolean {
  return !item.nextReviewAt || item.nextReviewAt <= new Date().toISOString();
}

function formatReviewDate(value?: string): string {
  if (!value) return '完成后生成';
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildFallbackMemoryTask(item: ReviewItem): MemoryReviewTask {
  const sourceText = item.detail || item.title;
  return {
    version: 1,
    sourceText,
    recallPrompt: '先不要看解析，用自己的话说出这条复习项的错因、正确策略和可迁移表达。',
    recallAnswer: sourceText,
    clozePrompt: `${sourceText.slice(0, 80)} ____`,
    clozeAnswer: item.title,
    chunks: [item.title],
    productionPrompt: '用这条复习项里的表达或策略，重新造一个英语句子，或复述本题正确思路。',
    methodNotes: [
      '主动回忆：先答后看，避免只重读解析。',
      '挖空补全：用缺口迫使大脑提取关键词。',
      '语境化输出：最后必须造句、复述或翻译。',
    ],
    spacingPlanDays: [1, 3, 7, 14, 30],
  };
}

function getReviewTask(item?: ReviewItem): MemoryReviewTask | null {
  if (!item) return null;
  return item.memoryTask ?? buildFallbackMemoryTask(item);
}

function getCategoryTone(item?: ReviewItem): string {
  if (!item?.skillArea) return '综合复习';
  const labels: Record<string, string> = {
    reading: '阅读定位',
    listening: '听力辨音',
    writing: '写作表达',
    translation: '翻译表达',
    speaking: '口语输出',
    vocabulary: '词汇语块',
    grammar: '语法句式',
  };
  return labels[item.skillArea] ?? '综合复习';
}

export default function ReviewSection({
  onTriggerModal,
  persistedReviewCount = 0,
  persistedReviewItems = [],
  reviewGateStatus,
  onCompleteReviewItem,
}: ReviewSectionProps) {
  const [view, setView] = useState<'dashboard' | 'practice'>('dashboard');
  const [selectedReviewItemId, setSelectedReviewItemId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [recallAnswer, setRecallAnswer] = useState('');
  const [clozeAnswer, setClozeAnswer] = useState('');
  const [productionAnswer, setProductionAnswer] = useState('');
  const [reviewStartedAt, setReviewStartedAt] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const sortedReviewItems = useMemo(
    () => [...persistedReviewItems].sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0)),
    [persistedReviewItems],
  );
  const dueReviewItems = useMemo(() => sortedReviewItems.filter(isDue), [sortedReviewItems]);
  const hasRealReviewItems = persistedReviewCount > 0 || sortedReviewItems.length > 0;
  const selectedReview = selectedReviewItemId
    ? sortedReviewItems.find((item) => item.id === selectedReviewItemId)
    : undefined;
  const activeReview = selectedReview ?? dueReviewItems[0] ?? sortedReviewItems[0];
  const activeTask = getReviewTask(activeReview);
  const averageMastery = sortedReviewItems.length > 0
    ? Math.round(sortedReviewItems.reduce((sum, item) => sum + (item.masteryScore ?? 35), 0) / sortedReviewItems.length)
    : 0;

  useEffect(() => {
    setStep(0);
    setRecallAnswer('');
    setClozeAnswer('');
    setProductionAnswer('');
  }, [selectedReviewItemId, view]);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3600);
  };

  const startReview = (itemId?: string) => {
    if (!hasRealReviewItems || !activeReview) {
      triggerToast('当前还没有真实复习项。请先完成阅读、听力、写作、翻译或口语训练。');
      return;
    }
    setSelectedReviewItemId(itemId ?? activeReview.id);
    setReviewStartedAt(new Date().toISOString());
    setView('practice');
  };

  const completeReview = async () => {
    if (!activeReview) return;
    try {
      setIsSaving(true);
      await onCompleteReviewItem?.(activeReview.id, {
        recallAnswer,
        clozeAnswer,
        productionAnswer,
        completedStepCount: 3,
        startedAt: reviewStartedAt ?? new Date().toISOString(),
      });
      setResolvedCount((count) => count + 1);
      setReviewStartedAt(null);
      setView('dashboard');
      triggerToast('已完成一次主动回忆复习，并更新掌握度与下次间隔。');
    } catch (error) {
      console.error('Failed to save review completion:', error);
      triggerToast('复习已完成，但本地复习计划更新失败，请稍后重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const showMethodDetail = () => {
    onTriggerModal?.(
      '为什么这样复习更有效',
      '本页按“主动回忆 → 挖空补全 → 语境化输出 → 间隔重复”组织。先回忆可以避免被动重读，挖空会迫使大脑提取关键词，最后造句或复述能验证是否能主动使用。系统会按 1/3/7/14/30 天逐步拉开复习间隔。',
    );
  };

  if (view === 'practice' && activeReview && activeTask) {
    return (
      <div className="flex-1 min-h-[calc(100svh-9rem)] lg:min-h-screen overflow-y-auto overflow-x-hidden bg-[#f4f8fb] p-4 sm:p-8">
        {toastMessage && (
          <div className="fixed top-4 left-4 right-4 z-50 rounded-2xl border border-[#cfe6f2] bg-[#003178] px-4 py-3 text-xs font-bold text-white shadow-xl sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-5">
            {toastMessage}
          </div>
        )}

        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <header className="flex flex-col gap-4 rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <button
                onClick={() => setView('dashboard')}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
              >
                <X className="h-3.5 w-3.5" />
                退出复习
              </button>
              <h2 className="text-2xl font-black text-[#003178]">主动回忆复习</h2>
              <p className="max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                {activeReview.title}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs sm:min-w-72">
              <div className="rounded-2xl bg-[#eef7fc] p-3">
                <span className="block font-bold text-slate-500">当前掌握度</span>
                <span className="text-2xl font-black text-[#003178]">{activeReview.masteryScore ?? 35}%</span>
              </div>
              <div className="rounded-2xl bg-[#f0fdf4] p-3">
                <span className="block font-bold text-slate-500">下次复习</span>
                <span className="text-sm font-black text-emerald-700">{formatReviewDate(activeReview.nextReviewAt)}</span>
              </div>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-3">
            {['第 1 步：主动回忆', '第 2 步：挖空补全', '第 3 步：语境化输出'].map((label, index) => (
              <div
                key={label}
                className={`rounded-2xl border p-4 text-sm font-black transition ${
                  step === index
                    ? 'border-[#003178] bg-[#003178] text-white shadow-md'
                    : index < step
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <main className="rounded-[2rem] border border-[#cfe6f2] bg-white p-4 shadow-sm sm:p-6">
            {step === 0 && (
              <section className="space-y-5">
                <div className="flex items-start gap-3 rounded-2xl bg-[#f0f9ff] p-4">
                  <Brain className="mt-0.5 h-5 w-5 shrink-0 text-[#003178]" />
                  <div>
                    <h3 className="text-xl font-black text-[#003178]">第 1 步：主动回忆</h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{activeTask.recallPrompt}</p>
                  </div>
                </div>
                <textarea
                  value={recallAnswer}
                  onChange={(event) => setRecallAnswer(event.target.value)}
                  rows={6}
                  data-testid="review-recall-answer"
                  placeholder="不要先看答案，先写出你能回忆出的意思、错因、原句线索或使用场景。"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 outline-none transition focus:border-[#003178] focus:bg-white"
                />
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-500">
                  回忆完成后再看参考答案：{activeTask.recallAnswer}
                </div>
                <button
                  disabled={recallAnswer.trim().length < 4}
                  onClick={() => setStep(1)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#003178] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#0d47a1] disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                >
                  完成主动回忆，进入挖空
                  <ArrowRight className="h-4 w-4" />
                </button>
              </section>
            )}

            {step === 1 && (
              <section className="space-y-5">
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4">
                  <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <h3 className="text-xl font-black text-amber-800">第 2 步：挖空补全</h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">{activeTask.clozePrompt}</p>
                  </div>
                </div>
                <input
                  value={clozeAnswer}
                  onChange={(event) => setClozeAnswer(event.target.value)}
                  data-testid="review-cloze-answer"
                  placeholder="填入被挖空的词、语块或句子核心。"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none transition focus:border-amber-600 focus:bg-white"
                />
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                  参考答案：{activeTask.clozeAnswer}
                </div>
                <button
                  disabled={clozeAnswer.trim().length < 2}
                  onClick={() => setStep(2)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                >
                  完成挖空，进入输出
                  <ArrowRight className="h-4 w-4" />
                </button>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-5">
                <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
                  <Target className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div>
                    <h3 className="text-xl font-black text-emerald-800">第 3 步：语境化输出</h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">{activeTask.productionPrompt}</p>
                  </div>
                </div>
                {activeTask.chunks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {activeTask.chunks.map((chunk) => (
                      <span key={chunk} className="rounded-full border border-[#cfe6f2] bg-[#eef7fc] px-3 py-1.5 text-xs font-black text-[#003178]">
                        {chunk}
                      </span>
                    ))}
                  </div>
                )}
                <textarea
                  value={productionAnswer}
                  onChange={(event) => setProductionAnswer(event.target.value)}
                  rows={6}
                  data-testid="review-production-answer"
                  placeholder="写一个新句、复述原材料，或把语块放进翻译/作文表达里。"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 outline-none transition focus:border-emerald-600 focus:bg-white"
                />
                <button
                  disabled={productionAnswer.trim().length < 6 || isSaving}
                  onClick={completeReview}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  完成复习并安排下次间隔
                </button>
              </section>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[calc(100svh-9rem)] lg:min-h-screen overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#f3faff] to-white p-4 sm:p-8">
      {toastMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 rounded-2xl border border-[#cfe6f2] bg-[#003178] px-4 py-3 text-xs font-bold text-white shadow-xl sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-5">
          {toastMessage}
        </div>
      )}

      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[#cfe6f2] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[#003178] sm:text-3xl">复习队列</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              按“主动回忆、挖空补全、语境化输出、间隔重复”处理词汇和句式，不再只是看解析。
            </p>
          </div>
          <button
            onClick={showMethodDetail}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#cfe6f2] bg-white px-4 py-3 text-xs font-black text-[#003178] shadow-sm transition hover:bg-[#eef7fc]"
          >
            <Sparkles className="h-4 w-4" />
            学习法说明
          </button>
        </header>

        {reviewGateStatus && (
          <section
            data-testid="review-gate-status"
            className={`rounded-[2rem] border p-4 shadow-sm sm:p-5 ${
              reviewGateStatus.locked
                ? 'border-rose-100 bg-rose-50'
                : reviewGateStatus.dueCount > 0
                ? 'border-emerald-100 bg-emerald-50'
                : 'border-[#cfe6f2] bg-white'
            }`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${
                  reviewGateStatus.locked ? 'bg-rose-600 text-white' : 'bg-[#eef7fc] text-[#003178]'
                }`}>
                  间隔复习计划
                </span>
                <h3 className="mt-3 text-lg font-black text-[#003178]">
                  {reviewGateStatus.locked
                    ? `还需完成 ${reviewGateStatus.remainingRequired} 条，才能解锁新训练`
                    : reviewGateStatus.dueCount > 0
                    ? '今日最低复习剂量已完成'
                    : '今天没有到期复习项'}
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  系统按最高优先级安排到期项；积压较多时先强制完成 3 条，避免用户被大量旧账卡死。
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-black sm:min-w-80">
                <div className="rounded-2xl bg-white/80 p-3">
                  <div className="text-2xl text-rose-700">{reviewGateStatus.dueCount}</div>
                  <div className="text-slate-500">到期</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <div className="text-2xl text-emerald-700">{reviewGateStatus.completedToday}</div>
                  <div className="text-slate-500">今日完成</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <div className="text-2xl text-[#003178]">{reviewGateStatus.requiredToday}</div>
                  <div className="text-slate-500">最低剂量</div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-3xl border border-[#cfe6f2] bg-white p-5 shadow-sm">
            <ListTodo className="h-5 w-5 text-[#003178]" />
            <span className="mt-3 block text-xs font-bold text-slate-500">到期复习</span>
            <strong className="text-3xl font-black text-[#003178]">{persistedReviewCount}</strong>
          </div>
          <div className="rounded-3xl border border-[#cfe6f2] bg-white p-5 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            <span className="mt-3 block text-xs font-bold text-slate-500">今日已完成</span>
            <strong className="text-3xl font-black text-emerald-700">{resolvedCount}</strong>
          </div>
          <div className="rounded-3xl border border-[#cfe6f2] bg-white p-5 shadow-sm">
            <Brain className="h-5 w-5 text-[#003178]" />
            <span className="mt-3 block text-xs font-bold text-slate-500">平均掌握度</span>
            <strong className="text-3xl font-black text-slate-800">{averageMastery}%</strong>
          </div>
          <div className="rounded-3xl border border-[#cfe6f2] bg-white p-5 shadow-sm">
            <RefreshCw className="h-5 w-5 text-[#003178]" />
            <span className="mt-3 block text-xs font-bold text-slate-500">间隔计划</span>
            <strong className="text-xl font-black text-[#003178]">1/3/7/14/30 天</strong>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-sm font-black text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {hasRealReviewItems ? '最高优先级复习项' : '等待生成真实复习项'}
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                {activeReview?.title ?? '还没有可复习的真实错因'}
              </h3>
              <p className="whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-600">
                {activeReview?.detail ?? '完成阅读、听力、写作、翻译或口语训练后，系统会把错题、低信心题和 AI 反馈中的关键表达转成复习任务。'}
              </p>
              <div className="flex flex-wrap gap-2">
                {['主动回忆', '语块化', '挖空补全', '语境输出'].map((item) => (
                  <span key={item} className="rounded-full bg-[#eef7fc] px-3 py-1 text-xs font-black text-[#003178]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <aside className="flex w-full flex-col justify-between gap-4 rounded-3xl bg-[#f8fbfd] p-5 lg:w-80">
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-[#003178]" />
                  <div>
                    <span className="block text-xs font-bold text-slate-400">建议耗时</span>
                    <strong className="text-slate-800">8-12 分钟</strong>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="mt-0.5 h-4 w-4 text-[#003178]" />
                  <div>
                    <span className="block text-xs font-bold text-slate-400">训练类型</span>
                    <strong className="text-slate-800">{getCategoryTone(activeReview)}</strong>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-rose-600"
                    style={{ width: `${activeReview?.masteryScore ?? 0}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => startReview(activeReview?.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#003178] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#0d47a1]"
              >
                {hasRealReviewItems ? '开始复习' : '先完成训练生成错因'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </aside>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-[#003178]">
              <Play className="h-4 w-4" />
              到期与高优先级
            </h3>
            <div className="space-y-3">
              {(dueReviewItems.length > 0 ? dueReviewItems : sortedReviewItems).slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => startReview(item.id)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#003178] hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-slate-900">{item.title}</strong>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#003178]">
                      {item.masteryScore ?? 35}%
                    </span>
                  </div>
                  <span className="mt-2 block text-xs font-semibold text-slate-500">
                    下次复习：{formatReviewDate(item.nextReviewAt)}
                  </span>
                </button>
              ))}
              {sortedReviewItems.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm font-semibold leading-7 text-slate-500">
                  暂无复习项。先完成一次专项训练，系统会自动生成词汇、语块、句式或错题复习任务。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-[#003178]">
              <Lightbulb className="h-4 w-4" />
              今日复习规则
            </h3>
            <div className="space-y-3">
              {[
                ['先回忆', '不看答案，先写出意思、错因和原句线索。'],
                ['再挖空', '补出关键词或语块，确认不是只“看着认识”。'],
                ['必须输出', '造句、复述或翻译，证明能主动使用。'],
                ['间隔推进', '掌握度越高，下次复习间隔越长。'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl bg-[#f8fbfd] p-4">
                  <strong className="text-sm text-slate-900">{title}</strong>
                  <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
