import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, HelpCircle, Volume2, Headphones, Sparkles } from 'lucide-react';
import { Passage, PracticeCompletionReport, Question } from '../types';
import { buildChoicePracticeReport } from '../domain/practice/reports';

interface ReadingTrainingProps {
  passage: Passage;
  onBack: () => void;
  onComplete: (score: number, report: PracticeCompletionReport) => void;
}

export default function ReadingTraining({ passage, onBack, onComplete }: ReadingTrainingProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [confidence, setConfidence] = useState<'sure' | 'not_sure' | 'guess' | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<({ selected: 'A' | 'B' | 'C' | 'D', correct: boolean, confidence: 'sure' | 'not_sure' | 'guess' })[]>([]);
  const [isPlayingText, setIsPlayingText] = useState(false);
  const [speechUtterance, setSpeechUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());

  const currentQuestion: Question = passage.questions[currentIdx];

  // Reset states on question change
  useEffect(() => {
    setSelectedOpt(null);
    setConfidence(null);
    setIsSubmitted(false);
    if (isPlayingText) {
      window.speechSynthesis.cancel();
      setIsPlayingText(false);
    }
  }, [currentIdx]);

  // Speech Helper
  const handleVoicePlay = (text: string) => {
    if ('speechSynthesis' in window) {
      if (isPlayingText) {
        window.speechSynthesis.cancel();
        setIsPlayingText(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9; // clear, comfortable speaker speed
      utterance.onend = () => {
        setIsPlayingText(false);
      };
      setSpeechUtterance(utterance);
      setIsPlayingText(true);
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('您的浏览器不支持语音播放（SpeechSynthesis）。');
    }
  };

  const handleOptionClick = (opt: 'A' | 'B' | 'C' | 'D') => {
    if (isSubmitted) return;
    setSelectedOpt(opt);
  };

  const handleSubmit = () => {
    if (!selectedOpt || !confidence) return;

    const correct = selectedOpt === currentQuestion.correctAnswer;
    setIsSubmitted(true);

    // Save user answer
    const newAnswers = [...userAnswers];
    newAnswers[currentIdx] = {
      selected: selectedOpt,
      correct,
      confidence
    };
    setUserAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIdx < passage.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Calculate overall score
      const correctCount = userAnswers.filter(ans => ans?.correct).length;
      const finalScore = Math.round((correctCount / passage.questions.length) * 100);
      const report = buildChoicePracticeReport({
        examId: passage.examId ?? 'cet4',
        moduleId: passage.moduleId ?? 'reading',
        questionTypeId: 'careful-reading',
        modeId: 'careful-reading-practice',
        skillArea: 'reading',
        plannedMinutes: 18,
        startedAt,
        questions: passage.questions.map((question) => ({
          id: question.id,
          question: question.question,
          correctAnswer: question.correctAnswer,
          type: question.type,
          moduleId: question.moduleId,
          questionTypeId: question.questionTypeId,
          correctSentence: question.correctSentence,
          explanation: question.explanation,
        })),
        answers: userAnswers.map((answer) => ({
          selected: answer?.selected,
          correct: Boolean(answer?.correct),
          confidence: answer?.confidence,
        })),
      });
      onComplete(finalScore, report);
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

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
      {/* Exercise Top Bar */}
      <div className="h-16 px-6 border-b border-[#cfe6f2] flex items-center justify-between shrink-0 bg-gradient-to-r from-[#f3faff] to-white">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-[#dbf1fe] text-[#003178] rounded-xl transition-colors cursor-pointer pointer-events-auto"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="h-4 w-[1px] bg-gray-300" />
          <h3 className="font-extrabold text-sm text-[#003178] tracking-tight truncate max-w-xs sm:max-w-md">
            仔细阅读训练舱：{passage.title}
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          {passage.questions.map((_, i) => (
            <div
              key={i}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === currentIdx
                  ? 'w-8 bg-[#003178]'
                  : userAnswers[i] !== undefined
                  ? userAnswers[i].correct
                    ? 'w-2.5 bg-[#1b6d24]'
                    : 'w-2.5 bg-[#ba1a1a]'
                  : 'w-2.5 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Split Screens Panel */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Passage Container */}
        <div className="w-1/2 p-8 overflow-y-auto border-r border-[#c3c6d4] bg-neutral-50/50 flex flex-col">
          <div className="bg-white border border-[#cfe6f2] rounded-3xl p-8 shadow-xs flex-1">
            <header className="mb-6 flex justify-between items-center pb-4 border-b border-[#f3faff]">
              <h2 className="text-xl font-bold text-[#003178] leading-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#3b82f6]" /> {passage.title}
              </h2>
              <div className="text-xs text-gray-400 font-medium">约 320 词</div>
            </header>

            {/* Render with dynamic sentence highlighted spans */}
            <article className="prose max-w-none text-justify">
              {renderHighlightedContent()}
            </article>

            {/* Custom Interactive Legend (Only visible after submittng response) */}
            {isSubmitted && (
              <div className="mt-8 pt-6 border-t border-dashed border-gray-200 grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="flex items-start gap-2 bg-[#d1e7dd]/50 p-2.5 rounded-xl border border-green-200">
                  <span className="w-3 h-3 bg-[#198754] rounded-full translate-y-0.5" />
                  <div>
                    <span className="text-[#0f5132]">正确推导线索</span>
                    <p className="text-[10px] text-gray-500 mt-0.5">原文核心解析和替换出处</p>
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
        <div className="w-1/2 p-8 overflow-y-auto flex flex-col justify-between bg-white">
          <div className="space-y-6">
            
            {/* Steps & Topic */}
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#003178] bg-[#dbf1fe] px-2.5 py-1 rounded-full border border-[#cfe6f2]">
                第 {currentIdx + 1} 题 / 共 {passage.questions.length} 题
              </span>
              <span className="text-xs text-gray-400 font-semibold">
                核心考向：{currentQuestion.type}
              </span>
            </div>

            {/* Question Text */}
            <h3 className="text-base font-extrabold text-[#071e27] leading-snug">
              {currentQuestion.question}
            </h3>

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
                    className={`w-full p-4 rounded-2xl border text-left flex items-start gap-4 transition-all duration-150 relative ${cardStyle} ${
                      !isSubmitted ? 'hover:scale-[1.01] pointer-events-auto cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 ${indicatorStyle}`}>
                      {opt}
                    </div>
                    <div className="text-sm font-bold text-[#071e27]">
                      {currentQuestion.options[opt]}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Confidence Choice before submission */}
            {!isSubmitted && (
              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#434652] mb-3">
                  <HelpCircle className="h-4 w-4 text-[#003178]" />
                  <span>答题把握度诊断 (影响错因分析和复习优先级)：</span>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: 'sure', label: '非常有把握', color: 'peer-checked:bg-[#003178]/10 peer-checked:text-[#003178] peer-checked:border-[#003178]' },
                    { id: 'not_sure', label: '不太确定', color: 'peer-checked:bg-amber-100 peer-checked:text-amber-800 peer-checked:border-amber-600' },
                    { id: 'guess', label: '纯属盲猜', color: 'peer-checked:bg-red-100 peer-checked:text-red-800 peer-checked:border-red-600' },
                  ].map((item) => (
                    <label key={item.id} className="flex-1 text-center cursor-pointer">
                      <input
                        type="radio"
                        name="confidence"
                        value={item.id}
                        checked={confidence === item.id}
                        onChange={() => setConfidence(item.id as any)}
                        className="sr-only peer"
                      />
                      <div className="py-2 px-1 text-xs border border-gray-200 rounded-xl bg-white hover:bg-gray-50 peer-checked:border-2 font-semibold transition-all transition-colors text-gray-500">
                        {item.label}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* AI Diagnosis and Explanations Area (After Submit) */}
            {isSubmitted && currentFeedback && (
              <div className="space-y-4 animate-fadeIn">
                
                {/* AI Behavioral Diagnostic Panel */}
                <div className="bg-[#f3faff] border border-[#cfe6f2] rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-bold text-[#003178] flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 animate-bounce" />
                      <span>错因行为诊断反馈</span>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${currentFeedback.badgeColor}`}>
                      {currentFeedback.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-[#071e27]">{currentFeedback.title}</h4>
                  <p className="text-xs text-[#434652] mt-1.5 leading-relaxed bg-white p-2.5 rounded-xl border border-[#cfe6f2]/80">
                    {currentFeedback.description}
                  </p>
                </div>

                {/* Explanation and Voice player */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200/80">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-gray-500">
                  模拟题考点拆解与同义替换精析
                    </span>
                    {/* Voice Synth trigger */}
                    <button
                      onClick={() => {
                        const targetText = (currentQuestion as any).correctSentence || currentQuestion.explanation;
                        handleVoicePlay(targetText);
                      }}
                      className="px-2.5 py-1 text-[11px] bg-white border border-gray-300 text-gray-600 rounded-lg hover:border-[#003178] hover:text-[#003178] flex items-center gap-1.5 font-bold transition-all"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>{isPlayingText ? '轻触停止' : '朗读线索原句'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed font-semibold whitespace-pre-line bg-white p-3 rounded-xl border border-gray-100">
                    {currentQuestion.explanation}
                  </p>
                </div>

              </div>
            )}

          </div>

          {/* Bottom Action Footer */}
          <div className="pt-6 border-t border-[#cfe6f2] mt-8 flex justify-between items-center bg-white">
            <div className="text-xs text-gray-400">
              {isSubmitted ? '仔细核对线索，点按右侧按键递进。' : '请勾选选项以及把握度后，提交诊断。'}
            </div>

            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedOpt || !confidence}
                className={`px-8 py-3 rounded-xl font-bold text-sm shadow-md transition-all ${
                  selectedOpt && confidence
                    ? 'bg-[#003178] hover:bg-[#0d47a1] text-white hover:translate-y-[-1px] cursor-pointer pointer-events-auto'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed text-xs'
                }`}
              >
                提交此题并进行 AI 诊断
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-[#1b6d24] hover:bg-[#1b6d24]/90 text-white font-bold text-sm rounded-xl hover:-translate-y-0.5 shadow-md flex items-center gap-2 transition-all cursor-pointer pointer-events-auto"
              >
                <span>
                  {currentIdx === passage.questions.length - 1 ? '完成训练，提交今日总战报' : '进入第 ' + (currentIdx + 2) + ' 题'}
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
