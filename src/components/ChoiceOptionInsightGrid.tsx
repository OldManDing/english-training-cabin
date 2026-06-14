import React from 'react';
import { ChoiceOptionInsight } from '../domain/productCoach';

interface ChoiceOptionInsightGridProps {
  insights: ChoiceOptionInsight[];
  testIdPrefix: string;
}

const TONE_CLASS: Record<ChoiceOptionInsight['tone'], string> = {
  correct: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  'selected-wrong': 'border-rose-200 bg-rose-50 text-rose-900',
  distractor: 'border-slate-200 bg-white text-slate-700',
};

export default function ChoiceOptionInsightGrid({ insights, testIdPrefix }: ChoiceOptionInsightGridProps) {
  if (insights.length === 0) return null;

  return (
    <section data-testid={`${testIdPrefix}-option-insights`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-black uppercase tracking-widest text-[#003178]">
        四选项排除解析
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {insights.map((item) => (
          <article
            key={item.option}
            data-testid={`${testIdPrefix}-option-insight-${item.option}`}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold leading-5 ${TONE_CLASS[item.tone]}`}
          >
            <div className="font-black">
              {item.option}. {item.label}
            </div>
            <p className="mt-1">{item.reason}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

