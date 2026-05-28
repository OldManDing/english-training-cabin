import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Headphones, Volume2, XCircle } from 'lucide-react';
import { VocabularyPracticeItem, VOCABULARY_SESSION_SIZE } from '../data';
import { PracticeCompletionReport } from '../types';
import { buildChoicePracticeReport } from '../domain/practice/reports';

interface VocabularyTrainingProps {
  items: VocabularyPracticeItem[];
  onBack: () => void;
  onComplete: (score: number, report: PracticeCompletionReport) => void;
}

type Choice = 'A' | 'B' | 'C' | 'D';
type Confidence = 'sure' | 'not_sure' | 'guess';

export default function VocabularyTraining({ items, onBack, onComplete }: VocabularyTrainingProps) {
  const [packIndex, setPackIndex] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<Choice | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [answers, setAnswers] = useState<({ selected: Choice; correct: boolean; confidence: Confidence })[]>([]);
  const [startedAt] = useState(() => new Date().toISOString());

  const packCount = Math.max(1, Math.ceil(items.length / VOCABULARY_SESSION_SIZE));
  const sessionItems = items.slice(
    packIndex * VOCABULARY_SESSION_SIZE,
    (packIndex + 1) * VOCABULARY_SESSION_SIZE,
  );
  const currentItem = sessionItems[currentIdx] ?? sessionItems[0];
  const progress = Math.round(((currentIdx + (isSubmitted ? 1 : 0)) / sessionItems.length) * 100);

  const switchPack = (nextPackIndex: number) => {
    setPackIndex(nextPackIndex);
    setCurrentIdx(0);
    setAnswers([]);
    setSelectedOpt(null);
    setConfidence(null);
    setIsSubmitted(false);
  };

  useEffect(() => {
    setSelectedOpt(null);
    setConfidence(null);
    setIsSubmitted(false);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, [currentIdx]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speak = (text: string, rate = 0.82) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = () => {
    if (!selectedOpt || !confidence) return;
    const correct = selectedOpt === currentItem.correctAnswer;
    const nextAnswers = [...answers];
    nextAnswers[currentIdx] = { selected: selectedOpt, correct, confidence };
    setAnswers(nextAnswers);
    setIsSubmitted(true);
  };

  const finish = (finalAnswers: typeof answers) => {
    const correctCount = finalAnswers.filter((answer) => answer?.correct).length;
    const score = Math.round((correctCount / Math.max(1, sessionItems.length)) * 100);
    const report = buildChoicePracticeReport({
      examId: 'cet4',
      moduleId: 'vocabulary',
      questionTypeId: 'cet4-core-vocabulary',
      modeId: 'vocabulary-audio-choice',
      skillArea: 'vocabulary',
      plannedMinutes: Math.max(12, Math.ceil(sessionItems.length * 0.75)),
      startedAt,
      questions: sessionItems.map((item) => ({
        id: item.id,
        question: `${item.word} ${item.phonetic}: ${item.example}`,
        correctAnswer: item.correctAnswer,
        type: '词义辨析与听音识别',
        trapType: '关键语块漏听',
        moduleId: 'vocabulary',
        questionTypeId: 'cet4-core-vocabulary',
        correctSentence: `${item.collocation}. ${item.example}`,
        explanation: item.explanation,
      })),
      answers: finalAnswers.map((answer) => ({
        selected: answer?.selected,
        correct: Boolean(answer?.correct),
        confidence: answer?.confidence,
      })),
    });
    onComplete(score, report);
  };

  const handleNext = () => {
    const finalAnswers = answers;
    if (currentIdx < sessionItems.length - 1) {
      setCurrentIdx(currentIdx + 1);
      return;
    }
    finish(finalAnswers);
  };

  return (
    <main className="flex-1 min-h-[100svh] overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_42%,#fff7ed_100%)] p-4 sm:p-6 lg:h-screen lg:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rounded-[2rem] border border-sky-100 bg-white/90 p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#003178] transition hover:border-[#003178] sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              返回专项练习
            </button>
            <div className="text-sm font-black text-slate-500">
              CET-4 核心词汇听音练习 · 本组 {currentIdx + 1}/{sessionItems.length} · 词库 {items.length}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              词库分组 {packIndex + 1}/{packCount}
            </span>
            <button
              type="button"
              disabled={packIndex === 0}
              onClick={() => switchPack(packIndex - 1)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[#003178] disabled:cursor-not-allowed disabled:text-slate-300"
            >
              上一组
            </button>
            <button
              type="button"
              disabled={packIndex >= packCount - 1}
              onClick={() => switchPack(packIndex + 1)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[#003178] disabled:cursor-not-allowed disabled:text-slate-300"
            >
              下一组
            </button>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#003178] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-md sm:p-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#003178]/10 px-3 py-1 text-xs font-black text-[#003178]">
              <Headphones className="h-4 w-4" />
              听音 + 词义 + 语块
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#071e27] sm:text-5xl">{currentItem.word}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500">
              <span>{currentItem.phonetic}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{currentItem.partOfSpeech}</span>
              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">{currentItem.meaning}</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => speak(currentItem.word, 0.78)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#003178] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0d47a1]"
              >
                <Volume2 className="h-4 w-4" />
                {isSpeaking ? '正在播报...' : '播放单词'}
              </button>
              <button
                type="button"
                onClick={() => speak(currentItem.example, 0.86)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#003178]/20 bg-white px-4 text-sm font-black text-[#003178] transition hover:border-[#003178]"
              >
                <Volume2 className="h-4 w-4" />
                播放例句
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Collocation</div>
              <p className="mt-2 text-sm font-black text-[#003178]">{currentItem.collocation}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{currentItem.example}</p>
            </div>
          </aside>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-md sm:p-7">
            <h2 className="text-xl font-black text-[#003178]">选择最准确的英文释义</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              先听单词和例句，再选择释义。系统会把低信心或错误项加入复习队列。
            </p>

            <div className="mt-6 grid gap-3">
              {(Object.keys(currentItem.options) as Choice[]).map((optionKey) => {
                const isSelected = selectedOpt === optionKey;
                const isCorrect = optionKey === currentItem.correctAnswer;
                const revealCorrect = isSubmitted && isCorrect;
                const revealWrong = isSubmitted && isSelected && !isCorrect;
                return (
                  <button
                    key={optionKey}
                    type="button"
                    disabled={isSubmitted}
                    onClick={() => setSelectedOpt(optionKey)}
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
                    {optionKey}. {currentItem.options[optionKey]}
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
                    onClick={() => setConfidence(value as Confidence)}
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
              <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-[#003178]">
                  {selectedOpt === currentItem.correctAnswer ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-rose-600" />
                  )}
                  正确答案：{currentItem.correctAnswer}
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{currentItem.explanation}</p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              {!isSubmitted ? (
                <button
                  type="button"
                  disabled={!selectedOpt || !confidence}
                  onClick={handleSubmit}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#1b6d24] px-6 text-sm font-black text-white shadow-sm transition enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  提交词汇答案
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#003178] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#0d47a1]"
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
