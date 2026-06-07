import React, { useState } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { SelectField } from './controls/FormControls';

const feedbackCategories = [
  { value: 'bug', label: '功能问题' },
  { value: 'ui', label: '界面体验' },
  { value: 'content', label: '题目内容' },
  { value: 'idea', label: '改进建议' },
  { value: 'other', label: '其他' },
];

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

interface UserFeedbackPanelProps {
  pageContext?: string;
}

export default function UserFeedbackPanel({ pageContext }: UserFeedbackPanelProps) {
  const [category, setCategory] = useState('ui');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const trimmedMessage = message.trim();
  const canSubmit = trimmedMessage.length >= 8 && submitState !== 'submitting';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setSubmitState('error');
      setStatusMessage('请写清楚问题或建议，至少 8 个字。');
      return;
    }

    setSubmitState('submitting');
    setStatusMessage('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: trimmedMessage,
          contact: contact.trim() || undefined,
          page: pageContext ?? `${window.location.pathname}${window.location.hash}`,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Feedback failed with ${response.status}`);
      }

      setSubmitState('success');
      setStatusMessage('已收到反馈，会优先处理影响学习闭环的问题。');
      setMessage('');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setSubmitState('error');
      setStatusMessage('提交失败，请稍后重试。');
    }
  };

  return (
    <details className="ui-panel group" data-testid="user-feedback-panel">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#e3f2fd] text-[#003178]">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-[#003178]">反馈入口</h3>
            <p className="mt-1 text-[11px] font-semibold text-[#434652]">
              只写问题、页面和期望结果。
            </p>
          </div>
        </div>
        <span className="text-[11px] font-black text-[#003178] transition-transform group-open:rotate-180">
          展开
        </span>
      </summary>

      <form className="mt-5 space-y-4 border-t border-[#cfe6f2] pt-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr]">
          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold text-[#434652]">类型</span>
            <SelectField
              ariaLabel="类型"
              value={category}
              onChange={setCategory}
              options={feedbackCategories}
            />
          </div>

          <label className="space-y-1.5">
            <span className="block text-[11px] font-bold text-[#434652]">联系方式（选填）</span>
            <input
              className="w-full rounded-xl border border-[#cfe6f2] bg-white px-3 py-3 text-xs font-bold text-[#101828] outline-none focus:border-[#003178] focus:ring-2 focus:ring-[#003178]/10"
              maxLength={120}
              placeholder="邮箱或微信，方便追问"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="block text-[11px] font-bold text-[#434652]">反馈内容</span>
          <textarea
            className="min-h-28 w-full resize-y rounded-2xl border border-[#cfe6f2] bg-white px-3 py-3 text-sm font-semibold leading-6 text-[#101828] outline-none focus:border-[#003178] focus:ring-2 focus:ring-[#003178]/10"
            maxLength={800}
            placeholder="例如：专项练习页面的听力按钮无法暂停；我期望点击后可以暂停并继续播放。"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <span className="block text-right text-[10px] font-bold text-slate-400">
            {message.length}/800
          </span>
        </label>

        {statusMessage && (
          <p
            className={`rounded-xl px-3 py-2 text-xs font-bold ${
              submitState === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
            role="status"
          >
            {statusMessage}
          </p>
        )}

        <button
          type="submit"
          className="ui-button ui-button-primary ui-button-full sm:w-auto"
          disabled={!canSubmit}
        >
          {submitState === 'submitting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span>{submitState === 'submitting' ? '提交中...' : '提交反馈'}</span>
        </button>
      </form>
    </details>
  );
}
