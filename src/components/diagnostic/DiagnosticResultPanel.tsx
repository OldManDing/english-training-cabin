import { AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import {
  DiagnosticAnswerMap,
  DiagnosticItem,
  OnboardingDiagnosticReport,
} from '../../domain/diagnostic/onboardingDiagnostic';

interface DiagnosticResultPanelProps {
  activeDiagnosticItems: DiagnosticItem[];
  aiReviewNotice: string | null;
  answers: DiagnosticAnswerMap;
  onDismiss: () => void;
  report: OnboardingDiagnosticReport;
  skillLabels: Record<string, string>;
}

function getAnswerPreview(value: string | undefined): string {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '未作答';
  return normalized.length > 42 ? `${normalized.slice(0, 42)}...` : normalized;
}

function getConfidenceBadgeClass(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high') return 'bg-emerald-100 text-emerald-700';
  if (level === 'medium') return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-700';
}

function getDiagnosticMethodLabel(method: OnboardingDiagnosticReport['details'][number]['scoringMethod']): string {
  if (method === 'objective-aggregate') return '规则评分';
  if (method === 'ai-assisted-rubric') return 'AI 复核 + 规则';
  return '规则初筛';
}

function getDiagnosticConfidenceLabel(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high') return '高可信';
  if (level === 'medium') return '中可信';
  return '低可信';
}

function buildReportEvidenceSummary(report: OnboardingDiagnosticReport) {
  return {
    confirmedValidEvidenceCount: report.details
      .filter((detail) => detail.confirmedForProfile)
      .reduce((sum, detail) => sum + detail.validEvidenceCount, 0),
    provisionalValidEvidenceCount: report.details
      .filter((detail) => !detail.confirmedForProfile)
      .reduce((sum, detail) => sum + detail.validEvidenceCount, 0),
    confirmedSkillCount: report.details.filter((detail) => detail.confirmedForProfile).length,
    provisionalSkillCount: report.details.filter((detail) => !detail.confirmedForProfile).length,
  };
}

export default function DiagnosticResultPanel({
  activeDiagnosticItems,
  aiReviewNotice,
  answers,
  onDismiss,
  report,
  skillLabels,
}: DiagnosticResultPanelProps) {
  const reportEvidenceSummary = buildReportEvidenceSummary(report);

  return (
    <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-lg sm:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
            <CheckCircle className="h-4 w-4" />
            诊断完成
          </div>
          <h2 className="text-3xl font-black text-[#003178]">您的客观基线已生成</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {report.attempts.length} 条作答 · {report.skillProfiles.length} 条已确认画像 · {report.reviewItems.length} 条复习
          </p>
        </div>
        <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-5 text-center">
          <div className="text-xs font-black text-[#003178]">客观基线分</div>
          <div className="mt-1 text-5xl font-black text-[#003178]">{report.averageScore ?? '—'}</div>
        </div>
      </div>

      <div
        className="mt-6 rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4"
        data-testid="diagnostic-nonofficial-notice"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h3 className="text-sm font-black text-amber-900">非官方诊断，不是 CET-4 官方成绩</h3>
            <p className="mt-1 text-sm font-bold leading-6 text-amber-800">
              本报告只用于安排训练路径。客观题按标准答案规则评分；主观题只做规则初筛或 AI Rubric 复核，不直接写入正式能力画像。
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [`${reportEvidenceSummary.confirmedValidEvidenceCount}`, '有效客观证据'],
            [`${reportEvidenceSummary.confirmedSkillCount}`, '写入画像能力'],
            [`${reportEvidenceSummary.provisionalValidEvidenceCount}`, '主观采样证据'],
            [`${reportEvidenceSummary.provisionalSkillCount}`, '仅作训练方向'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-white/80 px-4 py-3">
              <div className="text-2xl font-black text-amber-900">{value}</div>
              <div className="mt-1 text-[11px] font-black text-amber-700">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-black text-[#071e27]">{report.confidenceSummary.label}</div>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{report.confidenceSummary.note}</p>
            {report.confidenceSummary.confirmedSkillAreas.length > 0 ? (
              <p className="mt-2 text-xs font-bold text-slate-500">
                已确认：{report.confidenceSummary.confirmedSkillAreas.map((skill) => skillLabels[skill]).join('、')}
              </p>
            ) : null}
          </div>
          <span
            className={`inline-flex h-fit items-center rounded-full px-3 py-1 text-xs font-black ${getConfidenceBadgeClass(report.confidenceSummary.level)}`}
          >
            {getDiagnosticConfidenceLabel(report.confidenceSummary.level)}
          </span>
        </div>
        {aiReviewNotice ? (
          <p className="mt-3 rounded-2xl border border-white/80 bg-white/80 px-3 py-2 text-xs font-bold text-slate-600">
            {aiReviewNotice}
          </p>
        ) : null}
      </div>

      <section className="mt-6 rounded-[1.5rem] border border-[#dcecff] bg-[#f8fbff] p-4">
        <div className="text-sm font-black text-[#003178]">评分说明</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-3">
            <div className="text-xs font-black text-[#071e27]">规则评分</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">客观题按标准答案核验；同一能力点至少 2 道有效题才写入画像。</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <div className="text-xs font-black text-[#071e27]">AI 复核</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">只用于主观题 Rubric 参考；即使 AI 可用，也不把单次主观题当作官方定级。</p>
          </div>
          <div className="rounded-2xl bg-white p-3">
            <div className="text-xs font-black text-[#071e27]">写入画像</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">只有证据足够的客观能力点进入能力画像；低证据项只影响训练建议。</p>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {report.details.map((detail) => (
          <div
            key={detail.skillArea}
            data-testid={`diagnostic-score-${detail.skillArea}`}
            className={`rounded-[1.5rem] border p-4 ${
              detail.confirmedForProfile
                ? (detail.score ?? 0) >= 70
                  ? 'border-emerald-100 bg-emerald-50'
                  : 'border-rose-100 bg-rose-50'
                : 'border-amber-100 bg-amber-50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-600">{skillLabels[detail.skillArea]}</span>
              <span className="text-right text-2xl font-black text-[#003178]">{detail.score ?? '待复核'}</span>
            </div>
            <div className="mt-2 text-sm font-black text-[#071e27]">{detail.title}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${getConfidenceBadgeClass(detail.confidenceLevel)}`}>
                {getDiagnosticConfidenceLabel(detail.confidenceLevel)}
              </span>
              <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">
                {getDiagnosticMethodLabel(detail.scoringMethod)}
              </span>
              <span
                className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600"
                data-testid={`diagnostic-evidence-${detail.skillArea}`}
              >
                证据 {detail.validEvidenceCount}/{detail.evidenceCount}
              </span>
            </div>
            <p className="mt-2 text-[11px] font-bold text-slate-500">
              {detail.confirmedForProfile ? '计入客观基线与正式画像' : '仅采样，不计入总分或画像'}
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{detail.evidenceSummary}</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{detail.feedback}</p>
            <p
              className="mt-3 rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold leading-5 text-[#003178]"
              data-testid={`diagnostic-next-action-${detail.skillArea}`}
            >
              下一步：{detail.nextAction}
            </p>
            <details className="mt-3 rounded-2xl border border-white/80 bg-white/80 p-3 text-xs font-semibold leading-5 text-slate-600">
              <summary className="cursor-pointer text-xs font-black text-[#003178]">查看评分依据</summary>
              <p className="mt-2">{detail.scoringSummary}</p>
              <p className="mt-2">{detail.confidenceLabel}</p>
              <div className="mt-3 space-y-2">
                {detail.rubric.map((dimension) => (
                  <div key={`${detail.skillArea}-${dimension.label}`} className="rounded-xl bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-black text-slate-700">
                      <span>{dimension.label}</span>
                      <span>
                        {dimension.score}/{dimension.maxScore}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">{dimension.observation}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        ))}
      </div>

      <div
        className="mt-6 rounded-[1.5rem] border border-sky-100 bg-sky-50 p-4"
        data-testid="diagnostic-post-answer-support"
      >
        <div className="text-sm font-black text-[#003178]">答后中文辅助与解析</div>
        <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
          以下内容只在提交诊断后显示，用于复盘，不参与本次作答。
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {activeDiagnosticItems.map((item, index) => {
            const chineseSupport = item.chineseSupport;
            return (
              <article key={`support-${item.id}`} className="rounded-2xl border border-white/80 bg-white p-4">
                <div className="text-xs font-black text-[#003178]">
                  {index + 1}. {skillLabels[item.skillArea]} · {item.title}
                </div>
                <div className="mt-2 text-xs font-bold leading-5 text-slate-500">
                  你的答案：{getAnswerPreview(answers[item.id])}
                </div>
                {item.kind === 'single-choice' ? (
                  <div className="mt-2 text-xs font-bold leading-5 text-emerald-700">
                    正确答案：{item.correctAnswer}
                  </div>
                ) : null}
                {chineseSupport?.context ? (
                  <p className="mt-3 text-xs font-semibold leading-6 text-slate-600">
                    中文语境：{chineseSupport.context}
                  </p>
                ) : null}
                {chineseSupport?.prompt ? (
                  <p className="mt-2 text-xs font-semibold leading-6 text-slate-600">
                    中文题意：{chineseSupport.prompt}
                  </p>
                ) : null}
                {item.kind === 'single-choice' && chineseSupport?.options ? (
                  <div className="mt-3 grid gap-2">
                    {item.options.map((option) => (
                      <div key={`${item.id}-${option.id}-support`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">
                        {option.id}. {chineseSupport.options?.[option.id] ?? option.label}
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="mt-3 text-xs font-bold leading-6 text-slate-700">
                  解析：{item.explanation}
                </p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h3 className="text-sm font-black text-amber-900">下一步训练重点</h3>
            <p className="mt-1 text-sm font-bold leading-6 text-amber-800">
              {report.weakestSkills.length > 0 ? (
                <>
                  {report.confidenceSummary.level === 'low' ? '优先复核并训练 ' : '优先训练 '}
                  {report.weakestSkills.map((skill) => skillLabels[skill]).join('、')}。
                </>
              ) : (
                '先补足客观题证据，再决定正式训练优先级。'
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1b6d24] px-8 text-sm font-black text-white shadow-md transition hover:bg-emerald-700"
        >
          开启今日训练
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
