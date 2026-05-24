import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, HelpCircle, GraduationCap, CheckCircle, ChevronRight, Settings, Target, AlertTriangle, Play, Sparkles, Clock, RefreshCw } from 'lucide-react';
import { SkillProfile, StudyGoal } from '../types';

interface OnboardingDiagnosticProps {
  onDismiss: () => void;
  onSetScoreLimit?: (score: number) => void;
  onCompleteDiagnostic?: (result: {
    targetScore: number;
    examDate: string;
    dailyMinutes: number;
    prioritySkills: StudyGoal['prioritySkills'];
    skillProfiles: SkillProfile[];
  }) => Promise<void> | void;
}

function levelToScore(level: 'A' | 'B' | 'C'): number {
  if (level === 'A') return 55;
  if (level === 'B') return 72;
  return 86;
}

function getDaysRemaining(date: string): number {
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

export default function OnboardingDiagnostic({ onDismiss, onSetScoreLimit, onCompleteDiagnostic }: OnboardingDiagnosticProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [targetScore, setTargetScore] = useState<number>(550);
  const [countdownDate, setCountdownDate] = useState<string>("2026-06-15");
  const [dailyMinutes, setDailyMinutes] = useState<number>(45);
  const [testReading, setTestReading] = useState<'A' | 'B' | 'C'>('B'); // B = 中级
  const [testListening, setTestListening] = useState<'A' | 'B' | 'C'>('B');
  const [testTranslation, setTestTranslation] = useState<'A' | 'B' | 'C'>('A'); // A = 入门
  const [testWriting, setTestWriting] = useState<'A' | 'B' | 'C'>('B');
  const [testOral, setTestOral] = useState<'A' | 'B' | 'C'>('A');
  const readingScore = levelToScore(testReading);
  const listeningScore = levelToScore(testListening);
  const translationScore = levelToScore(testTranslation);
  const writingScore = levelToScore(testWriting);
  const speakingScore = levelToScore(testOral);
  const daysRemaining = getDaysRemaining(countdownDate);
  const skillLabelMap: Record<SkillProfile['skillArea'], string> = {
    reading: '阅读',
    listening: '听力',
    translation: '翻译',
    writing: '写作',
    speaking: '口语',
    vocabulary: '词汇',
    grammar: '语法',
  };
  const prioritizedSkillEntries = [
    { skillArea: 'reading' as const, score: readingScore },
    { skillArea: 'listening' as const, score: listeningScore },
    { skillArea: 'translation' as const, score: translationScore },
    { skillArea: 'writing' as const, score: writingScore },
    { skillArea: 'speaking' as const, score: speakingScore },
  ].sort((left, right) => left.score - right.score);
  const prioritySkills = prioritizedSkillEntries.map((item) => item.skillArea);
  const topPriorityText = prioritizedSkillEntries
    .slice(0, 2)
    .map((item) => skillLabelMap[item.skillArea])
    .join(' & ');
  const skillCopy: Record<SkillProfile['skillArea'], { focus: string; strong: string; weak: string }> = {
    reading: {
      focus: '阅读定位与同义替换',
      strong: '自评阅读基线较高，可先用限时仔细阅读巩固定位速度。',
      weak: '阅读基线偏低，今日任务会优先安排题干定位和选项排除训练。',
    },
    listening: {
      focus: '听力长对话与转折信息',
      strong: '自评听力基线较高，可加入精听和影子跟读保持辨音稳定度。',
      weak: '听力基线偏低，建议从长对话关键词、数字时间和转折信号开始。',
    },
    translation: {
      focus: '翻译句法转换',
      strong: '翻译基线较高，可继续积累搭配和复杂句表达。',
      weak: '翻译基线偏低，系统会优先安排中文干扰、搭配和时态语态修正。',
    },
    writing: {
      focus: '写作结构与论证',
      strong: '写作基线较高，可用 AI 评阅继续打磨结构和表达多样性。',
      weak: '写作基线偏低，先练主题句、例证展开和结尾收束。',
    },
    speaking: {
      focus: '口语连贯与自然表达',
      strong: '口语基线较高，适合每天用短回合保持输出和重说节奏。',
      weak: '口语基线偏低，建议从图片描述、连接词和二次重说开始。',
    },
    vocabulary: {
      focus: '词汇识别',
      strong: '词汇基础较稳定。',
      weak: '词汇证据不足，需要在阅读和听力中继续积累。',
    },
    grammar: {
      focus: '语法结构',
      strong: '语法基础较稳定。',
      weak: '语法证据不足，需要在写作和翻译中继续积累。',
    },
  };
  const strongestSkillEntries = [...prioritizedSkillEntries].sort((left, right) => right.score - left.score).slice(0, 2);
  const weakestSkillEntries = prioritizedSkillEntries.slice(0, 2);
  const ringOffset = 263.8 - Math.min(1, dailyMinutes / 90) * 263.8;
  const diagnosticMinutes = Math.max(8, Math.round(dailyMinutes * 0.25));
  const practiceMinutes = Math.max(12, Math.round(dailyMinutes * 0.45));
  const reviewMinutes = Math.max(6, dailyMinutes - diagnosticMinutes - practiceMinutes);

  // Loading animation simulation for Step 3
  const [simulatedLoadMsg, setSimulatedLoadMsg] = useState("正在抓取词汇储备模型...");
  
  useEffect(() => {
    if (step === 3) {
      const timers = [
        setTimeout(() => setSimulatedLoadMsg("正在解析视幅及语法分析时间..."), 1000),
        setTimeout(() => setSimulatedLoadMsg("正在测算听觉连读、弱读偏差度数..."), 2000),
        setTimeout(() => setSimulatedLoadMsg("正在建立您的自适应能力雷达图..."), 3000),
        setTimeout(() => setStep(4), 4000)
      ];
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [step]);

  // Click handler to go next
  const triggerStartDiagnostic = () => {
    setStep(2);
  };

  const handleConfirmPlan = () => {
    setStep(3);
    const now = new Date().toISOString();
    const skillProfiles: SkillProfile[] = [
      {
        id: 'cet4-reading-diagnostic',
        skillArea: 'reading',
        subSkillId: 'diagnostic-reading',
        score: levelToScore(testReading),
        confidence: 3,
        evidenceCount: 1,
        lastUpdatedAt: now,
      },
      {
        id: 'cet4-listening-diagnostic',
        skillArea: 'listening',
        subSkillId: 'diagnostic-listening',
        score: levelToScore(testListening),
        confidence: 3,
        evidenceCount: 1,
        lastUpdatedAt: now,
      },
      {
        id: 'cet4-translation-diagnostic',
        skillArea: 'translation',
        subSkillId: 'diagnostic-translation',
        score: levelToScore(testTranslation),
        confidence: 3,
        evidenceCount: 1,
        lastUpdatedAt: now,
      },
      {
        id: 'cet4-writing-diagnostic',
        skillArea: 'writing',
        subSkillId: 'diagnostic-writing',
        score: levelToScore(testWriting),
        confidence: 3,
        evidenceCount: 1,
        lastUpdatedAt: now,
      },
      {
        id: 'cet4-speaking-diagnostic',
        skillArea: 'speaking',
        subSkillId: 'diagnostic-speaking',
        score: levelToScore(testOral),
        confidence: 3,
        evidenceCount: 1,
        lastUpdatedAt: now,
      },
    ];

    if (onCompleteDiagnostic) {
      Promise.resolve(onCompleteDiagnostic({
        targetScore,
        examDate: countdownDate,
        dailyMinutes,
        prioritySkills,
        skillProfiles,
      })).catch((error) => {
        console.error('Failed to save diagnostic result:', error);
      });
    } else if (onSetScoreLimit) {
      onSetScoreLimit(targetScore);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-b from-[#f3faff] to-white h-screen flex flex-col justify-between relative">
      
      {/* STEP 1: Entrance Diagnosis Banner (Image 3) */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto my-auto w-full bg-white border-2 border-[#cfe6f2] p-8 rounded-3xl shadow-md space-y-6">
          <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-gray-100">
            <div className="w-16 h-16 bg-[#003178]/10 text-[#003178] rounded-full flex items-center justify-center">
              <GraduationCap className="w-9 h-9 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-[#003178]">入门诊断</h2>
            <p className="text-xs text-gray-500 max-w-sm">
              建立您的初始能力模型，定制专属训练路径。系统会根据测试成绩精准划线。
            </p>
          </div>

          {/* Phase progress line */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px] font-bold text-[#434652]">
              <span>阶段 1 / 3: 能力扫描</span>
              <span>0% 已建立</span>
            </div>
            <div className="w-full bg-[#f3faff] h-2 rounded-full border border-[#cfe6f2] overflow-hidden">
              <div className="bg-[#003178] h-full w-[5%]" />
            </div>
          </div>

          {/* Grid layout cards representing categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-4 bg-slate-50 border border-slate-200 hover:border-[#cfe6f2] rounded-xl flex items-start gap-3">
              <span className="p-2 bg-[#dbf1fe] text-[#003178] font-bold rounded-lg text-xs shrink-0">📖</span>
              <div>
                <h4 className="text-xs font-bold text-[#071e27] mb-0.5">词汇量测试</h4>
                <p className="text-[10px] text-gray-400">预估您的核心词汇储备。</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 hover:border-[#cfe6f2] rounded-xl flex items-start gap-3">
              <span className="p-2 bg-[#dbf1fe] text-[#003178] font-bold rounded-lg text-xs shrink-0">📊</span>
              <div>
                <h4 className="text-xs font-bold text-[#071e27] mb-0.5">语法结构</h4>
                <p className="text-[10px] text-gray-400">检测对长难句及语法的理解。</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 hover:border-[#cfe6f2] rounded-xl flex items-start gap-3">
              <span className="p-2 bg-[#dbf1fe] text-[#003178] font-bold rounded-lg text-xs shrink-0">🎧</span>
              <div>
                <h4 className="text-xs font-bold text-[#071e27] mb-0.5">听力理解</h4>
                <p className="text-[10px] text-gray-400">评估对话及短文的听辨能力。</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 hover:border-[#cfe6f2] rounded-xl flex items-start gap-3">
              <span className="p-2 bg-[#dbf1fe] text-[#003178] font-bold rounded-lg text-xs shrink-0">⚡</span>
              <div>
                <h4 className="text-xs font-bold text-[#071e27] mb-0.5">阅读速览</h4>
                <p className="text-[10px] text-gray-400">测试信息提取和推理速度。</p>
              </div>
            </div>

          </div>

          <div className="pt-4 flex flex-col items-center space-y-2.5">
            <button
              onClick={triggerStartDiagnostic}
              className="w-full py-3.5 bg-[#1b6d24] hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all shadow pointer-events-auto cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>开始诊断</span>
            </button>
            <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 预计耗时: 15-20 分钟
            </span>
          </div>
        </div>
      )}

      {/* STEP 2: Goal and current base setting widget (Image 4) */}
      {step === 2 && (
        <div className="max-w-5xl mx-auto my-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Columns (Target setting + Base levels) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-8 bg-white border border-[#c3c6d4] rounded-3xl shadow-xs space-y-8">
              <div>
                <h3 className="text-xl font-bold text-[#003178] flex items-center gap-1.5 border-b pb-3 border-gray-100">
                  <Target className="h-5 w-5" />
                  学习目标设置
                </h3>
                <p className="text-xs text-gray-500 mt-1">设定明确的目标，系统将为您量身定制每日训练负荷与内容图谱。</p>
              </div>

              {/* Goal Range and Score Selector exactly shown in Image 4 */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-[#071e27] block">🎯 目标分数</label>
                <div className="flex items-center justify-between pb-3">
                  <span className="text-xs text-slate-400 font-semibold">CET-4 标准体系</span>
                  <div className="flex items-baseline space-x-1.5 text-[#003178]">
                    <span className="text-4xl font-extrabold tracking-tight bg-sky-50 px-4 py-1.5 rounded-2xl border border-sky-100">{targetScore}</span>
                    <span className="text-xs font-bold text-slate-400">分</span>
                  </div>
                </div>

                {/* Simulated Custom range slider */}
                <div className="space-y-2 relative">
                  <input
                    type="range"
                    min="425"
                    max="710"
                    step="5"
                    value={targetScore}
                    onChange={(e) => setTargetScore(parseInt(e.target.value))}
                    className="w-full h-2 bg-[#dbf1fe] rounded-full appearance-none cursor-pointer accent-[#003178]"
                  />
                  
                  {/* Milestones display */}
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 select-none">
                    <span>425 (过线)</span>
                    <span className={targetScore >= 500 ? 'text-[#003178]' : ''}>500</span>
                    <span className={targetScore >= 600 ? 'text-[#003178]' : ''}>600</span>
                    <span>710 (满分)</span>
                  </div>
                </div>
              </div>

              {/* Exam date and countdown Picker container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#071e27] block">📅 考试日期</label>
                  <input
                    type="date"
                    value={countdownDate}
                    onChange={(e) => setCountdownDate(e.target.value)}
                    className="w-full text-xs rounded-xl border border-gray-200 px-4 py-3 bg-[#f8fafc] text-slate-700 font-semibold focus:outline-none focus:border-[#003178]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#071e27] block">倒计时</label>
                  <div className="bg-[#dbf1fe] text-[#003178] border border-[#cfe6f2] px-4 py-2.5 rounded-xl font-black text-sm flex items-center justify-between">
                    <span className="text-xs font-semibold">剩余</span>
                    <span className="text-lg">{daysRemaining} <span className="text-xs font-bold">天</span></span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#071e27] block">⏱ 每日可投入时间</label>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 45, 60, 90].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setDailyMinutes(minutes)}
                      className={`rounded-xl border px-3 py-2 text-xs font-black transition-all ${
                        dailyMinutes === minutes
                          ? 'border-[#003178] bg-[#003178] text-white shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#003178] hover:text-[#003178]'
                      }`}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-semibold text-slate-400">
                  诊断会把此时间写入学习目标，今日任务会按该预算自动切分诊断、练习、复习和口语。
                </p>
              </div>

              {/* Baseline capabilities select toggles */}
              <div className="pt-4 space-y-4 border-t border-gray-100">
                <label className="text-xs font-bold text-[#071e27] block">📊 当前水平基线评估 (自诊)</label>

                <div className="space-y-3">
                  {/* Reading capability toggle */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold">阅读能力水平</span>
                    <div className="flex rounded-lg bg-neutral-100 p-0.5 border">
                      {(['A', 'B', 'C'] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setTestReading(v)}
                          className={`px-3 py-1 text-[10px] font-bold rounded ${
                            testReading === v ? 'bg-white text-[#003178] shadow-2xs' : 'text-gray-400'
                          }`}
                        >
                          {v === 'A' ? '入门' : v === 'B' ? '中级' : '高级'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Listening level toggle */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold">听力理解能力</span>
                    <div className="flex rounded-lg bg-neutral-100 p-0.5 border">
                      {(['A', 'B', 'C'] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setTestListening(v)}
                          className={`px-3 py-1 text-[10px] font-bold rounded ${
                            testListening === v ? 'bg-white text-[#003178] shadow-2xs' : 'text-gray-400'
                          }`}
                        >
                          {v === 'A' ? '入门' : v === 'B' ? '中级' : '高级'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Translation horizontal selection */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold">翻译与语法结构</span>
                    <div className="flex rounded-lg bg-neutral-100 p-0.5 border">
                      {(['A', 'B', 'C'] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setTestTranslation(v)}
                          className={`px-3 py-1 text-[10px] font-bold rounded ${
                            testTranslation === v ? 'bg-white text-[#003178] shadow-2xs' : 'text-gray-400'
                          }`}
                        >
                          {v === 'A' ? '入门' : v === 'B' ? '中级' : '高级'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Writing selector */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold">写作文字输出</span>
                    <div className="flex rounded-lg bg-neutral-100 p-0.5 border">
                      {(['A', 'B', 'C'] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setTestWriting(v)}
                          className={`px-3 py-1 text-[10px] font-bold rounded ${
                            testWriting === v ? 'bg-white text-[#003178] shadow-2xs' : 'text-gray-400'
                          }`}
                        >
                          {v === 'A' ? '入门' : v === 'B' ? '中级' : '高级'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Speaking base assessment */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold">口语表达连贯性</span>
                    <div className="flex rounded-lg bg-neutral-100 p-0.5 border">
                      {(['A', 'B', 'C'] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setTestOral(v)}
                          className={`px-3 py-1 text-[10px] font-bold rounded ${
                            testOral === v ? 'bg-white text-[#003178] shadow-2xs' : 'text-gray-400'
                          }`}
                        >
                          {v === 'A' ? '入门' : v === 'B' ? '中级' : '高级'}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Right column: Study Load details ring layout (exactly matching style) */}
          <div className="space-y-6">
            <div className="p-8 bg-gradient-to-b from-[#dbf1fe]/50 to-white border border-[#cfe6f2] rounded-3xl shadow-sm space-y-8 h-full flex flex-col justify-between">
              
              <div className="space-y-4">
                <h3 className="text-sm font-black text-[#071e27] pb-2 border-b border-gray-100 flex items-center gap-1">
                  📈 每日训练负荷
                </h3>
                <p className="text-[11px] text-gray-500">基于目标、剩余时间与自评基线的本地调度算法</p>

                {/* Circular ring chart */}
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* SVG Progress Circle Background and Filled */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="#f1f5f9"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="#0d47a1"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray="263.8"
                        strokeDashoffset={ringOffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    
                    {/* Ring Inner Text label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-4xl font-extrabold text-[#003178] tracking-tight">{dailyMinutes}</span>
                      <span className="text-[10px] text-gray-400 font-bold">分钟/天</span>
                    </div>
                  </div>
                </div>

                {/* Subtask breakdowns inside schedule container */}
                <div className="space-y-3.5 pt-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      入门诊断
                    </span>
                    <span className="text-[#003178] font-mono">{diagnosticMinutes} 分钟</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      弱项专项
                    </span>
                    <span className="text-[#003178] font-mono">{practiceMinutes} 分钟</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                      错题复习
                    </span>
                    <span className="text-[#003178] font-mono">{reviewMinutes} 分钟</span>
                  </div>
                </div>

              </div>

              {/* Confirm Generate study plan button */}
              <button
                onClick={handleConfirmPlan}
                className="w-full py-4.5 bg-[#003178] hover:bg-[#0d47a1] text-white font-extrabold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md pointer-events-auto cursor-pointer text-center"
              >
                <CheckCircle className="h-4 w-4" />
                <span>确认并生成计划</span>
              </button>

            </div>
          </div>

        </div>
      )}

      {/* STEP 3: Simulated scanner layout */}
      {step === 3 && (
        <div className="max-w-md mx-auto my-auto w-full bg-white border border-[#c3c6d4] p-8 rounded-3xl text-center space-y-6 flex flex-col items-center justify-center shadow-lg animate-pulse">
          <div className="w-16 h-16 rounded-full bg-[#dbf1fe] flex items-center justify-center text-[#003178]">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="font-extrabold text-[#003178] text-base">系统正在建模分析中...</h3>
            <p className="text-xs text-slate-400 font-mono font-medium">{simulatedLoadMsg}</p>
          </div>
        </div>
      )}

      {/* STEP 4: Diagnosis Complete Portrait Report (Image 6) */}
      {step === 4 && (
        <div className="max-w-4xl mx-auto my-auto w-full bg-white border-2 border-[#cfe6f2] rounded-3xl p-8 shadow-md space-y-8 animate-fade-in relative">
          
          {/* Header Banner */}
          <div className="flex flex-col items-center text-center space-y-2 pb-5 border-b border-gray-100">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-[#003178] tracking-tight">
              诊断完成！您的能力画像已生成
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              基于初步测试和您设定的分数指标，系统已为您量身定制学习路径规划。
            </p>
          </div>

          {/* Grid Layout of results panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
              {/* SVG RADAR CHART based on selected self-diagnostic levels */}
              <div className="bg-[#f8fafc] rounded-2xl border p-6 flex flex-col items-center justify-center relative shadow-2xs">
              <span className="text-[10px] font-bold text-[#003178] bg-white border px-2 py-0.5 rounded-full mb-4">
                综合能力雷达图
              </span>

              {/* Radar diagram in SVG */}
              <svg viewBox="0 0 200 200" className="w-[180px] h-[180px]">
                {/* Regular circular baseline grids representing levels */}
                <circle cx="100" cy="100" r="30" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
                <circle cx="100" cy="100" r="60" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2,2" />
                <circle cx="100" cy="100" r="80" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                
                {/* 4 Diagonal baseline axes pointing directions */}
                <line x1="100" y1="20" x2="100" y2="180" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="20" y1="100" x2="180" y2="100" stroke="#cbd5e1" strokeWidth="1" />

                <polygon
                  points={`100,${100 - listeningScore * 0.8} ${100 + readingScore * 0.8},100 100,${100 + writingScore * 0.8} ${100 - speakingScore * 0.8},100`}
                  fill="rgba(13, 71, 161, 0.15)"
                  stroke="#003178"
                  strokeWidth="2.5"
                />

                {/* Points highlights */}
                <circle cx="100" cy={100 - listeningScore * 0.8} r="4" fill="#003178" />
                <circle cx={100 + readingScore * 0.8} cy="100" r="4" fill="#003178" />
                <circle cx="100" cy={100 + writingScore * 0.8} r="4" fill="#003178" />
                <circle cx={100 - speakingScore * 0.8} cy="100" r="4" fill="#003178" />

                {/* Text labels exactly as diagram */}
                <text x="100" y="15" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#475569">听力 ({listeningScore}/100)</text>
                <text x="184" y="103" textAnchor="start" fontSize="9" fontWeight="bold" fill="#475569">阅读 ({readingScore})</text>
                <text x="100" y="193" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#475569">写作 ({writingScore})</text>
                <text x="14" y="103" textAnchor="end" fontSize="9" fontWeight="bold" fill="#475569">口语 ({speakingScore})</text>
              </svg>
              <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800">
                翻译基线：{translationScore}/100，会进入能力画像并影响今日任务调度。
              </div>
            </div>

            {/* Strengths & Weaknesses column */}
            <div className="space-y-6">
              {/* Strengths */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200 uppercase tracking-widest inline-block">
                  当前强项
                </span>

                <div className="space-y-3">
                  {strongestSkillEntries.map((item) => (
                    <div key={item.skillArea} className="p-3 bg-[#e8f5e9]/50 border-l-4 border-emerald-500 rounded-r-xl">
                      <h4 className="text-xs font-bold text-[#071e27] flex items-center gap-1.5">
                        <span className="text-emerald-600">✓</span> {skillCopy[item.skillArea].focus} · {item.score}/100
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                        {skillCopy[item.skillArea].strong}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Areas to improve */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-rose-800 bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-200 uppercase tracking-widest inline-block">
                  亟待提升
                </span>

                <div className="space-y-3">
                  {weakestSkillEntries.map((item) => (
                    <div key={item.skillArea} className="p-3 bg-[#ffebee]/50 border-l-4 border-rose-400 rounded-r-xl">
                      <h4 className="text-xs font-bold text-[#071e27] flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        {skillCopy[item.skillArea].focus} · {item.score}/100
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                        {skillCopy[item.skillArea].weak}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* AI Strategy recommendation line */}
          <div className="bg-[#f0f9ff] border border-[#bae6fd] p-4.5 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#0369a1]">
              <Sparkles className="h-5 w-5 animate-spin-slow shrink-0" />
              <div>
                <span className="font-semibold block text-[#0284c7] text-[10px] uppercase">系统推荐策略</span>
                <p className="font-extrabold text-[#0369a1] text-xs">建议优先训练模块: {topPriorityText}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#0369a1] bg-[#e0f2fe] border border-[#bae6fd] px-2 py-1 rounded-full shrink-0">
              依据：目标分数 · 每日 {dailyMinutes} 分钟 · 自评基线
            </span>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={onDismiss}
              className="px-10 py-3.5 bg-[#1b6d24] hover:bg-emerald-700 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-md flex items-center gap-1 hover:scale-[1.02] transition-all pointer-events-auto cursor-pointer"
            >
              🚀 开启今日训练
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
