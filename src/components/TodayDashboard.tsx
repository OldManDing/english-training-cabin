import React, { useState } from 'react';
import { 
  Flag, Clock, Play, BookOpen, Sparkles, ChevronRight, 
  MoreHorizontal, Headphones, Mic, BarChart2, TrendingDown,
  BookMarked, HelpCircle, Edit2, CheckCircle2, Sliders, RefreshCw
} from 'lucide-react';
import { DailyPlan } from '../types';

interface TodayDashboardProps {
  onStartReading: () => void;
  onStartListening: () => void;
  onStartOnboarding: () => void;
  onViewReview: () => void;
  onStartSpeaking: () => void;
  onTriggerModal?: (title: string, body: string) => void;
  readingProgress: { completed: boolean; score?: number };
  examCountdown?: number;
  targetScore?: number;
  dailyPlan?: DailyPlan | null;
  reviewItemCount?: number;
}

export default function TodayDashboard({ 
  onStartReading, 
  onStartListening, 
  onStartOnboarding, 
  onViewReview, 
  onStartSpeaking,
  onTriggerModal,
  readingProgress,
  examCountdown = 0,
  targetScore = 550,
  dailyPlan,
  reviewItemCount = 0,
}: TodayDashboardProps) {
  
  // Selected configuration strategy toggles
  const [strategy, setStrategy] = useState<'efficient' | 'review'>('efficient');
  const [showTimeEditToast, setShowTimeEditToast] = useState(false);
  const primaryPracticeTask = dailyPlan?.tasks.find((task) => task.type === 'practice');
  const reviewTask = dailyPlan?.tasks.find((task) => task.type === 'review');
  const speakingTask = dailyPlan?.tasks.find((task) => task.type === 'speaking');
  const plannedMinutes = dailyPlan?.plannedMinutes ?? 45;

  const triggerTimeEdit = () => {
    setShowTimeEditToast(true);
    setTimeout(() => {
      setShowTimeEditToast(false);
    }, 4000);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-b from-[#f3faff] to-white h-screen flex flex-col justify-between select-none relative">
      
      {/* Toast notifications */}
      {showTimeEditToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#003178] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-bold border border-[#cfe6f2] animate-bounce">
          <Sparkles className="h-4 w-4 text-emerald-300 fill-emerald-300" />
          <span>⏰ 提示：您日常练习时间额度可通过左下角「设置」中随时调整！</span>
        </div>
      )}

      {/* Main Container Scrollable segment */}
      <div className="space-y-6 flex-1 overflow-y-auto pr-1 pb-8">
        
        {/* Top Header Row matching the exact screenshot header style */}
        <header className="flex justify-between items-center pb-4 border-b border-[#cfe6f2]">
          <div>
            <h2 className="text-2xl font-black text-[#003178] tracking-tight">
              今日训练
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* AI Custom Adaptive Diagnostic Trigger */}
            <button
              onClick={onStartOnboarding}
              className="px-4 py-2 bg-gradient-to-r from-[#003178] to-[#0284c7] text-white hover:from-[#0d47a1] hover:to-[#0284c7] rounded-full text-xs font-black flex items-center gap-1.5 shadow-md hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer pointer-events-auto border border-[#cfe6f2]"
            >
              <Sparkles className="h-4 w-4 text-emerald-300 fill-emerald-300 animate-pulse" />
              <span>AI 自适应能力诊断</span>
            </button>
            {/* Countdown Red Pill element */}
            <div className="px-4 py-2 bg-[#fff1f2] border border-[#ffe4e6] text-[#e11d48] rounded-full text-xs font-black flex items-center gap-1.5 shadow-2xs">
              <Clock className="h-4 w-4 animate-pulse text-[#e11d48]" />
              <span>距离考试还有 {examCountdown} 天</span>
            </div>
            {/* Top right circular User avatar */}
            <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
              <span className="text-xs font-bold text-slate-500">学</span>
            </div>
          </div>
        </header>

        {/* Row 1: Triple cards top grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: 目标考试 */}
          <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-xs flex flex-col justify-between relative group hover:shadow-sm transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-[#434652]/80 flex items-center gap-1.5">
                <Flag className="h-3.5 w-3.5 text-[#003178]" />
                目标考试
              </span>
              <span className="text-[10px] bg-[#ebf4f9] text-[#003178] border border-[#cfe6f2] px-2 py-0.5 rounded font-black">
                CET-4
              </span>
            </div>
            <div className="pt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-[#003178]">
                {readingProgress.completed ? Math.max(targetScore, 555) : targetScore}
              </span>
              <span className="text-sm font-bold text-[#434652]">分</span>
            </div>
            {/* Single thin visual progress ruler bar */}
            <div className="mt-3.5 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="w-[68%] h-full bg-[#003178]" />
            </div>
            <div className="mt-2.5 flex justify-between items-center text-[10px] text-gray-400 font-bold">
              <span>当前预测：{readingProgress.score ? 485 + Math.round(readingProgress.score / 10) : 485}分</span>
            </div>
          </div>

          {/* Card 2: 今日时间约束 */}
          <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-[#434652]/80 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#003178]" />
                今日时间约束
              </span>
              <button 
                onClick={triggerTimeEdit}
                className="text-gray-400 hover:text-[#003178] p-1 rounded-lg hover:bg-slate-50 transition-colors pointer-events-auto cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="pt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-[#003178]">{plannedMinutes}</span>
              <span className="text-lg font-bold text-[#003178]">m</span>
              <span className="text-xs font-bold text-[#434652]/70 ml-1">/ 建议 60m</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100/70">
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg font-bold">
                高效模式
              </span>
            </div>
          </div>

          {/* Card 3: 继续上次训练 with left blue vertical highlight border */}
          <div className="bg-white border border-[#c3c6d4]/60 border-l-[5px] border-l-[#003178] rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-[#0d47a1] flex items-center gap-1.5">
                <Play className="h-3 w-3 fill-current text-[#003178]" />
                继续上次训练
              </span>
            </div>
            <div className="pt-3">
              <h4 className="font-extrabold text-sm text-[#003178] truncate">
                长篇阅读精读 (2/3)
              </h4>
             <p className="text-[10.5px] text-gray-400 font-semibold mt-0.5">
               剩余约 12 分钟
             </p>
            </div>
            <div className="mt-2 text-right">
              <button 
                onClick={onStartReading}
                className="px-4 py-1.5 bg-[#003178] hover:bg-[#0d47a1] text-white text-[10.5px] font-bold rounded-xl inline-flex items-center gap-1 hover:scale-[1.02] transition-transform pointer-events-auto cursor-pointer shadow-xs"
              >
                <span>进入</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

        </div>

        {/* Row 2: Split content grids */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          
          {/* LEFT 2 COLUMNS: Main prioritized training module and checklist queue */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Primary AI recommended task box */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-6.5 shadow-xs relative overflow-hidden group hover:border-[#003178] transition-colors">
              {/* Top background aesthetic circle */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#f0f9ff] rounded-full group-hover:scale-105 transition-transform" />
              
              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black text-white bg-rose-600 px-3 py-1 rounded-lg uppercase tracking-wider shadow-2xs">
                    最高优先级
                  </span>
                  <span className="text-xs font-bold text-[#003178] flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-[#003178]" />
                    阅读理解
                  </span>
                </div>
                {/* Duration layout badge */}
                <div className="text-right">
                  <span className="block text-lg font-black text-[#003178]">{primaryPracticeTask?.estimatedMinutes ?? 18}<span className="text-xs font-bold text-[#434652] ml-0.5">m</span></span>
                  <span className="text-[9.5px] text-gray-400 font-bold block -mt-1">预计耗时</span>
                </div>
              </div>

              {/* Title of the prioritized task */}
              <div className="mt-3.5 relative z-10">
                <h3 className="text-2xl font-black text-[#0d47a1] tracking-tight">
                  {primaryPracticeTask?.title ?? '信息匹配专项突破'}
                </h3>
              </div>

              {/* AI explanation system block */}
              <div className="bg-[#e3f2fd]/85 border border-[#c7e3fc]/80 rounded-2xl p-4.5 mt-5 text-[11px] leading-relaxed select-none relative z-10">
                <div className="flex items-center gap-1.5 font-bold text-[#003178] mb-1.5">
                  <Sparkles className="h-4 w-4 text-[#003178] fill-[#003178]/10" />
                  <span>AI 智能调度</span>
                </div>
                <p className="text-[#434652] font-semibold">
                  {primaryPracticeTask?.reason ?? '系统正在基于本地练习记录和复习队列，为您生成今日最高收益训练。'} 距考试仅剩 <span className="text-[#003178] font-black">{examCountdown}</span> 天。
                </p>
              </div>

              {/* Bottom footer button bar */}
              <div className="mt-5.5 pt-4.5 border-t border-gray-100 flex items-center justify-between relative z-10">
                <span className="text-xs font-bold text-gray-400">
                  包含 5 篇短文匹配
                </span>
                <button
                  onClick={onStartReading}
                  className="px-6 py-3 bg-[#1b6d24] hover:bg-emerald-700 text-white text-xs font-black rounded-2xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all pointer-events-auto cursor-pointer shadow-xs"
                >
                  <Sparkles className="h-4 w-4 text-emerald-300 animate-pulse" />
                  <span>开始训练</span>
                </button>
              </div>
            </div>

            {/* List Header title */}
            <div className="pt-2">
              <h3 className="text-[#003178] font-black text-sm mb-4 flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 bg-[#0d47a1] rounded text-white text-[10px] font-black text-center leading-4">目</span>
                <span>待办训练队列</span>
              </h3>

              {/* Training checklists list */}
              <div className="space-y-4">
                
                {/* 1. 待复习: 词汇与错题巩固 */}
                <div className="bg-white border border-[#c3c6d4]/60 border-l-[4px] border-l-rose-500 rounded-2xl p-4.5 flex items-center justify-between group hover:shadow-2xs transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                      <BookMarked className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#003178] text-sm">
                        词汇与错题巩固
                      </h4>
                      <p className="text-xs text-gray-400 font-bold mt-0.5">
                        {reviewItemCount > 0 ? `${reviewItemCount} 个待处理项目` : '完成训练后自动生成复习项'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={onViewReview}
                      className="px-4 py-2 font-black text-[#1a73e8] hover:text-[#0d47a1] hover:bg-[#e8f0fe] rounded-xl text-xs transition-colors pointer-events-auto cursor-pointer"
                    >
                      立即处理
                    </button>
                  </div>
                </div>

                {/* 2. 听力练习: 长对话听力练习 */}
                <div className="bg-white border border-[#c3c6d4]/60 border-l-[4px] border-l-emerald-500 rounded-2xl p-4.5 flex items-center justify-between group hover:shadow-2xs transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                      <Headphones className="h-5 w-5 text-emerald-600 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#003178] text-sm">
                        长对话听力练习
                      </h4>
                      <p className="text-xs text-gray-400 font-bold mt-0.5">
                        专注力训练 · {dailyPlan?.tasks.find((task) => task.skillArea === 'listening')?.estimatedMinutes ?? 10}m
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={onStartListening}
                      className="p-2 text-gray-300 hover:text-[#003178] rounded-lg hover:bg-slate-50 transition-colors pointer-events-auto cursor-pointer"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* 3. 口语练习: 场景对话模拟 */}
                <div 
                  onClick={onStartSpeaking}
                  className="bg-white border border-[#c3c6d4]/60 border-l-[4px] border-l-[#003178] rounded-2xl p-4.5 flex items-center justify-between group hover:shadow-2xs hover:border-[#003178]/50 transition-all cursor-pointer pointer-events-auto"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#eef7fc] border border-[#cfe6f2] flex items-center justify-center shrink-0 group-hover:bg-[#dbf1fe] transition-colors">
                      <Mic className="h-5 w-5 text-[#003178]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#003178] text-sm group-hover:text-[#003178] transition-colors">
                        场景对话模拟
                      </h4>
                      <p className="text-xs text-gray-400 font-bold mt-0.5">
                        弱项巩固 · {speakingTask?.estimatedMinutes ?? 15}m
                      </p>
                    </div>
                  </div>
                  <div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onStartSpeaking(); }}
                      className="p-2 text-gray-400 hover:text-[#003178] rounded-lg hover:bg-slate-50 transition-colors pointer-events-auto cursor-pointer"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR COLUMN: Diagnostic progress widget layouts */}
          <div className="space-y-6">
            
            {/* Block 1: 核心弱项诊断 (Fully Interactive Trigger) */}
            <div 
              onClick={onStartOnboarding}
              className="bg-white border border-[#c3c6d4]/60 hover:border-[#003178] rounded-3xl p-5.5 shadow-xs space-y-4.5 cursor-pointer hover:shadow-2xs transition-all group pointer-events-auto relative overflow-hidden"
            >
              {/* Highlight subtle corner flash glow on hover */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#dbf1fe]/30 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-center pb-2.5 border-b border-gray-100">
                <span className="text-sm font-black text-[#003178] flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-[#003178] rounded-xs block" />
                  核心弱项诊断
                </span>
                <span className="text-[10px] text-[#003178] bg-[#eef7fc] group-hover:bg-[#003178] group-hover:text-white px-2 py-0.5 rounded font-black transition-all flex items-center gap-0.5 shadow-3xs">
                  <span>诊断库</span>
                  <ChevronRight className="h-2.5 w-2.5" />
                </span>
              </div>

              {/* Custom micro metric bars matching screen perfectly */}
              <div className="space-y-4">
                
                {/* 1. 阅读 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-[#434652]">阅读: 细节定位</span>
                    <span className="text-red-600">需关注</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-[85%] h-full bg-rose-600" />
                  </div>
                </div>

                {/* 2. 听力 */}
                <div className="space-y-1 mr-0.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-[#434652]">听力: 长对话推断</span>
                    <span className="text-rose-500">薄弱</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-[58%] h-full bg-orange-500" />
                  </div>
                </div>

                {/* 3. 翻译 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-[#434652]">翻译: 复杂句型结构</span>
                    <span className="text-[#1b6d24]">一般</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-[42%] h-full bg-slate-600" />
                  </div>
                </div>

              </div>

              <div className="pt-2.5 border-t border-gray-100/70 flex items-center justify-center">
                <span className="text-[10px] text-[#003178] font-black group-hover:underline flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500 fill-amber-400 animate-bounce" />
                  <span>启动 AI 全自适应诊断与能力画像</span>
                </span>
              </div>
            </div>

            {/* Block 2: 突破进展 layout */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5.5 shadow-xs flex items-center justify-between group hover:border-[#1b6d24] transition-colors relative">
              <div className="space-y-1">
                <span className="text-xs font-black text-[#434652] flex items-center gap-1.5">
                  <BarChart2 className="h-4 w-4 text-[#003178]" />
                  突破进展
                </span>
                <span className="block text-[11px] text-gray-400 font-bold pt-1">阅读错误数 (篇)</span>
                <div className="flex items-baseline gap-2 pt-1 font-semibold">
                  <span className="text-xl text-[#434652] opacity-60">5</span>
                  <span className="text-xl text-gray-400">→</span>
                  <span className="text-3xl font-extrabold text-[#1b6d24]">2</span>
                </div>
              </div>

              {/* Wavelet Trend indicator icon floating */}
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-150 flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5 text-emerald-600 stroke-[2.5]" />
              </div>
            </div>

            {/* Block 3: 待复习词汇/错题 simple alert card row block */}
            <div 
              onClick={onViewReview}
              className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-xs flex items-center justify-between cursor-pointer hover:border-[#003178] hover:shadow-2xs transition-all pointer-events-auto"
            >
              <div className="flex items-center gap-3">
                {/* Book stack badge with absolute counter */}
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <BookMarked className="h-5.5 w-5.5 text-[#003178]" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {reviewItemCount}
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-[#003178] text-xs">
                    待复习词汇/错题
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                    {reviewItemCount > 0 ? '建议在今日内完成' : '练习后生成真实错因'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-[#003178]" />
            </div>

            {/* Block 4: 训练策略切换 checkboxes with high simulation */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5.5 shadow-xs space-y-4">
              <span className="text-xs font-black text-[#0d47a1] flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-[#003178]" />
                训练策略切换
              </span>

              <div className="space-y-3 pt-1">
                {/* Strategy Option A: 高效模式 */}
                <div 
                  onClick={() => setStrategy('efficient')}
                  className={`border rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                    strategy === 'efficient' 
                      ? 'bg-[#eef7fc] border-[#cfe6f2] shadow-3xs' 
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div>
                    <h5 className="font-extrabold text-xs text-[#003178]">高效模式</h5>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">限时训练，强化干扰项辨析</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    strategy === 'efficient' ? 'border-[#003178] bg-[#003178]' : 'border-slate-350 bg-white'
                  }`}>
                    {strategy === 'efficient' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>

                {/* Strategy Option B: 巩固模式 */}
                <div 
                  onClick={() => setStrategy('review')}
                  className={`border rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                    strategy === 'review' 
                      ? 'bg-[#eef7fc] border-[#cfe6f2] shadow-3xs' 
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div>
                    <h5 className="font-extrabold text-xs text-[#1e333c]">巩固模式</h5>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">侧重基础巩固与详尽解析</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    strategy === 'review' ? 'border-[#003178] bg-[#003178]' : 'border-slate-350 bg-white'
                  }`}>
                    {strategy === 'review' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
