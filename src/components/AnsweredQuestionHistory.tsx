import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, History, Search, XCircle } from 'lucide-react';
import { Attempt, ChoiceOption, PracticeSession } from '../types';
import {
  buildAnsweredQuestionHistory,
  paginateAnsweredQuestionHistory,
  type AnsweredQuestionHistoryItem,
} from '../domain/practice/answerHistory';
import { SelectField } from './controls/FormControls';

interface AnsweredQuestionHistoryProps {
  persistedAttempts?: Attempt[];
  persistedPracticeSessions?: PracticeSession[];
}

type OutcomeFilter = 'all' | 'correct' | 'incorrect';

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function outcomeLabel(item: AnsweredQuestionHistoryItem): string {
  if (item.attempt.isCorrect === true) return '正确';
  if (item.attempt.isCorrect === false) return '需复盘';
  return '已记录';
}

function outcomeClass(item: AnsweredQuestionHistoryItem): string {
  if (item.attempt.isCorrect === true) return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (item.attempt.isCorrect === false) return 'border-rose-100 bg-rose-50 text-rose-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function normalizeOptionKey(key: string): ChoiceOption | null {
  return ['A', 'B', 'C', 'D'].includes(key) ? key as ChoiceOption : null;
}

function readSelectedOption(item: AnsweredQuestionHistoryItem): ChoiceOption | null {
  if (typeof item.attempt.answer === 'string') return normalizeOptionKey(item.attempt.answer.trim());
  if (!item.attempt.answer || typeof item.attempt.answer !== 'object' || Array.isArray(item.attempt.answer)) return null;
  const record = item.attempt.answer as Record<string, unknown>;
  const redoAnswer = typeof record.redoAnswer === 'string' ? record.redoAnswer.trim() : '';
  const selected = typeof record.selected === 'string' ? record.selected.trim() : '';
  return normalizeOptionKey(redoAnswer || selected);
}

function readOptionTranslation(item: AnsweredQuestionHistoryItem, option: ChoiceOption): string | null {
  return item.snapshot.optionTranslations?.[option] ?? null;
}

function formatOptionAnswer(item: AnsweredQuestionHistoryItem, option: ChoiceOption): string {
  const optionText = item.snapshot.options?.[option];
  return optionText ? `${option}. ${optionText}` : option;
}

function formatSelectedAnswer(item: AnsweredQuestionHistoryItem): string {
  const selectedOption = readSelectedOption(item);
  return selectedOption ? formatOptionAnswer(item, selectedOption) : item.answerText;
}

function formatStandardReference(item: AnsweredQuestionHistoryItem): string {
  const correctOption = item.snapshot.correctAnswer ? normalizeOptionKey(item.snapshot.correctAnswer.trim()) : null;
  if (correctOption) return formatOptionAnswer(item, correctOption);
  return item.snapshot.correctAnswer ?? item.snapshot.sampleAnswer ?? '暂无标准答案';
}

function TranslationLine({
  text,
  testId,
  className = '',
}: {
  text?: string | null;
  testId?: string;
  className?: string;
}) {
  if (!text) return null;
  return (
    <p data-testid={testId} className={`mt-1 text-xs font-bold leading-5 text-amber-800 ${className}`}>
      中文：{text}
    </p>
  );
}

function AnswerOptions({ item }: { item: AnsweredQuestionHistoryItem }) {
  const options = Object.entries(item.snapshot.options ?? {});
  const selectedOption = readSelectedOption(item);
  if (options.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(([key, value]) => {
        const optionKey = normalizeOptionKey(key);
        const isCorrect = optionKey && item.snapshot.correctAnswer === optionKey;
        const isSelected = optionKey && selectedOption === optionKey;
        const translation = optionKey ? readOptionTranslation(item, optionKey) : null;
        return (
          <div
            key={key}
            className={`rounded-xl border px-3 py-2 text-xs font-bold leading-5 ${
              isCorrect
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : isSelected
                ? 'border-[#cfe6f2] bg-[#eef7fc] text-[#003178]'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            <div className="flex items-start gap-1">
              <span className="font-black">{key}.</span>
              <span className="min-w-0">{value}</span>
            </div>
            {translation ? (
              <span
                data-testid={`answered-history-option-translation-${key}`}
                className="mt-1 block border-t border-current/10 pt-1 text-[11px] font-semibold leading-5 text-slate-500"
              >
                中文：{translation}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function visiblePageNumbers(page: number, pageCount: number): number[] {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

interface HistoryItemCardProps {
  item: AnsweredQuestionHistoryItem;
  expanded: boolean;
  onToggle: () => void;
}

function HistoryItemCard({ item, expanded, onToggle }: HistoryItemCardProps): React.JSX.Element {
  const OutcomeIcon = item.attempt.isCorrect === false ? XCircle : CheckCircle2;
  const selectedOption = readSelectedOption(item);
  const selectedTranslation = selectedOption ? readOptionTranslation(item, selectedOption) : null;
  const correctOption = item.snapshot.correctAnswer ? normalizeOptionKey(item.snapshot.correctAnswer.trim()) : null;
  const correctTranslation = correctOption ? readOptionTranslation(item, correctOption) : null;

  return (
    <article data-testid="answered-history-item" className="rounded-2xl border border-[#dde5ee] bg-white p-4 shadow-xs">
      <button type="button" onClick={onToggle} className="flex min-h-0 w-full items-start justify-between gap-3 p-0 text-left shadow-none">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="ui-chip ui-chip-accent">{item.moduleLabel}</span>
            <span className="ui-chip">{item.questionTypeLabel}</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black ${outcomeClass(item)}`}>
              <OutcomeIcon className="h-3.5 w-3.5" />
              {outcomeLabel(item)}
            </span>
          </div>
          <h3 className="mt-3 text-base font-black leading-6 text-[#101828]">{item.snapshot.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{item.snapshot.prompt}</p>
          <TranslationLine text={item.snapshot.promptTranslation} testId="answered-history-prompt-translation" />
        </div>
        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-[#003178] transition ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2 text-[11px] font-black text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
              <Clock3 className="h-3.5 w-3.5 text-[#003178]" />
              {formatDateTime(item.createdAt)}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.snapshot.sourceLabel}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.attempt.elapsedSeconds}s</span>
          </div>

          {item.snapshot.context && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-600">
              <p>{item.snapshot.context}</p>
              <TranslationLine
                text={item.snapshot.contextTranslation}
                testId="answered-history-context-translation"
                className="border-t border-slate-200 pt-2 text-slate-500"
              />
            </div>
          )}

          <AnswerOptions item={item} />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#cfe6f2] bg-[#eef7fc] p-3">
              <p className="text-[11px] font-black text-[#003178]">你的答案</p>
              <p className="mt-2 whitespace-pre-line text-sm font-bold leading-6 text-[#101828]">{formatSelectedAnswer(item)}</p>
              <TranslationLine text={selectedTranslation} testId="answered-history-selected-answer-translation" className="text-slate-500" />
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-[11px] font-black text-emerald-700">标准参考</p>
              <p className="mt-2 whitespace-pre-line text-sm font-bold leading-6 text-emerald-900">
                {formatStandardReference(item)}
              </p>
              <TranslationLine text={correctTranslation} testId="answered-history-correct-answer-translation" className="text-emerald-700" />
            </div>
          </div>

          {(item.snapshot.explanation || item.snapshot.sampleAnswer) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold leading-6 text-slate-700">
              {item.snapshot.explanation ?? item.snapshot.sampleAnswer}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function AnsweredQuestionHistory({
  persistedAttempts = [],
  persistedPracticeSessions = [],
}: AnsweredQuestionHistoryProps) {
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const historyItems = useMemo(
    () => buildAnsweredQuestionHistory({
      attempts: persistedAttempts,
      sessions: persistedPracticeSessions,
    }),
    [persistedAttempts, persistedPracticeSessions],
  );
  const modules = useMemo(() => {
    const labels = Array.from(new Set<string>(historyItems.map((item) => item.moduleLabel)));
    return labels.sort((left, right) => left.localeCompare(right, 'zh-CN'));
  }, [historyItems]);
  const moduleOptions = useMemo(
    () => [
      { value: 'all', label: '全部模块' },
      ...modules.map((moduleLabel) => ({ value: moduleLabel, label: moduleLabel })),
    ],
    [modules],
  );
  const outcomeOptions = useMemo(
    () => [
      { value: 'all', label: '全部结果' },
      { value: 'correct', label: '只看正确' },
      { value: 'incorrect', label: '只看需复盘' },
    ],
    [],
  );
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return historyItems.filter((item) => {
      if (moduleFilter !== 'all' && item.moduleLabel !== moduleFilter) return false;
      if (outcomeFilter === 'correct' && item.attempt.isCorrect !== true) return false;
      if (outcomeFilter === 'incorrect' && item.attempt.isCorrect !== false) return false;
      return !normalizedQuery || item.searchText.includes(normalizedQuery);
    });
  }, [historyItems, moduleFilter, outcomeFilter, query]);
  const paginatedItems = useMemo(
    () => paginateAnsweredQuestionHistory(filteredItems, currentPage),
    [currentPage, filteredItems],
  );
  const correctCount = historyItems.filter((item) => item.attempt.isCorrect === true).length;
  const incorrectCount = historyItems.filter((item) => item.attempt.isCorrect === false).length;
  const visibleExpandedId = expandedId ?? paginatedItems.items[0]?.id ?? null;
  const pageNumbers = visiblePageNumbers(paginatedItems.page, paginatedItems.pageCount);
  const goToPage = (page: number) => {
    setCurrentPage(page);
    setExpandedId(null);
  };

  useEffect(() => {
    setCurrentPage(1);
    setExpandedId(null);
  }, [moduleFilter, outcomeFilter, query]);

  useEffect(() => {
    if (currentPage !== paginatedItems.page) {
      setCurrentPage(paginatedItems.page);
    }
  }, [currentPage, paginatedItems.page]);

  return (
    <div className="app-page-surface ui-page">
      <div className="ui-page-content space-y-5">
        <header className="ui-page-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="ui-page-eyebrow mb-3">
                <History className="h-4 w-4" />
                作答回看
              </div>
              <h2 className="text-2xl font-black tracking-tight text-[#101828] sm:text-3xl">已答题目</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-black sm:min-w-80">
              <div className="ui-metric">
                <div className="font-mono text-2xl text-[#003178]">{historyItems.length}</div>
                <div className="text-slate-500">总作答</div>
              </div>
              <div className="ui-metric">
                <div className="font-mono text-2xl text-emerald-700">{correctCount}</div>
                <div className="text-slate-500">正确</div>
              </div>
              <div className="ui-metric">
                <div className="font-mono text-2xl text-rose-600">{incorrectCount}</div>
                <div className="text-slate-500">需复盘</div>
              </div>
            </div>
          </div>
        </header>

        <section className="ui-panel">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索题干、选项、答案"
                className="w-full rounded-2xl border border-[#dde5ee] bg-slate-50 py-3 pl-10 pr-3 text-sm font-bold text-[#101828] outline-none transition focus:border-[#003178] focus:bg-white"
              />
            </label>
            <SelectField
              ariaLabel="筛选模块"
              value={moduleFilter}
              options={moduleOptions}
              onChange={setModuleFilter}
              compact
            />
            <SelectField
              ariaLabel="筛选结果"
              value={outcomeFilter}
              options={outcomeOptions}
              onChange={(value) => setOutcomeFilter(value as OutcomeFilter)}
              compact
            />
          </div>
        </section>

        {filteredItems.length === 0 ? (
          <section className="ui-empty-state text-sm font-bold leading-6">
            暂无匹配的作答记录。
          </section>
        ) : (
          <section className="space-y-3">
            {paginatedItems.items.map((item) => (
              <React.Fragment key={item.id}>
                <HistoryItemCard
                  item={item}
                  expanded={visibleExpandedId === item.id}
                  onToggle={() => setExpandedId(visibleExpandedId === item.id ? '' : item.id)}
                />
              </React.Fragment>
            ))}
            <div
              data-testid="answered-history-pagination"
              className="flex flex-col gap-3 rounded-2xl border border-[#dde5ee] bg-white p-3 text-xs font-black text-slate-500 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                第 {paginatedItems.startIndex}-{paginatedItems.endIndex} 条 / 共 {paginatedItems.totalCount} 条
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={paginatedItems.page <= 1}
                  onClick={() => goToPage(paginatedItems.page - 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-[#003178] transition hover:border-[#003178]/40 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="上一页"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => goToPage(pageNumber)}
                    className={`h-9 min-w-9 rounded-xl border px-3 transition ${
                      pageNumber === paginatedItems.page
                        ? 'border-[#003178] bg-[#003178] text-white'
                        : 'border-slate-200 bg-white text-[#003178] hover:border-[#003178]/40'
                    }`}
                    aria-current={pageNumber === paginatedItems.page ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={paginatedItems.page >= paginatedItems.pageCount}
                  onClick={() => goToPage(paginatedItems.page + 1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-[#003178] transition hover:border-[#003178]/40 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="下一页"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
