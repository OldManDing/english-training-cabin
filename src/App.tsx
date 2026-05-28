/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import TodayDashboard from './components/TodayDashboard';
import ReadingTraining from './components/ReadingTraining';
import SpeakingTraining from './components/SpeakingTraining';
import SubjectiveTraining from './components/SubjectiveTraining';
import ReviewSection from './components/ReviewSection';
import ProgressSection from './components/ProgressSection';
import MaterialImporter from './components/MaterialImporter';
import OnboardingDiagnostic from './components/OnboardingDiagnostic';
import ListeningTraining from './components/ListeningTraining';
import SettingsSection from './components/SettingsSection';
import VocabularyTraining from './components/VocabularyTraining';
import AuthGate from './components/AuthGate';
import MockExam from './components/MockExam';
import { ActiveTab, DailyPlan, Passage, PracticeCompletionReport, ReviewCompletionEvidence, ReviewItem, SkillProfile, StudyGoal } from './types';
import { CET4_VOCABULARY_BANK, INITIAL_PASSAGE } from './data';
import {
  CET4_QUESTION_BANK_COVERAGE,
  CET4_READING_BANK,
  CET4_TRANSLATION_PROMPT_BANK,
  CET4_WRITING_PROMPT_BANK,
  DEGREE_ENGLISH_MOCK_EXAM,
  DEGREE_ENGLISH_QUESTION_BANK_COVERAGE,
} from './questionBank';
import { Sparkles, BookOpen, ChevronRight, GraduationCap, X, Volume2, LibraryBig } from 'lucide-react';
import {
  completeReviewItem,
  getOrCreateActiveGoal,
  loadReviewItems,
  loadSkillProfiles,
  persistPracticeCompletion,
  persistSkillProfiles,
  upsertActiveGoal,
} from './lib/storage/db';
import { buildDailyPlan } from './domain/planner/dailyPlan';
import { buildReviewGateStatus } from './domain/review/reviewGate';
import { trackTelemetry } from './lib/telemetry';
import { OnboardingDiagnosticReport } from './domain/diagnostic/onboardingDiagnostic';

function getDaysRemaining(examDate?: string): number {
  if (!examDate) return 0;
  const today = new Date();
  const target = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.ceil((target.getTime() - todayStart.getTime()) / 86400000));
}

function countDueReviews(reviewItems: ReviewItem[]): number {
  const now = new Date().toISOString();
  return reviewItems.filter((item) => !item.nextReviewAt || item.nextReviewAt <= now).length;
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
  if (available.length === 0) return undefined;

  const normalizedWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const abilityScore = available.reduce((sum, item) => {
    return sum + (latestBySkill.get(item.skill)?.score ?? 0) * item.weight;
  }, 0) / normalizedWeight;

  return Math.round(Math.max(300, Math.min(710, 300 + abilityScore * 4.1)));
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

function StudyApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [activeGoal, setActiveGoal] = useState<StudyGoal | null>(null);
  const [reviewItemCount, setReviewItemCount] = useState(0);
  const [persistedReviewItems, setPersistedReviewItems] = useState<ReviewItem[]>([]);
  const [persistedSkillProfiles, setPersistedSkillProfiles] = useState<SkillProfile[]>([]);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [customPassage, setCustomPassage] = useState<Passage>(INITIAL_PASSAGE);
  const [isPracticing, setIsPracticing] = useState(false);
  const [isListeningPracticing, setIsListeningPracticing] = useState(false);
  const [isVocabularyPracticing, setIsVocabularyPracticing] = useState(false);
  const [subjectivePracticeMode, setSubjectivePracticeMode] = useState<'writing' | 'translation' | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dailyStrategy, setDailyStrategy] = useState<'efficient' | 'review'>('efficient');
  const [targetScoreLimit, setTargetScoreLimit] = useState<number | undefined>(undefined);
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);
  const [reviewGatePrompt, setReviewGatePrompt] = useState<{ requestedLabel: string } | null>(null);

  const handleTriggerModal = (title: string, body: string) => {
    setModalContent({ title, body });
  };
  
  const [readingProgress, setReadingProgress] = useState<{ completed: boolean; score?: number }>({
    completed: false
  });
  const [speakingScoreChange, setSpeakingScoreChange] = useState<{ from: number; to: number } | undefined>(undefined);
  const examCountdown = getDaysRemaining(activeGoal?.examDate);
  const estimatedScore = estimateCetScore(persistedSkillProfiles);
  const abilityEvidenceCount = persistedSkillProfiles.reduce((sum, profile) => sum + profile.evidenceCount, 0);
  const reviewGateStatus = buildReviewGateStatus(persistedReviewItems);

  const blockForReviewGate = (requestedLabel: string) => {
    if (!reviewGateStatus.locked) return false;

    setReviewGatePrompt({ requestedLabel });
    setActiveTab('review');
    trackTelemetry('review_gate_blocked', {
      requestedLabel,
      dueCount: reviewGateStatus.dueCount,
      remainingRequired: reviewGateStatus.remainingRequired,
    });
    return true;
  };

  const startLearningIfUnlocked = (requestedLabel: string, start: () => void) => {
    if (blockForReviewGate(requestedLabel)) return;
    start();
  };

  const handleSetActiveTab = (tab: ActiveTab) => {
    const gatedLabels: Partial<Record<ActiveTab, string>> = {
      practice: '专项练习',
      mock: '阶段模考',
      speaking: '口语重说',
    };
    const requestedLabel = gatedLabels[tab];

    if (requestedLabel && blockForReviewGate(requestedLabel)) return;
    setActiveTab(tab);
  };

  const refreshStudyState = async () => {
    const [goal, reviewItems, skillProfiles] = await Promise.all([
      getOrCreateActiveGoal(),
      loadReviewItems(),
      loadSkillProfiles(),
    ]);
    setActiveGoal(goal);
    setTargetScoreLimit(goal.targetScore);
    setReviewItemCount(countDueReviews(reviewItems));
    setPersistedReviewItems(reviewItems);
    setPersistedSkillProfiles(skillProfiles);
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
      const [goal, reviewItems, skillProfiles] = await Promise.all([
        getOrCreateActiveGoal(),
        loadReviewItems(),
        loadSkillProfiles(),
      ]);
      if (!mounted) return;
      setActiveGoal(goal);
      setTargetScoreLimit(goal.targetScore);
      setReviewItemCount(countDueReviews(reviewItems));
      setPersistedReviewItems(reviewItems);
      setPersistedSkillProfiles(skillProfiles);
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
    const [reviewItems, skillProfiles] = await Promise.all([
      loadReviewItems(),
      loadSkillProfiles(),
    ]);
    setReviewItemCount(countDueReviews(reviewItems));
    setPersistedReviewItems(reviewItems);
    setPersistedSkillProfiles(skillProfiles);
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
    targetScore: number;
    examDate: string;
    dailyMinutes: number;
    prioritySkills: StudyGoal['prioritySkills'];
    skillProfiles: SkillProfile[];
    diagnosticReport?: OnboardingDiagnosticReport;
  }) => {
    try {
      const goal = await upsertActiveGoal({
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

  const practicePassages = CET4_READING_BANK.map((passage) => ({
    id: passage.id,
    title: passage.title,
    category: '原创模拟 · 仔细阅读',
    words: passage.content.split(/\s+/).filter(Boolean).length,
    duration: `${Math.max(12, passage.questions.length * 3)} 分钟`,
    data: passage,
  }));

  const handleSelectPassage = (passageData: Passage) => {
    setCustomPassage(passageData);
    startLearningIfUnlocked('仔细阅读训练', () => setIsPracticing(true));
  };

  const handleCompletePractice = (score: number, report: PracticeCompletionReport) => {
    setIsPracticing(false);
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
            onStartReading={() => startLearningIfUnlocked('仔细阅读训练', () => setIsPracticing(true))}
            onStartListening={() => startLearningIfUnlocked('听力训练', () => setIsListeningPracticing(true))}
            onStartWriting={() => startLearningIfUnlocked('写作训练', () => setSubjectivePracticeMode('writing'))}
            onStartTranslation={() => startLearningIfUnlocked('翻译训练', () => setSubjectivePracticeMode('translation'))}
            onStartVocabulary={() => startLearningIfUnlocked('单词练习', () => setIsVocabularyPracticing(true))}
            onStartMockExam={() => startLearningIfUnlocked('阶段模考', () => setActiveTab('mock'))}
            onStartOnboarding={() => setShowOnboarding(true)}
            onViewReview={() => setActiveTab('review')}
            onStartSpeaking={() => startLearningIfUnlocked('口语重说', () => setActiveTab('speaking'))}
            onTriggerModal={handleTriggerModal}
            readingProgress={readingProgress}
            examCountdown={examCountdown}
            targetScore={activeGoal?.targetScore ?? targetScoreLimit ?? 550}
            estimatedScore={estimatedScore}
            abilityEvidenceCount={abilityEvidenceCount}
            dailyPlan={dailyPlan}
            reviewItemCount={reviewItemCount}
            reviewGateStatus={reviewGateStatus}
            skillProfiles={persistedSkillProfiles}
            strategy={dailyStrategy}
            onStrategyChange={setDailyStrategy}
          />
        );
      case 'practice':
        return (
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_40%,#fff7ed_100%)] min-h-[calc(100svh-9rem)] lg:h-screen">
            <div className="mx-auto w-full max-w-6xl space-y-5">
              <header className="rounded-[2rem] border border-sky-100 bg-white/90 p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#003178]/10 px-3 py-1 text-xs font-black text-[#003178]">
                      <LibraryBig className="h-4 w-4" />
                      内置基础材料库
                    </div>
                    <h2 className="text-2xl font-black text-[#003178] sm:text-3xl">
                      专项练习：阅读、听力、写译、词汇都要能直接练
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                      当前内置原创 CET-4 模拟材料：阅读 {practicePassages.length} 组、核心词汇 {CET4_VOCABULARY_BANK.length} 个、
                      写作 {CET4_WRITING_PROMPT_BANK.length} 题、翻译 {CET4_TRANSLATION_PROMPT_BANK.length} 题、
                      题型覆盖 {CET4_QUESTION_BANK_COVERAGE.length} 类，并提供阶段模考闭环。另按 2025 学位英语大纲补齐
                      {' '}{DEGREE_ENGLISH_MOCK_EXAM.totalQuestionCount} 题、{DEGREE_ENGLISH_QUESTION_BANK_COVERAGE.length} 类无听力考试结构。所有练习都会写入本地能力画像和复习队列。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOnboarding(true)}
                    className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#cfe6f2] bg-[#003178] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#07244f]"
                  >
                    <GraduationCap className="h-4 w-4 text-emerald-300" />
                    入门诊断与能力画像
                  </button>
                </div>
              </header>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                    <Volume2 className="h-3.5 w-3.5" />
                    词汇 · 听音识别
                  </span>
                  <h3 className="mt-3 text-lg font-black text-[#071e27]">CET-4 / 学位英语核心词汇听音练习</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    CET-4 与学位英语高频词合并训练；播放单词和例句，完成词义辨析，低信心或错误项会进入主动回忆复习。
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">{CET4_VOCABULARY_BANK.length} 个大纲词</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">语音播报</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">语块例句</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => startLearningIfUnlocked('单词练习', () => setIsVocabularyPracticing(true))}
                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1b6d24] px-5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto"
                  >
                    <Volume2 className="h-4 w-4" />
                    开始单词练习
                  </button>
                </div>

                <div className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
                  <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-700">
                    题库结构
                  </span>
                  <h3 className="mt-3 text-lg font-black text-[#071e27]">基础题库不是空壳</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    首发不内置未授权真题，只内置原创模拟题和核心词表；用户可继续通过“材料导入”扩展自有或授权材料。
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-black">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-2xl text-[#003178]">{practicePassages.length}</div>
                      <div className="text-slate-500">阅读材料</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-2xl text-[#003178]">{CET4_VOCABULARY_BANK.length}</div>
                      <div className="text-slate-500">词汇条目</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-amber-100 bg-white p-5 shadow-sm sm:p-6">
                  <span className="inline-flex rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">
                    阶段模考
                  </span>
                  <h3 className="mt-3 text-lg font-black text-[#071e27]">补齐应试闭环</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    CET-4 模考一次完成写作、听力、阅读、翻译四个模块；学位英语结构已按“不考听力、67题、120分钟”入库，避免训练路径偏题。
                  </p>
                  <button
                    type="button"
                    onClick={() => startLearningIfUnlocked('阶段模考', () => setActiveTab('mock'))}
                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-amber-700 sm:w-auto"
                  >
                    开始阶段模考
                  </button>
                </div>
              </section>

              <section className="rounded-[2rem] border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                      2025 学位英语大纲
                    </span>
                    <h3 className="mt-3 text-lg font-black text-[#071e27]">去年大纲已转成可验证题库结构</h3>
                  </div>
                  <p className="text-xs font-bold leading-5 text-slate-500">
                    线下闭卷 · 不考听力 · 67 题 · 100 分 · 120 分钟
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {DEGREE_ENGLISH_QUESTION_BANK_COVERAGE.map((item) => (
                    <div key={`degree-${item.moduleId}-${item.questionTypeId}`} className="rounded-2xl border border-emerald-100 bg-emerald-50/55 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-black text-emerald-800">{item.name}</div>
                          <div className="mt-1 text-[10px] font-bold text-slate-500">{item.trainingRoute}</div>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">
                          {item.builtInCount}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-500">
                        <span>大纲结构 {item.officialCount}</span>
                        <span>{item.durationMinutes}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {practicePassages.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border hover:border-[#003178] rounded-3xl p-4 sm:p-6 transition-all duration-200 shadow-xs flex flex-col justify-between group min-h-44"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-[#003178] bg-[#dbf1fe] px-2.5 py-1 rounded-full border border-[#cfe6f2]">
                        {p.category}
                      </span>
                      <h3 className="font-extrabold text-[#071e27] text-base group-hover:text-[#003178] transition-colors mt-3 line-clamp-1">
                        {p.title}
                      </h3>
                      <div className="flex gap-4 text-[10px] text-gray-400 font-semibold mt-1.5">
                        <span>约 {p.words} 词</span>
                        <span>时限 {p.duration}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex justify-stretch sm:justify-end">
                      <button
                        onClick={() => handleSelectPassage(p.data)}
                        className="w-full sm:w-auto justify-center px-5 py-3 sm:py-2 bg-[#003178] hover:bg-[#0d47a1] text-white font-bold text-xs rounded-xl flex items-center gap-1 hover:scale-[1.02] transition-all pointer-events-auto cursor-pointer"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>开始仔细阅读训练</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <span className="inline-flex rounded-full border border-[#cfe6f2] bg-[#eef7fc] px-2.5 py-1 text-[10px] font-black text-[#003178]">
                      题库覆盖
                    </span>
                    <h3 className="mt-3 text-lg font-black text-[#071e27]">CET-4 主要题型覆盖清单</h3>
                  </div>
                  <p className="text-xs font-bold leading-5 text-slate-500">
                    内置内容均为原创模拟题；授权真题可通过材料导入扩展。
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {CET4_QUESTION_BANK_COVERAGE.map((item) => (
                    <div key={`${item.moduleId}-${item.questionTypeId}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-black text-[#003178]">{item.name}</div>
                          <div className="mt-1 text-[10px] font-bold text-slate-500">{item.trainingRoute}</div>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">
                          {item.builtInCount}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-500">
                        <span>官方结构 {item.officialCount}</span>
                        <span>{item.durationMinutes}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="bg-white border hover:border-[#003178] rounded-3xl p-4 sm:p-6 transition-all duration-200 shadow-xs flex flex-col justify-between group min-h-40">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      写作 · AI 结构化反馈
                    </span>
                    <h3 className="font-extrabold text-[#071e27] text-base group-hover:text-[#003178] transition-colors mt-3">
                      短文写作：提纲、情景与观点表达
                    </h3>
                    <p className="text-xs text-gray-400 font-semibold mt-1.5">
                      {CET4_WRITING_PROMPT_BANK.length} 题 · 论点结构、语法、词汇升级
                    </p>
                  </div>
                  <button
                    onClick={() => startLearningIfUnlocked('写作训练', () => setSubjectivePracticeMode('writing'))}
                    className="mt-4 w-full sm:w-auto px-5 py-3 sm:py-2 bg-[#003178] hover:bg-[#0d47a1] text-white font-bold text-xs rounded-xl self-end cursor-pointer"
                  >
                    开始写作训练
                  </button>
                </div>

                <div className="bg-white border hover:border-[#003178] rounded-3xl p-4 sm:p-6 transition-all duration-200 shadow-xs flex flex-col justify-between group min-h-40">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                      翻译 · 中译英段落
                    </span>
                    <h3 className="font-extrabold text-[#071e27] text-base group-hover:text-[#003178] transition-colors mt-3">
                      段落翻译：中国文化与社会发展
                    </h3>
                    <p className="text-xs text-gray-400 font-semibold mt-1.5">
                      {CET4_TRANSLATION_PROMPT_BANK.length} 题 · 中国文化、历史、社会发展
                    </p>
                  </div>
                  <button
                    onClick={() => startLearningIfUnlocked('翻译训练', () => setSubjectivePracticeMode('translation'))}
                    className="mt-4 w-full sm:w-auto px-5 py-3 sm:py-2 bg-[#003178] hover:bg-[#0d47a1] text-white font-bold text-xs rounded-xl self-end cursor-pointer"
                  >
                    开始翻译训练
                  </button>
                </div>

                <div className="bg-white border hover:border-[#003178] rounded-3xl p-4 sm:p-6 transition-all duration-200 shadow-xs flex flex-col justify-between group min-h-40">
                  <div>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
                      听力 · 长对话精听
                    </span>
                    <h3 className="font-extrabold text-[#071e27] text-base group-hover:text-[#003178] transition-colors mt-3">
                      Section A：科技与教育
                    </h3>
                    <p className="text-xs text-gray-400 font-semibold mt-1.5">
                      15 分钟 · 原速、精听、错因定位
                    </p>
                  </div>
                  <button
                    onClick={() => startLearningIfUnlocked('听力训练', () => setIsListeningPracticing(true))}
                    className="mt-4 w-full sm:w-auto px-5 py-3 sm:py-2 bg-[#003178] hover:bg-[#0d47a1] text-white font-bold text-xs rounded-xl self-end cursor-pointer"
                  >
                    开始听力训练
                  </button>
                </div>
              </section>
            </div>
          </div>
        );
      case 'mock':
        return (
          <MockExam
            onBack={() => setActiveTab('today')}
            onComplete={handleCompleteMockExam}
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
        return <ProgressSection scoreChange={speakingScoreChange} persistedSkillProfiles={persistedSkillProfiles} />;
      case 'import':
        return (
          <MaterialImporter
            onLoadCustomPassage={(passage) => {
              setCustomPassage(passage);
              startLearningIfUnlocked('导入材料训练', () => setIsPracticing(true));
            }}
          />
        );
      case 'settings':
        return (
          <SettingsSection
            targetScoreLimit={targetScoreLimit || 550}
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
            onStartReading={() => startLearningIfUnlocked('仔细阅读训练', () => setIsPracticing(true))}
            onStartListening={() => startLearningIfUnlocked('听力训练', () => setIsListeningPracticing(true))}
            onStartWriting={() => startLearningIfUnlocked('写作训练', () => setSubjectivePracticeMode('writing'))}
            onStartTranslation={() => startLearningIfUnlocked('翻译训练', () => setSubjectivePracticeMode('translation'))}
            onStartVocabulary={() => startLearningIfUnlocked('单词练习', () => setIsVocabularyPracticing(true))}
            onStartMockExam={() => startLearningIfUnlocked('阶段模考', () => setActiveTab('mock'))}
            onStartOnboarding={() => setShowOnboarding(true)}
            onViewReview={() => setActiveTab('review')}
            onStartSpeaking={() => startLearningIfUnlocked('口语重说', () => setActiveTab('speaking'))}
            onTriggerModal={handleTriggerModal}
            readingProgress={readingProgress}
            examCountdown={examCountdown}
            targetScore={activeGoal?.targetScore ?? targetScoreLimit ?? 550}
            estimatedScore={estimatedScore}
            abilityEvidenceCount={abilityEvidenceCount}
            dailyPlan={dailyPlan}
            reviewItemCount={reviewItemCount}
            reviewGateStatus={reviewGateStatus}
            skillProfiles={persistedSkillProfiles}
            strategy={dailyStrategy}
            onStrategyChange={setDailyStrategy}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans antialiased text-[#1e333c]">
      {showOnboarding ? (
        <OnboardingDiagnostic
          onDismiss={() => setShowOnboarding(false)}
          onSetScoreLimit={(score) => {
            handleSetGoalTarget(score);
          }}
          onCompleteDiagnostic={handleCompleteDiagnostic}
        />
      ) : isListeningPracticing ? (
        <ListeningTraining
          onBack={() => setIsListeningPracticing(false)}
          onComplete={(score, report) => {
            setIsListeningPracticing(false);
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
      ) : isVocabularyPracticing ? (
        <VocabularyTraining
          items={CET4_VOCABULARY_BANK}
          onBack={() => setIsVocabularyPracticing(false)}
          onComplete={handleCompleteVocabularyPractice}
        />
      ) : isPracticing ? (
        <ReadingTraining
          passage={customPassage}
          onBack={() => setIsPracticing(false)}
          onComplete={handleCompletePractice}
        />
      ) : subjectivePracticeMode ? (
        <SubjectiveTraining
          mode={subjectivePracticeMode}
          onBack={() => setSubjectivePracticeMode(null)}
          onComplete={handleCompleteSubjectivePractice}
        />
      ) : (
        <>
          <Sidebar
            activeTab={activeTab}
            setActiveTab={handleSetActiveTab}
            examCountdown={examCountdown}
            onTriggerModal={handleTriggerModal}
          />
          <main className="flex-1 min-w-0 flex flex-col min-h-0 lg:h-screen lg:overflow-hidden relative">
            {renderTabContent()}
          </main>
        </>
      )}

      {reviewGatePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg rounded-[2rem] border border-rose-100 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700">
                  今日复习闸门
                </span>
                <h3 className="mt-3 text-xl font-black text-[#003178]">先完成到期复习，再进入{reviewGatePrompt.requestedLabel}</h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewGatePrompt(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-50 hover:text-[#003178]"
                aria-label="关闭复习闸门提示"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <p className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                当前有 {reviewGateStatus.dueCount} 条到期复习。为了让间隔复习真正生效，今天需要先完成
                <strong className="mx-1 text-rose-700">{reviewGateStatus.remainingRequired}</strong>
                条最高优先级主动回忆；完成后专项练习、模考和口语入口会自动解锁。
              </p>
              <div className="grid grid-cols-3 gap-3 text-center text-xs font-black">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-2xl text-[#003178]">{reviewGateStatus.dueCount}</div>
                  <div className="text-slate-500">到期项</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-2xl text-emerald-700">{reviewGateStatus.completedToday}</div>
                  <div className="text-slate-500">今日已复习</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-2xl text-rose-700">{reviewGateStatus.requiredToday}</div>
                  <div className="text-slate-500">解锁要求</div>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setReviewGatePrompt(null);
                    setActiveTab('today');
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                  回到今日计划
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewGatePrompt(null);
                    setActiveTab('review');
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#003178] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#0d47a1]"
                >
                  开始强制复习
                </button>
              </div>
            </div>
          </div>
        </div>
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
