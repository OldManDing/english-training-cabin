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

export default function PracticeMethodGuide({ moduleId, compact = false, className = '' }: PracticeMethodGuideProps) {
  const guide: PracticeMethodGuideData = getPracticeMethodGuide(moduleId);

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
    </section>
  );
}
