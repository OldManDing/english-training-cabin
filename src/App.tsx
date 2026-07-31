/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import TodayDashboard from './components/TodayDashboard';
import AuthGate from './components/AuthGate';
import { ActiveTab, Attempt, DailyPlan, Passage, PracticeCompletionReport, PracticeSession, ReviewCompletionEvidence, ReviewItem, SkillProfile, StudyGoal } from './types';
import { CET4_VOCABULARY_BANK, INITIAL_PASSAGE } from './data';
import {
  CET4_CLOZE_PRACTICE_QUESTIONS,
  CET4_GRAMMAR_PRACTICE_QUESTIONS,
  CET4_LISTENING_PRACTICE_QUESTIONS,
  CET4_READING_BANK,
  type Cet4MockChoiceQuestion,
} from './questionBank';
import {
  GRAMMAR_STRUCTURE_TOPIC_GUIDES,
  getGrammarStructureTopicByFocus,
  orderGrammarStructureQuestions,
  type GrammarStructureTopicId,
} from './domain/practice/grammarStructureGuides';
import { Cloud, CloudOff, LoaderCircle, Sparkles, X } from 'lucide-react';
import {
  completeReviewItem,
  getOrCreateActiveGoal,
  loadAttempts,
  loadPracticeSessions,
  loadReviewItems,
  loadSkillProfiles,
  persistPracticeCompletion,
  persistSkillProfiles,
  upsertActiveGoal,
} from './lib/storage/db';
import {
  syncAllLocalLearningData,
  synchronizeAuthoritativeLearningData,
  syncLearningEntityIds,
  type LearningEntityIds,
} from './lib/storage/authoritativeLearningSync';
import { buildDailyPlan } from './domain/planner/dailyPlan';
import { buildReviewGateStatus } from './domain/review/reviewGate';
import { getDueWrongQuestionReviewItemsOn } from './domain/review/reviewQueue';
import { trackTelemetry } from './lib/telemetry';
import { getStoredAuthToken } from './lib/api';
import { OnboardingDiagnosticReport } from './domain/diagnostic/onboardingDiagnostic';
import { getExamRegistryEntry } from './exams/registry';
import {
  buildUnpracticedReadingPassages,
  filterPassageForUnpracticedQuestions,
  filterUnpracticedItems,
  findLatestPracticeAttempt,
  getPracticedQuestionIds,
  countPracticeAttemptsOnLocalDate,
  mergePracticeProgressAttempts,
} from './domain/practice/practicedQuestions';
import { buildDraftPracticeAttempts } from './domain/practice/draftAttempts';
import {
  loadPracticeDraft,
  practiceDraftKeys,
  PRACTICE_DRAFT_SYNC_EVENT,
  synchronizePracticeDrafts,
  type PracticeDraftSyncState,
  type VocabularyPracticeDraft,
} from './domain/practice/draftProgress';

const ReadingTraining = lazy(() => import('./components/ReadingTraining'));
const PracticeHub = lazy(() => import('./components/PracticeHub'));
const SpeakingTraining = lazy(() => import('./components/SpeakingTraining'));
const SubjectiveTraining = lazy(() => import('./components/SubjectiveTraining'));
const ReviewSection = lazy(() => import('./components/ReviewSection'));
const ProgressSection = lazy(() => import('./components/ProgressSection'));
const MaterialImporter = lazy(() => import('./components/MaterialImporter'));
const OnboardingDiagnostic = lazy(() => import('./components/OnboardingDiagnostic'));
const ListeningTraining = lazy(() => import('./components/ListeningTraining'));
const SettingsSection = lazy(() => import('./components/SettingsSection'));
const VocabularyTraining = lazy(() => import('./components/VocabularyTraining'));
const MockExam = lazy(() => import('./components/MockExam'));

const LISTENING_QUESTION_LEGACY_IDS = new Map(
  CET4_LISTENING_PRACTICE_QUESTIONS
    .filter((question) => question.questionTypeId === 'long-conversation')
    .map((question, index) => [String(question.id), String(index + 1)]),
);

function getDaysRemaining(examDate?: string): number {
  if (!examDate) return 0;
  const today = new Date();
  const target = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.ceil((target.getTime() - todayStart.getTime()) / 86400000));
}

function isPastExamDate(examDate?: string): boolean {
  if (!examDate) return false;
  const target = new Date(`${examDate}T23:59:59`);
  return !Number.isNaN(target.getTime()) && target.getTime() < Date.now();
}

function countDueReviews(reviewItems: ReviewItem[]): number {
  return getDueWrongQuestionReviewItemsOn(reviewItems).length;
}

function estimateCetScore(skillProfiles: SkillProfile[]): number | undefined {
  if (skillProfiles.length === 0) return undefined;
  const latestBySkill = new Map<SkillProfile['skillArea'], SkillProfile>();
  skillProfiles.forEach((profile) => {
    const current = latestBySkill.get(profile.skillArea);
    if (!current || profile.lastUpdatedAt > current.lastUpdatedAt) {
      latestBySkill.set(profile.skillArea, profile);
    }
  });

  const weightedProfiles = [
    { skill: 'writing' as const, weight: 0.15 },
    { skill: 'listening' as const, weight: 0.35 },
    { skill: 'reading' as const, weight: 0.35 },
    { skill: 'translation' as const, weight: 0.15 },
  ];
  const available = weightedProfiles.filter((item) => latestBySkill.has(item.skill));
  if (available.length < 3) return undefined;

  const normalizedWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const abilityScore = available.reduce((sum, item) => {
    return sum + (latestBySkill.get(item.skill)?.score ?? 0) * item.weight;
  }, 0) / normalizedWeight;

  return Math.round(Math.max(300, Math.min(710, 300 + abilityScore * 4.1)));
}

function hasRestorableVocabularyDraft() {
  const draft = loadPracticeDraft<VocabularyPracticeDraft>(practiceDraftKeys.vocabulary);
  return draft?.version === 1;
}

function resetViewportScroll() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.querySelector('main')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function buildChoiceQuestionPassage(params: {
  id: string;
  title: string;
  content: string;
  questions: Array<Cet4MockChoiceQuestion & { displayNumber?: number }>;
  questionLimit?: number;
}): Passage {
  const selectedQuestions = params.questions.slice(0, params.questionLimit ?? params.questions.length);

  return {
    id: params.id,
    examId: 'cet4',
    moduleId: 'grammar',
    title: params.title,
    content: params.content,
    questions: selectedQuestions.map((question) => ({
      id: question.id,
      examId: 'cet4',
      moduleId: question.moduleId,
      questionTypeId: question.questionTypeId,
      question: question.prompt,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      type: question.trapType ?? question.title,
      trapType: question.trapType,
      tags: [question.trapType ?? question.questionTypeId],
      difficulty: 3,
      displayNumber: question.displayNumber,
      sourceType: 'original',
      correctSentence: question.correctSentence,
    })),
  };
}

function takePassageQuestionBatch(passage: Passage, questionLimit: number): Passage {
  return {
    ...passage,
    questions: passage.questions.slice(0, questionLimit),
  };
}

const ORDERED_CET4_GRAMMAR_PRACTICE_QUESTIONS = orderGrammarStructureQuestions(CET4_GRAMMAR_PRACTICE_QUESTIONS);
const NUMBERED_CET4_GRAMMAR_PRACTICE_QUESTIONS = CET4_GRAMMAR_PRACTICE_QUESTIONS.map((question, index) => ({
  ...question,
  displayNumber: index + 1,
}));
const GRAMMAR_STRUCTURE_BATCH_SIZE = 40;

const CET4_GRAMMAR_STRUCTURE_PASSAGE = buildChoiceQuestionPassage({
  id: 'cet4-grammar-structure-practice',
  title: '语法结构与固定搭配专项',
  content: '本组题用于训练时态、语态、非谓语、从句、连接词和固定搭配。诊断显示语法薄弱时，系统会优先推荐这一组。',
  questions: ORDERED_CET4_GRAMMAR_PRACTICE_QUESTIONS,
  questionLimit: 40,
});

const CET4_CLOZE_CONTEXT_PASSAGE = buildChoiceQuestionPassage({
  id: 'cet4-cloze-context-practice',
  title: '完形/选词填空语境专项',
  content: '本组题用于训练上下文线索、词义辨析、固定搭配和句际逻辑。诊断显示词汇语境或完形薄弱时，系统会优先推荐这一组。',
  questions: CET4_CLOZE_PRACTICE_QUESTIONS,
  questionLimit: 8,
});

const CET4_GRAMMAR_STRUCTURE_FULL_PASSAGE = buildChoiceQuestionPassage({
  ...CET4_GRAMMAR_STRUCTURE_PASSAGE,
  questions: ORDERED_CET4_GRAMMAR_PRACTICE_QUESTIONS,
});

const CET4_GRAMMAR_STRUCTURE_NUMBERED_PASSAGE = buildChoiceQuestionPassage({
  ...CET4_GRAMMAR_STRUCTURE_PASSAGE,
  questions: NUMBERED_CET4_GRAMMAR_PRACTICE_QUESTIONS,
});

const CET4_CLOZE_CONTEXT_FULL_PASSAGE = buildChoiceQuestionPassage({
  ...CET4_CLOZE_CONTEXT_PASSAGE,
  questions: CET4_CLOZE_PRACTICE_QUESTIONS,
});

function buildGrammarTopicPassage(topicId: GrammarStructureTopicId, attempts: Attempt[]): Passage | null {
  const topic = GRAMMAR_STRUCTURE_TOPIC_GUIDES.find((item) => item.id === topicId);
  if (!topic) return null;

  const topicQuestions = ORDERED_CET4_GRAMMAR_PRACTICE_QUESTIONS.filter(
    (question) => getGrammarStructureTopicByFocus(question.trapType).id === topic.id,
  );
  if (topicQuestions.length === 0) return null;

  const passage = buildChoiceQuestionPassage({
    id: `cet4-grammar-structure-practice-${topic.id}`,
    title: `语法结构 · ${topic.label}`,
    content: `${topic.cue} ${topic.checkpoint}`,
    questions: topicQuestions,
  });

  return filterPassageForUnpracticedQuestions(passage, attempts) ?? passage;
}

type PracticeJumpTarget = {
  moduleId: 'vocabulary' | 'cloze' | 'grammar' | 'reading' | 'listening' | 'writing' | 'translation';
  questionId: string;
  replayAttempt?: Attempt;
};

type LearningSyncState = 'syncing' | 'synced' | 'pending';

function WorkspaceLoadingFallback() {
  return (
    <div className="app-page-surface flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="ui-panel max-w-xs text-center">
        <div className="mx-auto mb-3 h-2 w-24 overflow-hidden rounded-full bg-[#e3f2fd]">
          <div className="h-full w-1/2 rounded-full bg-[#003178] motion-safe:animate-pulse" />
        </div>
        <p className="text-xs font-black text-[#003178]">正在加载学习模块</p>
      </div>
    </div>
  );
}

function StudyApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [activeGoal, setActiveGoal] = useState<StudyGoal | null>(null);
  const [reviewItemCount, setReviewItemCount] = useState(0);
  const [persistedReviewItems, setPersistedReviewItems] = useState<ReviewItem[]>([]);
  const [persistedSkillProfiles, setPersistedSkillProfiles] = useState<SkillProfile[]>([]);
  const [persistedPracticeSessions, setPersistedPracticeSessions] = useState<PracticeSession[]>([]);
  const [persistedAttempts, setPersistedAttempts] = useState<Attempt[]>([]);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [customPassage, setCustomPassage] = useState<Passage>(INITIAL_PASSAGE);
  const [isPracticing, setIsPracticing] = useState(false);
  const [isListeningPracticing, setIsListeningPracticing] = useState(false);
  const [isVocabularyPracticing, setIsVocabularyPracticing] = useState(false);
  const [subjectivePracticeMode, setSubjectivePracticeMode] = useState<'writing' | 'translation' | null>(null);
  const [practiceJumpTarget, setPracticeJumpTarget] = useState<PracticeJumpTarget | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dailyStrategy, setDailyStrategy] = useState<'efficient' | 'review'>('efficient');
  const [targetScoreLimit, setTargetScoreLimit] = useState<number | undefined>(undefined);
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);
  const [learningSyncState, setLearningSyncState] = useState<LearningSyncState>('syncing');
  const [draftSyncState, setDraftSyncState] = useState<PracticeDraftSyncState>('syncing');
  const [learningRecoveryNotice, setLearningRecoveryNotice] = useState<string | null>(null);

  const handleTriggerModal = (title: string, body: string) => {
    setModalContent({ title, body });
  };
  
  const [readingProgress, setReadingProgress] = useState<{ completed: boolean; score?: number }>({
    completed: false
  });
  const [speakingScoreChange, setSpeakingScoreChange] = useState<{ from: number; to: number } | undefined>(undefined);
  const examCountdown = getDaysRemaining(activeGoal?.examDate);
  const examDateExpired = isPastExamDate(activeGoal?.examDate);
  const activeExamId = activeGoal?.examId ?? 'cet4';
  const activeExamName = getExamRegistryEntry(activeExamId)?.profile.name ?? 'CET-4';
  const estimatedScore = estimateCetScore(persistedSkillProfiles);
  const abilityEvidenceCount = persistedSkillProfiles.reduce((sum, profile) => sum + profile.evidenceCount, 0);
  const reviewGateStatus = buildReviewGateStatus(persistedReviewItems);
  const effectiveLearningSyncState: LearningSyncState = learningSyncState === 'pending' || draftSyncState === 'pending'
    ? 'pending'
    : learningSyncState === 'syncing' || draftSyncState === 'syncing'
      ? 'syncing'
      : 'synced';
  const unpracticedVocabularyItems = useMemo(
    () => filterUnpracticedItems(CET4_VOCABULARY_BANK, persistedAttempts, 'vocabulary'),
    [persistedAttempts],
  );
  const vocabularyPracticeItems = practiceJumpTarget?.moduleId === 'vocabulary' || hasRestorableVocabularyDraft()
    ? CET4_VOCABULARY_BANK
    : unpracticedVocabularyItems;
  const unpracticedReadingPassages = useMemo(
    () => buildUnpracticedReadingPassages(CET4_READING_BANK, persistedAttempts),
    [persistedAttempts],
  );
  const preferredReadingPassage = unpracticedReadingPassages[0] ?? INITIAL_PASSAGE;
  const unpracticedGrammarPassage = useMemo(
    () => takePassageQuestionBatch(
      filterPassageForUnpracticedQuestions(CET4_GRAMMAR_STRUCTURE_FULL_PASSAGE, persistedAttempts)
        ?? CET4_GRAMMAR_STRUCTURE_FULL_PASSAGE,
      GRAMMAR_STRUCTURE_BATCH_SIZE,
    ),
    [persistedAttempts],
  );
  const grammarTopicPassages = useMemo(() => {
    return new Map(
      GRAMMAR_STRUCTURE_TOPIC_GUIDES.map((topic) => [
        topic.id,
        buildGrammarTopicPassage(topic.id, persistedAttempts),
      ]),
    );
  }, [persistedAttempts]);
  const unpracticedClozePassage = useMemo(
    () => filterPassageForUnpracticedQuestions(CET4_CLOZE_CONTEXT_PASSAGE, persistedAttempts)
      ?? CET4_CLOZE_CONTEXT_PASSAGE,
    [persistedAttempts],
  );
  const practicedListeningQuestionIds = useMemo(
    () => getPracticedQuestionIds(persistedAttempts, 'listening'),
    [persistedAttempts],
  );
  const visiblePracticeAttempts = useMemo(() => mergePracticeProgressAttempts({
    persistedAttempts,
    draftAttempts: buildDraftPracticeAttempts({
      persistedAttempts,
      readingPassages: CET4_READING_BANK,
    }),
  }), [activeTab, isListeningPracticing, isPracticing, isVocabularyPracticing, persistedAttempts, subjectivePracticeMode]);
  const todayAnsweredQuestionCount = useMemo(
    () => countPracticeAttemptsOnLocalDate(persistedAttempts),
    [persistedAttempts],
  );
  const practiceJumpAttempt = useMemo(() => {
    if (!practiceJumpTarget) return undefined;
    if (practiceJumpTarget.replayAttempt) return practiceJumpTarget.replayAttempt;
    const legacyListeningId = practiceJumpTarget.moduleId === 'listening'
      ? LISTENING_QUESTION_LEGACY_IDS.get(String(practiceJumpTarget.questionId))
      : undefined;
    return findLatestPracticeAttempt({
      attempts: visiblePracticeAttempts,
      moduleId: practiceJumpTarget.moduleId,
      questionId: practiceJumpTarget.questionId,
      legacyQuestionIds: legacyListeningId ? [legacyListeningId] : undefined,
    });
  }, [practiceJumpTarget, visiblePracticeAttempts]);

  useEffect(() => {
    resetViewportScroll();
  }, []);

  useEffect(() => {
    resetViewportScroll();
  }, [activeTab, showOnboarding, isPracticing, isListeningPracticing, isVocabularyPracticing, subjectivePracticeMode]);

  const noteReviewGateBypass = (requestedLabel: string) => {
    if (!reviewGateStatus.locked) return;

    trackTelemetry('review_gate_bypassed', {
      requestedLabel,
      dueCount: reviewGateStatus.dueCount,
      remainingRequired: reviewGateStatus.remainingRequired,
    });
  };

  const showReviewGateModal = (requestedLabel: string) => {
    handleTriggerModal(
      '先完成今日复习',
      `当前还有 ${reviewGateStatus.remainingRequired} 条到期复习未完成。先处理复习队列，再进入${requestedLabel}。`,
    );
  };

  const startLearningWithReviewReminder = (requestedLabel: string, start: () => void) => {
    if (reviewGateStatus.locked) {
      noteReviewGateBypass(requestedLabel);
      showReviewGateModal(requestedLabel);
      setActiveTab('review');
      return;
    }
    start();
  };

  const handleSetActiveTab = (tab: ActiveTab) => {
    const gatedLabels: Partial<Record<ActiveTab, string>> = {
      mock: '阶段模考',
      speaking: '口语重说',
    };
    const requestedLabel = gatedLabels[tab];

    if (requestedLabel && reviewGateStatus.locked) {
      noteReviewGateBypass(requestedLabel);
      showReviewGateModal(requestedLabel);
      setActiveTab('review');
      return;
    }
    setActiveTab(tab);
  };

  const refreshStudyState = useCallback(async () => {
    const [goal, reviewItems, skillProfiles, practiceSessions, attempts] = await Promise.all([
      getOrCreateActiveGoal(),
      loadReviewItems(),
      loadSkillProfiles(),
      loadPracticeSessions(),
      loadAttempts(),
    ]);
    setActiveGoal(goal);
    setTargetScoreLimit(goal.targetScore);
    setReviewItemCount(countDueReviews(reviewItems));
    setPersistedReviewItems(reviewItems);
    setPersistedSkillProfiles(skillProfiles);
    setPersistedPracticeSessions(practiceSessions);
    setPersistedAttempts(attempts);
  }, []);

  const confirmLearningEntities = async (ids: LearningEntityIds): Promise<void> => {
    setLearningSyncState('syncing');
    try {
      await syncLearningEntityIds(ids);
      setLearningSyncState('synced');
    } catch (error) {
      console.error('Failed to confirm learning data on server:', error);
      trackTelemetry('client_error', { area: 'learning_entity_sync' });
      setLearningSyncState('pending');
      throw error;
    }
  };

  useEffect(() => {
    if (!activeGoal) return;

    setDailyPlan(buildDailyPlan({
      goal: activeGoal,
      reviewItems: persistedReviewItems,
      skillProfiles: persistedSkillProfiles,
      strategy: dailyStrategy,
    }));
  }, [activeGoal, persistedReviewItems, persistedSkillProfiles, dailyStrategy]);

  useEffect(() => {
    trackTelemetry('section_viewed', { section: activeTab });
  }, [activeTab]);

  useEffect(() => {
    const handleDraftSyncState = (event: Event) => {
      const state = (event as CustomEvent<{ state?: PracticeDraftSyncState }>).detail?.state;
      if (state) setDraftSyncState(state);
    };
    window.addEventListener(PRACTICE_DRAFT_SYNC_EVENT, handleDraftSyncState);
    return () => window.removeEventListener(PRACTICE_DRAFT_SYNC_EVENT, handleDraftSyncState);
  }, []);

  useEffect(() => {
    if (!learningRecoveryNotice) return;
    const timer = window.setTimeout(() => setLearningRecoveryNotice(null), 8_000);
    return () => window.clearTimeout(timer);
  }, [learningRecoveryNotice]);

  useEffect(() => {
    let mounted = true;

    async function loadStudyState() {
      const token = getStoredAuthToken();
      let initialSyncFailed = false;
      if (token) {
        try {
          await synchronizePracticeDrafts(token);
          if (mounted) setDraftSyncState('synced');
        } catch (error) {
          console.warn('Failed to synchronize active practice drafts:', error);
          if (mounted) setDraftSyncState('pending');
        }
        try {
          const syncResult = await synchronizeAuthoritativeLearningData(token);
          if (mounted) {
            setLearningSyncState('synced');
          }
          const recoveredEvidenceCount = syncResult.mergedCounts.practiceSessions
            + syncResult.mergedCounts.attempts
            + syncResult.mergedCounts.reviewItems
            + syncResult.mergedCounts.skillProfiles;
          if (mounted && syncResult.downloadedEntities > 0 && recoveredEvidenceCount > 0) {
            setLearningRecoveryNotice(
              `已从服务器恢复：练习 ${syncResult.mergedCounts.practiceSessions} 组、答题 ${syncResult.mergedCounts.attempts} 条、复习 ${syncResult.mergedCounts.reviewItems} 项、画像 ${syncResult.mergedCounts.skillProfiles} 项`,
            );
          }
        } catch (error) {
          initialSyncFailed = true;
          console.error('Failed to synchronize authoritative learning data:', error);
          if (mounted) setLearningSyncState('pending');
          trackTelemetry('client_error', { area: 'authoritative_learning_sync' });
        }
      }

      const [goal, reviewItems, skillProfiles, practiceSessions, attempts] = await Promise.all([
        getOrCreateActiveGoal(),
        loadReviewItems(),
        loadSkillProfiles(),
        loadPracticeSessions(),
        loadAttempts(),
      ]);
      if (!mounted) return;
      setActiveGoal(goal);
      setTargetScoreLimit(goal.targetScore);
      setReviewItemCount(countDueReviews(reviewItems));
      setPersistedReviewItems(reviewItems);
      setPersistedSkillProfiles(skillProfiles);
      setPersistedPracticeSessions(practiceSessions);
      setPersistedAttempts(attempts);
      if (token) {
        try {
          if (initialSyncFailed) {
            await synchronizeAuthoritativeLearningData(token);
          } else {
            await syncLearningEntityIds({ studyGoalIds: [goal.id] }, token);
          }
          if (mounted) setLearningSyncState('synced');
        } catch (error) {
          console.error('Failed to persist default study goal:', error);
          if (mounted) setLearningSyncState('pending');
        }
      } else if (mounted) {
        setLearningSyncState('pending');
        setDraftSyncState('pending');
      }
    }

    loadStudyState().catch((error) => {
      console.error('Failed to load local study state:', error);
      trackTelemetry('client_error', { area: 'local_storage_load' });
      handleTriggerModal('离线副本读取失败', '系统暂时无法读取当前浏览器的离线副本。已在服务器确认的记录不会丢失；本次尚未确认的新进度请等待连接恢复后再继续。');
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (learningSyncState !== 'pending' && draftSyncState !== 'pending') return;

    let retrying = false;
    const retryPendingLearningData = async () => {
      if (retrying || !navigator.onLine) return;
      const token = getStoredAuthToken();
      if (!token) return;
      retrying = true;
      setLearningSyncState('syncing');
      setDraftSyncState('syncing');
      try {
        await Promise.all([
          synchronizeAuthoritativeLearningData(token),
          synchronizePracticeDrafts(token),
        ]);
        setLearningSyncState('synced');
        setDraftSyncState('synced');
      } catch (error) {
        console.error('Failed to retry pending learning data:', error);
        setLearningSyncState('pending');
        setDraftSyncState('pending');
      } finally {
        retrying = false;
      }
    };

    window.addEventListener('online', retryPendingLearningData);
    const retryTimer = window.setInterval(retryPendingLearningData, 30_000);
    return () => {
      window.removeEventListener('online', retryPendingLearningData);
      window.clearInterval(retryTimer);
    };
  }, [draftSyncState, learningSyncState]);

  const persistCompletionReport = async (report: PracticeCompletionReport) => {
    await persistPracticeCompletion(report);
    await confirmLearningEntities({
      practiceSessionIds: [report.session.id],
      attemptIds: report.attempts.map((attempt) => attempt.id),
      reviewItemIds: report.reviewItems.map((reviewItem) => reviewItem.id),
      skillProfileIds: report.skillProfiles.map((profile) => profile.id),
    });
    const [reviewItems, skillProfiles, practiceSessions, attempts] = await Promise.all([
      loadReviewItems(),
      loadSkillProfiles(),
      loadPracticeSessions(),
      loadAttempts(),
    ]);
    setReviewItemCount(countDueReviews(reviewItems));
    setPersistedReviewItems(reviewItems);
    setPersistedSkillProfiles(skillProfiles);
    setPersistedPracticeSessions(practiceSessions);
    setPersistedAttempts(attempts);
  };

  const handleCompleteReviewItem = async (reviewItemId: string, evidence: ReviewCompletionEvidence) => {
    const records = await completeReviewItem(reviewItemId, evidence);
    if (!records) return;
    await confirmLearningEntities({
      practiceSessionIds: [records.session.id],
      attemptIds: [records.attempt.id],
      reviewItemIds: [records.reviewItem.id],
      skillProfileIds: records.skillProfile ? [records.skillProfile.id] : [],
    });
    await refreshStudyState();
    trackTelemetry('practice_completed', {
      mode: 'scheduled-review',
      moduleId: 'review',
      reviewItems: 1,
    });
  };

  const handleSetGoalTarget = (score: number) => {
    setTargetScoreLimit(score);
    upsertActiveGoal({ targetScore: score })
      .then(async (goal) => {
        setActiveGoal(goal);
        await confirmLearningEntities({ studyGoalIds: [goal.id] });
      })
      .catch((error) => {
        console.error('Failed to save target score:', error);
        trackTelemetry('client_error', { area: 'target_score_save' });
        handleTriggerModal('目标保存失败', '目标分数已保留在当前浏览器，但服务器尚未确认。请稍后重试。');
      });
  };

  const handleSaveSettings = async (settings: {
    examType: string;
    examDate: string;
    prepareSpeaking: boolean;
    targetScore: number;
    dailyTargetMinutes: number;
    whisperNoiseReduction: boolean;
  }) => {
    const prioritySkills: StudyGoal['prioritySkills'] = settings.prepareSpeaking
      ? ['reading', 'listening', 'writing', 'translation', 'speaking']
      : ['reading', 'listening', 'writing', 'translation'];

    try {
      const goal = await upsertActiveGoal({
        examId: settings.examType === 'CET-4' ? 'cet4' : settings.examType.toLowerCase(),
        examDate: settings.examDate,
        targetScore: settings.targetScore,
        dailyMinutes: settings.dailyTargetMinutes,
        prioritySkills,
        recordingQualityReminder: settings.whisperNoiseReduction,
      });
      await confirmLearningEntities({
        studyGoalIds: [goal.id],
      });
      setActiveGoal(goal);
      setTargetScoreLimit(goal.targetScore);
      await refreshStudyState();
    } catch (error) {
      console.error('Failed to save study settings:', error);
      trackTelemetry('client_error', { area: 'study_settings_save' });
      handleTriggerModal('学习计划保存失败', '设置已保留在当前浏览器，但服务器尚未确认。请保持页面打开，等待自动重试后再离开。');
      throw error;
    }
  };

  const handleCompleteDiagnostic = async (result: {
    examId: string;
    targetScore: number;
    examDate: string;
    dailyMinutes: number;
    prioritySkills: StudyGoal['prioritySkills'];
    skillProfiles: SkillProfile[];
    diagnosticReport?: OnboardingDiagnosticReport;
  }) => {
    try {
      const goal = await upsertActiveGoal({
        examId: result.examId,
        targetScore: result.targetScore,
        examDate: result.examDate,
        dailyMinutes: result.dailyMinutes,
        prioritySkills: result.prioritySkills,
      });
      if (result.diagnosticReport) {
        const report: PracticeCompletionReport = {
          session: {
            ...result.diagnosticReport.session,
            goalId: goal.id,
          },
          attempts: result.diagnosticReport.attempts,
          reviewItems: result.diagnosticReport.reviewItems,
          skillProfiles: result.diagnosticReport.skillProfiles,
        };
        await persistPracticeCompletion(report);
        await confirmLearningEntities({
          studyGoalIds: [goal.id],
          practiceSessionIds: [report.session.id],
          attemptIds: report.attempts.map((attempt) => attempt.id),
          reviewItemIds: report.reviewItems.map((reviewItem) => reviewItem.id),
          skillProfileIds: report.skillProfiles.map((profile) => profile.id),
        });
      } else {
        await persistSkillProfiles(result.skillProfiles);
        await confirmLearningEntities({
          studyGoalIds: [goal.id],
          skillProfileIds: result.skillProfiles.map((profile) => profile.id),
        });
      }
      setActiveGoal(goal);
      setTargetScoreLimit(goal.targetScore);
      await refreshStudyState();
      trackTelemetry('practice_completed', {
        mode: 'diagnostic',
        moduleId: 'onboarding',
        score: result.diagnosticReport?.averageScore
          ?? Math.round(result.skillProfiles.reduce((sum, item) => sum + item.score, 0) / Math.max(1, result.skillProfiles.length)),
        attempts: result.diagnosticReport?.attempts.length ?? result.skillProfiles.length,
        reviewItems: result.diagnosticReport?.reviewItems.length ?? 0,
      });
    } catch (error) {
      console.error('Failed to save onboarding diagnostic:', error);
      trackTelemetry('client_error', { area: 'onboarding_diagnostic_save' });
      handleTriggerModal('入门诊断保存失败', '诊断结果仍保留在当前页面，但服务器尚未确认能力证据。请重试保存后再离开。');
      throw error;
    }
  };

  const handleSelectPassage = (passageData: Passage, questionId?: string) => {
    setPracticeJumpTarget(questionId ? { moduleId: 'reading', questionId } : null);
    setCustomPassage(passageData);
    startLearningWithReviewReminder('仔细阅读训练', () => setIsPracticing(true));
  };

  const handleStartReadingPractice = () => {
    setPracticeJumpTarget(null);
    startLearningWithReviewReminder('仔细阅读训练', () => {
      setCustomPassage(preferredReadingPassage);
      setIsPracticing(true);
    });
  };

  const handleStartGrammarPractice = (questionId?: string, topicId?: GrammarStructureTopicId) => {
    const topic = topicId ? GRAMMAR_STRUCTURE_TOPIC_GUIDES.find((item) => item.id === topicId) : undefined;
    const topicPassage = topicId ? grammarTopicPassages.get(topicId) : undefined;
    setPracticeJumpTarget(questionId ? { moduleId: 'grammar', questionId } : null);
    setCustomPassage(questionId ? CET4_GRAMMAR_STRUCTURE_NUMBERED_PASSAGE : topicPassage ?? unpracticedGrammarPassage);
    startLearningWithReviewReminder(topic ? `${topic.label}训练` : '语法结构训练', () => setIsPracticing(true));
  };

  const handleStartClozePractice = (questionId?: string) => {
    setPracticeJumpTarget(questionId ? { moduleId: 'cloze', questionId } : null);
    setCustomPassage(questionId ? CET4_CLOZE_CONTEXT_FULL_PASSAGE : unpracticedClozePassage);
    startLearningWithReviewReminder('完形填空训练', () => setIsPracticing(true));
  };

  const handleStartVocabularyPractice = (questionId?: string, replayAttempt?: Attempt) => {
    setPracticeJumpTarget(questionId ? { moduleId: 'vocabulary', questionId, replayAttempt } : null);
    startLearningWithReviewReminder('单词练习', () => setIsVocabularyPracticing(true));
  };

  const handleStartListeningPractice = (questionId?: string) => {
    setPracticeJumpTarget(questionId ? { moduleId: 'listening', questionId } : null);
    startLearningWithReviewReminder('听力训练', () => setIsListeningPracticing(true));
  };

  const handleStartSubjectivePractice = (mode: 'writing' | 'translation', questionId?: string) => {
    setPracticeJumpTarget(questionId ? { moduleId: mode, questionId } : null);
    startLearningWithReviewReminder(mode === 'writing' ? '写作训练' : '翻译训练', () => setSubjectivePracticeMode(mode));
  };

  const handleStartVariantPractice = (moduleId: string) => {
    if (moduleId === 'vocabulary') {
      handleStartVocabularyPractice();
      return;
    }
    if (moduleId === 'grammar') {
      handleStartGrammarPractice();
      return;
    }
    if (moduleId === 'cloze') {
      handleStartClozePractice();
      return;
    }
    if (moduleId === 'listening') {
      handleStartListeningPractice();
      return;
    }
    if (moduleId === 'writing' || moduleId === 'translation') {
      handleStartSubjectivePractice(moduleId);
      return;
    }
    if (moduleId === 'mock') {
      startLearningWithReviewReminder('阶段模考', () => setActiveTab('mock'));
      return;
    }
    handleStartReadingPractice();
  };

  const handleBackFromPractice = () => {
    setPracticeJumpTarget(null);
    setIsPracticing(false);
    setIsListeningPracticing(false);
    setIsVocabularyPracticing(false);
    setSubjectivePracticeMode(null);
  };

  const completeAndShowProgress = async (score: number, report: PracticeCompletionReport, closePractice: () => void, errorArea: string, errorTitle: string, errorBody: string): Promise<boolean> => {
    trackTelemetry('practice_completed', {
      mode: report.session.modeId,
      moduleId: report.session.moduleId,
      score,
      attempts: report.attempts.length,
      reviewItems: report.reviewItems.length,
    });
    try {
      await persistCompletionReport(report);
      closePractice();
      setPracticeJumpTarget(null);
      setReadingProgress({ completed: true, score });
      setActiveTab('progress');
      return true;
    } catch (error) {
      console.error(`Failed to persist ${errorArea}:`, error);
      trackTelemetry('client_error', { area: errorArea });
      handleTriggerModal(errorTitle, errorBody);
      return false;
    }
  };

  const handleCompletePractice = (score: number, report: PracticeCompletionReport) => {
    return completeAndShowProgress(
      score,
      report,
      () => setIsPracticing(false),
      'choice_practice_persist',
      '作答记录保存失败',
      '本次作答仍保留在当前页面，但服务器尚未确认训练记录。页面不会退出或清除草稿，请稍后重试。',
    );
  };

  const handleCompleteSubjectivePractice = (score: number, report: PracticeCompletionReport) => {
    return completeAndShowProgress(
      score,
      report,
      () => setSubjectivePracticeMode(null),
      `${report.session.moduleId}_practice_persist`,
      '主观题记录保存失败',
      '本次反馈和草稿仍保留在当前页面，但服务器尚未确认错因和能力证据。请稍后重试。',
    );
  };

  const handleCompleteVocabularyPractice = (score: number, report: PracticeCompletionReport) => {
    return completeAndShowProgress(
      score,
      report,
      () => setIsVocabularyPracticing(false),
      'vocabulary_practice_persist',
      '词汇练习保存失败',
      '本次词汇作答仍保留在当前页面，但服务器尚未确认训练记录。请稍后重试。',
    );
  };

  const handleRecordVocabularyAnswer = async (report: PracticeCompletionReport) => {
    try {
      await persistCompletionReport(report);
    } catch (error) {
      console.error('Failed to persist vocabulary answer:', error);
      trackTelemetry('client_error', { area: 'vocabulary_answer_persist' });
      handleTriggerModal('词汇作答保存失败', '本题作答没有成功写入记录，请稍后重试。');
      throw error;
    }
  };

  const handleRecordChoiceAnswer = async (report: PracticeCompletionReport) => {
    try {
      await persistCompletionReport(report);
    } catch (error) {
      console.error('Failed to persist choice answer:', error);
      trackTelemetry('client_error', { area: 'choice_answer_persist' });
      handleTriggerModal('作答保存失败', '本题作答没有成功写入记录，请稍后重试。');
      throw error;
    }
  };

  const handleCompleteMockExam = (score: number, report: PracticeCompletionReport) => {
    return completeAndShowProgress(
      score,
      report,
      () => undefined,
      'mock_exam_persist',
      '阶段模考保存失败',
      '本次模考报告和草稿仍保留在当前页面，但服务器尚未确认阶段证据。请稍后重试。',
    );
  };

  const handleCompleteSpeakingPractice = async (report: PracticeCompletionReport) => {
    trackTelemetry('practice_completed', {
      mode: report.session.modeId,
      moduleId: report.session.moduleId,
      score: report.skillProfiles[0]?.score,
      attempts: report.attempts.length,
      reviewItems: report.reviewItems.length,
    });
    await persistCompletionReport(report);
  };

  const handleDataRestored = async () => {
    setLearningSyncState('syncing');
    try {
      await syncAllLocalLearningData();
      setLearningSyncState('synced');
    } catch (error) {
      console.error('Failed to persist restored learning data on server:', error);
      trackTelemetry('client_error', { area: 'restored_learning_data_sync' });
      setLearningSyncState('pending');
    }
    await refreshStudyState();
  };

  const handleServerDataRestored = async () => {
    setLearningSyncState('synced');
    await refreshStudyState();
  };

  // Render proper subviews
  const renderTabContent = () => {
    switch (activeTab) {
      case 'today':
        return (
          <TodayDashboard
            onStartReading={handleStartReadingPractice}
            onStartListening={handleStartListeningPractice}
            onStartWriting={() => handleStartSubjectivePractice('writing')}
            onStartTranslation={() => handleStartSubjectivePractice('translation')}
            onStartVocabulary={handleStartVocabularyPractice}
            onStartGrammar={handleStartGrammarPractice}
            onStartCloze={handleStartClozePractice}
            onStartMockExam={() => startLearningWithReviewReminder('阶段模考', () => setActiveTab('mock'))}
            onStartOnboarding={() => setShowOnboarding(true)}
            onViewReview={() => setActiveTab('review')}
            onViewHistory={() => setActiveTab('practice')}
            onStartSpeaking={() => startLearningWithReviewReminder('口语重说', () => setActiveTab('speaking'))}
            onOpenSettings={() => setActiveTab('settings')}
            onTriggerModal={handleTriggerModal}
            readingProgress={readingProgress}
            examCountdown={examCountdown}
            examDateExpired={examDateExpired}
            targetScore={activeGoal?.targetScore ?? targetScoreLimit ?? 550}
            estimatedScore={estimatedScore}
            abilityEvidenceCount={abilityEvidenceCount}
            dailyPlan={dailyPlan}
            reviewItemCount={reviewItemCount}
            answeredQuestionCount={todayAnsweredQuestionCount}
            reviewGateStatus={reviewGateStatus}
            skillProfiles={persistedSkillProfiles}
            persistedAttempts={visiblePracticeAttempts}
            persistedPracticeSessions={persistedPracticeSessions}
            persistedReviewItems={persistedReviewItems}
            targetExamName={activeExamName}
            strategy={dailyStrategy}
            onStrategyChange={setDailyStrategy}
          />
        );
      case 'practice':
        return (
          <PracticeHub
            onStartOnboarding={() => setShowOnboarding(true)}
            onStartVocabulary={handleStartVocabularyPractice}
            onStartGrammar={handleStartGrammarPractice}
            onStartCloze={handleStartClozePractice}
            onStartReading={handleSelectPassage}
            onStartListening={handleStartListeningPractice}
            onStartWriting={(questionId) => handleStartSubjectivePractice('writing', questionId)}
            onStartTranslation={(questionId) => handleStartSubjectivePractice('translation', questionId)}
            onStartMockExam={() => startLearningWithReviewReminder('阶段模考', () => setActiveTab('mock'))}
            examId={activeExamId}
            examName={activeExamName}
            skillProfiles={persistedSkillProfiles}
            dailyPlan={dailyPlan}
            readingPassages={unpracticedReadingPassages}
            persistedAttempts={persistedAttempts}
            persistedPracticeSessions={persistedPracticeSessions}
          />
        );
      case 'mock':
        return (
          <MockExam
            onBack={() => setActiveTab('today')}
            onComplete={handleCompleteMockExam}
            skillProfiles={persistedSkillProfiles}
            dailyPlan={dailyPlan}
          />
        );
      case 'review':
        return (
          <ReviewSection
            onTriggerModal={handleTriggerModal}
            persistedReviewItems={persistedReviewItems}
            reviewGateStatus={reviewGateStatus}
            onCompleteReviewItem={handleCompleteReviewItem}
            onStartVariantPractice={handleStartVariantPractice}
            onViewPractice={() => setActiveTab('practice')}
          />
        );
      case 'speaking':
        return (
          <SpeakingTraining
            onUpdateProgress={(scoreChange) => setSpeakingScoreChange(scoreChange)}
            onCompletePractice={handleCompleteSpeakingPractice}
          />
        );
      case 'progress':
        return (
          <ProgressSection
            scoreChange={speakingScoreChange}
            persistedSkillProfiles={persistedSkillProfiles}
            persistedPracticeSessions={persistedPracticeSessions}
            persistedAttempts={visiblePracticeAttempts}
            persistedReviewItems={persistedReviewItems}
            onStartDiagnostic={() => setShowOnboarding(true)}
          />
        );
      case 'import':
        return (
          <MaterialImporter
            onLoadCustomPassage={(passage) => {
              setCustomPassage(passage);
              startLearningWithReviewReminder('导入材料训练', () => setIsPracticing(true));
            }}
          />
        );
      case 'settings':
        return (
          <SettingsSection
            targetScoreLimit={targetScoreLimit || 550}
            initialExamId={activeExamId}
            initialExamDate={activeGoal?.examDate}
            initialDailyMinutes={activeGoal?.dailyMinutes}
            initialPrepareSpeaking={activeGoal?.prioritySkills.includes('speaking') ?? true}
            initialRecordingQualityReminder={activeGoal?.recordingQualityReminder ?? true}
            onSave={handleSaveSettings}
            onSetScoreLimit={handleSetGoalTarget}
            onTriggerModal={handleTriggerModal}
            onDataRestored={handleDataRestored}
            onServerDataRestored={handleServerDataRestored}
            onStartDiagnostic={() => setShowOnboarding(true)}
          />
        );
      default:
        return (
          <TodayDashboard
            onStartReading={handleStartReadingPractice}
            onStartListening={handleStartListeningPractice}
            onStartWriting={() => handleStartSubjectivePractice('writing')}
            onStartTranslation={() => handleStartSubjectivePractice('translation')}
            onStartVocabulary={handleStartVocabularyPractice}
            onStartGrammar={handleStartGrammarPractice}
            onStartCloze={handleStartClozePractice}
            onStartMockExam={() => startLearningWithReviewReminder('阶段模考', () => setActiveTab('mock'))}
            onStartOnboarding={() => setShowOnboarding(true)}
            onViewReview={() => setActiveTab('review')}
            onViewHistory={() => setActiveTab('practice')}
            onStartSpeaking={() => startLearningWithReviewReminder('口语重说', () => setActiveTab('speaking'))}
            onOpenSettings={() => setActiveTab('settings')}
            onTriggerModal={handleTriggerModal}
            readingProgress={readingProgress}
            examCountdown={examCountdown}
            examDateExpired={examDateExpired}
            targetScore={activeGoal?.targetScore ?? targetScoreLimit ?? 550}
            estimatedScore={estimatedScore}
            abilityEvidenceCount={abilityEvidenceCount}
            dailyPlan={dailyPlan}
            reviewItemCount={reviewItemCount}
            answeredQuestionCount={todayAnsweredQuestionCount}
            reviewGateStatus={reviewGateStatus}
            skillProfiles={persistedSkillProfiles}
            persistedAttempts={visiblePracticeAttempts}
            persistedPracticeSessions={persistedPracticeSessions}
            persistedReviewItems={persistedReviewItems}
            targetExamName={activeExamName}
            strategy={dailyStrategy}
            onStrategyChange={setDailyStrategy}
          />
        );
    }
  };

  return (
    <div className="app-page-surface min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans antialiased text-[#1e333c]">
      <div
        className={`pointer-events-none order-last mx-4 mb-4 flex min-h-9 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-bold shadow-sm sm:fixed sm:bottom-3 sm:right-3 sm:z-40 sm:m-0 sm:max-w-[calc(100vw-1.5rem)] ${
          effectiveLearningSyncState === 'pending'
            ? 'border-amber-300 text-amber-800'
            : effectiveLearningSyncState === 'syncing'
              ? 'border-slate-200 text-slate-600'
              : 'border-emerald-200 text-emerald-700'
        }`}
        role="status"
        aria-live="polite"
      >
        {effectiveLearningSyncState === 'pending' ? (
          <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : effectiveLearningSyncState === 'syncing' ? (
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <Cloud className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0 leading-4">
          {effectiveLearningSyncState === 'pending'
            ? '服务器未确认，正在自动重试'
            : effectiveLearningSyncState === 'syncing'
              ? '正在保存到服务器'
              : learningRecoveryNotice ?? '学习记录与草稿已保存到服务器'}
        </span>
      </div>
      {showOnboarding ? (
        <Suspense fallback={<WorkspaceLoadingFallback />}>
          <OnboardingDiagnostic
            onDismiss={() => setShowOnboarding(false)}
            onSetScoreLimit={(score) => {
              handleSetGoalTarget(score);
            }}
            onCompleteDiagnostic={handleCompleteDiagnostic}
          />
        </Suspense>
      ) : isListeningPracticing ? (
        <Suspense fallback={<WorkspaceLoadingFallback />}>
          <ListeningTraining
            initialQuestionId={practiceJumpTarget?.moduleId === 'listening' ? practiceJumpTarget.questionId : undefined}
            replayAttempt={practiceJumpTarget?.moduleId === 'listening' ? practiceJumpAttempt : undefined}
            practicedQuestionIds={practicedListeningQuestionIds}
            onBack={handleBackFromPractice}
            onAnswerRecorded={handleRecordChoiceAnswer}
              onComplete={(score, report) => {
                return completeAndShowProgress(
                  score,
                  report,
                  () => setIsListeningPracticing(false),
                'listening_practice_persist',
                '听力记录保存失败',
                '本次听力记录仍保留在当前页面，但服务器尚未确认训练记录。页面不会退出或清除草稿，请稍后重试。',
              );
            }}
          />
        </Suspense>
      ) : isVocabularyPracticing ? (
        <Suspense fallback={<WorkspaceLoadingFallback />}>
          <VocabularyTraining
            initialQuestionId={practiceJumpTarget?.moduleId === 'vocabulary' ? practiceJumpTarget.questionId : undefined}
            replayAttempt={practiceJumpTarget?.moduleId === 'vocabulary' ? practiceJumpAttempt : undefined}
            items={vocabularyPracticeItems}
            onBack={handleBackFromPractice}
            onComplete={handleCompleteVocabularyPractice}
            onAnswerRecorded={handleRecordVocabularyAnswer}
          />
        </Suspense>
      ) : isPracticing ? (
        <Suspense fallback={<WorkspaceLoadingFallback />}>
          <ReadingTraining
            key={`${customPassage.id}:${practiceJumpTarget?.moduleId ?? customPassage.moduleId ?? 'reading'}:${practiceJumpTarget?.questionId ?? 'default'}`}
            initialQuestionId={
              practiceJumpTarget?.moduleId === 'reading'
              || practiceJumpTarget?.moduleId === 'grammar'
              || practiceJumpTarget?.moduleId === 'cloze'
                ? practiceJumpTarget.questionId
                : undefined
            }
            replayAttempt={
              practiceJumpTarget?.moduleId === 'reading'
              || practiceJumpTarget?.moduleId === 'grammar'
              || practiceJumpTarget?.moduleId === 'cloze'
                ? practiceJumpAttempt
                : undefined
            }
            passage={customPassage}
            onBack={handleBackFromPractice}
            onComplete={handleCompletePractice}
            onAnswerRecorded={handleRecordChoiceAnswer}
          />
        </Suspense>
      ) : subjectivePracticeMode ? (
        <Suspense fallback={<WorkspaceLoadingFallback />}>
          <SubjectiveTraining
            initialPromptId={practiceJumpTarget?.moduleId === subjectivePracticeMode ? practiceJumpTarget.questionId : undefined}
            replayAttempt={practiceJumpTarget?.moduleId === subjectivePracticeMode ? practiceJumpAttempt : undefined}
            mode={subjectivePracticeMode}
            onBack={handleBackFromPractice}
            onComplete={handleCompleteSubjectivePractice}
          />
        </Suspense>
      ) : (
        <>
          <Sidebar
            activeTab={activeTab}
            setActiveTab={handleSetActiveTab}
            onTriggerModal={handleTriggerModal}
          />
          <main className="app-page-surface flex-1 min-w-0 flex flex-col min-h-0 lg:h-screen lg:overflow-hidden relative">
            <Suspense fallback={<WorkspaceLoadingFallback />}>
              {renderTabContent()}
            </Suspense>
          </main>
        </>
      )}

      {/* Premium Unified Custom Modal Component overlay */}
      {modalContent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-3xl p-4 sm:p-6.5 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col space-y-4 transition-all">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-extrabold text-[#003178] text-sm flex items-center gap-1.5 font-sans">
                <Sparkles className="h-5 w-5 text-amber-500 fill-amber-400 animate-pulse" />
                <span>{modalContent.title}</span>
              </h3>
              <button
                onClick={() => setModalContent(null)}
                aria-label="关闭提示"
                className="text-slate-400 hover:text-[#003178] p-3 sm:p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
            <div className="text-xs text-slate-600 font-semibold leading-relaxed whitespace-pre-line bg-slate-50/50 p-4.5 rounded-2xl border border-slate-200/50 max-h-[300px] overflow-y-auto font-sans">
              {modalContent.body}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalContent(null)}
                className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-[#003178] hover:bg-[#0d47a1] text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer pointer-events-auto transition-transform active:scale-[0.98]"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>
      <StudyApp />
    </AuthGate>
  );
}
