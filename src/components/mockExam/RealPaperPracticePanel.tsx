import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import {
  LocalRealExamPaper,
  LocalRealPaperAnswerReference,
  LocalRealPaperContent,
} from '../../domain/practice/localRealPapers';
import { apiRequest } from '../../lib/api';
import { pausePracticeSpeech, playPracticeSpeech, resumePracticeSpeech, stopPracticeSpeech } from '../../lib/practiceSpeech';
import { SelectField } from '../controls/FormControls';
import { loadPracticeDraft, practiceDraftKeys, savePracticeDraft } from '../../domain/practice/draftProgress';

export type LocalRealPaperLoadStatus = 'loading' | 'ready' | 'fallback' | 'empty' | 'error';

type LocalPaperReferenceStatus = 'idle' | 'loading' | 'generating' | 'ready' | 'missing' | 'error';
type LocalPaperReferencePayload = {
  reference: LocalRealPaperAnswerReference | null;
  status?: 'ready' | 'missing';
};
type LocalPaperContentStatus = 'loading' | 'ready' | 'error';
type LocalListeningAudioStatus = 'idle' | 'loading' | 'ready' | 'error';
type LocalRealChoice = 'A' | 'B' | 'C' | 'D';
type SpeechPlaybackState = 'idle' | 'playing' | 'paused';
type ResourceBadgeTone = 'success' | 'warning' | 'neutral' | 'info';

export interface ResourceBadgeModel {
  label: string;
  tone: ResourceBadgeTone;
  testId?: string;
}

interface LocalRealPaperDraft {
  choices: Record<string, LocalRealChoice | undefined>;
  writingAnswer: string;
  translationAnswer: string;
  updatedAt: string;
}

interface RealPaperPracticePanelProps {
  papers: LocalRealExamPaper[];
  selectedPaper: LocalRealExamPaper;
  loadStatus: LocalRealPaperLoadStatus;
  loadMessage: string;
  onSelect: (paperId: string) => void;
}

const ALL_LOCAL_PAPER_FILTER = 'all';
function countEnglishWords(value: string): number {
  return value
    .trim()
    .split(/[^\p{L}\p{N}'-]+/u)
    .filter(Boolean)
    .length;
}

function createEmptyLocalRealPaperDraft(): LocalRealPaperDraft {
  return {
    choices: {},
    writingAnswer: '',
    translationAnswer: '',
    updatedAt: '',
  };
}

function normalizeLocalRealPaperDraft(value: unknown): LocalRealPaperDraft {
  if (!value || typeof value !== 'object') return createEmptyLocalRealPaperDraft();
  const draft = value as Partial<LocalRealPaperDraft>;
  return {
    choices: typeof draft.choices === 'object' && draft.choices ? draft.choices : {},
    writingAnswer: typeof draft.writingAnswer === 'string' ? draft.writingAnswer : '',
    translationAnswer: typeof draft.translationAnswer === 'string' ? draft.translationAnswer : '',
    updatedAt: typeof draft.updatedAt === 'string' ? draft.updatedAt : '',
  };
}

function loadLocalRealPaperDraft(paperId: string): LocalRealPaperDraft {
  if (!paperId) return createEmptyLocalRealPaperDraft();
  return normalizeLocalRealPaperDraft(loadPracticeDraft(practiceDraftKeys.realPaper(paperId)));
}

function saveLocalRealPaperDraft(paperId: string, draft: LocalRealPaperDraft) {
  if (!paperId) return;
  savePracticeDraft(practiceDraftKeys.realPaper(paperId), draft);
}

function formatFileSize(sizeBytes?: number): string | null {
  if (!sizeBytes || sizeBytes <= 0) return null;
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

export function getAnswerResourceBadge(
  paper: LocalRealExamPaper,
  answerReference?: LocalRealPaperAnswerReference | null,
): ResourceBadgeModel {
  if (paper.hasAnswerKey && paper.answerKeyUrl) {
    return { label: '有答案', tone: 'success', testId: 'local-real-paper-answer-status' };
  }
  if (answerReference) {
    return { label: 'AI 参考答案', tone: 'info', testId: 'local-real-paper-answer-status' };
  }
  return { label: '缺答案', tone: 'warning', testId: 'local-real-paper-answer-status' };
}

export function getListeningResourceBadge(paper: LocalRealExamPaper): ResourceBadgeModel {
  if (paper.listeningSource === 'local-file' && paper.listeningAudioUrl) {
    return { label: '有原音频', tone: 'success', testId: 'local-real-paper-audio-status' };
  }
  if (paper.listeningSource === 'generated-tts' && paper.listeningAudioUrl) {
    return { label: 'TTS 音频', tone: 'info', testId: 'local-real-paper-audio-status' };
  }
  if (paper.listeningSource === 'browser-tts' || paper.hasListeningContent) {
    return { label: '浏览器朗读', tone: 'info', testId: 'local-real-paper-audio-status' };
  }
  return { label: '缺音频', tone: 'warning', testId: 'local-real-paper-audio-status' };
}

function getPageResourceBadge(status?: LocalPaperContentStatus): ResourceBadgeModel {
  if (status === 'ready') return { label: '页面可做', tone: 'success', testId: 'local-real-paper-page-status' };
  if (status === 'loading') return { label: '页面转换中', tone: 'info', testId: 'local-real-paper-page-status' };
  if (status === 'error') return { label: '仅 PDF 可看', tone: 'warning', testId: 'local-real-paper-page-status' };
  return { label: '页面待打开', tone: 'neutral', testId: 'local-real-paper-page-status' };
}

function getBadgeClassName(tone: ResourceBadgeTone): string {
  switch (tone) {
    case 'success':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
    case 'warning':
      return 'bg-amber-50 text-amber-700 ring-amber-100';
    case 'info':
      return 'bg-[#eef7fc] text-[#003178] ring-[#d2e2ec]';
    default:
      return 'bg-white text-slate-600 ring-slate-100';
  }
}

export function ResourceBadge({ badge }: { badge: ResourceBadgeModel }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${getBadgeClassName(badge.tone)}`}
      data-testid={badge.testId}
    >
      {badge.label}
    </span>
  );
}

function RealPaperResourceBadges({
  paper,
  answerReference,
  pageStatus,
  withTestIds = false,
}: {
  paper: LocalRealExamPaper;
  answerReference?: LocalRealPaperAnswerReference | null;
  pageStatus?: LocalPaperContentStatus;
  withTestIds?: boolean;
}) {
  const badges = [
    getPageResourceBadge(pageStatus),
    { label: 'PDF 可看', tone: 'neutral' as const },
    getAnswerResourceBadge(paper, answerReference),
    getListeningResourceBadge(paper),
    { label: '不计入模考分', tone: 'neutral' as const },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => {
        const displayBadge = withTestIds ? badge : { ...badge, testId: undefined };
        return (
          <Fragment key={`${badge.label}-${badge.tone}`}>
            <ResourceBadge badge={displayBadge} />
          </Fragment>
        );
      })}
    </div>
  );
}

export default function RealPaperPracticePanel({
  papers,
  selectedPaper,
  loadStatus,
  loadMessage,
  onSelect,
}: RealPaperPracticePanelProps) {
  const availableYears = useMemo(() => {
    return [...new Set(papers.map((paper) => paper.year).filter((year): year is number => Boolean(year)))]
      .sort((left, right) => right - left);
  }, [papers]);
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(ALL_LOCAL_PAPER_FILTER);
  const [paperContent, setPaperContent] = useState<LocalRealPaperContent | null>(null);
  const [paperContentStatus, setPaperContentStatus] = useState<LocalPaperContentStatus>('loading');
  const [paperContentMessage, setPaperContentMessage] = useState('正在转换 PDF 为页面文本...');
  const [answerReference, setAnswerReference] = useState<LocalRealPaperAnswerReference | null>(null);
  const [referenceStatus, setReferenceStatus] = useState<LocalPaperReferenceStatus>('idle');
  const [referenceMessage, setReferenceMessage] = useState('');
  const [practiceDraft, setPracticeDraft] = useState<LocalRealPaperDraft>(() => loadLocalRealPaperDraft(selectedPaper.id));
  const listeningAudioRef = useRef<HTMLAudioElement | null>(null);
  const [listeningAudioStatus, setListeningAudioStatus] = useState<LocalListeningAudioStatus>('idle');
  const [localAudioPlayback, setLocalAudioPlayback] = useState<SpeechPlaybackState>('idle');
  const [referenceSpeechPlayback, setReferenceSpeechPlayback] = useState<SpeechPlaybackState>('idle');
  const effectiveYearFilter = yearFilter || String(availableYears[0] ?? ALL_LOCAL_PAPER_FILTER);
  const availableMonths = useMemo(() => {
    const scopedPapers = effectiveYearFilter === ALL_LOCAL_PAPER_FILTER
      ? papers
      : papers.filter((paper) => String(paper.year) === effectiveYearFilter);
    return [...new Set(scopedPapers.map((paper) => paper.month).filter((month): month is number => Boolean(month)))]
      .sort((left, right) => right - left);
  }, [effectiveYearFilter, papers]);
  const filteredPapers = useMemo(() => {
    return papers.filter((paper) => {
      const matchesYear = effectiveYearFilter === ALL_LOCAL_PAPER_FILTER || String(paper.year) === effectiveYearFilter;
      const matchesMonth = monthFilter === ALL_LOCAL_PAPER_FILTER || String(paper.month) === monthFilter;
      return matchesYear && matchesMonth;
    });
  }, [effectiveYearFilter, monthFilter, papers]);
  const localRealChoiceQuestionKeys = useMemo(() => getLocalRealChoiceQuestionKeys(paperContent), [paperContent]);
  const localRealAnsweredChoiceCount = localRealChoiceQuestionKeys.filter((key) => practiceDraft.choices[key]).length;
  const localRealSubjectiveAnsweredCount = [
    practiceDraft.writingAnswer.trim(),
    practiceDraft.translationAnswer.trim(),
  ].filter(Boolean).length;
  const extractedListeningText = paperContent?.sections.find((section) => section.id === 'listening')?.text.trim() ?? '';
  const listeningSpeechText = answerReference?.listeningPractice?.script || extractedListeningText;
  const canSpeakListeningText = Boolean(listeningSpeechText);
  const yearOptions = [
    { value: ALL_LOCAL_PAPER_FILTER, label: '全部年份' },
    ...availableYears.map((year) => ({ value: String(year), label: `${year} 年` })),
  ];
  const monthOptions = [
    { value: ALL_LOCAL_PAPER_FILTER, label: '全部月份' },
    ...availableMonths.map((month) => ({ value: String(month), label: `${month} 月` })),
  ];

  useEffect(() => {
    if (monthFilter !== ALL_LOCAL_PAPER_FILTER && !availableMonths.some((month) => String(month) === monthFilter)) {
      setMonthFilter(ALL_LOCAL_PAPER_FILTER);
    }
  }, [availableMonths, monthFilter]);

  useEffect(() => {
    if (filteredPapers.length > 0 && !filteredPapers.some((paper) => paper.id === selectedPaper.id)) {
      onSelect(filteredPapers[0].id);
    }
  }, [filteredPapers, onSelect, selectedPaper.id]);

  useEffect(() => {
    setPracticeDraft(loadLocalRealPaperDraft(selectedPaper.id));
    setListeningAudioStatus('idle');
    setLocalAudioPlayback('idle');
    setReferenceSpeechPlayback('idle');
    stopPracticeSpeech();
    const audio = listeningAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [selectedPaper.id]);

  useEffect(() => {
    return () => stopPracticeSpeech();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPaperContent = async () => {
      setPaperContent(null);
      setPaperContentStatus('loading');
      setPaperContentMessage('正在转换 PDF 为页面文本...');
      try {
        const payload = await apiRequest<{ content: LocalRealPaperContent }>(
          `/api/local-real-papers/${selectedPaper.id}/content`,
        );
        if (cancelled) return;
        setPaperContent(payload.content);
        setPaperContentStatus('ready');
        setPaperContentMessage(payload.content.truncated ? '文本较长，已按安全长度截断展示。' : '已转换为页面文本。');
      } catch (error) {
        if (cancelled) return;
        setPaperContentStatus('error');
        setPaperContentMessage((error as Error).message);
      }
    };

    loadPaperContent();

    return () => {
      cancelled = true;
    };
  }, [selectedPaper.id]);

  useEffect(() => {
    let cancelled = false;

    const loadCachedReference = async () => {
      setAnswerReference(null);
      setReferenceMessage('');
      setReferenceStatus('loading');
      try {
        const payload = await apiRequest<LocalPaperReferencePayload>(
          `/api/local-real-papers/${selectedPaper.id}/ai-reference`,
        );
        if (cancelled) return;
        if (!payload.reference) {
          setReferenceStatus('missing');
          return;
        }
        setAnswerReference(payload.reference);
        setReferenceStatus('ready');
      } catch (error) {
        if (cancelled) return;
        const message = (error as Error).message;
        setReferenceStatus(message.includes('还没有生成') ? 'missing' : 'error');
        setReferenceMessage(message.includes('还没有生成') ? '' : message);
      }
    };

    loadCachedReference();

    return () => {
      cancelled = true;
    };
  }, [selectedPaper.id]);

  const generateAnswerReference = async () => {
    setReferenceStatus('generating');
    setReferenceMessage('正在从 PDF 提取文字并生成 AI 参考答案...');
    try {
      const payload = await apiRequest<{ reference: LocalRealPaperAnswerReference }>(
        `/api/local-real-papers/${selectedPaper.id}/ai-reference`,
        { method: 'POST', body: JSON.stringify({}) },
      );
      setAnswerReference(payload.reference);
      setReferenceStatus('ready');
      setReferenceMessage('已生成 AI 参考答案；仅供自学核对，非官方答案。');
    } catch (error) {
      setReferenceStatus('error');
      setReferenceMessage((error as Error).message);
    }
  };

  const speakAiListeningPractice = async () => {
    if (!listeningSpeechText) return;

    if (referenceSpeechPlayback === 'playing') {
      if (pausePracticeSpeech()) {
        setReferenceSpeechPlayback('paused');
        return;
      }
      stopPracticeSpeech();
      setReferenceSpeechPlayback('idle');
      return;
    }

    if (referenceSpeechPlayback === 'paused') {
      const resumed = await resumePracticeSpeech();
      if (resumed) {
        setReferenceSpeechPlayback('playing');
        return;
      }
    }

    await playPracticeSpeech(listeningSpeechText, {
      rate: 0.88,
      preferLocalAudio: false,
      onStart: () => setReferenceSpeechPlayback('playing'),
      onEnd: () => setReferenceSpeechPlayback('idle'),
      onError: () => setReferenceSpeechPlayback('idle'),
    });
  };

  const playLocalListeningAudio = async () => {
    const audio = listeningAudioRef.current;
    if (!audio) return;

    if (!audio.paused && !audio.ended) {
      audio.pause();
      setLocalAudioPlayback('paused');
      return;
    }

    try {
      stopPracticeSpeech();
      setListeningAudioStatus('loading');
      if (audio.ended) audio.currentTime = 0;
      if (audio.readyState === 0) audio.load();
      await audio.play();
      setLocalAudioPlayback('playing');
      setListeningAudioStatus('ready');
    } catch (error) {
      console.warn('Unable to play local listening audio:', error);
      setLocalAudioPlayback('idle');
      setListeningAudioStatus('error');
    }
  };

  const updatePracticeDraft = (updater: (current: LocalRealPaperDraft) => LocalRealPaperDraft) => {
    setPracticeDraft((current) => {
      const next = {
        ...updater(current),
        updatedAt: new Date().toISOString(),
      };
      saveLocalRealPaperDraft(selectedPaper.id, next);
      return next;
    });
  };

  const answerLocalRealChoice = (questionKey: string, choice: LocalRealChoice) => {
    updatePracticeDraft((current) => ({
      ...current,
      choices: {
        ...current.choices,
        [questionKey]: choice,
      },
    }));
  };

  const updateLocalRealSubjective = (field: 'writingAnswer' | 'translationAnswer', value: string) => {
    updatePracticeDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetLocalRealDraft = () => {
    const next = {
      ...createEmptyLocalRealPaperDraft(),
      updatedAt: new Date().toISOString(),
    };
    saveLocalRealPaperDraft(selectedPaper.id, next);
    setPracticeDraft(next);
  };

  return (
    <section className="ui-panel" data-testid="local-real-paper-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="ui-chip ui-chip-accent">本地真题 PDF 卷</div>
          <h3 className="mt-3 text-xl font-black text-[#101828]">你提供的真题资料</h3>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            动态读取本机 PDF，不复制进项目；未发现标准答案键和听力音频时，不参与自动评分。
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
            <span
              className="rounded-full bg-slate-50 px-3 py-1 text-slate-600"
              data-testid="local-real-paper-count"
            >
              {loadStatus === 'loading' ? '正在扫描' : `当前 ${papers.length} 套`}
            </span>
          </div>
          <div className="mt-3" data-testid="local-real-paper-selected-resources">
            <RealPaperResourceBadges
              paper={selectedPaper}
              answerReference={answerReference}
              pageStatus={paperContentStatus}
              withTestIds
            />
          </div>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{loadMessage}</p>
        </div>
        <a
          href={selectedPaper.pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="ui-button ui-button-primary shrink-0"
        >
          打开原 PDF
          <ChevronRight className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <SelectField
          ariaLabel="筛选真题年份"
          value={effectiveYearFilter}
          options={yearOptions}
          onChange={setYearFilter}
          compact
          testId="local-real-paper-year-filter"
        />
        <SelectField
          ariaLabel="筛选真题月份"
          value={monthFilter}
          options={monthOptions}
          onChange={setMonthFilter}
          compact
          testId="local-real-paper-month-filter"
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {filteredPapers.map((paper, index) => {
          const isSelected = paper.id === selectedPaper.id;
          const sizeLabel = formatFileSize(paper.sizeBytes);
          return (
            <button
              key={paper.id}
              type="button"
              onClick={() => onSelect(paper.id)}
              className={`rounded-3xl border p-4 text-left transition ${
                isSelected
                  ? 'border-[#003178] bg-[#f8fbff] text-[#003178] ring-1 ring-[#dcecff]'
                  : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-[#003178]/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-sm font-black">{paper.title}</div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black">
                  卷 {index + 1}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                <span className="rounded-full bg-white px-2.5 py-1">{paper.examDate}</span>
                <span className="rounded-full bg-white px-2.5 py-1">{paper.setLabel}</span>
                <span className="rounded-full bg-white px-2.5 py-1">
                  {paper.pageCount ? `${paper.pageCount} 页` : sizeLabel ?? '本地 PDF'}
                </span>
              </div>
              <div className="mt-3">
                <RealPaperResourceBadges
                  paper={paper}
                  answerReference={isSelected ? answerReference : null}
                  pageStatus={isSelected ? paperContentStatus : undefined}
                />
              </div>
              {isSelected && (
                <p className="mt-3 text-xs font-bold leading-5 opacity-80">{paper.note}</p>
              )}
            </button>
          );
        })}
      </div>
      {filteredPapers.length === 0 && (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
          当前筛选条件下没有真题 PDF。
        </div>
      )}

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
          <div className="text-sm font-black text-[#101828]">答案</div>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
            {selectedPaper.answerKeyUrl
              ? '已匹配本地答案文件。'
              : answerReference
                ? '已生成非官方 AI 参考答案，可用于自学核对。'
                : '缺少答案文件，可生成非官方 AI 参考答案。'}
          </p>
          {selectedPaper.answerKeyUrl ? (
            <a href={selectedPaper.answerKeyUrl} target="_blank" rel="noreferrer" className="ui-button ui-button-secondary mt-3 w-full">
              打开本地答案
            </a>
          ) : (
            <button
              type="button"
              className="ui-button ui-button-primary mt-3 w-full"
              onClick={generateAnswerReference}
              disabled={referenceStatus === 'generating'}
              data-testid="local-real-paper-generate-reference"
            >
              {referenceStatus === 'generating' && <Loader2 className="h-4 w-4 animate-spin" />}
              {answerReference ? '重新生成 AI 参考答案' : '生成 AI 参考答案'}
            </button>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
          <div className="text-sm font-black text-[#101828]">听力</div>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
            {selectedPaper.listeningSource === 'local-file'
              ? '已找到本地听力音频。'
              : selectedPaper.listeningSource === 'generated-tts'
                ? '使用本机 TTS 练习音频，非官方原音。'
                : selectedPaper.listeningSource === 'browser-tts'
                  ? '无官方原音；可朗读页面版听力文本。'
                  : '这套卷未提供听力文本或音频。'}
          </p>
          {selectedPaper.listeningAudioUrl ? (
            <div className="mt-3 space-y-3">
              <button
                type="button"
                className="ui-button ui-button-primary w-full"
                onClick={playLocalListeningAudio}
                disabled={listeningAudioStatus === 'loading'}
                data-testid="local-real-paper-play-audio"
              >
                {listeningAudioStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                {localAudioPlayback === 'playing'
                  ? '暂停听力音频'
                  : localAudioPlayback === 'paused'
                    ? '继续听力音频'
                    : selectedPaper.listeningSource === 'local-file'
                      ? '播放听力音频'
                      : '生成并播放听力音频'}
              </button>
              <audio
                ref={listeningAudioRef}
                className="w-full"
                controls
                preload="none"
                src={selectedPaper.listeningAudioUrl}
                data-testid="local-real-paper-audio"
                onCanPlay={() => setListeningAudioStatus('ready')}
                onWaiting={() => setListeningAudioStatus('loading')}
                onError={() => setListeningAudioStatus('error')}
                onPlay={() => setLocalAudioPlayback('playing')}
                onPause={(event) => {
                  if (event.currentTarget.ended) return;
                  setLocalAudioPlayback('paused');
                }}
                onEnded={() => setLocalAudioPlayback('idle')}
              />
              {listeningAudioStatus === 'error' ? (
                <p className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-700">
                  音频暂时无法自动播放，可点击下面的“打开听力音频”。
                </p>
              ) : null}
              <a
                href={selectedPaper.listeningAudioUrl}
                target="_blank"
                rel="noreferrer"
                className="ui-button ui-button-secondary w-full"
                data-testid="local-real-paper-open-audio"
              >
                打开听力音频
              </a>
            </div>
          ) : canSpeakListeningText ? (
            <button
              type="button"
              className="ui-button ui-button-secondary mt-3 w-full"
              onClick={speakAiListeningPractice}
              data-testid="local-real-paper-speak-reference"
            >
              {referenceSpeechPlayback === 'playing'
                ? '暂停听力朗读'
                : referenceSpeechPlayback === 'paused'
                  ? '继续听力朗读'
                  : answerReference?.listeningPractice
                    ? '朗读 AI 听力练习'
                    : '朗读页面听力文本'}
            </button>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-500">
              当前没有可朗读的听力文本。
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
          <div className="text-sm font-black text-amber-800">来源说明</div>
          <p className="mt-2 text-xs font-bold leading-5 text-amber-700">
            本地文件会标记为本地答案/本地音频；AI 生成内容只作为自学参考，不作为官方答案或可靠评分依据。
          </p>
          <p className="mt-2 text-xs font-bold leading-5 text-amber-700">{referenceMessage}</p>
        </div>
      </div>

      {answerReference && (
        <AnswerReferencePanel
          reference={answerReference}
          onSpeakListening={speakAiListeningPractice}
          speechPlayback={referenceSpeechPlayback}
        />
      )}

      <LocalRealPaperContentPanel
        content={paperContent}
        status={paperContentStatus}
        message={paperContentMessage}
        fallbackPdfUrl={selectedPaper.pdfUrl}
        draft={practiceDraft}
        answeredChoiceCount={localRealAnsweredChoiceCount}
        totalChoiceCount={localRealChoiceQuestionKeys.length}
        subjectiveAnsweredCount={localRealSubjectiveAnsweredCount}
        onChoice={answerLocalRealChoice}
        onSubjectiveChange={updateLocalRealSubjective}
        onResetDraft={resetLocalRealDraft}
      />
    </section>
  );
}

function splitContentParagraphs(text: string) {
  return text
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type PaperTextBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'question'; number: string; prompt: string; options: string[] };

function isSectionInstruction(line: string) {
  return /^(Part\s+[IVX]+|Section\s+[A-C]|Directions:|Questions?\s+\d+)/i.test(line);
}

function parsePaperTextBlocks(text: string): PaperTextBlock[] {
  const blocks: PaperTextBlock[] = [];
  let currentQuestion: Extract<PaperTextBlock, { type: 'question' }> | null = null;

  const flushQuestion = () => {
    if (currentQuestion) {
      blocks.push(currentQuestion);
      currentQuestion = null;
    }
  };

  splitContentParagraphs(text).forEach((line) => {
    const questionMatch = /^(\d{1,2})[.)]\s*(.*)$/.exec(line);
    if (questionMatch) {
      flushQuestion();
      currentQuestion = {
        type: 'question',
        number: questionMatch[1],
        prompt: questionMatch[2]?.trim() ?? '',
        options: [],
      };
      return;
    }

    const optionMatch = /^([A-D])[.)]\s*(.*)$/.exec(line);
    if (optionMatch && currentQuestion) {
      currentQuestion.options.push(`${optionMatch[1]}. ${optionMatch[2].trim()}`);
      return;
    }

    if (currentQuestion && !isSectionInstruction(line) && currentQuestion.options.length === 0) {
      currentQuestion.prompt = [currentQuestion.prompt, line].filter(Boolean).join(' ');
      return;
    }

    flushQuestion();
    blocks.push({ type: 'paragraph', text: line });
  });

  flushQuestion();
  return blocks;
}

function getLocalRealChoiceQuestionKey(sectionId: string, questionNumber: string) {
  return `${sectionId}-${questionNumber}`;
}

function getLocalRealChoiceQuestionKeys(content: LocalRealPaperContent | null): string[] {
  if (!content) return [];
  return content.sections.flatMap((section) => parsePaperTextBlocks(section.text)
    .filter((block): block is Extract<PaperTextBlock, { type: 'question' }> => block.type === 'question')
    .filter((block) => block.options.length > 0)
    .map((block) => getLocalRealChoiceQuestionKey(section.id, block.number)));
}

function PaperSectionText({
  section,
  draft,
  onChoice,
  onSubjectiveChange,
}: {
  section: LocalRealPaperContent['sections'][number];
  draft: LocalRealPaperDraft;
  onChoice: (questionKey: string, choice: LocalRealChoice) => void;
  onSubjectiveChange: (field: 'writingAnswer' | 'translationAnswer', value: string) => void;
}) {
  const blocks = parsePaperTextBlocks(section.text);
  const showWritingAnswerBox = section.id === 'writing';
  const showTranslationAnswerBox = section.id === 'translation';

  return (
    <div className="mt-5 space-y-3 text-sm font-semibold leading-7 text-slate-700">
      {blocks.map((block, index) => {
        if (block.type === 'paragraph') {
          return (
            <p key={`${section.id}-paragraph-${index}`} className="rounded-2xl bg-white px-1">
              {block.text}
            </p>
          );
        }

        const questionKey = getLocalRealChoiceQuestionKey(section.id, block.number);

        return (
          <div
            key={`${section.id}-question-${block.number}-${index}`}
            data-testid={`local-real-paper-question-${block.number}`}
            className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#003178] text-xs font-black text-white">
                {block.number}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black leading-6 text-[#101828]">
                  {block.prompt || (section.id === 'listening' ? '听力题题干以音频为准，PDF 当前只显示选项。' : '题干未从 PDF 中稳定提取。')}
                </div>
                {block.options.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {block.options.map((option) => {
                      const choiceMatch = /^([A-D])\./.exec(option);
                      const choice = choiceMatch?.[1] as LocalRealChoice | undefined;
                      const selected = choice ? draft.choices[questionKey] === choice : false;
                      return (
                        <button
                          key={option}
                          type="button"
                          data-testid={choice ? `local-real-paper-choice-${questionKey}-${choice}` : undefined}
                          aria-pressed={selected}
                          onClick={() => {
                            if (choice) onChoice(questionKey, choice);
                          }}
                          disabled={!choice}
                          className={`min-h-11 rounded-2xl border px-3 py-2 text-left text-xs font-bold leading-5 transition ${
                            selected
                              ? 'border-[#003178] bg-[#003178] text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#003178]/40'
                          } disabled:cursor-not-allowed disabled:opacity-70`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {showWritingAnswerBox && (
        <div className="rounded-3xl border border-[#dcecff] bg-[#f8fbff] p-4">
          <label className="text-sm font-black text-[#101828]" htmlFor="local-real-paper-writing-answer">
            写作答题区
          </label>
          <textarea
            id="local-real-paper-writing-answer"
            data-testid="local-real-paper-writing-answer"
            value={draft.writingAnswer}
            onChange={(event) => onSubjectiveChange('writingAnswer', event.target.value)}
            className="mt-3 min-h-64 w-full rounded-3xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-7 text-slate-700 outline-none focus:ring-2 focus:ring-[#003178]/25"
            placeholder="在这里完成本套真题写作。内容会自动保存到当前账号。"
          />
          <p className="mt-2 text-xs font-bold text-slate-500">
            当前约 {countEnglishWords(draft.writingAnswer)} 个英文词。
          </p>
        </div>
      )}
      {showTranslationAnswerBox && (
        <div className="rounded-3xl border border-[#dcecff] bg-[#f8fbff] p-4">
          <label className="text-sm font-black text-[#101828]" htmlFor="local-real-paper-translation-answer">
            翻译答题区
          </label>
          <textarea
            id="local-real-paper-translation-answer"
            data-testid="local-real-paper-translation-answer"
            value={draft.translationAnswer}
            onChange={(event) => onSubjectiveChange('translationAnswer', event.target.value)}
            className="mt-3 min-h-64 w-full rounded-3xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-7 text-slate-700 outline-none focus:ring-2 focus:ring-[#003178]/25"
            placeholder="在这里完成本套真题翻译。内容会自动保存到当前账号。"
          />
          <p className="mt-2 text-xs font-bold text-slate-500">
            当前约 {countEnglishWords(draft.translationAnswer)} 个英文词。
          </p>
        </div>
      )}
    </div>
  );
}

function LocalRealPaperContentPanel({
  content,
  status,
  message,
  fallbackPdfUrl,
  draft,
  answeredChoiceCount,
  totalChoiceCount,
  subjectiveAnsweredCount,
  onChoice,
  onSubjectiveChange,
  onResetDraft,
}: {
  content: LocalRealPaperContent | null;
  status: LocalPaperContentStatus;
  message: string;
  fallbackPdfUrl: string;
  draft: LocalRealPaperDraft;
  answeredChoiceCount: number;
  totalChoiceCount: number;
  subjectiveAnsweredCount: number;
  onChoice: (questionKey: string, choice: LocalRealChoice) => void;
  onSubjectiveChange: (field: 'writingAnswer' | 'translationAnswer', value: string) => void;
  onResetDraft: () => void;
}) {
  const [activeSectionId, setActiveSectionId] = useState<string>('writing');
  const activeSection = content?.sections.find((section) => section.id === activeSectionId)
    ?? content?.sections[0]
    ?? null;

  useEffect(() => {
    if (!content || content.sections.length === 0) return;
    if (!content.sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(content.sections[0].id);
    }
  }, [activeSectionId, content]);

  return (
    <section className="mt-5 overflow-hidden rounded-[2rem] border border-slate-100 bg-white" data-testid="local-real-paper-content">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-black text-[#101828]">页面版真题</div>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            {message} 默认展示 PDF 提取后的页面文本，可直接作答并自动保存到当前账号。
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
            <span className="rounded-full bg-white px-3 py-1 text-[#003178]" data-testid="local-real-paper-answer-progress">
              选择题 {answeredChoiceCount}/{totalChoiceCount}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-slate-600">
              主观题 {subjectiveAnsweredCount}/2
            </span>
            {draft.updatedAt && (
              <span className="rounded-full bg-white px-3 py-1 text-slate-500">
                已自动保存
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ui-button ui-button-secondary shrink-0"
            onClick={onResetDraft}
            data-testid="local-real-paper-reset-draft"
          >
            清空作答
          </button>
          <a href={fallbackPdfUrl} target="_blank" rel="noreferrer" className="ui-button ui-button-secondary shrink-0">
            原 PDF
          </a>
        </div>
      </div>

      {status === 'loading' && (
        <div className="flex min-h-64 items-center justify-center gap-3 p-8 text-sm font-black text-[#003178]">
          <Loader2 className="h-5 w-5 animate-spin" />
          正在转换页面...
        </div>
      )}

      {status === 'error' && (
        <div className="m-4 rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-800">
          页面化展示失败：{message}。你仍可点击“原 PDF”查看。
        </div>
      )}

      {status === 'ready' && content && activeSection && (
        <div className="grid gap-0 lg:grid-cols-[240px_1fr]">
          <aside className="border-b border-slate-100 bg-slate-50 p-3 lg:border-b-0 lg:border-r">
            <div className="px-2 py-2 text-[11px] font-black text-slate-500">
              {content.pageCount} 页 · {content.sections.length} 个模块
            </div>
            <div className="space-y-2">
              {content.sections.map((section) => {
                const active = section.id === activeSection.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`w-full rounded-2xl px-3 py-2 text-left text-xs font-black transition ${
                      active ? 'bg-[#003178] text-white' : 'bg-white text-slate-600 hover:text-[#003178]'
                    }`}
                    onClick={() => setActiveSectionId(section.id)}
                  >
                    {section.label}
                  </button>
                );
              })}
            </div>
          </aside>

          <article className="max-h-[72vh] overflow-auto p-5">
            <div className="mx-auto max-w-4xl">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-black text-[#003178]">{activeSection.label}</div>
                <h4 className="mt-1 text-xl font-black text-[#101828]">{activeSection.title}</h4>
              </div>
              <PaperSectionText
                section={activeSection}
                draft={draft}
                onChoice={onChoice}
                onSubjectiveChange={onSubjectiveChange}
              />
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

function AnswerReferencePanel({
  reference,
  onSpeakListening,
  speechPlayback,
}: {
  reference: LocalRealPaperAnswerReference;
  onSpeakListening: () => void;
  speechPlayback: SpeechPlaybackState;
}) {
  return (
    <section className="mt-5 rounded-[2rem] border border-[#dcecff] bg-[#f8fbff] p-5" data-testid="local-real-paper-ai-reference">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="ui-chip ui-chip-accent">AI 参考答案</div>
          <h4 className="mt-3 text-lg font-black text-[#101828]">非官方核对材料</h4>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
            {reference.notice} 生成时间：{new Date(reference.generatedAt).toLocaleString()}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
          可信度：{reference.confidence}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {reference.writingReference && (
          <div className="rounded-3xl bg-white p-4">
            <div className="text-sm font-black text-[#101828]">写作参考</div>
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-600">{reference.writingReference}</p>
          </div>
        )}
        {reference.translationReference && (
          <div className="rounded-3xl bg-white p-4">
            <div className="text-sm font-black text-[#101828]">翻译参考</div>
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-600">{reference.translationReference}</p>
          </div>
        )}
      </div>

      {reference.answerSections.length > 0 && (
        <div className="mt-4 space-y-3">
          {reference.answerSections.map((section) => (
            <div key={section.section} className="rounded-3xl bg-white p-4">
              <div className="text-sm font-black text-[#101828]">{section.section}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {section.answers.map((answer) => (
                  <span
                    key={`${section.section}-${answer.questionNumber}`}
                    className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-700"
                    title={answer.explanation}
                  >
                    {answer.questionNumber}. {answer.answer}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {reference.listeningPractice && (
        <div className="mt-4 rounded-3xl bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-black text-[#101828]">{reference.listeningPractice.title}</div>
              <p className="mt-1 text-xs font-bold text-slate-500">{reference.listeningPractice.notice}</p>
            </div>
            <button type="button" className="ui-button ui-button-secondary" onClick={onSpeakListening}>
              {speechPlayback === 'playing' ? '暂停脚本' : speechPlayback === 'paused' ? '继续脚本' : '朗读脚本'}
            </button>
          </div>
          <p className="mt-3 max-h-40 overflow-auto rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-600">
            {reference.listeningPractice.script}
          </p>
        </div>
      )}
    </section>
  );
}
