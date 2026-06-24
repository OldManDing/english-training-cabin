import React from 'react';
import { ArrowRight, ListChecks, Target } from 'lucide-react';
import {
  getPracticeMethodGuide,
  type PracticeMethodGuide as PracticeMethodGuideData,
  type PracticeMethodGuideModuleId,
} from '../domain/practice/methodGuides';

interface PracticeMethodGuideProps {
  moduleId: PracticeMethodGuideModuleId;
  compact?: boolean;
  className?: string;
  activeTopicId?: string;
}

function StepCard({ index, text, compact }: { key?: React.Key; index: number; text: string; compact?: boolean }) {
  return (
    <article className={`rounded-2xl border border-[#dde5ee] bg-white ${compact ? 'p-3' : 'p-4'}`}>
      <div className="text-[10px] font-black uppercase tracking-widest text-[#003178]">
        步骤 0{index + 1}
      </div>
      <p className={`mt-2 font-semibold leading-6 text-slate-700 ${compact ? 'text-xs' : 'text-sm'}`}>
        {text}
      </p>
    </article>
  );
}

export default function PracticeMethodGuide({
  moduleId,
  compact = false,
  className = '',
  activeTopicId,
}: PracticeMethodGuideProps) {
  const guide: PracticeMethodGuideData = getPracticeMethodGuide(moduleId);
  const topicGuides = guide.topicGuides ?? [];

  return (
    <section
      data-testid={`practice-method-guide-${moduleId}`}
      className={`rounded-3xl border border-[#cfe6f2] bg-[#f8fbff] ${compact ? 'p-4 sm:p-5' : 'p-4 sm:p-6'} ${className}`}
    >
      <div className={`flex flex-col gap-4 ${compact ? 'lg:flex-row lg:items-start lg:justify-between' : 'xl:flex-row xl:items-start xl:justify-between'}`}>
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#eef7fc] px-3 py-1 text-[10px] font-black text-[#003178]">
            <ListChecks className="h-3.5 w-3.5" />
            方法先行
          </div>
          <h3 className={`${compact ? 'mt-2 text-base' : 'mt-3 text-lg'} font-black text-[#101828]`}>
            {guide.title}
          </h3>
          <p className={`mt-2 max-w-3xl font-semibold leading-6 text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>
            {guide.intro}
          </p>
        </div>
        <div className={`shrink-0 rounded-2xl border border-[#dde5ee] bg-white ${compact ? 'px-3 py-3' : 'px-4 py-4'} ${compact ? 'max-w-none' : 'max-w-sm'}`}>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">训练重点</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {guide.focus.map((item) => (
              <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
        {guide.steps.map((step, index) => (
          <StepCard key={step} index={index} text={step} compact={compact} />
        ))}
      </div>

      {topicGuides.length > 0 ? (
        <div data-testid={`practice-method-guide-topics-${moduleId}`} className="mt-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 className="text-sm font-black text-[#101828]">按考点分组练</h4>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                先判断题目属于哪一类，再套对应步骤。
              </p>
            </div>
          </div>
          <div className={`mt-3 grid gap-3 ${compact ? 'lg:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
            {topicGuides.map((topic) => {
              const active = topic.id === activeTopicId;
              return (
                <article
                  key={topic.id}
                  data-testid={`practice-method-guide-topic-${moduleId}-${topic.id}`}
                  className={`rounded-2xl border bg-white p-3 transition ${
                    active ? 'border-[#003178] ring-1 ring-[#dcecff]' : 'border-[#dde5ee]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-black ${active ? 'text-[#003178]' : 'text-[#101828]'}`}>
                      {topic.label}
                    </span>
                    {active ? (
                      <span className="rounded-full bg-[#eef7fc] px-2 py-0.5 text-[10px] font-black text-[#003178]">
                        当前考点
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[11px] font-bold leading-5 text-slate-500">{topic.cue}</p>
                  <ol className="mt-2 space-y-1.5">
                    {topic.methodSteps.map((step, index) => (
                      <li key={step} className="flex gap-2 text-[11px] font-semibold leading-5 text-slate-600">
                        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-[#003178]">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-2 rounded-xl bg-[#f8fafc] px-3 py-2 text-[11px] font-black leading-5 text-slate-600">
                    验算：{topic.checkpoint}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {!compact ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#dde5ee] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold leading-5 text-slate-600">
            {guide.payoff}
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#003178]">
            <Target className="h-4 w-4" />
            先方法，后练习
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
