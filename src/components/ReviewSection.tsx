import React, { useEffect, useState } from 'react';
import { 
  AlertCircle, AlertTriangle, Bell, User, Check, Play, ArrowRight, 
  RefreshCw, Clock, Sparkles, ChevronRight, HelpCircle, BookOpen, 
  Sparkle, CheckSquare, X, ListTodo, GraduationCap, Award, Brain
} from 'lucide-react';
import { ReviewItem } from '../types';

interface LowFreqErrorItem {
  id: string;
  topic: string;
  daysAgoText: string;
  mastery: number;
}

interface ReviewSectionProps {
  onTriggerModal?: (title: string, body: string) => void;
  persistedReviewCount?: number;
  persistedReviewItems?: ReviewItem[];
}

export default function ReviewSection({ onTriggerModal, persistedReviewCount = 0, persistedReviewItems = [] }: ReviewSectionProps) {
  // UI views: 'dashboard' is main view, 'quiz' is interactive simulator
  const [view, setView] = useState<'dashboard' | 'quiz'>('dashboard');
  
  // Interactive statistics state
  const [pendingCount, setPendingCount] = useState<number>(persistedReviewCount > 0 ? persistedReviewCount : 12);
  const [resolvedCount, setResolvedCount] = useState<number>(5);
  const [averageMastery, setAverageMastery] = useState<number>(74);
  const [highPriorityMastery, setHighPriorityMastery] = useState<number>(46);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);
  
  // Custom toast notification trigger
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Selection or detail modals
  const [activeDetailItem, setActiveDetailItem] = useState<string | null>(null);

  // States for interactive mini-quiz Synonym Challenge
  const [quizStep, setQuizStep] = useState<number>(0);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [wrongAnswerIndex, setWrongAnswerIndex] = useState<number | null>(null);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);
  const topPersistedReview = persistedReviewItems[0];

  useEffect(() => {
    if (persistedReviewCount > 0) {
      setPendingCount(persistedReviewCount);
    }
  }, [persistedReviewCount]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Middle-priority cards state
  const [midPriorityItems, setMidPriorityItems] = useState([
    { id: 'mid-1', title: '听力长对话推断题', mastery: 68 },
    { id: 'mid-2', title: '阅读细节定位速度', mastery: 72 },
  ]);

  // Low frequency errors list matching screenshot
  const [lowFreqErrors, setLowFreqErrors] = useState<LowFreqErrorItem[]>([
    { id: 'low-1', topic: '虚拟语气倒装结构', daysAgoText: '3天前曾出错', mastery: 85 },
    { id: 'low-2', topic: '特定介词搭配', daysAgoText: '5天前曾出错', mastery: 88 },
    { id: 'low-3', topic: '翻译专有名词拼写', daysAgoText: '1周前曾出错', mastery: 92 },
  ]);

  // Interactive Mini Quiz: Synonym matching exercises
  const synonymQuestions = [
    {
      word: "nevertheless",
      options: [
        { text: "因此 / 从而", correct: false },
        { text: "然而 / 尽管如此", correct: true },
        { text: "不仅...而且", correct: false },
        { text: "由于 / 鉴于", correct: false }
      ],
      tip: "CET-4高频转折同义词，常与 however, nonetheless 发生同义替换。"
    },
    {
      word: "advocate",
      options: [
        { text: "压制 / 强迫", correct: false },
        { text: "提倡 / 倡导者", correct: true },
        { text: "忽略 / 视而不见", correct: false },
        { text: "怀疑 / 拒绝", correct: false }
      ],
      tip: "仔细阅读常考词汇，常与 recommend, support 进行同义替换。"
    },
    {
      word: "transform",
      options: [
        { text: "保持 / 延续", correct: false },
        { text: "加强 / 扩大", correct: false },
        { text: "改变 / 转变", correct: true },
        { text: "阻碍 / 延迟", correct: false }
      ],
      tip: "核心考点动词，常与 change, alter 发生文意转化替换。"
    }
  ];

  const handleSelectOption = (index: number, isCorrect: boolean) => {
    if (correctAnswerIndex !== null) return; // Prevent double clicking
    
    if (isCorrect) {
      setCorrectAnswerIndex(index);
      setTimeout(() => {
        if (quizStep < synonymQuestions.length - 1) {
          setQuizStep(prev => prev + 1);
          setCorrectAnswerIndex(null);
          setWrongAnswerIndex(null);
        } else {
          // Finished all questions!
          setView('dashboard');
          setQuizCompleted(true);
          setPendingCount(11); // Decrements pending task
          setResolvedCount(6); // Increments resolved task
          setAverageMastery(75); // Updates predicted stats!
          setHighPriorityMastery(92); // Upgraded mastery percent!
          triggerToast("🎉 太棒了！您已成功攻克「同义替换未识别」高优先复习点，今日艾宾浩斯记忆熟练度+1！");
        }
      }, 1200);
    } else {
      setWrongAnswerIndex(index);
      triggerToast("💡 选错啦，仔细读读解析，再试一次！");
    }
  };

  const handleStartReview = () => {
    setView('quiz');
    setQuizStep(0);
    setCorrectAnswerIndex(null);
    setWrongAnswerIndex(null);
  };

  const showDetailModal = (item: LowFreqErrorItem) => {
    if (onTriggerModal) {
      onTriggerModal(
        `知识点诊断 - ${item.topic}`,
        `📌 弱点名称: ${item.topic}\n📈 当前艾宾浩斯熟练度: ${item.mastery}%\n🕒 错误记录: ${item.daysAgoText}\n\n💡 备考建议:\n该复习项掌握度正稳步提升。建议在今日口语纠错重说或仔细阅读中，刻意加强对该模块或句法特征的连贯运用。AI 智慧教练已自动根据记忆机制为您平滑递减当前训练频度。`
      );
    } else {
      triggerToast(`📌 ${item.topic}: 当前掌握度 ${item.mastery}%`);
    }
  };

  const handleExecuteMidPriority = (id: string, title: string) => {
    triggerToast(`🔄 正在提取「${title}」相关自适应特训题目，即将为您开启巩固训练...`);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-b from-[#f3faff] to-white h-screen flex flex-col justify-between relative select-none">
      
      {/* Dynamic Slide Toast Banner */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#003178] text-white px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-bold border border-[#cfe6f2] animate-bounce">
          <Sparkle className="h-4.5 w-4.5 text-emerald-300 fill-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* DASHBOARD COGNITIVE CANVAS VIEW */}
      {view === 'dashboard' ? (
        <div className="space-y-6 flex-1 overflow-y-auto pr-1 pb-8">
          
          {/* Header element mirroring the exact layout requested */}
          <header className="flex justify-between items-center pb-4 border-b border-[#cfe6f2]">
            <div>
              <h2 className="text-2xl font-black text-[#003178] tracking-tight">
                复习队列
              </h2>
            </div>
            
            {/* Top right pill metrics & actions */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-1.5 border border-[#dcfce7] bg-[#f0fdf4] text-[#1b6d24] rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs">
                <span>距考试 42 天</span>
              </div>
              
              {/* Notification icon & user avatar */}
              <button 
                onClick={() => triggerToast("🔔 复习提醒：距离本周自适应复习截止仅剩2天，请及时消化高优先级内容！")}
                className="p-1.5 text-slate-500 hover:text-[#003178] rounded-full hover:bg-slate-100 transition-colors relative cursor-pointer"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-600 rounded-full" />
              </button>

              <div className="w-8.5 h-8.5 rounded-full bg-slate-200 border border-white overflow-hidden flex items-center justify-center shadow-xs">
                <span className="text-xs font-bold text-slate-500">学</span>
              </div>
            </div>
          </header>

          {/* Row of Four metric statistic summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Stat Card 1: 待复习项目 */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-2xs transition-shadow relative">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-[#434652] opacity-80">待复习项目</span>
                <ListTodo className="h-4.5 w-4.5 text-[#003178]" />
              </div>
              <div className="pt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#003178]">{pendingCount}</span>
                <span className="text-xs text-gray-400 font-bold">项任务</span>
              </div>
            </div>

            {/* Stat Card 2: 今日已解决 */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-2xs transition-shadow">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-[#434652] opacity-80">今日已解决</span>
                <div className="w-4.5 h-4.5 rounded-full border-1.5 border-[#1b6d24] flex items-center justify-center text-[#1b6d24]">
                  <Check className="h-3 w-3 stroke-[2.5]" />
                </div>
              </div>
              <div className="pt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-[#1b6d24]">{resolvedCount}</span>
                <span className="text-xs text-gray-400 font-bold">项任务</span>
              </div>
            </div>

            {/* Stat Card 3: 平均掌握度 */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-2xs transition-shadow">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-[#434652] opacity-80">平均掌握度</span>
                <GraduationCap className="h-4.5 w-4.5 text-neutral-400" />
              </div>
              <div className="pt-4 flex items-baseline gap-0.5">
                <span className="text-3xl font-black text-slate-800">{averageMastery}</span>
                <span className="text-xs font-black text-slate-500">%</span>
              </div>
            </div>

            {/* Stat Card 4: 记忆曲线状态 */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-2xs transition-shadow">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-[#434652] opacity-80">记忆曲线状态</span>
                <Award className="h-4.5 w-4.5 text-[#003178]" />
              </div>
              <div className="pt-4 pb-0.5">
                <span className="text-base font-black text-[#003178] tracking-tight">稳步提升</span>
              </div>
            </div>

          </div>

          {/* Section A: Red Exclamation High Priority Box */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-rose-600 flex items-center gap-1.5">
              <AlertTriangle className="h-4.5 w-4.5 text-rose-500 fill-rose-50/50" />
              <span>高优先级复习</span>
            </h3>

            {/* Split big highlighted main card container */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-10 hover:border-rose-600/40 transition-colors">
              
              {/* Left detail area takes 7 parts */}
              <div className="lg:col-span-7 p-6.5 space-y-4">
                
                {/* Horizontal tags block */}
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md">
                    ⚠ 核心薄弱项
                  </span>
                  <span className="text-[10px] font-black text-blue-800 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md">
                    阅读与理解
                  </span>
                </div>

                {/* Massive title text */}
                <div>
                  <h4 className="text-2xl font-black text-slate-800 tracking-tight">
                    {topPersistedReview?.title ?? '同义替换未识别'}
                  </h4>
                </div>

                {/* Info summary layout */}
                <div className="bg-[#f0f4f8] border border-slate-200/40 rounded-xl p-4 text-[11px] leading-relaxed select-none">
                  <p className="font-semibold text-slate-600 flex items-start gap-2">
                    <AlertCircle className="h-4.5 w-4.5 text-[#003178] shrink-0 mt-0.5" />
                    <span>{topPersistedReview?.detail ?? '原因：AI 诊断显示你在最近的 3 篇阅读练习中，均在“考察近义词替换”的细节题中失分。'}</span>
                  </p>
                </div>

                {/* Current progress bar */}
                <div className="space-y-1.5 pt-1.5">
                  <div className="flex justify-between items-baseline text-xs font-bold">
                    <span className="text-slate-500">当前掌握度 {topPersistedReview?.masteryScore ?? highPriorityMastery}/100</span>
                    <span className="text-rose-600 font-extrabold text-[11px] flex items-center gap-1">
                      ● 亟需强化 训练
                    </span>
                  </div>
                  {/* Slider or progress track bar */}
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full ${quizCompleted ? 'bg-emerald-600' : 'bg-rose-600'} transition-all duration-500`} 
                      style={{ width: `${topPersistedReview?.masteryScore ?? highPriorityMastery}%` }} 
                    />
                  </div>
                </div>

              </div>

              {/* Right control timer area takes 3 parts */}
              <div className="lg:col-span-3 bg-[#fbfcfd] border-t lg:border-t-0 lg:border-l border-slate-100 p-6.5 flex flex-col justify-between gap-5 text-xs">
                
                <div className="space-y-4">
                  {/* Item 1: time estimation */}
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-[#0d47a1] shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400">预计耗时</span>
                      <span className="block font-black text-slate-800 text-sm mt-0.5">15-20 分钟</span>
                    </div>
                  </div>

                  {/* Item 2: next review interval */}
                  <div className="flex items-start gap-2.5">
                    <RefreshCw className="h-4 w-4 text-[#0d47a1] shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400">下次复习</span>
                      <span className="block font-black text-slate-800 text-sm mt-0.5">{topPersistedReview?.nextReviewAt ? new Date(topPersistedReview.nextReviewAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '明天 09:00'}</span>
                    </div>
                  </div>
                </div>

                {/* Massive Blue launch button */}
                <div>
                  <button
                    onClick={handleStartReview}
                    className="w-full px-5 py-3 bg-[#003178] hover:bg-[#0d47a1] text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] pointer-events-auto cursor-pointer shadow-xs"
                  >
                    <span>开始复习</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

              </div>

            </div>
          </div>

          {/* Section B: Grid consisting of Left (中优先级) and Right (低频错误) */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-7 items-start pt-2">
            
            {/* Left box: 中优先级 (takes 5 parts of 10) */}
            <div className="lg:col-span-5 space-y-4.5">
              <h3 className="text-sm font-black text-[#003178] flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4 text-sky-600 animate-spin-slow" />
                <span>中优先级</span>
              </h3>

              {/* Items column */}
              <div className="space-y-4">
                {midPriorityItems.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-white border border-[#c3c6d4]/60 rounded-2.5xl p-5 flex items-center justify-between hover:shadow-2xs transition-shadow group"
                  >
                    <div className="space-y-2 flex-1">
                      <h4 className="font-extrabold text-[#003178] text-sm group-hover:text-[#0d47a1] transition-colors">
                        {item.title}
                      </h4>
                      
                      {/* Interactive inner progress bar */}
                      <div className="space-y-1 pr-6">
                        <span className="text-[10px] text-slate-400 font-bold block">
                          掌握度 {item.mastery}/100
                        </span>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-500" style={{ width: `${item.mastery}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Circular solid action button */}
                    <button
                      onClick={() => handleExecuteMidPriority(item.id, item.title)}
                      className="w-10 h-10 rounded-full bg-[#f0f4f8] hover:bg-[#003178] hover:text-white text-[#003178] flex items-center justify-center shrink-0 shadow-3xs transition-all cursor-pointer pointer-events-auto"
                    >
                      <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right box: 低频错误 (takes 5 parts of 10) */}
            <div className="lg:col-span-5 space-y-4.5">
              <h3 className="text-sm font-black text-slate-500 flex items-center gap-1.5">
                <Brain className="h-4.5 w-4.5 text-[#003178]" />
                <span>低频错误</span>
              </h3>

              {/* Tabular clean list styled block */}
              <div className="bg-white border border-[#c3c6d4]/60 rounded-2.5xl overflow-hidden shadow-xs">
                {/* Column Table Header */}
                <div className="bg-[#eef7fc] px-4 py-2 flex items-center justify-between border-b border-gray-100 text-[11px] text-slate-500 font-bold">
                  <span className="w-1/2">知识点</span>
                  <span className="w-1/4 text-center">掌握度</span>
                  <span className="w-1/4 text-right">操作</span>
                </div>

                {/* Table row list */}
                <div className="divide-y divide-gray-100">
                  {lowFreqErrors.map((item) => (
                    <div 
                      key={item.id} 
                      className="px-4 py-3.5 flex items-center justify-between text-xs group hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Topic Name */}
                      <div className="w-1/2 pr-2">
                        <span className="font-extrabold text-slate-800 block text-xs truncate">
                          {item.topic}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                          {item.daysAgoText}
                        </span>
                      </div>

                      {/* Mastery badge */}
                      <div className="w-1/4 text-center">
                        <span className="inline-block text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {item.mastery}%
                        </span>
                      </div>

                      {/* Detail CTA Button */}
                      <div className="w-1/4 text-right">
                        <button
                          onClick={() => showDetailModal(item)}
                          className="text-xs font-black text-[#003178] hover:text-[#0d47a1] transition-colors pointer-events-auto cursor-pointer"
                        >
                          查看详情
                        </button>
                      </div>

                    </div>
                  ))}
                </div>

              </div>
            </div>

          </div>

        </div>
      ) : (
        /* QUIZ MODE INTERACTIVE SYSTEM CANVAS */
        <div className="flex-1 max-w-xl mx-auto w-full my-auto py-12 px-6 flex flex-col justify-center">
          
          <div className="bg-white border border-[#dbf1fe] rounded-3xl p-7 shadow-xl space-y-6 relative overflow-hidden">
            {/* Header aesthetic dynamic color bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003178] to-sky-500" />
            
            {/* Top Close icon */}
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-[#003178] tracking-widest bg-[#dbf1fe]/55 px-3 py-1 rounded-full uppercase">
                同义替换自适应极速背记
              </span>
              <button 
                onClick={() => setView('dashboard')} 
                className="text-slate-400 hover:text-[#003178] p-1 rounded-lg hover:bg-slate-50 transition-colors pointer-events-auto cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stage tracking */}
            <div className="flex items-center gap-1.5">
              {synonymQuestions.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    idx <= quizStep ? 'bg-[#003178]' : 'bg-slate-100'
                  }`} 
                />
              ))}
            </div>

            {/* Central Word prompt */}
            <div className="text-center py-6">
              <span className="text-[11px] font-bold text-slate-400 block tracking-widest uppercase">
                请选出最贴切的同义替换义项
              </span>
              <h3 className="text-4xl font-black text-[#003178] tracking-tight mt-1.5 font-mono">
                {synonymQuestions[quizStep].word}
              </h3>
            </div>

            {/* Answer options selection list */}
            <div className="space-y-3">
              {synonymQuestions[quizStep].options.map((opt, oIdx) => {
                const isSelected = correctAnswerIndex === oIdx;
                const isWrong = wrongAnswerIndex === oIdx;

                let cardStyle = "border-slate-200 bg-white hover:bg-slate-50/70 hover:border-slate-300";
                if (isSelected) {
                  cardStyle = "border-emerald-500 bg-emerald-50 text-emerald-900";
                } else if (isWrong) {
                  cardStyle = "border-rose-400 bg-rose-50 text-rose-900 animate-shake";
                }

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectOption(oIdx, opt.correct)}
                    className={`w-full text-left px-5 py-3.5 border rounded-2xl font-bold text-xs transition-all flex items-center justify-between cursor-pointer pointer-events-auto ${cardStyle}`}
                  >
                    <span>{oIdx + 1}. {opt.text}</span>
                    {isSelected && (
                      <Check className="h-4.5 w-4.5 text-emerald-600 stroke-[3]" />
                    )}
                    {isWrong && (
                      <X className="h-4.5 w-4.5 text-rose-500 stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer tips prompt layout */}
            <div className="bg-[#f0f9ff] border border-[#dbf1fe]/50 rounded-xl p-3 text-[10px] leading-relaxed text-slate-500 font-semibold flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-[#003178] mt-0.5 shrink-0" />
              <span>{synonymQuestions[quizStep].tip}</span>
            </div>

          </div>

        </div>
      )}

      {/* Clean matching copyright footer with policy tags */}
      <footer className="shrink-0 pt-4 border-t border-[#cfe6f2] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#434652] opacity-75 sm:py-2 select-none">
        <div>
          © 2026 英语训练舱 AI Study Coach
        </div>
        <div className="flex items-center space-x-4 mt-2 sm:mt-0 font-bold">
          <a href="#privacy" onClick={(e) => { 
            e.preventDefault(); 
            if (onTriggerModal) {
              onTriggerModal("隐私协议", "练习记录、错题复习队列和能力画像默认保存在当前浏览器 IndexedDB 中。口语录音文件不上传；启用 AI 口语分析时，仅发送口语文本到服务端和已配置的 AI 供应商。请勿输入身份证号、手机号、账号密码等敏感信息。");
            } else {
              triggerToast("隐私协议：学习记录默认保存在当前浏览器，AI 分析会发送必要文本。");
            }
          }} className="hover:text-[#003178] transition-colors">隐私协议</a>
          <span>•</span>
          <a href="#terms" onClick={(e) => { 
            e.preventDefault(); 
            if (onTriggerModal) {
              onTriggerModal("服务条款", "本智能备考舱为您的高效备考保驾护航。您可以使用 AI 自适应测评、精听录音重读与错题集诊断等全套功能。");
            } else {
              triggerToast("服务条款：本系统由 AI 开发并为您的大学英语四六级考试提供自适应答疑服务。");
            }
          }} className="hover:text-[#003178] transition-colors">服务条款</a>
          <span>•</span>
          <a href="#developer" onClick={(e) => { 
            e.preventDefault(); 
            if (onTriggerModal) {
              onTriggerModal("开发者中心", "欢迎使用智能备考复习中心！本产品基于间隔重复记忆算法，助您以最少的时间博得最高的熟练度！");
            } else {
              triggerToast("开发者中心：基于自研间隔重复算法进行增量学习词库调度。");
            }
          }} className="hover:text-[#003178] transition-colors">开发者中心</a>
        </div>
      </footer>

    </div>
  );
}
