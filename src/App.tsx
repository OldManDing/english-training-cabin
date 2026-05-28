/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import TodayDashboard from './components/TodayDashboard';
import ReadingTraining from './components/ReadingTraining';
import PracticeHub from './components/PracticeHub';
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
import { Sparkles, X } from 'lucide-react';
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
import { getExamRegistryEntry } from './exams/registry';

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
  const activeExamId = activeGoal?.examId ?? 'cet4';
  const activeExamName = getExamRegistryEntry(activeExamId)?.profile.name ?? 'CET-4';
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
            targetExamName={activeExamName}
            strategy={dailyStrategy}
            onStrategyChange={setDailyStrategy}
          />
        );
      case 'practice':
        return (
          <PracticeHub
            onStartOnboarding={() => setShowOnboarding(true)}
            onStartVocabulary={() => startLearningIfUnlocked('单词练习', () => setIsVocabularyPracticing(true))}
            onStartReading={handleSelectPassage}
            onStartListening={() => startLearningIfUnlocked('听力训练', () => setIsListeningPracticing(true))}
            onStartWriting={() => startLearningIfUnlocked('写作训练', () => setSubjectivePracticeMode('writing'))}
            onStartTranslation={() => startLearningIfUnlocked('翻译训练', () => setSubjectivePracticeMode('translation'))}
            onStartMockExam={() => startLearningIfUnlocked('阶段模考', () => setActiveTab('mock'))}
            examId={activeExamId}
            examName={activeExamName}
          />
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
          <main className="app-page-surface flex-1 min-w-0 flex flex-col min-h-0 lg:h-screen lg:overflow-hidden relative">
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
