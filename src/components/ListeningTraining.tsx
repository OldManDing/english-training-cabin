import React, { useState, useEffect } from 'react';
import { Headphones, ArrowLeft, Play, Pause, ChevronDown, ChevronUp, CheckCircle, XCircle, Sparkles, Volume2, RotateCcw, Award, ArrowRight, Sparkle, RefreshCw, FastForward } from 'lucide-react';
import { Attempt, ChoiceOption, PracticeCompletionReport, QuestionChineseSupport } from '../types';
import { getListeningChineseSupport } from '../domain/practice/chineseSupport';
import { buildListeningReplayAnswer } from '../domain/practice/attemptReplay';
import { getQuestionSentenceSupport } from '../domain/practice/sentenceTranslations';
import {
  ListeningConfidence,
  ListeningPracticeDraft,
  ListeningQuestionDraft,
  clampDraftIndex,
  clearPracticeDraftAfterCompletion,
  loadPracticeDraft,
  practiceDraftKeys,
  savePracticeDraft,
} from '../domain/practice/draftProgress';
import { buildChoicePracticeReport } from '../domain/practice/reports';
import { pausePracticeSpeech, playPracticeSpeech, preloadPracticeSpeech, resumePracticeSpeech, stopPracticeSpeech } from '../lib/practiceSpeech';
import { CET4_LISTENING_PRACTICE_QUESTIONS, CET4_MOCK_EXAM } from '../questionBank';
import { SelectField } from './controls/FormControls';
import PracticeMethodGuide from './PracticeMethodGuide';

interface ListeningTrainingProps {
  initialQuestionId?: string;
  replayAttempt?: Attempt;
  onBack: () => void;
  onComplete: (score: number, report: PracticeCompletionReport) => Promise<boolean | void> | boolean | void;
  onAnswerRecorded?: (report: PracticeCompletionReport) => Promise<void> | void;
  practicedQuestionIds?: Iterable<string>;
}

interface QuestionItem {
  id: string;
  legacyId: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: ChoiceOption;
  selectedAnswer?: ChoiceOption;
  confidence?: ListeningConfidence;
  isSubmitted?: boolean;
  timeTaken?: number;
  explanation: string;
  trapType: string; // e.g., '转折信息漏听' | '关键词漏听' | '选项判断失误'
  transcriptionPoint: string; // e.g., '01:22 处原句'
  chineseSupport?: QuestionChineseSupport;
}

const LISTENING_TRANSCRIPT_TEXT = CET4_MOCK_EXAM.listening.transcript;
const LONG_CONVERSATION_PRACTICE_QUESTIONS: QuestionItem[] = CET4_LISTENING_PRACTICE_QUESTIONS
  .filter((question) => question.questionTypeId === 'long-conversation')
  .map((question, index) => ({
    id: question.id,
    legacyId: `${index + 1}`,
    question: question.prompt,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    trapType: question.trapType ?? '关键词漏听',
    transcriptionPoint: question.correctSentence,
    chineseSupport: getListeningChineseSupport({
      prompt: question.prompt,
      options: question.options,
    }),
  }));

const buildListeningAnswersByQuestionId = (questions: QuestionItem[]) =>
  questions.reduce<Record<string, ListeningQuestionDraft>>((result, question) => {
    if (question.selectedAnswer || question.confidence || question.isSubmitted) {
      result[question.id] = {
        selectedAnswer: question.selectedAnswer,
        confidence: question.confidence,
        isSubmitted: question.isSubmitted,
      };
    }
    return result;
  }, {});

const buildActiveListeningQuestions = (practicedQuestionIds?: Iterable<string>, initialQuestionId?: string) => {
  const practicedIds = new Set(Array.from(practicedQuestionIds ?? []).map(String));
  if (practicedIds.size === 0) return LONG_CONVERSATION_PRACTICE_QUESTIONS;

  const unpracticedQuestions = LONG_CONVERSATION_PRACTICE_QUESTIONS.filter(
    (question) => !practicedIds.has(question.id) && !practicedIds.has(question.legacyId),
  );
  if (initialQuestionId && !unpracticedQuestions.some((question) => question.id === initialQuestionId || question.legacyId === initialQuestionId)) {
    return LONG_CONVERSATION_PRACTICE_QUESTIONS;
  }

  return unpracticedQuestions.length > 0 ? unpracticedQuestions : LONG_CONVERSATION_PRACTICE_QUESTIONS;
};

const findListeningQuestionIndexById = (questions: QuestionItem[], questionId?: string) => {
  if (!questionId) return 0;
  const targetIndex = questions.findIndex((question) => question.id === questionId || question.legacyId === questionId);
  return targetIndex >= 0 ? targetIndex : 0;
};

const loadListeningDraftState = (baseQuestions: QuestionItem[], initialQuestionId?: string, replayAttempt?: Attempt) => {
  const startedAt = new Date().toISOString();
  const replayAnswer = buildListeningReplayAnswer(replayAttempt);
  if (initialQuestionId && replayAttempt && replayAnswer) {
    const currentQuestionIndex = findListeningQuestionIndexById(baseQuestions, initialQuestionId);
    return {
      restored: false,
      replayed: true,
      startedAt,
      currentQuestionIndex,
      questions: baseQuestions.map((question) => (
        question.id === initialQuestionId || question.legacyId === initialQuestionId
          ? { ...question, ...replayAnswer }
          : question
      )),
    };
  }

  const draft = loadPracticeDraft<ListeningPracticeDraft>(practiceDraftKeys.listening);
  if (!draft || draft.version !== 1) {
    return {
      restored: false,
      replayed: false,
      startedAt,
      currentQuestionIndex: findListeningQuestionIndexById(baseQuestions, initialQuestionId),
      questions: baseQuestions,
    };
  }

  const answersByQuestionId = draft.answersByQuestionId ?? {};
  const questions = baseQuestions.map((question) => ({
    ...question,
    ...(answersByQuestionId[question.id] ?? answersByQuestionId[question.legacyId]),
  }));

  return {
    restored: !initialQuestionId,
    replayed: false,
    startedAt: draft.startedAt ?? startedAt,
    currentQuestionIndex: initialQuestionId
      ? findListeningQuestionIndexById(questions, initialQuestionId)
      : clampDraftIndex(draft.currentQuestionIndex, questions.length),
    questions,
  };
};

export default function ListeningTraining({
  initialQuestionId,
  replayAttempt,
  onBack,
  onComplete,
  onAnswerRecorded,
  practicedQuestionIds,
}: ListeningTrainingProps) {
  const [baseQuestions] = useState(() => buildActiveListeningQuestions(practicedQuestionIds, initialQuestionId));
  const [initialDraft] = useState(() => loadListeningDraftState(baseQuestions, initialQuestionId, replayAttempt));
  const [startedAt] = useState(() => initialDraft.startedAt);

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlaybackPaused, setIsPlaybackPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [autoPlaybackEnabled, setAutoPlaybackEnabled] = useState(true);
  const [autoPlaybackAttempted, setAutoPlaybackAttempted] = useState(false);
  const totalDuration = Math.max(60, Math.round(LISTENING_TRANSCRIPT_TEXT.split(/\s+/).filter(Boolean).length / 2.4));
  const [activeTab, setActiveTab] = useState<'ref' | 'focus' | 'shadow' | 'write' | 'listen'>('focus'); // "精听" mode is active
  
  // Waveform Equalizer heights
  const [equalizerHeights, setEqualizerHeights] = useState<number[]>([
    12, 18, 25, 32, 45, 38, 20, 15, 28, 35, 42, 38, 25, 14, 22, 18, 26, 30, 15
  ]);
  
  // Accordion status
  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  // Questions Database
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialDraft.currentQuestionIndex);
  const [questions, setQuestions] = useState<QuestionItem[]>(initialDraft.questions);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const submittedQuestionCount = questions.filter((question) => question.isSubmitted && question.selectedAnswer).length;

  const persistDraft = (nextQuestions: QuestionItem[] = questions, nextQuestionIndex = currentQuestionIndex) => {
    savePracticeDraft<ListeningPracticeDraft>(practiceDraftKeys.listening, {
      version: 1,
      startedAt,
      currentQuestionIndex: nextQuestionIndex,
      answersByQuestionId: buildListeningAnswersByQuestionId(nextQuestions),
      updatedAt: new Date().toISOString(),
    });
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Audio simulation timer
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return prev + 1;
        });

        // Simulate active equalizer bars
        setEqualizerHeights(() => {
          return Array.from({ length: 19 }, () => Math.floor(Math.random() * 32) + 12);
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      stopPracticeSpeech();
    };
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  const skipAudio = (amount: number) => {
    setCurrentTime((prev) => {
      const target = prev + amount;
      if (target <= 0) return 0;
      if (target >= totalDuration) return totalDuration;
      return target;
    });
    if (isPlaying) {
      triggerToast(amount > 0 ? '已跳过前方片段，语音会从当前位置继续训练。' : '已回到前一段重点句，语音会从当前位置继续训练。');
      stopPracticeSpeech();
      setIsPlaying(false);
      setIsPlaybackPaused(false);
      void window.setTimeout(() => startAudioPlayback('manual'), 0);
    }
  };

  const startAudioPlayback = async (source: 'auto' | 'manual' = 'manual') => {
    await playPracticeSpeech(LISTENING_TRANSCRIPT_TEXT, {
      rate: audioSpeed,
      preferLocalAudio: true,
      onStart: () => {
        setIsPlaying(true);
        setIsPlaybackPaused(false);
      },
      onEnd: () => {
        setIsPlaying(false);
        setIsPlaybackPaused(false);
      },
      onError: () => {
        setIsPlaying(false);
        setIsPlaybackPaused(false);
        triggerToast(source === 'auto'
          ? '自动播报被浏览器拦截，请点击播放按钮开始听力。'
          : '语音播放失败，请改用听力原文训练。');
      },
    });
    if (source === 'auto') {
      triggerToast('已自动开始语音播报；可随时暂停或调整速度。');
    }
    return true;
  };

  useEffect(() => {
    if (!autoPlaybackEnabled || autoPlaybackAttempted) return;
    void preloadPracticeSpeech(LISTENING_TRANSCRIPT_TEXT, {
      rate: audioSpeed,
      preferLocalAudio: true,
    });
    const timer = window.setTimeout(() => {
      setAutoPlaybackAttempted(true);
      void startAudioPlayback('auto');
    }, 350);
    return () => window.clearTimeout(timer);
  }, [autoPlaybackEnabled, autoPlaybackAttempted, audioSpeed]);

  const toggleAudioPlayback = async () => {
    if (isPlaying) {
      if (pausePracticeSpeech()) {
        setIsPlaybackPaused(true);
        triggerToast('听力语音已暂停，再次点击播放可继续。');
      } else {
        stopPracticeSpeech();
        setIsPlaybackPaused(false);
      }
      setIsPlaying(false);
      return;
    }

    if (isPlaybackPaused) {
      const resumed = await resumePracticeSpeech();
      if (resumed) {
        setIsPlaying(true);
        setIsPlaybackPaused(false);
        return;
      }
      setIsPlaybackPaused(false);
    }

    void startAudioPlayback('manual');
  };

  const toggleAutoPlayback = () => {
    const nextEnabled = !autoPlaybackEnabled;
    setAutoPlaybackEnabled(nextEnabled);
    setAutoPlaybackAttempted(!nextEnabled);
    if (!nextEnabled) {
      stopPracticeSpeech();
      setIsPlaying(false);
      setIsPlaybackPaused(false);
      triggerToast('自动播报关闭');
    } else {
      triggerToast('自动播报开启');
    }
  };

  const handleSelectOption = (opt: ChoiceOption) => {
    if (questions[currentQuestionIndex].isSubmitted) return;
    setQuestions((prev) => {
      const copy = [...prev];
      copy[currentQuestionIndex] = { ...copy[currentQuestionIndex], selectedAnswer: opt };
      persistDraft(copy);
      return copy;
    });
  };

  const handleSelectConfidence = (level: ListeningConfidence) => {
    if (questions[currentQuestionIndex].isSubmitted) return;
    setQuestions((prev) => {
      const copy = [...prev];
      copy[currentQuestionIndex] = { ...copy[currentQuestionIndex], confidence: level };
      persistDraft(copy);
      return copy;
    });
  };

  const handleSubmitAnswer = () => {
    const activeQ = questions[currentQuestionIndex];
    if (!activeQ.selectedAnswer) {
      triggerToast("请先选择一个选项作为答案！");
      return;
    }
    if (!activeQ.confidence) {
      triggerToast("请先选择把握度，系统需要它判断低信心题是否进入复习队列。");
      return;
    }

    setQuestions((prev) => {
      const copy = [...prev];
      copy[currentQuestionIndex] = { ...copy[currentQuestionIndex], isSubmitted: true };
      persistDraft(copy);
      return copy;
    });

    if (activeQ.selectedAnswer !== activeQ.correctAnswer) {
      triggerToast(`回答诊断完毕：智能识别出您存在 「${activeQ.trapType}」 情况！`);
    } else {
      triggerToast("恭喜，回答正确！精准捕捉听力转折，信心指数加成。");
    }
  };

  const buildListeningReport = (targetQuestions: QuestionItem[], options: {
    sessionStatus: 'active' | 'completed';
    includeEvidence: boolean;
  }) => {
    const submittedQuestions = targetQuestions.filter((question) => question.isSubmitted && question.selectedAnswer);
    return buildChoicePracticeReport({
      examId: 'cet4',
      moduleId: 'listening',
      questionTypeId: 'long-conversation',
      modeId: 'listening-focus-practice',
      skillArea: 'listening',
      plannedMinutes: 10,
      startedAt,
      sessionStatus: options.sessionStatus,
      questions: submittedQuestions.map((question) => ({
        id: question.id,
        question: question.question,
        options: question.options,
        optionTranslations: question.chineseSupport?.options,
        correctAnswer: question.correctAnswer,
        trapType: question.trapType,
        correctSentence: question.transcriptionPoint,
        correctSentenceTranslation: getQuestionSentenceSupport({
          sentence: question.transcriptionPoint,
          explanation: question.explanation,
        })?.chineseMeaning,
        questionTranslation: question.chineseSupport?.question,
        explanation: question.explanation,
      })),
      answers: submittedQuestions.map((question) => ({
        selected: question.selectedAnswer,
        correct: question.selectedAnswer === question.correctAnswer,
        confidence: question.confidence,
      })),
      includeReviewItems: options.includeEvidence,
      includeSkillProfiles: options.includeEvidence,
    });
  };

  const handleAddToReviewQueue = () => {
    const activeQ = questions[currentQuestionIndex];
    if (!activeQ.isSubmitted || !activeQ.selectedAnswer) {
      triggerToast('先提交本题，再加入复习队列。');
      return;
    }

    const report = buildListeningReport([activeQ], {
      sessionStatus: 'active',
      includeEvidence: true,
    });
    void Promise.resolve(onAnswerRecorded?.(report))
      .then(() => {
        triggerToast('已写入复习队列。');
      })
      .catch((error) => {
        console.error('Failed to persist listening review item:', error);
        triggerToast('复习队列写入失败，请稍后重试。');
      });
  };

  const handleNextQuestion = () => {
    if (isCompleting) return;
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      persistDraft(questions, nextIndex);
    } else {
      const submittedQuestions = questions.filter((question) => question.isSubmitted && question.selectedAnswer);
      const correctCalculated = submittedQuestions.filter(q => q.selectedAnswer === q.correctAnswer).length;
      const score = submittedQuestions.length > 0 ? Math.round((correctCalculated / submittedQuestions.length) * 100) : 0;
      const report = buildListeningReport(questions, {
        sessionStatus: 'completed',
        includeEvidence: true,
      });
      setIsCompleting(true);
      void clearPracticeDraftAfterCompletion(
        practiceDraftKeys.listening,
        () => onComplete(score, report),
      )
        .finally(() => setIsCompleting(false));
    }
  };

  // Progress Bar percentage
  const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  const activeQ = questions[currentQuestionIndex];
  const activeSentenceSupport = getQuestionSentenceSupport({
    sentence: activeQ.transcriptionPoint,
    explanation: activeQ.explanation,
  });
  const showTranscript = activeTab !== 'shadow';
  const showQuestionPanel = activeTab !== 'listen';
  const modeHint: Record<typeof activeTab, string> = {
    ref: '原速训练：按真实速度完整听，再作答。',
    focus: '精听模式：边看原文边核对关键词。',
    shadow: '盲听：先隐藏原文，只靠声音判断。',
    write: '听写：听完后写下关键词或完整句，再核对原文。',
    listen: '影子跟读：跟读材料，先练声音和节奏，再回到题目。',
  };

  return (
    <div className="app-page-surface ui-page relative overflow-hidden">
      
      {/* Toast banner */}
      {toastMessage && (
        <div className="absolute top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-[#003178] text-white px-4 sm:px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-bold border border-[#cfe6f2] animate-bounce">
          <Sparkle className="h-4 w-4 text-emerald-300 fill-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <header className="ui-page-header-compact flex shrink-0 flex-col gap-3 bg-white px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
          <button
            onClick={onBack}
            data-testid="listening-back-to-practice"
            aria-label="返回专项练习"
            className="ui-button ui-button-secondary ui-button-icon"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#003178] flex items-center gap-2">
              <Headphones className="h-5 w-5 animate-bounce" />
              听力训练 - 长对话
            </h1>
            <p className="text-[11px] text-gray-400">
              CET-4 原创模拟长对话 · 已提交 {submittedQuestionCount}/{questions.length} 题
            </p>
            {initialDraft.replayed ? (
              <span
                data-testid="listening-attempt-replayed"
                className="mt-1 inline-flex rounded-full bg-[#eef7fc] px-2.5 py-1 text-[11px] font-black text-[#003178]"
              >
                已回显上次作答
              </span>
            ) : initialDraft.restored ? (
              <span
                data-testid="listening-draft-restored"
                className="mt-1 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700"
              >
                已恢复第 {currentQuestionIndex + 1} 题
              </span>
            ) : null}
          </div>
        </div>

        {/* Tab switcher shown in screenshot */}
        <div className="w-full lg:w-auto overflow-x-auto bg-neutral-100 p-1 rounded-xl flex items-center space-x-1 border border-neutral-200 text-xs">
          <button
            onClick={() => setActiveTab('ref')}
            className={`min-h-11 px-3 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'ref' ? 'bg-[#003178] text-white shadow-xs' : 'text-[#434652] hover:bg-white/50'
            }`}
          >
            原速训练
          </button>
          <button
            onClick={() => setActiveTab('focus')}
            className={`min-h-11 px-3 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'focus' ? 'bg-[#003178] text-white shadow-xs' : 'text-[#434652] hover:bg-white/50'
            }`}
          >
            精听模式
          </button>
          <button
            onClick={() => setActiveTab('shadow')}
            className={`min-h-11 px-3 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'shadow' ? 'bg-[#003178] text-white shadow-xs' : 'text-[#434652] hover:bg-white/50'
            }`}
          >
            盲听
          </button>
          <button
            onClick={() => setActiveTab('write')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'write' ? 'bg-[#003178] text-white shadow-xs' : 'text-[#434652] hover:bg-white/50'
            }`}
          >
            听写
          </button>
          <button
            onClick={() => setActiveTab('listen')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'listen' ? 'bg-[#003178] text-white shadow-xs' : 'text-[#434652] hover:bg-white/50'
            }`}
          >
            影子跟读
          </button>
        </div>
      </header>

      <PracticeMethodGuide moduleId="listening" compact className="mx-4 mt-4 mb-4 sm:mx-6 lg:mx-8" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        
        {/* Left column: Vinyl player & transcript */}
        <div className="w-full lg:w-1/2 p-4 sm:p-6 lg:p-8 overflow-y-auto flex flex-col space-y-6 border-b lg:border-b-0 lg:border-r border-[#cfe6f2] bg-white">
          
          {/* Audio vinyl controller */}
          <div className="bg-[#f3faff] border border-[#cfe6f2] rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center relative shadow-xs">
            
            {/* Vinyl record design */}
            <div className="relative w-28 h-28 bg-[#0a1e36] rounded-full flex items-center justify-center border-4 border-[#cfe6f2] shadow-md group">
              {/* Groove rings */}
              <div className="absolute inset-2 border border-neutral-700 rounded-full opacity-60" />
              <div className="absolute inset-4 border border-neutral-700 rounded-full opacity-60" />
              <div className="absolute inset-6 border border-neutral-700 rounded-full opacity-60" />
              
              {/* Spinning action when playing */}
              <div className={`w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-[#1e3c72] ${isPlaying ? 'animate-spin' : ''}`}>
                <Headphones className="h-5 w-5 text-[#003178]" />
              </div>
            </div>

            {/* Simulated Live Equalizer Waveform Bars */}
            <div className="flex items-end justify-center gap-1.5 h-16 my-5 px-6">
              {equalizerHeights.map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isPlaying ? 'bg-[#003178]' : 'bg-gray-300'
                  }`}
                  style={{ height: `${isPlaying ? h : 16}px` }}
                />
              ))}
            </div>

            {/* Player Progress timeline slider and timing */}
            <div className="w-full space-y-2">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-500 font-semibold font-mono">{formatTime(currentTime)}</span>
                
                {/* Horizontal slider box */}
                <div className="flex-1 bg-[#dbf1fe] h-1.5 rounded-full overflow-hidden border border-neutral-200 relative">
                  <div
                    className="bg-[#003178] h-full rounded-full transition-all"
                    style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                  />
                </div>
                
                <span className="text-xs text-slate-500 font-semibold font-mono">{formatTime(totalDuration)}</span>
              </div>

              {/* Player control buttons */}
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center px-0 sm:px-4 pt-2">
                {/* Speed dropdown control */}
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#434652]">
                  <span className="shrink-0">速度</span>
                  <SelectField
                    ariaLabel="听力播放速度"
                    className="w-28"
                    compact
                    value={String(audioSpeed)}
                    onChange={(nextValue) => setAudioSpeed(parseFloat(nextValue))}
                    options={[
                      { value: '0.8', label: '0.8x' },
                      { value: '1', label: '1.0x' },
                      { value: '1.2', label: '1.2x' },
                      { value: '1.5', label: '1.5x' },
                    ]}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  {/* Backward 10s */}
                  <button
                    onClick={() => skipAudio(-10)}
                    aria-label="后退10秒"
                    className="ui-button ui-button-secondary ui-button-icon rounded-full"
                    title="后退10秒"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  {/* Play Main Circle Toggle */}
                  <button
                    onClick={toggleAudioPlayback}
                    aria-label={isPlaying ? '暂停听力材料' : isPlaybackPaused ? '继续听力材料' : '播放听力材料'}
                    className="ui-button ui-button-primary ui-button-icon rounded-full"
                  >
                    {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white translate-x-0.5" />}
                  </button>

                  {/* Forward 10s */}
                  <button
                    onClick={() => skipAudio(10)}
                    aria-label="前进10秒"
                    className="ui-button ui-button-secondary ui-button-icon rounded-full"
                    title="前进10秒"
                  >
                    <FastForward className="h-4 w-4" />
                  </button>
                </div>

                {/* Simulated Volume */}
                <button
                  type="button"
                  onClick={toggleAutoPlayback}
                  className="ui-button ui-button-secondary ui-button-compact rounded-full"
                >
                  {autoPlaybackEnabled ? '自动播报已开启' : '自动播报已关闭'}
                </button>
              </div>

            </div>
            <p
              data-testid="listening-auto-speech-status"
              className="mt-3 rounded-2xl bg-white px-4 py-3 text-center text-xs font-bold leading-5 text-slate-500"
            >
              {modeHint[activeTab]} {autoPlaybackEnabled ? '自动播报开启' : '自动播报关闭'}
            </p>

          </div>

          {activeTab === 'write' ? (
            <div data-testid="listening-dictation-panel" className="rounded-3xl border border-[#cfe6f2] bg-white p-4">
              <label className="text-xs font-black text-[#003178]" htmlFor="listening-dictation-notes">
                听写记录
              </label>
              <textarea
                id="listening-dictation-notes"
                rows={5}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold leading-6 outline-none focus:border-[#003178] focus:bg-white"
                placeholder="写下听到的关键词、数字、转折词或完整句。"
              />
            </div>
          ) : null}

          {activeTab === 'listen' ? (
            <div data-testid="listening-shadow-panel" className="rounded-3xl border border-[#cfe6f2] bg-white p-4 text-sm font-semibold leading-6 text-slate-600">
              <div className="text-xs font-black text-[#003178]">影子跟读</div>
              <p className="mt-2">播放一句后立刻跟读，重点模仿停顿、重音和转折词。完成后切回精听模式做题。</p>
            </div>
          ) : null}

          {/* Transcript Accordion */}
          {showTranscript ? (
          <div className="border border-[#cfe6f2] rounded-3xl overflow-hidden shadow-2xs">
            <button
              onClick={() => setIsTranscriptionExpanded(!isTranscriptionExpanded)}
              className="ui-button ui-button-secondary ui-button-full justify-between rounded-none border-x-0 border-t-0"
            >
              <span className="flex items-center gap-1.5">
                <AlignLeftIcon className="h-4 w-4" />
                听力原文 (Transcription)
              </span>
              {isTranscriptionExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isTranscriptionExpanded && (
              <div className="p-6 text-xs text-[#434652] leading-relaxed space-y-4 max-h-[350px] overflow-y-auto">
                {LISTENING_TRANSCRIPT_TEXT.split('\n\n').map((paragraph) => (
                  <p key={paragraph} className="bg-[#f8fafc] p-3 rounded-xl border border-gray-100 whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>
          ) : (
            <div data-testid="listening-blind-mode-panel" className="rounded-3xl border border-dashed border-[#cfe6f2] bg-[#f8fbff] p-4 text-sm font-bold leading-6 text-[#003178]">
              盲听模式已隐藏原文。先完成本题，再切回精听核对证据句。
            </div>
          )}

        </div>

        {/* Right column: Question card & AI diagnosis details */}
        {showQuestionPanel ? (
        <div className="w-full lg:w-1/2 p-4 sm:p-6 lg:p-8 overflow-y-auto flex flex-col space-y-6">
          
          {/* Progress Section */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center text-xs">
            <span className="text-gray-400 font-bold uppercase tracking-wider bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg">
              Long Conversations
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[#003178] font-extrabold">第 {currentQuestionIndex + 1} / {questions.length} 题</span>
              <div className="w-24 bg-gray-200 h-1.5 rounded-full overflow-hidden border border-neutral-100">
                <div
                  className="bg-[#003178] h-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-gray-400 font-mono text-[10px]">{progressPercent}%</span>
            </div>
          </div>

          {/* Question detail box */}
          <div className="bg-white border-2 border-[#cfe6f2] hover:border-[#003178] transition-colors rounded-3xl p-4 sm:p-6 shadow-sm">
            <div className="text-[10px] font-bold text-[#003178] bg-[#dbf1fe] px-2.5 py-1 rounded-full border border-[#cfe6f2] inline-block mb-3">
              Question {activeQ.legacyId}
            </div>
            
            <h3 className="font-extrabold text-base text-[#071e27] mb-5 leading-tight">
              {activeQ.question}
            </h3>
            {activeQ.isSubmitted && activeQ.chineseSupport?.question ? (
              <p
                data-testid="listening-question-translation"
                className="-mt-3 mb-5 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800"
              >
                中文题意：{activeQ.chineseSupport.question}
              </p>
            ) : null}

            {/* Vertically stacked option buttons */}
            <div className="space-y-3">
              {(Object.keys(activeQ.options) as Array<'A' | 'B' | 'C' | 'D'>).map((key) => {
                const optText = activeQ.options[key];
                const isSelected = activeQ.selectedAnswer === key;
                const isCorrect = key === activeQ.correctAnswer;
                const isSubmitted = activeQ.isSubmitted;

                let btnStyles = "border hover:border-slate-300 bg-white text-[#434652]";
                let circleStyles = "border border-slate-300";

                if (isSelected) {
                  btnStyles = "border-2 border-[#003178] bg-[#f3faff] text-[#003178] font-bold";
                  circleStyles = "border-2 border-[#1e3c72] bg-[#003178]";
                }

                if (isSubmitted) {
                  if (isCorrect) {
                    btnStyles = "border-2 border-emerald-500 bg-emerald-50/70 text-emerald-800 font-bold relative";
                    circleStyles = "border border-emerald-500 bg-emerald-500 text-white";
                  } else if (isSelected) {
                    btnStyles = "border-2 border-rose-500 bg-rose-50/70 text-rose-800 font-bold relative";
                    circleStyles = "border border-rose-500 bg-rose-500 text-white";
                  } else {
                    btnStyles = "border border-slate-200 opacity-60 bg-white text-[#434652]";
                    circleStyles = "border border-slate-200 opacity-40";
                  }
                }

                return (
                  <button
                    key={key}
                    onClick={() => handleSelectOption(key)}
                    disabled={isSubmitted}
                    className={`w-full p-4 rounded-xl text-left flex items-start space-x-3 transition-all pointer-events-auto cursor-pointer ${btnStyles}`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-extrabold ${circleStyles}`}>
                      {isSubmitted && isCorrect ? "✓" : isSubmitted && isSelected ? "✗" : key}
                    </div>
                    <span className="min-w-0 flex-1 text-xs leading-relaxed">
                      <span className="block">{optText}</span>
                      {isSubmitted && activeQ.chineseSupport?.options?.[key] ? (
                        <span
                          data-testid={`listening-option-translation-${key}`}
                          className={`mt-1 block text-[11px] font-semibold leading-5 ${isSelected && !isSubmitted ? 'text-[#003178]/80' : 'text-slate-500'}`}
                        >
                          {activeQ.chineseSupport.options[key]}
                        </span>
                      ) : null}
                      {isSubmitted && isCorrect && (
                        <span className="mt-2 block w-fit text-[9px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-1 rounded">
                          正确答案 - 对应录音 {activeQ.transcriptionPoint}
                        </span>
                      )}
                      {isSubmitted && isSelected && !isCorrect && (
                        <span className="mt-2 block w-fit text-[9px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-1 rounded">
                          错误 - {activeQ.trapType}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Confidence Levels selection */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-[#434652] font-semibold flex items-center gap-1">
                把握度 (Confidence Level)
              </span>

              <div className="grid w-full grid-cols-3 bg-slate-100 p-1 border rounded-xl gap-1 sm:w-auto">
                {(['Low', 'Medium', 'High'] as const).map((lvl) => {
                  const isChosen = activeQ.confidence === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => handleSelectConfidence(lvl)}
                      data-testid={`listening-confidence-${lvl.toLowerCase()}`}
                      disabled={activeQ.isSubmitted}
                      className={`min-h-11 text-[10px] font-bold px-3 py-2 rounded-lg transition-all ${
                        isChosen
                          ? 'bg-[#003178] text-white shadow-xs scale-105'
                          : 'text-[#434652] hover:bg-white'
                      }`}
                    >
                      {lvl === 'Low' ? '低' : lvl === 'Medium' ? '中' : '高'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit answer control button */}
            {!activeQ.isSubmitted && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSubmitAnswer}
                  data-testid="listening-submit"
                  disabled={!activeQ.selectedAnswer || !activeQ.confidence}
                  className="ui-button ui-button-primary ui-button-full sm:w-auto"
                >
                  <span>提交答案</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Compact post-answer support after submission */}
          {activeQ.isSubmitted && (
            <div
              data-testid="listening-post-answer-support"
              className="bg-[#f0f9ff] border border-[#bae6fd] rounded-3xl p-4 sm:p-6 space-y-5 animate-fade-in"
            >
              <div className="flex items-center space-x-2 pb-3 border-b border-[#bae6fd]">
                <div className="p-1.5 bg-[#e0f2fe] text-[#0284c7] rounded-lg">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-extrabold text-[#0369a1] uppercase tracking-wider">
                  答后定位解析
                </h4>
              </div>

              {activeSentenceSupport ? (
                <div
                  data-testid="listening-sentence-translation"
                  className="rounded-2xl border border-[#bae6fd] bg-white p-4 text-xs leading-5 text-slate-700"
                >
                  <div className="font-extrabold text-[#0369a1]">答后定位解析</div>
                  <p className="mt-2 font-bold text-slate-900">英文原句：{activeSentenceSupport.sourceText}</p>
                  <p className="mt-1 font-semibold text-slate-600">定位说明：{activeSentenceSupport.chineseMeaning}</p>
                </div>
              ) : null}

              {/* Diagnosis trap cards showing what learner had trouble with */}
              <div>
                <span className="block text-[10px] font-extrabold text-[#475569] mb-2 uppercase">
                  自适应听觉漏洞检测 (Trap Cards)
                </span>
                <div className="grid grid-cols-2 gap-3.5 text-[10px] font-bold">
                  {/* Trap 1: 关键词漏听 */}
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2 ${
                      activeQ.trapType === '关键词漏听'
                        ? 'border-rose-300 bg-rose-50 text-rose-800'
                        : 'border-slate-100 bg-white text-slate-500'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>关键词漏听</span>
                  </div>

                  {/* Trap 2: 转折信息漏听 */}
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2 ${
                      activeQ.trapType === '转折信息漏听'
                        ? 'border-rose-300 bg-rose-50 text-rose-800'
                        : 'border-slate-100 bg-white text-slate-500'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>转折信息漏听</span>
                  </div>

                  {/* Trap 3: 数字时间混淆 */}
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2 ${
                      activeQ.trapType === '数字时间混淆'
                        ? 'border-rose-300 bg-rose-50 text-rose-800'
                        : 'border-slate-100 bg-white text-slate-500'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>数字时间混淆</span>
                  </div>

                  {/* Trap 4: 选项判断失误 */}
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2 ${
                      activeQ.trapType === '选项判断失误'
                        ? 'border-rose-300 bg-rose-50 text-rose-800'
                        : 'border-slate-100 bg-white text-slate-500'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>选项判断失误</span>
                  </div>
                </div>
              </div>

              {/* Action row to save item to queue vs skip forwards */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleAddToReviewQueue}
                  className="ui-button ui-button-secondary ui-button-compact shrink-0"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>加入复习队列</span>
                </button>

                <button
                  onClick={handleNextQuestion}
                  disabled={isCompleting}
                  data-testid="listening-next"
                  className="ui-button ui-button-primary ui-button-compact"
                >
                  <span>{isCompleting ? '正在保存训练记录' : currentQuestionIndex < questions.length - 1 ? '下一题' : '完成本次听力练习'}</span>
                  {isCompleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}

        </div>
        ) : null}

      </div>

    </div>
  );
}

function AlignLeftIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="21" x2="3" y1="6" y2="6" />
      <line x1="15" x2="3" y1="12" y2="12" />
      <line x1="17" x2="3" y1="18" y2="18" />
    </svg>
  );
}
