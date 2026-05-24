import { Passage, ReviewItem, AbilityScore, SkillGap, TimelineLog, SpeakingSession } from './types';

export const INITIAL_PASSAGE: Passage = {
  id: 'cet-ai-edu',
  examId: 'cet4',
  moduleId: 'reading',
  title: 'Artificial Intelligence in Education',
  content: `The impact of artificial intelligence on modern education is a subject of intense debate among scholars and practitioners. Proponents argue that AI can provide personalized learning experiences, tailoring educational content to the specific needs and pacing of individual students. This adaptability, they claim, can significantly enhance student engagement and academic outcomes.

However, critics raise valid concerns regarding data privacy, the potential for algorithmic bias, and the diminished role of human educators. Some critics argue that the integration of AI tools will inevitably lead to a decline in students' foundational skills, replacing genuine learning with algorithmic shortcuts. One major study recently indicated that while AI tools excel at teaching foundational concepts, they often struggle to foster critical thinking and emotional intelligence, skills traditionally nurtured through complex human interaction. Furthermore, the over-reliance on technology might exacerbate existing inequalities if access to sophisticated AI platforms is disproportionately available only to well-funded institutions.

In conclusion, while the integration of AI into classrooms presents unprecedented opportunities for educational advancement, it requires careful regulation and a balanced approach that preserves the irreplaceable value of human mentorship. Consequently, the AI can instantly modify the difficulty of subsequent exercises, ensuring the learner remains in the optimal zone of proximal development. As we navigate this digital transformation, the focus must remain on augmenting, rather than replacing, the pedagogical expertise of teachers.`,
  questions: [
    {
      id: 1,
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: "According to the passage, what is a primary limitation of current AI educational tools?",
      options: {
        A: "They are too expensive for most public school systems to implement.",
        B: "They fail to effectively cultivate high-level reasoning and empathy.",
        C: "They are inherently biased against certain student demographics.",
        D: "They replace the need for traditional curriculum development."
      },
      correctAnswer: 'B',
      explanation: "定位到第二段：'while AI tools excel at teaching foundational concepts, they often struggle to foster critical thinking and emotional intelligence, skills traditionally nurtured through complex human interaction.' 句中的 critical thinking 对应选项中的 high-level reasoning，emotional intelligence 对应 empathy。",
      type: "细节理解",
      tags: ['同义替换', '细节定位'],
      difficulty: 3,
      sourceType: 'original',
      highlightTextIndices: {
        correct: [498, 680], // One major study... human interaction
        distractor: [340, 497] // Some critics argue... shortcuts.
      }
    },
    {
      id: 2,
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: "According to the passage, what is a primary benefit of adaptive learning platforms?",
      options: {
        A: "They replace the need for traditional educators entirely.",
        B: "They inevitably lead to a decline in foundational learning skills.",
        C: "They modify exercise difficulty to suit individual learner progress.",
        D: "They standardize the instruction method across all classrooms."
      },
      correctAnswer: 'C',
      explanation: "定位到最后一段：'Consequently, the AI can instantly modify the difficulty of subsequent exercises, ensuring the learner remains in the optimal zone of proximal development.' 选项 C 完美契合该句表达的‘即时调整后续练习难度以适应个人的最近发展区’。",
      type: "细节推理",
      tags: ['细节定位', '功能句'],
      difficulty: 3,
      sourceType: 'original',
      highlightTextIndices: {
        correct: [864, 1025], // Consequently, the AI... development.
        distractor: [340, 497] // Some critics argue... shortcuts.
      }
    },
    {
      id: 3,
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: "Critics are worried that the widespread adoption of AI in education might ________.",
      options: {
        A: "reduce the funding allocated to scientific research",
        B: "widen the educational gap between rich and poor schools",
        C: "decrease the overall graduation rates of public schools",
        D: "force experienced teachers to choose early retirement"
      } as any, // standard structure
      correctAnswer: 'B',
      explanation: "定位到第二段后半句：'the over-reliance on technology might exacerbate existing inequalities if access to sophisticated AI platforms is disproportionately available only to well-funded institutions.' 特别提到如果复杂的AI平台仅限于富裕学校，将加剧现有的不平等，即扩大贫富学校之间的差距。",
      type: "因果推理",
      tags: ['因果推理', '细节定位'],
      difficulty: 3,
      sourceType: 'original',
      highlightTextIndices: {
        correct: [694, 861], // Furthermore, the over-reliance... institutions.
        distractor: [111, 281] // Proponents argue that... outcomes.
      }
    },
    {
      id: 4,
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: "What does the author suggest regarding 'human mentorship' in the digital era?",
      options: {
        A: "It should be replaced by advanced virtual human coaches to save costs.",
        B: "It is irreplaceable and must be preserved alongside AI tools.",
        C: "It should focus purely on teaching basic grammatical rules.",
        D: "It needs to be standardized through centralized digital tracking."
      },
      correctAnswer: 'B',
      explanation: "定位到最后一段：'it requires careful regulation and a balanced approach that preserves the irreplaceable value of human mentorship.'，作者强调尽管AI带来了新机遇，但必须采用平衡的方法，保留不可替代的人类导师价值。",
      type: "态度意图",
      tags: ['态度判断', '作者观点'],
      difficulty: 4,
      sourceType: 'original',
      highlightTextIndices: {
        correct: [740, 863], // while the integration... human mentorship.
        distractor: [1026, 1144] // As we navigate this... teachers.
      }
    },
    {
      id: 5,
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: "Which of the following would be the best title for the passage?",
      options: {
        A: "The Impending Death of Teacher-Led Classrooms",
        B: "How AI Exacerbates Global Economic Inequality",
        C: "Balancing Opportunities and Concerns: AI in Modern Education",
        D: "A Technological Guide to Developing Critical Thinking"
      },
      correctAnswer: 'C',
      explanation: "整篇文章既探讨了人工智能在个性化学习、增强学生参与度等方面的优势（Proponents argue...），也深入探讨了数据隐私、算法偏见以及缺乏高阶思维培养等担忧（ critics raise valid concerns...），最后得出需要 balanced approach 的结论。最佳题目应是综合两方面的 C 选项。",
      type: "主旨大意",
      tags: ['主旨大意', '篇章结构'],
      difficulty: 4,
      sourceType: 'original',
      highlightTextIndices: {
        correct: [0, 80], // The impact of... practitioners.
        distractor: [111, 281]
      }
    }
  ]
};

export const SPEAKING_SAMPLE: SpeakingSession = {
  originalText: "I went to the library yesterday, h [hesitation] I wanted to borrow some books. The weather was really bad, u [filler] m [filler] it was raining heavily. I didn't bring my umbrella, u [filler] I got totally wet. I finally reached u [filler] ...",
  improvedText: "Yesterday, I headed to the library because [connector] I needed to borrow some books. However [connector], the weather turned out to be terrible with heavy rain. Since [connector] I hadn't brought my umbrella, therefore [connector] I got completely soaked. When I finally arrived, I was disappointed to find...",
  originalFillers: [
    { word: 'Hesitation (h)', count: 3 },
    { word: 'Filler "um"', count: 2 },
    { word: 'Filler "uh"', count: 3 }
  ],
  originalFillerCount: 8,
  improvedFillerCount: 4,
  originalAudioDuration: 21,
  improvedAudioDuration: 18,
  comparisonAnalysis: {
    fluency: "停顿次数从 8 次降至 4 次，无意义的语气助词明显减少，语音整体输出流速和节奏感显著提升。建议多练习短语意群的停顿，而非单个单词的滞缓。",
    logic: "原发言缺少连接词，句式完全是简单并列。改进版本中成功引入了 logical connectors 如 because, however, since, therefore，使动作的因果、转折和时间承接极为自然，在CET-4口语中是典型高分点。",
    vocabulary: "用表达更地道的 'headed to' 代替了 'went to'；用表示状态严重的 'completely soaked' 代替了普通的 'got totally wet'，词汇的多样、准确以及地道性有了跃升。"
  },
  scoreChange: {
    from: 57,
    to: 61
  }
};

export const DEFAULT_REVIEW_ITEMS: ReviewItem[] = [
  {
    id: 'rev-1',
    title: '高频核心词汇 (List 4)',
    category: '词汇',
    detail: '包括 adapt, exacerbate, mentorship, educational inequality 等15个考纲必背词汇及同义代换词组。',
    daysAgo: 1
  },
  {
    id: 'rev-2',
    title: '长难句解析 (定语从句)',
    category: '句式',
    detail: '...skills traditionally nurtured through complex human interaction 中传统双重后置定语的长难句拆分与主干成分精析。',
    daysAgo: 2
  },
  {
    id: 'rev-3',
    title: '错题集: 仔细阅读',
    category: '错题',
    detail: '阅读理解中关于作者隐含主旨句定位以及近义词组转换理解的易错题目整理。',
    daysAgo: 3
  },
  {
    id: 'rev-4',
    title: '段落翻译: 传统文化核心词',
    category: '词汇',
    detail: '关于端午节、造纸术等 CET-4 高频传统和科技历史领域中英对应词。',
    daysAgo: 5
  }
];

export const ABILITY_SCORES: AbilityScore[] = [
  { name: '阅读·同义替换', category: 'reading', score: 52, change: 6 },
  { name: '阅读·定位', category: 'reading', score: 68, change: 0 },
  { name: '听力·转折识别', category: 'listening', score: 54, change: 0 },
  { name: '口语·连接表达', category: 'speaking', score: 61, change: 4 }
];

export const SKILL_GAPS: SkillGap[] = [
  {
    id: 'gap-1',
    title: '长难句结构拆解',
    impactColor: 'red',
    description: '导致阅读 Part C 丢分显著超过均值，难以理清三层以上修饰语。',
    actionWord: '开始针对训练'
  },
  {
    id: 'gap-2',
    title: '连读与弱读识别',
    impactColor: 'orange',
    description: '听力短对话关键信息遗漏率达 40%，对元子音结合音变不敏感。',
    actionWord: '开始针对训练'
  },
  {
    id: 'gap-3',
    title: '高阶词汇输出匮乏',
    impactColor: 'blue',
    description: '写作多使用基础词汇，缺乏多样性，同义词意识不足。',
    actionWord: '开始针对训练'
  }
];

export const TIMELINE_LOGS: TimelineLog[] = [
  {
    id: 'log-1',
    time: '今天 10:30',
    title: '同义替换正确率提升',
    description: '连续 3 组专项训练全对，系统确认‘同义替换理解’能力稳固。'
  },
  {
    id: 'log-2',
    time: '昨天 15:45',
    title: '攻克 “听力数字陷阱”',
    description: '完成针对性漏洞补全，听力模块中的计算项及年份项错题集已清空。'
  },
  {
    id: 'log-3',
    time: '3天前',
    title: '完成首轮真题模考',
    description: '建立初始能力基线：总分预估 480。继续针对弱点突破高分线。'
  }
];
