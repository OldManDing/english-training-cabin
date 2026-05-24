import React, { useState, useEffect, useRef } from 'react';
import { Headphones, ArrowLeft, Play, Pause, ChevronDown, ChevronUp, CheckCircle, XCircle, Sparkles, Volume2, RotateCcw, Award, ArrowRight, Sparkle, RefreshCw } from 'lucide-react';
import { PracticeCompletionReport } from '../types';
import { buildChoicePracticeReport } from '../domain/practice/reports';

interface ListeningTrainingProps {
  onBack: () => void;
  onComplete: (score: number, report: PracticeCompletionReport) => void;
  onAddToReview?: (item: { title: string; category: "词汇" | "句式" | "错题"; detail: string }) => void;
}

interface QuestionItem {
  id: number;
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

export default function ListeningTraining({ onBack, onComplete, onAddToReview }: ListeningTrainingProps) {
  const [startedAt] = useState(() => new Date().toISOString());

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
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: 1,
      question: "What is the woman's main reason for visiting Japan?",
      options: {
        A: "To attend a business conference.",
        B: "To practice the language she has been studying.",
        C: "To visit family members living there.",
        D: "To explore historical tourist sites."
      },
      correctAnswer: 'B',
      explanation: "录音开头女士提到：'The primary goal of my trip to Tokyo next month is actually to practice conversational Japanese, which I've been learning for three years.' 对应选项 B 处表示。选项 A 和 C 虽被提起但非主要目的。",
      trapType: "关键词漏听",
      transcriptionPoint: "00:45 处原句"
    },
    {
      id: 2,
      question: "What did the woman's research team notice about the use of technology in primary schools?",
      options: {
        A: "It was universally embraced by all teachers.",
        B: "It caused significant disruption in classes.",
        C: "There was a huge variation in its application.",
        D: "It was mainly used for administrative tasks."
      },
      correctAnswer: 'C',
      explanation: "录音 01:22 处明确指出：'One of the main things we noticed was that there was a huge variation (极大差异) in its application from class to class.' 你如果选择了 B，表示受到了女士后面提到的一小部分老师的担忧 'disruptive to student attention' 的干扰，犯了‘转折或局部信息漏听’的陷阱。",
      trapType: "转折信息漏听",
      transcriptionPoint: "01:22 处原句"
    },
    {
      id: 3,
      question: "What is a main concern raised by the teachers in the survey?",
      options: {
        A: "The lack of official training resources.",
        B: "Exorbitant cost of upgrading smart hardware.",
        C: "Over-reliance leading to a decline in handwriting.",
        D: "Reduced student focus and electronic distractions."
      },
      correctAnswer: 'D',
      explanation: "女士指出：'A significant percentage of teachers voiced extreme concerns about student attention spam and constant notifications from tablet screens.' 对应选项 D 核心意思。",
      trapType: "选项判断失误",
      transcriptionPoint: "01:54 处原句"
    }
  ]);

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
      triggerToast("该听力干扰项已被成功添加至后台复习卡片中！");
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
    <div className="flex-1 flex flex-col h-screen bg-slate-50 relative overflow-hidden">
      
      {/* Toast banner */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#003178] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-bold border border-[#cfe6f2] animate-bounce">
          <Sparkle className="h-4 w-4 text-emerald-300 fill-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <header className="px-8 py-4 bg-white border-b border-[#cfe6f2] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-[#434652] hover:text-[#003178] hover:bg-[#e6f6ff] rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#003178] flex items-center gap-2">
              <Headphones className="h-5 w-5 animate-bounce" />
              听力训练 - Section A
            </h1>
            <p className="text-[11px] text-gray-400">
              科技发展对教育的影响 (原创模拟长对话)
            </p>
          </div>
        </div>

        {/* Tab switcher shown in screenshot */}
        <div className="bg-neutral-100 p-1 rounded-xl flex items-center space-x-1 border border-neutral-200 text-xs">
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
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left column: Vinyl player & transcript */}
        <div className="w-1/2 p-8 overflow-y-auto flex flex-col space-y-6 border-r border-[#cfe6f2] bg-white">
          
          {/* Audio vinyl controller */}
          <div className="bg-[#f3faff] border border-[#cfe6f2] rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-xs">
            
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
              <div className="flex justify-between items-center px-4 pt-2">
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
                    onClick={() => setIsPlaying(!isPlaying)}
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
                  <span>音频模拟</span>
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
                <div>
                  <span className="font-extrabold text-[#003178] block mb-1">M: Male interviewer</span>
                  <p className="bg-[#f8fafc] p-3 rounded-xl border border-gray-100">
                    Now, you've been working on this research project looking at how digital technology is used in primary schools. Can you tell us a bit about what you found?
                  </p>
                </div>

                <div>
                  <span className="font-extrabold text-[#1b6d24] block mb-1">W: Female respondent</span>
                  <div className="bg-[#f8fafc] p-3 rounded-xl border border-gray-100 space-y-2">
                    <p>
                      Yes, certainly. Well, we looked at a number of different aspects. We observed lessons and we interviewed teachers and pupils.
                    </p>
                    <p className="bg-[#dbf1fe]/50 border-l-2 border-[#1e3c72] pl-2 py-1 font-semibold text-[#071e27]">
                      {/* Interactive block representing timestamp */}
                      <span className="text-[10px] text-[#003178] font-mono mr-1.5">[01:22]</span>
                      one of the main things we noticed was that there was a huge variation in how teachers applied standard software from class to class.
                    </p>
                    <p className="opacity-75">
                      Some used smart tablets to enable individual speed runs, while others worried it was purely disruptive to focused student attention.
                    </p>
                  </div>
                </div>

                <div>
                  <span className="font-extrabold text-[#003178] block mb-1">M: Male interviewer</span>
                  <p className="bg-[#f8fafc] p-3 rounded-xl border border-gray-100">
                    Interesting. Did teachers suggest any explicit policy regulations to assist their daily load?
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right column: Question card & AI diagnosis details */}
        <div className="w-1/2 p-8 overflow-y-auto flex flex-col space-y-6">
          
          {/* Progress Section */}
          <div className="flex justify-between items-center text-xs">
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
          <div className="bg-white border-2 border-[#cfe6f2] hover:border-[#003178] transition-colors rounded-3xl p-6 shadow-sm">
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
                    <span className="text-xs leading-relaxed">{optText}</span>

                    {/* Show badge comments exactly as screenshot */}
                    {isSubmitted && isCorrect && (
                      <span className="absolute bottom-1 right-3 text-[9px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.2 rounded">
                        正确答案 - 对应录音 {activeQ.transcriptionPoint}
                      </span>
                    )}
                    {isSubmitted && isSelected && !isCorrect && (
                      <span className="absolute bottom-1 right-3 text-[9px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.2 rounded">
                        错误 - {activeQ.trapType}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Confidence Levels selection */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-[#434652] font-semibold flex items-center gap-1">
                把握度 (Confidence Level)
              </span>

              <div className="flex bg-slate-100 p-1 border rounded-xl gap-1">
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
                  className="px-6 py-2.5 bg-[#1b6d24] hover:bg-emerald-700 hover:shadow text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>提交答案</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* AI Audio Diagnostics & Analyze feedback after submission */}
          {activeQ.isSubmitted && (
            <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-3xl p-6 space-y-5 animate-fade-in">
              <div className="flex items-center space-x-2 pb-3 border-b border-[#bae6fd]">
                <div className="p-1.5 bg-[#e0f2fe] text-[#0284c7] rounded-lg">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-extrabold text-[#0369a1] uppercase tracking-wider">
                  AI 听力分析与解题建议
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
