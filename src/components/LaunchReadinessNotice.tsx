import React from 'react';
import { AlertCircle, Database, FileCheck2, ShieldCheck } from 'lucide-react';

interface LaunchReadinessNoticeProps {
  onOpen: (title: string, body: string) => void;
}

const privacyCopy = `本产品当前是本地优先 MVP：目标、练习记录、错题复习队列和能力画像默认保存在当前浏览器 IndexedDB 中。

AI 阅读生成和口语分析会把必要的题目话题或口语文本发送给已配置的 AI 供应商处理。请不要输入身份证号、手机号、学校账号密码等敏感信息。

如果更换浏览器、清空浏览器数据或更换设备，本地学习记录可能无法自动恢复。`;

const copyrightCopy = `内置内容仅用于演示和原创模拟训练，不声称来自官方真题。

用户导入 JSON 材料时，应确保内容来源合法，且仅用于个人学习。公开发布、批量传播或商业使用第三方题材前，需要自行确认授权。

AI 生成内容会标记为模拟题，建议用于训练闭环和错因分析，不应等同于官方考试材料。`;

const reliabilityCopy = `AI 供应商异常、超时或额度不可用时，系统会切换到离线模拟反馈，保证训练流程不中断。

上线后建议持续关注 /api/observability/summary 中的 AI 失败率、接口错误率、平均耗时和训练完成事件。`;

export default function LaunchReadinessNotice({ onOpen }: LaunchReadinessNoticeProps) {
  return (
    <section className="mx-4 mt-4 rounded-3xl border border-[#cfe6f2] bg-white/90 p-4 shadow-sm sm:mx-6 lg:mx-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl bg-[#eef7fc] p-2 text-[#003178]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#003178]">上线声明：本地优先、模拟训练、AI 有兜底</h2>
            <p className="mt-1 max-w-4xl text-xs font-semibold leading-5 text-slate-600">
              学习记录默认保存在当前浏览器；AI 生成内容为模拟题；导入材料需确保来源合法。供应商异常时会自动返回离线模拟结果，不中断训练。
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:w-[520px]">
          <button
            onClick={() => onOpen('隐私与本地数据说明', privacyCopy)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#cfe6f2] bg-[#f7fbff] px-3 py-2 text-xs font-black text-[#003178] transition hover:bg-[#eef7fc]"
          >
            <Database className="h-4 w-4" />
            本地数据
          </button>
          <button
            onClick={() => onOpen('版权与材料来源说明', copyrightCopy)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#cfe6f2] bg-[#f7fbff] px-3 py-2 text-xs font-black text-[#003178] transition hover:bg-[#eef7fc]"
          >
            <FileCheck2 className="h-4 w-4" />
            版权说明
          </button>
          <button
            onClick={() => onOpen('AI 可靠性与观测说明', reliabilityCopy)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 transition hover:bg-amber-100"
          >
            <AlertCircle className="h-4 w-4" />
            AI 兜底
          </button>
        </div>
      </div>
    </section>
  );
}
