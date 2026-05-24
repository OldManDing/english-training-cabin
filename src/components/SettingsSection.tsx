import React, { useEffect, useState } from 'react';
import { Flag, LayoutGrid, Target, Calendar, Check, Lock, Sparkles, Sliders, ChevronDown, Save, Sparkle, RefreshCw } from 'lucide-react';

interface SettingsSectionProps {
  onSave?: (settings: any) => void;
  targetScoreLimit?: number;
  initialExamDate?: string;
  initialDailyMinutes?: number;
  onSetScoreLimit?: (score: number) => void;
  onTriggerModal?: (title: string, body: string) => void;
}

export default function SettingsSection({ onSave, targetScoreLimit = 550, initialExamDate, initialDailyMinutes, onSetScoreLimit, onTriggerModal }: SettingsSectionProps) {
  // Local Settings States matching the screenshot
  const [examType, setExamType] = useState<string>("CET-4");
  const [examDate, setExamDate] = useState<string>(initialExamDate ?? "2026-06-15");
  const [prepareSpeaking, setPrepareSpeaking] = useState<boolean>(true);
  
  // Base skill levels: 0 = 入门, 1 = 中级, 2 = 高级
  const [readingLevel, setReadingLevel] = useState<number>(1); // default "中级"
  const [listeningLevel, setListeningLevel] = useState<number>(1); // default "中级"
  const [translationLevel, setTranslationLevel] = useState<number>(0); // default "入门"
  const [writingLevel, setWritingLevel] = useState<number>(1); // default "中级"
  const [speakingLevel, setSpeakingLevel] = useState<number>(0); // default "入门"

  const [targetScore, setTargetScore] = useState<number>(targetScoreLimit);
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState<number>(initialDailyMinutes ?? 60); // 60 minutes as in screenshot
  
  // Extra settings
  const [whisperNoiseReduction, setWhisperNoiseReduction] = useState<boolean>(true);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);

  useEffect(() => {
    if (initialExamDate) setExamDate(initialExamDate);
  }, [initialExamDate]);

  useEffect(() => {
    if (initialDailyMinutes) setDailyTargetMinutes(initialDailyMinutes);
  }, [initialDailyMinutes]);

  useEffect(() => {
    setTargetScore(targetScoreLimit);
  }, [targetScoreLimit]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSaveSettings = () => {
    if (onSetScoreLimit) {
      onSetScoreLimit(targetScore);
    }
    if (onSave) {
      onSave({
        examType,
        examDate,
        prepareSpeaking,
        readingLevel,
        listeningLevel,
        translationLevel,
        writingLevel,
        speakingLevel,
        targetScore,
        dailyTargetMinutes,
        whisperNoiseReduction
      });
    }
    triggerToast("✨ 备考特征已保存，并成功同步至 AI 自适应强化中心！");
  };

  const handleGeneratePlan = () => {
    setIsGeneratingPlan(true);
    setTimeout(() => {
      setIsGeneratingPlan(false);
      triggerToast("🚀 AI 备考引擎已成功重新规划并为您生成专属学习大纲！");
    }, 1500);
  };

  // Helper arrays
  const levelLabels = ["入门", "中级", "高级"];

  // Derived calculation values matching simulated statistics
  const daysRemaining = Math.max(0, Math.ceil((new Date(`${examDate}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000));
  const totalStudyHours = Math.round((dailyTargetMinutes * daysRemaining) / 60);
  
  // Determine intensity based on daily minutes
  let intensityText = "中等";
  let intensityPercent = 60;
  let intensityColor = "bg-emerald-600";
  let intensityStrategy = "笔试主目标 + 口语并行策略";

  if (dailyTargetMinutes <= 30) {
    intensityText = "轻度";
    intensityPercent = 35;
    intensityColor = "bg-yellow-500";
    intensityStrategy = "高频考点点对点突击";
  } else if (dailyTargetMinutes >= 90) {
    intensityText = "强力";
    intensityPercent = 95;
    intensityColor = "bg-rose-600 animate-pulse";
    intensityStrategy = "狂暴真题超频复习方案";
  } else if (dailyTargetMinutes >= 60) {
    intensityText = "中等";
    intensityPercent = 65;
    intensityColor = "bg-[#1b6d24]";
    intensityStrategy = "笔试主目标 + 口语并行策略";
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-b from-[#f3faff] to-white h-screen flex flex-col justify-between relative select-none">
      
      {/* Sliding Toast mechanism at top center */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#003178] text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-bold border border-[#cfe6f2] animate-bounce">
          <Sparkle className="h-4.5 w-4.5 text-emerald-300 fill-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Header Group */}
      <div className="shrink-0 mb-6">
        <header className="pb-4 border-b border-[#cfe6f2] flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-[#003178] tracking-tight">
              目标与计划设置
            </h2>
            <p className="text-xs text-[#434652] opacity-80 mt-1">
              配置您的训练舱，生成个性化的备考计划。
            </p>
          </div>
          <button
            onClick={handleSaveSettings}
            className="px-5 py-2.5 bg-[#003178] hover:bg-[#0d47a1] text-white text-xs font-black rounded-2xl flex items-center gap-1.5 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
          >
            <Save className="h-4 w-4 text-emerald-300" />
            <span>保存设置</span>
          </button>
        </header>
      </div>

      {/* Main Responsive Grid Layout closely mirroring the uploaded UI design */}
      <div className="flex-1 overflow-y-auto space-y-8 pr-2 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT 2 COLS: Standard forms and sub-section blocks */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card 1: 考试目标 */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-6.5 shadow-sm space-y-5">
              <h3 className="text-sm font-black text-[#003178] flex items-center gap-2">
                <Flag className="h-4 w-4 text-[#003178]" />
                考试目标
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Exam type custom Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#434652]">目标考试</label>
                  <div className="relative">
                    <select
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border border-[#c3c6d4] px-4 py-3 bg-[#f8fafc] text-[#003178] appearance-none focus:outline-none focus:ring-1 focus:ring-[#003178] cursor-pointer"
                    >
                      <option value="CET-4">CET-4 (四级高频词 + 历年精听突破)</option>
                      <option value="CET-6">CET-6 (六级强化 + 精听真题库)</option>
                    </select>
                    <ChevronDown className="h-4 w-4 absolute right-3.5 top-3.5 text-[#434652] pointer-events-none" />
                  </div>
                </div>

                {/* Date Picker matching screens */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#434652]">考试日期</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border border-[#c3c6d4] px-4 py-3 bg-[#f8fafc] text-[#003178] focus:outline-none focus:ring-1 focus:ring-[#003178] cursor-pointer"
                    />
                    <Calendar className="h-4 w-4 absolute right-4 top-3.5 text-[#003178] pointer-events-none hidden" />
                  </div>
                </div>
              </div>

              {/* Bottom checkbox item */}
              <div className="pt-3 border-t border-gray-100 flex items-center">
                <button
                  type="button"
                  onClick={() => setPrepareSpeaking(!prepareSpeaking)}
                  className="flex items-center gap-2.5 text-xs text-[#003178] font-bold select-none cursor-pointer group"
                >
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                    prepareSpeaking 
                      ? 'bg-[#003178] border-[#003178] text-white shadow-xs' 
                      : 'border-[#c3c6d4] bg-[#f8fafc] group-hover:border-[#003178]'
                  }`}>
                    {prepareSpeaking && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                  <span>是否同时准备 CET-4 口语考试</span>
                </button>
              </div>
            </div>

            {/* Sub-block Container: "当前基础" Header on Left column, "目标分数" on Right column under same row */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-6.5 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Sub-item Left: 当前基础 */}
                <div className="space-y-5">
                  <h3 className="text-sm font-black text-[#003178] flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-[#003178]" />
                    当前基础
                  </h3>

                  <div className="space-y-3.5">
                    {[
                      { key: 'reading', label: '阅读能力', level: readingLevel, setLevel: setReadingLevel },
                      { key: 'listening', label: '听力能力', level: listeningLevel, setLevel: setListeningLevel },
                      { key: 'translation', label: '翻译水平', level: translationLevel, setLevel: setTranslationLevel },
                      { key: 'writing', label: '写作能力', level: writingLevel, setLevel: setWritingLevel },
                      { key: 'speaking', label: '口语表达', level: speakingLevel, setLevel: setSpeakingLevel },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#434652]">{item.label}</span>
                        <div className="flex bg-[#f0f7fc] p-0.5 rounded-lg border border-[#cfe6f2] scale-95 origin-right">
                          {levelLabels.map((lbl, idx) => (
                            <button
                              key={lbl}
                              onClick={() => item.setLevel(idx)}
                              className={`text-[10px] font-bold px-3 py-1 rounded-md transition-all ${
                                item.level === idx
                                  ? 'bg-[#003178] text-white shadow-2xs'
                                  : 'text-[#434652] hover:bg-[#e1f1fc]'
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-item Right: 目标分数 */}
                <div className="space-y-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-[#003178] flex items-center gap-2">
                      <Target className="h-4 w-4 text-[#003178]" />
                      目标分数
                    </h3>
                  </div>

                  <div className="space-y-4 flex-1 flex flex-col justify-center">
                    {/* Big Score visual box matching the screenshot */}
                    <div className="bg-[#e3f2fd] rounded-2xl py-6.5 text-center border border-[#badcfe]/60 shadow-2xs relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-[#b1dcfd]/20 rounded-full blur-xl translate-x-2 -translate-y-2" />
                      <span className="font-black text-5xl text-[#003178] select-none tracking-tighter">
                        {targetScore}
                      </span>
                      <span className="text-[#003178] font-black text-xl ml-1 align-super">+</span>
                    </div>

                    {/* Score Slider and range anchors */}
                    <div className="space-y-1.5">
                      <input
                        type="range"
                        min="425"
                        max="710"
                        step="5"
                        value={targetScore}
                        onChange={(e) => setTargetScore(parseInt(e.target.value))}
                        className="w-full h-1 bg-[#dbf1fe] rounded-full appearance-none cursor-pointer accent-[#003178]"
                      />
                      <div className="flex justify-between text-[10px] text-[#434652] font-black opacity-80">
                        <span>及格 (425)</span>
                        <span>总分 (710)</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Card 3: 学习参数 */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-6.5 shadow-sm space-y-5">
              <h3 className="text-sm font-black text-[#003178] flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#003178]" />
                学习参数
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#434652]">每日投入时长</label>
                  <div className="relative">
                    <select
                      value={dailyTargetMinutes}
                      onChange={(e) => setDailyTargetMinutes(parseInt(e.target.value))}
                      className="w-full text-xs font-bold rounded-xl border border-[#c3c6d4] px-4 py-3 bg-[#f8fafc] text-[#003178] appearance-none focus:outline-none focus:ring-1 focus:ring-[#003178] cursor-pointer"
                    >
                      <option value="30">30 分钟 (高效摸鱼流)</option>
                      <option value="45">45 分钟 (主力冲刺流)</option>
                      <option value="60">60 分钟 (学霸爆肝流)</option>
                      <option value="90">90 分钟 (狂暴逆天改命流)</option>
                    </select>
                    <ChevronDown className="h-4 w-4 absolute right-3.5 top-3.5 text-[#434652] pointer-events-none" />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#003178]">口语降噪增强模式</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">自适应分析麦克风噪声，使影子口语发音评估准确度显著提升 15%</span>
                  </div>
                  <button
                    onClick={() => setWhisperNoiseReduction(!whisperNoiseReduction)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      whisperNoiseReduction ? 'bg-[#1b6d24]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 bg-white rounded-full absolute top-0.75 transition-all ${
                        whisperNoiseReduction ? 'right-0.75' : 'left-0.75'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT 1 COL: 计划预期 Card matching perfectly with screenshot style */}
          <div className="space-y-6">
            
            <div className="bg-[#eef7fc] border border-[#d2e2ec] rounded-3xl p-6.5 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-black text-[#003178]">计划预期</h3>
                <p className="text-[11px] text-gray-400 mt-1 font-semibold">
                  基于当前设置的实时模拟
                </p>
              </div>

              {/* AI logic details */}
              <div className="bg-white/80 border border-[#cbecfe] rounded-2xl p-4.5 text-xs text-[#003178]">
                <div className="flex items-center gap-1.5 font-bold text-xs mb-1.5">
                  <Sparkles className="h-4 w-4 text-[#003178]" />
                  <span>AI 生成逻辑</span>
                </div>
                <p className="text-[10.5px] leading-relaxed text-[#434652] font-medium">
                  系统根据考试倒计时 <span className="font-bold text-[#003178]">({daysRemaining}天)</span>、目标分数 <span className="font-bold text-[#003178]">({targetScore}+)</span> 及每日投入 <span className="font-bold text-[#003178]">({dailyTargetMinutes}分钟)</span> 动态计算训练节奏。
                </p>
              </div>

              {/* Grid simulations */}
              <div className="space-y-4 pt-1">
                <div className="flex justify-between items-baseline border-b border-gray-100 pb-2.5">
                  <span className="text-xs font-bold text-[#434652]">距考试天数</span>
                  <span className="text-2xl font-black text-[#003178]">{daysRemaining}</span>
                </div>

                <div className="flex justify-between items-baseline border-b border-gray-100 pb-2.5">
                  <span className="text-xs font-bold text-[#434652]">预计总学习时长</span>
                  <span className="text-2xl font-black text-[#003178]">{totalStudyHours}h</span>
                </div>

                <div className="space-y-1.5 border-b border-gray-100 pb-3">
                  <div className="flex justify-between text-xs font-bold text-[#434652]">
                    <span>训练强度</span>
                    <span className="text-emerald-700 font-extrabold">{intensityText}</span>
                  </div>
                  {/* Custom animated/green progress bar */}
                  <div className="w-full h-2 bg-gray-200/80 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${intensityColor} transition-all duration-300`} 
                      style={{ width: `${intensityPercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="block text-[10px] font-bold text-gray-400">计划策略</span>
                  <span className="text-xs font-black text-[#003178] leading-tight">
                    {intensityStrategy}
                  </span>
                </div>
              </div>

              {/* Huge Blue Action button */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                  className="w-full px-5 py-3.5 bg-[#003178] hover:bg-[#07244f] disabled:bg-gray-400 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all cursor-pointer shadow-xs"
                >
                  {isGeneratingPlan ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>正在重构中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-emerald-300 fill-emerald-300 animate-pulse" />
                      <span>生成专属学习计划</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[9.5px] text-[#434652] font-bold opacity-80">
                  <Lock className="h-3 w-3 text-[#003178]" />
                  <span>AI 引擎正在计算</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Clean elegant footer copyright notes aligned with bottom screenshot */}
      <footer className="shrink-0 pt-4 border-t border-[#cfe6f2] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#434652] opacity-75 sm:py-2 select-none">
        <div>
          © 2026 英语训练舱 AI Study Coach
        </div>
        <div className="flex items-center space-x-4 mt-2 sm:mt-0 font-bold">
          <a href="#privacy" onClick={(e) => { 
            e.preventDefault(); 
            if (onTriggerModal) {
              onTriggerModal("隐私保障协议", "备考训练舱极其看重您的数据隐私：\n\n1. 练习记录、错题复习队列、目标设置和能力画像默认保存在当前浏览器 IndexedDB 中；更换浏览器、清空浏览器数据或更换设备后可能无法自动恢复。\n\n2. 口语录音文件不上传；若您点击口语 AI 分析，页面会把口语文本发送到本服务端并转交已配置的 AI 供应商处理。请不要输入身份证号、手机号、学校账号密码等敏感信息。");
            } else {
              triggerToast("隐私协议：学习记录默认保存在当前浏览器，AI 分析会发送必要文本。");
            }
          }} className="hover:text-[#003178] transition-colors">隐私协议</a>
          <span>•</span>
          <a href="#terms" onClick={(e) => { 
            e.preventDefault(); 
            if (onTriggerModal) {
              onTriggerModal("服务条款说明", "欢迎使用智能备考备考舱服务：\n\n1. 本训练舱旨在通过 AI 算力与自然语言能力优化，为广大学子提供高水准、自适应、定制化的四六级听说读写一栈式备考辅助。\n\n2. 用户在使用影子口语重说等模块时建议使用高质量麦克风以便获得最佳体验。");
            } else {
              triggerToast("服务条款：本系统由 AI 开发并为您的大学英语四六级考试提供自适应答疑服务。");
            }
          }} className="hover:text-[#003178] transition-colors">服务条款</a>
          <span>•</span>
          <a href="#developer" onClick={(e) => { 
            e.preventDefault(); 
            if (onTriggerModal) {
              onTriggerModal("开发者资源中心", "大学英语超级智能自适应备考训练舱由 AI 全栈式开发，结合了 React 超高密度单网页架构与 Antigravity 极致性能底色。我们的目标是运用 AI 自适应和记忆周期算法改变每一个学子的复习逻辑。祝您顺利斩获高分！");
            } else {
              triggerToast("开发者中心：欢迎使用超级自适应 CET-4 备考舱。本产品基于 Antigravity 强劲架构。");
            }
          }} className="hover:text-[#003178] transition-colors">开发者中心</a>
        </div>
      </footer>

    </div>
  );
}
