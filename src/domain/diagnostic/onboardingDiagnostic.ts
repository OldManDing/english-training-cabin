import {
  AiFeedbackSummary,
  Attempt,
  MistakeReason,
  PracticeCompletionReport,
  PracticeSession,
  ReviewItem,
  SkillArea,
  SkillProfile,
} from '../../types';

type DiagnosticSkillArea = Extract<SkillArea, 'reading' | 'listening' | 'translation' | 'writing' | 'speaking' | 'vocabulary' | 'grammar'>;
type ChoiceAnswer = 'A' | 'B' | 'C' | 'D';

export type DiagnosticAnswerMap = Record<string, string>;

export interface DiagnosticChineseSupport {
  context?: string;
  prompt?: string;
  options?: Partial<Record<ChoiceAnswer, string>>;
}

export interface DiagnosticChoiceItem {
  id: string;
  kind: 'single-choice';
  skillArea: DiagnosticSkillArea;
  subSkillId: string;
  title: string;
  contextLabel: string;
  context: string;
  prompt: string;
  options: { id: ChoiceAnswer; label: string }[];
  correctAnswer: ChoiceAnswer;
  mistakeReason: MistakeReason;
  explanation: string;
  chineseSupport?: DiagnosticChineseSupport;
}

export interface DiagnosticTextItem {
  id: string;
  kind: 'text';
  skillArea: DiagnosticSkillArea;
  subSkillId: string;
  title: string;
  contextLabel: string;
  context: string;
  prompt: string;
  placeholder: string;
  minWords: number;
  keywordGroups: string[][];
  mistakeReason: MistakeReason;
  explanation: string;
  chineseSupport?: DiagnosticChineseSupport;
}

export type DiagnosticItem = DiagnosticChoiceItem | DiagnosticTextItem;

export interface CreateOnboardingDiagnosticItemsOptions {
  random?: () => number;
  excludeItemIds?: string[];
  shuffleOrder?: boolean;
}

export type DiagnosticConfidenceLevel = 'high' | 'medium' | 'low';
export type DiagnosticScoringMethod = 'objective-rule' | 'rubric-screening' | 'ai-assisted-rubric';

export interface DiagnosticAiEvaluation {
  itemId: string;
  score: number;
  mistakeReasons: MistakeReason[];
  comments: string[];
  nextActions: string[];
  evidence: string[];
  confidence: DiagnosticConfidenceLevel;
  source: 'ai' | 'fallback';
}

export type DiagnosticAiEvaluationMap = Record<string, DiagnosticAiEvaluation>;

export interface DiagnosticRubricDimension {
  label: string;
  score: number;
  maxScore: number;
  observation: string;
}

export interface DiagnosticScoreDetail {
  itemId: string;
  skillArea: DiagnosticSkillArea;
  subSkillId: string;
  title: string;
  score: number;
  answered: boolean;
  validEvidenceCount: number;
  evidenceSummary: string;
  isCorrect?: boolean;
  mistakeReasons: MistakeReason[];
  feedback: string;
  nextAction: string;
  confidenceLevel: DiagnosticConfidenceLevel;
  confidenceLabel: string;
  scoringMethod: DiagnosticScoringMethod;
  scoringSummary: string;
  rubric: DiagnosticRubricDimension[];
  aiEvaluation?: DiagnosticAiEvaluation;
}

export interface DiagnosticConfidenceSummary {
  level: DiagnosticConfidenceLevel;
  label: string;
  note: string;
  objectiveItemCount: number;
  rubricItemCount: number;
  confirmedSkillAreas: DiagnosticSkillArea[];
  provisionalSkillAreas: DiagnosticSkillArea[];
}

export interface DiagnosticSkillSummary {
  skillArea: DiagnosticSkillArea;
  subSkillId: string;
  title: string;
  score: number | null;
  itemIds: string[];
  evidenceCount: number;
  validEvidenceCount: number;
  evidenceSummary: string;
  confirmedForProfile: boolean;
  mistakeReasons: MistakeReason[];
  feedback: string;
  nextAction: string;
  confidenceLevel: DiagnosticConfidenceLevel;
  confidenceLabel: string;
  scoringMethod: 'objective-aggregate' | 'rubric-screening' | 'ai-assisted-rubric';
  scoringSummary: string;
  rubric: DiagnosticRubricDimension[];
}

export interface OnboardingDiagnosticReport extends PracticeCompletionReport {
  details: DiagnosticSkillSummary[];
  averageScore: number | null;
  weakestSkills: DiagnosticSkillArea[];
  strongestSkills: DiagnosticSkillArea[];
  confidenceSummary: DiagnosticConfidenceSummary;
}

const lowConfidence = '低信心' as MistakeReason;

const objectiveDiagnosticSkillAreas: DiagnosticSkillArea[] = ['reading', 'listening', 'vocabulary', 'grammar'];
const subjectiveDiagnosticSkillAreas: DiagnosticSkillArea[] = ['translation', 'writing', 'speaking'];

export const ONBOARDING_DIAGNOSTIC_OBJECTIVE_ITEMS_PER_SKILL = 2;
export const ONBOARDING_DIAGNOSTIC_SUBJECTIVE_ITEMS_PER_SKILL = 1;
export const ONBOARDING_DIAGNOSTIC_EXPECTED_ITEM_COUNT =
  objectiveDiagnosticSkillAreas.length * ONBOARDING_DIAGNOSTIC_OBJECTIVE_ITEMS_PER_SKILL
  + subjectiveDiagnosticSkillAreas.length * ONBOARDING_DIAGNOSTIC_SUBJECTIVE_ITEMS_PER_SKILL;

export const ONBOARDING_DIAGNOSTIC_ITEMS: DiagnosticItem[] = [
  {
    id: 'diag-reading-location',
    kind: 'single-choice',
    skillArea: 'reading',
    subSkillId: 'diagnostic-reading-location',
    title: '阅读定位与同义替换',
    contextLabel: '阅读短文',
    context:
      'Community libraries are no longer only quiet places for borrowing books. Many now provide digital courses, career workshops, and small meeting rooms, so residents can keep learning even when they cannot attend a formal school.',
    prompt: 'Which statement best describes the new role of community libraries?',
    options: [
      { id: 'A', label: 'They mainly protect old books for local residents.' },
      { id: 'B', label: 'They have become flexible learning hubs for the community.' },
      { id: 'C', label: 'They require every resident to attend formal courses.' },
      { id: 'D', label: 'They are replacing schools in most neighborhoods.' },
    ],
    correctAnswer: 'B',
    mistakeReason: '同义替换未识别' as MistakeReason,
    explanation: '"provide digital courses, career workshops" 对应 "learning hubs"，考查同义替换与主旨定位。',
  },
  {
    id: 'diag-listening-turning-point',
    kind: 'single-choice',
    skillArea: 'listening',
    subSkillId: 'diagnostic-listening-turning-point',
    title: '听力转折信息识别',
    contextLabel: '听力转写',
    context:
      'Man: I thought the writing workshop was canceled because the teacher is sick. Woman: It was almost canceled, but the department moved it online. We still need to submit our outlines before Friday.',
    prompt: 'What will the students probably do?',
    options: [
      { id: 'A', label: 'Wait until the teacher returns next month.' },
      { id: 'B', label: 'Cancel their outlines because the workshop stopped.' },
      { id: 'C', label: 'Join the online workshop and submit outlines before Friday.' },
      { id: 'D', label: 'Ask the department to change the topic.' },
    ],
    correctAnswer: 'C',
    mistakeReason: '转折信息漏听' as MistakeReason,
    explanation: '"but the department moved it online" 是转折后的真实安排，Friday 是提交时限。',
  },
  {
    id: 'diag-vocabulary-cloze',
    kind: 'single-choice',
    skillArea: 'vocabulary',
    subSkillId: 'diagnostic-cloze-context',
    title: '完形/选词填空语境判断',
    contextLabel: '语境填空',
    context:
      'Many students can remember a word list, but they still choose the wrong word in a passage because they ignore the sentence before and after the blank.',
    prompt: 'Which word best completes the sentence: Good readers use context to choose the most ___ word for a blank.',
    options: [
      { id: 'A', label: 'suitable' },
      { id: 'B', label: 'silent' },
      { id: 'C', label: 'expensive' },
      { id: 'D', label: 'private' },
    ],
    correctAnswer: 'A',
    mistakeReason: '搭配错误' as MistakeReason,
    explanation: 'blank 前后的 use context 和 choose the most ... word 指向 suitable，考查语境、词义和搭配，不是孤立背词。',
  },
  {
    id: 'diag-grammar-structure',
    kind: 'single-choice',
    skillArea: 'grammar',
    subSkillId: 'diagnostic-grammar-structure',
    title: '语法结构与固定搭配',
    contextLabel: '语法结构',
    context:
      'A clear sentence usually depends on tense, voice, connectors, and common patterns. Grammar training should support reading, writing, translation, and cloze accuracy.',
    prompt: 'Choose the best answer: Students are encouraged ___ mistakes before they become habits.',
    options: [
      { id: 'A', label: 'review' },
      { id: 'B', label: 'reviewing' },
      { id: 'C', label: 'to review' },
      { id: 'D', label: 'reviewed' },
    ],
    correctAnswer: 'C',
    mistakeReason: '语法错误' as MistakeReason,
    explanation: 'be encouraged to do sth. 是固定结构；这里应选 to review，后接动词原形。',
  },
  {
    id: 'diag-translation-structure',
    kind: 'text',
    skillArea: 'translation',
    subSkillId: 'diagnostic-translation-structure',
    title: '翻译句法转换',
    contextLabel: '汉译英',
    context: '随着在线学习的发展，越来越多的大学生能够更灵活地安排自己的学习时间。',
    prompt: '请把上面的句子翻译成自然的英文。',
    placeholder:
      '例如：With the development of online learning, more college students can arrange their study time more flexibly.',
    minWords: 12,
    keywordGroups: [
      ['with the development of', 'as online learning develops', 'with the growth of'],
      ['online learning', 'online education'],
      ['college students', 'university students'],
      ['arrange', 'manage', 'schedule'],
      ['flexibly', 'more flexible'],
    ],
    mistakeReason: '中文干扰' as MistakeReason,
    explanation: '重点看是否能把“随着……”转成英文状语，并保留“大学生、安排时间、灵活”三个核心语义。',
  },
  {
    id: 'diag-writing-argument',
    kind: 'text',
    skillArea: 'writing',
    subSkillId: 'diagnostic-writing-argument',
    title: '写作结构与论证',
    contextLabel: '短段写作',
    context: 'Topic: Should students use AI tools when learning English?',
    prompt: '请用 50-80 个英文词写一个观点段，必须包含观点、理由和一个具体例子。',
    placeholder: 'I think students can use AI tools wisely because ... For example, ...',
    minWords: 45,
    keywordGroups: [
      ['i think', 'in my opinion', 'from my perspective'],
      ['because', 'since'],
      ['for example', 'for instance'],
      ['however', 'but', 'wisely', 'responsibly'],
      ['english', 'learning', 'students'],
    ],
    mistakeReason: '论证结构松散' as MistakeReason,
    explanation: '观点段需要“立场 + 理由 + 例子”，只写口号或只列观点会降低诊断分。',
  },
  {
    id: 'diag-speaking-response',
    kind: 'text',
    skillArea: 'speaking',
    subSkillId: 'diagnostic-speaking-response',
    title: '口语连贯表达初筛',
    contextLabel: '口语任务',
    context: 'Question: Describe one habit that helps you learn English and explain why it works.',
    prompt: '请写下你会如何口头回答，尽量使用自然连接词。后续正式口语训练会使用录音与二次重说。',
    placeholder: 'One habit that helps me is ... It works because ... As a result, ...',
    minWords: 35,
    keywordGroups: [
      ['one habit', 'my habit', 'i usually'],
      ['because', 'the reason is'],
      ['for example', 'such as'],
      ['as a result', 'so', 'therefore'],
      ['english', 'learn', 'practice'],
    ],
    mistakeReason: '表达不自然' as MistakeReason,
    explanation: '入门口语先用文本化回答判断连贯性，正式口语模块再做录音、转写、纠错和重说闭环。',
  },
];

const diagnosticSkillOrder: DiagnosticSkillArea[] = [
  'reading',
  'listening',
  'vocabulary',
  'grammar',
  'translation',
  'writing',
  'speaking',
];

function getDefaultDiagnosticItem(skillArea: DiagnosticSkillArea): DiagnosticItem {
  const item = ONBOARDING_DIAGNOSTIC_ITEMS.find((candidate) => candidate.skillArea === skillArea);
  if (!item) throw new Error(`Missing default diagnostic item for ${skillArea}`);
  return item;
}

const ONBOARDING_DIAGNOSTIC_ITEM_POOL: Record<DiagnosticSkillArea, DiagnosticItem[]> = {
  reading: [
    getDefaultDiagnosticItem('reading'),
    {
      id: 'diag-reading-active-recall',
      kind: 'single-choice',
      skillArea: 'reading',
      subSkillId: 'diagnostic-reading-location',
      title: '阅读细节定位与推断',
      contextLabel: '阅读短文',
      context:
        'Short review sessions before sleep can be helpful because they give the brain clear material to process. A better method is to close the book, recall the key idea, and then check what was missed.',
      prompt: 'Which method does the passage recommend before sleep?',
      options: [
        { id: 'A', label: 'Reading notes passively for several hours.' },
        { id: 'B', label: 'Closing the book, recalling key ideas, and checking missed points.' },
        { id: 'C', label: 'Avoiding all review before an exam.' },
        { id: 'D', label: 'Copying example answers without checking them.' },
      ],
      correctAnswer: 'B',
      mistakeReason: '定位失准' as MistakeReason,
      explanation: '"close the book, recall the key idea" 是定位句，考查是否能抓住推荐方法。',
    },
    {
      id: 'diag-reading-note-purpose',
      kind: 'single-choice',
      skillArea: 'reading',
      subSkillId: 'diagnostic-reading-location',
      title: '阅读目的句定位',
      contextLabel: '阅读短文',
      context:
        'After each lecture, some students rewrite every sentence in their notebooks. A more effective habit is to keep only the main idea, one key example, and one question for later review.',
      prompt: 'What note-taking habit does the passage recommend?',
      options: [
        { id: 'A', label: 'Copying the full lecture word for word.' },
        { id: 'B', label: 'Ignoring examples and questions.' },
        { id: 'C', label: 'Keeping the main idea, one example, and one question.' },
        { id: 'D', label: 'Taking no notes until the exam week.' },
      ],
      correctAnswer: 'C',
      mistakeReason: '定位失准' as MistakeReason,
      explanation: '"keep only the main idea, one key example, and one question" 直接给出推荐做法。',
    },
  ],
  listening: [
    getDefaultDiagnosticItem('listening'),
    {
      id: 'diag-listening-room-change',
      kind: 'single-choice',
      skillArea: 'listening',
      subSkillId: 'diagnostic-listening-turning-point',
      title: '听力变更信息识别',
      contextLabel: '听力转写',
      context:
        'Man: Is the library workshop still in Room 204? Woman: It was planned there, but the projector is broken, so the organizer moved it to the online platform. Check your email at seven.',
      prompt: 'What should the man do?',
      options: [
        { id: 'A', label: 'Go directly to Room 204.' },
        { id: 'B', label: 'Ask the organizer to cancel the workshop.' },
        { id: 'C', label: 'Repair the projector before seven.' },
        { id: 'D', label: 'Check his email and join the workshop online.' },
      ],
      correctAnswer: 'D',
      mistakeReason: '转折信息漏听' as MistakeReason,
      explanation: '"but" 后面的 moved it to the online platform 是真实安排，seven 是查邮件时间。',
    },
    {
      id: 'diag-listening-lab-time',
      kind: 'single-choice',
      skillArea: 'listening',
      subSkillId: 'diagnostic-listening-turning-point',
      title: '听力关键信息更新识别',
      contextLabel: '听力转写',
      context:
        'Woman: I planned to meet the study group at three, but the lab closes early today. Man: So should we move it? Woman: Yes, let us start at one thirty in the café next to the gate.',
      prompt: 'What will they probably do?',
      options: [
        { id: 'A', label: 'Keep the original plan and meet at three in the lab.' },
        { id: 'B', label: 'Meet at one thirty in the café near the gate.' },
        { id: 'C', label: 'Cancel the study group for the whole week.' },
        { id: 'D', label: 'Wait for the lab to open again tonight.' },
      ],
      correctAnswer: 'B',
      mistakeReason: '转折信息漏听' as MistakeReason,
      explanation: '"but the lab closes early today" 后，真正的新安排是 "start at one thirty in the café"。',
    },
  ],
  vocabulary: [
    getDefaultDiagnosticItem('vocabulary'),
    {
      id: 'diag-vocabulary-public-service',
      kind: 'single-choice',
      skillArea: 'vocabulary',
      subSkillId: 'diagnostic-cloze-context',
      title: '完形/选词填空语义搭配',
      contextLabel: '语境填空',
      context:
        'Digital public services should not only be fast. They also need clear instructions and offline help so that older residents can use them with confidence.',
      prompt: 'Which word best completes the sentence: Clear instructions make public services more ___ to older residents.',
      options: [
        { id: 'A', label: 'expensive' },
        { id: 'B', label: 'accessible' },
        { id: 'C', label: 'silent' },
        { id: 'D', label: 'temporary' },
      ],
      correctAnswer: 'B',
      mistakeReason: '搭配错误' as MistakeReason,
      explanation: 'clear instructions 和 older residents 指向 accessible，考查语义搭配和上下文。',
    },
    {
      id: 'diag-vocabulary-relevant-detail',
      kind: 'single-choice',
      skillArea: 'vocabulary',
      subSkillId: 'diagnostic-cloze-context',
      title: '完形/选词填空语境辨析',
      contextLabel: '语境填空',
      context:
        'When students collect too many examples, they may forget the main question. Strong notes keep only the details that clearly support the topic.',
      prompt: 'Which word best completes the sentence: Good examples must be directly ___ to the topic sentence.',
      options: [
        { id: 'A', label: 'ordinary' },
        { id: 'B', label: 'silent' },
        { id: 'C', label: 'relevant' },
        { id: 'D', label: 'distant' },
      ],
      correctAnswer: 'C',
      mistakeReason: '搭配错误' as MistakeReason,
      explanation: 'support the topic 指向 relevant to the topic sentence，考查固定搭配和语境判断。',
    },
  ],
  grammar: [
    getDefaultDiagnosticItem('grammar'),
    {
      id: 'diag-grammar-worth-reviewing',
      kind: 'single-choice',
      skillArea: 'grammar',
      subSkillId: 'diagnostic-grammar-structure',
      title: '语法结构与固定句型',
      contextLabel: '语法结构',
      context:
        'A useful grammar habit is to notice common sentence patterns, not only isolated rules. Fixed structures often decide whether an answer sounds natural.',
      prompt: 'Choose the best answer: This mistake is worth ___ before the next mock exam.',
      options: [
        { id: 'A', label: 'review' },
        { id: 'B', label: 'reviewing' },
        { id: 'C', label: 'to review' },
        { id: 'D', label: 'reviewed' },
      ],
      correctAnswer: 'B',
      mistakeReason: '语法错误' as MistakeReason,
      explanation: 'be worth doing 是固定结构；这里应选 reviewing。',
    },
    {
      id: 'diag-grammar-had-better',
      kind: 'single-choice',
      skillArea: 'grammar',
      subSkillId: 'diagnostic-grammar-structure',
      title: '语法结构与固定句型',
      contextLabel: '语法结构',
      context:
        'Useful grammar habits should be simple enough to repeat after every class. Short correction routines often work better than long passive review.',
      prompt: 'Choose the best answer: Students had better ___ a short summary after each lesson.',
      options: [
        { id: 'A', label: 'write' },
        { id: 'B', label: 'writing' },
        { id: 'C', label: 'to write' },
        { id: 'D', label: 'written' },
      ],
      correctAnswer: 'A',
      mistakeReason: '语法错误' as MistakeReason,
      explanation: 'had better 后接动词原形，这里应选 write。',
    },
  ],
  translation: [
    getDefaultDiagnosticItem('translation'),
    {
      id: 'diag-translation-pressure',
      kind: 'text',
      skillArea: 'translation',
      subSkillId: 'diagnostic-translation-structure',
      title: '翻译语义完整性',
      contextLabel: '汉译英',
      context: '为了减少考试压力，学生应该把复习任务分成几个小步骤。',
      prompt: '请把上面的句子翻译成自然的英文。',
      placeholder:
        '例如：To reduce exam pressure, students should divide review tasks into several small steps.',
      minWords: 10,
      keywordGroups: [
        ['to reduce', 'in order to reduce', 'for reducing'],
        ['exam pressure', 'test pressure'],
        ['students'],
        ['divide', 'break', 'split'],
        ['review tasks', 'revision tasks', 'study tasks'],
        ['small steps', 'smaller steps'],
      ],
      mistakeReason: '中文干扰' as MistakeReason,
      explanation: '重点看是否保留“减少压力、复习任务、分成小步骤”三个核心语义，并能转换成自然英文结构。',
    },
    {
      id: 'diag-translation-review-loop',
      kind: 'text',
      skillArea: 'translation',
      subSkillId: 'diagnostic-translation-structure',
      title: '翻译逻辑关系转换',
      contextLabel: '汉译英',
      context: '只要学生在做题后及时复盘，错题就更不容易反复出现。',
      prompt: '请把上面的句子翻译成自然的英文。',
      placeholder:
        '例如：As long as students review in time after finishing an exercise, the same mistakes are less likely to appear again.',
      minWords: 10,
      keywordGroups: [
        ['as long as', 'if students'],
        ['review', 'go over', 'reflect on'],
        ['in time', 'promptly', 'right after'],
        ['mistakes', 'wrong answers', 'errors'],
        ['less likely', 'not likely', 'harder to'],
        ['appear again', 'happen again', 'repeat themselves'],
      ],
      mistakeReason: '中文干扰' as MistakeReason,
      explanation: '重点看是否把“只要”转成条件关系，并保留“及时复盘”和“错题不再反复出现”的语义。',
    },
  ],
  writing: [
    getDefaultDiagnosticItem('writing'),
    {
      id: 'diag-writing-review-habit',
      kind: 'text',
      skillArea: 'writing',
      subSkillId: 'diagnostic-writing-argument',
      title: '写作观点展开',
      contextLabel: '短段写作',
      context: 'Topic: Is regular review more useful than last-minute study?',
      prompt: '请用 50-80 个英文词写一个观点段，必须包含观点、理由和一个具体例子。',
      placeholder: 'In my opinion, regular review is more useful because ... For example, ...',
      minWords: 45,
      keywordGroups: [
        ['i think', 'in my opinion', 'from my perspective'],
        ['regular review', 'review regularly'],
        ['because', 'since'],
        ['for example', 'for instance'],
        ['last-minute', 'before the exam', 'cramming'],
      ],
      mistakeReason: '论证结构松散' as MistakeReason,
      explanation: '观点段需要明确比较 regular review 与 last-minute study，并给出理由和例子。',
    },
    {
      id: 'diag-writing-study-partner',
      kind: 'text',
      skillArea: 'writing',
      subSkillId: 'diagnostic-writing-argument',
      title: '写作观点比较与展开',
      contextLabel: '短段写作',
      context: 'Topic: Is studying alone better than studying with a partner?',
      prompt: '请用 50-80 个英文词写一个观点段，必须包含观点、理由和一个具体例子。',
      placeholder: 'I think studying alone / with a partner is better because ... For example, ...',
      minWords: 45,
      keywordGroups: [
        ['i think', 'in my opinion', 'from my perspective'],
        ['study alone', 'studying alone', 'study with a partner', 'studying with a partner'],
        ['because', 'since'],
        ['for example', 'for instance'],
        ['better', 'more useful', 'more effective'],
      ],
      mistakeReason: '论证结构松散' as MistakeReason,
      explanation: '观点段需要明确比较 alone 与 partner 两种方式，并给出理由和例子。',
    },
  ],
  speaking: [
    getDefaultDiagnosticItem('speaking'),
    {
      id: 'diag-speaking-mistake',
      kind: 'text',
      skillArea: 'speaking',
      subSkillId: 'diagnostic-speaking-response',
      title: '口语问题解释初筛',
      contextLabel: '口语任务',
      context: 'Question: Describe one English mistake you often make and explain how you will correct it.',
      prompt: '请写下你会如何口头回答，尽量使用自然连接词。后续正式口语训练会使用录音与二次重说。',
      placeholder: 'One mistake I often make is ... I will correct it by ... For example, ...',
      minWords: 35,
      keywordGroups: [
        ['one mistake', 'a mistake', 'i often'],
        ['because', 'the reason is'],
        ['for example', 'such as'],
        ['i will', 'next time', 'correct'],
        ['english', 'practice', 'learn'],
      ],
      mistakeReason: '表达不自然' as MistakeReason,
      explanation: '入门口语先看是否能说明问题、原因和修正动作，正式口语模块再做录音闭环。',
    },
    {
      id: 'diag-speaking-word-check',
      kind: 'text',
      skillArea: 'speaking',
      subSkillId: 'diagnostic-speaking-response',
      title: '口语学习方法解释初筛',
      contextLabel: '口语任务',
      context: 'Question: Describe one way you check whether you really remember a new English word.',
      prompt: '请写下你会如何口头回答，尽量使用自然连接词。后续正式口语训练会使用录音与二次重说。',
      placeholder: 'One way I check a new word is ... It works because ... For example, ...',
      minWords: 35,
      keywordGroups: [
        ['one way', 'i check', 'i usually'],
        ['because', 'the reason is'],
        ['for example', 'such as'],
        ['remember', 'recall', 'use it'],
        ['english', 'word', 'practice'],
      ],
      mistakeReason: '表达不自然' as MistakeReason,
      explanation: '先看是否能说清楚“检查方法 + 原因 + 示例”，正式口语模块再做录音与复述。',
    },
  ],
};

const DIAGNOSTIC_CHINESE_SUPPORT: Record<string, DiagnosticChineseSupport> = {
  'diag-reading-location': {
    context:
      '社区图书馆不再只是借书的安静场所。很多图书馆现在提供数字课程、职业工作坊和小型会议室，让居民即使不能进入正规学校，也能持续学习。',
    prompt: '哪一项最能概括社区图书馆的新角色？',
    options: {
      A: '它们主要为当地居民保护旧书。',
      B: '它们已经成为社区灵活的学习中心。',
      C: '它们要求每位居民都参加正规课程。',
      D: '它们正在取代大多数社区里的学校。',
    },
  },
  'diag-reading-active-recall': {
    context:
      '睡前短时间复习可能有帮助，因为它能给大脑留下清晰材料去处理。更好的方法是合上书，回忆核心观点，然后检查遗漏内容。',
    prompt: '文章建议睡前使用哪种方法？',
    options: {
      A: '被动阅读笔记好几个小时。',
      B: '合上书、回忆核心观点，并检查遗漏点。',
      C: '考试前避免所有复习。',
      D: '不检查就照抄示范答案。',
    },
  },
  'diag-reading-note-purpose': {
    context:
      '每次讲座后，有些学生会把每句话都重新写进笔记本。更有效的习惯是只保留主旨、一个关键例子和一个之后复习时要回答的问题。',
    prompt: '文章推荐哪种记笔记习惯？',
    options: {
      A: '逐字抄写整场讲座。',
      B: '忽略例子和问题。',
      C: '保留主旨、一个例子和一个问题。',
      D: '一直到考试周才开始记笔记。',
    },
  },
  'diag-listening-turning-point': {
    context:
      '男：我以为写作工作坊取消了，因为老师生病了。女：差点取消，但院系把它改到线上了。我们仍然需要在周五前提交提纲。',
    prompt: '学生们接下来很可能会做什么？',
    options: {
      A: '等到老师下个月回来。',
      B: '因为工作坊停止而取消提纲。',
      C: '参加线上工作坊，并在周五前提交提纲。',
      D: '要求院系更换主题。',
    },
  },
  'diag-listening-room-change': {
    context:
      '男：图书馆工作坊还在 204 教室吗？女：本来安排在那里，但投影仪坏了，所以组织者把它改到了线上平台。七点查看你的邮件。',
    prompt: '男生应该做什么？',
    options: {
      A: '直接去 204 教室。',
      B: '要求组织者取消工作坊。',
      C: '七点前修好投影仪。',
      D: '查看邮件并在线参加工作坊。',
    },
  },
  'diag-listening-lab-time': {
    context:
      '女：我原计划三点和学习小组见面，但实验室今天提前关闭。男：那我们要改时间吗？女：是的，让我们一点半在大门旁边的咖啡馆开始。',
    prompt: '他们很可能会做什么？',
    options: {
      A: '按原计划三点在实验室见面。',
      B: '一点半在大门附近的咖啡馆见面。',
      C: '取消这一整周的学习小组。',
      D: '等实验室今晚重新开放。',
    },
  },
  'diag-vocabulary-cloze': {
    context:
      '很多学生能记住单词表，但在文章中仍然会选错词，因为他们忽略了空格前后的句子。',
    prompt: '哪一个词最适合补全句子：优秀读者会利用语境为填空选择最 ___ 的词。',
    options: {
      A: '合适的。',
      B: '安静的。',
      C: '昂贵的。',
      D: '私人的。',
    },
  },
  'diag-vocabulary-public-service': {
    context:
      '数字公共服务不应只是速度快。它们还需要清晰说明和线下帮助，这样老年居民才能有信心使用。',
    prompt: '哪一个词最适合补全句子：清晰说明会让公共服务对老年居民更 ___。',
    options: {
      A: '昂贵的。',
      B: '易获得、易使用的。',
      C: '安静的。',
      D: '临时的。',
    },
  },
  'diag-vocabulary-relevant-detail': {
    context:
      '当学生收集太多例子时，他们可能会忘记主要问题。好的笔记只保留那些能清楚支持主题的细节。',
    prompt: '哪一个词最适合补全句子：好的例子必须与主题句直接 ___。',
    options: {
      A: '普通的。',
      B: '安静的。',
      C: '相关的。',
      D: '遥远的。',
    },
  },
  'diag-grammar-structure': {
    context:
      '清楚的句子通常依赖时态、语态、连接词和常见句型。语法训练应该支撑阅读、写作、翻译和完形准确度。',
    prompt: '选择最佳答案：学生被鼓励在错误变成习惯之前 ___ 它们。',
    options: {
      A: 'review，动词原形。',
      B: 'reviewing，动名词或现在分词。',
      C: 'to review，不定式。',
      D: 'reviewed，过去式或过去分词。',
    },
  },
  'diag-grammar-worth-reviewing': {
    context:
      '一个有用的语法习惯是注意常见句型，而不只是孤立规则。固定结构常常决定答案听起来是否自然。',
    prompt: '选择最佳答案：这个错误值得在下次模拟考试前 ___。',
    options: {
      A: 'review，动词原形。',
      B: 'reviewing，动名词或现在分词。',
      C: 'to review，不定式。',
      D: 'reviewed，过去式或过去分词。',
    },
  },
  'diag-grammar-had-better': {
    context:
      '有用的语法习惯应该足够简单，能在每节课后重复执行。短小的纠错流程通常比长时间被动复习更有效。',
    prompt: '选择最佳答案：学生最好在每节课后 ___ 一段简短总结。',
    options: {
      A: 'write，动词原形。',
      B: 'writing，动名词或现在分词。',
      C: 'to write，不定式。',
      D: 'written，过去分词。',
    },
  },
  'diag-writing-argument': {
    context: '题目：学生学习英语时是否应该使用 AI 工具？',
  },
  'diag-writing-review-habit': {
    context: '题目：定期复习是否比考前突击更有用？',
  },
  'diag-writing-study-partner': {
    context: '题目：独自学习是否比和搭档一起学习更好？',
  },
  'diag-speaking-response': {
    context: '问题：描述一个帮助你学习英语的习惯，并解释它为什么有效。',
  },
  'diag-speaking-mistake': {
    context: '问题：描述一个你经常犯的英语错误，并说明你会如何纠正它。',
  },
  'diag-speaking-word-check': {
    context: '问题：描述一种你检查自己是否真正记住新英语单词的方法。',
  },
};

function attachDiagnosticChineseSupport(item: DiagnosticItem): DiagnosticItem {
  const chineseSupport = DIAGNOSTIC_CHINESE_SUPPORT[item.id];
  return chineseSupport ? { ...item, chineseSupport } : item;
}

function getRandomIndex(length: number, random: () => number): number {
  const value = Math.max(0, Math.min(0.999999, random()));
  return Math.floor(value * length);
}

function shuffleDiagnosticItems(items: DiagnosticItem[], random: () => number): DiagnosticItem[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomIndex(index + 1, random);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function selectDistinctDiagnosticItems(params: {
  pool: DiagnosticItem[];
  count: number;
  excluded: Set<string>;
  random: () => number;
}): DiagnosticItem[] {
  const available = shuffleDiagnosticItems(params.pool.filter((item) => !params.excluded.has(item.id)), params.random);
  if (available.length >= params.count) return available.slice(0, params.count);

  const selectedIds = new Set(available.map((item) => item.id));
  const fallback = shuffleDiagnosticItems(
    params.pool.filter((item) => !selectedIds.has(item.id)),
    params.random,
  );
  return [...available, ...fallback].slice(0, params.count);
}

export function createOnboardingDiagnosticItems(options: CreateOnboardingDiagnosticItemsOptions = {}): DiagnosticItem[] {
  const random = options.random ?? Math.random;
  const excluded = new Set(options.excludeItemIds ?? []);
  const selected = [
    ...objectiveDiagnosticSkillAreas.flatMap((skillArea) => {
      return selectDistinctDiagnosticItems({
        pool: ONBOARDING_DIAGNOSTIC_ITEM_POOL[skillArea],
        count: ONBOARDING_DIAGNOSTIC_OBJECTIVE_ITEMS_PER_SKILL,
        excluded,
        random,
      });
    }),
    ...subjectiveDiagnosticSkillAreas.flatMap((skillArea) => {
      return selectDistinctDiagnosticItems({
        pool: ONBOARDING_DIAGNOSTIC_ITEM_POOL[skillArea],
        count: ONBOARDING_DIAGNOSTIC_SUBJECTIVE_ITEMS_PER_SKILL,
        excluded,
        random,
      });
    }),
  ];

  const orderedItems = options.shuffleOrder ? shuffleDiagnosticItems(selected, random) : selected;
  return orderedItems.map(attachDiagnosticChineseSupport);
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampScore(value: number): number {
  return Math.max(30, Math.min(88, Math.round(value)));
}

function normalizeAnswer(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function countEnglishWords(value: string): number {
  return normalizeAnswer(value).match(/[A-Za-z][A-Za-z0-9'-]*/g)?.length ?? 0;
}

function countSentences(value: string): number {
  return normalizeAnswer(value).split(/[.!?]+/u).map((segment) => segment.trim()).filter(Boolean).length;
}

function containsChinese(value: string): boolean {
  return /[\u4e00-\u9fff]/u.test(value);
}

function countMatchedKeywordGroups(item: DiagnosticTextItem, normalized: string): number {
  return item.keywordGroups.filter((group) => group.some((keyword) => normalized.includes(keyword))).length;
}

function makeRubricDimension(label: string, score: number, maxScore: number, observation: string): DiagnosticRubricDimension {
  return {
    label,
    score,
    maxScore,
    observation,
  };
}

function scoreByRatio(ratio: number, bands: Array<{ min: number; score: number }>): number {
  const matchedBand = bands.find((band) => ratio >= band.min);
  return matchedBand?.score ?? 0;
}

function scoreTaskCompletion(wordCount: number, minWords: number): DiagnosticRubricDimension {
  const ratio = minWords > 0 ? wordCount / minWords : 1;
  const score = scoreByRatio(ratio, [
    { min: 1, score: 20 },
    { min: 0.75, score: 15 },
    { min: 0.5, score: 9 },
    { min: 0.2, score: 4 },
  ]);
  const observation =
    score >= 20
      ? `字数达到要求，当前共 ${wordCount} 词。`
      : score >= 15
      ? `字数接近要求，当前共 ${wordCount} 词。`
      : score > 0
      ? `字数不足，当前仅 ${wordCount} 词。`
      : '几乎没有可用作答。';

  return makeRubricDimension('任务完成', score, 20, observation);
}

function scoreCoverage(item: DiagnosticTextItem, keywordHits: number): DiagnosticRubricDimension {
  const totalGroups = Math.max(1, item.keywordGroups.length);
  const ratio = keywordHits / totalGroups;
  const score = Math.round(ratio * 40);
  const observation =
    ratio >= 0.8
      ? `命中 ${keywordHits}/${totalGroups} 个核心信息点。`
      : ratio >= 0.5
      ? `命中 ${keywordHits}/${totalGroups} 个核心信息点，信息覆盖仍有缺口。`
      : `只命中 ${keywordHits}/${totalGroups} 个核心信息点，语义证据不足。`;

  return makeRubricDimension('核心信息覆盖', score, 40, observation);
}

function scoreOrganization(item: DiagnosticTextItem, normalized: string, keywordHits: number): DiagnosticRubricDimension {
  const sentenceCount = countSentences(normalized);
  const structureSignalGroups = item.skillArea === 'translation' ? item.keywordGroups.slice(0, 1) : item.keywordGroups.slice(0, 3);
  const structureHits = structureSignalGroups.filter((group) => group.some((keyword) => normalized.includes(keyword))).length;

  let score = 0;
  if (item.skillArea === 'translation') {
    const structureSignals = Number(sentenceCount >= 1) + Number(!containsChinese(normalized)) + Number(keywordHits >= 3);
    score = scoreByRatio(structureSignals / 3, [
      { min: 1, score: 20 },
      { min: 2 / 3, score: 14 },
      { min: 1 / 3, score: 8 },
    ]);
  } else {
    score = scoreByRatio(structureHits / Math.max(1, structureSignalGroups.length), [
      { min: 1, score: 20 },
      { min: 2 / 3, score: 15 },
      { min: 1 / 3, score: 9 },
    ]);
  }

  const observation =
    item.skillArea === 'translation'
      ? score >= 20
        ? '句法转换完整，且已切换为英文表达。'
        : score >= 14
        ? '句法转换基本成立，但表达还不够稳。'
        : '句法转换证据较弱，结构还不稳定。'
      : score >= 20
      ? '观点/理由/例子或问题/原因/修正结构完整。'
      : score >= 15
      ? '已经形成基本结构，但仍有连接不完整的部分。'
      : '结构信号不足，暂时更像零散句子。';

  return makeRubricDimension('结构组织', score, 20, observation);
}

function scoreLanguageControl(answer: string): DiagnosticRubricDimension {
  const normalized = normalizeAnswer(answer);
  const words = normalized.toLowerCase().split(/[^\p{L}\p{N}'-]+/u).filter(Boolean);
  const uniqueRatio = words.length > 0 ? new Set(words).size / words.length : 0;
  const sentenceCount = countSentences(normalized);
  const englishOnly = !containsChinese(normalized);
  const signalCount = Number(englishOnly) + Number(sentenceCount >= 1) + Number(uniqueRatio >= 0.55);
  const score = scoreByRatio(signalCount / 3, [
    { min: 1, score: 12 },
    { min: 2 / 3, score: 8 },
    { min: 1 / 3, score: 4 },
  ]);
  const observation =
    score >= 12
      ? '句子基本成形，词汇重复度可接受。'
      : score >= 8
      ? '语言可读，但仍有明显口语化或拼接痕迹。'
      : score > 0
      ? '语言控制较弱，暂时只够做初筛。'
      : '没有足够语言证据。';

  return makeRubricDimension('语言控制', score, 12, observation);
}

function getSafeAiEvaluation(item: DiagnosticTextItem, aiEvaluation?: DiagnosticAiEvaluation): DiagnosticAiEvaluation | undefined {
  if (!aiEvaluation || aiEvaluation.itemId !== item.id || aiEvaluation.source !== 'ai') return undefined;
  return {
    ...aiEvaluation,
    score: clampScore(aiEvaluation.score),
    mistakeReasons: [...new Set(aiEvaluation.mistakeReasons)],
    comments: aiEvaluation.comments.filter(Boolean).slice(0, 3),
    nextActions: aiEvaluation.nextActions.filter(Boolean).slice(0, 3),
    evidence: aiEvaluation.evidence.filter(Boolean).slice(0, 3),
    confidence: aiEvaluation.confidence === 'high' ? 'medium' : aiEvaluation.confidence,
  };
}

function scoreTextItem(item: DiagnosticTextItem, answer: string, aiEvaluation?: DiagnosticAiEvaluation): DiagnosticScoreDetail {
  const normalized = normalizeAnswer(answer).toLowerCase();
  const answered = normalized.length > 0;
  const wordCount = countEnglishWords(normalized);
  const keywordHits = countMatchedKeywordGroups(item, normalized);
  const taskCompletion = scoreTaskCompletion(wordCount, item.minWords);
  const coverage = scoreCoverage(item, keywordHits);
  const organization = scoreOrganization(item, normalized, keywordHits);
  const languageControl = scoreLanguageControl(answer);
  const rubric = [taskCompletion, coverage, organization, languageControl];
  const ruleScore = clampScore(rubric.reduce((sum, dimension) => sum + dimension.score, 0));
  const coverageRatio = keywordHits / Math.max(1, item.keywordGroups.length);
  const taskRatio = item.minWords > 0 ? wordCount / item.minWords : 1;
  const ruleConfidenceLevel: DiagnosticConfidenceLevel =
    coverageRatio >= 0.75 && taskRatio >= 0.9 && organization.score >= 15 ? 'medium' : 'low';
  const safeAiEvaluation = getSafeAiEvaluation(item, aiEvaluation);
  const score = safeAiEvaluation
    ? clampScore(Math.round(ruleScore * 0.35 + safeAiEvaluation.score * 0.65))
    : ruleScore;
  const passed = score >= 70;
  const confidenceLevel: DiagnosticConfidenceLevel = safeAiEvaluation
    ? (ruleConfidenceLevel === 'medium' && safeAiEvaluation.confidence === 'medium' ? 'medium' : 'low')
    : ruleConfidenceLevel;
  const confidenceLabel =
    safeAiEvaluation
      ? '中可信：AI 按 CET-4 Rubric 复核，并与本地规则交叉校验；单次主观题仍不写入正式画像'
      : confidenceLevel === 'medium'
      ? '中可信：主观题按显式规则初筛，适合决定下一步训练方向'
      : '低可信：主观题证据不足，需要专项训练或复测复核';
  const aiComments = safeAiEvaluation?.comments ?? [];
  const aiActions = safeAiEvaluation?.nextActions ?? [];
  const aiEvidence = safeAiEvaluation?.evidence ?? [];
  const mistakeReasons = safeAiEvaluation
    ? (passed && confidenceLevel === 'medium'
      ? safeAiEvaluation.mistakeReasons
      : [...safeAiEvaluation.mistakeReasons, item.mistakeReason, ...(confidenceLevel === 'low' ? [lowConfidence] : [])])
    : (passed && confidenceLevel === 'medium' ? [] : [item.mistakeReason, ...(confidenceLevel === 'low' ? [lowConfidence] : [])]);

  return {
    itemId: item.id,
    skillArea: item.skillArea,
    subSkillId: item.subSkillId,
    title: item.title,
    score,
    answered,
    validEvidenceCount: answered ? 1 : 0,
    evidenceSummary: answered
      ? `有效主观样本 1/1；命中 ${keywordHits}/${item.keywordGroups.length} 个核心信息点，规则分 ${ruleScore}${safeAiEvaluation ? `，AI 复核分 ${safeAiEvaluation.score}` : ''}。`
      : '未作答，当前没有可用于诊断的主观证据。',
    isCorrect: passed,
    mistakeReasons: [...new Set(mistakeReasons)],
    feedback: safeAiEvaluation
      ? [aiComments[0], aiEvidence[0] ? `AI 证据：${aiEvidence[0]}` : ''].filter(Boolean).join(' ')
      : confidenceLevel === 'medium'
        ? `规则初筛命中 ${keywordHits}/${item.keywordGroups.length} 个关键信息点，当前可进入下一轮专项训练。`
        : item.explanation,
    nextAction: safeAiEvaluation
      ? aiActions[0] ?? '进入专项训练，并用后续 2-3 次真实作答复核 AI 结论。'
      : confidenceLevel === 'medium'
        ? '进入专项训练，用更多真实作答继续验证稳定性。'
        : '先补齐核心信息和结构模板，再通过专项训练或复测复核。',
    confidenceLevel,
    confidenceLabel,
    scoringMethod: safeAiEvaluation ? 'ai-assisted-rubric' : 'rubric-screening',
    scoringSummary: safeAiEvaluation
      ? `AI 复核分 ${safeAiEvaluation.score}，本地规则分 ${ruleScore}；当前主观题分按 65% AI + 35% 规则合成，但仍只作为训练方向，不写入正式能力画像。`
      : '主观题按任务完成、核心信息覆盖、结构组织、语言控制四项规则初筛，不直接等同人工阅卷。',
    rubric: safeAiEvaluation
      ? [...rubric, makeRubricDimension('AI Rubric 复核', safeAiEvaluation.score, 100, aiComments[0] ?? 'AI 已按 CET-4 主观题 Rubric 给出复核分。')]
      : rubric,
    aiEvaluation: safeAiEvaluation,
  };
}

function scoreChoiceItem(item: DiagnosticChoiceItem, answer: string): DiagnosticScoreDetail {
  const selected = normalizeAnswer(answer).toUpperCase() as ChoiceAnswer;
  const isCorrect = selected === item.correctAnswer;
  const hasAnswer = Boolean(selected);
  const rubric = [
    makeRubricDimension('答题结果', isCorrect ? 52 : hasAnswer ? 22 : 0, 52, isCorrect ? '当前选项与标准答案一致。' : '当前选项与标准答案不一致。'),
    makeRubricDimension(
      '规则证据',
      hasAnswer ? 26 : 8,
      26,
      hasAnswer ? '客观题可直接用标准答案核验，单题规则证据明确。' : '未作答，无法形成有效规则证据。',
    ),
  ];
  const score = clampScore(rubric.reduce((sum, dimension) => sum + dimension.score, 0));
  const confidenceLevel: DiagnosticConfidenceLevel = hasAnswer ? 'high' : 'low';
  const confidenceLabel =
    confidenceLevel === 'high' ? '高可信：客观题可直接按标准答案核验' : '低可信：缺少有效作答，暂时不能形成判断';

  return {
    itemId: item.id,
    skillArea: item.skillArea,
    subSkillId: item.subSkillId,
    title: item.title,
    score,
    answered: hasAnswer,
    validEvidenceCount: hasAnswer ? 1 : 0,
    evidenceSummary: hasAnswer
      ? `有效客观证据 1/1；选项 ${selected} ${isCorrect ? '命中' : '未命中'}标准答案 ${item.correctAnswer}。`
      : '未作答，当前没有可用于核验的客观证据。',
    isCorrect,
    mistakeReasons: isCorrect ? [] : [item.mistakeReason],
    feedback: isCorrect ? '客观题答对，当前能抓到这个线索，但仍只是单题初筛证据。' : item.explanation,
    nextAction: isCorrect ? '用同题型限时题继续验证稳定性。' : '复习时先遮住答案，主动回忆定位线索和转折信号。',
    confidenceLevel,
    confidenceLabel,
    scoringMethod: 'objective-rule',
    scoringSummary: '客观题按标准答案判分，规则清晰，但单题样本只能作为基线证据。',
    rubric,
  };
}

export function scoreDiagnosticAnswers(
  answers: DiagnosticAnswerMap,
  items: DiagnosticItem[] = ONBOARDING_DIAGNOSTIC_ITEMS,
  aiEvaluations: DiagnosticAiEvaluationMap = {},
): DiagnosticScoreDetail[] {
  return items.map((item) => {
    const answer = answers[item.id] ?? '';
    return item.kind === 'single-choice' ? scoreChoiceItem(item, answer) : scoreTextItem(item, answer, aiEvaluations[item.id]);
  });
}

function getProfileConfidence(detail: DiagnosticScoreDetail): 1 | 2 | 3 | 4 | 5 {
  if (detail.confidenceLevel === 'high') return detail.score >= 70 ? 5 : 4;
  if (detail.confidenceLevel === 'medium') return detail.score >= 70 ? 4 : 3;
  return 2;
}

function getRankingScore(detail: DiagnosticSkillSummary): number {
  if (detail.score == null) return -Infinity;
  const confidencePenalty = detail.confidenceLevel === 'low' ? 8 : detail.confidenceLevel === 'medium' ? 4 : 0;
  return detail.score - confidencePenalty;
}

function buildObjectiveSkillSummary(skillArea: DiagnosticSkillArea, results: DiagnosticScoreDetail[]): DiagnosticSkillSummary {
  const totalCount = results.length;
  const answeredCount = results.filter((result) => result.answered).length;
  const correctCount = results.filter((result) => result.isCorrect).length;
  const confirmedForProfile = totalCount >= ONBOARDING_DIAGNOSTIC_OBJECTIVE_ITEMS_PER_SKILL && answeredCount === totalCount;
  const score =
    totalCount >= 2
      ? correctCount === totalCount
        ? 82
        : correctCount >= 1
        ? 62
        : 42
      : correctCount === 1
      ? 74
      : answeredCount === 0
      ? 30
      : 46;
  const confidenceLevel: DiagnosticConfidenceLevel = confirmedForProfile ? 'medium' : 'low';
  const uniqueMistakeReasons = [...new Set(results.flatMap((result) => result.mistakeReasons))];

  return {
    skillArea,
    subSkillId: results[0]?.subSkillId ?? `diagnostic-${skillArea}`,
    title: results.map((result) => result.title).join(' / '),
    score,
    itemIds: results.map((result) => result.itemId),
    evidenceCount: totalCount,
    validEvidenceCount: answeredCount,
    evidenceSummary: confirmedForProfile
      ? `有效客观证据 ${answeredCount}/${totalCount}；答对 ${correctCount}/${totalCount}，可写入当前客观基线。`
      : `有效客观证据 ${answeredCount}/${totalCount}；证据不足，暂不写入正式画像。`,
    confirmedForProfile,
    mistakeReasons: confirmedForProfile ? uniqueMistakeReasons : [...uniqueMistakeReasons, lowConfidence],
    feedback:
      correctCount === totalCount
        ? `${correctCount}/${totalCount} 道客观题答对，可作为当前客观基线。`
        : correctCount === 0
        ? `${totalCount} 道客观题都未命中，当前更像是稳定弱项。`
        : `${totalCount} 道客观题中答对 ${correctCount} 道，说明这一能力还不稳定。`,
    nextAction:
      correctCount === totalCount
        ? '继续用同题型限时题验证稳定性，再逐步提高难度。'
        : '先做对应专项训练，再用新题复测是否能稳定命中同类线索。',
    confidenceLevel,
    confidenceLabel: confirmedForProfile
      ? '中可信：同一能力点已用 2 道客观题直接核验，可写入当前基线画像。'
      : '低可信：客观题数量不足或作答不完整，暂不写入正式能力画像。',
    scoringMethod: 'objective-aggregate',
    scoringSummary: '同一能力点至少用 2 道客观题聚合判定；只有证据足够时才写入正式能力画像和总分。',
    rubric: [
      makeRubricDimension('标准答案命中', correctCount, totalCount, `答对 ${correctCount}/${totalCount} 道客观题。`),
      makeRubricDimension(
        '有效证据',
        answeredCount,
        totalCount,
        confirmedForProfile
          ? `已采集 ${answeredCount}/${totalCount} 道可直接核验题，可作为当前客观基线。`
          : `仅采集 ${answeredCount}/${totalCount} 道客观题，证据仍然不足。`,
      ),
    ],
  };
}

function buildSubjectiveSkillSummary(result: DiagnosticScoreDetail): DiagnosticSkillSummary {
  const nextAction =
    result.scoringMethod === 'ai-assisted-rubric'
      ? result.nextAction
      : result.confidenceLevel === 'medium'
      ? '进入该题型专项训练，并在后续 2-3 次真实作答后再校准。'
      : '先补模板和核心信息，再通过专项训练或复测复核。';

  return {
    skillArea: result.skillArea,
    subSkillId: result.subSkillId,
    title: result.title,
    score: null,
    itemIds: [result.itemId],
    evidenceCount: 1,
    validEvidenceCount: result.validEvidenceCount,
    evidenceSummary: result.answered
      ? result.evidenceSummary
      : '未作答，当前只记录为缺失证据。',
    confirmedForProfile: false,
    mistakeReasons: result.mistakeReasons,
    feedback: result.scoringMethod === 'ai-assisted-rubric'
      ? result.feedback
      : result.confidenceLevel === 'medium'
        ? '已采集主观题样本，可据此决定先练什么，但不直接写入能力画像。'
        : '已采集主观题样本，先暴露结构和信息覆盖问题，再通过专项训练复核。',
    nextAction,
    confidenceLevel: result.scoringMethod === 'ai-assisted-rubric' ? result.confidenceLevel : 'low',
    confidenceLabel: result.scoringMethod === 'ai-assisted-rubric'
      ? '中可信：主观题已完成 AI Rubric 复核，但仍需后续真实作答验证，不直接写入正式画像。'
      : '低可信：主观题当前只做样本采集，不直接计入总分或正式能力画像。',
    scoringMethod: result.scoringMethod === 'ai-assisted-rubric' ? 'ai-assisted-rubric' : 'rubric-screening',
    scoringSummary: result.scoringMethod === 'ai-assisted-rubric'
      ? result.scoringSummary
      : '主观题只用于采样任务完成、信息覆盖和结构问题，当前不直接定级，也不写入总分。',
    rubric: result.rubric,
  };
}

function buildDiagnosticSkillSummaries(details: DiagnosticScoreDetail[]): DiagnosticSkillSummary[] {
  const grouped = new Map<DiagnosticSkillArea, DiagnosticScoreDetail[]>();
  details.forEach((detail) => {
    const list = grouped.get(detail.skillArea);
    if (list) list.push(detail);
    else grouped.set(detail.skillArea, [detail]);
  });

  return diagnosticSkillOrder
    .map((skillArea) => {
      const results = grouped.get(skillArea) ?? [];
      if (results.length === 0) return null;
      return objectiveDiagnosticSkillAreas.includes(skillArea)
        ? buildObjectiveSkillSummary(skillArea, results)
        : buildSubjectiveSkillSummary(results[0]);
    })
    .filter((detail): detail is DiagnosticSkillSummary => Boolean(detail));
}

function buildConfidenceSummary(summaries: DiagnosticSkillSummary[], itemResults: DiagnosticScoreDetail[]): DiagnosticConfidenceSummary {
  const objectiveItemCount = itemResults.filter((detail) => detail.scoringMethod === 'objective-rule').length;
  const rubricItemCount = itemResults.filter((detail) => detail.scoringMethod !== 'objective-rule').length;
  const confirmedSkillAreas = summaries.filter((detail) => detail.confirmedForProfile).map((detail) => detail.skillArea);
  const provisionalSkillAreas = summaries.filter((detail) => !detail.confirmedForProfile).map((detail) => detail.skillArea);
  const aiAssistedCount = itemResults.filter((detail) => detail.scoringMethod === 'ai-assisted-rubric').length;

  if (confirmedSkillAreas.length < objectiveDiagnosticSkillAreas.length) {
    return {
      level: 'low',
      label: '本次诊断仍缺少足够客观证据',
      note: `已确认 ${confirmedSkillAreas.length}/${objectiveDiagnosticSkillAreas.length} 个客观能力点；其余能力点暂不适合写入正式画像。`,
      objectiveItemCount,
      rubricItemCount,
      confirmedSkillAreas,
      provisionalSkillAreas,
    };
  }

  return {
    level: 'medium',
    label: '本次已确认客观基线，主观项仍待复核',
    note: aiAssistedCount > 0
      ? `阅读、听力、词汇、语法已用 ${objectiveItemCount} 道客观题聚合核验；${aiAssistedCount} 道主观题已 AI Rubric 复核，但仍不计入总分或画像。`
      : `阅读、听力、词汇、语法已用 ${objectiveItemCount} 道客观题聚合核验；翻译、写作、口语当前只采样，不计入总分或画像。`,
    objectiveItemCount,
    rubricItemCount,
    confirmedSkillAreas,
    provisionalSkillAreas,
  };
}

function getSummaryProfileConfidence(detail: DiagnosticSkillSummary): 1 | 2 | 3 | 4 | 5 {
  if (!detail.confirmedForProfile || detail.score == null) return 2;
  if (detail.confidenceLevel === 'medium') return detail.score >= 70 ? 4 : 3;
  return detail.score >= 70 ? 5 : 4;
}

function buildSkillProfiles(details: DiagnosticSkillSummary[], completedAt: string, examId: string): SkillProfile[] {
  return details
    .filter((detail) => detail.confirmedForProfile && detail.score != null)
    .map((detail) => ({
    id: `${examId}-${detail.skillArea}-diagnostic`,
    skillArea: detail.skillArea,
    subSkillId: detail.subSkillId,
    score: detail.score!,
    confidence: getSummaryProfileConfidence(detail),
    evidenceCount: detail.evidenceCount,
    lastUpdatedAt: completedAt,
    }));
}

function buildAttempt(params: {
  sessionId: string;
  item: DiagnosticItem;
  detail: DiagnosticScoreDetail;
  answer: string;
  examId: string;
  elapsedSeconds: number;
  createdAt: string;
}): Attempt {
  const aiFeedback: AiFeedbackSummary = {
    score: params.detail.score,
    mistakeReasons: params.detail.mistakeReasons,
    comments: [params.detail.feedback, params.detail.scoringSummary],
    nextActions: [params.detail.nextAction],
    confidence: params.detail.confidenceLevel,
  };

  return {
    id: makeId(`attempt-${params.item.skillArea}`),
    sessionId: params.sessionId,
    questionId: params.item.id,
    examId: params.examId,
    moduleId: params.item.skillArea,
    questionTypeId: params.item.subSkillId,
    answer: params.answer,
    isCorrect: params.detail.isCorrect,
    elapsedSeconds: params.elapsedSeconds,
    confidence: getProfileConfidence(params.detail),
    mistakeReasons: params.detail.mistakeReasons,
    aiFeedback,
    createdAt: params.createdAt,
  };
}

function buildReviewItem(params: {
  item: DiagnosticItem;
  attempt: Attempt;
  detail: DiagnosticScoreDetail;
  examId: string;
  createdAt: string;
}): ReviewItem | null {
  if (params.detail.score >= 70 && params.detail.mistakeReasons.length === 0 && params.detail.confidenceLevel !== 'low') return null;

  const nextReviewAt = new Date(params.createdAt);
  nextReviewAt.setDate(nextReviewAt.getDate() + 1);
  const redoQuestion: ReviewItem['redoQuestion'] = params.item.kind === 'single-choice'
    ? {
        kind: 'single-choice',
        prompt: params.item.prompt,
        context: params.item.context,
        options: Object.fromEntries(params.item.options.map((option) => [option.id, option.label])) as Partial<Record<ChoiceAnswer, string>>,
        correctAnswer: params.item.correctAnswer,
        userAnswer: String(params.attempt.answer ?? ''),
        explanation: params.item.explanation || params.detail.feedback,
        sourceLabel: params.item.title,
      }
    : {
        kind: 'text',
        prompt: params.item.prompt,
        context: params.item.context,
        userAnswer: String(params.attempt.answer ?? ''),
        explanation: params.item.explanation || params.detail.feedback,
        sourceLabel: params.item.title,
      };

  return {
    id: makeId(`review-${params.item.skillArea}`),
    title: `入门诊断弱项：${params.item.title}`,
    category: '错题',
    detail: `${params.item.contextLabel}：${params.item.context}\n作答：${String(params.attempt.answer || '未作答')}\n反馈：${params.detail.feedback}`,
    daysAgo: 0,
    targetType: 'question',
    targetId: params.item.id,
    examId: params.examId,
    moduleId: params.item.skillArea,
    skillArea: params.item.skillArea,
    masteryScore: Math.max(30, params.detail.score),
    priorityScore: params.detail.score < 55 ? 90 : 70,
    reviewIntervalDays: 1,
    nextReviewAt: nextReviewAt.toISOString(),
    sourceAttemptId: params.attempt.id,
    createdAt: params.createdAt,
    redoQuestion,
    learningMethod: 'wrong-question-redo-active-recall',
    retrievalCount: 0,
  };
}

export function buildOnboardingDiagnosticReport(input: {
  answers: DiagnosticAnswerMap;
  items?: DiagnosticItem[];
  aiEvaluations?: DiagnosticAiEvaluationMap;
  examId?: string;
  targetScore: number;
  dailyMinutes: number;
  startedAt: string;
  completedAt?: string;
}): OnboardingDiagnosticReport {
  const examId = input.examId ?? 'cet4';
  const completedAt = input.completedAt ?? new Date().toISOString();
  const startedAtMs = new Date(input.startedAt).getTime();
  const elapsedSeconds = Number.isFinite(startedAtMs)
    ? Math.max(1, Math.round((new Date(completedAt).getTime() - startedAtMs) / 1000))
    : 1;
  const items = input.items?.length ? input.items : ONBOARDING_DIAGNOSTIC_ITEMS;
  const itemResults = scoreDiagnosticAnswers(input.answers, items, input.aiEvaluations);
  const answeredItems = items.filter((item) => (input.answers[item.id] ?? '').trim().length > 0);
  const sessionId = makeId('session-onboarding-diagnostic');
  const elapsedPerItem = Math.max(1, Math.round(elapsedSeconds / Math.max(1, items.length)));
  const attempts = answeredItems.map((item) => {
    const detail = itemResults.find((candidate) => candidate.itemId === item.id)!;
    return buildAttempt({
      sessionId,
      item,
      detail,
      answer: input.answers[item.id] ?? '',
      examId,
      elapsedSeconds: elapsedPerItem,
      createdAt: completedAt,
    });
  });
  const reviewItems = answeredItems.map((item) => {
    const detail = itemResults.find((candidate) => candidate.itemId === item.id)!;
    const attempt = attempts.find((candidate) => candidate.questionId === item.id)!;
    return buildReviewItem({ item, attempt, detail, examId, createdAt: completedAt });
  }).filter((item): item is ReviewItem => Boolean(item));
  const details = buildDiagnosticSkillSummaries(itemResults);
  const skillProfiles = buildSkillProfiles(details, completedAt, examId);
  const confirmedDetails = details.filter((detail) => detail.confirmedForProfile && detail.score != null);
  const averageScore = confirmedDetails.length > 0
    ? Math.round(confirmedDetails.reduce((sum, detail) => sum + (detail.score ?? 0), 0) / confirmedDetails.length)
    : null;
  const ranked = [...confirmedDetails].sort((left, right) => getRankingScore(left) - getRankingScore(right));
  const confidenceSummary = buildConfidenceSummary(details, itemResults);

  const session: PracticeSession = {
    id: sessionId,
    goalId: 'goal-cet4-primary',
    examId,
    moduleId: 'onboarding',
    modeId: 'diagnostic',
    startedAt: input.startedAt,
    finishedAt: completedAt,
    plannedMinutes: Math.max(8, Math.round(input.dailyMinutes * 0.25)),
    questionIds: items.map((item) => item.id),
    status: 'completed',
  };

  return {
    session,
    attempts,
    reviewItems,
    skillProfiles,
    details,
    averageScore,
    weakestSkills: ranked.slice(0, 2).map((detail) => detail.skillArea),
    strongestSkills: ranked.slice(-2).reverse().map((detail) => detail.skillArea),
    confidenceSummary,
  };
}
