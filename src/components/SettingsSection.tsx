import React, { useEffect, useState } from 'react';
import { Flag, LayoutGrid, Target, Calendar, Check, Lock, Sparkles, Sliders, ChevronDown, Save, Sparkle, RefreshCw, Database, Download, Upload } from 'lucide-react';
import { exportLearningData, importLearningData } from '../lib/storage/db';
import SaasAccountPanel from './SaasAccountPanel';
import { listPublicExamProfiles } from '../exams/registry';
import { DateField, SelectField } from './controls/FormControls';

interface SettingsSectionProps {
  onSave?: (settings: {
    examType: string;
    examDate: string;
    prepareSpeaking: boolean;
    readingLevel: number;
    listeningLevel: number;
    translationLevel: number;
    writingLevel: number;
    speakingLevel: number;
    targetScore: number;
    dailyTargetMinutes: number;
    whisperNoiseReduction: boolean;
  }) => void | Promise<void>;
  targetScoreLimit?: number;
  initialExamId?: string;
  initialExamDate?: string;
  initialDailyMinutes?: number;
  onSetScoreLimit?: (score: number) => void;
  onTriggerModal?: (title: string, body: string) => void;
  onDataRestored?: () => Promise<void>;
}

const examOptions = listPublicExamProfiles();

function toSettingsExamType(examId?: string): string {
  if (examId === 'cet6') return 'cet6';
  if (examId === 'ielts') return 'ielts';
  if (examId === 'toefl') return 'toefl';
  return 'cet4';
}

export default function SettingsSection({ onSave, targetScoreLimit = 550, initialExamId, initialExamDate, initialDailyMinutes, onSetScoreLimit, onTriggerModal, onDataRestored }: SettingsSectionProps) {
  // Local Settings States matching the screenshot
  const [examType, setExamType] = useState<string>(toSettingsExamType(initialExamId));
  const [examDate, setExamDate] = useState<string>(initialExamDate ?? "2026-06-13");
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
    setExamType(toSettingsExamType(initialExamId));
  }, [initialExamId]);

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

  const getSettingsPayload = () => ({
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
    whisperNoiseReduction,
  });

  const persistCurrentSettings = async () => {
    if (onSave) {
      await onSave(getSettingsPayload());
      return;
    }
    onSetScoreLimit?.(targetScore);
  };

  const handleSaveSettings = async () => {
    try {
      await persistCurrentSettings();
      triggerToast("训练目标已保存到当前浏览器，今日计划会随目标更新。");
    } catch (error) {
      console.error('Failed to save study settings:', error);
      triggerToast("保存失败：当前浏览器暂时无法写入学习目标。");
    }
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      await persistCurrentSettings();
      triggerToast("今日训练计划已根据当前目标、时间和口语开关更新。");
    } catch (error) {
      console.error('Failed to regenerate study plan:', error);
      triggerToast("计划更新失败：请先检查目标设置是否可保存。");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleExportLearningData = async () => {
    try {
      const backup = await exportLearningData();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const date = backup.exportedAt.slice(0, 10);
      anchor.href = url;
      anchor.download = `英语训练舱-学习数据备份-${date}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      triggerToast('学习数据备份已导出，请妥善保存文件。');
    } catch (error) {
      console.error('Failed to export learning data:', error);
      triggerToast('学习数据导出失败，请稍后重试。');
    }
  };

  const handleRestoreLearningData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      triggerToast('备份文件超过 2 MB，请确认文件是否正确。');
      return;
    }

    try {
      const backup = JSON.parse(await file.text()) as unknown;
      const restored = await importLearningData(backup);
      await onDataRestored?.();
      const summary = `恢复完成：目标 ${restored.studyGoals} 项、练习 ${restored.practiceSessions} 组、错题复习 ${restored.reviewItems} 项、能力画像 ${restored.skillProfiles} 项。`;
      onTriggerModal?.('学习数据恢复完成', summary);
      triggerToast('学习数据已恢复到当前浏览器。');
    } catch (error) {
      console.error('Failed to restore learning data:', error);
      triggerToast('恢复失败：请导入由英语训练舱导出的有效 JSON 备份。');
    }
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
    intensityStrategy = "高强度限时训练与错因复盘方案";
  } else if (dailyTargetMinutes >= 60) {
    intensityText = "中等";
    intensityPercent = 65;
    intensityColor = "bg-[#1b6d24]";
    intensityStrategy = "笔试主目标 + 口语并行策略";
  }

  return (
    <div className="app-page-surface flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden bg-[#f7fbff] min-h-[calc(100svh-9rem)] lg:h-screen flex flex-col justify-between relative select-none">
      
      {/* Sliding Toast mechanism at top center */}
      {toastMessage && (
        <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-[#003178] text-white px-4 sm:px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-bold border border-[#cfe6f2] animate-bounce">
          <Sparkle className="h-4.5 w-4.5 text-emerald-300 fill-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Header Group */}
      <div className="shrink-0 mb-6">
        <header className="pb-4 border-b border-[#cfe6f2] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            className="ui-button ui-button-primary ui-button-full sm:w-auto"
          >
            <Save className="h-4 w-4 text-emerald-300" />
            <span>保存设置</span>
          </button>
        </header>
      </div>

      {/* Main Responsive Grid Layout closely mirroring the uploaded UI design */}
      <div className="flex-1 overflow-y-auto space-y-6 lg:space-y-8 lg:pr-2 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8 items-start">
          
          {/* LEFT 2 COLS: Standard forms and sub-section blocks */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card 1: 考试目标 */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-6.5 shadow-sm space-y-5">
              <h3 className="text-sm font-black text-[#003178] flex items-center gap-2">
                <Flag className="h-4 w-4 text-[#003178]" />
                考试目标
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Exam type custom Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#434652]">目标考试</label>
                  <SelectField
                    ariaLabel="目标考试"
                    value={examType}
                    onChange={setExamType}
                    options={examOptions.map((exam) => ({
                      value: exam.id,
                      label: `${exam.name}${exam.routeAvailability === 'trainable' ? ' · 已开放训练闭环' : ' · 规划中'}`,
                      disabled: exam.routeAvailability !== 'trainable',
                    }))}
                  />
                </div>

                {/* Date Picker matching screens */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#434652]">考试日期</label>
                  <DateField ariaLabel="考试日期" value={examDate} onChange={setExamDate} />
                </div>
              </div>

              {/* Bottom checkbox item */}
              <div className="pt-3 border-t border-gray-100 flex items-center">
                <button
                  type="button"
                  aria-pressed={prepareSpeaking}
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
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-6.5 shadow-sm">
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
                      <div key={item.key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                        <span className="font-bold text-[#434652]">{item.label}</span>
                        <div className="grid grid-cols-3 sm:flex bg-[#f0f7fc] p-0.5 rounded-lg border border-[#cfe6f2] sm:scale-95 sm:origin-right">
                          {levelLabels.map((lbl, idx) => (
                            <button
                              key={lbl}
                              type="button"
                              aria-label={`${item.label} ${lbl}`}
                              aria-pressed={item.level === idx}
                              onClick={() => item.setLevel(idx)}
                              className={`text-[10px] font-bold px-3 py-2 sm:py-1 rounded-md transition-all ${
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
                        aria-label="目标分数"
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
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-6.5 shadow-sm space-y-5">
              <h3 className="text-sm font-black text-[#003178] flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#003178]" />
                学习参数
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#434652]">每日投入时长</label>
                  <SelectField
                    ariaLabel="每日投入时长"
                    value={String(dailyTargetMinutes)}
                    onChange={(nextValue) => setDailyTargetMinutes(parseInt(nextValue))}
                    options={[
                      { value: '30', label: '30 分钟 (轻量保持)' },
                      { value: '45', label: '45 分钟 (主力冲刺流)' },
                      { value: '60', label: '60 分钟 (稳定提升)' },
                      { value: '90', label: '90 分钟 (高强度冲刺)' },
                    ]}
                  />
                </div>

                <div className="pt-3 border-t border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#003178]">口语录音质量提醒</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">开启后会在口语训练中提示尽量使用安静环境和清晰麦克风。</span>
                  </div>
                  <button
                    type="button"
                    aria-label="切换口语录音质量提醒"
                    aria-pressed={whisperNoiseReduction}
                    onClick={() => setWhisperNoiseReduction(!whisperNoiseReduction)}
                    className={`relative h-11 w-16 shrink-0 rounded-full p-1 transition-colors ${
                      whisperNoiseReduction ? 'bg-[#1b6d24]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-2 h-7 w-7 rounded-full bg-white shadow-sm transition-all ${
                        whisperNoiseReduction ? 'right-2' : 'left-2'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-6.5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-[#003178] flex items-center gap-2">
                <Database className="h-4 w-4 text-[#003178]" />
                本地数据保险箱
              </h3>
              <p className="text-[11px] leading-5 text-[#434652] font-semibold">
                学习记录默认仅保存在当前浏览器。导出备份可用于更换设备前留存进度；恢复备份会覆盖当前浏览器中的学习记录。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExportLearningData}
                  className="ui-button ui-button-secondary ui-button-full"
                >
                  <Download className="h-4 w-4" />
                  导出学习数据
                </button>
                <label className="ui-button ui-button-primary ui-button-full cursor-pointer">
                  <Upload className="h-4 w-4" />
                  恢复学习数据
                  <input
                    data-testid="restore-learning-data-input"
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleRestoreLearningData}
                  />
                </label>
              </div>
            </div>

            <SaasAccountPanel
              onTriggerModal={onTriggerModal}
              onDataRestored={onDataRestored}
            />

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
                  <span>计划生成逻辑</span>
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
                  className="ui-button ui-button-primary ui-button-full"
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
                  <span>根据本地目标和练习证据更新</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Clean elegant footer copyright notes aligned with bottom screenshot */}
      <footer className="shrink-0 pt-4 border-t border-[#cfe6f2] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#434652] opacity-75 sm:py-2 select-none">
        <div>
            © 2026 英语训练舱 English Training System
        </div>
        <div className="flex items-center space-x-4 mt-2 sm:mt-0 font-bold">
          <a href="#privacy" onClick={(e) => { 
            e.preventDefault(); 
            if (onTriggerModal) {
              onTriggerModal("隐私保障协议", "英语训练舱重视您的数据隐私：\n\n1. 练习记录、错题复习队列、目标设置和能力画像默认保存在当前浏览器 IndexedDB 中；更换浏览器、清空浏览器数据或更换设备后可能无法自动恢复。\n\n2. 口语录音文件不上传；若您点击口语 AI 分析，页面会把口语文本发送到本服务端并转交已配置的 AI 供应商处理。请不要输入身份证号、手机号、学校账号密码等敏感信息。");
            } else {
              triggerToast("隐私协议：学习记录默认保存在当前浏览器，AI 分析会发送必要文本。");
            }
          }} className="hover:text-[#003178] transition-colors">隐私协议</a>
          <span>•</span>
          <a href="#terms" onClick={(e) => { 
            e.preventDefault(); 
            if (onTriggerModal) {
              onTriggerModal("服务条款说明", "欢迎使用英语训练舱：\n\n1. 本训练舱通过自适应计划、错因复习和 AI 反馈，辅助用户完成英语听说读写训练。\n\n2. 用户在使用影子跟读、口语重说等模块时，建议使用安静环境和清晰麦克风以获得更稳定的反馈。");
            } else {
              triggerToast("服务条款：本系统为大学英语训练提供自适应练习和反馈。");
            }
          }} className="hover:text-[#003178] transition-colors">服务条款</a>
          <span>•</span>
          <a href="#developer" onClick={(e) => { 
            e.preventDefault(); 
            if (onTriggerModal) {
              onTriggerModal("开发者资源中心", "英语训练舱采用 React、TypeScript、Vite、Dexie 与 Express 构建，当前重点是验证本地优先学习闭环、错因复习、材料导入和 AI 反馈接口。后续可继续扩展账号、云同步、多考试配置和更完整的内容授权体系。");
            } else {
              triggerToast("开发者中心：当前版本聚焦本地优先学习闭环与 AI 反馈接口。");
            }
          }} className="hover:text-[#003178] transition-colors">开发者中心</a>
        </div>
      </footer>

    </div>
  );
}
