import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Headphones, PauseCircle, Volume2, XCircle } from 'lucide-react';
import { CET4_VOCABULARY_BANK, VocabularyPracticeItem, VOCABULARY_SESSION_SIZE, formatVocabularyPhonetic } from '../data';
import { Attempt, ChoiceOption, PracticeCompletionReport } from '../types';
import { buildChoiceReplayAnswer } from '../domain/practice/attemptReplay';
import {
  ChoiceConfidence,
  ChoicePracticeDraftAnswer,
  VocabularyPracticeDraft,
  clampDraftIndex,
  clearPracticeDraft,
  loadPracticeDraft,
  practiceDraftKeys,
  savePracticeDraft,
} from '../domain/practice/draftProgress';
import { buildChoicePracticeReport } from '../domain/practice/reports';
import { getVocabularyQuestionSupport, getVocabularySentenceSupport } from '../domain/practice/sentenceTranslations';
import { pausePracticeSpeech, playPracticeSpeech, preloadPracticeSpeech, resumePracticeSpeech, stopPracticeSpeech } from '../lib/practiceSpeech';
import PracticeMethodGuide from './PracticeMethodGuide';

interface VocabularyTrainingProps {
  items: VocabularyPracticeItem[];
  initialQuestionId?: string;
  replayAttempt?: Attempt;
  onBack: () => void;
  onComplete: (score: number, report: PracticeCompletionReport) => void;
  onAnswerRecorded?: (report: PracticeCompletionReport) => Promise<void> | void;
}

type Choice = ChoiceOption;
type Confidence = ChoiceConfidence;
type VocabularyAnswer = ChoicePracticeDraftAnswer;
type SpeechTarget = 'word' | 'example' | 'auto';
type AnswerRecordStatus = 'idle' | 'saving' | 'saved' | 'failed';
const AUTO_SPEECH_RATE = 0.84;

const createVocabularySessionId = () =>
  `session-vocabulary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const findVocabularyQuestionLocation = (items: VocabularyPracticeItem[], questionId?: string) => {
  if (!questionId) return { packIndex: 0, currentIdx: 0 };
  const targetIndex = items.findIndex((item) => item.id === questionId);
  if (targetIndex < 0) return { packIndex: 0, currentIdx: 0 };

  return {
    packIndex: Math.floor(targetIndex / VOCABULARY_SESSION_SIZE),
    currentIdx: targetIndex % VOCABULARY_SESSION_SIZE,
  };
};

const createEmptyVocabularyDraftState = (items: VocabularyPracticeItem[] = [], initialQuestionId?: string) => ({
  restored: false,
  replayed: false,
  sessionId: createVocabularySessionId(),
  startedAt: new Date().toISOString(),
  ...findVocabularyQuestionLocation(items, initialQuestionId),
  selectedOpt: null as Choice | null,
  confidence: null as Confidence | null,
  isSubmitted: false,
  answers: [] as VocabularyAnswer[],
});

const createVocabularyReplayState = (items: VocabularyPracticeItem[], initialQuestionId?: string, replayAttempt?: Attempt) => {
  if (!initialQuestionId || !replayAttempt) return null;
  const location = findVocabularyQuestionLocation(items, initialQuestionId);
  const item = items[location.packIndex * VOCABULARY_SESSION_SIZE + location.currentIdx];
  if (!item) return null;
  const replayAnswer = buildChoiceReplayAnswer(replayAttempt, item.correctAnswer);
  if (!replayAnswer) return null;

  const answers: VocabularyAnswer[] = [];
  answers[location.currentIdx] = {
    ...replayAnswer,
    questionId: String(item.id),
    moduleId: 'vocabulary',
    questionTypeId: 'cet4-core-vocabulary',
  };

  return {
    restored: false,
    replayed: true,
    sessionId: createVocabularySessionId(),
    startedAt: new Date().toISOString(),
    ...location,
    selectedOpt: replayAnswer.selected,
    confidence: replayAnswer.confidence,
    isSubmitted: true,
    answers,
  };
};

const loadVocabularyDraftState = (items: VocabularyPracticeItem[], initialQuestionId?: string, replayAttempt?: Attempt) => {
  const fallback = createEmptyVocabularyDraftState(items, initialQuestionId);
  const replay = createVocabularyReplayState(items, initialQuestionId, replayAttempt);
  if (replay) return replay;

  if (initialQuestionId) return fallback;

  const draft = loadPracticeDraft<VocabularyPracticeDraft>(practiceDraftKeys.vocabulary);
  if (!draft || draft.version !== 1 || items.length === 0) return fallback;

  const packCount = Math.max(1, Math.ceil(items.length / VOCABULARY_SESSION_SIZE));
  const packIndex = clampDraftIndex(draft.packIndex, packCount);
  const sessionLength = Math.max(
    1,
    items.slice(packIndex * VOCABULARY_SESSION_SIZE, (packIndex + 1) * VOCABULARY_SESSION_SIZE).length,
  );
  const currentIdx = clampDraftIndex(draft.currentIdx, sessionLength);
  const answers = Array.isArray(draft.answers) ? draft.answers : [];
  const savedAnswer = answers[currentIdx];
  const isSubmitted = Boolean(draft.isSubmitted || savedAnswer);

  return {
    restored: true,
    replayed: false,
    sessionId: draft.sessionId ?? fallback.sessionId,
    startedAt: draft.startedAt ?? fallback.startedAt,
    packIndex,
    currentIdx,
    selectedOpt: isSubmitted ? savedAnswer?.selected ?? draft.selectedOpt ?? null : draft.selectedOpt ?? null,
    confidence: isSubmitted ? savedAnswer?.confidence ?? draft.confidence ?? null : draft.confidence ?? null,
    isSubmitted,
    answers,
  };
};

export default function VocabularyTraining({
  items,
  initialQuestionId,
  replayAttempt,
  onBack,
  onComplete,
  onAnswerRecorded,
}: VocabularyTrainingProps) {
  const [initialDraft] = useState(() => loadVocabularyDraftState(items, initialQuestionId, replayAttempt));
  const practiceItemsRef = useRef(items);
  const practiceItems = practiceItemsRef.current;
  const isFirstQuestionSync = useRef(true);
  const submittedRevealRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToSubmittedSupportRef = useRef(false);
  const recordWriteRef = useRef<Promise<void>>(Promise.resolve());
  const [packIndex, setPackIndex] = useState(initialDraft.packIndex);
  const [currentIdx, setCurrentIdx] = useState(initialDraft.currentIdx);
  const [selectedOpt, setSelectedOpt] = useState<Choice | null>(initialDraft.selectedOpt);
  const [confidence, setConfidence] = useState<Confidence | null>(initialDraft.confidence);
  const [isSubmitted, setIsSubmitted] = useState(initialDraft.isSubmitted);
  const [recordStatus, setRecordStatus] = useState<AnswerRecordStatus>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeechTarget, setActiveSpeechTarget] = useState<SpeechTarget | null>(null);
  const [pausedSpeechTarget, setPausedSpeechTarget] = useState<SpeechTarget | null>(null);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(true);
  const [speechNotice, setSpeechNotice] = useState('自动播报开启');
  const [answers, setAnswers] = useState<VocabularyAnswer[]>(initialDraft.answers);
  const [startedAt, setStartedAt] = useState(() => initialDraft.startedAt);
  const [sessionId, setSessionId] = useState(() => initialDraft.sessionId);

  const packCount = Math.max(1, Math.ceil(practiceItems.length / VOCABULARY_SESSION_SIZE));
  const sessionItems = practiceItems.slice(
    packIndex * VOCABULARY_SESSION_SIZE,
    (packIndex + 1) * VOCABULARY_SESSION_SIZE,
  );
  const currentItem = sessionItems[currentIdx] ?? sessionItems[0];
  const nextItem = sessionItems[currentIdx + 1];
  const currentPhonetic = formatVocabularyPhonetic(currentItem.phonetic);
  const currentAutoSpeechText = currentItem ? `${currentItem.word}. ${currentItem.example}` : '';
  const nextAutoSpeechText = nextItem ? `${nextItem.word}. ${nextItem.example}` : '';
  const sentenceSupport = currentItem ? getVocabularySentenceSupport(currentItem) : null;
  const questionSupport = currentItem ? getVocabularyQuestionSupport(currentItem) : null;
  const progress = Math.round(((currentIdx + (isSubmitted ? 1 : 0)) / sessionItems.length) * 100);
  const draftKey = practiceDraftKeys.vocabulary;

  const persistDraft = (nextState: {
    packIndex?: number;
    currentIdx?: number;
    selectedOpt?: Choice | null;
    confidence?: Confidence | null;
    isSubmitted?: boolean;
    answers?: VocabularyAnswer[];
    sessionId?: string;
    startedAt?: string;
  }) => {
    savePracticeDraft<VocabularyPracticeDraft>(draftKey, {
      version: 1,
      sessionId: nextState.sessionId ?? sessionId,
      startedAt: nextState.startedAt ?? startedAt,
      packIndex: nextState.packIndex ?? packIndex,
      currentIdx: nextState.currentIdx ?? currentIdx,
      selectedOpt: Object.prototype.hasOwnProperty.call(nextState, 'selectedOpt') ? nextState.selectedOpt ?? null : selectedOpt,
      confidence: Object.prototype.hasOwnProperty.call(nextState, 'confidence') ? nextState.confidence ?? null : confidence,
      isSubmitted: nextState.isSubmitted ?? isSubmitted,
      answers: nextState.answers ?? answers,
      updatedAt: new Date().toISOString(),
    });
  };

  const switchPack = (nextPackIndex: number) => {
    const nextStartedAt = new Date().toISOString();
    const nextSessionId = createVocabularySessionId();
    setPackIndex(nextPackIndex);
    setCurrentIdx(0);
    setAnswers([]);
    setSelectedOpt(null);
    setConfidence(null);
    setIsSubmitted(false);
    setRecordStatus('idle');
    setStartedAt(nextStartedAt);
    setSessionId(nextSessionId);
    persistDraft({
      packIndex: nextPackIndex,
      currentIdx: 0,
      selectedOpt: null,
      confidence: null,
      isSubmitted: false,
      answers: [],
      sessionId: nextSessionId,
      startedAt: nextStartedAt,
    });
  };

  const speak = async (text: string, rate = 0.82, source: 'auto' | 'manual' = 'manual', target: SpeechTarget = 'word') => {
    await playPracticeSpeech(text, {
      rate,
      preferLocalAudio: true,
      onStart: () => {
        setIsSpeaking(true);
        setActiveSpeechTarget(target);
        setPausedSpeechTarget(null);
        setSpeechNotice(source === 'auto' ? '正在自动播报单词和例句...' : '正在准备本地英语朗读...');
      },
      onEnd: () => {
        setIsSpeaking(false);
        setActiveSpeechTarget(null);
        setPausedSpeechTarget(null);
        setSpeechNotice(autoSpeakEnabled ? '自动播报开启' : '自动播报关闭');
      },
      onError: (message) => {
        setIsSpeaking(false);
        setActiveSpeechTarget(null);
        setPausedSpeechTarget(null);
        setSpeechNotice(
          message.includes('没有可用英文语音')
            ? message
            : source === 'auto'
              ? '自动播报被浏览器拦截，请点击“播放单词”完成本题听音。'
              : message,
        );
      },
    });
  };

  const buildVocabularyQuestion = (item: VocabularyPracticeItem) => {
    const phonetic = formatVocabularyPhonetic(item.phonetic);
    return {
      id: item.id,
      question: `${item.word}${phonetic ? ` ${phonetic}` : ``}: ${item.example}`,
      options: item.options,
      optionTranslations: getVocabularyQuestionSupport(item).optionTranslations.reduce<Partial<Record<Choice, string>>>((result, translation) => {
        result[translation.key] = translation.chineseMeaning;
        return result;
      }, {}),
      correctAnswer: item.correctAnswer,
      type: '词义辨析与听音识别',
      trapType: '关键语块漏听',
      moduleId: 'vocabulary',
      questionTypeId: 'cet4-core-vocabulary',
      correctSentence: `${item.collocation}. ${item.example}`,
      correctSentenceTranslation: getVocabularySentenceSupport(item).chineseMeaning,
      questionTranslation: getVocabularyQuestionSupport(item).prompt.chineseMeaning,
      explanation: item.explanation,
    };
  };

  const buildVocabularyReport = (
    targetAnswers: VocabularyAnswer[],
    options: {
      sessionStatus: 'active' | 'completed';
      includeEvidence: boolean;
      answeredOnly: boolean;
    },
  ) => {
    const answeredPairs = options.answeredOnly
      ? targetAnswers.flatMap((answer, index) => {
        if (!answer) return [];
        const item = answer.questionId
          ? CET4_VOCABULARY_BANK.find((entry) => entry.id === answer.questionId)
          : sessionItems[index];
        return item ? [{ item, answer }] : [];
      })
      : [];
    const selectedItems = options.answeredOnly
      ? answeredPairs.map((pair) => pair.item)
      : sessionItems;
    const selectedAnswers = options.answeredOnly
      ? answeredPairs.map((pair) => pair.answer)
      : targetAnswers;

    return buildChoicePracticeReport({
      examId: 'cet4',
      sessionId,
      sessionStatus: options.sessionStatus,
      moduleId: 'vocabulary',
      questionTypeId: 'cet4-core-vocabulary',
      modeId: 'vocabulary-audio-choice',
      skillArea: 'vocabulary',
      plannedMinutes: Math.max(12, Math.ceil(sessionItems.length * 0.75)),
      startedAt,
      questions: selectedItems.map(buildVocabularyQuestion),
      answers: selectedAnswers.map((answer) => ({
        selected: answer?.selected,
        correct: Boolean(answer?.correct),
        confidence: answer?.confidence,
      })),
      attemptIdForQuestion: (question) => `attempt-${sessionId}-${question.id}`,
      includeReviewItems: options.includeEvidence,
      includeSkillProfiles: options.includeEvidence,
    });
  };

  const queueVocabularyAnswerRecord = (nextAnswers: VocabularyAnswer[]) => {
    if (!onAnswerRecorded || nextAnswers.every((answer) => !answer)) return;
    const report = buildVocabularyReport(nextAnswers, {
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
        console.error('Failed to persist vocabulary answer:', error);
        setRecordStatus('failed');
      });

    recordWriteRef.current = write.catch(() => undefined);
  };

  const toggleSpeech = async (
    text: string,
    rate: number,
    source: 'auto' | 'manual',
    target: SpeechTarget,
  ) => {
    if (isSpeaking && activeSpeechTarget === target) {
      if (pausePracticeSpeech()) {
        setIsSpeaking(false);
        setPausedSpeechTarget(target);
        setSpeechNotice('语音已暂停，再次点击可继续播放。');
      } else {
        stopPracticeSpeech();
        setIsSpeaking(false);
        setActiveSpeechTarget(null);
        setPausedSpeechTarget(null);
      }
      return;
    }

    if (pausedSpeechTarget === target) {
      const resumed = await resumePracticeSpeech();
      if (resumed) {
        setIsSpeaking(true);
        setActiveSpeechTarget(target);
        setPausedSpeechTarget(null);
        setSpeechNotice('语音继续播放。');
        return;
      }
      setPausedSpeechTarget(null);
    }

    stopPracticeSpeech();
    setIsSpeaking(false);
    setActiveSpeechTarget(null);
    setPausedSpeechTarget(null);
    await speak(text, rate, source, target);
  };

  useEffect(() => {
    if (isFirstQuestionSync.current) {
      isFirstQuestionSync.current = false;
    } else {
      const savedAnswer = answers[currentIdx];
      setSelectedOpt(savedAnswer?.selected ?? null);
      setConfidence(savedAnswer?.confidence ?? null);
      setIsSubmitted(Boolean(savedAnswer));
      setRecordStatus(savedAnswer && onAnswerRecorded ? 'saved' : 'idle');
    }
    stopPracticeSpeech();
    setIsSpeaking(false);
    setActiveSpeechTarget(null);
    setPausedSpeechTarget(null);
  }, [currentIdx, packIndex]);

  useEffect(() => {
    if (!initialDraft.restored || initialDraft.replayed || answers.every((answer) => !answer)) return;
    queueVocabularyAnswerRecord(answers);
  }, []);

  useEffect(() => {
    if (!autoSpeakEnabled || !currentItem) return;
    setSpeechNotice('自动播报开启');
    void preloadPracticeSpeech(currentAutoSpeechText, {
      rate: AUTO_SPEECH_RATE,
      preferLocalAudio: true,
    });
    if (nextAutoSpeechText) {
      void preloadPracticeSpeech(nextAutoSpeechText, {
        rate: AUTO_SPEECH_RATE,
        preferLocalAudio: true,
      });
    }
    const timer = window.setTimeout(() => {
      speak(currentAutoSpeechText, AUTO_SPEECH_RATE, 'auto', 'auto');
    }, 250);
    return () => window.clearTimeout(timer);
  }, [autoSpeakEnabled, currentAutoSpeechText, nextAutoSpeechText]);

  useEffect(() => {
    return () => {
      stopPracticeSpeech();
    };
  }, []);

  useEffect(() => {
    if (!isSubmitted || !shouldScrollToSubmittedSupportRef.current) return;
    shouldScrollToSubmittedSupportRef.current = false;
    window.requestAnimationFrame(() => {
      submittedRevealRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      });
    });
  }, [isSubmitted, currentItem?.id]);

  const handleSelectOption = (nextChoice: Choice) => {
    if (isSubmitted) return;
    setSelectedOpt(nextChoice);
    persistDraft({ selectedOpt: nextChoice, isSubmitted: false });
  };

  const handleSelectConfidence = (nextConfidence: Confidence) => {
    if (isSubmitted) return;
    setConfidence(nextConfidence);
    persistDraft({ confidence: nextConfidence, isSubmitted: false });
  };

  const handleSubmit = () => {
    if (!selectedOpt || !confidence) return;
    const correct = selectedOpt === currentItem.correctAnswer;
    const nextAnswers = [...answers];
    nextAnswers[currentIdx] = {
      selected: selectedOpt,
      correct,
      confidence,
      questionId: String(currentItem.id),
      moduleId: 'vocabulary',
      questionTypeId: 'cet4-core-vocabulary',
    };
    shouldScrollToSubmittedSupportRef.current = true;
    setAnswers(nextAnswers);
    setIsSubmitted(true);
    persistDraft({
      selectedOpt,
      confidence,
      isSubmitted: true,
      answers: nextAnswers,
    });
    queueVocabularyAnswerRecord(nextAnswers);
  };

  const finish = (finalAnswers: typeof answers) => {
    const correctCount = finalAnswers.filter((answer) => answer?.correct).length;
    const score = Math.round((correctCount / Math.max(1, sessionItems.length)) * 100);
    const report = buildVocabularyReport(finalAnswers, {
      sessionStatus: 'completed',
      includeEvidence: true,
      answeredOnly: false,
    });
    clearPracticeDraft(draftKey);
    void recordWriteRef.current.finally(() => {
      onComplete(score, report);
    });
  };

  const handleNext = () => {
    const finalAnswers = answers;
    if (currentIdx < sessionItems.length - 1) {
      const nextIdx = currentIdx + 1;
      const savedAnswer = answers[nextIdx];
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
      return;
    }
    finish(finalAnswers);
  };

  return (
    <main className="app-page-surface ui-page">
      <div className="ui-page-content flex w-full flex-col gap-5">
        <header className="ui-page-header">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onBack}
              data-testid="vocabulary-back-to-practice"
              className="ui-button ui-button-secondary sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              返回专项练习
            </button>
            <div className="text-sm font-black text-slate-500">
              CET-4 核心词汇听音练习 · 本组 {currentIdx + 1}/{sessionItems.length} · 词库 {practiceItems.length}
            </div>
            {initialDraft.replayed ? (
              <span
                data-testid="vocabulary-attempt-replayed"
                className="rounded-full bg-[#eef7fc] px-2.5 py-1 text-[11px] font-black text-[#003178]"
              >
                已回显上次作答
              </span>
            ) : initialDraft.restored ? (
              <span
                data-testid="vocabulary-draft-restored"
                className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700"
              >
                已恢复到第 {packIndex + 1} 组 / 第 {currentIdx + 1} 个
              </span>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              词库分组 {packIndex + 1}/{packCount}
            </span>
            <button
              type="button"
              disabled={packIndex === 0}
              onClick={() => switchPack(packIndex - 1)}
              className="ui-button ui-button-secondary ui-button-compact rounded-full"
            >
              上一组
            </button>
            <button
              type="button"
              disabled={packIndex >= packCount - 1}
              onClick={() => switchPack(packIndex + 1)}
              className="ui-button ui-button-secondary ui-button-compact rounded-full"
            >
              下一组
            </button>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#003178] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <PracticeMethodGuide moduleId="vocabulary" compact />

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="ui-panel">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#003178]/10 px-3 py-1 text-xs font-black text-[#003178]">
              <Headphones className="h-4 w-4" />
              听音 + 词义 + 语块
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#071e27] sm:text-5xl">{currentItem.word}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
              {currentPhonetic ? <span>{currentPhonetic}</span> : null}
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{currentItem.partOfSpeech}</span>
              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">{currentItem.meaning}</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => toggleSpeech(currentItem.word, 0.78, 'manual', 'word')}
                className="ui-button ui-button-primary ui-button-full"
              >
                {isSpeaking && activeSpeechTarget === 'word' ? <PauseCircle className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {isSpeaking && activeSpeechTarget === 'word'
                  ? '暂停单词'
                  : pausedSpeechTarget === 'word'
                    ? '继续单词'
                    : '播放单词'}
              </button>
              <button
                type="button"
                onClick={() => toggleSpeech(currentItem.example, 0.86, 'manual', 'example')}
                className="ui-button ui-button-secondary ui-button-full"
              >
                {isSpeaking && activeSpeechTarget === 'example' ? <PauseCircle className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {isSpeaking && activeSpeechTarget === 'example'
                  ? '暂停例句'
                  : pausedSpeechTarget === 'example'
                    ? '继续例句'
                    : '播放例句'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAutoSpeakEnabled((enabled) => {
                    const nextEnabled = !enabled;
                    if (!nextEnabled) {
                      stopPracticeSpeech();
                      setIsSpeaking(false);
                      setActiveSpeechTarget(null);
                      setPausedSpeechTarget(null);
                      setSpeechNotice('自动播报关闭');
                    } else {
                      setSpeechNotice('自动播报开启');
                    }
                    return nextEnabled;
                  });
                }}
                className="ui-button ui-button-secondary ui-button-full sm:col-span-2 lg:col-span-1"
              >
                {autoSpeakEnabled ? <Volume2 className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
                {autoSpeakEnabled ? '自动播报已开启' : '自动播报已关闭'}
              </button>
            </div>
            <p
              data-testid="vocabulary-auto-speech-status"
              className="mt-3 rounded-2xl bg-sky-50 px-4 py-3 text-xs font-bold leading-5 text-[#003178]"
            >
              {speechNotice}
            </p>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Collocation</div>
              <p className="mt-2 text-sm font-black text-[#003178]">{currentItem.collocation}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{currentItem.example}</p>
            </div>
          </aside>

          <article className="ui-panel">
            <h2 className="text-xl font-black text-[#003178]">选择最准确的英文释义</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              先听单词和例句，再选择释义。系统会把低信心或错误项加入复习队列。
            </p>
            {isSubmitted && questionSupport ? (
              <div
                ref={submittedRevealRef}
                data-testid="vocabulary-question-translation"
                className="mt-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold leading-6 text-[#003178]"
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-sky-700">
                  题干中文
                </div>
                <p className="mt-1">{questionSupport.prompt.chineseMeaning}</p>
              </div>
            ) : null}
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-sm font-bold leading-6 text-amber-900">
              <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                中文辅助
              </div>
              <p>单词中文义：{currentItem.meaning}</p>
              <p className="mt-1 text-xs text-amber-800">提交后显示正确答案、选项中文和例句翻译。</p>
            </div>

            <div className="mt-6 grid gap-3">
              {(Object.keys(currentItem.options) as Choice[]).map((optionKey) => {
                const isSelected = selectedOpt === optionKey;
                const isCorrect = optionKey === currentItem.correctAnswer;
                const revealCorrect = isSubmitted && isCorrect;
                const revealWrong = isSubmitted && isSelected && !isCorrect;
                const optionTranslation = isSubmitted
                  ? questionSupport?.optionTranslations.find((option) => option.key === optionKey)
                  : null;
                return (
                  <button
                    key={optionKey}
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => handleSelectOption(optionKey)}
                    className={`min-h-14 rounded-2xl border px-4 text-left text-sm font-bold transition ${
                      revealCorrect
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : revealWrong
                          ? 'border-rose-300 bg-rose-50 text-rose-800'
                          : isSelected
                            ? 'border-[#003178] bg-[#003178] text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-[#003178] hover:text-[#003178]'
                    }`}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{optionKey}. {currentItem.options[optionKey]}</span>
                      {revealCorrect ? (
                        <span
                          data-testid={'vocabulary-option-correct-badge-' + optionKey}
                          className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white"
                        >
                          正确答案
                        </span>
                      ) : null}
                      {revealWrong ? (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
                          你的选择
                        </span>
                      ) : null}
                    </span>
                    {optionTranslation ? (
                      <span
                        data-testid={`vocabulary-option-translation-${optionKey}`}
                        className={`mt-2 block border-t pt-2 text-xs font-black leading-5 ${
                          revealCorrect
                            ? 'border-emerald-200 text-emerald-700'
                            : revealWrong
                              ? 'border-rose-200 text-rose-700'
                              : 'border-slate-100 text-slate-500'
                        }`}
                      >
                        中文：{optionTranslation.chineseMeaning}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-3">
              <div className="mb-2 text-xs font-black text-slate-500">答题把握度</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['sure', '有把握'],
                  ['not_sure', '不确定'],
                  ['guess', '猜的'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => handleSelectConfidence(value as Confidence)}
                    data-testid={`vocabulary-confidence-${value}`}
                    className={`min-h-11 rounded-xl border px-2 text-xs font-black transition ${
                      confidence === value
                        ? 'border-[#003178] bg-[#003178] text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-[#003178]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {isSubmitted ? (
              <div
                data-testid="vocabulary-post-answer-support"
                className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 p-4"
              >
                <div
                  data-testid="vocabulary-correct-answer"
                  className="flex items-center gap-2 text-sm font-black text-[#003178]"
                >
                  {selectedOpt === currentItem.correctAnswer ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-600" />
                  )}
                  正确答案：{currentItem.correctAnswer}. {currentItem.options[currentItem.correctAnswer]}
                </div>
                {recordStatus !== 'idle' ? (
                  <div
                    data-testid="vocabulary-record-status"
                    className={`mt-3 rounded-xl border px-3 py-2 text-xs font-black ${
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
                {sentenceSupport ? (
                  <div
                    data-testid="vocabulary-sentence-translation"
                    className="mt-4 rounded-2xl border border-white/80 bg-white p-4 text-sm leading-6 text-slate-700"
                  >
                    <div className="text-xs font-black uppercase tracking-widest text-[#003178]">
                      例句翻译
                    </div>
                    <p className="mt-2 font-bold text-slate-900">英文原句：{sentenceSupport.sourceText}</p>
                    <p className="mt-1 font-semibold text-slate-600">中文句意：{sentenceSupport.chineseMeaning}</p>
                    {sentenceSupport.chunks.length > 1 ? (
                      <div data-testid="vocabulary-sentence-chunks" className="mt-3 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          断句译文
                        </div>
                        {sentenceSupport.chunks.map((chunk) => (
                          <div key={chunk.sourceText} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                            <p className="font-bold text-slate-800">{chunk.sourceText}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-600">{chunk.chineseMeaning}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              {!isSubmitted ? (
                <button
                  type="button"
                  disabled={!selectedOpt || !confidence}
                  onClick={handleSubmit}
                  data-testid="vocabulary-submit"
                  className="ui-button ui-button-primary"
                >
                  提交词汇答案
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  data-testid="vocabulary-next"
                  className="ui-button ui-button-primary"
                >
                  {currentIdx === sessionItems.length - 1 ? '完成词汇练习' : '进入下一个单词'}
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
