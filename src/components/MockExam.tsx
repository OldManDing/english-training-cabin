import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { CET4_MOCK_EXAM_BANK } from '../questionBank';
import { buildMockExamReport, MockExamReportResult } from '../domain/practice/mockExam';
import { buildMockRepairPlan } from '../domain/productCoach';
import { CET4_LOCAL_REAL_PAPERS, LocalRealExamPaper } from '../domain/practice/localRealPapers';
import { DailyPlan, PracticeCompletionReport, SkillProfile } from '../types';
import { SelectField } from './controls/FormControls';
import { pausePracticeSpeech, playPracticeSpeech, resumePracticeSpeech, stopPracticeSpeech } from '../lib/practiceSpeech';
import StandardMockSectionPanel, {
  TRANSLATION_MIN_WORDS,
  type Choice,
  type MockSectionId,
  type MockSectionStatus,
  type SpeechPlaybackState,
} from './mockExam/StandardMockSectionPanel';
import RealPaperPracticePanel, {
  getAnswerResourceBadge,
  getListeningResourceBadge,
  ResourceBadge,
  type LocalRealPaperLoadStatus,
} from './mockExam/RealPaperPracticePanel';
import PracticeMethodGuide from './PracticeMethodGuide';

type MockExamPageMode = 'standard-mock' | 'real-paper';

interface MockExamProps {
  onBack: () => void;
  onComplete: (score: number, report: PracticeCompletionReport) => void;
  skillProfiles?: SkillProfile[];
  dailyPlan?: DailyPlan | null;
}

function hashText(value: string): number {
  return value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function countEnglishWords(value: string): number {
  return value
    .trim()
    .split(/[^\p{L}\p{N}'-]+/u)
    .filter(Boolean)
    .length;
}

function getWeakestMockProfile(skillProfiles: SkillProfile[]): SkillProfile | undefined {
  return skillProfiles
    .filter((profile) => profile.evidenceCount > 0)
    .filter((profile) => ['writing', 'listening', 'reading', 'translation', 'grammar', 'vocabulary'].includes(profile.skillArea))
    .sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score;
      return right.lastUpdatedAt.localeCompare(left.lastUpdatedAt);
    })[0];
}

function labelWeakSkill(profile?: SkillProfile): string {
  if (!profile) return '尚未完成诊断';
  const subSkillId = profile.subSkillId.toLowerCase();
  if (subSkillId.includes('short-news')) return '短篇新闻';
  if (subSkillId.includes('long-conversation')) return '长对话';
  if (subSkillId.includes('listening-passage')) return '听力篇章';
  if (subSkillId.includes('word-bank')) return '选词填空';
  if (subSkillId.includes('long-matching')) return '长篇匹配';
  if (subSkillId.includes('careful-reading')) return '仔细阅读';
  if (subSkillId.includes('cloze')) return '完形/选词填空';
  if (profile.skillArea === 'grammar') return '语法结构';
  if (profile.skillArea === 'vocabulary') return '词汇语境';
  if (profile.skillArea === 'listening') return '听力';
  if (profile.skillArea === 'writing') return '写作';
  if (profile.skillArea === 'translation') return '翻译';
  return '阅读';
}

function buildMockRecommendation(skillProfiles: SkillProfile[], dailyPlan?: DailyPlan | null) {
  const weakProfile = getWeakestMockProfile(skillProfiles);
  const plannedMock = dailyPlan?.tasks.find((task) => task.type === 'mock');
  const seed = weakProfile ? `${weakProfile.skillArea}-${weakProfile.subSkillId}-${weakProfile.score}` : plannedMock?.id ?? 'default';
  const index = weakProfile && CET4_MOCK_EXAM_BANK.length > 0 ? hashText(seed) % CET4_MOCK_EXAM_BANK.length : 0;
  const paper = CET4_MOCK_EXAM_BANK[index] ?? CET4_MOCK_EXAM_BANK[0];
  const weakLabel = labelWeakSkill(weakProfile);

  return {
    paper,
    weakLabel,
    reason: weakProfile
      ? `${weakLabel} ${weakProfile.score}% · 第 ${index + 1} 套`
      : '默认阶段卷',
  };
}

export default function MockExam({ onComplete, skillProfiles = [], dailyPlan }: MockExamProps) {
  const mockRecommendation = useMemo(
    () => buildMockRecommendation(skillProfiles, dailyPlan),
    [dailyPlan, skillProfiles],
  );
  const [startedAt] = useState(() => new Date().toISOString());
  const [activeSection, setActiveSection] = useState<MockSectionId>('writing');
  const [choices, setChoices] = useState<Record<string, Choice | undefined>>({});
  const [writingAnswer, setWritingAnswer] = useState('');
  const [translationAnswer, setTranslationAnswer] = useState('');
  const [result, setResult] = useState<MockExamReportResult | null>(null);
  const mockRepairPlan = useMemo(() => result ? buildMockRepairPlan(result.sectionScores) : [], [result]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [pageMode, setPageMode] = useState<MockExamPageMode>('standard-mock');
  const [selectedPaperId, setSelectedPaperId] = useState(mockRecommendation.paper.id);
  const [hasManualPaperSelection, setHasManualPaperSelection] = useState(false);
  const [localRealPapers, setLocalRealPapers] = useState<LocalRealExamPaper[]>(CET4_LOCAL_REAL_PAPERS);
  const [localRealPaperStatus, setLocalRealPaperStatus] = useState<LocalRealPaperLoadStatus>('loading');
  const [localRealPaperMessage, setLocalRealPaperMessage] = useState('正在扫描本地真题目录...');
  const [selectedLocalPaperId, setSelectedLocalPaperId] = useState(CET4_LOCAL_REAL_PAPERS[0]?.id ?? '');
  const [standardListeningPlayback, setStandardListeningPlayback] = useState<SpeechPlaybackState>('idle');
  const paper = CET4_MOCK_EXAM_BANK.find((item) => item.id === selectedPaperId) ?? CET4_MOCK_EXAM_BANK[0];
  const selectedLocalPaper = localRealPapers.find((item) => item.id === selectedLocalPaperId) ?? localRealPapers[0];
  const listeningAnsweredCount = paper.listening.questions.filter((question) => choices[question.id]).length;
  const readingAnsweredCount = paper.reading.questions.filter((question) => choices[question.id]).length;
  const writingWordCount = countEnglishWords(writingAnswer);
  const translationWordCount = countEnglishWords(translationAnswer);
  const writingReady = writingWordCount >= paper.writing.minWords;
  const listeningReady = listeningAnsweredCount === paper.listening.questions.length;
  const readingReady = readingAnsweredCount === paper.reading.questions.length;
  const translationReady = translationWordCount >= TRANSLATION_MIN_WORDS;
  const canSubmit = writingReady && listeningReady && readingReady && translationReady;

  const sections: MockSectionStatus[] = [
    {
      id: 'writing',
      label: '写作',
      shortLabel: '写作',
      time: '30m',
      status: writingReady ? '已完成' : `还差 ${Math.max(0, paper.writing.minWords - writingWordCount)} 词`,
      ready: writingReady,
    },
    {
      id: 'listening',
      label: '听力',
      shortLabel: '听力',
      time: '25m',
      status: `${listeningAnsweredCount}/${paper.listening.questions.length} 题`,
      ready: listeningReady,
    },
    {
      id: 'reading',
      label: '阅读',
      shortLabel: '阅读',
      time: '40m',
      status: `${readingAnsweredCount}/${paper.reading.questions.length} 题`,
      ready: readingReady,
    },
    {
      id: 'translation',
      label: '翻译',
      shortLabel: '翻译',
      time: '30m',
      status: translationReady ? '已完成' : `还差 ${Math.max(0, TRANSLATION_MIN_WORDS - translationWordCount)} 词`,
      ready: translationReady,
    },
    {
      id: 'review',
      label: '提交检查',
      shortLabel: '检查',
      time: '提交',
      status: canSubmit ? '可提交' : '仍有未完成项',
      ready: canSubmit,
    },
  ];
  const activeSectionIndex = sections.findIndex((section) => section.id === activeSection);
  const incompleteSections = sections.filter((section) => section.id !== 'review' && !section.ready);
  const completedSectionCount = sections.filter((section) => section.id !== 'review' && section.ready).length;
  const firstIncompleteSection = incompleteSections[0];
  const realPaperAnswerStatus = selectedLocalPaper ? getAnswerResourceBadge(selectedLocalPaper).label : '--';
  const realPaperListeningStatus = selectedLocalPaper ? getListeningResourceBadge(selectedLocalPaper).label : '--';
  const headerMetrics = pageMode === 'standard-mock'
    ? [
        { value: String(paper.plannedMinutes), label: '分钟' },
        { value: `${completedSectionCount}/${sections.length - 1}`, label: '模块完成' },
        { value: String(result?.score ?? '--'), label: '模考分' },
      ]
    : [
        { value: String(localRealPapers.length || '--'), label: '真题套数' },
        { value: realPaperAnswerStatus, label: '答案状态' },
        { value: realPaperListeningStatus, label: '听力状态' },
      ];

  const speakListening = async () => {
    if (standardListeningPlayback === 'playing') {
      if (pausePracticeSpeech()) {
        setStandardListeningPlayback('paused');
        return;
      }
      stopPracticeSpeech();
      setStandardListeningPlayback('idle');
      return;
    }

    if (standardListeningPlayback === 'paused') {
      const resumed = await resumePracticeSpeech();
      if (resumed) {
        setStandardListeningPlayback('playing');
        return;
      }
    }

    await playPracticeSpeech(paper.listening.transcript, {
      rate: 0.88,
      preferLocalAudio: true,
      onStart: () => setStandardListeningPlayback('playing'),
      onEnd: () => setStandardListeningPlayback('idle'),
      onError: () => setStandardListeningPlayback('idle'),
    });
  };

  const resetPaperState = (paperId: string) => {
    setSelectedPaperId(paperId);
    setActiveSection('writing');
    setChoices({});
    setWritingAnswer('');
    setTranslationAnswer('');
    setResult(null);
    stopPracticeSpeech();
    setStandardListeningPlayback('idle');
  };

  useEffect(() => {
    return () => stopPracticeSpeech();
  }, []);

  useEffect(() => {
    if (hasManualPaperSelection || result) return;
    if (selectedPaperId !== mockRecommendation.paper.id) {
      resetPaperState(mockRecommendation.paper.id);
    }
  }, [hasManualPaperSelection, mockRecommendation.paper.id, result, selectedPaperId]);

  useEffect(() => {
    let cancelled = false;

    const loadLocalRealPapers = async () => {
      try {
        const response = await fetch('/api/local-real-papers?exam=cet4');
        if (!response.ok) {
          throw new Error(`扫描接口返回 ${response.status}`);
        }

        const data = await response.json() as {
          papers?: LocalRealExamPaper[];
          total?: number;
        };
        const papers = Array.isArray(data.papers) ? data.papers : [];
        if (cancelled) return;

        if (papers.length > 0) {
          setLocalRealPapers(papers);
          setLocalRealPaperStatus('ready');
          setLocalRealPaperMessage(`已从本地目录扫描到 ${data.total ?? papers.length} 套四级真题 PDF。`);
          return;
        }

        setLocalRealPapers(CET4_LOCAL_REAL_PAPERS);
        setLocalRealPaperStatus(CET4_LOCAL_REAL_PAPERS.length > 0 ? 'fallback' : 'empty');
        setLocalRealPaperMessage('本地扫描目录暂未发现四级 PDF，已显示内置样例资料。');
      } catch (error) {
        if (cancelled) return;
        setLocalRealPapers(CET4_LOCAL_REAL_PAPERS);
        setLocalRealPaperStatus(CET4_LOCAL_REAL_PAPERS.length > 0 ? 'fallback' : 'error');
        setLocalRealPaperMessage(`本地扫描暂不可用，已显示内置样例资料：${(error as Error).message}`);
      }
    };

    loadLocalRealPapers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (localRealPapers.length === 0) {
      if (selectedLocalPaperId) setSelectedLocalPaperId('');
      return;
    }

    if (!selectedLocalPaperId || !localRealPapers.some((item) => item.id === selectedLocalPaperId)) {
      setSelectedLocalPaperId(localRealPapers[0].id);
    }
  }, [localRealPapers, selectedLocalPaperId]);

  const selectPaper = (paperId: string) => {
    setHasManualPaperSelection(true);
    resetPaperState(paperId);
  };

  const submitMockExam = () => {
    if (!canSubmit) {
      setActiveSection(firstIncompleteSection?.id ?? 'review');
      return;
    }

    const nextResult = buildMockExamReport({
      paper,
      answers: {
        choices,
        writingAnswer,
        translationAnswer,
      },
      startedAt,
    });
    setResult(nextResult);
  };

  const persistResult = async () => {
    if (!result) return;
    setIsCompleting(true);
    try {
      await Promise.resolve(onComplete(result.score, result.report));
    } finally {
      setIsCompleting(false);
    }
  };

  const goToRelativeSection = (offset: number) => {
    const next = sections[Math.max(0, Math.min(sections.length - 1, activeSectionIndex + offset))];
    setActiveSection(next.id);
  };

  return (
    <div className="app-page-surface ui-page">
      <div className="ui-page-content space-y-5">
        <header className="ui-page-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="ui-page-eyebrow">
                <ClipboardCheck className="h-4 w-4" />
                阶段模考
              </div>
              <h2 className="mt-3 text-2xl font-black leading-tight text-[#101828] sm:text-3xl">
                {pageMode === 'standard-mock' ? paper.title : '本地真题自练'}
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                {pageMode === 'standard-mock'
                  ? '按 CET-4 真题笔试结构推进：写作 1、听力 25、阅读 30、翻译 1；不再混入语法/完形等非四级现行题型。'
                  : '本区只展示你提供的本地真题，按页面版题面自练；它不参与标准模拟考试自动评分。'}
              </p>
              {pageMode === 'standard-mock' && <details className="mt-2 text-xs font-bold leading-5 text-slate-500">
                <summary className="cursor-pointer">组卷说明</summary>
                <p className="mt-1">{paper.sourceNotice}</p>
              </details>}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-black sm:min-w-[320px]">
              {headerMetrics.map((metric) => (
                <div key={metric.label} className="ui-metric text-[#003178]">
                  <div className="truncate text-2xl">{metric.value}</div>
                  <div>{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {!result && pageMode === 'standard-mock' && (
          <PracticeMethodGuide moduleId="mock" compact />
        )}

        {!result && (
          <section className="grid gap-3 md:grid-cols-2" aria-label="阶段模考入口">
            <button
              type="button"
              data-testid="mock-page-mode-standard"
              onClick={() => setPageMode('standard-mock')}
              aria-pressed={pageMode === 'standard-mock'}
              className={`min-h-[180px] rounded-[2rem] border p-5 text-left transition ${
                pageMode === 'standard-mock'
                  ? 'border-[#003178] bg-[#f8fbff] text-[#003178] ring-1 ring-[#dcecff]'
                  : 'border-slate-100 bg-white text-slate-600 hover:border-[#003178]/30'
              }`}
            >
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black">标准模拟考试</div>
                    <div className="mt-2 text-xs font-bold leading-5 opacity-75">严格按 CET-4 笔试结构作答，提交后生成能力报告。</div>
                  </div>
                  <ClipboardCheck className="h-5 w-5 shrink-0" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black">
                  <span className="rounded-2xl bg-white px-2 py-2">写作 1</span>
                  <span className="rounded-2xl bg-white px-2 py-2">听力 25</span>
                  <span className="rounded-2xl bg-white px-2 py-2">阅读 30</span>
                  <span className="rounded-2xl bg-white px-2 py-2">翻译 1</span>
                </div>
              </div>
            </button>
            <button
              type="button"
              data-testid="mock-page-mode-real"
              onClick={() => setPageMode('real-paper')}
              aria-pressed={pageMode === 'real-paper'}
              className={`min-h-[180px] rounded-[2rem] border p-5 text-left transition ${
                pageMode === 'real-paper'
                  ? 'border-[#003178] bg-[#f8fbff] text-[#003178] ring-1 ring-[#dcecff]'
                  : 'border-slate-100 bg-white text-slate-600 hover:border-[#003178]/30'
              }`}
            >
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black">真题自练</div>
                    <div className="mt-2 text-xs font-bold leading-5 opacity-75">页面版题面自练，PDF、答案和音频状态逐套标注。</div>
                  </div>
                  <FileText className="h-5 w-5 shrink-0" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <ResourceBadge badge={{ label: '页面可做', tone: 'success' }} />
                  <ResourceBadge badge={{ label: 'PDF 可看', tone: 'neutral' }} />
                  <ResourceBadge badge={{ label: `扫描 ${localRealPapers.length} 套`, tone: 'info' }} />
                </div>
              </div>
            </button>
          </section>
        )}

        {!result && pageMode === 'standard-mock' && (
          <section className="ui-panel">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px_360px] xl:items-center">
              <div className="min-w-0">
                <div className="text-sm font-black text-[#003178]">按卷面顺序推进，最后提交</div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                  <span className="ui-chip ui-chip-accent">{mockRecommendation.reason}</span>
                  <span className="ui-chip">关注：{mockRecommendation.weakLabel}</span>
                </div>
              </div>
              <label className="flex min-w-0 flex-col gap-1 text-xs font-black text-[#003178]">
                选择模拟卷
                <SelectField
                  ariaLabel="选择模拟卷"
                  value={selectedPaperId}
                  onChange={selectPaper}
                  options={CET4_MOCK_EXAM_BANK.map((item, index) => ({
                    value: item.id,
                    label: `第 ${index + 1} 套：${item.title}`,
                  }))}
                />
              </label>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-black text-slate-500">
                {sections.filter((section) => section.id !== 'review').map((section, index) => (
                  <button
                    key={`flow-${section.id}`}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`rounded-2xl px-2 py-2 transition ${
                      section.ready ? 'bg-[#eef7fc] text-[#003178]' : 'bg-slate-50 hover:bg-[#eef7fc] hover:text-[#003178]'
                    }`}
                  >
                    <span className="block text-xs">{index + 1}</span>
                    <span>{section.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {!result && pageMode === 'real-paper' && selectedLocalPaper && (
          <RealPaperPracticePanel
            papers={localRealPapers}
            selectedPaper={selectedLocalPaper}
            loadStatus={localRealPaperStatus}
            loadMessage={localRealPaperMessage}
            onSelect={setSelectedLocalPaperId}
          />
        )}

        {result ? (
          <section className="ui-panel" data-testid="mock-exam-result">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="ui-chip ui-chip-accent">
                  <CheckCircle2 className="h-4 w-4" />
                  模考报告已生成
                </div>
                <h3 className="mt-3 text-2xl font-black text-[#101828]">综合模拟得分 {result.score}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  {result.report.attempts.length} 条作答 · {result.report.reviewItems.length} 个复习项 · {result.report.skillProfiles.length} 个画像节点
                </p>
              </div>
              <button
                type="button"
                data-testid="mock-exam-persist"
                onClick={persistResult}
                disabled={isCompleting}
                className="ui-button ui-button-primary"
              >
                {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                写入能力图谱与复习队列
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.sectionScores.map((section) => (
                <div key={section.moduleId} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-xs font-black text-slate-500">{section.label}</div>
                  <div className="mt-2 text-3xl font-black text-[#003178]">{section.score}</div>
                  {section.totalCount ? (
                    <div className="mt-1 text-[11px] font-bold text-slate-500">
                      {section.correctCount}/{section.totalCount} 题正确
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] font-bold text-slate-500">主观题启发式评分</div>
                  )}
                </div>
              ))}
            </div>

            <div data-testid="mock-repair-plan" className="mt-5 rounded-3xl border border-[#cfe6f2] bg-[#f8fbff] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-black text-[#003178]">专项修复计划</div>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    模考不只给分数；最低分项会转成下一轮专项训练目标。
                  </p>
                </div>
                <span className="ui-chip">{mockRepairPlan.filter((item) => item.priority === 'high').length} 个高优先级</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {mockRepairPlan.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-white bg-white p-3">
                    <div className={`w-fit rounded-full px-2 py-1 text-[10px] font-black ${
                      item.priority === 'high'
                        ? 'bg-rose-50 text-rose-700'
                        : item.priority === 'medium'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {item.priority === 'high' ? '优先修复' : item.priority === 'medium' ? '继续巩固' : '保持稳定'}
                    </div>
                    <h4 className="mt-3 text-sm font-black text-[#101828]">{item.title}</h4>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{item.reason}</p>
                    <div className="mt-3 text-[11px] font-black text-[#003178]">{item.action}</div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : pageMode === 'standard-mock' ? (
          <div className="space-y-5">
            <nav className="ui-panel">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    data-testid={`mock-section-${section.id}`}
                    onClick={() => setActiveSection(section.id)}
                    className={`min-h-20 rounded-2xl border p-3 text-left transition ${
                      activeSection === section.id
                        ? 'border-[#003178] bg-[#f8fbff] text-[#003178] shadow-sm'
                        : section.ready
                          ? 'border-[#cfe6f2] bg-[#eef7fc] text-[#003178]'
                          : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-[#003178]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black">{section.shortLabel}</span>
                      {section.ready ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    </div>
                    <div className="mt-2 text-[11px] font-bold opacity-85">{section.time} · {section.status}</div>
                  </button>
                ))}
              </div>
            </nav>

            <StandardMockSectionPanel
              activeSection={activeSection}
              choices={choices}
              incompleteSections={incompleteSections}
              paper={paper}
              sections={sections}
              standardListeningPlayback={standardListeningPlayback}
              translationAnswer={translationAnswer}
              translationReady={translationReady}
              translationWordCount={translationWordCount}
              writingAnswer={writingAnswer}
              writingReady={writingReady}
              writingWordCount={writingWordCount}
              onChoice={(questionId, choice) => setChoices((current) => ({ ...current, [questionId]: choice }))}
              onSectionChange={setActiveSection}
              onSpeakListening={speakListening}
              onTranslationAnswerChange={setTranslationAnswer}
              onWritingAnswerChange={setWritingAnswer}
            />

            <div className="ui-panel sticky bottom-4 z-20 backdrop-blur">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => goToRelativeSection(-1)}
                    disabled={activeSectionIndex === 0}
                    className="ui-button ui-button-secondary ui-button-compact disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一模块
                  </button>
                  <button
                    type="button"
                    onClick={() => goToRelativeSection(1)}
                    disabled={activeSectionIndex === sections.length - 1}
                    className="ui-button ui-button-secondary ui-button-compact disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    下一模块
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  data-testid="mock-exam-submit"
                  onClick={submitMockExam}
                  data-incomplete={canSubmit ? undefined : 'true'}
                  className={`ui-button w-full lg:w-auto ${canSubmit ? 'ui-button-primary' : 'ui-button-secondary'}`}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  {canSubmit ? '提交阶段模考并生成评分' : '定位未完成模块'}
                </button>
              </div>
              {!canSubmit && (
                <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
                  仍需完成：{incompleteSections.map((section) => section.label).join('、')}。
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
