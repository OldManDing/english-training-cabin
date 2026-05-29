import React, { useState } from 'react';
import { Activity, AlertCircle, Award, Check, Database, FileText, Globe, Sparkle, Zap } from 'lucide-react';
import { Attempt, PracticeSession, SkillProfile } from '../types';
import {
  buildAbilityEvidenceSummary,
  buildAbilityTimelineBars,
  buildEvidenceKnowledgeTabs,
  buildStageProgressSummary,
  type AbilityEvidenceTab,
  type AbilityNodeIcon,
} from '../domain/progress/abilityEvidence';
import { buildLearningEvidenceLedger, type EvidenceCoverageStatus } from '../domain/progress/evidenceLedger';

interface ProgressSectionProps {
  scoreChange?: { from: number; to: number };
  persistedSkillProfiles?: SkillProfile[];
  persistedPracticeSessions?: PracticeSession[];
  persistedAttempts?: Attempt[];
}

const KNOWLEDGE_NODE_ICONS: Record<AbilityNodeIcon, React.ComponentType<{ className?: string }>> = {
  check: Check,
  zap: Zap,
  alert: AlertCircle,
  file: FileText,
  globe: Globe,
};

const TAB_LABELS: Record<AbilityEvidenceTab, string> = {
  reading: '阅读',
  listening: '听力',
  grammar: '语法',
};

function barColor(type: string): string {
  if (type === 'success') return 'bg-emerald-600';
  if (type === 'error') return 'bg-rose-500';
  if (type === 'warning') return 'bg-amber-500';
  return 'bg-[#003178]';
}

function coverageBadgeClass(status: EvidenceCoverageStatus): string {
  if (status === 'strong') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'thin') return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function coverageLabel(status: EvidenceCoverageStatus): string {
  if (status === 'strong') return '证据充分';
  if (status === 'thin') return '证据偏薄';
  return '等待证据';
}

export default function ProgressSection({
  scoreChange,
  persistedSkillProfiles = [],
  persistedPracticeSessions = [],
  persistedAttempts = [],
}: ProgressSectionProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AbilityEvidenceTab>('reading');
  const [selectedWeek, setSelectedWeek] = useState<string>('W6');
  const abilitySummary = buildAbilityEvidenceSummary(persistedSkillProfiles, scoreChange);
  const evidenceKnowledgeTabs = buildEvidenceKnowledgeTabs(persistedSkillProfiles);
  const stageProgress = buildStageProgressSummary(persistedSkillProfiles);
  const weeklyBars = buildAbilityTimelineBars(persistedSkillProfiles);
  const evidenceLedger = buildLearningEvidenceLedger({
    sessions: persistedPracticeSessions,
    attempts: persistedAttempts,
    skillProfiles: persistedSkillProfiles,
  });
  const radarScale = 0.8;
  const { listening, reading, writing, speaking } = abilitySummary.scores;

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="app-page-surface flex min-h-[calc(100svh-9rem)] flex-1 flex-col overflow-y-auto overflow-x-hidden bg-[#f7fbff] p-4 sm:p-6 lg:h-screen lg:p-8">
      {toastMessage && (
        <div className="absolute left-4 right-4 top-4 z-50 flex items-center gap-2.5 rounded-2xl border border-[#cfe6f2] bg-[#003178] px-4 py-3 text-xs font-bold text-white shadow-xl sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-5">
          <Sparkle className="h-4 w-4 shrink-0 fill-emerald-300 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      <header className="mb-6 border-b border-[#cfe6f2] pb-4">
        <h2 className="text-2xl font-black tracking-tight text-[#003178]">能力地图</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          只展示已写入本地学习记录的能力证据；暂无证据的维度保持待诊断状态。
        </p>
      </header>

      <div className="space-y-5 lg:space-y-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-8">
          <section className="rounded-3xl border border-[#c3c6d4] bg-white p-4 shadow-2xs transition-colors hover:border-[#003178] sm:p-6 lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#071e27]">综合能力雷达</h3>
              <div className="rounded-lg bg-[#e6f6ff] p-1.5 text-[#003178]">
                <Award className="h-4 w-4" />
              </div>
            </div>

            <div className="flex justify-center py-4">
              <svg viewBox="0 0 200 200" className="h-[185px] w-[185px]" aria-label="能力雷达图">
                <circle cx="100" cy="100" r="30" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                <circle cx="100" cy="100" r="60" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                <circle cx="100" cy="100" r="80" fill="none" stroke="#cbd5e1" strokeWidth="1.2" />
                <line x1="100" y1="20" x2="100" y2="180" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="20" y1="100" x2="180" y2="100" stroke="#cbd5e1" strokeWidth="1" />
                <polygon
                  points={`100,${100 - listening * radarScale} ${100 + reading * radarScale},100 100,${100 + writing * radarScale} ${100 - speaking * radarScale},100`}
                  fill="rgba(0, 49, 120, 0.12)"
                  stroke="#003178"
                  strokeWidth="3.5"
                />
                <circle cx="100" cy={100 - listening * radarScale} r="4.5" fill="#003178" stroke="white" strokeWidth="1" />
                <circle cx={100 + reading * radarScale} cy="100" r="4.5" fill="#003178" stroke="white" strokeWidth="1" />
                <circle cx="100" cy={100 + writing * radarScale} r="4.5" fill="#003178" stroke="white" strokeWidth="1" />
                <circle cx={100 - speaking * radarScale} cy="100" r="4.5" fill="#003178" stroke="white" strokeWidth="1" />
                <text x="100" y="14" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#334155">听力 ({listening})</text>
                <text x="187" y="103" textAnchor="start" fontSize="9.5" fontWeight="bold" fill="#334155">阅读 ({reading})</text>
                <text x="100" y="196" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#334155">写作 ({writing})</text>
                <text x="13" y="103" textAnchor="end" fontSize="9.5" fontWeight="bold" fill="#334155">口语 ({speaking})</text>
              </svg>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border bg-[#f3faff] p-4">
                <span className="block text-[10px] font-bold text-slate-400">总分估计</span>
                <span className="mt-1 block font-mono text-3xl font-black text-[#003178]">{abilitySummary.forecastScore ?? '--'}</span>
              </div>
              <div className="rounded-2xl border bg-[#f3faff] p-4">
                <span className="block text-[10px] font-bold text-slate-400">证据数</span>
                <span className="mt-1 block font-mono text-3xl font-black text-[#003178]">{abilitySummary.evidenceCount}</span>
              </div>
              <div className="rounded-2xl border bg-[#f3faff] p-4">
                <span className="block text-[10px] font-bold text-slate-400">稳定度</span>
                <span className="mt-1 block font-mono text-3xl font-black text-emerald-700">{abilitySummary.trainingStability == null ? '--' : `${abilitySummary.trainingStability}%`}</span>
              </div>
            </div>

            {!abilitySummary.hasEvidence && (
              <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-[11px] font-bold leading-5 text-amber-800">
                还没有真实能力证据。请先完成入门诊断或任一专项训练，系统会用作答记录重新计算能力地图。
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-[#c3c6d4] bg-white p-4 shadow-2xs transition-colors hover:border-[#003178] sm:p-6 lg:col-span-3">
            <div className="mb-4 flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#071e27]">证据知识点图谱</h3>
              <div className="flex items-center space-x-0.5 rounded-xl border bg-slate-100 p-0.5 text-[11px] font-bold">
                {(Object.keys(TAB_LABELS) as AbilityEvidenceTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-3 py-1 transition-all ${
                      activeTab === tab ? 'bg-white text-[#003178] shadow-2xs' : 'text-slate-400'
                    }`}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-3.5">
              {evidenceKnowledgeTabs[activeTab].map((node) => {
                const Icon = KNOWLEDGE_NODE_ICONS[node.icon];
                return (
                  <div key={node.id} className="rounded-xl border border-transparent bg-[#f8fafc]/70 p-2 transition-colors hover:border-[#cfe6f2] hover:bg-[#f3faff]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex w-full items-center gap-3 sm:w-1/2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-sky-50 text-blue-600">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-800">{node.name}</p>
                          <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{node.sourceLabel}</p>
                        </div>
                      </div>
                      <div className="flex w-full items-center space-x-3.5 sm:flex-1">
                        <div className="h-2 w-full overflow-hidden rounded-full border bg-slate-100">
                          <div className={`h-full rounded-full transition-all duration-700 ${barColor(node.type)}`} style={{ width: `${node.percent}%` }} />
                        </div>
                        <span className="w-10 shrink-0 text-right font-mono text-xs font-black text-slate-700">{node.percent}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-[#c3c6d4] bg-white p-4 shadow-2xs transition-colors hover:border-[#003178] sm:p-6">
          <div className="mb-5 flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#071e27]">
                <Check className="h-4 w-4 text-emerald-700" />
                阶段提分验证
              </h3>
              <p className="mt-2 text-sm font-black text-[#003178]">{stageProgress.title}</p>
              <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-500">{stageProgress.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-black sm:min-w-80">
              <div className="rounded-2xl bg-[#eef7fc] p-3 text-[#003178]">
                <div className="font-mono text-xl">{stageProgress.baselineAverage ?? '--'}</div>
                <div>基线均值</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <div className="font-mono text-xl">{stageProgress.mockAverage ?? '--'}</div>
                <div>模考均值</div>
              </div>
              <div className={`rounded-2xl p-3 ${
                (stageProgress.delta ?? 0) >= 3
                  ? 'bg-emerald-700 text-white'
                  : (stageProgress.delta ?? 0) <= -3
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <div className="font-mono text-xl">
                  {stageProgress.delta == null ? '--' : `${stageProgress.delta > 0 ? '+' : ''}${stageProgress.delta}`}
                </div>
                <div>能力点变化</div>
              </div>
            </div>
          </div>

          {stageProgress.sectionChanges.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {stageProgress.sectionChanges.map((item) => (
                <div key={item.skillArea} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-slate-800">{item.label}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                      item.delta >= 3
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.delta <= -3
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {item.delta > 0 ? '+' : ''}{item.delta}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">基线 {item.baselineDate}</p>
                      <p className="font-mono text-2xl font-black text-slate-700">{item.baselineScore}</p>
                    </div>
                    <div className="h-px flex-1 bg-slate-200" />
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400">模考 {item.mockDate}</p>
                      <p className="font-mono text-2xl font-black text-[#003178]">{item.mockScore}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] font-semibold text-slate-500">模考证据 {item.mockEvidenceCount} 条</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-500">
              {stageProgress.nextAction}
            </div>
          )}

          {stageProgress.sectionChanges.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#cfe6f2] bg-[#eef7fc] px-4 py-3 text-xs font-bold leading-6 text-[#003178]">
              {stageProgress.nextAction}
              {stageProgress.estimatedCetScoreChange != null && (
                <span className="ml-2 text-emerald-700">
                  按当前能力均值估算，CET 分数变化约 {stageProgress.estimatedCetScoreChange > 0 ? '+' : ''}{stageProgress.estimatedCetScoreChange}。
                </span>
              )}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[#c3c6d4] bg-white p-4 shadow-2xs transition-colors hover:border-[#003178] sm:p-6">
          <div className="mb-5 flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#071e27]">
                <Database className="h-4 w-4 text-[#003178]" />
                学习证据账本
              </h3>
              <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-slate-500">
                这里展示能力画像、阶段验证和每日调度实际依赖的学习证据，避免系统只给结论、不说明依据。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-black sm:min-w-96 sm:grid-cols-4">
              <div className="rounded-2xl bg-[#eef7fc] p-3 text-[#003178]">
                <div className="font-mono text-xl">{evidenceLedger.totalCompletedSessions}</div>
                <div>完成训练</div>
              </div>
              <div className="rounded-2xl bg-[#eef7fc] p-3 text-[#003178]">
                <div className="font-mono text-xl">{evidenceLedger.totalAttempts}</div>
                <div>作答记录</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <div className="font-mono text-xl">{evidenceLedger.feedbackAttemptCount}</div>
                <div>反馈证据</div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                <div className="font-mono text-xl">{evidenceLedger.mistakeReasonCount}</div>
                <div>错因标签</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#003178]">能力证据覆盖</h4>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {evidenceLedger.skillCoverage.map((item) => (
                  <div key={item.skillArea} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-slate-800">{item.label}</span>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${coverageBadgeClass(item.status)}`}>
                        {coverageLabel(item.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400">证据数</p>
                        <p className="font-mono text-2xl font-black text-[#003178]">{item.evidenceCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400">最新分</p>
                        <p className="font-mono text-2xl font-black text-slate-700">{item.latestScore ?? '--'}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] font-semibold text-slate-400">
                      {item.latestUpdatedAt ? `更新 ${item.latestUpdatedAt.slice(0, 10)}` : '尚未写入学习证据'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#003178]">最近学习证据</h4>
              {evidenceLedger.recentEvidence.length > 0 ? (
                <div className="space-y-2">
                  {evidenceLedger.recentEvidence.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-800">{item.label}</p>
                          <p className="mt-1 text-[10px] font-semibold text-slate-400">
                            {item.modeId} · {item.finishedAt.slice(0, 10)}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#eef7fc] px-2 py-1 font-mono text-[11px] font-black text-[#003178]">
                          {item.correctRate == null ? '--' : `${item.correctRate}%`}
                        </span>
                      </div>
                      <p className="mt-2 text-[10px] font-bold text-slate-500">
                        {item.attemptCount} 条作答 · {item.feedbackCount} 条 AI 反馈 · {item.mistakeReasonCount} 个错因
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-500">
                  还没有可展示的学习会话。完成诊断、专项练习、复习或阶段模考后，这里会自动沉淀证据。
                </div>
              )}
            </div>
          </div>

          {evidenceLedger.verificationGaps.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <h4 className="text-xs font-black text-amber-800">下一步验证缺口</h4>
              <ul className="mt-2 space-y-1 text-xs font-semibold leading-6 text-amber-800">
                {evidenceLedger.verificationGaps.slice(0, 4).map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[#c3c6d4] bg-white p-4 shadow-2xs transition-colors hover:border-[#003178] sm:p-6">
          <div className="mb-6 flex flex-col gap-3 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-1 text-sm font-bold uppercase tracking-wider text-[#071e27]">
              <Activity className="h-4 w-4 text-[#003178]" />
              能力证据时间线
            </h3>
            <span className="rounded-lg border bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500">最近 6 周 · 仅统计有证据周</span>
          </div>

          <div className="grid h-44 grid-cols-6 items-end gap-2 px-1 pt-4 sm:gap-4 sm:px-4">
            {weeklyBars.map((week) => {
              const isActive = selectedWeek === week.label;
              const hasWeekEvidence = week.value != null;
              return (
                <button
                  key={week.label}
                  type="button"
                  onClick={() => {
                    setSelectedWeek(week.label);
                    triggerToast(hasWeekEvidence
                      ? `${week.label}（${week.dateRange}）平均能力证据 ${week.value}%，证据 ${week.evidenceCount} 条。`
                      : `${week.label}（${week.dateRange}）没有写入能力证据。`);
                  }}
                  className="group flex flex-col items-center space-y-2"
                >
                  <div className="relative flex h-28 w-full items-end justify-center rounded-lg border border-transparent bg-neutral-50 p-1 transition hover:border-[#cfe6f2] hover:bg-slate-50">
                    <div
                      className={`w-full rounded-md transition-all duration-500 ease-out ${
                        isActive ? 'bg-[#003178] shadow' : hasWeekEvidence ? 'bg-slate-500/70 group-hover:bg-[#003178]/70' : 'bg-slate-200'
                      }`}
                      style={{ height: `${hasWeekEvidence ? week.value : 5}%` }}
                    />
                    {isActive && (
                      <span className="absolute -top-3 rounded bg-[#003178] px-1 text-[8px] font-bold text-white shadow-2xs">Active</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-extrabold ${isActive ? 'text-[#003178]' : 'text-slate-400'}`}>{week.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
