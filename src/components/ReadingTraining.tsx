import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, HelpCircle, Headphones, ListChecks, LoaderCircle, Sparkles, Target } from 'lucide-react';
import { Attempt, ChoiceOption, Passage, PracticeCompletionReport, Question, SkillArea } from '../types';
import { getReadingChineseSupport } from '../domain/practice/chineseSupport';
import { buildChoiceReplayAnswer } from '../domain/practice/attemptReplay';
import {
  ChoiceConfidence,
  ChoicePracticeDraftAnswer,
  ReadingPracticeDraft,
  clampDraftIndex,
  clearPracticeDraft,
  loadPracticeDraft,
  practiceDraftKeys,
  savePracticeDraft,
} from '../domain/practice/draftProgress';
import { buildChoicePracticeReport } from '../domain/practice/reports';
import { getQuestionSentenceSupport } from '../domain/practice/sentenceTranslations';
import { getGrammarStructureTopicByFocus } from '../domain/practice/grammarStructureGuides';
import { getPracticeMethodGuide } from '../domain/practice/methodGuides';

interface ReadingTrainingProps {
  passage: Passage;
  initialQuestionId?: string;
  replayAttempt?: Attempt;
  onBack: () => void;
  onComplete: (score: number, report: PracticeCompletionReport) => Promise<void> | void;
  onAnswerRecorded?: (report: PracticeCompletionReport) => Promise<void> | void;
}

type ReadingAnswer = ChoicePracticeDraftAnswer | undefined;
type AnswerRecordStatus = 'idle' | 'saving' | 'saved' | 'failed';
const CHOICE_OPTIONS: ChoiceOption[] = ['A', 'B', 'C', 'D'];
const CHOICE_CONFIDENCES: ChoiceConfidence[] = ['sure', 'not_sure', 'guess'];

const GRAMMAR_TOPIC_RULE_HINTS: Record<string, string> = {
  tense: '先看时间线索，再匹配谓语形式。',
  voice: '先判断主语和动作关系，再确定主动或被动。',
  nonfinite: '先确认句子已有谓语，再判断 to do、doing 或 done。',
  clauses: '先看空格前后是否是完整分句，再判断连接词逻辑。',
  agreement: '先找真正主语，再让谓语和主语保持一致。',
  fixed: '先识别固定结构，再检查空格后的词形。',
  comparison: '先看比较、数量或介词后接成分是否完整。',
  inversion: '先看否定词、限制词或虚拟语气信号，再检查语序和动词形式。',
  other: '先找句子主干，再按选项差异回到具体规则。',
};

function formatGrammarFocusLabel(focus: string | undefined) {
  const parts = (focus ?? '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return '综合结构';

  const [category, rule] = parts;
  if (!rule) return category;

  const readableRule = rule.replace(/-/g, ' ');
  if (/^[A-Za-z]+$/.test(rule)) return `${category} / ${rule} 引导`;
  if (/^[A-Za-z][A-Za-z\s-]+$/.test(rule)) return `${category} / ${readableRule}`;
  return `${category} / ${rule}`;
}

function sanitizeGrammarSentence(sentence: string | undefined) {
  return (sentence ?? '')
    .replace(/\s*\([^)]*\|[^)]*\)\s*$/u, '')
    .trim();
}

function sanitizeGrammarExplanation(explanation: string) {
  return explanation
    .replace(/\s*本题语境：[^。.!?]*[。.!?]?/g, '')
    .trim();
}

const findQuestionIndexById = (passage: Passage, questionId?: string) => {
  if (!questionId) return 0;
  const targetIndex = passage.questions.findIndex((question) => String(question.id) === questionId);
  return targetIndex >= 0 ? targetIndex : 0;
};

const getQuestionMatchedAnswer = (
  answers: ReadingAnswer[],
  index: number,
  question: Question | undefined,
  requireQuestionIdMatch: boolean,
) => {
  const answer = answers[index];
  if (!answer) return undefined;
  if (!requireQuestionIdMatch || !question) return answer;
  return answer.questionId && answer.questionId === String(question.id) ? answer : undefined;
};

const sanitizeQuestionMatchedAnswers = (
  answers: ReadingAnswer[],
  passage: Passage,
  requireQuestionIdMatch: boolean,
) => {
  if (!requireQuestionIdMatch) return answers;
  return answers.map((_, index) => getQuestionMatchedAnswer(answers, index, passage.questions[index], true));
};

const isChoicePracticeDraftAnswer = (answer: unknown): answer is ChoicePracticeDraftAnswer => {
  if (!answer || typeof answer !== 'object') return false;
  const candidate = answer as Partial<ChoicePracticeDraftAnswer>;
  return (
    CHOICE_OPTIONS.includes(candidate.selected as ChoiceOption)
    && typeof candidate.correct === 'boolean'
    && CHOICE_CONFIDENCES.includes(candidate.confidence as ChoiceConfidence)
  );
};

const normalizeReadingAnswers = (answers: unknown): ReadingAnswer[] => {
  if (!Array.isArray(answers)) return [];
  return answers.map((answer) => (isChoicePracticeDraftAnswer(answer) ? answer : undefined));
};

const serializeReadingAnswers = (answers: ReadingAnswer[]) =>
  Array.from(answers, (answer) => answer ?? null);

const createEmptyReadingDraftState = (passage: Passage, initialQuestionId?: string) => ({
  restored: false,
  replayed: false,
  startedAt: new Date().toISOString(),
  currentIdx: findQuestionIndexById(passage, initialQuestionId),
  selectedOpt: null as ChoiceOption | null,
  confidence: null as ChoiceConfidence | null,
  isSubmitted: false,
  answers: [] as ReadingAnswer[],
});

const createReadingReplayState = (passage: Passage, initialQuestionId: string | undefined, replayAttempt?: Attempt) => {
  if (!initialQuestionId || !replayAttempt) return null;
  const currentIdx = findQuestionIndexById(passage, initialQuestionId);
  const currentQuestion = passage.questions[currentIdx];
  if (!currentQuestion) return null;
  const replayAnswer = buildChoiceReplayAnswer(replayAttempt, currentQuestion.correctAnswer);
  if (!replayAnswer) return null;

  const answers: ReadingAnswer[] = [];
  answers[currentIdx] = {
    ...replayAnswer,
    questionId: String(currentQuestion.id),
    moduleId: currentQuestion.moduleId ?? passage.moduleId ?? 'reading',
    questionTypeId: currentQuestion.questionTypeId ?? passage.questions[0]?.questionTypeId ?? 'careful-reading',
  };

  return {
    restored: false,
    replayed: true,
    startedAt: new Date().toISOString(),
    currentIdx,
    selectedOpt: replayAnswer.selected,
    confidence: replayAnswer.confidence,
    isSubmitted: true,
    answers,
  };
};

const loadReadingDraftState = (passage: Passage, initialQuestionId?: string, replayAttempt?: Attempt) => {
  const fallback = createEmptyReadingDraftState(passage, initialQuestionId);
  const replay = createReadingReplayState(passage, initialQuestionId, replayAttempt);
  if (replay) return replay;

  const draft = loadPracticeDraft<ReadingPracticeDraft>(practiceDraftKeys.reading(passage.id));
  if (!draft || draft.version !== 1 || draft.passageId !== passage.id || passage.questions.length === 0) {
    return fallback;
  }

  const requireQuestionIdMatch = passage.moduleId === 'grammar' || Boolean(initialQuestionId);
  const answers = sanitizeQuestionMatchedAnswers(
    normalizeReadingAnswers(draft.answers),
    passage,
    requireQuestionIdMatch,
  );
  const currentIdx = initialQuestionId
    ? findQuestionIndexById(passage, initialQuestionId)
    : clampDraftIndex(draft.currentIdx, passage.questions.length);
  const currentQuestion = passage.questions[currentIdx];
  const isExplicitQuestionJump = Boolean(initialQuestionId);
  const savedAnswer = getQuestionMatchedAnswer(answers, currentIdx, currentQuestion, requireQuestionIdMatch);
  const isSubmitted = requireQuestionIdMatch
    ? Boolean(savedAnswer)
    : Boolean(draft.isSubmitted || savedAnswer);
  const selectedAnswer = requireQuestionIdMatch
    ? savedAnswer?.selected ?? null
    : isSubmitted
      ? savedAnswer?.selected ?? draft.selectedOpt ?? null
      : draft.selectedOpt ?? null;
  const selectedConfidence = requireQuestionIdMatch
    ? savedAnswer?.confidence ?? null
    : isSubmitted
      ? savedAnswer?.confidence ?? draft.confidence ?? null
      : draft.confidence ?? null;

  return {
    restored: !initialQuestionId,
    replayed: false,
    startedAt: draft.startedAt ?? fallback.startedAt,
    currentIdx,
    selectedOpt: selectedAnswer,
    confidence: selectedConfidence,
    isSubmitted,
    answers,
  };
};

export default function ReadingTraining({
  passage,
  initialQuestionId,
  replayAttempt,
  onBack,
  onComplete,
  onAnswerRecorded,
}: ReadingTrainingProps) {
  const [initialDraft] = useState(() => loadReadingDraftState(passage, initialQuestionId, replayAttempt));
  const draftKey = practiceDraftKeys.reading(passage.id);
  const isFirstQuestionSync = useRef(true);
  const recordWriteRef = useRef<Promise<void>>(Promise.resolve());
  const [currentIdx, setCurrentIdx] = useState(initialDraft.currentIdx);
  const [selectedOpt, setSelectedOpt] = useState<ChoiceOption | null>(initialDraft.selectedOpt);
  const [confidence, setConfidence] = useState<ChoiceConfidence | null>(initialDraft.confidence);
  const [isSubmitted, setIsSubmitted] = useState(initialDraft.isSubmitted);
  const [userAnswers, setUserAnswers] = useState<ReadingAnswer[]>(initialDraft.answers);
  const [recordStatus, setRecordStatus] = useState<AnswerRecordStatus>(
    initialDraft.isSubmitted && onAnswerRecorded ? 'saved' : 'idle',
  );
  const [isCompleting, setIsCompleting] = useState(false);
  const [startedAt] = useState(() => initialDraft.startedAt);
  const requireAnswerQuestionIdMatch = passage.moduleId === 'grammar' || Boolean(initialQuestionId);
  const getSavedAnswerAt = (index: number) => getQuestionMatchedAnswer(
    userAnswers,
    index,
    passage.questions[index],
    requireAnswerQuestionIdMatch,
  );

  const currentQuestion: Question = passage.questions[currentIdx];
  const currentIndexedSentence = currentQuestion.highlightTextIndices?.correct
    ? passage.content.substring(currentQuestion.highlightTextIndices.correct[0], currentQuestion.highlightTextIndices.correct[1])
    : undefined;
  const currentSourceSentence = currentQuestion.correctSentence || currentIndexedSentence;
  const currentSentenceSupport = getQuestionSentenceSupport({
    sentence: currentSourceSentence,
    explanation: currentQuestion.explanation,
  });
  const practiceModuleId = passage.moduleId ?? 'reading';
  const practiceQuestionTypeId = currentQuestion.questionTypeId ?? passage.questions[0]?.questionTypeId ?? 'careful-reading';
  const practiceSkillArea: SkillArea = practiceModuleId === 'grammar' ? 'grammar' : 'reading';
  const readingSessionId = `session-${practiceModuleId}-${passage.id}-${startedAt.replace(/[^A-Za-z0-9]/g, '-')}`;
  const chineseSupport = getReadingChineseSupport(passage.id, currentQuestion);
  const trainingTitle = practiceModuleId === 'grammar'
    ? '语法与完形填空训练舱'
    : practiceQuestionTypeId === 'word-bank'
    ? '选词填空训练舱'
    : practiceQuestionTypeId === 'long-matching'
    ? '长篇匹配训练舱'
    : '仔细阅读训练舱';
  const methodGuideModuleId = practiceQuestionTypeId === 'cloze-choice'
    ? 'cloze'
    : practiceModuleId === 'grammar'
      ? 'grammar'
      : 'reading';
  const activeMethodTopicId = practiceModuleId === 'grammar' && practiceQuestionTypeId === 'grammar-structure'
    ? getGrammarStructureTopicByFocus(currentQuestion.trapType ?? currentQuestion.tags?.[0] ?? currentQuestion.type ?? currentQuestion.explanation).id
    : undefined;

  const persistDraft = (nextState: {
    currentIdx?: number;
    selectedOpt?: ChoiceOption | null;
    confidence?: ChoiceConfidence | null;
    isSubmitted?: boolean;
    answers?: ReadingAnswer[];
  }) => {
    savePracticeDraft<ReadingPracticeDraft>(draftKey, {
      version: 1,
      passageId: passage.id,
      startedAt,
      currentIdx: nextState.currentIdx ?? currentIdx,
      selectedOpt: Object.prototype.hasOwnProperty.call(nextState, 'selectedOpt') ? nextState.selectedOpt ?? null : selectedOpt,
      confidence: Object.prototype.hasOwnProperty.call(nextState, 'confidence') ? nextState.confidence ?? null : confidence,
      isSubmitted: nextState.isSubmitted ?? isSubmitted,
      answers: serializeReadingAnswers(nextState.answers ?? userAnswers),
      updatedAt: new Date().toISOString(),
    });
  };

  const buildReportQuestion = (question: Question) => ({
    id: question.id,
    question: question.question,
    options: question.options,
    optionTranslations: getReadingChineseSupport(passage.id, question)?.options,
    correctAnswer: question.correctAnswer,
    type: question.type,
    trapType: question.trapType,
    moduleId: question.moduleId,
    questionTypeId: question.questionTypeId ?? practiceQuestionTypeId,
    correctSentence: question.correctSentence,
    correctSentenceTranslation: getQuestionSentenceSupport({
      sentence: question.correctSentence,
      explanation: question.explanation,
    })?.chineseMeaning,
    questionTranslation: getReadingChineseSupport(passage.id, question)?.question,
    explanation: question.explanation,
  });

  const buildReadingReport = (
    targetAnswers: ReadingAnswer[],
    options: {
      sessionStatus: 'active' | 'completed';
      includeEvidence: boolean;
      answeredOnly: boolean;
    },
  ) => {
    const answeredPairs = targetAnswers.flatMap((answer, index) => {
        if (!answer) return [];
        const question = answer.questionId
          ? passage.questions.find((entry) => String(entry.id) === answer.questionId)
          : passage.questions[index];
        return question ? [{ question, answer }] : [];
      });
    const selectedPairs = options.answeredOnly
      ? answeredPairs
      : passage.questions
        .map((question, index) => ({ question, answer: targetAnswers[index] }))
        .filter((pair): pair is { question: Question; answer: NonNullable<ReadingAnswer> } => Boolean(pair.answer));

    return buildChoicePracticeReport({
      examId: passage.examId ?? 'cet4',
      sessionId: readingSessionId,
      sessionStatus: options.sessionStatus,
      moduleId: practiceModuleId,
      questionTypeId: practiceQuestionTypeId,
      modeId: `${practiceQuestionTypeId}-practice`,
      skillArea: practiceSkillArea,
      plannedMinutes: practiceModuleId === 'grammar' ? 12 : 18,
      startedAt,
      questions: selectedPairs.map((pair) => buildReportQuestion(pair.question)),
      answers: selectedPairs.map((pair) => ({
        selected: pair.answer?.selected,
        correct: Boolean(pair.answer?.correct),
        confidence: pair.answer?.confidence,
      })),
      attemptIdForQuestion: (question) => `attempt-${readingSessionId}-${question.id}`,
      includeReviewItems: options.includeEvidence,
      includeSkillProfiles: options.includeEvidence,
    });
  };

  const queueReadingAnswerRecord = (nextAnswers: ReadingAnswer[]) => {
    if (!onAnswerRecorded || nextAnswers.every((answer) => !answer)) return;
    const report = buildReadingReport(nextAnswers, {
      sessionStatus: 'active',
      includeEvidence: false,
      answeredOnly: true,
    });

    setRecordStatus('saving');
    const write = recordWriteRef.current
      .catch(() => undefined)
      .then(() => Promise.resolve(onAnswerRecorded(report)))
      .then(() => {
        setRecordStatus('saved');
      })
      .catch((error) => {
        console.error('Failed to persist reading answer:', error);
        setRecordStatus('failed');
      });

    recordWriteRef.current = write.catch(() => undefined);
  };

  // Reset states on question change
  useEffect(() => {
    if (isFirstQuestionSync.current) {
      isFirstQuestionSync.current = false;
    } else {
      const savedAnswer = getSavedAnswerAt(currentIdx);
      setSelectedOpt(savedAnswer?.selected ?? null);
      setConfidence(savedAnswer?.confidence ?? null);
      setIsSubmitted(Boolean(savedAnswer));
      setRecordStatus(savedAnswer && onAnswerRecorded ? 'saved' : 'idle');
    }
  }, [currentIdx]);

  useEffect(() => {
    if (!initialDraft.restored || initialDraft.replayed || userAnswers.every((answer) => !answer)) return;
    queueReadingAnswerRecord(userAnswers);
  }, []);

  const handleOptionClick = (opt: ChoiceOption) => {
    if (isSubmitted) return;
    const nextConfidence = confidence ?? 'not_sure';
    setSelectedOpt(opt);
    if (!confidence) setConfidence(nextConfidence);
    persistDraft({ selectedOpt: opt, confidence: nextConfidence, isSubmitted: false });
  };

  const handleConfidenceChange = (nextConfidence: ChoiceConfidence) => {
    if (isSubmitted) return;
    setConfidence(nextConfidence);
    persistDraft({ confidence: nextConfidence, isSubmitted: false });
  };

  const handleSubmit = () => {
    if (!selectedOpt) return;
    const finalConfidence = confidence ?? 'not_sure';
    if (!confidence) setConfidence(finalConfidence);

    const correct = selectedOpt === currentQuestion.correctAnswer;
    setIsSubmitted(true);

    // Save user answer
    const newAnswers = [...userAnswers];
    newAnswers[currentIdx] = {
      selected: selectedOpt,
      correct,
      confidence: finalConfidence,
      questionId: String(currentQuestion.id),
      moduleId: currentQuestion.moduleId ?? passage.moduleId ?? 'reading',
      questionTypeId: currentQuestion.questionTypeId ?? passage.questions[0]?.questionTypeId ?? 'careful-reading',
    };
    setUserAnswers(newAnswers);
    persistDraft({
      selectedOpt,
      confidence: finalConfidence,
      isSubmitted: true,
      answers: newAnswers,
    });
    queueReadingAnswerRecord(newAnswers);
  };

  const handleNext = () => {
    if (isCompleting) return;
    if (currentIdx < passage.questions.length - 1) {
      const nextIdx = currentIdx + 1;
      const savedAnswer = getSavedAnswerAt(nextIdx);
      setCurrentIdx(nextIdx);
      setSelectedOpt(savedAnswer?.selected ?? null);
      setConfidence(savedAnswer?.confidence ?? null);
      setIsSubmitted(Boolean(savedAnswer));
      setRecordStatus(savedAnswer && onAnswerRecorded ? 'saved' : 'idle');
      persistDraft({
        currentIdx: nextIdx,
        selectedOpt: savedAnswer?.selected ?? null,
        confidence: savedAnswer?.confidence ?? null,
        isSubmitted: Boolean(savedAnswer),
      });
    } else {
      clearPracticeDraft(draftKey);
      // Calculate overall score
      const answeredCount = userAnswers.filter(Boolean).length;
      const correctCount = userAnswers.filter(ans => ans?.correct).length;
      const finalScore = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
      const report = buildReadingReport(userAnswers, {
        sessionStatus: 'completed',
        includeEvidence: true,
        answeredOnly: true,
      });
      setIsCompleting(true);
      void recordWriteRef.current
        .catch(() => undefined)
        .then(() => onComplete(finalScore, report))
        .finally(() => setIsCompleting(false));
    }
  };

  // Helper to highlight keys in text
  const renderHighlightedContent = () => {
    let content = passage.content;
    
    // Find substrings
    const correctSent = (currentQuestion as any).correctSentence || "";
    const distractorSent = (currentQuestion as any).distractorSentence || "";

    // For static questions, map indices or use substrings
    let correctKey = correctSent;
    let distractorKey = distractorSent;

    if (!correctKey && currentQuestion.highlightTextIndices?.correct) {
      const [start, end] = currentQuestion.highlightTextIndices.correct;
      correctKey = content.substring(start, end);
    }
    if (!distractorKey && currentQuestion.highlightTextIndices?.distractor) {
      const [start, end] = currentQuestion.highlightTextIndices.distractor;
      distractorKey = content.substring(start, end);
    }

    // Replace and split with spans for gorgeous highlights when submitted
    if (!isSubmitted) {
      return <p className="text-sm text-[#434652] leading-relaxed whitespace-pre-line font-medium">{content}</p>;
    }

    // Perform highlighted replacing
    // We sanitize so we don't break string splits
    let parts: { text: string; type: 'normal' | 'correct' | 'distractor' }[] = [{ text: content, type: 'normal' }];

    if (correctKey && content.includes(correctKey)) {
      const index = content.indexOf(correctKey);
      parts = [
        { text: content.substring(0, index), type: 'normal' },
        { text: correctKey, type: 'correct' },
        { text: content.substring(index + correctKey.length), type: 'normal' }
      ];
    }

    if (distractorKey && content.includes(distractorKey)) {
      const newParts: typeof parts = [];
      parts.forEach(part => {
        if (part.type === 'normal' && part.text.includes(distractorKey)) {
          const index = part.text.indexOf(distractorKey);
          newParts.push(
            { text: part.text.substring(0, index), type: 'normal' },
            { text: distractorKey, type: 'distractor' },
            { text: part.text.substring(index + distractorKey.length), type: 'normal' }
          );
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    }

    return (
      <div className="text-sm text-[#434652] leading-relaxed whitespace-pre-line font-medium">
        {parts.map((part, i) => {
          if (part.type === 'correct') {
            return (
              <span
                key={i}
                className="bg-[#d1e7dd] text-[#0f5132] font-semibold border-b-2 border-[#198754] px-1 py-0.5 rounded-sm"
                title="正确选项对应原文支持句"
              >
                {part.text}
              </span>
            );
          } else if (part.type === 'distractor') {
            return (
              <span
                key={i}
                className="bg-[#f8d7da] text-[#842029] font-semibold border-b-2 border-[#dc3545] px-1 py-0.5 rounded-sm"
                title="错误选项/迷惑句"
              >
                {part.text}
              </span>
            );
          }
          return <span key={i}>{part.text}</span>;
        })}
      </div>
    );
  };

  // Generate Behavioral Feedback
  const getAIBehaviorFeedback = () => {
    const isCorrect = selectedOpt === currentQuestion.correctAnswer;
    if (isCorrect) {
      if (confidence === 'sure') {
        return {
          title: "回答正确且胸有成竹！",
          badge: "精准击破",
          badgeColor: "bg-[#1b6d24] text-white",
          description: "思维清晰，同义替换敏感，能够快速越过干扰项，定位句切中要害。恭喜！此考点已巩固。"
        };
      } else if (confidence === 'not_sure') {
        return {
          title: "回答正确，但底气稍显不足",
          badge: "犹豫突破",
          badgeColor: "bg-amber-600 text-white",
          description: "定位点虽对，但在核心词置换处（词组互译）表现出踌躇（系统检测到犹豫时长）。建议多对比选项与原文词汇差异。"
        };
      } else {
        return {
          title: "盲猜正确！需要警惕潜在漏洞",
          badge: "侥幸蒙对",
          badgeColor: "bg-[#003178] text-white",
          description: "尽管拿到了分数，但未获取到稳定的定位逻辑。在考试中依赖直觉容易翻车。请复习下方原文精析。"
        };
      }
    } else {
      if (confidence === 'sure') {
        return {
          title: "答题错误：迷失在高度迷惑干扰句中",
          badge: "盲目自信",
          badgeColor: "bg-[#ba1a1a] text-white",
          description: "不幸落入干扰项的陷阱！说明你过度关注了包含相似单词的非支持句。对比下方原文，找到同义更替的破局点。"
        };
      } else {
        return {
          title: "答题错误：定位和转换存在漏空",
          badge: "定位失准",
          badgeColor: "bg-[#434652] text-white",
          description: "未能准确识别考法中的反向同义替换，复盘时要注意段落和题干的主谓语匹配，克服眼花和浮躁。"
        };
      }
    }
  };

  const currentFeedback = isSubmitted ? getAIBehaviorFeedback() : null;
  const methodGuide = getPracticeMethodGuide(methodGuideModuleId);
  const activeMethodTopic = methodGuide.topicGuides?.find((topic) => topic.id === activeMethodTopicId);
  const methodSteps = (activeMethodTopic?.methodSteps ?? methodGuide.steps).slice(0, 4);
  const methodFocus = activeMethodTopic
    ? [activeMethodTopic.label, ...methodGuide.focus.filter((item) => item !== activeMethodTopic.label).slice(0, 2)]
    : methodGuide.focus;
  const isSpecialtyChoicePractice = practiceModuleId === 'grammar';
  const grammarFocusLabel = formatGrammarFocusLabel(
    currentQuestion.trapType ?? currentQuestion.tags?.[0] ?? currentQuestion.type,
  );
  const grammarRuleHint = activeMethodTopic
    ? GRAMMAR_TOPIC_RULE_HINTS[activeMethodTopic.id] ?? activeMethodTopic.checkpoint
    : '先找句子主干，再用选项差异回到具体规则。';
  const grammarCorrectSentence = sanitizeGrammarSentence(currentQuestion.correctSentence);
  const grammarFeedback = isSubmitted && isSpecialtyChoicePractice
    ? {
        title: selectedOpt === currentQuestion.correctAnswer ? '规则判断正确' : '规则点需要复盘',
        badge: selectedOpt === currentQuestion.correctAnswer ? '正确' : '需复盘',
        badgeColor: selectedOpt === currentQuestion.correctAnswer ? 'bg-[#1b6d24] text-white' : 'bg-amber-600 text-white',
        description: selectedOpt === currentQuestion.correctAnswer
          ? `本题考 ${grammarFocusLabel}。${grammarRuleHint}`
          : `本题考 ${grammarFocusLabel}，正确答案是 ${currentQuestion.correctAnswer}。${grammarRuleHint}`,
      }
    : currentFeedback;
  const currentDisplayNumber = currentQuestion.displayNumber ?? currentIdx + 1;
  const answeredProgressCount = passage.questions.reduce(
    (count, _, index) => count + (getSavedAnswerAt(index) ? 1 : 0),
    0,
  );
  const progressWindowSize = 9;
  const progressWindowStart = Math.max(
    0,
    Math.min(currentIdx - Math.floor(progressWindowSize / 2), passage.questions.length - progressWindowSize),
  );
  const shouldWindowProgress = isSpecialtyChoicePractice
    ? passage.questions.length > 15
    : passage.questions.length > 80;
  const visibleProgressIndexes = shouldWindowProgress
    ? Array.from(
      { length: Math.min(progressWindowSize, passage.questions.length) },
      (_, index) => progressWindowStart + index,
    )
    : passage.questions.map((_, index) => index);
  const renderProgressMarker = (index: number) => {
    const savedAnswer = getSavedAnswerAt(index);
    const displayNumber = passage.questions[index]?.displayNumber ?? index + 1;
    return (
      <div
        key={index}
        data-testid="reading-progress-marker"
        title={`第 ${displayNumber} 题${savedAnswer ? '已答' : '未答'}`}
        className={`h-2.5 rounded-full transition-all duration-300 ${
          index === currentIdx
            ? 'w-8 bg-[#003178]'
            : savedAnswer
              ? savedAnswer.correct
                ? 'w-2.5 bg-[#1b6d24]'
                : 'w-2.5 bg-[#ba1a1a]'
              : 'w-2.5 bg-gray-200'
        }`}
      />
    );
  };

  const renderMethodQuickPanel = (className = '') => (
    <section
      data-testid={`practice-method-guide-${methodGuideModuleId}`}
      className={`rounded-xl border border-[#cfe6f2] bg-[#f8fbff] p-4 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#eef7fc] px-2.5 py-1 text-[10px] font-black text-[#003178]">
            <ListChecks className="h-3.5 w-3.5" />
            解题步骤
          </div>
          <h4 className="mt-2 text-sm font-black leading-5 text-[#101828]">
            {activeMethodTopic ? activeMethodTopic.label : methodGuide.title}
          </h4>
          {activeMethodTopic ? (
            <span
              data-testid={`practice-method-guide-topic-${methodGuideModuleId}-${activeMethodTopic.id}`}
              className="mt-2 inline-flex rounded-full bg-[#003178] px-2 py-0.5 text-[10px] font-black text-white"
            >
              当前考点
            </span>
          ) : null}
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
            {activeMethodTopic?.cue ?? methodGuide.intro}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {methodFocus.map((item) => (
            <span key={item} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
              {item}
            </span>
          ))}
        </div>
      </div>

      <ol className="mt-3 grid gap-2">
        {methodSteps.map((step, index) => (
          <li key={step} className="flex gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-700 ring-1 ring-slate-100">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#003178] text-[10px] font-black text-white">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {activeMethodTopic ? (
        <div className="mt-3 flex gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-600 ring-1 ring-slate-100">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#003178]" />
          <span>验算：{activeMethodTopic.checkpoint}</span>
        </div>
      ) : null}
    </section>
  );

  if (isSpecialtyChoicePractice) {
    return (
      <div className="app-page-surface flex min-h-[100svh] flex-1 flex-col overflow-hidden bg-[#f6f8fb]">
        <div className="shrink-0 border-b border-[#dbe7f0] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto grid w-full max-w-5xl gap-3 lg:grid-cols-[minmax(260px,max-content)_minmax(0,1fr)] lg:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={onBack}
                data-testid="reading-back-to-practice"
                aria-label="返回专项练习"
                className="ui-button ui-button-secondary ui-button-icon shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 shrink">
                <h3 className="whitespace-nowrap text-sm font-black text-[#003178]">语法结构</h3>
                <p className="truncate text-[11px] font-bold text-slate-500">{grammarFocusLabel}</p>
              </div>
              {initialDraft.replayed ? (
                <span
                  data-testid="reading-attempt-replayed"
                  className="hidden shrink-0 whitespace-nowrap rounded-full bg-[#eef7fc] px-2.5 py-1 text-[11px] font-black text-[#003178] sm:inline-flex"
                >
                  已回显
                </span>
              ) : initialDraft.restored ? (
                <span
                  data-testid="reading-draft-restored"
                  className="hidden shrink-0 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 sm:inline-flex"
                >
                  已恢复第 {currentDisplayNumber} 题
                </span>
              ) : null}
            </div>

            <div className="flex min-w-0 max-w-full items-center gap-2 overflow-hidden lg:justify-end">
              <span
                data-testid="reading-progress-summary"
                className="shrink-0 rounded-full bg-[#f8fbff] px-2.5 py-1 text-[11px] font-black text-[#003178] ring-1 ring-[#cfe6f2]"
              >
                {currentDisplayNumber}/{passage.questions.length} · 已答 {answeredProgressCount}
              </span>
              <div className="flex min-w-0 items-center gap-2 overflow-hidden lg:max-w-[560px]">
                {visibleProgressIndexes.map(renderProgressMarker)}
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-4 sm:px-6 lg:gap-4 lg:py-6">
            <section
              data-testid={`practice-method-guide-${methodGuideModuleId}`}
              className="rounded-xl border border-[#cfe6f2] bg-white px-3 py-3 shadow-xs"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#eef7fc] px-2.5 py-1 text-[10px] font-black text-[#003178]">
                    <ListChecks className="h-3.5 w-3.5" />
                    解题提示
                  </div>
                  <p className="mt-2 text-sm font-bold leading-5 text-[#101828]">{grammarRuleHint}</p>
                </div>
                <details className="rounded-lg border border-slate-200 bg-[#f8fafc] px-3 py-2 text-xs font-bold text-slate-600 sm:max-w-md">
                  <summary className="cursor-pointer text-[#003178]">查看步骤</summary>
                  <ol className="mt-2 space-y-1.5">
                    {methodSteps.map((step, index) => (
                      <li key={step} className="flex gap-2 leading-5">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#003178] text-[9px] font-black text-white">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              </div>
            </section>

            <section className="rounded-xl border border-[#dbe7f0] bg-white p-4 shadow-xs sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex w-fit rounded-full bg-[#dbf1fe] px-2.5 py-1 text-xs font-black text-[#003178] ring-1 ring-[#cfe6f2]">
                  第 {currentDisplayNumber} 题 / 共 {passage.questions.length} 题
                </span>
                <span className="text-xs font-black text-slate-500">
                  考点：{grammarFocusLabel}
                </span>
              </div>

              <h3
                data-testid="reading-question-text"
                className="mt-4 text-base font-black leading-6 text-[#071e27] sm:text-lg"
              >
                {currentQuestion.question}
              </h3>

              <div className="mt-4 space-y-2.5 sm:space-y-3">
                {(Object.keys(currentQuestion.options) as ('A' | 'B' | 'C' | 'D')[]).map((opt) => {
                  const isCurrentSelected = selectedOpt === opt;
                  const isCorrectOpt = opt === currentQuestion.correctAnswer;

                  let cardStyle = 'border-[#c3c6d4] hover:border-[#003178] bg-white';
                  let indicatorStyle = 'border-gray-300 text-gray-500';

                  if (!isSubmitted) {
                    if (isCurrentSelected) {
                      cardStyle = 'border-2 border-[#003178] bg-[#f3faff] shadow-sm';
                      indicatorStyle = 'bg-[#003178] border-[#003178] text-white';
                    }
                  } else if (isCorrectOpt) {
                    cardStyle = 'border-2 border-[#1b6d24] bg-[#e8f5e9]';
                    indicatorStyle = 'bg-[#1b6d24] border-[#1b6d24] text-white';
                  } else if (isCurrentSelected && !isCorrectOpt) {
                    cardStyle = 'border-2 border-[#ba1a1a] bg-[#ffebee]';
                    indicatorStyle = 'bg-[#ba1a1a] border-[#ba1a1a] text-white';
                  } else {
                    cardStyle = 'border-neutral-200 bg-neutral-50/50 opacity-60';
                  }

                  return (
                    <button
                      key={opt}
                      data-testid={`reading-option-${opt}`}
                      onClick={() => handleOptionClick(opt)}
                      disabled={isSubmitted}
                      className={`flex min-h-12 w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors duration-150 sm:min-h-14 sm:p-4 ${cardStyle} ${
                        !isSubmitted ? 'cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${indicatorStyle}`}>
                        {opt}
                      </div>
                      <div className="min-w-0 text-sm font-bold leading-5 text-[#071e27]">
                        <span className="block">{currentQuestion.options[opt]}</span>
                        {isSubmitted && chineseSupport?.options?.[opt] ? (
                          <span
                            data-testid={`reading-option-translation-${opt}`}
                            className="mt-1 block text-xs font-semibold leading-5 text-slate-500"
                          >
                            {chineseSupport.options[opt]}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {!isSubmitted ? (
                <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'sure', label: '非常有把握' },
                      { id: 'not_sure', label: '不太确定' },
                      { id: 'guess', label: '纯属盲猜' },
                    ].map((item) => (
                      <label
                        key={item.id}
                        data-testid={`reading-confidence-${item.id}`}
                        className="flex min-h-10 cursor-pointer text-center"
                      >
                        <input
                          type="radio"
                          name="confidence"
                          value={item.id}
                          checked={confidence === item.id}
                          onChange={() => handleConfidenceChange(item.id as ChoiceConfidence)}
                          className="sr-only peer"
                        />
                        <div className="flex min-h-10 w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-1 py-2 text-xs font-bold text-gray-500 transition-colors hover:bg-gray-50 peer-checked:border-2 peer-checked:border-[#003178] peer-checked:bg-[#003178]/10 peer-checked:text-[#003178]">
                          {item.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isSubmitted ? (
                <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs font-bold text-gray-400">选中答案后提交。</div>
                  <button
                    onClick={handleSubmit}
                    data-testid="reading-submit"
                    disabled={!selectedOpt}
                    className="ui-button ui-button-primary ui-button-full sm:w-auto"
                  >
                    提交
                  </button>
                </div>
              ) : null}

              {isSubmitted && grammarFeedback ? (
                <div data-testid="reading-post-answer-support" className="mt-4 grid gap-3 animate-fadeIn">
                  {recordStatus !== 'idle' ? (
                    <div
                      data-testid="reading-record-status"
                      className={`rounded-xl border px-3 py-2 text-xs font-black ${
                        recordStatus === 'failed'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {recordStatus === 'saving'
                        ? '正在写入作答记录'
                        : recordStatus === 'failed'
                          ? '作答记录写入失败，请稍后重试'
                          : '本题已写入作答记录'}
                    </div>
                  ) : null}

                  <div data-testid="reading-grammar-analysis-card" className="rounded-xl border border-[#cfe6f2] bg-[#f8fbff] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-black text-[#003178]">规则解析</div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${grammarFeedback.badgeColor}`}>
                        {grammarFeedback.badge}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-black text-[#071e27]">{grammarFeedback.title}</h4>
                    <p className="mt-1.5 rounded-lg bg-white p-2.5 text-xs font-bold leading-5 text-[#434652] ring-1 ring-[#cfe6f2]/80">
                      {grammarFeedback.description}
                    </p>
                    {grammarCorrectSentence ? (
                      <div
                        data-testid="reading-sentence-translation"
                        className="mt-3 rounded-lg border border-[#cfe6f2] bg-white p-3 text-xs leading-5"
                      >
                        <div className="font-black text-[#003178]">正确句</div>
                        <p className="mt-1 font-bold text-slate-900">{grammarCorrectSentence}</p>
                      </div>
                    ) : null}
                    <div className="mt-3 rounded-lg border border-slate-100 bg-white p-3 text-xs font-semibold leading-5 text-slate-600">
                      {sanitizeGrammarExplanation(currentQuestion.explanation)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs font-bold text-gray-400">看完规则解析后继续下一题。</div>
                    <button
                      onClick={handleNext}
                      disabled={isCompleting}
                      data-testid="reading-next"
                      className="ui-button ui-button-primary ui-button-full sm:w-auto"
                    >
                      <span>
                        {isCompleting ? '正在保存训练记录' : currentIdx === passage.questions.length - 1 ? '完成训练' : `进入第 ${currentDisplayNumber + 1} 题`}
                      </span>
                      {isCompleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page-surface flex-1 flex flex-col min-h-[100svh] lg:h-screen overflow-hidden bg-white">
      {/* Exercise Top Bar */}
      <div className="min-h-16 px-4 sm:px-6 py-3 border-b border-[#cfe6f2] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 bg-[#f7fbff]">
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
          <button
            onClick={onBack}
            data-testid="reading-back-to-practice"
            aria-label="返回专项练习"
            className="ui-button ui-button-secondary ui-button-icon"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="h-4 w-[1px] bg-gray-300" />
          <h3 className="font-extrabold text-sm text-[#003178] tracking-tight truncate max-w-xs sm:max-w-md">
            {trainingTitle}：{passage.title}
          </h3>
          {initialDraft.replayed ? (
            <span
              data-testid="reading-attempt-replayed"
              className="rounded-full bg-[#eef7fc] px-2.5 py-1 text-[11px] font-black text-[#003178]"
            >
              已回显上次作答
            </span>
          ) : initialDraft.restored ? (
            <span
              data-testid="reading-draft-restored"
              className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700"
            >
              已恢复第 {currentDisplayNumber} 题
            </span>
          ) : null}
        </div>

        <div className="flex max-w-full shrink-0 items-center gap-2 overflow-hidden pb-1 sm:pb-0">
          {passage.questions.length > 80 ? (
            <span
              data-testid="reading-progress-summary"
              className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#003178] ring-1 ring-[#cfe6f2]"
            >
              {currentDisplayNumber}/{passage.questions.length} · 已答 {answeredProgressCount}
            </span>
          ) : null}
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            {visibleProgressIndexes.map(renderProgressMarker)}
          </div>
        </div>
      </div>

      {/* Split Screens Panel */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        
        {/* Left Side: Passage Container */}
        <div className={`w-full ${isSpecialtyChoicePractice ? 'lg:w-[38%]' : 'lg:w-1/2'} p-4 sm:p-6 lg:p-8 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[#c3c6d4] bg-neutral-50/50 flex flex-col`}>
          <div className={isSpecialtyChoicePractice
            ? 'flex-1 lg:sticky lg:top-6 lg:self-start'
            : 'bg-white border border-[#cfe6f2] rounded-xl p-4 sm:p-6 lg:p-8 shadow-xs flex-1'
          }>
            {isSpecialtyChoicePractice ? (
              renderMethodQuickPanel('bg-white')
            ) : (
              <>
                <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center pb-4 border-b border-[#f3faff]">
                  <h2 className="text-xl font-bold text-[#003178] leading-tight flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#3b82f6]" /> {passage.title}
                  </h2>
                  <div className="text-xs text-gray-400 font-medium">约 320 词</div>
                </header>

                {/* Render with dynamic sentence highlighted spans */}
                <article className="prose max-w-none text-justify">
                  {renderHighlightedContent()}
                </article>

                {chineseSupport?.context ? (
                  <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50/70 p-4 text-sm font-bold leading-7 text-amber-900">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                      中文材料摘要
                    </div>
                    <p>{chineseSupport.context}</p>
                  </div>
                ) : null}
              </>
            )}

            {/* Custom Interactive Legend (Only visible after submittng response) */}
            {isSubmitted && !isSpecialtyChoicePractice && (
              <div className="mt-8 pt-6 border-t border-dashed border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="flex items-start gap-2 bg-[#d1e7dd]/50 p-2.5 rounded-xl border border-green-200">
                  <span className="w-3 h-3 bg-[#198754] rounded-full translate-y-0.5" />
                  <div>
                    <span className="text-[#0f5132]">正确推导线索</span>
                    <p className="text-[10px] text-gray-500 mt-0.5">原文定位和替换出处</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-[#f8d7da]/50 p-2.5 rounded-xl border border-red-200">
                  <span className="w-3 h-3 bg-[#dc3545] rounded-full translate-y-0.5" />
                  <div>
                    <span className="text-[#842029]">迷惑干扰段落</span>
                    <p className="text-[10px] text-gray-500 mt-0.5">高频错误选项诱导定位段</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Questions & Explanations Panel */}
        <div className={`w-full ${isSpecialtyChoicePractice ? 'lg:w-[62%]' : 'lg:w-1/2'} p-4 sm:p-6 lg:p-8 overflow-y-auto flex flex-col justify-between bg-white`}>
          <div className="space-y-6 pb-24">
            {!isSpecialtyChoicePractice ? renderMethodQuickPanel() : null}
            
            {/* Steps & Topic */}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
              <span className="text-xs font-bold text-[#003178] bg-[#dbf1fe] px-2.5 py-1 rounded-full border border-[#cfe6f2]">
                第 {currentDisplayNumber} 题 / 共 {passage.questions.length} 题
              </span>
              <span className="text-xs text-gray-400 font-semibold">
                核心考向：{currentQuestion.type}
              </span>
            </div>

            {/* Question Text */}
            <h3 className="text-base font-extrabold text-[#071e27] leading-snug">
              {currentQuestion.question}
            </h3>
            {isSubmitted && chineseSupport?.question ? (
              <p
                data-testid="reading-question-translation"
                className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800"
              >
                中文题意：{chineseSupport.question}
              </p>
            ) : null}

            {/* Answer Cards */}
            <div className="space-y-3">
              {(Object.keys(currentQuestion.options) as ('A' | 'B' | 'C' | 'D')[]).map((opt) => {
                const isCurrentSelected = selectedOpt === opt;
                const isCorrectOpt = opt === currentQuestion.correctAnswer;
                
                let cardStyle = 'border-[#c3c6d4] hover:border-[#003178] bg-white';
                let indicatorStyle = 'border-gray-300 text-gray-500';

                // Real-time styling before submit vs after submit
                if (!isSubmitted) {
                  if (isCurrentSelected) {
                    cardStyle = 'border-2 border-[#003178] bg-[#f3faff] shadow-sm';
                    indicatorStyle = 'bg-[#003178] border-[#003178] text-white';
                  }
                } else {
                  // After submission: Show true colors!
                  if (isCorrectOpt) {
                    cardStyle = 'border-2 border-[#1b6d24] bg-[#e8f5e9]';
                    indicatorStyle = 'bg-[#1b6d24] border-[#1b6d24] text-white';
                  } else if (isCurrentSelected && !isCorrectOpt) {
                    cardStyle = 'border-2 border-[#ba1a1a] bg-[#ffebee]';
                    indicatorStyle = 'bg-[#ba1a1a] border-[#ba1a1a] text-white';
                  } else {
                    cardStyle = 'border-neutral-200 bg-neutral-50/50 opacity-60';
                  }
                }

                return (
                  <button
                    key={opt}
                    onClick={() => handleOptionClick(opt)}
                    disabled={isSubmitted}
                className={`w-full min-h-14 p-4 rounded-lg border text-left flex items-start gap-3 sm:gap-4 transition-colors duration-150 relative ${cardStyle} ${
                      !isSubmitted ? 'pointer-events-auto cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 ${indicatorStyle}`}>
                      {opt}
                    </div>
                    <div className="min-w-0 text-sm font-bold text-[#071e27]">
                      <span className="block">{currentQuestion.options[opt]}</span>
                      {isSubmitted && chineseSupport?.options?.[opt] ? (
                        <span
                          data-testid={`reading-option-translation-${opt}`}
                          className="mt-1 block text-xs font-semibold leading-5 text-slate-500"
                        >
                          {chineseSupport.options[opt]}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Confidence Choice before submission */}
            {!isSubmitted && (
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#434652] mb-3">
                  <HelpCircle className="h-4 w-4 text-[#003178]" />
                  <span>答题把握度诊断 (影响错因分析和复习优先级)：</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'sure', label: '非常有把握', color: 'peer-checked:bg-[#003178]/10 peer-checked:text-[#003178] peer-checked:border-[#003178]' },
                    { id: 'not_sure', label: '不太确定', color: 'peer-checked:bg-amber-100 peer-checked:text-amber-800 peer-checked:border-amber-600' },
                    { id: 'guess', label: '纯属盲猜', color: 'peer-checked:bg-red-100 peer-checked:text-red-800 peer-checked:border-red-600' },
                  ].map((item) => (
                    <label
                      key={item.id}
                      data-testid={`reading-confidence-${item.id}`}
                      className="flex min-h-11 flex-1 cursor-pointer text-center"
                    >
                      <input
                        type="radio"
                        name="confidence"
                        value={item.id}
                        checked={confidence === item.id}
                        onChange={() => handleConfidenceChange(item.id as ChoiceConfidence)}
                        className="sr-only peer"
                      />
                      <div className="flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-1 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50 peer-checked:border-2">
                        {item.label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* AI Diagnosis and Explanations Area (After Submit) */}
            {isSubmitted && currentFeedback && (
              <div data-testid="reading-post-answer-support" className="space-y-4 animate-fadeIn">
                {recordStatus !== 'idle' ? (
                  <div
                    data-testid="reading-record-status"
                    className={`rounded-xl border px-3 py-2 text-xs font-black ${
                      recordStatus === 'failed'
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {recordStatus === 'saving'
                      ? '正在写入作答记录'
                      : recordStatus === 'failed'
                        ? '作答记录写入失败，请稍后重试'
                        : '本题已写入作答记录'}
                  </div>
                ) : null}
                
                {/* AI Behavioral Diagnostic Panel */}
                <div className="bg-[#f3faff] border border-[#cfe6f2] rounded-xl p-4">
                  <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:justify-between sm:items-center">
                    <div className="text-xs font-bold text-[#003178] flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 animate-bounce" />
                      <span>错因行为诊断反馈</span>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${currentFeedback.badgeColor}`}>
                      {currentFeedback.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-[#071e27]">{currentFeedback.title}</h4>
                  <p className="text-xs text-[#434652] mt-1.5 leading-relaxed bg-white p-2.5 rounded-lg border border-[#cfe6f2]/80">
                    {currentFeedback.description}
                  </p>
                </div>

                {currentSentenceSupport ? (
                  <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-200/80">
                    <div
                      data-testid="reading-sentence-translation"
                      className="rounded-lg border border-[#cfe6f2] bg-white p-3 text-xs leading-5"
                    >
                      <div className="font-extrabold text-[#003178]">答后句子翻译</div>
                      <p className="mt-2 font-bold text-slate-900">英文原句：{currentSentenceSupport.sourceText}</p>
                      <p className="mt-1 font-semibold text-slate-600">中文句意：{currentSentenceSupport.chineseMeaning}</p>
                      {currentSentenceSupport.chunks.length > 1 ? (
                        <div data-testid="reading-sentence-chunks" className="mt-3 space-y-2">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            断句译文
                          </div>
                          {currentSentenceSupport.chunks.map((chunk) => (
                            <div key={chunk.sourceText} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                              <p className="font-bold text-slate-800">{chunk.sourceText}</p>
                              <p className="mt-1 text-[11px] font-semibold text-slate-600">{chunk.chineseMeaning}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

              </div>
            )}

          </div>

          {/* Bottom Action Footer */}
          <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex flex-col gap-3 border-t border-[#cfe6f2] bg-white/95 px-4 pb-1 pt-4 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:-mx-8 lg:px-8">
            <div className="text-xs text-gray-400">
              {isSubmitted ? '仔细核对线索，点按右侧按键递进。' : '选中答案即可提交，把握度可按需要调整。'}
            </div>

            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                data-testid="reading-submit"
                disabled={!selectedOpt}
                className="ui-button ui-button-primary ui-button-full sm:w-auto"
              >
                提交此题并查看错因诊断
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={isCompleting}
                data-testid="reading-next"
                className="ui-button ui-button-primary ui-button-full sm:w-auto"
              >
                <span>
                  {isCompleting ? '正在保存训练记录' : currentIdx === passage.questions.length - 1 ? '完成训练，提交今日总战报' : '进入第 ' + (currentIdx + 2) + ' 题'}
                </span>
                {isCompleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
