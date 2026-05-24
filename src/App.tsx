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
import { ActiveTab, DailyPlan, Passage, PracticeCompletionReport, ReviewItem, SkillProfile, StudyGoal } from './types';
import { INITIAL_PASSAGE } from './data';
import { Sparkles, BookOpen, Clock, ChevronRight, GraduationCap, X } from 'lucide-react';
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
import { trackTelemetry } from './lib/telemetry';

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

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [activeGoal, setActiveGoal] = useState<StudyGoal | null>(null);
  const [reviewItemCount, setReviewItemCount] = useState(0);
  const [persistedReviewItems, setPersistedReviewItems] = useState<ReviewItem[]>([]);
  const [persistedSkillProfiles, setPersistedSkillProfiles] = useState<SkillProfile[]>([]);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [customPassage, setCustomPassage] = useState<Passage>(INITIAL_PASSAGE);
  const [isPracticing, setIsPracticing] = useState(false);
  const [isListeningPracticing, setIsListeningPracticing] = useState(false);
  const [subjectivePracticeMode, setSubjectivePracticeMode] = useState<'writing' | 'translation' | null>(null);
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
  const estimatedScore = estimateCetScore(persistedSkillProfiles);
  const abilityEvidenceCount = persistedSkillProfiles.reduce((sum, profile) => sum + profile.evidenceCount, 0);

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

  const handleCompleteReviewItem = async (reviewItemId: string) => {
    await completeReviewItem(reviewItemId);
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
  }) => {
    try {
      const goal = await upsertActiveGoal({
        targetScore: result.targetScore,
        examDate: result.examDate,
        dailyMinutes: result.dailyMinutes,
        prioritySkills: result.prioritySkills,
      });
      await persistSkillProfiles(result.skillProfiles);
      setActiveGoal(goal);
      setTargetScoreLimit(goal.targetScore);
      await refreshStudyState();
      trackTelemetry('practice_completed', {
        mode: 'diagnostic',
        moduleId: 'onboarding',
        score: Math.round(result.skillProfiles.reduce((sum, item) => sum + item.score, 0) / Math.max(1, result.skillProfiles.length)),
        attempts: result.skillProfiles.length,
        reviewItems: 0,
      });
    } catch (error) {
      console.error('Failed to save onboarding diagnostic:', error);
      trackTelemetry('client_error', { area: 'onboarding_diagnostic_save' });
      handleTriggerModal('入门诊断保存失败', '诊断结果已在当前页面生成，但没有成功写入本地能力画像。');
      throw error;
    }
  };

  // Available passages list for the 'practice' tab
  const practicePassages = [
    {
      id: 'cet-ai-edu',
      title: 'Artificial Intelligence in Education',
      category: '科技与现代人文 (仔细阅读)',
      words: 312,
      duration: '18 分钟',
      data: INITIAL_PASSAGE
    },
    {
      id: 'cet-green-tech',
      title: 'Green Tech and Environmental Protection',
      category: '社会生态与环保 (仔细阅读)',
      words: 285,
      duration: '15 分钟',
      data: {
        id: 'cet-green-tech',
        examId: 'cet4',
        moduleId: 'reading',
        title: 'Green Tech and Environmental Protection',
        content: `The development of modern engineering is rapidly transforming our ecosystem. Supporters state that clean technology provides alternative energy solutions, bringing green resources to remote towns. This transition can significantly secure regional wellness and reduce the reliance on fossil fuels.

However, critics voice key worries about electronic waste and environmental pollution during the battery manufacturing process. One major assessment indicated that although solar energy is highly efficient, critics argue that the production of photovoltaic cells requires non-biodegradable raw items. Furthermore, over-dependence on specialized components might cause new resource crises.

In conclusion, although integrating sustainable tech helps reduce footprints, it needs careful legislation. Consequently, the government can design proper disposal standards to guide battery recycling. As we advance in this digital century, the priority remains on natural safety rather than pure commercial margins.`,
        questions: [
          {
            id: 1,
            examId: 'cet4',
            moduleId: 'reading',
            questionTypeId: 'careful-reading',
            question: "According to the passage, what can dirty manufacturing processes lead to?",
            options: {
              A: "An extreme reduction in global grid capacity.",
              B: "Environmental pollution and battery-related electronic waste.",
              C: "An immediate collapse of standard public transport.",
              D: "Slower development in clean technology integration."
            },
            correctAnswer: 'B',
            explanation: "定位到第二段首句：'critics voice key worries about electronic waste and environmental pollution during the battery manufacturing process'。选项 B 高度契合该表述。",
            type: "细节理解",
            tags: ['环境主题', '细节定位'],
            difficulty: 3,
            sourceType: 'original',
            correctSentence: "However, critics voice key worries about electronic waste and environmental pollution during the battery manufacturing process.",
            distractorSentence: "Supporters state that clean technology provides alternative energy solutions, bringing green resources to remote towns."
          },
          {
            id: 2,
            examId: 'cet4',
            moduleId: 'reading',
            questionTypeId: 'careful-reading',
            question: "What is mentioned as a benefit of clean technology in the first paragraph?",
            options: {
              A: "It fully stops critical climate changes.",
              B: "It is cheaper than any traditional resource.",
              C: "It secures regional wellness and brings green resources.",
              D: "It creates a massive number of manufacturing jobs."
            },
            correctAnswer: 'C',
            explanation: "定位到第一段后半部分：'clean technology provides alternative energy solutions, bringing green resources to remote towns. This transition can significantly secure regional wellness.' 完美匹配选项 C 的核心表达物。",
            type: "细节推导",
            tags: ['环境主题', '因果推导'],
            difficulty: 3,
            sourceType: 'original',
            correctSentence: "clean technology provides alternative energy solutions, bringing green resources to remote towns. This transition can significantly secure regional wellness.",
            distractorSentence: "Furthermore, over-dependence on specialized components might cause new resource crises."
          }
        ]
      } as Passage
    }
  ];

  const handleSelectPassage = (passageData: Passage) => {
    setCustomPassage(passageData);
    setIsPracticing(true);
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
            onStartReading={() => setIsPracticing(true)}
            onStartListening={() => setIsListeningPracticing(true)}
            onStartWriting={() => setSubjectivePracticeMode('writing')}
            onStartTranslation={() => setSubjectivePracticeMode('translation')}
            onStartOnboarding={() => setShowOnboarding(true)}
            onViewReview={() => setActiveTab('review')}
            onStartSpeaking={() => setActiveTab('speaking')}
            onTriggerModal={handleTriggerModal}
            readingProgress={readingProgress}
            examCountdown={examCountdown}
            targetScore={activeGoal?.targetScore ?? targetScoreLimit ?? 550}
            estimatedScore={estimatedScore}
            abilityEvidenceCount={abilityEvidenceCount}
            dailyPlan={dailyPlan}
            reviewItemCount={reviewItemCount}
            skillProfiles={persistedSkillProfiles}
            strategy={dailyStrategy}
            onStrategyChange={setDailyStrategy}
          />
        );
      case 'practice':
        return (
          <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-b from-[#f3faff] to-white h-screen flex flex-col justify-between">
            <div className="shrink-0 mb-6">
              <header className="pb-4 border-b border-[#cfe6f2]">
                <h2 className="text-xl font-bold text-[#003178] flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="h-6 w-6 text-emerald-500 fill-emerald-500" />
                  仔细阅读专项突破库
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  选择下方原创模拟文章开始训练。系统会记录答题结果、信心和错因，用于生成复习队列。
                </p>
              </header>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {practicePassages.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border hover:border-[#003178] rounded-2.5xl p-6 transition-all duration-200 shadow-xs flex flex-col justify-between group h-44"
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

                    <div className="pt-3 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => handleSelectPassage(p.data)}
                        className="px-5 py-2 bg-[#003178] hover:bg-[#0d47a1] text-white font-bold text-xs rounded-xl flex items-center gap-1 hover:scale-[1.02] transition-all pointer-events-auto cursor-pointer"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>开始仔细阅读训练</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border hover:border-[#003178] rounded-2.5xl p-6 transition-all duration-200 shadow-xs flex flex-col justify-between group min-h-40">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      写作 · AI 结构化反馈
                    </span>
                    <h3 className="font-extrabold text-[#071e27] text-base group-hover:text-[#003178] transition-colors mt-3">
                      短文写作：主动练习的重要性
                    </h3>
                    <p className="text-xs text-gray-400 font-semibold mt-1.5">
                      30 分钟 · 论点结构、语法、词汇升级
                    </p>
                  </div>
                  <button
                    onClick={() => setSubjectivePracticeMode('writing')}
                    className="mt-4 px-5 py-2 bg-[#003178] hover:bg-[#0d47a1] text-white font-bold text-xs rounded-xl self-end cursor-pointer"
                  >
                    开始写作训练
                  </button>
                </div>

                <div className="bg-white border hover:border-[#003178] rounded-2.5xl p-6 transition-all duration-200 shadow-xs flex flex-col justify-between group min-h-40">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                      翻译 · 中译英段落
                    </span>
                    <h3 className="font-extrabold text-[#071e27] text-base group-hover:text-[#003178] transition-colors mt-3">
                      段落翻译：可再生能源与城市发展
                    </h3>
                    <p className="text-xs text-gray-400 font-semibold mt-1.5">
                      30 分钟 · 中文干扰、搭配、时态语态
                    </p>
                  </div>
                  <button
                    onClick={() => setSubjectivePracticeMode('translation')}
                    className="mt-4 px-5 py-2 bg-[#003178] hover:bg-[#0d47a1] text-white font-bold text-xs rounded-xl self-end cursor-pointer"
                  >
                    开始翻译训练
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'review':
        return (
          <ReviewSection
            onTriggerModal={handleTriggerModal}
            persistedReviewCount={reviewItemCount}
            persistedReviewItems={persistedReviewItems}
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
              setIsPracticing(true);
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
            onStartReading={() => setIsPracticing(true)}
            onStartListening={() => setIsListeningPracticing(true)}
            onStartWriting={() => setSubjectivePracticeMode('writing')}
            onStartTranslation={() => setSubjectivePracticeMode('translation')}
            onStartOnboarding={() => setShowOnboarding(true)}
            onViewReview={() => setActiveTab('review')}
            onStartSpeaking={() => setActiveTab('speaking')}
            onTriggerModal={handleTriggerModal}
            readingProgress={readingProgress}
            examCountdown={examCountdown}
            targetScore={activeGoal?.targetScore ?? targetScoreLimit ?? 550}
            estimatedScore={estimatedScore}
            abilityEvidenceCount={abilityEvidenceCount}
            dailyPlan={dailyPlan}
            reviewItemCount={reviewItemCount}
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
            setActiveTab={setActiveTab}
            examCountdown={examCountdown}
            onTriggerModal={handleTriggerModal}
          />
          <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden relative">
            {/* Top Right Floating Coach Button exactly as screens - Hide on today page to avoid overlapping */}
            {activeTab !== 'today' && (
              <div className="absolute top-6 right-8 z-30 pointer-events-auto flex items-center gap-4">
                <span className="text-xs font-semibold text-[#1e333c] select-none bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/45">
                  距考试 {examCountdown} 天
                </span>
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="px-4.5 py-2.5 bg-[#003178] hover:bg-[#07244f] text-white rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border border-[#cfe6f2] shadow-2xs hover:scale-[1.03]"
                >
                  <GraduationCap className="h-4.5 w-4.5 text-emerald-300 animate-pulse shrink-0" />
                  <span>AI 英语能力教练</span>
                </button>
              </div>
            )}
            {renderTabContent()}
          </main>
        </>
      )}

      {/* Premium Unified Custom Modal Component overlay */}
      {modalContent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-3xl p-6.5 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col space-y-4 transition-all">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-extrabold text-[#003178] text-sm flex items-center gap-1.5 font-sans">
                <Sparkles className="h-5 w-5 text-amber-500 fill-amber-400 animate-pulse" />
                <span>{modalContent.title}</span>
              </h3>
              <button
                onClick={() => setModalContent(null)}
                className="text-slate-400 hover:text-[#003178] p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
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
                className="px-5 py-2.5 bg-[#003178] hover:bg-[#0d47a1] text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer pointer-events-auto transition-transform active:scale-[0.98]"
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
