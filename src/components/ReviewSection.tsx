import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock,
  Lightbulb,
  ListTodo,
  PauseCircle,
  Play,
  RefreshCw,
  Sparkles,
  Target,
  Volume2,
} from 'lucide-react';
import { ChoiceOption, MemoryReviewTask, ReviewCompletionEvidence, ReviewItem } from '../types';
import { buildReviewVariantRecommendations, type CoachModuleId } from '../domain/productCoach';
import type { ReviewGateStatus } from '../domain/review/reviewGate';
import { isReviewItemDueOn, sortWrongQuestionReviewItems, toLocalDateKey } from '../domain/review/reviewQueue';
import { resolveRedoQuestionTranslation } from '../domain/review/redoTranslation';
import { pausePracticeSpeech, playPracticeSpeech, resumePracticeSpeech, stopPracticeSpeech } from '../lib/practiceSpeech';

interface ReviewSectionProps {
  onTriggerModal?: (title: string, body: string) => void;
  persistedReviewItems?: ReviewItem[];
  reviewGateStatus?: ReviewGateStatus;
  onCompleteReviewItem?: (reviewItemId: string, evidence: ReviewCompletionEvidence) => Promise<void> | void;
  onStartVariantPractice?: (moduleId: CoachModuleId) => void;
}

type ReviewOutcome = NonNullable<ReviewCompletionEvidence['reviewOutcome']>;

const REVIEW_OUTCOMES: Array<{
  value: ReviewOutcome;
  label: string;
  body: string;
  className: string;
}> = [
  {
    value: 'mastered',
    label: '已掌握',
    body: '能直接判断。',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-500',
  },
  {
    value: 'unclear',
    label: '还模糊',
    body: '方向有，但不稳。',
    className: 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-500',
  },
  {
    value: 'again',
    label: '仍不会',
    body: '继续高频复习。',
    className: 'border-rose-200 bg-rose-50 text-rose-900 hover:border-rose-500',
  },
];

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
    recallPrompt: '先回忆这条复习项的错因、正确策略或关键表达。',
    recallAnswer: sourceText,
    clozePrompt: `${sourceText.slice(0, 80)} ____`,
    clozeAnswer: item.title,
    chunks: [item.title],
    productionPrompt: '用这条复习项里的表达或策略，复述本题正确思路。',
    methodNotes: [
      '先尝试自己判断，再看参考。',
      '核对正确答案、上次答案和关键证据。',
      '按真实掌握状态安排下次间隔。',
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

function getSimpleFocusText(item: ReviewItem, task: MemoryReviewTask): string {
  const firstReason = item.title.split('：')[1]?.trim();
  const firstChunk = task.chunks[0]?.trim();
  return firstReason || firstChunk || item.title;
}

function buildSimpleRecallAnswer(item: ReviewItem, task: MemoryReviewTask): string {
  const focus = getSimpleFocusText(item, task);
  return [
    `我错在：${focus}。`,
    '正确思路：先看题干，再回到原文或材料找证据，不凭感觉选。',
    `下次提醒：${task.chunks[0] || task.clozeAnswer || focus}。`,
  ].join('\n');
}

function normalizeRedoAnswer(value?: string | null): string {
  return String(value ?? '').trim().toUpperCase();
}

function getRedoCorrect(item: ReviewItem | undefined, redoAnswer: string): boolean | undefined {
  if (!item?.redoQuestion?.correctAnswer || !redoAnswer.trim()) return undefined;
  return normalizeRedoAnswer(redoAnswer) === normalizeRedoAnswer(String(item.redoQuestion.correctAnswer));
}

function formatRedoAnswer(item: ReviewItem, value?: string): string {
  const normalized = normalizeRedoAnswer(value);
  if (!normalized) return '暂无';
  const optionKey = ['A', 'B', 'C', 'D'].includes(normalized) ? normalized as ChoiceOption : null;
  const optionText = optionKey ? item.redoQuestion?.options?.[optionKey] : undefined;
  return optionText ? `${normalized}. ${optionText}` : normalized;
}

function buildRedoSpeechText(item: ReviewItem): string {
  const redoQuestion = item.redoQuestion;
  if (!redoQuestion) return '';

  const parts: string[] = [];
  if (redoQuestion.sourceLabel) parts.push(redoQuestion.sourceLabel);
  if (redoQuestion.context) parts.push(redoQuestion.context);
  parts.push(redoQuestion.prompt);

  if (redoQuestion.options) {
    (['A', 'B', 'C', 'D'] as ChoiceOption[]).forEach((option) => {
      const optionText = redoQuestion.options?.[option]?.trim();
      if (optionText) parts.push(`${option}. ${optionText}`);
    });
  }

  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n');
}

export default function ReviewSection({
  onTriggerModal,
  persistedReviewItems = [],
  reviewGateStatus,
  onCompleteReviewItem,
  onStartVariantPractice,
}: ReviewSectionProps) {
  const [selectedReviewItemId, setSelectedReviewItemId] = useState<string | null>(null);
  const [completedReviewIds, setCompletedReviewIds] = useState<string[]>([]);
  const [redoAnswer, setRedoAnswer] = useState('');
  const [noteAnswer, setNoteAnswer] = useState('');
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [reviewStartedAt, setReviewStartedAt] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [redoSpeechState, setRedoSpeechState] = useState<'idle' | 'playing' | 'paused'>('idle');

  const completedReviewIdSet = useMemo(() => new Set(completedReviewIds), [completedReviewIds]);
  const sortedReviewItems = useMemo(
    () => sortWrongQuestionReviewItems(persistedReviewItems),
    [persistedReviewItems],
  );
  const reviewDate = reviewGateStatus?.date ?? toLocalDateKey();
  const dueReviewItems = useMemo(
    () => sortedReviewItems.filter((item) => isReviewItemDueOn(item, reviewDate)),
    [reviewDate, sortedReviewItems],
  );
  const upcomingReviewItems = useMemo(
    () => sortedReviewItems
      .filter((item) => !isReviewItemDueOn(item, reviewDate))
      .sort((left, right) => (left.nextReviewAt ?? '').localeCompare(right.nextReviewAt ?? '')),
    [reviewDate, sortedReviewItems],
  );
  const availableReviewItems = useMemo(
    () => dueReviewItems.filter((item) => !completedReviewIdSet.has(item.id)),
    [completedReviewIdSet, dueReviewItems],
  );
  const selectedReview = selectedReviewItemId
    ? availableReviewItems.find((item) => item.id === selectedReviewItemId)
    : undefined;
  const activeReview = selectedReview ?? availableReviewItems[0];
  const activeTask = getReviewTask(activeReview);
  const redoQuestion = activeReview?.redoQuestion;
  const redoOptions = redoQuestion?.options
    ? (['A', 'B', 'C', 'D'] as ChoiceOption[]).filter((option) => Boolean(redoQuestion.options?.[option]))
    : [];
  const redoTranslation = useMemo(
    () => activeReview ? resolveRedoQuestionTranslation(activeReview) : null,
    [activeReview],
  );
  const redoSpeechText = useMemo(() => activeReview ? buildRedoSpeechText(activeReview) : '', [activeReview]);
  const variantRecommendations = useMemo(
    () => buildReviewVariantRecommendations(activeReview),
    [activeReview],
  );
  const simpleRecallAnswer = activeReview && activeTask ? buildSimpleRecallAnswer(activeReview, activeTask) : '';
  const redoCorrect = getRedoCorrect(activeReview, redoAnswer);
  const feedbackVisible = Boolean(activeReview && (!redoQuestion || answerRevealed));
  const averageMastery = availableReviewItems.length > 0
    ? Math.round(availableReviewItems.reduce((sum, item) => sum + (item.masteryScore ?? 35), 0) / availableReviewItems.length)
    : null;

  useEffect(() => {
    setRedoAnswer('');
    setNoteAnswer('');
    setAnswerRevealed(!activeReview?.redoQuestion);
    setReviewStartedAt(activeReview ? new Date().toISOString() : null);
    setRedoSpeechState('idle');
    stopPracticeSpeech();
  }, [activeReview?.id]);

  useEffect(() => () => stopPracticeSpeech(), []);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3600);
  };

  const selectReviewItem = (itemId: string) => {
    setSelectedReviewItemId(itemId);
  };

  const revealAnswer = () => {
    if (!activeReview) return;
    setAnswerRevealed(true);
    setReviewStartedAt((value) => value ?? new Date().toISOString());
  };

  const chooseRedoOption = (option: ChoiceOption) => {
    setRedoAnswer(option);
    setAnswerRevealed(true);
    setReviewStartedAt((value) => value ?? new Date().toISOString());
  };

  const toggleRedoSpeech = async () => {
    if (!redoSpeechText) return;

    if (redoSpeechState === 'playing') {
      if (pausePracticeSpeech()) {
        setRedoSpeechState('paused');
        triggerToast('错题语音已暂停，再次点击可继续播放。');
      } else {
        stopPracticeSpeech();
        setRedoSpeechState('idle');
      }
      return;
    }

    if (redoSpeechState === 'paused') {
      const resumed = await resumePracticeSpeech();
      if (resumed) {
        setRedoSpeechState('playing');
        triggerToast('错题语音继续播放。');
        return;
      }
      setRedoSpeechState('idle');
    }

    await playPracticeSpeech(redoSpeechText, {
      rate: activeReview?.skillArea === 'listening' ? 0.88 : 0.92,
      preferLocalAudio: true,
      onStart: () => setRedoSpeechState('playing'),
      onEnd: () => setRedoSpeechState('idle'),
      onError: (message) => {
        setRedoSpeechState('idle');
        triggerToast(message || '错题语音播放失败，请稍后重试。');
      },
    });
  };

  const completeReview = async (reviewOutcome: ReviewOutcome) => {
    if (!activeReview || !activeTask) return;
    if (redoQuestion && !feedbackVisible) {
      triggerToast('先作答或点“直接看答案”，再自评完成。');
      return;
    }

    const outcomeLabels: Record<ReviewOutcome, string> = {
      mastered: '已掌握',
      unclear: '还模糊',
      again: '仍不会',
    };
    const fallbackRecall = noteAnswer.trim()
      || simpleRecallAnswer
      || activeTask.recallAnswer
      || activeReview.detail;
    const fallbackCloze = activeTask.clozeAnswer || getSimpleFocusText(activeReview, activeTask);
    const fallbackProduction = `本次自评：${outcomeLabels[reviewOutcome]}。下次遇到同类题，先判断答案，再核对证据。`;

    try {
      setIsSaving(true);
      await onCompleteReviewItem?.(activeReview.id, {
        redoAnswer: redoQuestion ? redoAnswer : undefined,
        redoCorrect: redoQuestion ? redoCorrect : undefined,
        reviewOutcome,
        recallAnswer: fallbackRecall,
        clozeAnswer: fallbackCloze,
        productionAnswer: fallbackProduction,
        completedStepCount: 3,
        startedAt: reviewStartedAt ?? new Date().toISOString(),
      });

      setCompletedReviewIds((ids) => ids.includes(activeReview.id) ? ids : [...ids, activeReview.id]);
      const nextReview = availableReviewItems.find((item) => item.id !== activeReview.id);
      setSelectedReviewItemId(nextReview?.id ?? null);
      triggerToast(`已按“${outcomeLabels[reviewOutcome]}”更新掌握度与下次间隔。`);
    } catch (error) {
      console.error('Failed to save review completion:', error);
      triggerToast('复习已完成，但本地复习计划更新失败，请稍后重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const showMethodDetail = () => {
    onTriggerModal?.(
      '错题队列怎么做',
      '重做原题 -> 看反馈 -> 自评掌握度。',
    );
  };

  return (
    <div className="app-page-surface ui-page">
      {toastMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 rounded-2xl border border-[#cfe6f2] bg-[#003178] px-4 py-3 text-xs font-bold text-white shadow-xl sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-5">
          {toastMessage}
        </div>
      )}

      <div className="ui-page-content flex flex-col gap-5">
        <header className="ui-page-header-compact flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[#101828] sm:text-3xl">复习队列</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
              按到期顺序重做。
            </p>
          </div>
          <button onClick={showMethodDetail} className="ui-button ui-button-secondary">
            <Sparkles className="h-4 w-4" />
            错题队列说明
          </button>
        </header>

        {reviewGateStatus && (
          <section data-testid="review-gate-status" className="ui-panel bg-[#f8fafc]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="ui-chip ui-chip-accent">今日复习</span>
                <h3 className="mt-3 text-lg font-black text-[#003178]">
                  {reviewGateStatus.locked
                    ? `先完成 ${reviewGateStatus.remainingRequired} 条到期复习`
                    : reviewGateStatus.dueCount > 0
                    ? '最低剂量已完成'
                    : '今天没有到期复习项'}
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-black sm:min-w-80">
                <div className="ui-metric">
                  <div className="text-2xl text-[#003178]">{reviewGateStatus.dueCount}</div>
                  <div className="text-slate-500">到期</div>
                </div>
                <div className="ui-metric">
                  <div className="text-2xl text-[#003178]">{reviewGateStatus.completedToday}</div>
                  <div className="text-slate-500">今日完成</div>
                </div>
                <div className="ui-metric">
                  <div className="text-2xl text-[#003178]">{reviewGateStatus.requiredToday}</div>
                  <div className="text-slate-500">最低剂量</div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-3 gap-3">
          <div className="ui-panel">
            <ListTodo className="h-5 w-5 text-[#003178]" />
            <span className="mt-3 block text-xs font-bold text-slate-500">待处理</span>
            <strong className="text-3xl font-black text-[#003178]">{availableReviewItems.length}</strong>
          </div>
          <div className="ui-panel">
            <CheckCircle2 className="h-5 w-5 text-[#003178]" />
            <span className="mt-3 block text-xs font-bold text-slate-500">本轮</span>
            <strong className="text-3xl font-black text-[#003178]">{completedReviewIds.length}</strong>
          </div>
          <div className="ui-panel">
            <Brain className="h-5 w-5 text-[#003178]" />
            <span className="mt-3 block text-xs font-bold text-slate-500">掌握</span>
            <strong className="text-3xl font-black text-slate-800">{averageMastery === null ? '—' : `${averageMastery}%`}</strong>
          </div>
        </section>

        {activeReview && activeTask ? (
          <section data-testid="review-direct-card" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <main className="ui-panel space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ui-chip ui-chip-accent">{getCategoryTone(activeReview)}</span>
                    <span className="ui-chip">{activeReview.category}</span>
                    {isReviewItemDueOn(activeReview, reviewDate) ? <span className="ui-chip bg-rose-50 text-rose-700">到期</span> : null}
                  </div>
                  <h3 className="mt-3 text-2xl font-black text-[#101828]">{activeReview.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    掌握度 {activeReview.masteryScore ?? 35}% · 下次复习 {formatReviewDate(activeReview.nextReviewAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={revealAnswer}
                  className="ui-button ui-button-secondary ui-button-compact"
                >
                  直接看答案
                </button>
              </div>

              {redoQuestion ? (
                <section className="space-y-4">
                  {redoQuestion.sourceLabel ? (
                    <div className="text-xs font-black uppercase tracking-wide text-[#003178]">
                      {redoQuestion.sourceLabel}
                    </div>
                  ) : null}
                  {redoQuestion.context ? (
                    <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                      {redoQuestion.context}
                    </div>
                  ) : null}
                  <div className="rounded-2xl border border-[#cfe6f2] bg-[#f8fbff] p-4">
                    <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm font-black text-[#003178]">
                        <Play className="h-4 w-4" />
                        重做原题
                      </div>
                      {redoSpeechText ? (
                        <button
                          type="button"
                          data-testid="review-redo-speech-toggle"
                          onClick={toggleRedoSpeech}
                          className="ui-button ui-button-secondary ui-button-compact self-start"
                        >
                          {redoSpeechState === 'playing' ? (
                            <PauseCircle className="h-4 w-4" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                          {redoSpeechState === 'playing'
                            ? '暂停语音'
                            : redoSpeechState === 'paused'
                            ? '继续语音'
                            : '播放语音'}
                        </button>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-line text-base font-bold leading-7 text-slate-900">
                      {redoQuestion.prompt}
                    </p>
                  </div>

                  {redoQuestion.kind === 'single-choice' && redoOptions.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {redoOptions.map((option) => {
                        const selected = redoAnswer === option;
                        const isCorrectOption = normalizeRedoAnswer(String(redoQuestion.correctAnswer)) === option;
                        const resolvedClass = feedbackVisible && isCorrectOption
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : feedbackVisible && selected
                          ? 'border-rose-300 bg-rose-50 text-rose-900'
                          : selected
                          ? 'border-[#003178] bg-[#eef7fc] text-[#003178] shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#003178] hover:bg-white';
                        return (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={selected}
                            data-testid={`review-redo-choice-${option}`}
                            onClick={() => chooseRedoOption(option)}
                            className={`min-h-20 rounded-2xl border p-4 text-left text-sm font-bold leading-6 transition ${resolvedClass}`}
                          >
                            <span className="mr-2 font-black">{option}.</span>
                            {redoQuestion.options?.[option]}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={redoAnswer}
                        onChange={(event) => setRedoAnswer(event.target.value)}
                        rows={5}
                        data-testid="review-redo-text-answer"
                        placeholder="重新作答。"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 outline-none transition focus:border-[#003178] focus:bg-white"
                      />
                      <button
                        type="button"
                        disabled={redoAnswer.trim().length < 1}
                        onClick={revealAnswer}
                        className="ui-button ui-button-primary ui-button-compact disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        看答案
                      </button>
                    </div>
                  )}
                </section>
              ) : (
                <section className="space-y-4">
                  <div className="rounded-2xl border border-[#cfe6f2] bg-[#f8fbff] p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-[#003178]">
                      <Brain className="h-4 w-4" />
                      快速回忆
                    </div>
                    <p className="text-sm font-semibold leading-7 text-slate-700">
                      {activeTask.recallPrompt}
                    </p>
                  </div>
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                    {activeReview.detail}
                  </p>
                </section>
              )}

              {feedbackVisible ? (
                <section data-testid="review-direct-feedback" className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="mt-1 h-5 w-5 shrink-0 text-amber-700" />
                    <div>
                      <h4 className="text-lg font-black text-amber-900">反馈</h4>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                        核对答案后选择掌握状态。
                      </p>
                    </div>
                  </div>

                  {redoQuestion ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-xs font-black text-slate-500">本次答案</div>
                        <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{formatRedoAnswer(activeReview, redoAnswer)}</p>
                      </div>
                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-xs font-black text-emerald-700">正确答案</div>
                        <p className="mt-2 text-sm font-bold leading-6 text-emerald-900">
                          {formatRedoAnswer(activeReview, String(redoQuestion.correctAnswer ?? ''))}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white p-3">
                        <div className="text-xs font-black text-slate-500">上次答案</div>
                        <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{formatRedoAnswer(activeReview, redoQuestion.userAnswer)}</p>
                      </div>
                    </div>
                  ) : null}

                  {redoQuestion?.explanation ? (
                    <p className="rounded-2xl bg-white p-3 text-sm font-semibold leading-7 text-slate-700">
                      {redoQuestion.explanation}
                    </p>
                  ) : null}

                  {redoTranslation ? (
                    <div data-testid="review-redo-translation" className="space-y-3 rounded-2xl border border-[#cfe6f2] bg-white p-4">
                      <div className="flex items-center gap-2 text-xs font-black text-[#003178]">
                        <Sparkles className="h-4 w-4" />
                        选完后的中文翻译
                      </div>
                      {redoTranslation.prompt ? (
                        <p data-testid="review-redo-prompt-translation" className="text-sm font-bold leading-6 text-slate-800">
                          题意：{redoTranslation.prompt}
                        </p>
                      ) : null}
                      {redoTranslation.options && redoOptions.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {redoOptions.map((option) => redoTranslation.options?.[option] ? (
                            <div
                              key={option}
                              data-testid={`review-redo-option-translation-${option}`}
                              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600"
                            >
                              <span className="font-black text-[#003178]">{option}.</span> {redoTranslation.options[option]}
                            </div>
                          ) : null)}
                        </div>
                      ) : null}
                      {redoTranslation.context ? (
                        <p data-testid="review-redo-context-translation" className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
                          原文/证据句：{redoTranslation.context}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-2xl bg-white p-3">
                      <div className="text-xs font-black text-[#003178]">参考思路</div>
                      <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">{activeTask.recallAnswer}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <div className="text-xs font-black text-[#003178]">关键记忆点</div>
                      <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">{activeTask.clozeAnswer}</p>
                    </div>
                  </div>

                  {activeTask.chunks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeTask.chunks.map((chunk) => (
                        <span key={chunk} className="rounded-full border border-[#cfe6f2] bg-white px-3 py-1.5 text-xs font-black text-[#003178]">
                          {chunk}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <textarea
                    value={noteAnswer}
                    onChange={(event) => setNoteAnswer(event.target.value)}
                    rows={3}
                    data-testid="review-note-answer"
                    placeholder="可选：补一句错因或下次策略。不写也可以直接自评完成。"
                    className="w-full rounded-2xl border border-amber-200 bg-white p-4 text-sm font-semibold leading-7 outline-none transition focus:border-amber-600"
                  />
                </section>
              ) : null}

              <section className="grid gap-3 lg:grid-cols-3">
                {REVIEW_OUTCOMES.map((outcome) => (
                  <button
                    key={outcome.value}
                    type="button"
                    disabled={isSaving || !feedbackVisible}
                    data-testid={`review-outcome-${outcome.value}`}
                    onClick={() => completeReview(outcome.value)}
                    className={`min-h-24 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${outcome.className}`}
                  >
                    <span className="block text-base font-black">{outcome.label}</span>
                    <span className="mt-2 block text-xs font-semibold leading-5">{outcome.body}</span>
                  </button>
                ))}
              </section>
            </main>

            <aside className="space-y-4">
              <section className="ui-panel">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-[#003178]">
                  <Target className="h-4 w-4" />
                  当前节奏
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-[#003178]" />
                    <div>
                      <span className="block text-xs font-bold text-slate-400">建议耗时</span>
                      <strong className="text-slate-800">1-3 分钟</strong>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[#003178]"
                      style={{ width: `${activeReview.masteryScore ?? 35}%` }}
                    />
                  </div>
                </div>
              </section>

              <section data-testid="review-variant-recommendations" className="ui-panel">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-[#003178]">
                  <RefreshCw className="h-4 w-4" />
                  同类变式推荐
                </h4>
                <div className="space-y-2">
                  {variantRecommendations.map((recommendation) => (
                    <button
                      key={recommendation.id}
                      type="button"
                      onClick={() => onStartVariantPractice?.(recommendation.moduleId)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-[#003178] hover:bg-white"
                    >
                      <span className="block text-xs font-black text-slate-900">{recommendation.title}</span>
                      <span className="mt-1 block text-[11px] font-semibold leading-5 text-slate-500">{recommendation.reason}</span>
                      <span className="mt-2 inline-flex rounded-full bg-[#eef7fc] px-2.5 py-1 text-[10px] font-black text-[#003178]">
                        {recommendation.actionLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="ui-panel">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-[#003178]">
                  <ListTodo className="h-4 w-4" />
                  队列
                </h4>
                <div className="space-y-2">
                  {availableReviewItems.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      data-testid="review-queue-item"
                      onClick={() => selectReviewItem(item.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        item.id === activeReview.id
                          ? 'border-[#003178] bg-[#eef7fc]'
                          : 'border-slate-200 bg-slate-50 hover:border-[#003178] hover:bg-white'
                      }`}
                    >
                      <span className="block truncate text-xs font-black text-slate-900">{item.title}</span>
                      <span className="mt-1 block text-[11px] font-semibold text-slate-500">
                        {item.masteryScore ?? 35}% · {formatReviewDate(item.nextReviewAt)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        ) : (
          <section className="ui-panel">
            <div className="ui-empty-state text-sm font-semibold leading-7">
              今天没有到期复习项。先完成专项训练或模考。
              {upcomingReviewItems.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-[#cfe6f2] bg-[#f8fbff] px-4 py-3 text-xs font-bold leading-6 text-[#003178]">
                  还有 {upcomingReviewItems.length} 条未到期复习项，最早 {formatReviewDate(upcomingReviewItems[0].nextReviewAt)} 再出现。
                </div>
              ) : null}
            </div>
          </section>
        )}

        <details className="ui-panel group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#003178]">
              <AlertCircle className="h-4 w-4" />
              复习规则
            </h3>
            <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              ['重做', '先做当前到期题。'],
              ['核对', '看正确答案和上次答案。'],
              ['自评', '选择掌握状态。'],
              ['调度', '更新下次复习时间。'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl bg-[#f8fbfd] p-4">
                <strong className="text-sm text-slate-900">{title}</strong>
                <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
