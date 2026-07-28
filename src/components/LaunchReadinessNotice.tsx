import React, { useEffect, useState } from 'react';
import { AlertCircle, Database, FileCheck2, ShieldCheck, WifiOff } from 'lucide-react';

interface LaunchReadinessNoticeProps {
  onOpen: (title: string, body: string) => void;
}

type PublicAiStatus = {
  configured: boolean;
  provider: string;
  model: string;
  state: 'ready' | 'degraded' | 'offline-fallback';
  fallbackAvailable: boolean;
  shouldNotifyUser: boolean;
  requestsTotal: number;
  fallbacksTotal: number;
  fallbackRate: number;
  averageLatencyMs: number;
  fallbacksByReason?: Partial<Record<AiFallbackReason, number>>;
  lastFallbackReason?: AiFallbackReason | null;
  lastFallbackAt?: string | null;
  statusReason?: AiFallbackReason | null;
};

type AiFallbackReason =
  | 'not_configured'
  | 'usage_limited'
  | 'timeout'
  | 'provider_error'
  | 'invalid_response'
  | 'unknown';

const privacyCopy = `本产品以服务端学习记录和进行中的训练草稿为权威来源，当前浏览器仅保留离线副本和待同步记录。

AI 阅读生成和口语分析会把必要的题目话题或口语文本发送给已配置的 AI 供应商处理。请不要输入身份证号、手机号、学校账号密码等敏感信息。

如果更换浏览器、清空浏览器数据或更换设备，登录后会从服务端自动恢复已确认的学习记录和未完成草稿；断网期间尚未确认的数据会在本地保留并自动重试。`;

const copyrightCopy = `内置内容仅用于演示和原创模拟训练，不声称来自官方真题。

用户导入 JSON 材料时，应确保内容来源合法，且仅用于个人学习。公开发布、批量传播或商业使用第三方题材前，需要自行确认授权。

AI 生成内容会标记为模拟题，建议用于训练闭环和错因分析，不应等同于官方考试材料。`;

const reliabilityCopy = `AI 供应商异常、超时或额度不可用时，系统会切换到规则兜底反馈，保证训练流程不中断。

首页会读取 /api/ai/status 显示当前 AI 可用性、最近降级原因和兜底率；上线后建议持续关注 /api/observability/summary 中的 AI 失败率、接口错误率、平均耗时和训练完成事件。`;

function getAiReasonCopy(reason?: AiFallbackReason | null) {
  switch (reason) {
    case 'not_configured':
      return {
        label: 'AI 未配置',
        detail: '主观反馈会用规则兜底，训练入口不受影响。',
        icon: WifiOff,
      };
    case 'usage_limited':
      return {
        label: 'AI 额度受限',
        detail: '当前生成能力不可用，系统会自动使用规则兜底。',
        icon: AlertCircle,
      };
    case 'timeout':
      return {
        label: 'AI 响应超时',
        detail: '本次会切到规则兜底，之后可继续重试。',
        icon: AlertCircle,
      };
    case 'provider_error':
      return {
        label: 'AI 服务异常',
        detail: '供应商暂不可用时会自动切规则兜底。',
        icon: AlertCircle,
      };
    case 'invalid_response':
      return {
        label: 'AI 结果异常',
        detail: '未采用不稳定结果，已保留规则兜底。',
        icon: AlertCircle,
      };
    case 'unknown':
      return {
        label: 'AI 暂不可用',
        detail: '训练仍会使用规则反馈兜底。',
        icon: AlertCircle,
      };
    default:
      return null;
  }
}

function getAiStatusCopy(status: PublicAiStatus | null, loadState: 'loading' | 'ready' | 'error') {
  if (loadState === 'loading') {
    return {
      label: 'AI 检查中',
      detail: '正在读取当前服务状态。',
      className: 'border-slate-200 bg-slate-50 text-slate-600',
      icon: ShieldCheck,
    };
  }

  if (loadState === 'error' || !status) {
    return {
      label: 'AI 状态暂不可读',
      detail: '训练仍会使用规则反馈兜底。',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
      icon: WifiOff,
    };
  }

  const reasonCopy = getAiReasonCopy(status.statusReason);

  if (status.state === 'offline-fallback') {
    return {
      label: reasonCopy?.label ?? '规则兜底中',
      detail: reasonCopy?.detail ?? '未连接 AI，主观反馈会走离线规则。',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
      icon: reasonCopy?.icon ?? WifiOff,
    };
  }

  if (status.state === 'degraded') {
    const fallbackPercent = Math.round(status.fallbackRate * 100);
    return {
      label: reasonCopy?.label ?? 'AI 降级偏高',
      detail: reasonCopy?.detail ?? `近期兜底率 ${fallbackPercent}%，训练流程不会中断。`,
      className: 'border-amber-200 bg-amber-50 text-amber-800',
      icon: reasonCopy?.icon ?? AlertCircle,
    };
  }

  if (status.fallbacksTotal > 0) {
    return {
      label: reasonCopy?.label ?? 'AI 已配置',
      detail: reasonCopy?.detail ?? '近期出现过兜底，失败时会自动切规则反馈。',
      className: 'border-sky-200 bg-sky-50 text-[#003178]',
      icon: reasonCopy?.icon ?? AlertCircle,
    };
  }

  return {
    label: 'AI 已配置',
    detail: '失败时会自动切规则反馈。',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: ShieldCheck,
  };
}

export default function LaunchReadinessNotice({ onOpen }: LaunchReadinessNoticeProps) {
  const [aiStatus, setAiStatus] = useState<PublicAiStatus | null>(null);
  const [aiStatusLoadState, setAiStatusLoadState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/ai/status', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`AI status failed with ${response.status}`);
        return response.json() as Promise<PublicAiStatus>;
      })
      .then((data) => {
        setAiStatus(data);
        setAiStatusLoadState('ready');
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error('Failed to load AI status:', error);
        setAiStatusLoadState('error');
      });

    return () => controller.abort();
  }, []);

  const aiStatusCopy = getAiStatusCopy(aiStatus, aiStatusLoadState);
  const AiStatusIcon = aiStatusCopy.icon;

  return (
    <section className="rounded-2xl border border-[#cfe6f2] bg-white/90 p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#eef7fc] p-2 text-[#003178]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-black text-[#003178]">服务器保存 · 原创模拟 · AI 可降级</h2>
            <div
              className={`mt-2 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold leading-4 ${aiStatusCopy.className}`}
              data-testid="ai-status-strip"
            >
              <span className="inline-flex items-center gap-1 font-black">
                <AiStatusIcon className="h-3.5 w-3.5" />
                {aiStatusCopy.label}
              </span>
              <span className="min-w-0">{aiStatusCopy.detail}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 xl:w-[360px]">
          <button
            onClick={() => onOpen('隐私与本地数据说明', privacyCopy)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#cfe6f2] bg-[#f7fbff] px-2 py-2 text-[11px] font-black text-[#003178] transition hover:bg-[#eef7fc]"
          >
            <Database className="h-3.5 w-3.5" />
            本地
          </button>
          <button
            onClick={() => onOpen('版权与材料来源说明', copyrightCopy)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#cfe6f2] bg-[#f7fbff] px-2 py-2 text-[11px] font-black text-[#003178] transition hover:bg-[#eef7fc]"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            来源
          </button>
          <button
            onClick={() => onOpen('AI 可靠性与观测说明', reliabilityCopy)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-[11px] font-black text-amber-800 transition hover:bg-amber-100"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            AI
          </button>
        </div>
      </div>
    </section>
  );
}
