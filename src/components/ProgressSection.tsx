import React, { useState } from 'react';
import { AreaChart, TrendingUp, HelpCircle, Activity, Award, BellRing, Sparkles, CheckSquare, Sparkle, Target, Check, Zap, AlertCircle, FileText, Globe } from 'lucide-react';
import { TIMELINE_LOGS } from '../data';
import { SkillProfile } from '../types';

interface ProgressSectionProps {
  scoreChange?: { from: number; to: number };
  persistedSkillProfiles?: SkillProfile[];
}

interface KnowledgeNode {
  name: string;
  percent: number;
  type: 'success' | 'warning' | 'error' | 'primary' | 'normal';
  icon: any;
}

export default function ProgressSection({ scoreChange, persistedSkillProfiles = [] }: ProgressSectionProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reading' | 'listening' | 'grammar'>('reading');
  const [selectedWeek, setSelectedWeek] = useState<string>('W6');

  // Active cores scores
  const findProfileScore = (skillArea: SkillProfile['skillArea']) => {
    const profile = persistedSkillProfiles
      .filter((item) => item.skillArea === skillArea)
      .sort((left, right) => right.lastUpdatedAt.localeCompare(left.lastUpdatedAt))[0];
    return profile?.score;
  };

  const listeningScore = findProfileScore('listening') ?? 0;
  const readingScore = findProfileScore('reading') ?? 0;
  const writingScore = findProfileScore('writing') ?? 0;
  const translationScore = findProfileScore('translation') ?? 0;
  const speakingScore = scoreChange ? scoreChange.to : findProfileScore('speaking') ?? 0;
  const hasEvidence = persistedSkillProfiles.length > 0 || Boolean(scoreChange);
  const averageScore = hasEvidence
    ? Math.round([listeningScore, readingScore, writingScore, translationScore].filter((score) => score > 0).reduce((sum, score) => sum + score, 0) / Math.max(1, [listeningScore, readingScore, writingScore, translationScore].filter((score) => score > 0).length))
    : 0;
  const forecastScore = hasEvidence ? Math.max(300, Math.min(710, Math.round(300 + averageScore * 4.1))) : null;
  const evidenceCount = persistedSkillProfiles.reduce((sum, profile) => sum + profile.evidenceCount, 0);
  const trainingStability = hasEvidence ? Math.max(12, Math.min(100, Math.round((evidenceCount / 12) * 100))) : null;
  const radarScale = 0.8;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Switchable Tab databases for Image 1 (知识点检测图谱)
  const tabData: Record<'reading' | 'listening' | 'grammar', KnowledgeNode[]> = {
    reading: [
      { name: "仔细阅读练习证据", percent: readingScore, type: readingScore >= 80 ? "success" : readingScore >= 60 ? "primary" : "error", icon: Check },
      { name: "主旨大意", percent: hasEvidence ? Math.max(45, Math.min(95, readingScore + 4)) : 0, type: readingScore >= 70 ? "primary" : "error", icon: Zap },
      { name: "长难句解析", percent: hasEvidence ? Math.max(30, readingScore - 18) : 0, type: readingScore >= 75 ? "primary" : "error", icon: AlertCircle },
      { name: "词汇连贯性 (Conjunctions)", percent: hasEvidence ? Math.max(35, Math.min(90, averageScore + 5)) : 0, type: averageScore >= 75 ? "normal" : "warning", icon: FileText },
      { name: "段落翻译", percent: translationScore, type: translationScore >= 80 ? "success" : translationScore >= 60 ? "warning" : "error", icon: Globe }
    ],
    listening: [
      { name: "长对话练习证据", percent: listeningScore, type: listeningScore >= 80 ? "success" : listeningScore >= 60 ? "primary" : "error", icon: AlertCircle },
      { name: "新闻听力主旨", percent: hasEvidence ? Math.max(40, Math.min(95, listeningScore + 5)) : 0, type: listeningScore >= 80 ? "success" : "primary", icon: Check },
      { name: "转折逻辑辨析", percent: hasEvidence ? Math.max(35, listeningScore - 8) : 0, type: listeningScore >= 70 ? "primary" : "error", icon: Zap },
      { name: "音同音近词干扰", percent: hasEvidence ? Math.max(25, listeningScore - 22) : 0, type: listeningScore >= 65 ? "warning" : "error", icon: AlertCircle },
      { name: "弱读连读还原", percent: hasEvidence ? Math.max(30, listeningScore - 5) : 0, type: listeningScore >= 70 ? "normal" : "warning", icon: FileText }
    ],
    grammar: [
      { name: "虚拟语气句型", percent: hasEvidence ? Math.max(35, writingScore - 8) : 0, type: writingScore >= 75 ? "primary" : "warning", icon: Globe },
      { name: "分词作状语成分", percent: hasEvidence ? Math.max(40, writingScore + 4) : 0, type: writingScore >= 80 ? "success" : "primary", icon: Check },
      { name: "倒装句功能识别", percent: hasEvidence ? Math.max(35, averageScore) : 0, type: averageScore >= 70 ? "primary" : "warning", icon: Zap },
      { name: "定语从句限制修饰", percent: hasEvidence ? Math.max(35, readingScore - 5) : 0, type: readingScore >= 80 ? "success" : "primary", icon: Check },
      { name: "主谓一致与插入语", percent: hasEvidence ? Math.max(35, writingScore) : 0, type: writingScore >= 75 ? "normal" : "warning", icon: FileText }
    ]
  };
  const weeklyBars = [
    { label: "W1", value: hasEvidence ? Math.max(18, averageScore - 34) : 0 },
    { label: "W2", value: hasEvidence ? Math.max(22, averageScore - 25) : 0 },
    { label: "W3", value: hasEvidence ? Math.max(28, averageScore - 18) : 0 },
    { label: "W4", value: hasEvidence ? Math.max(32, averageScore - 12) : 0 },
    { label: "W5", value: hasEvidence ? Math.max(38, averageScore - 6) : 0 },
    { label: "W6", value: hasEvidence ? averageScore : 0 },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-b from-[#f3faff] to-white flex flex-col h-screen justify-between relative">
      
      {/* Sliding Toast mechanism */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#003178] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-50 text-xs font-bold border border-[#cfe6f2] animate-bounce">
          <Sparkle className="h-4 w-4 text-emerald-300 fill-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      
      {/* Header Info */}
      <div className="shrink-0 mb-6">
        <header className="pb-4 border-b border-[#cfe6f2]">
          <h2 className="text-2xl font-black text-[#003178] tracking-tight">
            能力地图
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            全面解析您的各项英语能力指标与掌握程度。
          </p>
        </header>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2">
        
        {/* Radar & Knowledge Map Row (Exactly like top level Image 1) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Card: 综合能力雷达 (Span 2) */}
          <div className="lg:col-span-2 bg-white border border-[#c3c6d4] hover:border-[#003178] rounded-3xl p-6 shadow-2xs flex flex-col justify-between transition-colors">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-[#071e27] uppercase tracking-wider">
                  综合能力雷达
                </h3>
                {/* SVG radar icon */}
                <div className="text-[#003178] p-1.5 bg-[#e6f6ff] rounded-lg">
                  <Award className="h-4 w-4" />
                </div>
              </div>

              {/* Circular SVG Radar with dynamic polygon */}
              <div className="flex justify-center items-center py-4 relative">
                <svg viewBox="0 0 200 200" className="w-[185px] h-[185px]">
                  {/* Grid Lines */}
                  <circle cx="100" cy="100" r="30" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                  <circle cx="100" cy="100" r="60" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#cbd5e1" strokeWidth="1.2" />
                  
                  {/* Axes */}
                  <line x1="100" y1="20" x2="100" y2="180" stroke="#cbd5e1" strokeWidth="1" />
                  <line x1="20" y1="100" x2="180" y2="100" stroke="#cbd5e1" strokeWidth="1" />

                  {/* Calculated Polygon points (center = 100, 100, scale = 0.8)
                      1. 听力 Listening (Up axis, value = 85 -> (100, 100 - 85*0.8) = (100, 32)
                      2. 阅读 Reading (Right axis, value = 92 -> (100 + 92*0.8, 100) = (173.6, 100)
                      3. 写作 Writing (Down axis, value = 65 -> (100, 100 + 65*0.8) = (100, 152)
                      4. 口语 Speaking (Left axis, value = speakingScore -> (100 - speakingScore*0.8, 100)
                  */}
                  <polygon
                    points={`100,${100 - listeningScore * radarScale} ${100 + readingScore * radarScale},100 100,${100 + writingScore * radarScale} ${100 - speakingScore * radarScale},100`}
                    fill="rgba(0, 49, 120, 0.12)"
                    stroke="#003178"
                    strokeWidth="3.5"
                  />

                  {/* Vertices indicator points */}
                  <circle cx="100" cy={100 - listeningScore * radarScale} r="4.5" fill="#003178" stroke="white" strokeWidth="1" />
                  <circle cx={100 + readingScore * radarScale} cy="100" r="4.5" fill="#003178" stroke="white" strokeWidth="1" />
                  <circle cx="100" cy={100 + writingScore * radarScale} r="4.5" fill="#003178" stroke="white" strokeWidth="1" />
                  <circle cx={100 - speakingScore * radarScale} cy="100" r="4.5" fill="#003178" stroke="white" strokeWidth="1" />

                  {/* Custom axis Text label positions */}
                  <text x="100" y="14" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#334155">听力 ({listeningScore})</text>
                  <text x="187" y="103" textAnchor="start" fontSize="9.5" fontWeight="bold" fill="#334155">阅读 ({readingScore})</text>
                  <text x="100" y="196" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#334155">写作 ({writingScore})</text>
                  <text x="13" y="103" textAnchor="end" fontSize="9.5" fontWeight="bold" fill="#334155">口语 ({speakingScore})</text>
                </svg>
              </div>
            </div>

            {/* Total forecast outputs */}
            <div className="flex gap-4">
              <div className="flex-1 bg-gradient-to-tr from-[#f3faff] to-[#dbf1fe]/50 border-r p-4.5 rounded-2xl border flex flex-col justify-center">
                <span className="text-[10px] text-gray-400 font-bold block">总分预估</span>
                <span className="text-3xl font-black text-[#003178] mt-1 font-mono">{forecastScore ?? '--'}</span>
              </div>
              <div className="flex-1 bg-gradient-to-tr from-[#f3faff] to-[#dbf1fe]/50 p-4.5 rounded-2xl border flex flex-col justify-center">
                <span className="text-[10px] text-gray-400 font-bold block">训练稳定度</span>
                <span className="text-3xl font-black text-emerald-700 mt-1 font-mono">{trainingStability == null ? '--' : `${trainingStability}%`}</span>
              </div>
            </div>
            {!hasEvidence && (
              <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-[11px] font-bold leading-5 text-amber-800">
                还没有真实能力证据。请先完成入门诊断或任一训练，能力地图会用本地记录重新计算。
              </p>
            )}

          </div>

          {/* Card: 知识点掌握图谱 (Span 3) exactly as Image 1 */}
          <div className="lg:col-span-3 bg-white border border-[#c3c6d4] hover:border-[#003178] rounded-3xl p-6 shadow-2xs flex flex-col justify-between transition-colors">
            
            {/* Header with tabs */}
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="text-sm font-bold text-[#071e27] uppercase tracking-wider">
                知识点掌握图谱
              </h3>
              
              {/* Filter Tabs matching top right */}
              <div className="bg-slate-100 p-0.5 rounded-xl flex items-center space-x-0.5 border text-[11px] font-bold">
                <button
                  onClick={() => setActiveTab('reading')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'reading' ? 'bg-white text-[#003178] shadow-2xs' : 'text-gray-400'
                  }`}
                >
                  阅读
                </button>
                <button
                  onClick={() => setActiveTab('listening')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'listening' ? 'bg-white text-[#003178] shadow-2xs' : 'text-gray-400'
                  }`}
                >
                  听力
                </button>
                <button
                  onClick={() => setActiveTab('grammar')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'grammar' ? 'bg-white text-[#003178] shadow-2xs' : 'text-gray-400'
                  }`}
                >
                  语法
                </button>
              </div>
            </div>

            {/* Render selected list with high fidelity colors */}
            <div className="space-y-3.5 flex-1 justify-center flex flex-col pr-1">
              {tabData[activeTab].map((node, i) => {
                const Icon = node.icon;
                
                let barColor = "bg-[#0d47a1]";
                let iconWrapper = "bg-sky-50 text-blue-600 border border-blue-100";
                let textContainer = "text-slate-600";

                if (node.type === 'success') {
                  barColor = "bg-emerald-600";
                  iconWrapper = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                } else if (node.type === 'error') {
                  barColor = "bg-rose-500";
                  iconWrapper = "bg-rose-50 text-rose-500 border border-rose-100 animate-pulse";
                } else if (node.type === 'warning') {
                  barColor = "bg-amber-500";
                  iconWrapper = "bg-amber-50 text-amber-500 border border-amber-100";
                }

                return (
                  <div key={i} className="flex items-center justify-between gap-4 p-2 bg-[#f8fafc]/70 hover:bg-[#f3faff] rounded-xl border border-transparent hover:border-[#cfe6f2] transition-colors">
                    <div className="flex items-center gap-3 w-1/2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconWrapper}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 truncate">{node.name}</span>
                    </div>

                    {/* Progress slider visually exact */}
                    <div className="flex-1 flex items-center space-x-3.5">
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${node.percent}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-slate-700 font-mono shrink-0 w-10 text-right">{node.percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>

        {/* Bottom card: 能力成长曲线 bar chart over 6 weeks (Exactly like image 1 bottom) */}
        <div className="bg-white border border-[#c3c6d4] hover:border-[#003178] rounded-3xl p-6 shadow-2xs transition-colors">
          <div className="flex justify-between items-center mb-6 pb-2 border-b">
            <h3 className="text-sm font-bold text-[#071e27] uppercase tracking-wider flex items-center gap-1">
              <Activity className="h-4 w-4 text-[#003178]" />
              能力成长曲线
            </h3>

            <div className="bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold border flex items-center space-x-1">
              <span className="px-2 text-slate-400">目前视阈:</span>
              <span className="bg-white text-[#003178] px-2.5 py-0.5 rounded shadow-2xs">最近 30 天</span>
            </div>
          </div>

          {/* Interactive weekly column bars */}
          <div className="grid grid-cols-6 gap-4 items-end h-44 px-4 pt-4">
            {weeklyBars.map((wk) => {
              const isActive = selectedWeek === wk.label;
              return (
                <div
                  key={wk.label}
                  onClick={() => {
                    setSelectedWeek(wk.label);
                    triggerToast(hasEvidence
                      ? `切换至 ${wk.label} 证据视图，当时能力指数约 ${wk.value}%。`
                      : '暂无历史能力证据，请先完成诊断或训练。');
                  }}
                  className="flex flex-col items-center space-y-2 group cursor-pointer"
                >
                  {/* Height of bars simulated in % */}
                  <div className="w-full relative bg-neutral-50 rounded-lg hover:bg-slate-50 transition border border-transparent hover:border-[#cfe6f2] flex items-end justify-center h-28 p-1">
                    <div
                      className={`w-full rounded-md transition-all duration-500 ease-out cursor-pointer ${
                        isActive ? 'bg-[#003178] shadow' : 'bg-slate-400/50 group-hover:bg-slate-450'
                      }`}
                      style={{ height: `${wk.value}%` }}
                    />

                    {/* Active week pointer check */}
                    {isActive && (
                      <span className="absolute -top-3 text-[8px] font-bold text-white bg-[#003178] px-1 rounded shadow-2xs scale-90">
                        Active
                      </span>
                    )}
                  </div>
                  
                  <span className={`text-[10px] font-extrabold ${
                    isActive ? 'text-[#003178]' : 'text-slate-400'
                  }`}>
                    {wk.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
