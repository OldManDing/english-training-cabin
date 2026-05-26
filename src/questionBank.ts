import { INITIAL_PASSAGE, CET4_VOCABULARY_BANK } from './data';
import { Passage, Question } from './types';

type Choice = 'A' | 'B' | 'C' | 'D';

export interface QuestionBankCoverageItem {
  moduleId: string;
  questionTypeId: string;
  name: string;
  officialCount: string;
  builtInCount: number;
  durationMinutes: number;
  trainingRoute: string;
}

export interface Cet4MockChoiceQuestion {
  id: string;
  moduleId: 'listening' | 'reading';
  questionTypeId:
    | 'short-news'
    | 'long-conversation'
    | 'listening-passage'
    | 'word-bank'
    | 'long-matching'
    | 'careful-reading';
  skillArea: 'listening' | 'reading';
  title: string;
  prompt: string;
  options: Record<Choice, string>;
  correctAnswer: Choice;
  explanation: string;
  correctSentence: string;
  trapType?: string;
}

export interface Cet4MockExamPaper {
  id: string;
  title: string;
  sourceNotice: string;
  plannedMinutes: number;
  writing: {
    prompt: string;
    minWords: number;
    keywords: string[];
    sampleAnswer: string;
  };
  listening: {
    transcript: string;
    questions: Cet4MockChoiceQuestion[];
  };
  reading: {
    passage: string;
    questions: Cet4MockChoiceQuestion[];
  };
  translation: {
    prompt: string;
    keywords: string[];
    sampleAnswer: string;
  };
}

function makeQuestion(params: Omit<Question, 'options'> & { options: Record<Choice, string> }): Question {
  return params;
}

const GREEN_TECH_PASSAGE: Passage = {
  id: 'cet-green-tech',
  examId: 'cet4',
  moduleId: 'reading',
  title: 'Green Technology and Environmental Protection',
  content: `The development of green technology is changing how cities produce and use energy. Supporters say that solar panels, wind turbines, and smart power grids can reduce dependence on fossil fuels while creating new jobs in local communities. These technologies are especially useful for remote towns that cannot easily connect to large traditional power plants.

However, critics point out that green technology is not automatically clean at every stage. The production of batteries and electronic parts may create waste if companies do not follow strict recycling rules. Some experts also worry that a sudden demand for rare materials could create new environmental pressure in mining areas.

Therefore, the real value of green technology depends on careful planning. Governments need to set standards for recycling, encourage transparent supply chains, and help smaller communities share the benefits. If these conditions are met, green technology can support sustainable development rather than simply moving pollution from one place to another.`,
  questions: [
    makeQuestion({
      id: 'green-1',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What benefit of green technology is mentioned in the first paragraph?',
      options: {
        A: 'It removes the need for all power plants.',
        B: 'It can reduce fossil-fuel dependence and create local jobs.',
        C: 'It makes rare materials unnecessary.',
        D: 'It prevents every form of electronic waste.',
      },
      correctAnswer: 'B',
      explanation: '第一段说明绿色技术可以 reduce dependence on fossil fuels，并在社区创造新工作。',
      type: '细节理解',
      tags: ['环境', '细节定位'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'Supporters say that solar panels, wind turbines, and smart power grids can reduce dependence on fossil fuels while creating new jobs in local communities.',
      distractorSentence: 'However, critics point out that green technology is not automatically clean at every stage.',
    }),
    makeQuestion({
      id: 'green-2',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What concern do critics raise about batteries and electronic parts?',
      options: {
        A: 'Their production may create waste without strict recycling rules.',
        B: 'They are too simple to support modern cities.',
        C: 'They always reduce mining pressure.',
        D: 'They cannot be used in remote towns.',
      },
      correctAnswer: 'A',
      explanation: '第二段指出 battery and electronic parts 的生产若缺少回收规则，可能制造废弃物。',
      type: '细节理解',
      tags: ['转折', '因果'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'The production of batteries and electronic parts may create waste if companies do not follow strict recycling rules.',
    }),
    makeQuestion({
      id: 'green-3',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'Which condition is necessary for green technology to support sustainable development?',
      options: {
        A: 'Replacing public standards with company promises.',
        B: 'Moving all factories to remote towns.',
        C: 'Careful planning, recycling standards, and transparent supply chains.',
        D: 'Stopping the use of smart power grids.',
      },
      correctAnswer: 'C',
      explanation: '最后一段列出 planning、recycling standards、transparent supply chains 等条件。',
      type: '主旨归纳',
      tags: ['总结句', '同义替换'],
      difficulty: 4,
      sourceType: 'original',
      correctSentence: 'Governments need to set standards for recycling, encourage transparent supply chains, and help smaller communities share the benefits.',
    }),
  ],
};

const COMMUNITY_LIBRARY_PASSAGE: Passage = {
  id: 'cet-community-library',
  examId: 'cet4',
  moduleId: 'reading',
  title: 'Community Libraries as Learning Hubs',
  content: `Community libraries are no longer only quiet places for borrowing books. Many now provide digital courses, career workshops, and small meeting rooms, so residents can keep learning even when they cannot attend a formal school. In some towns, libraries also lend tablets or provide free internet access for people who do not have stable connections at home.

This change has made libraries more important in lifelong learning. Older adults can learn how to use online services, job seekers can prepare resumes, and students can find a safe place to study after class. The most successful programs are not those with the newest equipment, but those that understand the practical needs of local residents.

Still, libraries face challenges. Staff members need training, budgets are limited, and some residents do not know that these services exist. To make library programs effective, local governments should support staff development and communicate services clearly to the community.`,
  questions: [
    makeQuestion({
      id: 'library-1',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What new role of community libraries is described in the passage?',
      options: {
        A: 'They have become flexible learning hubs for residents.',
        B: 'They mainly protect old books from damage.',
        C: 'They replace all formal schools.',
        D: 'They only serve students after class.',
      },
      correctAnswer: 'A',
      explanation: 'digital courses、career workshops、meeting rooms 对应 flexible learning hubs。',
      type: '同义替换',
      tags: ['教育', '主旨'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'Many now provide digital courses, career workshops, and small meeting rooms, so residents can keep learning even when they cannot attend a formal school.',
    }),
    makeQuestion({
      id: 'library-2',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'According to the passage, what makes a library program successful?',
      options: {
        A: 'Having the newest equipment in every room.',
        B: 'Understanding the practical needs of local residents.',
        C: 'Removing all quiet reading spaces.',
        D: 'Serving only job seekers.',
      },
      correctAnswer: 'B',
      explanation: '第二段末句指出最成功的项目理解当地居民的实际需要。',
      type: '细节定位',
      tags: ['定位', '转折'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'The most successful programs are not those with the newest equipment, but those that understand the practical needs of local residents.',
    }),
    makeQuestion({
      id: 'library-3',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What challenge is mentioned in the last paragraph?',
      options: {
        A: 'Residents are not allowed to borrow tablets.',
        B: 'Libraries have too many trained staff members.',
        C: 'Budgets are limited and services may not be well known.',
        D: 'Local governments no longer support education.',
      },
      correctAnswer: 'C',
      explanation: '最后一段提到 staff training、limited budgets 和 residents do not know services exist。',
      type: '细节理解',
      tags: ['并列信息', '挑战'],
      difficulty: 2,
      sourceType: 'original',
      correctSentence: 'Staff members need training, budgets are limited, and some residents do not know that these services exist.',
    }),
  ],
};

const SLEEP_LEARNING_PASSAGE: Passage = {
  id: 'cet-sleep-learning',
  examId: 'cet4',
  moduleId: 'reading',
  title: 'Sleep and Learning Efficiency',
  content: `Many students believe that staying up late is the fastest way to prepare for an exam. Yet research on memory suggests the opposite. Sleep helps the brain organize new information, connect it with older knowledge, and remove details that are not useful. Without enough sleep, students may spend more hours at a desk but remember less the next day.

Short review sessions before sleep can be helpful because they give the brain clear material to process. This does not mean students should read notes passively for hours. A better method is to close the book, recall the key idea, and then check what was missed. This active recall makes later review more efficient.

The lesson is simple: effective learning depends not only on effort but also on recovery. A student who studies with a plan, tests memory actively, and sleeps regularly is more likely to keep knowledge than one who only increases study hours.`,
  questions: [
    makeQuestion({
      id: 'sleep-1',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What does sleep help the brain do?',
      options: {
        A: 'Forget all old knowledge.',
        B: 'Organize new information and connect it with older knowledge.',
        C: 'Avoid every exam mistake.',
        D: 'Study passively for longer hours.',
      },
      correctAnswer: 'B',
      explanation: '第一段指出 sleep helps the brain organize new information and connect it with older knowledge。',
      type: '细节理解',
      tags: ['学习方法', '细节定位'],
      difficulty: 2,
      sourceType: 'original',
      correctSentence: 'Sleep helps the brain organize new information, connect it with older knowledge, and remove details that are not useful.',
    }),
    makeQuestion({
      id: 'sleep-2',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'Which method is recommended before sleep?',
      options: {
        A: 'Reading notes passively for hours.',
        B: 'Closing the book, recalling key ideas, and checking missed points.',
        C: 'Only copying example answers.',
        D: 'Increasing study hours without breaks.',
      },
      correctAnswer: 'B',
      explanation: '第二段明确推荐 close the book, recall the key idea, and then check what was missed。',
      type: '细节定位',
      tags: ['主动回忆', '学习策略'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'A better method is to close the book, recall the key idea, and then check what was missed.',
    }),
    makeQuestion({
      id: 'sleep-3',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What is the main idea of the passage?',
      options: {
        A: 'Effective learning requires effort, active recall, and regular recovery.',
        B: 'Students should stop reviewing before exams.',
        C: 'Late-night study is always the best exam strategy.',
        D: 'Sleep is useful only for young children.',
      },
      correctAnswer: 'A',
      explanation: '全文强调学习效率不只靠时长，还取决于计划、主动回忆和睡眠恢复。',
      type: '主旨大意',
      tags: ['主旨', '学习效率'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'The lesson is simple: effective learning depends not only on effort but also on recovery.',
    }),
  ],
};

export const CET4_READING_BANK: Passage[] = [
  INITIAL_PASSAGE,
  GREEN_TECH_PASSAGE,
  COMMUNITY_LIBRARY_PASSAGE,
  SLEEP_LEARNING_PASSAGE,
];

function makeMockChoiceQuestion(params: {
  id: string;
  moduleId: 'listening' | 'reading';
  questionTypeId: Cet4MockChoiceQuestion['questionTypeId'];
  title: string;
  prompt: string;
  correctAnswer: Choice;
  correctOption: string;
  correctSentence: string;
  explanation: string;
  trapType: string;
  wrongOptions?: Partial<Record<Choice, string>>;
}): Cet4MockChoiceQuestion {
  const options: Record<Choice, string> = {
    A: params.wrongOptions?.A ?? `A detail not supported by the ${params.moduleId} material.`,
    B: params.wrongOptions?.B ?? `A common trap that changes the original meaning.`,
    C: params.wrongOptions?.C ?? `An unrelated or exaggerated statement.`,
    D: params.wrongOptions?.D ?? `The opposite of the source information.`,
  };
  options[params.correctAnswer] = params.correctOption;

  return {
    id: params.id,
    moduleId: params.moduleId,
    questionTypeId: params.questionTypeId,
    skillArea: params.moduleId,
    title: params.title,
    prompt: params.prompt,
    options,
    correctAnswer: params.correctAnswer,
    explanation: params.explanation,
    correctSentence: params.correctSentence,
    trapType: params.trapType,
  };
}

const LISTENING_NEWS_ITEMS = [
  {
    id: 'campus-learning-center',
    prompt: 'What service does the new campus learning center provide?',
    correctAnswer: 'B' as const,
    correctOption: 'Flexible study rooms and short digital courses.',
    correctSentence: 'A city university has opened a learning center that combines quiet study rooms with short digital courses for students with flexible schedules.',
    trapType: '关键信息漏听',
  },
  {
    id: 'bike-repair-program',
    prompt: 'Why did the city start the bicycle repair program?',
    correctAnswer: 'A' as const,
    correctOption: 'To help students travel safely and reduce waste.',
    correctSentence: 'The program helps students repair old bicycles so they can travel safely while reducing waste.',
    trapType: '因果定位失败',
  },
  {
    id: 'library-hours',
    prompt: 'What change will the public library make during exam week?',
    correctAnswer: 'C' as const,
    correctOption: 'It will keep several rooms open later at night.',
    correctSentence: 'During exam week, the library will keep several study rooms open until eleven at night.',
    trapType: '数字时间混淆',
  },
  {
    id: 'cafeteria-food-waste',
    prompt: 'What result did the food-waste project report?',
    correctAnswer: 'D' as const,
    correctOption: 'Students wasted less food after portion choices were added.',
    correctSentence: 'After the cafeteria introduced smaller portion choices, students wasted less food.',
    trapType: '细节偷换',
  },
  {
    id: 'online-safety-workshop',
    prompt: 'Who is the online safety workshop mainly designed for?',
    correctAnswer: 'A' as const,
    correctOption: 'First-year students who often use shared devices.',
    correctSentence: 'The online safety workshop is designed for first-year students who often use shared computers and public networks.',
    trapType: '关键词漏听',
  },
  {
    id: 'weather-volunteer-delay',
    prompt: 'Why was the volunteer activity delayed?',
    correctAnswer: 'C' as const,
    correctOption: 'Heavy rain made outdoor work unsafe.',
    correctSentence: 'Heavy rain made the outdoor cleanup unsafe, so the volunteer activity was delayed.',
    trapType: '转折信息漏听',
  },
  {
    id: 'museum-student-card',
    prompt: 'What benefit can students get at the city museum?',
    correctAnswer: 'B' as const,
    correctOption: 'They can enter for free on Friday afternoons.',
    correctSentence: 'Students with a valid card can enter the city museum for free on Friday afternoons.',
    trapType: '数字时间混淆',
  },
];

const LISTENING_CONVERSATION_ITEMS = [
  {
    id: 'conversation-timed-reading-1',
    prompt: 'Why does the tutor recommend timed reading?',
    correctAnswer: 'A' as const,
    correctOption: 'It helps the student locate information under exam pressure.',
    correctSentence: 'The tutor recommends timed reading because the student needs to locate information under exam pressure.',
    trapType: '因果定位失败',
  },
  {
    id: 'conversation-timed-reading-2',
    prompt: 'What mistake did the student make before the quiz?',
    correctAnswer: 'D' as const,
    correctOption: 'She only reviewed vocabulary lists instead of practicing passages.',
    correctSentence: 'The student admits that she only reviewed vocabulary lists and did not practice complete passages.',
    trapType: '细节偷换',
  },
  {
    id: 'conversation-speaking-club-1',
    prompt: 'What is the woman worried about before joining the speaking club?',
    correctAnswer: 'B' as const,
    correctOption: 'She may pause too often when explaining ideas.',
    correctSentence: 'The woman worries that she pauses too often when she tries to explain an idea in English.',
    trapType: '低信心',
  },
  {
    id: 'conversation-speaking-club-2',
    prompt: 'What does the man suggest she do first?',
    correctAnswer: 'C' as const,
    correctOption: 'Practice one-minute answers with a clear example.',
    correctSentence: 'The man suggests practicing one-minute answers that include a clear example.',
    trapType: '关键词漏听',
  },
  {
    id: 'conversation-project-meeting-1',
    prompt: 'What problem does the group project face?',
    correctAnswer: 'A' as const,
    correctOption: 'The survey data is not organized clearly.',
    correctSentence: 'The group has collected survey data, but the results are not organized clearly.',
    trapType: '细节偷换',
  },
  {
    id: 'conversation-project-meeting-2',
    prompt: 'When will the students meet again?',
    correctAnswer: 'D' as const,
    correctOption: 'On Thursday after the writing class.',
    correctSentence: 'They agree to meet again on Thursday after the writing class.',
    trapType: '数字时间混淆',
  },
  {
    id: 'conversation-campus-job-1',
    prompt: 'Why does the student want a campus job?',
    correctAnswer: 'B' as const,
    correctOption: 'She wants work experience without leaving campus.',
    correctSentence: 'She wants to gain work experience without spending extra time traveling outside campus.',
    trapType: '因果定位失败',
  },
  {
    id: 'conversation-campus-job-2',
    prompt: 'What does the advisor ask the student to prepare?',
    correctAnswer: 'C' as const,
    correctOption: 'A short resume and a weekly timetable.',
    correctSentence: 'The advisor asks her to prepare a short resume and a weekly timetable.',
    trapType: '关键词漏听',
  },
];

const LISTENING_PASSAGE_ITEMS = [
  {
    id: 'passage-spaced-review-1',
    prompt: 'What did the memory study find?',
    correctAnswer: 'B' as const,
    correctOption: 'Reviewing mistakes after intervals improved later recall.',
    correctSentence: 'Learners who reviewed mistakes after one day and again after several days remembered more later.',
    trapType: '数字时间混淆',
  },
  {
    id: 'passage-spaced-review-2',
    prompt: 'What should learners avoid according to the passage?',
    correctAnswer: 'D' as const,
    correctOption: 'Repeating the same page passively without testing memory.',
    correctSentence: 'The passage warns against repeating the same page passively without testing memory.',
    trapType: '盲猜',
  },
  {
    id: 'passage-green-dorm-1',
    prompt: 'What change helped the dormitory save energy?',
    correctAnswer: 'A' as const,
    correctOption: 'Students received weekly reports about electricity use.',
    correctSentence: 'The dormitory saved energy after students received weekly reports about electricity use.',
    trapType: '关键信息漏听',
  },
  {
    id: 'passage-green-dorm-2',
    prompt: 'Why were the reports effective?',
    correctAnswer: 'C' as const,
    correctOption: 'They made invisible habits visible to students.',
    correctSentence: 'The reports were effective because they made invisible habits visible to students.',
    trapType: '因果定位失败',
  },
  {
    id: 'passage-part-time-learning-1',
    prompt: 'What challenge do part-time learners often face?',
    correctAnswer: 'B' as const,
    correctOption: 'They have limited time and irregular schedules.',
    correctSentence: 'Part-time learners often have limited time and irregular schedules.',
    trapType: '细节偷换',
  },
  {
    id: 'passage-part-time-learning-2',
    prompt: 'What kind of plan is recommended for part-time learners?',
    correctAnswer: 'A' as const,
    correctOption: 'A plan with short tasks and automatic review.',
    correctSentence: 'A plan with short tasks and automatic review can help part-time learners keep moving.',
    trapType: '关键词漏听',
  },
  {
    id: 'passage-city-gardens-1',
    prompt: 'What is one social value of city gardens?',
    correctAnswer: 'D' as const,
    correctOption: 'They create places where neighbors can communicate.',
    correctSentence: 'City gardens create places where neighbors can communicate while growing food together.',
    trapType: '细节偷换',
  },
  {
    id: 'passage-city-gardens-2',
    prompt: 'What problem do city gardens still need to solve?',
    correctAnswer: 'C' as const,
    correctOption: 'They require steady management and fair access.',
    correctSentence: 'City gardens still require steady management and fair access if they are to last.',
    trapType: '转折信息漏听',
  },
  {
    id: 'passage-ai-feedback-1',
    prompt: 'What makes AI feedback useful in learning?',
    correctAnswer: 'B' as const,
    correctOption: 'It points out specific gaps and the next action.',
    correctSentence: 'AI feedback is useful when it points out a specific gap and the next action.',
    trapType: '关键词漏听',
  },
  {
    id: 'passage-ai-feedback-2',
    prompt: 'What risk does the speaker mention about AI feedback?',
    correctAnswer: 'A' as const,
    correctOption: 'Students may copy suggestions without thinking.',
    correctSentence: 'The risk is that students may copy suggestions without thinking through their own answer.',
    trapType: '转折信息漏听',
  },
];

const CET4_STANDARD_LISTENING_QUESTIONS: Cet4MockChoiceQuestion[] = [
  ...LISTENING_NEWS_ITEMS.map((item, index) => makeMockChoiceQuestion({
    ...item,
    moduleId: 'listening',
    questionTypeId: 'short-news',
    title: `短篇新闻 ${index + 1}`,
    explanation: `短篇新闻定位句：${item.correctSentence}`,
  })),
  ...LISTENING_CONVERSATION_ITEMS.map((item, index) => makeMockChoiceQuestion({
    ...item,
    moduleId: 'listening',
    questionTypeId: 'long-conversation',
    title: `长对话 ${Math.floor(index / 2) + 1}`,
    explanation: `长对话定位句：${item.correctSentence}`,
  })),
  ...LISTENING_PASSAGE_ITEMS.map((item, index) => makeMockChoiceQuestion({
    ...item,
    moduleId: 'listening',
    questionTypeId: 'listening-passage',
    title: `听力篇章 ${Math.floor(index / 2) + 1}`,
    explanation: `听力篇章定位句：${item.correctSentence}`,
  })),
];

const CET4_STANDARD_LISTENING_TRANSCRIPT = [
  'News reports: A campus learning center now offers flexible study rooms and short digital courses. A bicycle repair program helps students travel safely while reducing waste. The public library will keep several study rooms open until eleven during exam week. Smaller cafeteria portions have reduced food waste. First-year students are invited to an online safety workshop. Heavy rain delayed an outdoor volunteer cleanup. Students can enter the city museum for free on Friday afternoons.',
  'Long conversations: In the first conversation, a tutor explains that timed reading helps locate information under exam pressure because vocabulary lists alone are not enough. In the second conversation, a student worries about pauses in speaking, and her friend suggests one-minute answers with examples. In the third conversation, a project team needs to organize survey data and agrees to meet Thursday after writing class. In the fourth conversation, an advisor asks a student who wants a campus job to prepare a short resume and a weekly timetable.',
  'Passages: A memory study shows that reviewing mistakes after one day and again after several days improves recall, while passive rereading is less effective. A green dormitory saves energy after weekly reports make invisible habits visible. Part-time learners need short tasks and automatic review because their time is limited. City gardens help neighbors communicate but require steady management and fair access. AI feedback is useful when it points out specific gaps and next actions, but students should not copy suggestions without thinking.',
].join('\n\n');

const CET4_STANDARD_READING_PASSAGE = `A. Students often try to improve English by memorizing long lists of words. Vocabulary matters, but words become useful only when learners meet them in sentences, retrieve them from memory, and use them in new contexts.

B. A practical learning system should combine word recognition with sentence-level practice. It should also help learners notice why an answer is wrong, because a wrong answer may come from a synonym trap rather than from not knowing the word.

C. Timed reading is another important part of exam preparation. Under time pressure, learners must locate key sentences quickly, compare options, and avoid changing the original meaning.

D. Listening practice needs more than replaying audio. Learners should predict the topic, catch numbers and time expressions, and write down the reason why one option is correct.

E. Writing and translation require production. A learner who can recognize a phrase may still fail to use it naturally, so short output tasks should be followed by feedback and rewriting.

F. Review should be scheduled automatically. If a mistake is reviewed after one day, again after several days, and later in a new context, the learner is more likely to transfer the knowledge.

G. Feedback is useful only when it is specific. Telling a learner that the answer is wrong is not enough; the system should identify the gap and give the next task.

H. Digital tools can support independent learners, but they should not encourage passive copying. The learner must still explain, recall, and produce language.

I. A complete exam plan balances accuracy, speed, and recovery. Studying longer is not always better if the learner never checks memory or sleeps enough.

J. The goal of a training platform is not to replace effort. It should make effort better directed by connecting practice, mistakes, review, and ability evidence.`;

const READING_WORD_BANK_ITEMS = [
  ['combine', 'A practical learning system should ______ word recognition with sentence-level practice.', 'B. A practical learning system should combine word recognition with sentence-level practice.', '搭配错误'],
  ['retrieve', 'Words become useful when learners ______ them from memory.', 'A. Vocabulary matters, but words become useful only when learners meet them in sentences, retrieve them from memory, and use them in new contexts.', '搭配错误'],
  ['specific', 'Feedback is useful only when it is ______ enough to guide the next task.', 'G. Feedback is useful only when it is specific.', '关键词漏听'],
  ['passive', 'Digital tools should not encourage ______ copying.', 'H. Digital tools can support independent learners, but they should not encourage passive copying.', '同义替换未识别'],
  ['scheduled', 'Review should be ______ automatically.', 'F. Review should be scheduled automatically.', '搭配错误'],
  ['locate', 'Timed reading requires learners to ______ key sentences quickly.', 'C. Under time pressure, learners must locate key sentences quickly.', '定位失准'],
  ['predict', 'Before listening, learners should ______ the topic.', 'D. Learners should predict the topic, catch numbers and time expressions.', '关键词漏听'],
  ['production', 'Writing and translation require language ______.', 'E. Writing and translation require production.', '表达不自然'],
  ['transfer', 'Spaced review helps learners ______ knowledge to a new context.', 'F. The learner is more likely to transfer the knowledge.', '同义替换未识别'],
  ['balances', 'A complete exam plan ______ accuracy, speed, and recovery.', 'I. A complete exam plan balances accuracy, speed, and recovery.', '搭配错误'],
] as const;

const READING_LONG_MATCHING_ITEMS = [
  ['A', 'Which paragraph says vocabulary becomes useful only when used in context?', 'A. Students often try to improve English by memorizing long lists of words.'],
  ['B', 'Which paragraph explains that wrong answers may come from synonym traps?', 'B. A practical learning system should combine word recognition with sentence-level practice.'],
  ['C', 'Which paragraph focuses on locating key sentences under time pressure?', 'C. Timed reading is another important part of exam preparation.'],
  ['D', 'Which paragraph gives concrete listening actions before and after audio?', 'D. Listening practice needs more than replaying audio.'],
  ['E', 'Which paragraph says recognition is not enough for writing and translation?', 'E. Writing and translation require production.'],
  ['F', 'Which paragraph describes reviewing the same mistake at increasing intervals?', 'F. Review should be scheduled automatically.'],
  ['G', 'Which paragraph defines useful feedback as gap plus next task?', 'G. Feedback is useful only when it is specific.'],
  ['H', 'Which paragraph warns learners not to copy digital suggestions passively?', 'H. Digital tools can support independent learners.'],
  ['I', 'Which paragraph connects exam preparation with recovery and sleep?', 'I. A complete exam plan balances accuracy, speed, and recovery.'],
  ['J', 'Which paragraph summarizes the platform goal as directed effort?', 'J. The goal of a training platform is not to replace effort.'],
] as const;

const READING_CAREFUL_ITEMS = [
  ['A', 'According to the passage, when do words become useful?', 'When learners meet them in sentences, retrieve them, and use them in new contexts.', 'A. Vocabulary matters, but words become useful only when learners meet them in sentences, retrieve them from memory, and use them in new contexts.', '细节偷换'],
  ['B', 'What may cause a learner to choose a wrong answer even after knowing the word?', 'A synonym trap rather than simple lack of vocabulary.', 'B. A wrong answer may come from a synonym trap rather than from not knowing the word.', '同义替换未识别'],
  ['C', 'What must learners avoid when comparing options in timed reading?', 'Changing the original meaning.', 'C. Learners must locate key sentences quickly, compare options, and avoid changing the original meaning.', '细节偷换'],
  ['D', 'What should learners write down after listening?', 'The reason why one option is correct.', 'D. Learners should predict the topic, catch numbers and time expressions, and write down the reason why one option is correct.', '关键词漏听'],
  ['E', 'Why are short output tasks needed for writing and translation?', 'Because recognizing a phrase does not mean using it naturally.', 'E. A learner who can recognize a phrase may still fail to use it naturally.', '表达不自然'],
  ['F', 'What is the benefit of spaced review in new contexts?', 'It helps learners transfer knowledge.', 'F. The learner is more likely to transfer the knowledge.', '因果定位失败'],
  ['G', 'What is insufficient feedback according to the passage?', 'Only telling the learner that the answer is wrong.', 'G. Telling a learner that the answer is wrong is not enough.', '细节偷换'],
  ['H', 'What should learners still do when using digital tools?', 'Explain, recall, and produce language themselves.', 'H. The learner must still explain, recall, and produce language.', '主旨定位失败'],
  ['I', 'Why is studying longer not always better?', 'Because learners may fail to check memory or recover enough.', 'I. Studying longer is not always better if the learner never checks memory or sleeps enough.', '因果定位失败'],
  ['J', 'What should a training platform connect?', 'Practice, mistakes, review, and ability evidence.', 'J. It should make effort better directed by connecting practice, mistakes, review, and ability evidence.', '主旨定位失败'],
] as const;

const CET4_STANDARD_READING_QUESTIONS: Cet4MockChoiceQuestion[] = [
  ...READING_WORD_BANK_ITEMS.map(([word, prompt, sentence, trapType], index) => makeMockChoiceQuestion({
    id: `mock-reading-word-bank-${index + 1}`,
    moduleId: 'reading',
    questionTypeId: 'word-bank',
    title: `选词填空 ${index + 1}`,
    prompt,
    correctAnswer: (['A', 'B', 'C', 'D'] as Choice[])[index % 4],
    correctOption: word,
    correctSentence: sentence,
    explanation: `选词填空考查词义、搭配和上下文。定位句：${sentence}`,
    trapType,
  })),
  ...READING_LONG_MATCHING_ITEMS.map(([paragraph, prompt, sentence], index) => makeMockChoiceQuestion({
    id: `mock-reading-long-matching-${index + 1}`,
    moduleId: 'reading',
    questionTypeId: 'long-matching',
    title: `长篇匹配 ${index + 1}`,
    prompt,
    correctAnswer: (['B', 'C', 'D', 'A'] as Choice[])[index % 4],
    correctOption: `Paragraph ${paragraph}`,
    correctSentence: sentence,
    explanation: `长篇匹配需要先看关键词，再回到段落定位。定位段落：${sentence}`,
    trapType: '定位失准',
  })),
  ...READING_CAREFUL_ITEMS.map(([paragraph, prompt, correctOption, sentence, trapType], index) => makeMockChoiceQuestion({
    id: `mock-reading-careful-${index + 1}`,
    moduleId: 'reading',
    questionTypeId: 'careful-reading',
    title: `仔细阅读 ${index + 1}`,
    prompt,
    correctAnswer: (['C', 'D', 'A', 'B'] as Choice[])[index % 4],
    correctOption,
    correctSentence: sentence,
    explanation: `仔细阅读需要用原文定位并排除偷换信息。定位段落 ${paragraph}：${sentence}`,
    trapType,
  })),
];

export const CET4_MOCK_EXAM: Cet4MockExamPaper = {
  id: 'cet4-standard-mock-001',
  title: 'CET-4 标准结构模拟卷 A',
  sourceNotice: '内置原创模拟题，不是官方真题；按 CET-4 笔试结构覆盖写作 1 题、听力 25 题、阅读 30 题、翻译 1 题，用于形成评分和复习闭环。',
  plannedMinutes: 125,
  writing: {
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on the value of consistent practice in English learning. You should include a clear opinion, reasons, and examples.',
    minWords: 120,
    keywords: ['practice', 'consistent', 'feedback', 'example', 'improve'],
    sampleAnswer:
      'Consistent practice is valuable in English learning because it turns knowledge into real ability. If students only read explanations, they may feel familiar with words but fail to use them in an exam. For example, writing one short paragraph every day and checking the mistakes can help learners notice grammar problems and improve expression gradually.',
  },
  listening: {
    transcript: CET4_STANDARD_LISTENING_TRANSCRIPT,
    questions: CET4_STANDARD_LISTENING_QUESTIONS,
  },
  reading: {
    passage: CET4_STANDARD_READING_PASSAGE,
    questions: CET4_STANDARD_READING_QUESTIONS,
  },
  translation: {
    prompt: '请将下面这段中文翻译成英文：越来越多的大学生开始使用数字工具学习英语。有效的工具不应该只给出答案，而应该帮助学生发现错误、主动回忆知识，并在合适的时间复习。',
    keywords: ['college students', 'digital tools', 'answers', 'mistakes', 'active recall', 'review'],
    sampleAnswer:
      'More and more college students are beginning to use digital tools to learn English. An effective tool should not only provide answers, but also help students find mistakes, actively recall knowledge, and review it at the right time.',
  },
};

export const CET4_QUESTION_BANK_COVERAGE: QuestionBankCoverageItem[] = [
  {
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    name: '写作短文',
    officialCount: '1 题',
    builtInCount: 2,
    durationMinutes: 30,
    trainingRoute: '专项写作 + 阶段模考',
  },
  {
    moduleId: 'listening',
    questionTypeId: 'short-news',
    name: '听力短篇新闻',
    officialCount: '7 题',
    builtInCount: CET4_STANDARD_LISTENING_QUESTIONS.filter((question) => question.questionTypeId === 'short-news').length,
    durationMinutes: 7,
    trainingRoute: '阶段模考 + 听力精听',
  },
  {
    moduleId: 'listening',
    questionTypeId: 'long-conversation',
    name: '听力长对话',
    officialCount: '8 题',
    builtInCount: CET4_STANDARD_LISTENING_QUESTIONS.filter((question) => question.questionTypeId === 'long-conversation').length,
    durationMinutes: 8,
    trainingRoute: '专项听力 + 阶段模考',
  },
  {
    moduleId: 'listening',
    questionTypeId: 'listening-passage',
    name: '听力篇章',
    officialCount: '10 题',
    builtInCount: CET4_STANDARD_LISTENING_QUESTIONS.filter((question) => question.questionTypeId === 'listening-passage').length,
    durationMinutes: 10,
    trainingRoute: '阶段模考',
  },
  {
    moduleId: 'reading',
    questionTypeId: 'word-bank',
    name: '选词填空',
    officialCount: '10 空',
    builtInCount: CET4_STANDARD_READING_QUESTIONS.filter((question) => question.questionTypeId === 'word-bank').length,
    durationMinutes: 10,
    trainingRoute: '阶段模考 + 词汇语块',
  },
  {
    moduleId: 'reading',
    questionTypeId: 'long-matching',
    name: '长篇匹配',
    officialCount: '10 题',
    builtInCount: CET4_STANDARD_READING_QUESTIONS.filter((question) => question.questionTypeId === 'long-matching').length,
    durationMinutes: 15,
    trainingRoute: '阶段模考',
  },
  {
    moduleId: 'reading',
    questionTypeId: 'careful-reading',
    name: '仔细阅读',
    officialCount: '10 题',
    builtInCount: CET4_READING_BANK.reduce((sum, passage) => sum + passage.questions.length, 0)
      + CET4_STANDARD_READING_QUESTIONS.filter((question) => question.questionTypeId === 'careful-reading').length,
    durationMinutes: 15,
    trainingRoute: '专项阅读 + 阶段模考',
  },
  {
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    name: '段落翻译',
    officialCount: '1 题',
    builtInCount: 2,
    durationMinutes: 30,
    trainingRoute: '专项翻译 + 阶段模考',
  },
  {
    moduleId: 'vocabulary',
    questionTypeId: 'cet4-core-vocabulary',
    name: '核心词汇与语块',
    officialCount: '支撑全题型',
    builtInCount: CET4_VOCABULARY_BANK.length,
    durationMinutes: 12,
    trainingRoute: '单词语音练习 + 复习队列',
  },
  {
    moduleId: 'speaking',
    questionTypeId: 'cet-set4-retell',
    name: '口语复述与表达',
    officialCount: 'CET-SET4 训练',
    builtInCount: 3,
    durationMinutes: 15,
    trainingRoute: '口语重说',
  },
];
