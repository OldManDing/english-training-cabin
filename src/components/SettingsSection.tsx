import React, { useEffect, useState } from 'react';
import { Flag, LayoutGrid, Target, Calendar, Check, Lock, Sparkles, Sliders, ChevronDown, Save, Sparkle, RefreshCw, Database, Download, Upload } from 'lucide-react';
import { exportLearningData, getOrCreateActiveGoal, mergeLearningData } from '../lib/storage/db';
import { getStoredAuthToken } from '../lib/api';
import { syncAllLocalLearningData } from '../lib/storage/authoritativeLearningSync';
import SaasAccountPanel from './SaasAccountPanel';
import UserFeedbackPanel from './UserFeedbackPanel';
import LegalLinks from './LegalLinks';
import { listPublicExamProfiles } from '../exams/registry';
import { DateField, SelectField } from './controls/FormControls';
import { getSuggestedExamDate } from '../domain/planner/defaultExamDate';

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
  initialPrepareSpeaking?: boolean;
  initialSkillLevels?: Partial<Record<'reading' | 'listening' | 'translation' | 'writing' | 'speaking', number>>;
  initialRecordingQualityReminder?: boolean;
  onSetScoreLimit?: (score: number) => void;
  onTriggerModal?: (title: string, body: string) => void;
  onDataRestored?: () => Promise<void>;
  onServerDataRestored?: () => Promise<void>;
}

const examOptions = listPublicExamProfiles();

function toSettingsExamType(examId?: string): string {
  if (examId === 'cet6') return 'cet6';
  if (examId === 'ielts') return 'ielts';
  if (examId === 'toefl') return 'toefl';
  return 'cet4';
}

export default function SettingsSection({ onSave, targetScoreLimit = 550, initialExamId, initialExamDate, initialDailyMinutes, initialPrepareSpeaking = true, initialSkillLevels, initialRecordingQualityReminder = true, onSetScoreLimit, onTriggerModal, onDataRestored, onServerDataRestored }: SettingsSectionProps) {
  // Local Settings States matching the screenshot
  const [examType, setExamType] = useState<string>(toSettingsExamType(initialExamId));
  const [examDate, setExamDate] = useState<string>(initialExamDate ?? getSuggestedExamDate());
  const [prepareSpeaking, setPrepareSpeaking] = useState<boolean>(initialPrepareSpeaking);
  
  // Base skill levels: 0 = 入门, 1 = 中级, 2 = 高级
  const [readingLevel, setReadingLevel] = useState<number>(initialSkillLevels?.reading ?? 1);
  const [listeningLevel, setListeningLevel] = useState<number>(initialSkillLevels?.listening ?? 1);
  const [translationLevel, setTranslationLevel] = useState<number>(initialSkillLevels?.translation ?? 0);
  const [writingLevel, setWritingLevel] = useState<number>(initialSkillLevels?.writing ?? 1);
  const [speakingLevel, setSpeakingLevel] = useState<number>(initialSkillLevels?.speaking ?? 0);

  const [targetScore, setTargetScore] = useState<number>(targetScoreLimit);
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState<number>(initialDailyMinutes ?? 60); // 60 minutes as in screenshot
  
  // Extra settings
  const [whisperNoiseReduction, setWhisperNoiseReduction] = useState<boolean>(initialRecordingQualityReminder);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [showAccountAndRecovery, setShowAccountAndRecovery] = useState(() => (
    typeof window === 'undefined' || !window.matchMedia('(max-width: 767px)').matches
  ));

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

  useEffect(() => {
    setPrepareSpeaking(initialPrepareSpeaking);
    setReadingLevel(initialSkillLevels?.reading ?? 1);
    setListeningLevel(initialSkillLevels?.listening ?? 1);
    setTranslationLevel(initialSkillLevels?.translation ?? 0);
    setWritingLevel(initialSkillLevels?.writing ?? 1);
    setSpeakingLevel(initialSkillLevels?.speaking ?? 0);
    setWhisperNoiseReduction(initialRecordingQualityReminder);
  }, [initialPrepareSpeaking, initialRecordingQualityReminder, initialSkillLevels?.listening, initialSkillLevels?.reading, initialSkillLevels?.speaking, initialSkillLevels?.translation, initialSkillLevels?.writing]);

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
    if (new Date(`${examDate}T23:59:59`).getTime() < Date.now()) {
      triggerToast('考试日期已过，请先更新日期。');
      return;
    }
    try {
      await persistCurrentSettings();
      triggerToast("训练目标已保存，今日计划会随目标更新。");
    } catch (error) {
      console.error('Failed to save study settings:', error);
      triggerToast("保存失败：服务器暂时未确认学习目标，请稍后重试。");
    }
  };

  const handleGeneratePlan = async () => {
    if (new Date(`${examDate}T23:59:59`).getTime() < Date.now()) {
      triggerToast('考试日期已过，请先更新日期。');
      return;
    }
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
      await getOrCreateActiveGoal();
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
      const restored = await mergeLearningData(backup);
      const token = getStoredAuthToken();
      let serverSummary = '登录后会自动保存到服务器。';
      let serverConfirmed = false;
      if (token) {
        try {
          const confirmedCount = await syncAllLocalLearningData(token);
          serverSummary = `服务器已确认 ${confirmedCount} 项记录。`;
          serverConfirmed = true;
        } catch (error) {
          console.error('Failed to confirm merged learning data on server:', error);
          serverSummary = '本地合并已保留；网络恢复后请执行一次服务器对账。';
        }
      }
      await onDataRestored?.();
      const summary = `合并完成：目标 ${restored.studyGoals} 项、练习 ${restored.practiceSessions} 组、答题 ${restored.attempts} 条、错题复习 ${restored.reviewItems} 项、能力画像 ${restored.skillProfiles} 项。现有记录没有被删除。${serverSummary}`;
      onTriggerModal?.('学习数据合并完成', summary);
      triggerToast(serverConfirmed ? '备份已合并并保存到服务器。' : '备份已合并，现有学习记录未被删除。');
    } catch (error) {
      console.error('Failed to restore learning data:', error);
      triggerToast('恢复失败：请导入由英语训练舱导出的有效 JSON 备份。');
    }
  };

  // Helper arrays
  const levelLabels = ["入门", "中级", "高级"];

  // Derived calculation values matching simulated statistics
  const daysRemaining = Math.max(0, Math.ceil((new Date(`${examDate}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000));
  const examDateExpired = new Date(`${examDate}T23:59:59`).getTime() < Date.now();
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
    intensityColor = "bg-rose-600";
    intensityStrategy = "高强度限时训练与错因复盘方案";
  } else if (dailyTargetMinutes >= 60) {
    intensityText = "中等";
    intensityPercent = 65;
    intensityColor = "bg-[#1b6d24]";
    intensityStrategy = "笔试主目标 + 口语并行策略";
  }

  return (
    <div className="app-page-surface ui-page relative select-none">
      
      {/* Sliding Toast mechanism at top center */}
      {toastMessage && (
        <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-[#003178] text-white px-4 sm:px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-bold border border-[#cfe6f2]">
          <Sparkle className="h-4.5 w-4.5 text-emerald-300 fill-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Header Group */}
      <div className="ui-page-content shrink-0 mb-6">
        <header className="ui-page-header-compact flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[#101828]">
              目标与计划设置
            </h2>
            <p className="text-sm font-semibold text-slate-500 sm:text-base mt-2">
              调整目标、时间和数据安全。
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

      <div className="ui-page-content flex-1 overflow-y-auto space-y-6 pb-12 lg:space-y-8 lg:pr-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8 items-start">
          
          {/* LEFT 2 COLS: Standard forms and sub-section blocks */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card 1: 考试目标 */}
            <div className="ui-panel space-y-5">
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
                  {examDateExpired && (
                    <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-800">
                      该考试日期已过，请更新日期后再生成训练计划。
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom checkbox item */}
              <div className="pt-3 border-t border-gray-100 flex items-center">
                <button
                  type="button"
                  aria-pressed={prepareSpeaking}
                  onClick={() => setPrepareSpeaking(!prepareSpeaking)}
                  className="ui-button ui-button-muted w-full justify-start text-left sm:w-auto"
                >
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                    prepareSpeaking 
                      ? 'bg-[#003178] border-[#003178] text-white shadow-xs' 
                      : 'border-[#c3c6d4] bg-[#f8fafc] group-hover:border-[#003178]'
                  }`}>
                    {prepareSpeaking && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                  <span>准备 CET-4 口语</span>
                </button>
              </div>
            </div>

            {/* Sub-block Container: "当前基础" Header on Left column, "目标分数" on Right column under same row */}
            <div className="ui-panel">
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
            <div className="ui-panel space-y-5">
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
                    <span className="text-[10px] text-gray-400 mt-0.5">训练前提醒安静环境和清晰麦克风。</span>
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

            <details
              open={showAccountAndRecovery}
              onToggle={(event) => setShowAccountAndRecovery(event.currentTarget.open)}
              className="space-y-4"
            >
              <summary className="ui-panel flex cursor-pointer list-none items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-[#003178]">账号、备份与反馈</h3>
                  <p className="mt-1 text-[11px] font-semibold leading-5 text-[#434652]">查看同步状态、恢复点和低频管理工具。</p>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-[#003178] transition-transform ${showAccountAndRecovery ? 'rotate-180' : ''}`} />
              </summary>
              <div className="space-y-4 pt-4">
                <SaasAccountPanel
                  onTriggerModal={onTriggerModal}
                  onServerDataRestored={onServerDataRestored}
                />

                <div className="ui-panel space-y-4">
                  <h3 className="text-sm font-black text-[#003178] flex items-center gap-2">
                    <Database className="h-4 w-4 text-[#003178]" />
                    数据安全与恢复
                  </h3>
                  <p className="text-[11px] leading-5 text-[#434652] font-semibold">
                    服务器是主存储；浏览器是当前账号的离线工作副本。导入备份只合并，不会删除现有记录。
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
                      合并本地备份
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

                <UserFeedbackPanel pageContext="settings" />
              </div>
            </details>

          </div>

          {/* RIGHT 1 COL: 计划预期 Card matching perfectly with screenshot style */}
          <div className="space-y-6">
            
            <div className="ui-panel space-y-6">
              <div>
                <h3 className="text-base font-black text-[#003178]">计划预期</h3>
                <p className="text-[11px] text-gray-400 mt-1 font-semibold">
                  基于当前设置估算
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  [`${daysRemaining}天`, '倒计时'],
                  [`${targetScore}+`, '目标分'],
                  [`${dailyTargetMinutes}m`, '每日'],
                ].map(([value, label]) => (
                  <div key={label} className="ui-metric">
                    <div className="text-sm font-black text-[#003178]">{value}</div>
                    <div className="text-[10px] font-bold text-slate-400">{label}</div>
                  </div>
                ))}
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
                  disabled={isGeneratingPlan || examDateExpired}
                  className="ui-button ui-button-primary ui-button-full"
                >
                  {isGeneratingPlan ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>正在更新...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-emerald-300 fill-emerald-300" />
                      <span>更新今日计划</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[9.5px] text-[#434652] font-bold opacity-80">
                  <Lock className="h-3 w-3 text-[#003178]" />
                  <span>根据账号目标和练习证据更新</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      <footer className="shrink-0 pt-4 border-t border-[#cfe6f2] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#434652] opacity-75 sm:py-2 select-none">
        <div>
            © 2026 英语训练舱 English Training System
        </div>
        <LegalLinks onOpen={onTriggerModal} compact className="mt-2 sm:mt-0" />
      </footer>

    </div>
  );
}
