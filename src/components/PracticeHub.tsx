import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Headphones,
  Languages,
  LibraryBig,
  ListChecks,
  PenLine,
  ShieldCheck,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { CET4_VOCABULARY_BANK, VOCABULARY_SESSION_SIZE } from '../data';
import {
  CET4_LISTENING_PRACTICE_QUESTIONS,
  CET4_CLOZE_PRACTICE_QUESTIONS,
  CET4_GRAMMAR_PRACTICE_QUESTIONS,
  CET4_MOCK_EXAM_BANK,
  CET4_QUESTION_BANK_COVERAGE,
  CET4_READING_BANK,
  CET4_TRANSLATION_PROMPT_BANK,
  CET4_WRITING_PROMPT_BANK,
} from '../questionBank';
import { Attempt, DailyPlan, Passage, PracticeSession, SkillProfile } from '../types';
import {
  buildPracticeModuleProgress,
  buildPracticeQuestionStatusList,
  filterUnpracticedItems,
  matchesPracticeModuleAttempt,
  mergePracticeProgressAttempts,
  type PracticeQuestionDescriptor,
  type PracticeQuestionStatusItem,
  type PracticeModuleTotals,
  type PracticeProgressModuleId,
} from '../domain/practice/practicedQuestions';
import {
  loadPracticeDraft,
  practiceDraftKeys,
  type ListeningPracticeDraft,
  type ReadingPracticeDraft,
  type VocabularyPracticeDraft,
} from '../domain/practice/draftProgress';

type PracticeModuleId = PracticeProgressModuleId;

interface PracticeHubProps {
  examId: string;
  examName: string;
  onStartOnboarding: () => void;
  onStartVocabulary: (questionId?: string) => void;
  onStartGrammar: (questionId?: string) => void;
  onStartCloze: (questionId?: string) => void;
  onStartReading: (passage: Passage, questionId?: string) => void;
  onStartListening: (questionId?: string) => void;
  onStartWriting: (questionId?: string) => void;
  onStartTranslation: (questionId?: string) => void;
  onStartMockExam: () => void;
  skillProfiles?: SkillProfile[];
  dailyPlan?: DailyPlan | null;
  readingPassages?: Passage[];
  persistedAttempts?: Attempt[];
  persistedPracticeSessions?: PracticeSession[];
}

interface PracticeTone {
  pill: string;
  card: string;
  active: string;
}

interface PracticeModule {
  id: PracticeModuleId;
  Icon: LucideIcon;
  label: string;
  subtitle: string;
  count: string;
  duration: string;
  actionLabel: string;
  outcome: string;
  route: string[];
  skillArea: SkillProfile['skillArea'];
  recommendation?: string;
  tone: PracticeTone;
  onStart: () => void;
}

const TONES: Record<'blue' | 'green' | 'amber' | 'rose', PracticeTone> = {
  blue: {
    pill: 'border-[#dde5ee] bg-[#f8fafc] text-[#334155]',
    card: 'border-[#dde5ee] bg-white',
    active: 'border-[#003178] bg-[#f8fbff] shadow-sm ring-1 ring-[#e7eef7]',
  },
  green: {
    pill: 'border-[#dde5ee] bg-[#f8fafc] text-[#334155]',
    card: 'border-[#dde5ee] bg-white',
    active: 'border-[#003178] bg-[#f8fbff] shadow-sm ring-1 ring-[#e7eef7]',
  },
  amber: {
    pill: 'border-[#dde5ee] bg-[#f8fafc] text-[#334155]',
    card: 'border-[#dde5ee] bg-white',
    active: 'border-[#003178] bg-[#f8fbff] shadow-sm ring-1 ring-[#e7eef7]',
  },
  rose: {
    pill: 'border-[#dde5ee] bg-[#f8fafc] text-[#334155]',
    card: 'border-[#dde5ee] bg-white',
    active: 'border-[#003178] bg-[#f8fbff] shadow-sm ring-1 ring-[#e7eef7]',
  },
};

const CAREFUL_READING_QUESTION_TOTAL = CET4_READING_BANK.reduce(
  (sum, passage) => sum + passage.questions.length,
  0,
);
const LISTENING_SPECIALTY_QUESTION_TOTAL = CET4_LISTENING_PRACTICE_QUESTIONS
  .filter((question) => question.questionTypeId === 'long-conversation').length;

const PRACTICE_MODULE_TOTALS: PracticeModuleTotals = {
  vocabulary: CET4_VOCABULARY_BANK.length,
  cloze: CET4_CLOZE_PRACTICE_QUESTIONS.length,
  grammar: CET4_GRAMMAR_PRACTICE_QUESTIONS.length,
  reading: CAREFUL_READING_QUESTION_TOTAL,
  listening: LISTENING_SPECIALTY_QUESTION_TOTAL,
  writing: CET4_WRITING_PROMPT_BANK.length,
  translation: CET4_TRANSLATION_PROMPT_BANK.length,
  mock: CET4_MOCK_EXAM_BANK.length,
};

const GRAMMAR_DRAFT_PASSAGE_ID = 'cet4-grammar-structure-practice';
const CLOZE_DRAFT_PASSAGE_ID = 'cet4-cloze-context-practice';
const LISTENING_DRAFT_QUESTION_IDS = new Set(
  CET4_LISTENING_PRACTICE_QUESTIONS
    .filter((question) => question.questionTypeId === 'long-conversation')
    .map((_, index) => String(index + 1)),
);
const QUESTION_STATUS_PREVIEW_LIMIT = 120;

function buildPracticeQuestionBank(): Record<PracticeModuleId, PracticeQuestionDescriptor[]> {
  return {
    vocabulary: CET4_VOCABULARY_BANK.map((item) => ({
      id: item.id,
      moduleId: 'vocabulary',
      questionTypeId: 'cet4-core-vocabulary',
      label: item.word,
    })),
    cloze: CET4_CLOZE_PRACTICE_QUESTIONS.map((question) => ({
      id: question.id,
      moduleId: question.moduleId,
      questionTypeId: question.questionTypeId,
      label: question.title,
    })),
    grammar: CET4_GRAMMAR_PRACTICE_QUESTIONS.map((question) => ({
      id: question.id,
      moduleId: question.moduleId,
      questionTypeId: question.questionTypeId,
      label: question.title,
    })),
    reading: CET4_READING_BANK.flatMap((passage, passageIndex) => passage.questions.map((question, questionIndex) => ({
      id: question.id,
      moduleId: question.moduleId ?? passage.moduleId ?? 'reading',
      questionTypeId: question.questionTypeId,
      label: `第 ${passageIndex + 1} 组-${questionIndex + 1} 题`,
      groupLabel: passage.title,
    }))),
    listening: CET4_LISTENING_PRACTICE_QUESTIONS
      .filter((question) => question.questionTypeId === 'long-conversation')
      .map((question, index) => ({
        id: String(index + 1),
        moduleId: question.moduleId,
        questionTypeId: question.questionTypeId,
        label: `长对话 ${index + 1}`,
      })),
    writing: CET4_WRITING_PROMPT_BANK.map((item) => ({
      id: item.id,
      moduleId: item.moduleId,
      questionTypeId: item.questionTypeId,
      label: item.title,
    })),
    translation: CET4_TRANSLATION_PROMPT_BANK.map((item) => ({
      id: item.id,
      moduleId: item.moduleId,
      questionTypeId: item.questionTypeId,
      label: item.title,
    })),
    mock: CET4_MOCK_EXAM_BANK.map((paper, index) => ({
      id: `mock-paper-${index + 1}`,
      moduleId: 'mock',
      questionTypeId: 'cet4-standard-mock',
      label: paper.title,
    })),
  };
}

function createDraftAttempt(params: {
  moduleId: string;
  questionTypeId: string;
  questionId: string;
}): Attempt {
  return {
    id: `draft-${params.moduleId}-${params.questionId}`,
    sessionId: `draft-${params.moduleId}`,
    questionId: params.questionId,
    examId: 'cet4',
    moduleId: params.moduleId,
    questionTypeId: params.questionTypeId,
    answer: 'draft',
    isCorrect: true,
    elapsedSeconds: 0,
    mistakeReasons: [],
    createdAt: 'draft',
  };
}

function appendDraftAttemptsFromAnswers(
  draftAttempts: Attempt[],
  params: {
    answers: unknown[];
    questions: Array<{ id: string | number; moduleId?: string; questionTypeId?: string }>;
    fallbackModuleId: string;
    fallbackQuestionTypeId: string;
  },
) {
  params.answers.forEach((answer, index) => {
    if (!answer) return;
    const question = params.questions[index];
    if (!question) return;

    draftAttempts.push(
      createDraftAttempt({
        moduleId: question.moduleId ?? params.fallbackModuleId,
        questionTypeId: question.questionTypeId ?? params.fallbackQuestionTypeId,
        questionId: String(question.id),
      }),
    );
  });
}

export default function PracticeHub({
  examId,
  examName,
  onStartOnboarding,
  onStartVocabulary,
  onStartGrammar,
  onStartCloze,
  onStartReading,
  onStartListening,
  onStartWriting,
  onStartTranslation,
  onStartMockExam,
  skillProfiles = [],
  dailyPlan,
  readingPassages: availableReadingPassages = CET4_READING_BANK,
  persistedAttempts = [],
  persistedPracticeSessions = [],
}: PracticeHubProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<PracticeModuleId>('vocabulary');
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const [visibleReadingCount, setVisibleReadingCount] = useState(8);
  const [expandedStatusModuleIds, setExpandedStatusModuleIds] = useState<PracticeModuleId[]>([]);
  const isCet4 = examId === 'cet4';
  const practiceQuestionBank = useMemo(() => buildPracticeQuestionBank(), []);
  const mergedPracticeAttempts = useMemo(() => {
    const draftAttempts: Attempt[] = [];
    const filterDraftQuestions = (
      questions: Array<{ id: string | number; moduleId?: string; questionTypeId?: string }>,
      moduleId: PracticeModuleId,
    ) => {
      const unpracticedQuestions = questions.filter((question) => !persistedAttempts.some(
        (attempt) =>
          matchesPracticeModuleAttempt(attempt, moduleId)
          && String(attempt.questionId) === String(question.id),
      ));
      return unpracticedQuestions.length > 0 ? unpracticedQuestions : questions;
    };

    const vocabularyDraft = loadPracticeDraft<VocabularyPracticeDraft>(practiceDraftKeys.vocabulary);
    if (vocabularyDraft?.version === 1) {
      const availableVocabularyItems = filterUnpracticedItems(CET4_VOCABULARY_BANK, persistedAttempts, 'vocabulary');
      const packCount = Math.max(1, Math.ceil(availableVocabularyItems.length / VOCABULARY_SESSION_SIZE));
      const packIndex = Math.min(Math.max(0, vocabularyDraft.packIndex), packCount - 1);
      const sessionItems = availableVocabularyItems.slice(
        packIndex * VOCABULARY_SESSION_SIZE,
        (packIndex + 1) * VOCABULARY_SESSION_SIZE,
      );

      appendDraftAttemptsFromAnswers(draftAttempts, {
        answers: Array.isArray(vocabularyDraft.answers) ? vocabularyDraft.answers : [],
        questions: sessionItems.map((item) => ({
          id: item.id,
          moduleId: 'vocabulary',
          questionTypeId: 'cet4-core-vocabulary',
        })),
        fallbackModuleId: 'vocabulary',
        fallbackQuestionTypeId: 'cet4-core-vocabulary',
      });
    }

    availableReadingPassages.forEach((passage) => {
      const readingDraft = loadPracticeDraft<ReadingPracticeDraft>(practiceDraftKeys.reading(passage.id));
      if (!readingDraft || readingDraft.version !== 1 || readingDraft.passageId !== passage.id) return;

      appendDraftAttemptsFromAnswers(draftAttempts, {
        answers: Array.isArray(readingDraft.answers) ? readingDraft.answers : [],
        questions: passage.questions,
        fallbackModuleId: passage.moduleId ?? 'reading',
        fallbackQuestionTypeId: passage.questions[0]?.questionTypeId ?? 'careful-reading',
      });
    });

    const grammarDraft = loadPracticeDraft<ReadingPracticeDraft>(practiceDraftKeys.reading(GRAMMAR_DRAFT_PASSAGE_ID));
    if (grammarDraft?.version === 1 && grammarDraft.passageId === GRAMMAR_DRAFT_PASSAGE_ID) {
      appendDraftAttemptsFromAnswers(draftAttempts, {
        answers: Array.isArray(grammarDraft.answers) ? grammarDraft.answers : [],
        questions: filterDraftQuestions(CET4_GRAMMAR_PRACTICE_QUESTIONS, 'grammar'),
        fallbackModuleId: 'grammar',
        fallbackQuestionTypeId: 'grammar-structure',
      });
    }

    const clozeDraft = loadPracticeDraft<ReadingPracticeDraft>(practiceDraftKeys.reading(CLOZE_DRAFT_PASSAGE_ID));
    if (clozeDraft?.version === 1 && clozeDraft.passageId === CLOZE_DRAFT_PASSAGE_ID) {
      appendDraftAttemptsFromAnswers(draftAttempts, {
        answers: Array.isArray(clozeDraft.answers) ? clozeDraft.answers : [],
        questions: filterDraftQuestions(CET4_CLOZE_PRACTICE_QUESTIONS, 'cloze'),
        fallbackModuleId: 'grammar',
        fallbackQuestionTypeId: 'cloze-choice',
      });
    }

    const listeningDraft = loadPracticeDraft<ListeningPracticeDraft>(practiceDraftKeys.listening);
    if (listeningDraft?.version === 1 && listeningDraft.answersByQuestionId) {
      Object.entries(listeningDraft.answersByQuestionId).forEach(([questionId, answer]) => {
        if (!answer?.isSubmitted || !LISTENING_DRAFT_QUESTION_IDS.has(questionId)) return;
        draftAttempts.push(
          createDraftAttempt({
            moduleId: 'listening',
            questionTypeId: 'long-conversation',
            questionId,
          }),
        );
      });
    }

    return mergePracticeProgressAttempts({
      persistedAttempts,
      draftAttempts,
    });
  }, [availableReadingPassages, persistedAttempts]);

  const readingPassages = useMemo(() => availableReadingPassages.map((passage) => ({
    id: passage.id,
    title: passage.title,
    category: '原创模拟 · 仔细阅读',
    words: passage.content.split(/\s+/).filter(Boolean).length,
    duration: `${Math.max(12, passage.questions.length * 3)} 分钟`,
    questionCount: passage.questions.length,
    data: passage,
  })), [availableReadingPassages]);
  const firstReadingPassage = readingPassages[0];
  const practiceHistoryByModule = useMemo(() => {
    return buildPracticeModuleProgress({
      attempts: mergedPracticeAttempts,
      sessions: persistedPracticeSessions,
      totals: PRACTICE_MODULE_TOTALS,
    });
  }, [mergedPracticeAttempts, persistedPracticeSessions]);
  const recordedAttemptCount = mergedPracticeAttempts.length;
  const latestScoreBySkill = useMemo(() => {
    const result = new Map<SkillProfile['skillArea'], SkillProfile>();
    skillProfiles.forEach((profile) => {
      const current = result.get(profile.skillArea);
      if (!current || profile.lastUpdatedAt > current.lastUpdatedAt) result.set(profile.skillArea, profile);
    });
    return result;
  }, [skillProfiles]);
  const moduleIdForTask = (task: DailyPlan['tasks'][number]): PracticeModuleId | undefined => {
    const mode = String(task.payload?.mode ?? '');
    if (task.type === 'mock') return 'mock';
    if (mode.includes('cloze')) return 'cloze';
    if (mode.includes('grammar')) return 'grammar';
    if (['vocabulary', 'reading', 'listening', 'writing', 'translation'].includes(task.skillArea)) {
      return task.skillArea as PracticeModuleId;
    }
    return undefined;
  };
  const plannedModuleIds = new Set<PracticeModuleId>(
    dailyPlan?.tasks.map(moduleIdForTask).filter((id): id is PracticeModuleId => Boolean(id)) ?? [],
  );
  const latestProfileForModule = (moduleId: PracticeModuleId, skillArea: SkillProfile['skillArea']) => {
    const profiles = skillProfiles
      .filter((profile) => {
        const subSkill = profile.subSkillId.toLowerCase();
        if (moduleId === 'cloze') return subSkill.includes('cloze');
        if (moduleId === 'vocabulary') return profile.skillArea === 'vocabulary' && !subSkill.includes('cloze');
        return profile.skillArea === skillArea;
      })
      .sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt));
    return profiles[0] ?? latestScoreBySkill.get(skillArea);
  };
  const recommendationFor = (moduleId: PracticeModuleId, skillArea: SkillProfile['skillArea']) => {
    const profile = latestProfileForModule(moduleId, skillArea);
    if (plannedModuleIds.has(moduleId)) return '今日计划推荐';
    if (!profile) return '缺少诊断证据';
    if (profile.score < 60) return '诊断弱项优先';
    if (profile.score < 75) return '需要巩固';
    return '';
  };

  const modules: PracticeModule[] = [
    {
      id: 'vocabulary',
      Icon: Volume2,
      label: '词汇听音',
      subtitle: '先听单词和例句，再做词义辨析',
      count: `核心词汇 ${CET4_VOCABULARY_BANK.length} 个`,
      duration: '12m/组',
      actionLabel: '开始单词练习',
      outcome: '生成词汇能力证据，低信心或错误项进入主动回忆队列。',
      route: ['自动播报', '释义选择', '把握度标记', '错因入库'],
      skillArea: 'vocabulary',
      recommendation: recommendationFor('vocabulary', 'vocabulary'),
      tone: TONES.green,
      onStart: onStartVocabulary,
    },
    {
      id: 'cloze',
      Icon: ListChecks,
      label: '完形/选词填空',
      subtitle: '围绕上下文、词义辨析、固定搭配和句际逻辑做小题闭环',
      count: `完形/语境题 ${CET4_CLOZE_PRACTICE_QUESTIONS.length} 题`,
      duration: '12m/组',
      actionLabel: '开始完形填空训练',
      outcome: '补齐完形与选词填空能力证据，避免只背单词但不会进语境。',
      route: ['读上下文', '选词入空', '解释搭配', '错因复习'],
      skillArea: 'vocabulary',
      recommendation: recommendationFor('cloze', 'vocabulary'),
      tone: TONES.green,
      onStart: onStartCloze,
    },
    {
      id: 'grammar',
      Icon: ListChecks,
      label: '语法结构',
      subtitle: '训练时态、语态、非谓语、从句、连接词和固定搭配',
      count: `语法结构 ${CET4_GRAMMAR_PRACTICE_QUESTIONS.length} 题`,
      duration: '12m/组',
      actionLabel: '开始语法训练',
      outcome: '语法结果会写入 grammar 能力画像，并反向支撑写作、翻译和完形。',
      route: ['看句法线索', '选择结构', '解释规则', '写入画像'],
      skillArea: 'grammar',
      recommendation: recommendationFor('grammar', 'grammar'),
      tone: TONES.blue,
      onStart: onStartGrammar,
    },
    {
      id: 'reading',
      Icon: BookOpen,
      label: '仔细阅读',
      subtitle: '选择材料后进入定位、作答、错因反馈',
      count: `${CET4_READING_BANK.length} 组材料 / ${CAREFUL_READING_QUESTION_TOTAL} 题`,
      duration: '12-18m',
      actionLabel: '开始仔细阅读训练',
      outcome: '每题保留定位线索、作答、把握度和阅读能力画像。',
      route: ['选材料', '读文章', '逐题提交', '查看错因'],
      skillArea: 'reading',
      recommendation: recommendationFor('reading', 'reading'),
      tone: TONES.blue,
      onStart: () => {
        if (firstReadingPassage) onStartReading(firstReadingPassage.data);
      },
    },
    {
      id: 'listening',
      Icon: Headphones,
      label: '长对话精听',
      subtitle: '进入后自动语音播报，可暂停、调速、重听',
      count: `${LISTENING_SPECIALTY_QUESTION_TOTAL} 道长对话题`,
      duration: '15m',
      actionLabel: '开始听力训练',
      outcome: '听力作答会记录关键词漏听、转折漏听和低信心证据。',
      route: ['自动播报', '作答', '把握度', '听力错因'],
      skillArea: 'listening',
      recommendation: recommendationFor('listening', 'listening'),
      tone: TONES.blue,
      onStart: onStartListening,
    },
    {
      id: 'writing',
      Icon: PenLine,
      label: '短文写作',
      subtitle: '先写作，再拿结构化反馈',
      count: `${CET4_WRITING_PROMPT_BANK.length} 题`,
      duration: '30m',
      actionLabel: '开始写作训练',
      outcome: '写作输出会形成结构、语法、表达升级和复习项。',
      route: ['读题', '先输出', 'AI/规则反馈', '写入画像'],
      skillArea: 'writing',
      recommendation: recommendationFor('writing', 'writing'),
      tone: TONES.amber,
      onStart: onStartWriting,
    },
    {
      id: 'translation',
      Icon: Languages,
      label: '段落翻译',
      subtitle: '中译英段落，先产出译文再评阅',
      count: `${CET4_TRANSLATION_PROMPT_BANK.length} 题`,
      duration: '30m',
      actionLabel: '开始翻译训练',
      outcome: '保留中文干扰、搭配错误、句法转换等弱项证据。',
      route: ['读中文', '先翻译', '结构反馈', '复习表达'],
      skillArea: 'translation',
      recommendation: recommendationFor('translation', 'translation'),
      tone: TONES.amber,
      onStart: onStartTranslation,
    },
    {
      id: 'mock',
      Icon: ClipboardCheck,
      label: '阶段模考',
      subtitle: '完整 CET-4 四模块提交后才计入阶段证据',
      count: `${CET4_MOCK_EXAM_BANK.length} 套组卷容量`,
      duration: '125m',
      actionLabel: '开始阶段模考',
      outcome: '一次生成写作、听力、阅读、翻译四项分数和阶段验证证据。',
      route: ['写作', '听力', '阅读', '翻译', '提交检查'],
      skillArea: 'reading',
      recommendation: plannedModuleIds.has('mock') ? '今日计划推荐' : '',
      tone: TONES.rose,
      onStart: onStartMockExam,
    },
  ];
  const orderedModules = [...modules].sort((left, right) => {
    const rank = (module: PracticeModule) => {
      const score = latestProfileForModule(module.id, module.skillArea)?.score;
      if (module.recommendation === '今日计划推荐') return 0;
      if (module.recommendation === '诊断弱项优先') return 1;
      if (module.recommendation === '缺少诊断证据') return 2;
      if (module.recommendation === '需要巩固') return 3;
      return typeof score === 'number' ? 10 + score : 20;
    };
    return rank(left) - rank(right);
  });
  const recommendedModuleId = orderedModules[0]?.id ?? 'vocabulary';
  const recommendedModule = orderedModules[0];
  const recommendedTask = dailyPlan?.tasks.find((task) => moduleIdForTask(task) === recommendedModuleId);
  const selectedModule = orderedModules.find((module) => module.id === selectedModuleId) ?? orderedModules[0];
  const selectedQuestionStatuses = useMemo(() => buildPracticeQuestionStatusList({
    attempts: mergedPracticeAttempts,
    sessions: persistedPracticeSessions,
    moduleId: selectedModule.id,
    questions: practiceQuestionBank[selectedModule.id],
  }), [mergedPracticeAttempts, persistedPracticeSessions, practiceQuestionBank, selectedModule.id]);
  const statusExpanded = expandedStatusModuleIds.includes(selectedModule.id);
  const visibleQuestionStatuses = statusExpanded || selectedQuestionStatuses.length <= QUESTION_STATUS_PREVIEW_LIMIT
    ? selectedQuestionStatuses
    : selectedQuestionStatuses.slice(0, QUESTION_STATUS_PREVIEW_LIMIT);
  const selectedStatusPracticedCount = selectedQuestionStatuses.filter((item) => item.practiced).length;
  const selectedStatusRemainingCount = Math.max(0, selectedQuestionStatuses.length - selectedStatusPracticedCount);
  const visibleReadingPassages = readingPassages.slice(0, visibleReadingCount);
  const toggleStatusExpanded = () => {
    setExpandedStatusModuleIds((ids) => (
      ids.includes(selectedModule.id)
        ? ids.filter((id) => id !== selectedModule.id)
        : [...ids, selectedModule.id]
    ));
  };
  const handleStartStatusQuestion = (item: PracticeQuestionStatusItem) => {
    if (selectedModule.id === 'reading') {
      const targetPassage = CET4_READING_BANK.find((passage) =>
        passage.questions.some((question) => String(question.id) === item.id),
      );
      if (targetPassage) {
        onStartReading(targetPassage, item.id);
        return;
      }
    }

    if (selectedModule.id === 'vocabulary') {
      onStartVocabulary(item.id);
      return;
    }
    if (selectedModule.id === 'grammar') {
      onStartGrammar(item.id);
      return;
    }
    if (selectedModule.id === 'cloze') {
      onStartCloze(item.id);
      return;
    }
    if (selectedModule.id === 'listening') {
      onStartListening(item.id);
      return;
    }
    if (selectedModule.id === 'writing') {
      onStartWriting(item.id);
      return;
    }
    if (selectedModule.id === 'translation') {
      onStartTranslation(item.id);
      return;
    }

    selectedModule.onStart();
  };

  useEffect(() => {
    if (!hasManualSelection) setSelectedModuleId(recommendedModuleId);
  }, [hasManualSelection, recommendedModuleId]);

  return (
    <div className="app-page-surface ui-page">
      <div className="ui-page-content space-y-5">
        <header className="ui-page-header overflow-hidden">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="ui-page-eyebrow mb-3">
                <LibraryBig className="h-4 w-4" />
                {examName} 专项训练
              </div>
              <h2 className="text-2xl font-black leading-tight text-[#101828] sm:text-3xl">
                专项练习
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                选择一个能力，直接开始训练。
              </p>
              <div data-testid="practice-hub-summary" className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
                <span className="ui-chip ui-chip-accent">已记录 {recordedAttemptCount} 次作答</span>
                <span className="ui-chip">未练优先</span>
                <span className="ui-chip">耗尽回流</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onStartOnboarding}
              className="ui-button ui-button-primary shrink-0"
            >
              <GraduationCap className="h-4 w-4" />
              入门诊断
            </button>
          </div>

          {isCet4 && recommendedModule && (
            <div className="mt-5 rounded-2xl border border-[#cfe6f2] bg-[#f8fbff] px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs font-black text-[#003178]">推荐</div>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
                    优先进入「{recommendedModule.label}」{recommendedTask?.reason ? ` · ${recommendedTask.reason}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={recommendedModule.onStart}
                  className="ui-button ui-button-primary shrink-0"
                >
                  进入推荐专项
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </header>

        {!isCet4 && (
          <section className="ui-panel-soft text-sm font-bold leading-6 text-slate-700">
            当前目标考试「{examName}」还处于题库建设阶段，暂不开放专项练习。请在设置或入门诊断中切回 CET-4 后继续训练。
          </section>
        )}

        {isCet4 && (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="专项练习模块">
          {orderedModules.map((module, index) => {
            const Icon = module.Icon;
            const isActive = selectedModuleId === module.id;
            const history = practiceHistoryByModule.get(module.id);
            const progressLabel = history ? `已练 ${history.practiced}/${history.total}` : '暂无记录';
            const historyLabel = module.id === 'mock'
              ? '阶段入口'
              : history && history.total > 0 && history.remaining === 0
                ? '题库回流'
                : '未练优先';
            return (
              <article
                key={module.id}
                className={`ui-panel flex min-h-[250px] flex-col transition ${
                  isActive ? 'border-[#003178] bg-[#f8fbff] ring-1 ring-[#dcecff]' : 'hover:border-[#003178]/30'
                }`}
              >
                <button
                  type="button"
                  data-testid={`practice-module-select-${module.id}`}
                  onClick={() => {
                    setHasManualSelection(true);
                    setSelectedModuleId(module.id);
                  }}
                  aria-pressed={isActive}
                  className="flex flex-1 flex-col text-left focus:outline-none focus:ring-2 focus:ring-[#003178]/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${
                      isActive ? 'border-[#cfe6f2] bg-[#eef7fc] text-[#003178]' : module.tone.pill
                    }`}>
                      <Icon className="h-3.5 w-3.5" />
                      {index + 1}
                    </span>
                    <span className={`text-[11px] font-black ${isActive ? 'text-[#003178]' : 'text-slate-400'}`}>
                      {isActive ? '已选择' : module.duration}
                    </span>
                  </div>
                  {module.recommendation ? (
                    <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${
                      isActive ? 'bg-[#eef7fc] text-[#003178]' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {module.recommendation}
                    </span>
                  ) : null}
                  <h3 className={`mt-3 text-lg font-black ${isActive ? 'text-[#101828]' : 'text-[#071e27]'}`}>{module.label}</h3>
                  <p className={`mt-2 line-clamp-1 text-sm font-semibold leading-5 ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>
                    {module.subtitle}
                  </p>
                  <div className={`mt-3 text-xs font-black ${isActive ? 'text-slate-600' : 'text-slate-500'}`}>
                    {module.count}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-4 text-[11px] font-black">
                    <span
                      data-testid={`practice-module-progress-${module.id}`}
                      className={isActive ? 'text-[#003178]' : 'text-slate-500'}
                    >
                      {progressLabel}
                    </span>
                    <span
                      data-testid={`practice-module-history-${module.id}`}
                      className={isActive ? 'text-[#003178]' : 'text-slate-400'}
                    >
                      {historyLabel}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  data-testid={`practice-module-action-${module.id}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    module.onStart();
                  }}
                  className={`ui-button ui-button-full mt-4 ${isActive ? 'ui-button-primary' : 'ui-button-secondary'}`}
                >
                  {module.actionLabel}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </article>
            );
          })}
        </section>
        )}

        {isCet4 && (
          <QuestionStatusPanel
            moduleId={selectedModule.id}
            moduleLabel={selectedModule.label}
            statuses={visibleQuestionStatuses}
            totalCount={selectedQuestionStatuses.length}
            practicedCount={selectedStatusPracticedCount}
            remainingCount={selectedStatusRemainingCount}
            expanded={statusExpanded}
            onToggleExpanded={toggleStatusExpanded}
            onSelectQuestion={handleStartStatusQuestion}
          />
        )}

        {isCet4 && selectedModule.id === 'reading' && (
          <details className="ui-panel" open>
            <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-black text-[#003178]">
                <FileText className="h-4 w-4" />
                阅读材料库
              </span>
              <span className="text-xs font-bold leading-5 text-slate-500">
                {visibleReadingPassages.length}/{readingPassages.length} 组
              </span>
            </summary>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {visibleReadingPassages.map((passage) => (
                <article
                  key={passage.id}
                  className="flex min-h-40 flex-col justify-between rounded-2xl border border-[#dde5ee] bg-[#f8fafc] p-4 transition hover:border-[#003178]/20 hover:bg-white"
                >
                  <div>
                    <span className="ui-chip">
                      {passage.category}
                    </span>
                    <h4 className="mt-3 line-clamp-2 text-base font-black text-[#071e27]">{passage.title}</h4>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                      <span>{passage.words} 词</span>
                      <span>{passage.questionCount} 题</span>
                      <span>{passage.duration}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartReading(passage.data)}
                    className="ui-button ui-button-primary mt-4 w-full sm:w-auto"
                  >
                    <FileText className="h-4 w-4" />
                    开始仔细阅读训练
                  </button>
                </article>
              ))}
            </div>
            {visibleReadingCount < readingPassages.length && (
              <button
                type="button"
                onClick={() => setVisibleReadingCount((count) => Math.min(readingPassages.length, count + 8))}
                className="ui-button ui-button-secondary ui-button-full mt-4"
              >
                展开更多阅读材料
              </button>
            )}
          </details>
        )}

        {isCet4 && (
        <details className="ui-panel">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left">
            <span className="inline-flex items-center gap-2 text-sm font-black text-[#003178]">
              <ShieldCheck className="h-4 w-4" />
              题库范围
            </span>
            <span className="text-xs font-bold text-slate-500">{examName} · 原创模拟</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="ui-chip ui-chip-accent mb-3">
                <ListChecks className="h-3.5 w-3.5" />
                题型覆盖
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CET4_QUESTION_BANK_COVERAGE.slice(0, 8).map((item) => (
                  <div key={`${item.moduleId}-${item.questionTypeId}`}>
                    <CoverageCard item={item} tone="blue" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {[
                ['诊断', '按目标考试生成画像'],
                ['专项', '只显示当前题库'],
                ['模考', '使用 CET-4 结构卷'],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-2xl border border-[#dde5ee] bg-[#f8fafc] p-3">
                  <div className="text-xs font-black text-[#003178]">{title}</div>
                  <p className="mt-1 text-[11px] font-semibold text-slate-600">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </details>
        )}
      </div>
    </div>
  );
}

function QuestionStatusPanel({
  moduleId,
  moduleLabel,
  statuses,
  totalCount,
  practicedCount,
  remainingCount,
  expanded,
  onToggleExpanded,
  onSelectQuestion,
}: {
  moduleId: PracticeModuleId;
  moduleLabel: string;
  statuses: PracticeQuestionStatusItem[];
  totalCount: number;
  practicedCount: number;
  remainingCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onSelectQuestion: (item: PracticeQuestionStatusItem) => void;
}) {
  const canToggle = totalCount > QUESTION_STATUS_PREVIEW_LIMIT;

  return (
    <section data-testid={`practice-question-status-${moduleId}`} className="ui-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="ui-chip ui-chip-accent">
            <ListChecks className="h-3.5 w-3.5" />
            题号列表 · {moduleLabel}
          </span>
          <h3 className="mt-3 text-lg font-black text-[#101828]">
            已答 {practicedCount} / {totalCount}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-black">
          <span className="rounded-full border border-[#cfe6f2] bg-[#eef7fc] px-3 py-1.5 text-[#003178]">
            已答 {practicedCount}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-500">
            未答 {remainingCount}
          </span>
        </div>
      </div>

      <div role="list" className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
        {statuses.map((item) => (
          <div
            key={item.id}
            role="listitem"
            className="min-w-11"
          >
            <button
              type="button"
              data-testid={`practice-question-status-${moduleId}-${item.number}`}
              title={`${item.groupLabel ? `${item.groupLabel} · ` : ''}${item.label} · ${item.practiced ? '已答' : '未答'} · 点击进入本题`}
              aria-label={`${moduleLabel} 第 ${item.number} 题 ${item.practiced ? '已答' : '未答'}，点击进入本题`}
              onClick={() => onSelectQuestion(item)}
              className={`flex h-11 w-full min-w-11 items-center justify-center rounded-xl border text-xs font-black transition hover:-translate-y-0.5 hover:border-[#003178]/45 focus:outline-none focus:ring-2 focus:ring-[#003178]/25 ${
                item.practiced
                  ? 'border-[#cfe6f2] bg-[#eef7fc] text-[#003178]'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              {item.number}
            </button>
          </div>
        ))}
      </div>

      {canToggle && (
        <button
          type="button"
          onClick={onToggleExpanded}
          className="ui-button ui-button-secondary ui-button-full mt-4"
        >
          {expanded ? '收起题号列表' : `展开全部 ${totalCount} 题`}
        </button>
      )}
    </section>
  );
}

function CoverageCard({
  item,
  tone,
}: {
  item: {
    moduleId: string;
    questionTypeId: string;
    name: string;
    trainingRoute: string;
    builtInCount: number;
    officialCount: string;
    durationMinutes: number;
  };
  tone: 'blue' | 'green';
}) {
  const titleClassName = tone === 'green' ? 'text-emerald-800' : 'text-[#003178]';
  const cardClassName = tone === 'green'
    ? 'border-emerald-100 bg-emerald-50/55'
    : 'border-slate-100 bg-slate-50';

  return (
    <div className={`rounded-2xl border p-3 ${cardClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-xs font-black ${titleClassName}`}>{item.name}</div>
          <div className="mt-1 line-clamp-2 text-[10px] font-bold text-slate-500">{item.trainingRoute}</div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">
          {item.builtInCount}
        </span>
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-500">
        <span>结构 {item.officialCount}</span>
        <span>{item.durationMinutes}m</span>
      </div>
    </div>
  );
}
