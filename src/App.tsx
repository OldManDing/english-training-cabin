/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import TodayDashboard from './components/TodayDashboard';
import AuthGate from './components/AuthGate';
import { ActiveTab, Attempt, DailyPlan, Passage, PracticeCompletionReport, PracticeSession, ReviewCompletionEvidence, ReviewItem, SkillProfile, StudyGoal } from './types';
import { CET4_VOCABULARY_BANK, INITIAL_PASSAGE } from './data';
import {
  CET4_CLOZE_PRACTICE_QUESTIONS,
  CET4_GRAMMAR_PRACTICE_QUESTIONS,
  CET4_READING_BANK,
  type Cet4MockChoiceQuestion,
} from './questionBank';
import { Sparkles, X } from 'lucide-react';
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
import { restoreCloudLearningDataWhenLocalEmpty } from './lib/storage/cloudLearningAutoRestore';
import { buildDailyPlan } from './domain/planner/dailyPlan';
import { buildReviewGateStatus } from './domain/review/reviewGate';
import { getDueWrongQuestionReviewItems } from './domain/review/reviewQueue';
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

function getDaysRemaining(examDate?: string): number {
  if (!examDate) return 0;
  const today = new Date();
  const target = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.ceil((target.getTime() - todayStart.getTime()) / 86400000));
}

function countDueReviews(reviewItems: ReviewItem[]): number {
  return getDueWrongQuestionReviewItems(reviewItems).length;
}

function levelToProfileScore(level: number): number {
  if (level <= 0) return 55;
  if (level >= 2) return 86;
  return 72;
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

function resetViewportScroll() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.querySelector('main')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function buildSettingsSkillProfiles(settings: {
  readingLevel: number;
  listeningLevel: number;
  translationLevel: number;
  writingLevel: number;
  speakingLevel: number;
}): SkillProfile[] {
  const now = new Date().toISOString();
  return [
    ['reading', 'settings-reading', settings.readingLevel],
    ['listening', 'settings-listening', settings.listeningLevel],
    ['translation', 'settings-translation', settings.translationLevel],
    ['writing', 'settings-writing', settings.writingLevel],
    ['speaking', 'settings-speaking', settings.speakingLevel],
  ].map(([skillArea, subSkillId, level]) => ({
    id: `cet4-${skillArea}-${subSkillId}`,
    skillArea: skillArea as SkillProfile['skillArea'],
    subSkillId: subSkillId as string,
    score: levelToProfileScore(level as number),
    confidence: 3,
    evidenceCount: 1,
    lastUpdatedAt: now,
  }));
}

function buildChoiceQuestionPassage(params: {
  id: string;
  title: string;
  content: string;
  questions: Cet4MockChoiceQuestion[];
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
      type: question.title,
      tags: [question.trapType ?? question.questionTypeId],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: question.correctSentence,
    })),
  };
}

const CET4_GRAMMAR_STRUCTURE_PASSAGE = buildChoiceQuestionPassage({
  id: 'cet4-grammar-structure-practice',
  title: '语法结构与固定搭配专项',
  content: '本组题用于训练时态、语态、非谓语、从句、连接词和固定搭配。诊断显示语法薄弱时，系统会优先推荐这一组。',
  questions: CET4_GRAMMAR_PRACTICE_QUESTIONS,
  questionLimit: 8,
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
  questions: CET4_GRAMMAR_PRACTICE_QUESTIONS,
});

const CET4_CLOZE_CONTEXT_FULL_PASSAGE = buildChoiceQuestionPassage({
  ...CET4_CLOZE_CONTEXT_PASSAGE,
  questions: CET4_CLOZE_PRACTICE_QUESTIONS,
});

type PracticeJumpTarget = {
  moduleId: 'vocabulary' | 'cloze' | 'grammar' | 'reading' | 'listening' | 'writing' | 'translation';
  questionId: string;
};

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

  const handleTriggerModal = (title: string, body: string) => {
    setModalContent({ title, body });
  };
  
  const [readingProgress, setReadingProgress] = useState<{ completed: boolean; score?: number }>({
    completed: false
  });
  const [speakingScoreChange, setSpeakingScoreChange] = useState<{ from: number; to: number } | undefined>(undefined);
  const examCountdown = getDaysRemaining(activeGoal?.examDate);
  const activeExamId = activeGoal?.examId ?? 'cet4';
  const activeExamName = getExamRegistryEntry(activeExamId)?.profile.name ?? 'CET-4';
  const estimatedScore = estimateCetScore(persistedSkillProfiles);
  const abilityEvidenceCount = persistedSkillProfiles.reduce((sum, profile) => sum + profile.evidenceCount, 0);
  const reviewGateStatus = buildReviewGateStatus(persistedReviewItems);
  const unpracticedVocabularyItems = useMemo(
    () => filterUnpracticedItems(CET4_VOCABULARY_BANK, persistedAttempts, 'vocabulary'),
    [persistedAttempts],
  );
  const unpracticedReadingPassages = useMemo(
    () => buildUnpracticedReadingPassages(CET4_READING_BANK, persistedAttempts),
    [persistedAttempts],
  );
  const preferredReadingPassage = unpracticedReadingPassages[0] ?? INITIAL_PASSAGE;
  const unpracticedGrammarPassage = useMemo(
    () => filterPassageForUnpracticedQuestions(CET4_GRAMMAR_STRUCTURE_PASSAGE, persistedAttempts)
      ?? CET4_GRAMMAR_STRUCTURE_PASSAGE,
    [persistedAttempts],
  );
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
    () => countPracticeAttemptsOnLocalDate(visiblePracticeAttempts),
    [visiblePracticeAttempts],
  );
  const practiceJumpAttempt = useMemo(() => {
    if (!practiceJumpTarget) return undefined;
    return findLatestPracticeAttempt({
      attempts: visiblePracticeAttempts,
      moduleId: practiceJumpTarget.moduleId,
      questionId: practiceJumpTarget.questionId,
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

  const startLearningWithReviewReminder = (requestedLabel: string, start: () => void) => {
    noteReviewGateBypass(requestedLabel);
    start();
  };

  const handleSetActiveTab = (tab: ActiveTab) => {
    const gatedLabels: Partial<Record<ActiveTab, string>> = {
      practice: '专项练习',
      mock: '阶段模考',
      speaking: '口语重说',
    };
    const requestedLabel = gatedLabels[tab];

    if (requestedLabel) noteReviewGateBypass(requestedLabel);
    setActiveTab(tab);
  };

  const refreshStudyState = async () => {
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
    let mounted = true;

    async function loadStudyState() {
      const token = getStoredAuthToken();
      if (token) {
        try {
          const autoRestore = await restoreCloudLearningDataWhenLocalEmpty(token);
          if (mounted && autoRestore.status === 'restored') {
            handleTriggerModal(
              '已同步云端学习数据',
              `这台设备已自动恢复云端学习记录：练习 ${autoRestore.importedCounts.practiceSessions} 组、答题 ${autoRestore.importedCounts.attempts} 条、复习 ${autoRestore.importedCounts.reviewItems} 项、画像 ${autoRestore.importedCounts.skillProfiles} 项。`,
            );
          }
        } catch (error) {
          console.error('Failed to auto restore cloud learning data:', error);
          trackTelemetry('client_error', { area: 'cloud_learning_auto_restore' });
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
    }

    loadStudyState().catch((error) => {
      console.error('Failed to load local study state:', error);
      trackTelemetry('client_error', { area: 'local_storage_load' });
      handleTriggerModal('本地学习数据加载失败', '系统暂时无法读取浏览器 IndexedDB，本次练习仍可继续，但刷新后可能不会保留进度。');
    });

    return () => {
      mounted = false;
    };
  }, []);

  const persistCompletionReport = async (report: PracticeCompletionReport) => {
    await persistPracticeCompletion(report);
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
    await completeReviewItem(reviewItemId, evidence);
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
      .then(setActiveGoal)
      .catch((error) => {
        console.error('Failed to save target score:', error);
        trackTelemetry('client_error', { area: 'target_score_save' });
        handleTriggerModal('目标保存失败', '目标分数暂时没有写入本地数据库，请稍后重试。');
      });
  };

  const handleSaveSettings = async (settings: {
    examType: string;
    examDate: string;
    prepareSpeaking: boolean;
    readingLevel: number;
    listeningLevel: number;
    translationLevel: number;
    writingLevel: number;
    speakingLevel: number;
    targetScore: number;
    dailyTargetMinutes: number;
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
      });
      const settingsProfiles = buildSettingsSkillProfiles(settings);
      await persistSkillProfiles(settingsProfiles);
      setActiveGoal(goal);
      setTargetScoreLimit(goal.targetScore);
      setPersistedSkillProfiles(settingsProfiles);
      await refreshStudyState();
    } catch (error) {
      console.error('Failed to save study settings:', error);
      trackTelemetry('client_error', { area: 'study_settings_save' });
      handleTriggerModal('学习计划保存失败', '设置已在当前页面生效，但没有成功写入本地数据库。');
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
        await persistPracticeCompletion({
          session: {
            ...result.diagnosticReport.session,
            goalId: goal.id,
          },
          attempts: result.diagnosticReport.attempts,
          reviewItems: result.diagnosticReport.reviewItems,
          skillProfiles: result.diagnosticReport.skillProfiles,
        });
      } else {
        await persistSkillProfiles(result.skillProfiles);
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
      handleTriggerModal('入门诊断保存失败', '诊断结果已在当前页面生成，但没有成功写入本地能力画像。');
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

  const handleStartGrammarPractice = (questionId?: string) => {
    setPracticeJumpTarget(questionId ? { moduleId: 'grammar', questionId } : null);
    setCustomPassage(questionId ? CET4_GRAMMAR_STRUCTURE_FULL_PASSAGE : unpracticedGrammarPassage);
    startLearningWithReviewReminder('语法结构训练', () => setIsPracticing(true));
  };

  const handleStartClozePractice = (questionId?: string) => {
    setPracticeJumpTarget(questionId ? { moduleId: 'cloze', questionId } : null);
    setCustomPassage(questionId ? CET4_CLOZE_CONTEXT_FULL_PASSAGE : unpracticedClozePassage);
    startLearningWithReviewReminder('完形填空训练', () => setIsPracticing(true));
  };

  const handleStartVocabularyPractice = (questionId?: string) => {
    setPracticeJumpTarget(questionId ? { moduleId: 'vocabulary', questionId } : null);
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

  const handleCompletePractice = (score: number, report: PracticeCompletionReport) => {
    setIsPracticing(false);
    setPracticeJumpTarget(null);
    setReadingProgress({ completed: true, score });
    setActiveTab('progress');
    trackTelemetry('practice_completed', {
      mode: report.session.modeId,
      moduleId: report.session.moduleId,
      score,
      attempts: report.attempts.length,
      reviewItems: report.reviewItems.length,
    });
    persistCompletionReport(report).catch((error) => {
      console.error('Failed to persist reading practice:', error);
      trackTelemetry('client_error', { area: 'reading_practice_persist' });
      handleTriggerModal('阅读记录保存失败', '本次分数已显示，但错因和复习队列没有成功写入本地数据库。');
    });
  };

  const handleCompleteSubjectivePractice = (score: number, report: PracticeCompletionReport) => {
    setSubjectivePracticeMode(null);
    setPracticeJumpTarget(null);
    setActiveTab('progress');
    trackTelemetry('practice_completed', {
      mode: report.session.modeId,
      moduleId: report.session.moduleId,
      score,
      attempts: report.attempts.length,
      reviewItems: report.reviewItems.length,
    });
    persistCompletionReport(report).catch((error) => {
      console.error('Failed to persist subjective practice:', error);
      trackTelemetry('client_error', { area: `${report.session.moduleId}_practice_persist` });
      handleTriggerModal('主观题记录保存失败', '本次反馈已生成，但错因和能力画像没有成功写入本地数据库。');
    });
  };

  const handleCompleteVocabularyPractice = (score: number, report: PracticeCompletionReport) => {
    setIsVocabularyPracticing(false);
    setPracticeJumpTarget(null);
    setActiveTab('progress');
    trackTelemetry('practice_completed', {
      mode: report.session.modeId,
      moduleId: report.session.moduleId,
      score,
      attempts: report.attempts.length,
      reviewItems: report.reviewItems.length,
    });
    persistCompletionReport(report).catch((error) => {
      console.error('Failed to persist vocabulary practice:', error);
      trackTelemetry('client_error', { area: 'vocabulary_practice_persist' });
      handleTriggerModal('词汇练习保存失败', '本次词汇分数已显示，但错因和复习队列没有成功写入本地数据库。');
    });
  };

  const handleCompleteMockExam = (score: number, report: PracticeCompletionReport) => {
    setActiveTab('progress');
    trackTelemetry('practice_completed', {
      mode: report.session.modeId,
      moduleId: report.session.moduleId,
      score,
      attempts: report.attempts.length,
      reviewItems: report.reviewItems.length,
    });
    persistCompletionReport(report).catch((error) => {
      console.error('Failed to persist mock exam:', error);
      trackTelemetry('client_error', { area: 'mock_exam_persist' });
      handleTriggerModal('阶段模考保存失败', '本次模考报告已生成，但错因和能力画像没有成功写入本地数据库。');
    });
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
            persistedReviewCount={reviewItemCount}
            persistedReviewItems={persistedReviewItems}
            reviewGateStatus={reviewGateStatus}
            onCompleteReviewItem={handleCompleteReviewItem}
            onStartVariantPractice={handleStartVariantPractice}
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
            onSave={handleSaveSettings}
            onSetScoreLimit={handleSetGoalTarget}
            onTriggerModal={handleTriggerModal}
            onDataRestored={refreshStudyState}
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
            onComplete={(score, report) => {
              setIsListeningPracticing(false);
              setPracticeJumpTarget(null);
              setReadingProgress({ completed: true, score });
              setActiveTab('progress');
              trackTelemetry('practice_completed', {
                mode: report.session.modeId,
                moduleId: report.session.moduleId,
                score,
                attempts: report.attempts.length,
                reviewItems: report.reviewItems.length,
              });
              persistCompletionReport(report).catch((error) => {
                console.error('Failed to persist listening practice:', error);
                trackTelemetry('client_error', { area: 'listening_practice_persist' });
                handleTriggerModal('听力记录保存失败', '本次分数已显示，但错因和复习队列没有成功写入本地数据库。');
              });
            }}
          />
        </Suspense>
      ) : isVocabularyPracticing ? (
        <Suspense fallback={<WorkspaceLoadingFallback />}>
          <VocabularyTraining
            initialQuestionId={practiceJumpTarget?.moduleId === 'vocabulary' ? practiceJumpTarget.questionId : undefined}
            replayAttempt={practiceJumpTarget?.moduleId === 'vocabulary' ? practiceJumpAttempt : undefined}
            items={practiceJumpTarget?.moduleId === 'vocabulary' ? CET4_VOCABULARY_BANK : unpracticedVocabularyItems}
            onBack={handleBackFromPractice}
            onComplete={handleCompleteVocabularyPractice}
          />
        </Suspense>
      ) : isPracticing ? (
        <Suspense fallback={<WorkspaceLoadingFallback />}>
          <ReadingTraining
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
            examCountdown={examCountdown}
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
