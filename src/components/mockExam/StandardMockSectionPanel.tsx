import { type ReactNode } from 'react';
import { FileText, Headphones, ListChecks, PenLine, Volume2 } from 'lucide-react';
import { type Cet4MockChoiceQuestion, type Cet4MockExamPaper } from '../../questionBank';

export type Choice = 'A' | 'B' | 'C' | 'D';
export type MockSectionId = 'writing' | 'listening' | 'reading' | 'translation' | 'review';
export type SpeechPlaybackState = 'idle' | 'playing' | 'paused';

type MockQuestionTypeId = Cet4MockChoiceQuestion['questionTypeId'];

export const TRANSLATION_MIN_WORDS = 24;

const LISTENING_GROUP_DEFINITIONS: Array<{
  id: MockQuestionTypeId;
  title: string;
  summary: string;
}> = [
  { id: 'short-news', title: 'Section A · 短篇新闻', summary: '7 题' },
  { id: 'long-conversation', title: 'Section B · 长对话', summary: '8 题' },
  { id: 'listening-passage', title: 'Section C · 听力篇章', summary: '10 题' },
];

const READING_GROUP_DEFINITIONS: Array<{
  id: MockQuestionTypeId;
  title: string;
  summary: string;
}> = [
  { id: 'word-bank', title: 'Section A · 选词填空', summary: '10 题' },
  { id: 'long-matching', title: 'Section B · 长篇匹配', summary: '10 题' },
  { id: 'careful-reading', title: 'Section C · 仔细阅读', summary: '10 题' },
];

export interface MockSectionStatus {
  id: MockSectionId;
  label: string;
  shortLabel: string;
  time: string;
  status: string;
  ready: boolean;
}

interface StandardMockSectionPanelProps {
  activeSection: MockSectionId;
  choices: Record<string, Choice | undefined>;
  incompleteSections: MockSectionStatus[];
  paper: Cet4MockExamPaper;
  sections: MockSectionStatus[];
  standardListeningPlayback: SpeechPlaybackState;
  translationAnswer: string;
  translationReady: boolean;
  translationWordCount: number;
  writingAnswer: string;
  writingReady: boolean;
  writingWordCount: number;
  onChoice: (questionId: string, choice: Choice) => void;
  onSectionChange: (sectionId: MockSectionId) => void;
  onSpeakListening: () => void;
  onTranslationAnswerChange: (answer: string) => void;
  onWritingAnswerChange: (answer: string) => void;
}

function getQuestionTypeLabel(questionTypeId: MockQuestionTypeId): string {
  switch (questionTypeId) {
    case 'short-news':
      return '短篇新闻';
    case 'long-conversation':
      return '长对话';
    case 'listening-passage':
      return '听力篇章';
    case 'word-bank':
      return '选词填空';
    case 'long-matching':
      return '长篇匹配';
    case 'careful-reading':
      return '仔细阅读';
    case 'grammar-structure':
      return '语法结构';
    case 'cloze-choice':
      return '完形语境';
    default:
      return questionTypeId;
  }
}

function buildQuestionGroups(
  questions: Cet4MockChoiceQuestion[],
  definitions: Array<{ id: MockQuestionTypeId; title: string; summary: string }>,
) {
  return definitions.flatMap((definition) => {
    const items = questions.filter((question) => question.questionTypeId === definition.id);
    if (items.length === 0) return [];

    return [{
      ...definition,
      questions: items,
    }];
  });
}

export default function StandardMockSectionPanel({
  activeSection,
  choices,
  incompleteSections,
  paper,
  sections,
  standardListeningPlayback,
  translationAnswer,
  translationReady,
  translationWordCount,
  writingAnswer,
  writingReady,
  writingWordCount,
  onChoice,
  onSectionChange,
  onSpeakListening,
  onTranslationAnswerChange,
  onWritingAnswerChange,
}: StandardMockSectionPanelProps) {
  const listeningGroups = buildQuestionGroups(paper.listening.questions, LISTENING_GROUP_DEFINITIONS);
  const readingGroups = buildQuestionGroups(paper.reading.questions, READING_GROUP_DEFINITIONS);

  switch (activeSection) {
    case 'writing':
      return (
        <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
          <SectionHeader
            icon={<PenLine className="h-5 w-5" />}
            eyebrow="Part I"
            title="写作：按四级短文写作完成首题"
            detail={`30 分钟 · 不少于 ${paper.writing.minWords} 词`}
          />
          <p className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
            {paper.writing.prompt}
          </p>
          <textarea
            data-testid="mock-writing-answer"
            value={writingAnswer}
            onChange={(event) => onWritingAnswerChange(event.target.value)}
            className="mt-4 min-h-64 w-full rounded-3xl border border-slate-200 bg-[#fbfdff] p-4 text-sm font-semibold leading-7 text-slate-700 outline-none focus:ring-2 focus:ring-[#003178]/25"
            placeholder="Write your essay here..."
          />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">{writingWordCount} 词</span>
            <span className={`rounded-full px-3 py-1 ${writingReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {writingReady ? '写作已达四级词数门槛' : `先写满 ${paper.writing.minWords} 词再提交`}
            </span>
          </div>
        </section>
      );
    case 'listening':
      return (
        <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <SectionHeader
              icon={<Headphones className="h-5 w-5" />}
              eyebrow="Part II"
              title="听力：按四级三种题型作答"
              detail="25 分钟 · 7 短篇新闻 / 8 长对话 / 10 听力篇章"
            />
            <button
              type="button"
              onClick={onSpeakListening}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#003178] px-4 text-xs font-black text-white hover:bg-[#0d47a1]"
            >
              <Volume2 className="h-4 w-4" />
              {standardListeningPlayback === 'playing'
                ? '暂停听力材料'
                : standardListeningPlayback === 'paused'
                  ? '继续听力材料'
                  : '播放听力材料'}
            </button>
          </div>
          <details className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-500">
            <summary className="cursor-pointer text-sm font-black text-[#003178]">查看听力转写兜底</summary>
            <p className="mt-3 whitespace-pre-line">{paper.listening.transcript}</p>
          </details>
          <QuestionGroupList groups={listeningGroups} choices={choices} onSelect={onChoice} />
        </section>
      );
    case 'reading':
      return (
        <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
          <SectionHeader
            icon={<FileText className="h-5 w-5" />}
            eyebrow="Part III"
            title="阅读：按四级三种阅读题型作答"
            detail="40 分钟 · 10 选词填空 / 10 长篇匹配 / 10 仔细阅读"
          />
          <details className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-500">
            <summary className="cursor-pointer text-sm font-black text-[#003178]">查看阅读材料</summary>
            <p className="mt-3 whitespace-pre-line">{paper.reading.passage}</p>
          </details>
          <QuestionGroupList groups={readingGroups} choices={choices} onSelect={onChoice} />
        </section>
      );
    case 'translation':
      return (
        <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
          <SectionHeader
            icon={<PenLine className="h-5 w-5" />}
            eyebrow="Part IV"
            title="翻译：完成整段汉译英"
            detail={`30 分钟 · 建议至少 ${TRANSLATION_MIN_WORDS} 词`}
          />
          <p className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
            {paper.translation.prompt}
          </p>
          <textarea
            data-testid="mock-translation-answer"
            value={translationAnswer}
            onChange={(event) => onTranslationAnswerChange(event.target.value)}
            className="mt-4 min-h-56 w-full rounded-3xl border border-slate-200 bg-[#fbfdff] p-4 text-sm font-semibold leading-7 text-slate-700 outline-none focus:ring-2 focus:ring-[#003178]/25"
            placeholder="Translate the paragraph here..."
          />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">{translationWordCount} 词</span>
            <span className={`rounded-full px-3 py-1 ${translationReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {translationReady ? '翻译已达提交门槛' : `先完成至少 ${TRANSLATION_MIN_WORDS} 词译文`}
            </span>
          </div>
        </section>
      );
    case 'review':
      return (
        <section className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm sm:p-6">
          <SectionHeader
            icon={<ListChecks className="h-5 w-5" />}
            eyebrow="Submit"
            title="提交前检查"
            detail="完成全部模块后提交"
          />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sections.filter((section) => section.id !== 'review').map((section) => (
              <button
                key={`review-${section.id}`}
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={`rounded-3xl border p-4 text-left transition ${
                  section.ready
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                    : 'border-amber-100 bg-amber-50 text-amber-800'
                }`}
              >
                <div className="text-sm font-black">{section.label}</div>
                <div className="mt-2 text-xs font-bold">{section.status}</div>
              </button>
            ))}
          </div>
          {incompleteSections.length > 0 ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-800">
              仍需完成：{incompleteSections.map((section) => section.label).join('、')}。点击上方卡片返回对应模块。
            </p>
          ) : (
            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-800">
              全部模块均已完成，可以提交并生成阶段模考报告。
            </p>
          )}
        </section>
      );
  }
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  detail,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-full bg-[#003178]/10 px-3 py-1 text-xs font-black text-[#003178]">
        {icon}
        {eyebrow}
      </div>
      <h3 className="mt-3 text-xl font-black text-[#071e27] sm:text-2xl">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{detail}</p>
    </div>
  );
}

function QuestionGroupList({
  groups,
  choices,
  onSelect,
}: {
  groups: Array<{
    id: MockQuestionTypeId;
    title: string;
    summary: string;
    questions: Cet4MockChoiceQuestion[];
  }>;
  choices: Record<string, Choice | undefined>;
  onSelect: (questionId: string, choice: Choice) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      {groups.map((group) => (
        <section key={group.id} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-black text-[#071e27]">{group.title}</div>
            <div className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">{group.summary}</div>
          </div>
          <QuestionList questions={group.questions} choices={choices} onSelect={onSelect} />
        </section>
      ))}
    </div>
  );
}

function QuestionList({
  questions,
  choices,
  onSelect,
}: {
  questions: Cet4MockChoiceQuestion[];
  choices: Record<string, Choice | undefined>;
  onSelect: (questionId: string, choice: Choice) => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      {questions.map((question) => (
        <article key={question.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="rounded-full bg-[#eef7fc] px-2.5 py-1 text-[10px] font-black text-[#003178]">
                {question.title}
              </span>
              <h4 className="mt-3 text-sm font-black text-[#071e27]">{question.prompt}</h4>
            </div>
            <span className="text-[10px] font-black text-slate-400">{getQuestionTypeLabel(question.questionTypeId)}</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {(['A', 'B', 'C', 'D'] as Choice[]).map((choice) => (
              <button
                key={choice}
                type="button"
                data-testid={`mock-choice-${question.id}-${choice}`}
                onClick={() => onSelect(question.id, choice)}
                className={`min-h-11 rounded-2xl border px-3 py-2 text-left text-xs font-bold transition ${
                  choices[question.id] === choice
                    ? 'border-[#003178] bg-[#003178] text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-[#003178]/40'
                }`}
              >
                {choice}. {question.options[choice]}
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
