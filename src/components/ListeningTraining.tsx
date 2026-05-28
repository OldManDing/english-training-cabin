import React, { useState, useEffect, useRef } from 'react';
import { Headphones, ArrowLeft, Play, Pause, ChevronDown, ChevronUp, CheckCircle, XCircle, Sparkles, Volume2, RotateCcw, Award, ArrowRight, Sparkle, RefreshCw } from 'lucide-react';
import { PracticeCompletionReport } from '../types';
import { buildChoicePracticeReport } from '../domain/practice/reports';
import { CET4_LISTENING_PRACTICE_QUESTIONS, CET4_MOCK_EXAM } from '../questionBank';

interface ListeningTrainingProps {
  onBack: () => void;
  onComplete: (score: number, report: PracticeCompletionReport) => void;
  onAddToReview?: (item: { title: string; category: "词汇" | "句式" | "错题"; detail: string }) => void;
}

interface QuestionItem {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  selectedAnswer?: 'A' | 'B' | 'C' | 'D';
  confidence?: 'Low' | 'Medium' | 'High';
  isSubmitted?: boolean;
  timeTaken?: number;
  explanation: string;
  trapType: string; // e.g., '转折信息漏听' | '关键词漏听' | '选项判断失误'
  transcriptionPoint: string; // e.g., '01:22 处原句'
}

const LISTENING_TRANSCRIPT_TEXT = CET4_MOCK_EXAM.listening.transcript;
const LONG_CONVERSATION_PRACTICE_QUESTIONS: QuestionItem[] = CET4_LISTENING_PRACTICE_QUESTIONS
  .filter((question) => question.questionTypeId === 'long-conversation')
  .map((question, index) => ({
    id: `${index + 1}`,
    question: question.prompt,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    trapType: question.trapType ?? '关键词漏听',
    transcriptionPoint: question.correctSentence,
  }));

export default function ListeningTraining({ onBack, onComplete, onAddToReview }: ListeningTrainingProps) {
  const [startedAt] = useState(() => new Date().toISOString());
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(15); // Start at 15s like in screenshot
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const totalDuration = 165; // 2 minutes 45 seconds (165s)
  const [activeTab, setActiveTab] = useState<'ref' | 'focus' | 'shadow' | 'write' | 'listen'>('focus'); // "精听" mode is active
  
  // Waveform Equalizer heights
  const [equalizerHeights, setEqualizerHeights] = useState<number[]>([
    12, 18, 25, 32, 45, 38, 20, 15, 28, 35, 42, 38, 25, 14, 22, 18, 26, 30, 15
  ]);
  
  // Accordion status
  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(true);

  // Questions Database
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<QuestionItem[]>(LONG_CONVERSATION_PRACTICE_QUESTIONS);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
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
  };

  const toggleAudioPlayback = () => {
    if (!('speechSynthesis' in window)) {
      triggerToast('当前浏览器不支持语音播放，请直接阅读听力原文完成训练。');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(LISTENING_TRANSCRIPT_TEXT);
    utterance.lang = 'en-US';
    utterance.rate = audioSpeed;
    utterance.onend = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
      triggerToast('浏览器语音播放失败，请改用听力原文训练。');
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handleSelectOption = (opt: 'A' | 'B' | 'C' | 'D') => {
    if (questions[currentQuestionIndex].isSubmitted) return;
    setQuestions((prev) => {
      const copy = [...prev];
      copy[currentQuestionIndex] = { ...copy[currentQuestionIndex], selectedAnswer: opt };
      return copy;
    });
  };

  const handleSelectConfidence = (level: 'Low' | 'Medium' | 'High') => {
    if (questions[currentQuestionIndex].isSubmitted) return;
    setQuestions((prev) => {
      const copy = [...prev];
      copy[currentQuestionIndex] = { ...copy[currentQuestionIndex], confidence: level };
      return copy;
    });
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
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
      return copy;
    });

    if (activeQ.selectedAnswer !== activeQ.correctAnswer) {
      triggerToast(`回答诊断完毕：智能识别出您存在 「${activeQ.trapType}」 情况！`);
    } else {
      triggerToast("恭喜，回答正确！精准捕捉听力转折，信心指数加成。");
    }
  };

  const handleAddToReviewQueue = () => {
    const activeQ = questions[currentQuestionIndex];
    if (onAddToReview) {
      onAddToReview({
        title: `听力错题: Section A Q${activeQ.id}`,
        category: "错题",
        detail: `Q: ${activeQ.question} (原因: 错选了 ${activeQ.selectedAnswer}，正解为 ${activeQ.correctAnswer}。陷阱点: ${activeQ.trapType})`
      });
      triggerToast("已成功为您拉入「复习队列」，后续将根据艾宾浩斯记忆原理循环推送！");
    } else {
      triggerToast("本题错因已标记；完成本轮听力后会自动写入本地复习队列。");
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Complete practice
      const correctCalculated = questions.filter(q => q.selectedAnswer === q.correctAnswer).length;
      const score = Math.round((correctCalculated / questions.length) * 100);
      const report = buildChoicePracticeReport({
        examId: 'cet4',
        moduleId: 'listening',
        questionTypeId: 'long-conversation',
        modeId: 'listening-focus-practice',
        skillArea: 'listening',
        plannedMinutes: 10,
        startedAt,
        questions: questions.map((question) => ({
          id: question.id,
          question: question.question,
          correctAnswer: question.correctAnswer,
          trapType: question.trapType,
          explanation: question.explanation,
        })),
        answers: questions.map((question) => ({
          selected: question.selectedAnswer,
          correct: question.selectedAnswer === question.correctAnswer,
          confidence: question.confidence,
        })),
      });
      onComplete(score, report);
    }
  };

  // Progress Bar percentage
  const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  const activeQ = questions[currentQuestionIndex];

  return (
    <div className="flex-1 flex flex-col min-h-[100svh] lg:h-screen bg-slate-50 relative overflow-hidden">
      
      {/* Toast banner */}
      {toastMessage && (
        <div className="absolute top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-[#003178] text-white px-4 sm:px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-bold border border-[#cfe6f2] animate-bounce">
          <Sparkle className="h-4 w-4 text-emerald-300 fill-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <header className="px-4 sm:px-6 lg:px-8 py-4 bg-white border-b border-[#cfe6f2] flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between shrink-0">
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 text-[#434652] hover:text-[#003178] hover:bg-[#e6f6ff] rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#003178] flex items-center gap-2">
              <Headphones className="h-5 w-5 animate-bounce" />
              听力训练 - 长对话
            </h1>
            <p className="text-[11px] text-gray-400">
              CET-4 原创模拟长对话 · {LONG_CONVERSATION_PRACTICE_QUESTIONS.length} 题结构化精听
            </p>
          </div>
        </div>

        {/* Tab switcher shown in screenshot */}
        <div className="w-full lg:w-auto overflow-x-auto bg-neutral-100 p-1 rounded-xl flex items-center space-x-1 border border-neutral-200 text-xs">
          <button
            onClick={() => setActiveTab('ref')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'ref' ? 'bg-[#003178] text-white shadow-xs' : 'text-[#434652] hover:bg-white/50'
            }`}
          >
            原速训练
          </button>
          <button
            onClick={() => setActiveTab('focus')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'focus' ? 'bg-[#003178] text-white shadow-xs' : 'text-[#434652] hover:bg-white/50'
            }`}
          >
            精听模式
          </button>
          <button
            onClick={() => setActiveTab('shadow')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
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
                <div className="flex items-center space-x-1.5 bg-white border border-gray-200 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#434652] shadow-2xs">
                  <span>速度:</span>
                  <select
                    value={audioSpeed}
                    onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                    className="bg-transparent border-none focus:outline-none text-[#003178] font-bold"
                  >
                    <option value="0.8">0.8x</option>
                    <option value="1.0">1.0x</option>
                    <option value="1.2">1.2x</option>
                    <option value="1.5">1.5x</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Backward 10s */}
                  <button
                    onClick={() => skipAudio(-10)}
                    className="p-2 hover:bg-white rounded-full text-gray-500 hover:text-[#003178] transition border border-transparent hover:border-gray-200 shadow-2xs cursor-pointer"
                    title="后退10秒"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>

                  {/* Play Main Circle Toggle */}
                  <button
                    onClick={toggleAudioPlayback}
                    className="p-4 bg-[#003178] hover:bg-[#003178]/90 text-white rounded-full shadow-md flex items-center justify-center hover:scale-105 transition-all cursor-pointer"
                  >
                    {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white translate-x-0.5" />}
                  </button>

                  {/* Forward 10s */}
                  <button
                    onClick={() => skipAudio(10)}
                    className="p-2 hover:bg-white rounded-full text-gray-500 hover:text-[#003178] transition border border-transparent hover:border-gray-200 shadow-2xs cursor-pointer"
                    title="前进10秒"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Simulated Volume */}
                <div className="flex items-center space-x-1 text-xs font-semibold text-gray-400">
                  <span>浏览器语音播放</span>
                </div>
              </div>

            </div>

          </div>

          {/* Transcript Accordion */}
          <div className="border border-[#cfe6f2] rounded-3xl overflow-hidden shadow-2xs">
            <button
              onClick={() => setIsTranscriptionExpanded(!isTranscriptionExpanded)}
              className="w-full px-6 py-4 bg-slate-50 flex items-center justify-between text-[#003178] font-bold text-sm cursor-pointer border-b border-[#cfe6f2]"
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

        </div>

        {/* Right column: Question card & AI diagnosis details */}
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
              Question {activeQ.id}
            </div>
            
            <h3 className="font-extrabold text-base text-[#071e27] mb-5 leading-tight">
              {activeQ.question}
            </h3>

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
                      {optText}
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
                      disabled={activeQ.isSubmitted}
                      className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all ${
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
                  disabled={!activeQ.selectedAnswer || !activeQ.confidence}
                  className={`w-full justify-center sm:w-auto px-6 py-3 sm:py-2.5 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                    activeQ.selectedAnswer && activeQ.confidence
                      ? 'bg-[#1b6d24] hover:bg-emerald-700 hover:shadow cursor-pointer'
                      : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  <span>提交答案</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* AI Audio Diagnostics & Analyze feedback after submission */}
          {activeQ.isSubmitted && (
            <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-3xl p-4 sm:p-6 space-y-5 animate-fade-in">
              <div className="flex items-center space-x-2 pb-3 border-b border-[#bae6fd]">
                <div className="p-1.5 bg-[#e0f2fe] text-[#0284c7] rounded-lg">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-extrabold text-[#0369a1] uppercase tracking-wider">
                  听力错因分析与解题建议
                </h4>
              </div>

              <p className="text-xs text-[#1e293b] leading-relaxed">
                {activeQ.explanation}
              </p>

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
                  className="px-4 py-2 bg-white text-[#003178] border border-gray-200 hover:border-[#dbf1fe] text-[11px] font-bold rounded-xl hover:bg-[#dbf1fe] transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>加入复习队列</span>
                </button>

                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-2 bg-[#003178] hover:bg-sky-900 border text-white text-[11px] font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <span>{currentQuestionIndex < questions.length - 1 ? '下一题' : '完成本次听力练习'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>

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
