import { INITIAL_PASSAGE, CET4_VOCABULARY_BANK, type VocabularyPracticeItem } from './data';
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
  moduleId: 'listening' | 'reading' | 'grammar';
  questionTypeId:
    | 'short-news'
    | 'long-conversation'
    | 'listening-passage'
    | 'word-bank'
    | 'long-matching'
    | 'careful-reading'
    | 'grammar-structure'
    | 'cloze-choice';
  skillArea: 'listening' | 'reading' | 'grammar';
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

export interface Cet4SubjectivePrompt {
  id: string;
  moduleId: 'writing' | 'translation';
  questionTypeId: 'short-essay' | 'paragraph-translation';
  title: string;
  prompt: string;
  plannedMinutes: number;
  keywords: string[];
  sampleAnswer: string;
  syllabusFocus: string[];
  minWords?: number;
}

export interface DegreeEnglishOutline {
  id: string;
  title: string;
  sourceDocument: string;
  referenceTextbook: string;
  examMode: string;
  hasListening: boolean;
  totalScore: number;
  totalQuestionCount: number;
  plannedMinutes: number;
  sections: Array<{
    moduleId: string;
    name: string;
    officialCount: string;
    score: number;
    plannedMinutes: number;
    focus: string[];
  }>;
}

export interface DegreeEnglishChoiceQuestion {
  id: string;
  moduleId: 'vocabulary-structure' | 'use-of-english' | 'reading';
  questionTypeId: 'vocabulary-structure' | 'cloze-choice' | 'traditional-reading' | 'paragraph-matching';
  title: string;
  prompt: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
  score: number;
  syllabusFocus: string[];
  correctSentence?: string;
}

export interface DegreeEnglishWritingTask {
  id: string;
  questionTypeId: 'practical-writing' | 'summary-comment';
  title: string;
  prompt: string;
  plannedMinutes: number;
  score: number;
  minWords: number;
  keywords: string[];
  sampleAnswer: string;
  syllabusFocus: string[];
}

export interface DegreeEnglishMockExamPaper {
  id: string;
  title: string;
  sourceNotice: string;
  plannedMinutes: number;
  totalScore: number;
  totalQuestionCount: number;
  vocabularyStructure: DegreeEnglishChoiceQuestion[];
  useOfEnglish: {
    passage: string;
    questions: DegreeEnglishChoiceQuestion[];
  };
  reading: {
    traditionalPassages: Passage[];
    traditionalQuestions: DegreeEnglishChoiceQuestion[];
    matchingPassage: string;
    matchingOptions: Record<string, string>;
    matchingQuestions: DegreeEnglishChoiceQuestion[];
  };
  writing: {
    practical: DegreeEnglishWritingTask;
    summaryComment: DegreeEnglishWritingTask;
  };
}

function makeQuestion(params: Omit<Question, 'options'> & { options: Record<Choice, string> }): Question {
  return params;
}

function makeDegreeQuestion(params: DegreeEnglishChoiceQuestion): DegreeEnglishChoiceQuestion {
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

const DIGITAL_SERVICES_PASSAGE: Passage = {
  id: 'cet-digital-services',
  examId: 'cet4',
  moduleId: 'reading',
  title: 'Digital Public Services',
  content: `Many cities now allow residents to book hospital visits, pay transport fees, and apply for public documents through mobile apps. These digital services can save time, especially for people who live far from government offices or have busy work schedules. They also make simple information easier to find, because notices and application steps can be checked at any time.

However, convenience does not automatically mean fairness. Some older adults may not feel confident using apps, and some families still have unreliable internet access. If public services move online too quickly, the people who need help most may face a new barrier. Privacy is another concern, because service platforms often collect personal information.

To make digital services useful for everyone, city governments should keep offline support, provide clear instructions, and protect personal data. Technology works best when it improves access rather than replacing human assistance completely.`,
  questions: [
    makeQuestion({
      id: 'digital-services-1',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What is one benefit of digital public services mentioned in the first paragraph?',
      options: {
        A: 'They can save time for residents with busy schedules.',
        B: 'They remove the need for hospitals.',
        C: 'They make all public offices unnecessary.',
        D: 'They prevent every mistake in applications.',
      },
      correctAnswer: 'A',
      explanation: '第一段指出 mobile apps 可以帮助离办事处较远或工作繁忙的人节省时间。',
      type: '细节理解',
      tags: ['公共服务', '细节定位'],
      difficulty: 2,
      sourceType: 'original',
      correctSentence: 'These digital services can save time, especially for people who live far from government offices or have busy work schedules.',
    }),
    makeQuestion({
      id: 'digital-services-2',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'Why may online-only public services create a new barrier?',
      options: {
        A: 'They always cost more than offline services.',
        B: 'Some residents lack confidence or reliable internet access.',
        C: 'They are used only by young students.',
        D: 'They collect no personal information.',
      },
      correctAnswer: 'B',
      explanation: '第二段列出 older adults 不熟悉 app 和 internet access 不稳定两个障碍。',
      type: '因果推理',
      tags: ['因果', '社会发展'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'Some older adults may not feel confident using apps, and some families still have unreliable internet access.',
    }),
    makeQuestion({
      id: 'digital-services-3',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What privacy issue is mentioned in the passage?',
      options: {
        A: 'Residents must show paper tickets every day.',
        B: 'Service platforms may collect personal information.',
        C: 'Government offices refuse to answer questions.',
        D: 'Mobile apps cannot show public notices.',
      },
      correctAnswer: 'B',
      explanation: 'privacy concern 对应 service platforms collect personal information。',
      type: '细节定位',
      tags: ['隐私', '关键词定位'],
      difficulty: 2,
      sourceType: 'original',
      correctSentence: 'Privacy is another concern, because service platforms often collect personal information.',
    }),
    makeQuestion({
      id: 'digital-services-4',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What is the author’s main suggestion?',
      options: {
        A: 'Close offline service centers as soon as possible.',
        B: 'Use technology only for entertainment.',
        C: 'Combine digital access with offline support and data protection.',
        D: 'Ask residents to stop using public services.',
      },
      correctAnswer: 'C',
      explanation: '最后一段建议保留线下支持、说明清楚流程并保护个人数据。',
      type: '主旨归纳',
      tags: ['建议', '同义替换'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'City governments should keep offline support, provide clear instructions, and protect personal data.',
    }),
  ],
};

const URBAN_TRANSPORT_PASSAGE: Passage = {
  id: 'cet-urban-transport',
  examId: 'cet4',
  moduleId: 'reading',
  title: 'Urban Transport Choices',
  content: `When a city grows, transport becomes more than a matter of speed. A reliable bus or subway system can connect people with schools, hospitals, and jobs. It can also reduce the number of private cars on the road, which helps lower air pollution and traffic pressure.

Building such a system requires careful planning. If routes are designed only for the city center, people in new communities may still need to drive long distances. If ticket prices rise too quickly, low-income workers may lose an affordable way to travel. Therefore, transport policy should consider both economic efficiency and public benefit.

Some cities have started to collect passenger surveys before changing routes. This method is not perfect, but it helps planners compare different needs and identify the areas where service is weakest. A good transport system is not simply fast; it is also fair, reliable, and easy to use.`,
  questions: [
    makeQuestion({
      id: 'transport-1',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'According to the passage, what can a reliable public transport system do?',
      options: {
        A: 'Connect people with schools, hospitals, and jobs.',
        B: 'Make all private cars illegal at once.',
        C: 'Remove the need for city planning.',
        D: 'Increase traffic pressure in the city center.',
      },
      correctAnswer: 'A',
      explanation: '第一段明确说 reliable bus or subway system can connect people with schools, hospitals, and jobs。',
      type: '细节理解',
      tags: ['城市', '定位'],
      difficulty: 2,
      sourceType: 'original',
      correctSentence: 'A reliable bus or subway system can connect people with schools, hospitals, and jobs.',
    }),
    makeQuestion({
      id: 'transport-2',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What problem may occur if routes focus only on the city center?',
      options: {
        A: 'New communities may still depend on long car trips.',
        B: 'Every passenger survey will become useless.',
        C: 'Hospitals will move away from the city.',
        D: 'Ticket prices will always fall.',
      },
      correctAnswer: 'A',
      explanation: '第二段指出 routes 只服务中心区时，新社区居民仍可能需要长距离开车。',
      type: '因果推理',
      tags: ['因果', '公共政策'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'If routes are designed only for the city center, people in new communities may still need to drive long distances.',
    }),
    makeQuestion({
      id: 'transport-3',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'Why does the passage mention passenger surveys?',
      options: {
        A: 'To show that public opinion can help identify weak service areas.',
        B: 'To prove that passengers dislike all subway systems.',
        C: 'To explain why buses should stop running at night.',
        D: 'To suggest that planners need no other evidence.',
      },
      correctAnswer: 'A',
      explanation: '第三段说明 surveys 帮助 planners compare needs and identify weak areas。',
      type: '目的推断',
      tags: ['调查', '推断'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'This method is not perfect, but it helps planners compare different needs and identify the areas where service is weakest.',
    }),
    makeQuestion({
      id: 'transport-4',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'Which best summarizes the author’s view of a good transport system?',
      options: {
        A: 'It should only be designed for speed.',
        B: 'It should be fast, fair, reliable, and easy to use.',
        C: 'It should avoid collecting any passenger information.',
        D: 'It should serve only people in the city center.',
      },
      correctAnswer: 'B',
      explanation: '末句总结 good transport system 不只是 fast，还要 fair, reliable, easy to use。',
      type: '主旨大意',
      tags: ['总结句', '同义替换'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'A good transport system is not simply fast; it is also fair, reliable, and easy to use.',
    }),
  ],
};

const CULTURAL_HERITAGE_PASSAGE: Passage = {
  id: 'cet-cultural-heritage',
  examId: 'cet4',
  moduleId: 'reading',
  title: 'Keeping Cultural Heritage Alive',
  content: `Cultural heritage is not limited to old buildings in famous cities. It also includes traditional skills, local festivals, songs, and the stories that families pass from one generation to the next. These forms of heritage help people understand where they come from and why certain customs still matter.

In recent years, some communities have used short videos and online exhibitions to introduce local traditions to younger audiences. This can promote interest, but it also creates a risk. If a tradition is presented only as a quick performance, viewers may remember the image but miss the history and values behind it.

A better approach is to combine digital presentation with education. Schools can invite local artists to explain how a craft is made, and museums can provide simple background stories with their online materials. In this way, technology becomes a bridge between modern life and cultural memory.`,
  questions: [
    makeQuestion({
      id: 'heritage-1',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What does the passage include as cultural heritage?',
      options: {
        A: 'Only old buildings in famous cities.',
        B: 'Traditional skills, local festivals, songs, and family stories.',
        C: 'Only products sold in museums.',
        D: 'All online entertainment videos.',
      },
      correctAnswer: 'B',
      explanation: '第一段列出 traditional skills、local festivals、songs、family stories。',
      type: '细节理解',
      tags: ['文化', '并列信息'],
      difficulty: 2,
      sourceType: 'original',
      correctSentence: 'It also includes traditional skills, local festivals, songs, and the stories that families pass from one generation to the next.',
    }),
    makeQuestion({
      id: 'heritage-2',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What risk does the author mention about online presentations of traditions?',
      options: {
        A: 'They may show images without explaining history and values.',
        B: 'They always make young people dislike local customs.',
        C: 'They prevent communities from holding festivals.',
        D: 'They are used only in famous cities.',
      },
      correctAnswer: 'A',
      explanation: '第二段指出 quick performance 可能让观众只记住 image，而忽略 history and values。',
      type: '转折理解',
      tags: ['风险', '文化传承'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'Viewers may remember the image but miss the history and values behind it.',
    }),
    makeQuestion({
      id: 'heritage-3',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What can schools do according to the last paragraph?',
      options: {
        A: 'Invite local artists to explain how a craft is made.',
        B: 'Replace all history lessons with short videos.',
        C: 'Ask students to stop visiting museums.',
        D: 'Remove background stories from online materials.',
      },
      correctAnswer: 'A',
      explanation: '最后一段建议 schools can invite local artists to explain how a craft is made。',
      type: '细节定位',
      tags: ['教育', '文化'],
      difficulty: 2,
      sourceType: 'original',
      correctSentence: 'Schools can invite local artists to explain how a craft is made.',
    }),
    makeQuestion({
      id: 'heritage-4',
      examId: 'cet4',
      moduleId: 'reading',
      questionTypeId: 'careful-reading',
      question: 'What is the main idea of the passage?',
      options: {
        A: 'Technology should help explain cultural heritage, not reduce it to quick images.',
        B: 'Cultural heritage is useful only for older adults.',
        C: 'Local festivals should not be recorded online.',
        D: 'Museums should avoid simple background stories.',
      },
      correctAnswer: 'A',
      explanation: '全文强调数字展示可以促进兴趣，但必须结合教育和背景解释。',
      type: '主旨大意',
      tags: ['主旨', '文化'],
      difficulty: 3,
      sourceType: 'original',
      correctSentence: 'Technology becomes a bridge between modern life and cultural memory.',
    }),
  ],
};

interface ExtendedReadingConfig {
  id: string;
  title: string;
  topic: string;
  benefit: string;
  concern: string;
  action: string;
  keyword: string;
  themeTag: string;
}

interface Cet4ScaleTopicConfig {
  slug: string;
  title: string;
  cnTitle: string;
  topic: string;
  benefit: string;
  concern: string;
  action: string;
  keywords: string[];
  themeTag: string;
}

const CET4_SCALE_TOPIC_CONFIGS: Cet4ScaleTopicConfig[] = [
  {
    slug: 'campus-library',
    title: 'Campus Library Services',
    cnTitle: '校园图书馆服务',
    topic: 'Campus library services',
    benefit: 'they provide students with quiet spaces, reliable resources, and guidance for independent learning',
    concern: 'Some students use libraries only before exams and miss the value of regular reading support',
    action: 'connect borrowing records, reading workshops, and personalized resource suggestions',
    keywords: ['library', 'resource', 'independent learning', 'reading habit'],
    themeTag: '教育',
  },
  {
    slug: 'online-privacy',
    title: 'Online Privacy Protection',
    cnTitle: '网络隐私保护',
    topic: 'Online privacy protection',
    benefit: 'it helps users keep personal information safe when they use digital services',
    concern: 'Many users agree to online terms without understanding what data is collected',
    action: 'teach basic data rules, encourage safer passwords, and explain privacy settings clearly',
    keywords: ['privacy', 'personal information', 'digital services', 'safety'],
    themeTag: '科技',
  },
  {
    slug: 'food-safety',
    title: 'Food Safety Awareness',
    cnTitle: '食品安全意识',
    topic: 'Food safety awareness',
    benefit: 'it encourages consumers to pay attention to quality, sources, and health risks',
    concern: 'Information about food sources may be difficult for ordinary consumers to check',
    action: 'make product information clearer and strengthen responsibility among producers',
    keywords: ['food safety', 'quality', 'health', 'responsibility'],
    themeTag: '社会生活',
  },
  {
    slug: 'green-travel',
    title: 'Green Travel Choices',
    cnTitle: '绿色出行',
    topic: 'Green travel choices',
    benefit: 'they reduce air pollution and encourage people to use public transport or bicycles',
    concern: 'Green travel may remain inconvenient if routes and facilities are poorly planned',
    action: 'improve transport connections and provide safe spaces for walking and cycling',
    keywords: ['green travel', 'public transport', 'pollution', 'sustainable'],
    themeTag: '环境',
  },
  {
    slug: 'mental-health',
    title: 'Mental Health Support',
    cnTitle: '心理健康支持',
    topic: 'Mental health support',
    benefit: 'it helps students notice pressure early and ask for help before problems become serious',
    concern: 'Some students avoid support because they worry about being judged by others',
    action: 'offer private consultations, peer support, and clear information about stress management',
    keywords: ['mental health', 'pressure', 'support', 'habit'],
    themeTag: '校园健康',
  },
  {
    slug: 'public-transport',
    title: 'Public Transport Planning',
    cnTitle: '公共交通规划',
    topic: 'Public transport planning',
    benefit: 'it connects residents with schools, hospitals, and job opportunities',
    concern: 'People in new communities may still depend on cars if routes are not balanced',
    action: 'compare passenger surveys with real travel data before changing routes',
    keywords: ['public transport', 'urban', 'policy', 'survey'],
    themeTag: '公共服务',
  },
  {
    slug: 'community-service',
    title: 'Community Service',
    cnTitle: '社区服务',
    topic: 'Community service',
    benefit: 'it gives students practical experience and strengthens their sense of responsibility',
    concern: 'Some service activities are short and do not match the real needs of local residents',
    action: 'match service tasks with local needs and evaluate results after each project',
    keywords: ['community service', 'local', 'responsibility', 'practical'],
    themeTag: '社会实践',
  },
  {
    slug: 'traditional-crafts',
    title: 'Traditional Crafts',
    cnTitle: '传统手工艺',
    topic: 'Traditional crafts',
    benefit: 'they help young people understand cultural memory through real objects and skills',
    concern: 'Some crafts are shown only as quick performances without enough background explanation',
    action: 'combine demonstrations with school courses and stories about local history',
    keywords: ['traditional craft', 'culture', 'history', 'heritage'],
    themeTag: '文化',
  },
  {
    slug: 'rural-development',
    title: 'Rural Development',
    cnTitle: '乡村发展',
    topic: 'Rural development',
    benefit: 'it can improve public services and create new opportunities for local people',
    concern: 'Rapid development may damage the environment if local conditions are ignored',
    action: 'protect natural resources while improving transport, education, and business support',
    keywords: ['rural development', 'public service', 'environment', 'opportunity'],
    themeTag: '社会发展',
  },
  {
    slug: 'digital-museum',
    title: 'Digital Museums',
    cnTitle: '数字博物馆',
    topic: 'Digital museums',
    benefit: 'they allow more people to learn about history and culture without traveling',
    concern: 'Online visitors may only look at images and miss the story behind each exhibit',
    action: 'provide simple background notes, guided questions, and links to related exhibits',
    keywords: ['digital museum', 'history', 'culture', 'background knowledge'],
    themeTag: '文化传播',
  },
  {
    slug: 'family-education',
    title: 'Family Education',
    cnTitle: '家庭教育',
    topic: 'Family education',
    benefit: 'it influences children’s habits, communication skills, and sense of responsibility',
    concern: 'Some families focus only on scores and ignore emotional support',
    action: 'build regular communication and encourage children to solve problems independently',
    keywords: ['family education', 'habit', 'communication', 'responsibility'],
    themeTag: '社会生活',
  },
  {
    slug: 'environmental-awareness',
    title: 'Environmental Awareness',
    cnTitle: '环保意识',
    topic: 'Environmental awareness',
    benefit: 'it encourages people to reduce waste and conserve energy in daily life',
    concern: 'Public campaigns may not change behavior if results are never measured',
    action: 'show visible data about waste, energy use, and community participation',
    keywords: ['environment', 'reduce', 'conserve', 'community'],
    themeTag: '环境',
  },
  {
    slug: 'shared-bicycles',
    title: 'Shared Bicycles',
    cnTitle: '共享单车',
    topic: 'Shared bicycles',
    benefit: 'they provide a convenient choice for short-distance urban travel',
    concern: 'Poor parking habits may block sidewalks and create management problems',
    action: 'set clear parking areas and use reminders to encourage responsible behavior',
    keywords: ['shared bicycle', 'urban', 'convenient', 'rule'],
    themeTag: '城市生活',
  },
  {
    slug: 'smart-city',
    title: 'Smart City Services',
    cnTitle: '智慧城市服务',
    topic: 'Smart city services',
    benefit: 'they make transport, public safety, and government information easier to access',
    concern: 'Digital systems may exclude residents who are not confident with mobile apps',
    action: 'keep offline support while improving data security and app instructions',
    keywords: ['smart city', 'digital service', 'data security', 'public benefit'],
    themeTag: '科技社会',
  },
  {
    slug: 'reading-campaigns',
    title: 'Reading Campaigns',
    cnTitle: '阅读推广活动',
    topic: 'Reading campaigns',
    benefit: 'they encourage residents to read more and make learning resources easier to find',
    concern: 'Some campaigns count attendance but do not check whether reading habits improve',
    action: 'combine book fairs with reading groups, notes, and follow-up activities',
    keywords: ['reading campaign', 'resource', 'habit', 'community'],
    themeTag: '教育文化',
  },
  {
    slug: 'sports-facilities',
    title: 'Public Sports Facilities',
    cnTitle: '公共体育设施',
    topic: 'Public sports facilities',
    benefit: 'they make exercise more accessible to residents of different ages',
    concern: 'Facilities lose value if they are far away or poorly maintained',
    action: 'collect local feedback and arrange regular maintenance',
    keywords: ['sports facility', 'exercise', 'maintenance', 'community'],
    themeTag: '公共服务',
  },
  {
    slug: 'online-education',
    title: 'Online Education',
    cnTitle: '在线教育',
    topic: 'Online education',
    benefit: 'it gives students flexible access to lessons, exercises, and feedback',
    concern: 'Learners may watch videos passively and fail to test their understanding',
    action: 'combine video lessons with quizzes, discussion, and scheduled review',
    keywords: ['online education', 'feedback', 'schedule', 'self-discipline'],
    themeTag: '教育',
  },
  {
    slug: 'part-time-work',
    title: 'Part-Time Work',
    cnTitle: '兼职工作',
    topic: 'Part-time work',
    benefit: 'it helps students gain experience and understand workplace communication',
    concern: 'Too many work hours may affect study and recovery',
    action: 'set limits, arrange a weekly timetable, and review learning priorities',
    keywords: ['part-time work', 'experience', 'schedule', 'balance'],
    themeTag: '校园生活',
  },
  {
    slug: 'teamwork',
    title: 'Teamwork in Study',
    cnTitle: '团队协作',
    topic: 'Teamwork in study',
    benefit: 'it allows students to share information and learn from different perspectives',
    concern: 'Group projects can become unfair if tasks are not clearly distributed',
    action: 'define roles, record contributions, and communicate problems early',
    keywords: ['teamwork', 'communicate', 'project', 'responsibility'],
    themeTag: '校园学习',
  },
  {
    slug: 'time-management',
    title: 'Time Management',
    cnTitle: '时间管理',
    topic: 'Time management',
    benefit: 'it helps students balance accuracy, speed, review, and recovery',
    concern: 'Long study hours may create a false sense of progress without active recall',
    action: 'arrange short tasks, test memory, and reserve time for spaced review',
    keywords: ['time management', 'review', 'accuracy', 'strategy'],
    themeTag: '学习策略',
  },
  {
    slug: 'recycling',
    title: 'Recycling Programs',
    cnTitle: '垃圾分类与回收',
    topic: 'Recycling programs',
    benefit: 'they reduce waste and make environmental responsibility visible',
    concern: 'Residents may give up if rules are confusing or feedback is missing',
    action: 'provide clear labels, simple examples, and weekly progress reports',
    keywords: ['recycling', 'waste', 'environment', 'progress'],
    themeTag: '环境',
  },
  {
    slug: 'mobile-payment',
    title: 'Mobile Payment',
    cnTitle: '移动支付',
    topic: 'Mobile payment',
    benefit: 'it makes shopping and public transport more convenient',
    concern: 'Users may ignore privacy risks when payment becomes too easy',
    action: 'protect accounts, check payment records, and learn basic data safety',
    keywords: ['mobile payment', 'privacy', 'convenient', 'digital service'],
    themeTag: '科技生活',
  },
  {
    slug: 'high-speed-rail',
    title: 'High-Speed Rail',
    cnTitle: '高速铁路',
    topic: 'High-speed rail',
    benefit: 'it connects cities and creates more opportunities for work, study, and travel',
    concern: 'Some smaller areas may not share the benefits if local services are weak',
    action: 'improve regional planning and connect stations with local transport',
    keywords: ['high-speed rail', 'connect', 'economic development', 'transport'],
    themeTag: '社会发展',
  },
  {
    slug: 'urban-parks',
    title: 'Urban Parks',
    cnTitle: '城市公园',
    topic: 'Urban parks',
    benefit: 'they provide public space for exercise, rest, and community activities',
    concern: 'Crowded parks may create noise and maintenance pressure',
    action: 'balance visitor needs, protect green areas, and manage facilities regularly',
    keywords: ['urban park', 'community', 'exercise', 'environment'],
    themeTag: '城市生活',
  },
  {
    slug: 'career-planning',
    title: 'Career Planning',
    cnTitle: '职业规划',
    topic: 'Career planning',
    benefit: 'it helps students connect personal interests with future opportunities',
    concern: 'Some students follow popular choices without evaluating their own abilities',
    action: 'compare skills, interests, and real job information before making decisions',
    keywords: ['career planning', 'ability', 'opportunity', 'evaluate'],
    themeTag: '职业发展',
  },
  {
    slug: 'public-health',
    title: 'Public Health Education',
    cnTitle: '公共健康教育',
    topic: 'Public health education',
    benefit: 'it helps people understand risks and develop safer daily habits',
    concern: 'Information may be ignored if it is too technical or far from real life',
    action: 'use simple examples, local data, and practical guidance',
    keywords: ['public health', 'risk', 'habit', 'guidance'],
    themeTag: '公共服务',
  },
  {
    slug: 'science-literacy',
    title: 'Science Literacy',
    cnTitle: '科学素养',
    topic: 'Science literacy',
    benefit: 'it helps students judge information and understand evidence',
    concern: 'People may accept claims too quickly if they do not know how evidence works',
    action: 'teach basic research methods and encourage questions about sources',
    keywords: ['science literacy', 'evidence', 'research', 'source'],
    themeTag: '教育',
  },
  {
    slug: 'volunteer-tutoring',
    title: 'Volunteer Tutoring',
    cnTitle: '志愿辅导',
    topic: 'Volunteer tutoring',
    benefit: 'it supports younger students and helps college students practice communication',
    concern: 'Tutoring may become ineffective if volunteers do not prepare suitable materials',
    action: 'match tasks with learners’ needs and review progress regularly',
    keywords: ['volunteer tutoring', 'communication', 'support', 'progress'],
    themeTag: '社会实践',
  },
  {
    slug: 'digital-reading',
    title: 'Digital Reading',
    cnTitle: '数字阅读',
    topic: 'Digital reading',
    benefit: 'it gives readers convenient access to books, reports, and learning materials',
    concern: 'Fast scrolling may make readers miss details and weaken deep understanding',
    action: 'set reading goals, take notes, and compare key ideas after reading',
    keywords: ['digital reading', 'note', 'detail', 'understanding'],
    themeTag: '阅读策略',
  },
  {
    slug: 'campus-safety',
    title: 'Campus Safety',
    cnTitle: '校园安全',
    topic: 'Campus safety',
    benefit: 'it gives students a secure environment for study and daily life',
    concern: 'Rules may be ignored if students do not understand the reason behind them',
    action: 'combine clear rules with real examples and regular safety practice',
    keywords: ['campus safety', 'rule', 'environment', 'practice'],
    themeTag: '校园生活',
  },
];

function makeExtendedReadingPassage(config: ExtendedReadingConfig): Passage {
  const content = `${config.topic} has become a familiar subject in college life and public discussion. Supporters point out that ${config.benefit}. This advantage is especially important when students need to connect classroom knowledge with real situations rather than remember facts mechanically.

However, the value of ${config.topic.toLowerCase()} depends on how it is used. ${config.concern}. If people focus only on speed or appearance, they may ignore the deeper purpose of learning, service, or communication. This is why a simple change may not lead to a reliable outcome by itself.

A more practical solution is to ${config.action}. With this balanced approach, ${config.topic.toLowerCase()} can become a useful resource instead of a temporary trend. The key is to make progress visible, protect fairness, and encourage people to reflect on the result.`;

  return {
    id: config.id,
    examId: 'cet4',
    moduleId: 'reading',
    title: config.title,
    content,
    questions: [
      makeQuestion({
        id: `${config.id}-1`,
        examId: 'cet4',
        moduleId: 'reading',
        questionTypeId: 'careful-reading',
        question: `What benefit of ${config.topic.toLowerCase()} is mentioned in the first paragraph?`,
        options: {
          A: config.benefit,
          B: 'It removes the need for all planning and review.',
          C: 'It makes every learner choose the same method.',
          D: 'It prevents people from using classroom knowledge.',
        },
        correctAnswer: 'A',
        explanation: `第一段直接说明该主题的积极作用：${config.benefit}`,
        type: '细节理解',
        tags: [config.themeTag, '细节定位'],
        difficulty: 2,
        sourceType: 'original',
        correctSentence: `Supporters point out that ${config.benefit}.`,
      }),
      makeQuestion({
        id: `${config.id}-2`,
        examId: 'cet4',
        moduleId: 'reading',
        questionTypeId: 'careful-reading',
        question: 'What concern does the passage raise?',
        options: {
          A: 'People may ignore the deeper purpose if they focus only on speed or appearance.',
          B: 'Students should stop connecting knowledge with real situations.',
          C: 'Every public discussion is unrelated to college life.',
          D: 'Reliable outcomes can be achieved without evidence.',
        },
        correctAnswer: 'A',
        explanation: '第二段用 However 引出限制，强调只追求速度或表面效果会偏离深层目标。',
        type: '转折理解',
        tags: [config.themeTag, '转折'],
        difficulty: 3,
        sourceType: 'original',
        correctSentence: 'If people focus only on speed or appearance, they may ignore the deeper purpose of learning, service, or communication.',
      }),
      makeQuestion({
        id: `${config.id}-3`,
        examId: 'cet4',
        moduleId: 'reading',
        questionTypeId: 'careful-reading',
        question: 'What solution does the author suggest?',
        options: {
          A: config.action,
          B: 'Treat the topic as a temporary trend.',
          C: 'Avoid checking the result of any change.',
          D: 'Use the same plan for every person and place.',
        },
        correctAnswer: 'A',
        explanation: `第三段明确提出 practical solution：${config.action}`,
        type: '细节定位',
        tags: [config.themeTag, '建议'],
        difficulty: 2,
        sourceType: 'original',
        correctSentence: `A more practical solution is to ${config.action}.`,
      }),
      makeQuestion({
        id: `${config.id}-4`,
        examId: 'cet4',
        moduleId: 'reading',
        questionTypeId: 'careful-reading',
        question: `What does the word "${config.keyword}" in the passage mainly refer to?`,
        options: {
          A: 'A helpful source or method that supports a goal.',
          B: 'A rule that prevents all communication.',
          C: 'A short story without a clear point.',
          D: 'A mistake that cannot be corrected.',
        },
        correctAnswer: 'A',
        explanation: `${config.keyword} 在上下文中表示可被利用来支持目标的资源或方式。`,
        type: '词义猜测',
        tags: [config.themeTag, '上下文猜词'],
        difficulty: 3,
        sourceType: 'original',
        correctSentence: `With this balanced approach, ${config.topic.toLowerCase()} can become a useful resource instead of a temporary trend.`,
      }),
    ],
  };
}

const READING_EXPANSION_ANGLES = [
  {
    slug: 'case-study',
    title: 'Case Study',
    keyword: 'application',
    topic: (topic: Cet4ScaleTopicConfig) => `${topic.topic} in a local case`,
    benefit: (topic: Cet4ScaleTopicConfig) => `a local example can show how ${topic.topic.toLowerCase()} works in real life`,
    concern: (topic: Cet4ScaleTopicConfig) => topic.concern,
    action: (topic: Cet4ScaleTopicConfig) => `compare one local case with the expected benefit of ${topic.topic.toLowerCase()}`,
  },
  {
    slug: 'data-feedback',
    title: 'Data and Feedback',
    keyword: 'evidence',
    topic: (topic: Cet4ScaleTopicConfig) => `${topic.topic} and feedback`,
    benefit: (topic: Cet4ScaleTopicConfig) => `feedback data can help people judge whether ${topic.topic.toLowerCase()} is improving`,
    concern: (topic: Cet4ScaleTopicConfig) => 'Numbers may be misleading if people collect them without understanding the real situation',
    action: (topic: Cet4ScaleTopicConfig) => `collect simple feedback and connect it with practical changes in ${topic.topic.toLowerCase()}`,
  },
  {
    slug: 'student-role',
    title: 'The Student Role',
    keyword: 'responsibility',
    topic: (topic: Cet4ScaleTopicConfig) => `students and ${topic.topic.toLowerCase()}`,
    benefit: (topic: Cet4ScaleTopicConfig) => `students can turn ${topic.topic.toLowerCase()} into a chance to practice communication and responsibility`,
    concern: (topic: Cet4ScaleTopicConfig) => 'Participation may become shallow if students only complete the task for a record',
    action: (topic: Cet4ScaleTopicConfig) => `ask students to explain what they learned from ${topic.topic.toLowerCase()} after practice`,
  },
  {
    slug: 'policy-balance',
    title: 'Policy and Balance',
    keyword: 'policy',
    topic: (topic: Cet4ScaleTopicConfig) => `${topic.topic} policy`,
    benefit: (topic: Cet4ScaleTopicConfig) => `a balanced policy can make ${topic.topic.toLowerCase()} fairer and more reliable`,
    concern: (topic: Cet4ScaleTopicConfig) => topic.concern,
    action: (topic: Cet4ScaleTopicConfig) => `adjust rules for ${topic.topic.toLowerCase()} after listening to different groups`,
  },
  {
    slug: 'long-term-impact',
    title: 'Long-Term Impact',
    keyword: 'impact',
    topic: (topic: Cet4ScaleTopicConfig) => `the long-term impact of ${topic.topic.toLowerCase()}`,
    benefit: (topic: Cet4ScaleTopicConfig) => `${topic.topic} can create lasting value when its results are reviewed regularly`,
    concern: (topic: Cet4ScaleTopicConfig) => 'Short-term success may hide costs that appear later',
    action: (topic: Cet4ScaleTopicConfig) => `review the long-term impact of ${topic.topic.toLowerCase()} instead of judging only quick results`,
  },
  {
    slug: 'community-access',
    title: 'Community Access',
    keyword: 'accessible',
    topic: (topic: Cet4ScaleTopicConfig) => `community access to ${topic.topic.toLowerCase()}`,
    benefit: (topic: Cet4ScaleTopicConfig) => `${topic.topic} becomes more useful when different groups can access it easily`,
    concern: (topic: Cet4ScaleTopicConfig) => 'Older residents and busy learners may be left behind if access is too complicated',
    action: (topic: Cet4ScaleTopicConfig) => `make ${topic.topic.toLowerCase()} easier to reach through clear guidance and offline support`,
  },
  {
    slug: 'exam-relevance',
    title: 'Exam Relevance',
    keyword: 'context',
    topic: (topic: Cet4ScaleTopicConfig) => `${topic.topic} in exam contexts`,
    benefit: (topic: Cet4ScaleTopicConfig) => `the topic helps learners practice common CET-4 ideas about ${topic.themeTag}`,
    concern: (topic: Cet4ScaleTopicConfig) => 'Learners may know the topic in Chinese but lack English expressions for it',
    action: (topic: Cet4ScaleTopicConfig) => `learn key phrases about ${topic.topic.toLowerCase()} through reading, listening, writing, and translation`,
  },
] as const;

const EXTENDED_READING_PASSAGES: Passage[] = [
  {
    id: 'cet-campus-health',
    title: 'Campus Health Programs',
    topic: 'Campus health programs',
    benefit: 'they help students build healthy habits and notice mental pressure earlier',
    concern: 'Some programs fail because students see them as formal activities rather than practical support',
    action: 'offer short workshops, private advice, and regular feedback based on students’ real needs',
    keyword: 'resource',
    themeTag: '校园健康',
  },
  {
    id: 'cet-food-waste',
    title: 'Reducing Food Waste',
    topic: 'Reducing food waste',
    benefit: 'it can lower costs, conserve resources, and protect the environment',
    concern: 'Some campaigns only put slogans on walls and do not change daily choices',
    action: 'measure waste, provide smaller portions, and show students the results each week',
    keyword: 'resource',
    themeTag: '环境',
  },
  {
    id: 'cet-online-courses',
    title: 'Online Courses and Independent Learning',
    topic: 'Online courses',
    benefit: 'they give learners flexible access to lectures and practice materials',
    concern: 'Some learners watch videos passively and overestimate what they have learned',
    action: 'combine short videos with quizzes, discussion, and active recall tasks',
    keyword: 'resource',
    themeTag: '教育',
  },
  {
    id: 'cet-community-volunteers',
    title: 'Community Volunteer Work',
    topic: 'Community volunteer work',
    benefit: 'it helps students understand social responsibility through real service',
    concern: 'Some activities become photo opportunities and do not solve local problems',
    action: 'match volunteers with local needs and evaluate the outcome after each activity',
    keyword: 'resource',
    themeTag: '社会实践',
  },
  {
    id: 'cet-smart-devices',
    title: 'Smart Devices in Daily Study',
    topic: 'Smart devices',
    benefit: 'they allow students to record tasks, review words, and search information quickly',
    concern: 'Notifications and entertainment apps may reduce attention during study',
    action: 'set a clear purpose, turn off unnecessary alerts, and reflect on learning results',
    keyword: 'resource',
    themeTag: '科技',
  },
  {
    id: 'cet-rural-tourism',
    title: 'Rural Tourism and Local Development',
    topic: 'Rural tourism',
    benefit: 'it can create jobs and encourage visitors to learn about local culture',
    concern: 'Rapid tourism may damage the environment or turn traditions into simple shows',
    action: 'limit visitor pressure, protect local customs, and share income fairly',
    keyword: 'resource',
    themeTag: '社会发展',
  },
  {
    id: 'cet-public-sports',
    title: 'Public Sports Facilities',
    topic: 'Public sports facilities',
    benefit: 'they make exercise more accessible to residents of different ages',
    concern: 'Facilities may be wasted if they are poorly maintained or placed far from communities',
    action: 'collect local feedback, arrange regular maintenance, and keep opening hours convenient',
    keyword: 'resource',
    themeTag: '公共服务',
  },
  {
    id: 'cet-digital-reading',
    title: 'Digital Reading Habits',
    topic: 'Digital reading',
    benefit: 'it gives readers convenient access to books, reports, and learning materials',
    concern: 'Fast scrolling may make readers miss details and weaken deep understanding',
    action: 'set reading goals, take notes, and compare key ideas after reading',
    keyword: 'resource',
    themeTag: '阅读策略',
  },
  ...CET4_SCALE_TOPIC_CONFIGS.flatMap((topic, topicIndex) => ([
    {
      id: `cet-scale-${topic.slug}-concept`,
      title: `${topic.title}: Value and Limits`,
      topic: topic.topic,
      benefit: topic.benefit,
      concern: topic.concern,
      action: topic.action,
      keyword: topicIndex % 2 === 0 ? 'resource' : 'outcome',
      themeTag: topic.themeTag,
    },
    {
      id: `cet-scale-${topic.slug}-practice`,
      title: `${topic.title}: A Practical Approach`,
      topic: `${topic.topic} in daily practice`,
      benefit: topic.action,
      concern: topic.concern,
      action: `compare the expected result with real evidence from ${topic.topic.toLowerCase()}`,
      keyword: topicIndex % 2 === 0 ? 'approach' : 'evidence',
      themeTag: topic.themeTag,
    },
    {
      id: `cet-scale-${topic.slug}-evidence`,
      title: `${topic.title}: Evidence and Improvement`,
      topic: `${topic.topic} improvement`,
      benefit: `clear evidence can show whether ${topic.topic.toLowerCase()} is producing useful results`,
      concern: topic.concern,
      action: `collect feedback, identify weak points, and adjust ${topic.topic.toLowerCase()} step by step`,
      keyword: topicIndex % 2 === 0 ? 'visible' : 'reliable',
      themeTag: topic.themeTag,
    },
    ...READING_EXPANSION_ANGLES.map((angle) => ({
      id: `cet-scale-${topic.slug}-${angle.slug}`,
      title: `${topic.title}: ${angle.title}`,
      topic: angle.topic(topic),
      benefit: angle.benefit(topic),
      concern: angle.concern(topic),
      action: angle.action(topic),
      keyword: angle.keyword,
      themeTag: topic.themeTag,
    })),
  ])),
].map(makeExtendedReadingPassage);

export const DEGREE_ENGLISH_READING_PASSAGES: Passage[] = [
  {
    id: 'degree-adult-learning-schedules',
    examId: 'degree-english',
    moduleId: 'reading',
    title: 'Adult Learners and Flexible Study Schedules',
    content: `Many adult learners return to university after several years of work. They often have a clear purpose: to improve professional skills, qualify for a degree certificate, or open a new path in their career. Compared with full-time students, they usually understand why English matters, but they also face a practical problem. Their study time is divided among work, family, and commuting.

Successful programs for adult learners do not simply ask students to spend more hours online. Instead, they divide learning into small tasks, such as reviewing one grammar point, reading one short passage, or writing one useful paragraph. These tasks are easier to complete during short breaks. When teachers give quick feedback, learners can see what should be corrected before mistakes become habits.

Support from employers and families also makes a difference. A learner who has a quiet hour each evening is more likely to continue than one who studies only when everything else is finished. The key lesson is that adult education needs both personal effort and a realistic system of support.`,
    questions: [
      makeQuestion({
        id: 'degree-adult-learning-1',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'Why do many adult learners return to university?',
        options: {
          A: 'To avoid all family duties.',
          B: 'To improve skills, meet degree requirements, or develop a career.',
          C: 'To spend more time commuting.',
          D: 'To replace every online course with a textbook.',
        },
        correctAnswer: 'B',
        explanation: '第一段列出 improve professional skills、degree certificate、career path 三个原因。',
        type: '细节理解',
        tags: ['学位英语', '成人学习', '细节定位'],
        difficulty: 2,
        sourceType: 'original',
        correctSentence: 'They often have a clear purpose: to improve professional skills, qualify for a degree certificate, or open a new path in their career.',
      }),
      makeQuestion({
        id: 'degree-adult-learning-2',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'What practical problem is mentioned in the first paragraph?',
        options: {
          A: 'Adult learners have divided study time.',
          B: 'Adult learners cannot understand why English matters.',
          C: 'Adult learners refuse to read passages.',
          D: 'Adult learners always have more free time than full-time students.',
        },
        correctAnswer: 'A',
        explanation: '原文说学习时间被工作、家庭和通勤分割。',
        type: '细节理解',
        tags: ['学位英语', '时间管理'],
        difficulty: 2,
        sourceType: 'original',
        correctSentence: 'Their study time is divided among work, family, and commuting.',
      }),
      makeQuestion({
        id: 'degree-adult-learning-3',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'According to the passage, what do successful programs do?',
        options: {
          A: 'They remove feedback from learning.',
          B: 'They ask students to study only at midnight.',
          C: 'They divide learning into small and complete tasks.',
          D: 'They make every task depend on long lectures.',
        },
        correctAnswer: 'C',
        explanation: '第二段强调 divide learning into small tasks。',
        type: '同义替换',
        tags: ['学习策略', '主旨支持'],
        difficulty: 3,
        sourceType: 'original',
        correctSentence: 'Instead, they divide learning into small tasks, such as reviewing one grammar point, reading one short passage, or writing one useful paragraph.',
      }),
      makeQuestion({
        id: 'degree-adult-learning-4',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'What can quick feedback help learners do?',
        options: {
          A: 'Correct mistakes before they become habits.',
          B: 'Stop using English in real situations.',
          C: 'Avoid all grammar learning.',
          D: 'Finish a degree without practice.',
        },
        correctAnswer: 'A',
        explanation: 'quick feedback 帮助学习者及时修正错误。',
        type: '因果理解',
        tags: ['反馈', '错因归因'],
        difficulty: 3,
        sourceType: 'original',
        correctSentence: 'When teachers give quick feedback, learners can see what should be corrected before mistakes become habits.',
      }),
      makeQuestion({
        id: 'degree-adult-learning-5',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'What is the main idea of the passage?',
        options: {
          A: 'Adult education requires effort and realistic support.',
          B: 'Adult learners should never use online materials.',
          C: 'Degree certificates are not related to English learning.',
          D: 'Commuting is the only challenge in adult education.',
        },
        correctAnswer: 'A',
        explanation: '末句概括全文：个人努力和现实支持系统都需要。',
        type: '主旨大意',
        tags: ['主旨', '学位英语'],
        difficulty: 3,
        sourceType: 'original',
        correctSentence: 'The key lesson is that adult education needs both personal effort and a realistic system of support.',
      }),
    ],
  },
  {
    id: 'degree-public-services',
    examId: 'degree-english',
    moduleId: 'reading',
    title: 'Making Public Services Easier to Use',
    content: `Public services are most valuable when people can use them easily. In many cities, residents can now make hospital appointments, pay bills, and ask for government information through digital platforms. These tools save time, especially for people who live far from service offices or work during the day.

However, convenience does not automatically mean fairness. Older residents, people with limited digital skills, and families without stable internet may still need face-to-face help. If public offices close too many service windows too quickly, some citizens may feel that the new system has left them behind. A good digital service should therefore keep simple language, clear instructions, and alternative ways to ask for help.

Training is another important factor. Community centers can teach residents how to use common online services, while service workers can collect questions that people often ask. By improving both technology and human support, a city can make public services more efficient without losing warmth.`,
    questions: [
      makeQuestion({
        id: 'degree-public-services-1',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'Which example of digital public services is mentioned?',
        options: {
          A: 'Making hospital appointments online.',
          B: 'Replacing every community center with a bank.',
          C: 'Teaching only young people to pay bills.',
          D: 'Closing all public offices at once.',
        },
        correctAnswer: 'A',
        explanation: '第一段提到 make hospital appointments、pay bills、ask for government information。',
        type: '细节理解',
        tags: ['公共服务', '细节定位'],
        difficulty: 2,
        sourceType: 'original',
        correctSentence: 'In many cities, residents can now make hospital appointments, pay bills, and ask for government information through digital platforms.',
      }),
      makeQuestion({
        id: 'degree-public-services-2',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'Who may still need face-to-face help?',
        options: {
          A: 'Only people who never pay bills.',
          B: 'Older residents and people with limited digital skills.',
          C: 'Only service workers in large offices.',
          D: 'People who already use every app well.',
        },
        correctAnswer: 'B',
        explanation: '第二段列出 older residents、limited digital skills、without stable internet。',
        type: '细节理解',
        tags: ['同义替换', '公共服务'],
        difficulty: 2,
        sourceType: 'original',
        correctSentence: 'Older residents, people with limited digital skills, and families without stable internet may still need face-to-face help.',
      }),
      makeQuestion({
        id: 'degree-public-services-3',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'What risk is caused by closing too many service windows too quickly?',
        options: {
          A: 'Citizens may feel left behind.',
          B: 'Digital platforms may become less convenient for young people only.',
          C: 'Public workers may collect too many useful questions.',
          D: 'Hospitals may stop making appointments.',
        },
        correctAnswer: 'A',
        explanation: '原文说部分市民会感到被新系统落下。',
        type: '因果理解',
        tags: ['转折', '公平'],
        difficulty: 3,
        sourceType: 'original',
        correctSentence: 'If public offices close too many service windows too quickly, some citizens may feel that the new system has left them behind.',
      }),
      makeQuestion({
        id: 'degree-public-services-4',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'What should a good digital service keep?',
        options: {
          A: 'Simple language, clear instructions, and alternative help.',
          B: 'Complicated rules and only one online entrance.',
          C: 'Long forms without explanation.',
          D: 'No human support at all.',
        },
        correctAnswer: 'A',
        explanation: '第二段末句列出 simple language、clear instructions、alternative ways。',
        type: '并列信息',
        tags: ['细节定位', '公共服务'],
        difficulty: 3,
        sourceType: 'original',
        correctSentence: 'A good digital service should therefore keep simple language, clear instructions, and alternative ways to ask for help.',
      }),
      makeQuestion({
        id: 'degree-public-services-5',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'What balance does the passage support?',
        options: {
          A: 'Technology and human support.',
          B: 'Speed and secrecy.',
          C: 'Payment and entertainment.',
          D: 'Office size and weather.',
        },
        correctAnswer: 'A',
        explanation: '末句明确 improving both technology and human support。',
        type: '主旨归纳',
        tags: ['主旨', '社会发展'],
        difficulty: 3,
        sourceType: 'original',
        correctSentence: 'By improving both technology and human support, a city can make public services more efficient without losing warmth.',
      }),
    ],
  },
  {
    id: 'degree-cultural-memory',
    examId: 'degree-english',
    moduleId: 'reading',
    title: 'Protecting Local Cultural Memory',
    content: `Local cultural memory is built from festivals, old buildings, family stories, songs, and everyday customs. These things may look ordinary, but they help people understand where they come from and how their community has changed. When young people learn about local culture, they often become more willing to protect it.

Digital technology offers new tools for cultural protection. A museum can record interviews with older residents, scan old photographs, and create online exhibitions for people who cannot visit in person. Schools can also ask students to collect stories from their families and compare them with historical records. In this way, culture becomes something learners investigate, not just something they memorize.

Still, protection should not turn culture into a simple show. If a festival is changed only to attract tourists, local residents may lose their own voice. Real protection respects the people who continue the tradition. It also explains the meaning behind customs, so visitors understand more than colorful surfaces.`,
    questions: [
      makeQuestion({
        id: 'degree-cultural-memory-1',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'What helps people understand where they come from?',
        options: {
          A: 'Local cultural memory.',
          B: 'Only modern shopping centers.',
          C: 'A list of exam dates.',
          D: 'Tourist advertisements without local voices.',
        },
        correctAnswer: 'A',
        explanation: '第一段说明地方文化记忆帮助人们理解来源和社区变化。',
        type: '细节理解',
        tags: ['中国文化', '细节定位'],
        difficulty: 2,
        sourceType: 'original',
        correctSentence: 'These things may look ordinary, but they help people understand where they come from and how their community has changed.',
      }),
      makeQuestion({
        id: 'degree-cultural-memory-2',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'Which digital tool is mentioned for cultural protection?',
        options: {
          A: 'Recording interviews with older residents.',
          B: 'Replacing every festival with an online game.',
          C: 'Deleting old photographs.',
          D: 'Stopping students from asking families about stories.',
        },
        correctAnswer: 'A',
        explanation: '第二段提到 record interviews、scan photographs、online exhibitions。',
        type: '细节理解',
        tags: ['文化', '科技'],
        difficulty: 2,
        sourceType: 'original',
        correctSentence: 'A museum can record interviews with older residents, scan old photographs, and create online exhibitions for people who cannot visit in person.',
      }),
      makeQuestion({
        id: 'degree-cultural-memory-3',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'What does the passage say students can do?',
        options: {
          A: 'Collect family stories and compare them with historical records.',
          B: 'Memorize culture without investigation.',
          C: 'Avoid speaking with older people.',
          D: 'Turn all customs into advertisements.',
        },
        correctAnswer: 'A',
        explanation: '第二段提到学校可让学生收集家庭故事并对比历史记录。',
        type: '细节理解',
        tags: ['文化', '教育'],
        difficulty: 3,
        sourceType: 'original',
        correctSentence: 'Schools can also ask students to collect stories from their families and compare them with historical records.',
      }),
      makeQuestion({
        id: 'degree-cultural-memory-4',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'What danger is mentioned in the last paragraph?',
        options: {
          A: 'Changing a festival only to attract tourists.',
          B: 'Explaining the meaning behind customs.',
          C: 'Respecting residents who continue traditions.',
          D: 'Helping visitors understand local culture.',
        },
        correctAnswer: 'A',
        explanation: '末段警惕只为吸引游客而改变节日。',
        type: '转折信息',
        tags: ['文化保护', '细节偷换'],
        difficulty: 3,
        sourceType: 'original',
        correctSentence: 'If a festival is changed only to attract tourists, local residents may lose their own voice.',
      }),
      makeQuestion({
        id: 'degree-cultural-memory-5',
        examId: 'degree-english',
        moduleId: 'reading',
        questionTypeId: 'traditional-reading',
        question: 'Which statement best expresses the author’s attitude?',
        options: {
          A: 'Culture should be protected with technology and respect for local people.',
          B: 'Cultural protection should focus only on colorful surfaces.',
          C: 'Young people should stop learning local stories.',
          D: 'Digital exhibitions are always harmful to local culture.',
        },
        correctAnswer: 'A',
        explanation: '全文支持技术工具与对当地人的尊重相结合。',
        type: '态度推断',
        tags: ['作者态度', '主旨'],
        difficulty: 4,
        sourceType: 'original',
        correctSentence: 'Real protection respects the people who continue the tradition.',
      }),
    ],
  },
];

export const CET4_READING_BANK: Passage[] = [
  INITIAL_PASSAGE,
  GREEN_TECH_PASSAGE,
  COMMUNITY_LIBRARY_PASSAGE,
  SLEEP_LEARNING_PASSAGE,
  DIGITAL_SERVICES_PASSAGE,
  URBAN_TRANSPORT_PASSAGE,
  CULTURAL_HERITAGE_PASSAGE,
  ...DEGREE_ENGLISH_READING_PASSAGES,
  ...EXTENDED_READING_PASSAGES,
];

function makeMockChoiceQuestion(params: {
  id: string;
  moduleId: 'listening' | 'reading' | 'grammar';
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

const LISTENING_EXPANSION_SCENARIOS = [
  {
    slug: 'benefit-detail',
    questionTypeId: 'short-news' as const,
    title: '短篇新闻补充',
    prompt: (topic: Cet4ScaleTopicConfig) => `What benefit of ${topic.topic.toLowerCase()} is mentioned?`,
    correctOption: (topic: Cet4ScaleTopicConfig) => topic.benefit,
    correctSentence: (topic: Cet4ScaleTopicConfig) => `The speaker says that ${topic.benefit}.`,
    explanation: (topic: Cet4ScaleTopicConfig) => `听到 says that 后定位积极作用：${topic.benefit}`,
    trapType: '关键信息漏听',
  },
  {
    slug: 'concern-detail',
    questionTypeId: 'short-news' as const,
    title: '短篇新闻补充',
    prompt: (topic: Cet4ScaleTopicConfig) => `What concern is reported about ${topic.topic.toLowerCase()}?`,
    correctOption: (topic: Cet4ScaleTopicConfig) => topic.concern,
    correctSentence: (topic: Cet4ScaleTopicConfig) => `The report also notes that ${topic.concern}.`,
    explanation: (topic: Cet4ScaleTopicConfig) => `also notes that 后面是限制信息：${topic.concern}`,
    trapType: '转折信息漏听',
  },
  {
    slug: 'recommended-action',
    questionTypeId: 'short-news' as const,
    title: '短篇新闻补充',
    prompt: (topic: Cet4ScaleTopicConfig) => 'What action is recommended?',
    correctOption: (topic: Cet4ScaleTopicConfig) => topic.action,
    correctSentence: (topic: Cet4ScaleTopicConfig) => `The recommended action is to ${topic.action}.`,
    explanation: (topic: Cet4ScaleTopicConfig) => `recommended action 对应：${topic.action}`,
    trapType: '关键词漏听',
  },
  {
    slug: 'student-concern',
    questionTypeId: 'long-conversation' as const,
    title: '长对话补充',
    prompt: (topic: Cet4ScaleTopicConfig) => `What does the student worry about in relation to ${topic.topic.toLowerCase()}?`,
    correctOption: (topic: Cet4ScaleTopicConfig) => topic.concern,
    correctSentence: (topic: Cet4ScaleTopicConfig) => `The student says, "I am worried that ${topic.concern}."`,
    explanation: (topic: Cet4ScaleTopicConfig) => `学生的 worry 直接对应：${topic.concern}`,
    trapType: '低信心',
  },
  {
    slug: 'advisor-suggestion',
    questionTypeId: 'long-conversation' as const,
    title: '长对话补充',
    prompt: () => 'What does the advisor suggest doing first?',
    correctOption: (topic: Cet4ScaleTopicConfig) => topic.action,
    correctSentence: (topic: Cet4ScaleTopicConfig) => `The advisor suggests that they should first ${topic.action}.`,
    explanation: (topic: Cet4ScaleTopicConfig) => `advisor suggests 后面给出建议：${topic.action}`,
    trapType: '关键词漏听',
  },
  {
    slug: 'meeting-purpose',
    questionTypeId: 'long-conversation' as const,
    title: '长对话补充',
    prompt: (topic: Cet4ScaleTopicConfig) => `Why are the speakers discussing ${topic.topic.toLowerCase()}?`,
    correctOption: (topic: Cet4ScaleTopicConfig) => `They want to make it more useful through planning and feedback.`,
    correctSentence: (topic: Cet4ScaleTopicConfig) => `They are discussing ${topic.topic.toLowerCase()} because planning and feedback may make it more useful.`,
    explanation: () => '对话目的题需要综合 concern 和 suggestion，而不是只抓单词。',
    trapType: '主旨定位失败',
  },
  {
    slug: 'next-step',
    questionTypeId: 'long-conversation' as const,
    title: '长对话补充',
    prompt: () => 'What will the speakers probably do next?',
    correctOption: (topic: Cet4ScaleTopicConfig) => `Collect feedback and test whether the suggested action works.`,
    correctSentence: (topic: Cet4ScaleTopicConfig) => `They decide to collect feedback and test whether the suggested action works.`,
    explanation: () => 'next step 常出现在对话结尾，需要听最后的决定。',
    trapType: '结尾信息漏听',
  },
  {
    slug: 'passage-main',
    questionTypeId: 'listening-passage' as const,
    title: '听力篇章补充',
    prompt: (topic: Cet4ScaleTopicConfig) => `What is the passage mainly about?`,
    correctOption: (topic: Cet4ScaleTopicConfig) => `The value and limits of ${topic.topic.toLowerCase()}.`,
    correctSentence: (topic: Cet4ScaleTopicConfig) => `The passage discusses the value and limits of ${topic.topic.toLowerCase()}.`,
    explanation: () => '篇章主旨需要同时覆盖 benefit 和 concern。',
    trapType: '主旨定位失败',
  },
  {
    slug: 'passage-risk',
    questionTypeId: 'listening-passage' as const,
    title: '听力篇章补充',
    prompt: () => 'What risk does the speaker mention?',
    correctOption: (topic: Cet4ScaleTopicConfig) => topic.concern,
    correctSentence: (topic: Cet4ScaleTopicConfig) => `The speaker warns that ${topic.concern}.`,
    explanation: (topic: Cet4ScaleTopicConfig) => `warns that 后面是风险：${topic.concern}`,
    trapType: '细节偷换',
  },
  {
    slug: 'passage-solution',
    questionTypeId: 'listening-passage' as const,
    title: '听力篇章补充',
    prompt: () => 'What solution does the speaker support?',
    correctOption: (topic: Cet4ScaleTopicConfig) => topic.action,
    correctSentence: (topic: Cet4ScaleTopicConfig) => `The speaker supports a solution: to ${topic.action}.`,
    explanation: (topic: Cet4ScaleTopicConfig) => `solution 后的动作是：${topic.action}`,
    trapType: '关键词漏听',
  },
  {
    slug: 'evidence-purpose',
    questionTypeId: 'listening-passage' as const,
    title: '听力篇章补充',
    prompt: () => 'Why does the speaker mention evidence?',
    correctOption: () => 'To show that improvement should be checked with real results.',
    correctSentence: () => 'The speaker says improvement should be checked with real results rather than assumptions.',
    explanation: () => 'evidence 指向可验证的真实结果。',
    trapType: '同义替换未识别',
  },
  {
    slug: 'fairness-point',
    questionTypeId: 'listening-passage' as const,
    title: '听力篇章补充',
    prompt: () => 'What does the speaker say about fairness?',
    correctOption: (topic: Cet4ScaleTopicConfig) => `${topic.topic} should consider the needs of different groups.`,
    correctSentence: (topic: Cet4ScaleTopicConfig) => `The speaker says ${topic.topic.toLowerCase()} should consider the needs of different groups.`,
    explanation: () => 'fairness 常与 different groups 和 equal access 同义替换。',
    trapType: '同义替换未识别',
  },
  {
    slug: 'time-number',
    questionTypeId: 'short-news' as const,
    title: '短篇新闻补充',
    prompt: () => 'When will the pilot activity be reviewed?',
    correctOption: () => 'After three weeks of practice.',
    correctSentence: () => 'The pilot activity will be reviewed after three weeks of practice.',
    explanation: () => 'three weeks 是数字时间信息，容易与选项中的 three days 混淆。',
    trapType: '数字时间混淆',
  },
  {
    slug: 'speaker-attitude',
    questionTypeId: 'listening-passage' as const,
    title: '听力篇章补充',
    prompt: (topic: Cet4ScaleTopicConfig) => `What is the speaker's attitude toward ${topic.topic.toLowerCase()}?`,
    correctOption: () => 'Cautiously positive.',
    correctSentence: (topic: Cet4ScaleTopicConfig) => `The speaker is positive about the value of ${topic.topic.toLowerCase()}, but also points out its limits.`,
    explanation: () => '态度题中 positive 和 limits 组合为 cautiously positive。',
    trapType: '作者态度误判',
  },
  {
    slug: 'example-function',
    questionTypeId: 'long-conversation' as const,
    title: '长对话补充',
    prompt: () => 'Why does the speaker give an example?',
    correctOption: () => 'To make the suggestion easier to understand.',
    correctSentence: () => 'The speaker gives an example to make the suggestion easier to understand.',
    explanation: () => 'example 常用于解释建议或说明抽象观点。',
    trapType: '目的推断失败',
  },
  {
    slug: 'problem-cause',
    questionTypeId: 'long-conversation' as const,
    title: '长对话补充',
    prompt: () => 'What is one cause of the problem?',
    correctOption: () => 'People do not receive clear guidance or feedback.',
    correctSentence: () => 'One cause is that people do not receive clear guidance or feedback.',
    explanation: () => 'cause 定位原因，不要误选结果。',
    trapType: '因果定位失败',
  },
  {
    slug: 'result-detail',
    questionTypeId: 'short-news' as const,
    title: '短篇新闻补充',
    prompt: () => 'What result was reported after the trial?',
    correctOption: () => 'More users completed the task and understood the next step.',
    correctSentence: () => 'After the trial, more users completed the task and understood the next step.',
    explanation: () => 'result 后的 completed 和 understood 是两个并列结果。',
    trapType: '并列信息漏听',
  },
  {
    slug: 'contrast',
    questionTypeId: 'listening-passage' as const,
    title: '听力篇章补充',
    prompt: () => 'What contrast does the speaker make?',
    correctOption: () => 'Quick action is less useful than steady action with feedback.',
    correctSentence: () => 'The speaker contrasts quick action with steady action supported by feedback.',
    explanation: () => 'contrast 题要抓 A 与 B 的对比关系。',
    trapType: '转折信息漏听',
  },
  {
    slug: 'audience',
    questionTypeId: 'short-news' as const,
    title: '短篇新闻补充',
    prompt: () => 'Who is the activity mainly designed for?',
    correctOption: () => 'Students and residents who need practical support.',
    correctSentence: () => 'The activity is mainly designed for students and residents who need practical support.',
    explanation: () => 'audience 题定位 mainly designed for 后的人群。',
    trapType: '关键词漏听',
  },
  {
    slug: 'location',
    questionTypeId: 'short-news' as const,
    title: '短篇新闻补充',
    prompt: () => 'Where will the first session take place?',
    correctOption: () => 'In the community learning center.',
    correctSentence: () => 'The first session will take place in the community learning center.',
    explanation: () => 'location 题定位 take place in 后面的地点。',
    trapType: '地点信息漏听',
  },
  {
    slug: 'condition',
    questionTypeId: 'long-conversation' as const,
    title: '长对话补充',
    prompt: () => 'Under what condition will the plan continue?',
    correctOption: () => 'If feedback shows that the plan solves a real problem.',
    correctSentence: () => 'The plan will continue if feedback shows that it solves a real problem.',
    explanation: () => 'condition 题定位 if 从句。',
    trapType: '条件关系误判',
  },
  {
    slug: 'reservation',
    questionTypeId: 'long-conversation' as const,
    title: '长对话补充',
    prompt: () => 'What reservation does the speaker have?',
    correctOption: () => 'The plan may take more time than expected.',
    correctSentence: () => 'The speaker adds that the plan may take more time than expected.',
    explanation: () => 'reservation 表示保留意见，通常跟在 adds/however 后。',
    trapType: '转折信息漏听',
  },
  {
    slug: 'summary',
    questionTypeId: 'listening-passage' as const,
    title: '听力篇章补充',
    prompt: () => 'Which statement best summarizes the passage?',
    correctOption: () => 'Useful change requires clear goals, feedback, and regular review.',
    correctSentence: () => 'In summary, useful change requires clear goals, feedback, and regular review.',
    explanation: () => 'summary 题需要抓结尾概括句。',
    trapType: '主旨定位失败',
  },
  {
    slug: 'speaker-purpose',
    questionTypeId: 'listening-passage' as const,
    title: '听力篇章补充',
    prompt: () => "What is the speaker's main purpose?",
    correctOption: () => 'To explain how a familiar topic can be improved through evidence-based action.',
    correctSentence: () => 'The speaker aims to explain how a familiar topic can be improved through evidence-based action.',
    explanation: () => 'purpose 题关注 explain/argue/suggest 等表达目的的动词。',
    trapType: '目的推断失败',
  },
  {
    slug: 'follow-up',
    questionTypeId: 'short-news' as const,
    title: '短篇新闻补充',
    prompt: () => 'What follow-up will be arranged?',
    correctOption: () => 'A short survey and a review meeting.',
    correctSentence: () => 'A short survey and a review meeting will be arranged as follow-up.',
    explanation: () => 'follow-up 指后续安排，常与 survey、meeting 搭配。',
    trapType: '并列信息漏听',
  },
] as const;

const EXTENDED_LISTENING_ITEMS: Array<{
  id: string;
  questionTypeId: Cet4MockChoiceQuestion['questionTypeId'];
  title: string;
  prompt: string;
  correctAnswer: Choice;
  correctOption: string;
  correctSentence: string;
  explanation: string;
  trapType: string;
}> = [
  {
    id: 'news-campus-health-room',
    questionTypeId: 'short-news',
    title: '短篇新闻 8',
    prompt: 'What new service did the campus health center open?',
    correctAnswer: 'A',
    correctOption: 'A quiet room for stress management and short consultations.',
    correctSentence: 'The campus health center opened a quiet room for stress management and short consultations.',
    explanation: '短篇新闻定位 health center opened a quiet room，注意不要被 general sports service 干扰。',
    trapType: '关键信息漏听',
  },
  {
    id: 'news-local-bus-app',
    questionTypeId: 'short-news',
    title: '短篇新闻 9',
    prompt: 'Why was the local bus app updated?',
    correctAnswer: 'C',
    correctOption: 'To show arrival times more accurately.',
    correctSentence: 'The local bus app was updated to show arrival times more accurately.',
    explanation: 'updated to show arrival times more accurately 是原因和目的。',
    trapType: '因果定位失败',
  },
  {
    id: 'news-recycling-contest',
    questionTypeId: 'short-news',
    title: '短篇新闻 10',
    prompt: 'What did the recycling contest encourage students to do?',
    correctAnswer: 'B',
    correctOption: 'Separate waste and report weekly progress.',
    correctSentence: 'The recycling contest encouraged students to separate waste and report weekly progress.',
    explanation: 'separate waste 与 report weekly progress 是并列动作。',
    trapType: '细节偷换',
  },
  {
    id: 'news-museum-online-tour',
    questionTypeId: 'short-news',
    title: '短篇新闻 11',
    prompt: 'Who is the museum’s online tour mainly designed for?',
    correctAnswer: 'D',
    correctOption: 'Students who cannot visit the museum in person.',
    correctSentence: 'The online tour is designed for students who cannot visit the museum in person.',
    explanation: 'mainly designed for 后面直接给出目标人群。',
    trapType: '关键词漏听',
  },
  {
    id: 'conversation-library-project-1',
    questionTypeId: 'long-conversation',
    title: '长对话 5',
    prompt: 'What does the woman need for her library project?',
    correctAnswer: 'B',
    correctOption: 'Recent survey data about residents’ reading habits.',
    correctSentence: 'The woman needs recent survey data about residents’ reading habits for her library project.',
    explanation: 'recent survey data 是项目需要的具体材料。',
    trapType: '关键信息漏听',
  },
  {
    id: 'conversation-library-project-2',
    questionTypeId: 'long-conversation',
    title: '长对话 5',
    prompt: 'What does the man suggest she compare?',
    correctAnswer: 'A',
    correctOption: 'Online borrowing records and in-person visits.',
    correctSentence: 'He suggests comparing online borrowing records with in-person visits.',
    explanation: 'compare A with B 是听力中常见并列定位。',
    trapType: '细节偷换',
  },
  {
    id: 'conversation-health-campaign-1',
    questionTypeId: 'long-conversation',
    title: '长对话 6',
    prompt: 'What is the main problem with the health campaign?',
    correctAnswer: 'C',
    correctOption: 'Students know the posters but do not join the activities.',
    correctSentence: 'Many students know the posters but do not actually join the activities.',
    explanation: 'but 后面的 do not join the activities 是问题重点。',
    trapType: '转折信息漏听',
  },
  {
    id: 'conversation-health-campaign-2',
    questionTypeId: 'long-conversation',
    title: '长对话 6',
    prompt: 'What change will they try next week?',
    correctAnswer: 'D',
    correctOption: 'Holding ten-minute activities near the cafeteria.',
    correctSentence: 'They will try ten-minute activities near the cafeteria next week.',
    explanation: 'next week 与 near the cafeteria 是时间地点关键信息。',
    trapType: '数字时间混淆',
  },
  {
    id: 'conversation-online-course-1',
    questionTypeId: 'long-conversation',
    title: '长对话 7',
    prompt: 'Why did the student stop watching the online course?',
    correctAnswer: 'A',
    correctOption: 'The lessons were long and lacked short quizzes.',
    correctSentence: 'The student stopped because the lessons were long and there were no short quizzes.',
    explanation: 'because 后给出原因，long lessons 和 no quizzes 都不能漏。',
    trapType: '因果定位失败',
  },
  {
    id: 'conversation-online-course-2',
    questionTypeId: 'long-conversation',
    title: '长对话 7',
    prompt: 'What does the tutor recommend?',
    correctAnswer: 'C',
    correctOption: 'Taking notes and testing recall after each part.',
    correctSentence: 'The tutor recommends taking notes and testing recall after each part.',
    explanation: 'recommend 后是建议动作，注意 after each part。',
    trapType: '关键词漏听',
  },
  {
    id: 'conversation-student-budget-1',
    questionTypeId: 'long-conversation',
    title: '长对话 8',
    prompt: 'What is the student worried about?',
    correctAnswer: 'B',
    correctOption: 'The cost of buying too many learning resources.',
    correctSentence: 'The student is worried about the cost of buying too many learning resources.',
    explanation: 'cost 和 learning resources 是核心名词。',
    trapType: '关键词漏听',
  },
  {
    id: 'conversation-student-budget-2',
    questionTypeId: 'long-conversation',
    title: '长对话 8',
    prompt: 'What is the advisor’s first suggestion?',
    correctAnswer: 'D',
    correctOption: 'Use free library materials before paying for new courses.',
    correctSentence: 'The advisor first suggests using free library materials before paying for new courses.',
    explanation: 'first suggests 表示首要建议，before 结构给出顺序。',
    trapType: '细节偷换',
  },
  {
    id: 'passage-public-sports-1',
    questionTypeId: 'listening-passage',
    title: '听力篇章 6',
    prompt: 'Why do public sports facilities matter?',
    correctAnswer: 'A',
    correctOption: 'They make exercise accessible to more residents.',
    correctSentence: 'Public sports facilities make exercise accessible to more residents.',
    explanation: '主旨句中 accessible to more residents 对应正确选项。',
    trapType: '主旨定位失败',
  },
  {
    id: 'passage-public-sports-2',
    questionTypeId: 'listening-passage',
    title: '听力篇章 6',
    prompt: 'What problem may reduce the value of these facilities?',
    correctAnswer: 'C',
    correctOption: 'Poor maintenance and inconvenient locations.',
    correctSentence: 'Poor maintenance and inconvenient locations may reduce their value.',
    explanation: '两个并列问题都要听到。',
    trapType: '细节偷换',
  },
  {
    id: 'passage-digital-reading-1',
    questionTypeId: 'listening-passage',
    title: '听力篇章 7',
    prompt: 'What advantage of digital reading is mentioned?',
    correctAnswer: 'B',
    correctOption: 'Readers can access materials conveniently.',
    correctSentence: 'Digital reading allows readers to access materials conveniently.',
    explanation: 'allows readers to access materials conveniently 是优势。',
    trapType: '关键信息漏听',
  },
  {
    id: 'passage-digital-reading-2',
    questionTypeId: 'listening-passage',
    title: '听力篇章 7',
    prompt: 'What habit does the speaker recommend?',
    correctAnswer: 'D',
    correctOption: 'Taking notes and comparing key ideas after reading.',
    correctSentence: 'The speaker recommends taking notes and comparing key ideas after reading.',
    explanation: 'recommend 后面两个动作是答题重点。',
    trapType: '关键词漏听',
  },
  ...CET4_SCALE_TOPIC_CONFIGS.flatMap((topic, topicIndex) => {
    const answerCycle: Choice[] = ['A', 'B', 'C', 'D'];
    const newsAnswer = answerCycle[topicIndex % answerCycle.length];
    const conversationAnswerA = answerCycle[(topicIndex + 1) % answerCycle.length];
    const conversationAnswerB = answerCycle[(topicIndex + 2) % answerCycle.length];
    const passageAnswerA = answerCycle[(topicIndex + 3) % answerCycle.length];
    const passageAnswerB = answerCycle[(topicIndex + 1) % answerCycle.length];

    return [
      {
        id: `scale-news-${topic.slug}-benefit`,
        questionTypeId: 'short-news' as const,
        title: `短篇新闻扩展 ${topicIndex + 1}`,
        prompt: `What benefit of ${topic.topic.toLowerCase()} is reported?`,
        correctAnswer: newsAnswer,
        correctOption: topic.benefit,
        correctSentence: `The report says that ${topic.benefit}.`,
        explanation: `短篇新闻定位 says that 后面的核心信息：${topic.benefit}`,
        trapType: '关键信息漏听',
      },
      {
        id: `scale-conversation-${topic.slug}-concern`,
        questionTypeId: 'long-conversation' as const,
        title: `长对话扩展 ${topicIndex + 1}`,
        prompt: `What concern does the student mention about ${topic.topic.toLowerCase()}?`,
        correctAnswer: conversationAnswerA,
        correctOption: topic.concern,
        correctSentence: `The student mentions that ${topic.concern}.`,
        explanation: `长对话 concern 定位：${topic.concern}`,
        trapType: '转折信息漏听',
      },
      {
        id: `scale-conversation-${topic.slug}-action`,
        questionTypeId: 'long-conversation' as const,
        title: `长对话扩展 ${topicIndex + 1}`,
        prompt: 'What action does the advisor suggest?',
        correctAnswer: conversationAnswerB,
        correctOption: topic.action,
        correctSentence: `The advisor suggests that they should ${topic.action}.`,
        explanation: `advisor suggests 后面给出建议动作：${topic.action}`,
        trapType: '关键词漏听',
      },
      {
        id: `scale-passage-${topic.slug}-main`,
        questionTypeId: 'listening-passage' as const,
        title: `听力篇章扩展 ${topicIndex + 1}`,
        prompt: `What is the passage mainly about?`,
        correctAnswer: passageAnswerA,
        correctOption: `How ${topic.topic.toLowerCase()} can be useful when it is managed carefully.`,
        correctSentence: `The passage explains how ${topic.topic.toLowerCase()} can be useful when it is managed carefully.`,
        explanation: '篇章主旨需要综合 benefit、concern 和 action，而不是只抓单个词。',
        trapType: '主旨定位失败',
      },
      {
        id: `scale-passage-${topic.slug}-risk`,
        questionTypeId: 'listening-passage' as const,
        title: `听力篇章扩展 ${topicIndex + 1}`,
        prompt: 'What risk does the speaker warn against?',
        correctAnswer: passageAnswerB,
        correctOption: topic.concern,
        correctSentence: `The speaker warns that ${topic.concern}.`,
        explanation: `warns that 后面是风险信息：${topic.concern}`,
        trapType: '细节偷换',
      },
      {
        id: `scale-news-${topic.slug}-action`,
        questionTypeId: 'short-news' as const,
        title: `短篇新闻扩展 ${topicIndex + 31}`,
        prompt: `What action is recommended for ${topic.topic.toLowerCase()}?`,
        correctAnswer: answerCycle[(topicIndex + 2) % answerCycle.length],
        correctOption: topic.action,
        correctSentence: `The recommended action is to ${topic.action}.`,
        explanation: `recommended action 后面给出建议：${topic.action}`,
        trapType: '关键词漏听',
      },
      {
        id: `scale-passage-${topic.slug}-evidence`,
        questionTypeId: 'listening-passage' as const,
        title: `听力篇章扩展 ${topicIndex + 31}`,
        prompt: 'Why does the speaker mention evidence and feedback?',
        correctAnswer: answerCycle[(topicIndex + 3) % answerCycle.length],
        correctOption: 'To show that improvement should be checked with real results.',
        correctSentence: 'The speaker says that improvement should be checked with real results and feedback.',
        explanation: 'evidence and feedback 指向“用真实结果验证改进”。',
        trapType: '主旨定位失败',
      },
    ];
  }),
  ...CET4_SCALE_TOPIC_CONFIGS.flatMap((topic, topicIndex) => {
    const answerCycle: Choice[] = ['A', 'B', 'C', 'D'];
    return LISTENING_EXPANSION_SCENARIOS.map((scenario, scenarioIndex) => ({
      id: `scale-${scenario.questionTypeId}-${topic.slug}-${scenario.slug}`,
      questionTypeId: scenario.questionTypeId,
      title: `${scenario.title} ${topicIndex + 1}-${scenarioIndex + 1}`,
      prompt: scenario.prompt(topic),
      correctAnswer: answerCycle[(topicIndex + scenarioIndex) % answerCycle.length],
      correctOption: scenario.correctOption(topic),
      correctSentence: scenario.correctSentence(topic),
      explanation: scenario.explanation(topic),
      trapType: scenario.trapType,
    }));
  }),
];

export const CET4_LISTENING_PRACTICE_QUESTIONS: Cet4MockChoiceQuestion[] = [
  ...CET4_STANDARD_LISTENING_QUESTIONS,
  ...EXTENDED_LISTENING_ITEMS.map((item) => makeMockChoiceQuestion({
    ...item,
    moduleId: 'listening',
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

const WORD_BANK_EXPANSION_FRAMES = [
  {
    slug: 'meaning-clue',
    title: '选词填空释义线索',
    prompt: (item: VocabularyPracticeItem) =>
      `Choose the word or phrase that best matches this meaning: ${item.options[item.correctAnswer]}. Sentence clue: ${item.example}`,
    correctSentence: (item: VocabularyPracticeItem) => item.example,
    explanation: (item: VocabularyPracticeItem) =>
      `${item.word} 的核心释义是 ${item.options[item.correctAnswer]}，需要结合句内语义线索判断。`,
    trapType: '同义替换未识别',
  },
  {
    slug: 'collocation-clue',
    title: '选词填空搭配线索',
    prompt: (item: VocabularyPracticeItem) =>
      `Choose the best word or phrase for the collocation "${item.collocation}". Use the context to avoid a meaning-only guess.`,
    correctSentence: (item: VocabularyPracticeItem) => item.example,
    explanation: (item: VocabularyPracticeItem) =>
      `${item.collocation} 是本题搭配线索；不要只看中文意思，要判断词性和上下文是否匹配。`,
    trapType: '搭配错误',
  },
] as const;

export const CET4_WORD_BANK_PRACTICE_QUESTIONS: Cet4MockChoiceQuestion[] =
  CET4_VOCABULARY_BANK.slice(0, 1000).flatMap((item, itemIndex) => WORD_BANK_EXPANSION_FRAMES.map((frame, frameIndex) => makeMockChoiceQuestion({
    id: `practice-word-bank-${item.id.replace(/^vocab-/, '')}-${frame.slug}`,
    moduleId: 'reading',
    questionTypeId: 'word-bank',
    title: `${frame.title} ${itemIndex + 1}-${frameIndex + 1}`,
    prompt: frame.prompt(item),
    correctAnswer: (['A', 'B', 'C', 'D'] as Choice[])[(itemIndex + frameIndex) % 4],
    correctOption: item.word,
    correctSentence: frame.correctSentence(item),
    explanation: frame.explanation(item),
    trapType: frame.trapType,
  })));

const LONG_MATCHING_EXPANSION_FRAMES = [
  {
    slug: 'main-idea',
    title: '长篇匹配主旨',
    paragraphOffset: 0,
    prompt: (passage: Passage) => `introduces the main topic of "${passage.title}"`,
    explanation: '主旨匹配先看标题和段首总述，再排除只复现个别词的干扰项。',
  },
  {
    slug: 'contrast',
    title: '长篇匹配转折',
    paragraphOffset: 1,
    prompt: (passage: Passage) => `mentions a limitation, contrast, or problem in "${passage.title}"`,
    explanation: '转折题重点定位 however、still、risk、problem 等限制信息。',
  },
  {
    slug: 'action',
    title: '长篇匹配措施',
    paragraphOffset: 2,
    prompt: (passage: Passage) => `suggests an action, solution, or result for "${passage.title}"`,
    explanation: '措施题通常对应 should、need to、solution、action、therefore 等表达。',
  },
  {
    slug: 'detail',
    title: '长篇匹配细节',
    paragraphOffset: 3,
    prompt: (passage: Passage) => `contains a concrete detail or example from "${passage.title}"`,
    explanation: '细节匹配要回到段落内部找例子或具体说明，不能只凭主题词判断。',
  },
] as const;

function getPassageParagraphs(passage: Passage) {
  const paragraphs = passage.content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : [passage.content.replace(/\s+/g, ' ').trim()];
}

export const CET4_LONG_MATCHING_PRACTICE_QUESTIONS: Cet4MockChoiceQuestion[] =
  CET4_READING_BANK.flatMap((passage, passageIndex) => {
    const paragraphs = getPassageParagraphs(passage);

    return LONG_MATCHING_EXPANSION_FRAMES.map((frame, frameIndex) => {
      const paragraphIndex = Math.min(frame.paragraphOffset, paragraphs.length - 1);
      const paragraphLabel = String.fromCharCode(65 + paragraphIndex);
      const paragraphText = paragraphs[paragraphIndex];

      return makeMockChoiceQuestion({
        id: `practice-long-matching-${passage.id}-${frame.slug}`,
        moduleId: 'reading',
        questionTypeId: 'long-matching',
        title: `${frame.title} ${passageIndex + 1}-${frameIndex + 1}`,
        prompt: `Which paragraph best ${frame.prompt(passage)}?`,
        correctAnswer: (['A', 'B', 'C', 'D'] as Choice[])[(passageIndex + frameIndex) % 4],
        correctOption: `Paragraph ${paragraphLabel}`,
        correctSentence: `${paragraphLabel}. ${paragraphText.slice(0, 220)}`,
        explanation: `${frame.explanation} 定位段落 ${paragraphLabel}：${paragraphText.slice(0, 160)}`,
        trapType: frame.slug === 'contrast' ? '转折信息漏听' : '定位失准',
      });
    });
  });

export const CET4_CAREFUL_READING_PRACTICE_QUESTIONS: Cet4MockChoiceQuestion[] =
  CET4_READING_BANK.flatMap((passage, passageIndex) => passage.questions.map((question, questionIndex) => makeMockChoiceQuestion({
    id: `practice-careful-${passage.id}-${question.id}`,
    moduleId: 'reading',
    questionTypeId: 'careful-reading',
    title: `仔细阅读专项 ${passageIndex + 1}-${questionIndex + 1}`,
    prompt: question.question,
    correctAnswer: question.correctAnswer,
    correctOption: question.options[question.correctAnswer],
    correctSentence: question.correctSentence ?? passage.content.split(/[.!?。！？]/)[0] ?? passage.title,
    explanation: question.explanation,
    trapType: question.type,
  })));

export const CET4_READING_PRACTICE_QUESTIONS: Cet4MockChoiceQuestion[] = [
  ...CET4_STANDARD_READING_QUESTIONS,
  ...CET4_WORD_BANK_PRACTICE_QUESTIONS,
  ...CET4_LONG_MATCHING_PRACTICE_QUESTIONS,
  ...CET4_CAREFUL_READING_PRACTICE_QUESTIONS,
];

const CET4_GRAMMAR_STRUCTURE_ROWS = [
  ['grammar-to-review', '语法结构 1', 'Students are encouraged ___ their mistakes before the next quiz.', 'review', 'reviewing', 'to review', 'reviewed', 'C', 'be encouraged to do sth. 是固定结构。', '非谓语|固定搭配'],
  ['grammar-has-improved', '语法结构 2', 'Her listening ability ___ a lot since she started daily practice.', 'improves', 'has improved', 'improved', 'will improve', 'B', 'since 引导到现在的时间段，主句用现在完成时。', '时态|现在完成时'],
  ['grammar-was-organized', '语法结构 3', 'The online workshop ___ by the student union last Friday.', 'organizes', 'organized', 'was organized', 'has organizing', 'C', 'workshop 与 organize 是被动关系，last Friday 用一般过去时被动。', '被动语态|校园活动'],
  ['grammar-because-of', '语法结构 4', 'The meeting was postponed ___ heavy rain.', 'because', 'because of', 'although', 'so that', 'B', 'because of 后接名词短语 heavy rain。', '介词短语|原因表达'],
  ['grammar-fewer', '语法结构 5', 'After feedback, the class made ___ grammar mistakes in writing.', 'less', 'fewer', 'little', 'much', 'B', 'mistakes 是可数名词复数，用 fewer。', '数量词|可数名词'],
  ['grammar-which', '语法结构 6', 'The report ___ we discussed yesterday was based on survey data.', 'who', 'which', 'where', 'whose', 'B', '先行词 report 是物，定语从句中作宾语，用 which。', '定语从句|关系代词'],
  ['grammar-unless', '语法结构 7', 'You will not improve your pronunciation ___ you practice aloud.', 'unless', 'because', 'although', 'while', 'A', 'unless 表示“除非”，符合条件逻辑。', '条件状语从句|连接词'],
  ['grammar-in-order-to', '语法结构 8', 'She took notes carefully ___ remember the main ideas.', 'so that', 'in order to', 'because of', 'as soon as', 'B', 'in order to 后接动词原形，表示目的。', '目的表达|非谓语'],
  ['grammar-neither-nor', '语法结构 9', 'The answer is ___ accurate nor complete.', 'either', 'neither', 'both', 'not only', 'B', 'neither...nor... 表示“两者都不”。', '并列结构|固定搭配'],
  ['grammar-should-be-kept', '语法结构 10', 'Personal learning data should ___ safely.', 'keep', 'kept', 'be kept', 'keeping', 'C', 'data 与 keep 是被动关系，should 后接 be done。', '情态动词被动语态|数据安全'],
] as const;

export const CET4_GRAMMAR_PRACTICE_QUESTIONS: Cet4MockChoiceQuestion[] =
  CET4_GRAMMAR_STRUCTURE_ROWS.map(([id, title, prompt, optionA, optionB, optionC, optionD, answer, explanation, focus], index) => makeMockChoiceQuestion({
    id: `cet4-${id}`,
    moduleId: 'grammar',
    questionTypeId: 'grammar-structure',
    title,
    prompt,
    correctAnswer: answer as Choice,
    correctOption: ({ A: optionA, B: optionB, C: optionC, D: optionD } as Record<Choice, string>)[answer as Choice],
    correctSentence: `${prompt} (${focus})`,
    explanation,
    trapType: focus,
    wrongOptions: {
      A: optionA,
      B: optionB,
      C: optionC,
      D: optionD,
    },
  }));

const CLOZE_CONTEXT_FRAMES = [
  {
    slug: 'context-meaning',
    title: '完形填空语境线索',
    prompt: (item: VocabularyPracticeItem) =>
      `Complete the sentence with the most suitable word: The passage gives a context clue, so the best word is related to "${item.options[item.correctAnswer]}".`,
    explanation: (item: VocabularyPracticeItem) => `完形填空先看空格前后语境，再判断词义。该题线索对应 ${item.word}。`,
    trapType: '完形填空|词义语境',
  },
  {
    slug: 'collocation',
    title: '完形填空搭配线索',
    prompt: (item: VocabularyPracticeItem) =>
      `Choose the word that best completes this collocation in context: ${item.collocation}.`,
    explanation: (item: VocabularyPracticeItem) => `该空依赖固定搭配和语块记忆：${item.collocation}。`,
    trapType: '完形填空|搭配错误',
  },
  {
    slug: 'sentence-logic',
    title: '完形填空句际逻辑',
    prompt: (item: VocabularyPracticeItem) =>
      `The sentence before the blank says: "${item.example}" Which word best keeps the meaning consistent?`,
    explanation: (item: VocabularyPracticeItem) => `完形题不能只背中文释义，要根据前句语义保持一致。正确词是 ${item.word}。`,
    trapType: '完形填空|上下文逻辑',
  },
] as const;

export const CET4_CLOZE_PRACTICE_QUESTIONS: Cet4MockChoiceQuestion[] =
  CET4_VOCABULARY_BANK.slice(0, 600).flatMap((item, itemIndex) => CLOZE_CONTEXT_FRAMES.map((frame, frameIndex) => makeMockChoiceQuestion({
    id: `practice-cloze-${item.id.replace(/^vocab-/, '')}-${frame.slug}`,
    moduleId: 'grammar',
    questionTypeId: 'cloze-choice',
    title: `${frame.title} ${itemIndex + 1}-${frameIndex + 1}`,
    prompt: frame.prompt(item),
    correctAnswer: (['A', 'B', 'C', 'D'] as Choice[])[(itemIndex + frameIndex) % 4],
    correctOption: item.word,
    correctSentence: item.example,
    explanation: frame.explanation(item),
    trapType: frame.trapType,
  })));

const DEGREE_PRACTICAL_WRITING_CONFIGS = [
  {
    slug: 'lecture-notice',
    title: 'Lecture Notice',
    task: 'write a notice to inform students that a lecture on effective English reading will be held next Friday afternoon',
    sample:
      'Notice\nA lecture on effective English reading will be held in Room 302 next Friday afternoon. The speaker will introduce practical methods for locating key information and taking useful notes. All students who are preparing for the degree English exam are welcome to attend. Please arrive ten minutes early.',
    keywords: ['notice', 'lecture', 'reading', 'attend', 'time'],
  },
  {
    slug: 'application-study-room',
    title: 'Application for a Study Room',
    task: 'write an application asking to use a study room for a weekend exam-preparation group',
    sample:
      'Dear Sir or Madam,\nI am writing to apply for the use of a study room this weekend. Several classmates and I plan to prepare for the degree English exam together. We will review vocabulary, grammar, and reading passages quietly. We would be grateful if Room 204 is available on Saturday afternoon.',
    keywords: ['application', 'study room', 'weekend', 'prepare', 'available'],
  },
  {
    slug: 'invitation-reading-group',
    title: 'Invitation to a Reading Group',
    task: 'write an invitation to a classmate to join a weekly English reading group',
    sample:
      'Dear Li Hua,\nI would like to invite you to join our weekly English reading group. We meet every Wednesday evening to read short passages, discuss main ideas, and explain difficult sentences. I think the group will help us prepare for the reading part more efficiently. I hope you can come.',
    keywords: ['invitation', 'reading group', 'weekly', 'discuss', 'prepare'],
  },
  {
    slug: 'apology-postponed-meeting',
    title: 'Apology for a Postponed Meeting',
    task: 'write a short letter apologizing for postponing a meeting because of work arrangements',
    sample:
      'Dear Professor Wang,\nI am sorry that I have to postpone our meeting scheduled for this afternoon. An urgent work arrangement requires me to stay in the office longer than expected. Could we meet tomorrow evening instead? I apologize for the inconvenience and appreciate your understanding.',
    keywords: ['apology', 'postpone', 'meeting', 'work', 'understanding'],
  },
  {
    slug: 'suggestion-library-service',
    title: 'Suggestion Letter about Library Service',
    task: 'write a suggestion letter about improving evening library services for adult learners',
    sample:
      'Dear Library Manager,\nI am writing to suggest extending evening library services for adult learners. Many of us work during the day and can study only after dinner. If the reading room stays open one hour longer and online reservation is provided, more students will be able to prepare for exams effectively.',
    keywords: ['suggestion', 'library', 'adult learners', 'evening', 'service'],
  },
  {
    slug: 'thank-you-volunteer',
    title: 'Thank-You Letter to a Volunteer',
    task: 'write a thank-you letter to a volunteer who helped organize an exam-preparation workshop',
    sample:
      'Dear Zhang Ming,\nThank you for helping organize the exam-preparation workshop last Sunday. Your clear explanation of vocabulary and grammar methods was very useful to us. Many students said they became more confident after the workshop. We truly appreciate your time and support.',
    keywords: ['thank you', 'volunteer', 'workshop', 'grammar', 'support'],
  },
  {
    slug: 'request-reference-book',
    title: 'Request for a Reference Book',
    task: 'write a letter requesting the library to buy more copies of the reference textbook',
    sample:
      'Dear Librarian,\nI am writing to request more copies of the reference textbook for the degree English exam. At present, the available copies are not enough for students who need regular practice. If the library can provide several additional copies, it will greatly support our preparation.',
    keywords: ['request', 'reference textbook', 'library', 'copies', 'preparation'],
  },
  {
    slug: 'complaint-noise',
    title: 'Complaint about Noise',
    task: 'write a complaint about noise near the evening study room and ask for a solution',
    sample:
      'Dear Sir or Madam,\nI am writing to complain about the noise near the evening study room. Some activities in the hallway make it difficult for students to concentrate on reading and writing practice. Could you please remind users to keep quiet during study hours? Thank you for your attention.',
    keywords: ['complaint', 'noise', 'study room', 'concentrate', 'solution'],
  },
  {
    slug: 'recommend-method',
    title: 'Recommending a Study Method',
    task: 'write a short letter recommending active recall as an English learning method',
    sample:
      'Dear Chen,\nI recommend active recall for your English review. Instead of only reading notes, you can close the book and explain the main idea or grammar rule in your own words. This method helps you find weak points quickly and remember knowledge more firmly.',
    keywords: ['recommend', 'active recall', 'review', 'weak points', 'remember'],
  },
  {
    slug: 'arrangement-mock-test',
    title: 'Arrangement for a Mock Test',
    task: 'write a notice arranging a 120-minute degree English mock test',
    sample:
      'Notice\nA 120-minute degree English mock test will be held this Saturday morning in Room 105. The test includes vocabulary and structure, use of English, reading comprehension, and writing. Please bring your student card and arrive before 8:50. No textbooks or notes are allowed.',
    keywords: ['mock test', '120-minute', 'vocabulary', 'writing', 'closed-book'],
  },
  {
    slug: 'lost-card',
    title: 'Lost Student Card Notice',
    task: 'write a notice about losing a student card and asking the finder to contact you',
    sample:
      'Lost\nI lost my student card in the library reading room yesterday evening. The card is important because I need it for the coming exam. If you find it, please contact me at 13800000000 or leave it at the library desk. Thank you very much.',
    keywords: ['lost', 'student card', 'library', 'contact', 'exam'],
  },
  {
    slug: 'leave-request',
    title: 'Leave Request',
    task: 'write a short leave request because you need to attend an important family matter',
    sample:
      'Dear Teacher,\nI am writing to ask for leave this Friday evening because I need to attend an important family matter. I will review the missed lesson by reading the materials and asking classmates for notes. I am sorry for the inconvenience and hope you can approve my request.',
    keywords: ['leave request', 'family matter', 'review', 'approve', 'inconvenience'],
  },
] as const;

const DEGREE_SUMMARY_COMMENT_CONFIGS = [
  {
    slug: 'adult-learning',
    title: 'Adult Learning and Time Management',
    article: 'an article about adult learners using small daily tasks to prepare for exams while working',
    comment: 'explain why a realistic schedule is more useful than sudden long study sessions',
    sample:
      'The article says that adult learners often prepare for exams while working and taking care of families. Small daily tasks, such as reviewing one grammar point or reading one short passage, can help them continue learning. In my view, a realistic schedule is more useful than sudden long study sessions because it builds a stable habit.',
    keywords: ['adult learners', 'schedule', 'small tasks', 'habit', 'exam'],
  },
  {
    slug: 'public-services',
    title: 'Digital Public Services',
    article: 'an article about digital public services and the need to keep offline help for some residents',
    comment: 'comment on how technology and human support should work together',
    sample:
      'The article points out that digital public services can save time, but some residents still need face-to-face help. Clear instructions and offline support are necessary. I agree with this view because technology should make services easier to use, not leave people behind.',
    keywords: ['digital services', 'offline help', 'residents', 'support', 'fairness'],
  },
  {
    slug: 'reading-habits',
    title: 'Building Reading Habits',
    article: 'an article about building reading habits through short passages, notes, and regular review',
    comment: 'comment on why reading should be connected with thinking and output',
    sample:
      'The article explains that good reading habits come from regular practice, useful notes, and review. Readers should not only finish pages, but also think about main ideas. I believe reading becomes more valuable when it is connected with speaking or writing output.',
    keywords: ['reading habits', 'notes', 'review', 'thinking', 'output'],
  },
  {
    slug: 'cultural-memory',
    title: 'Protecting Local Culture',
    article: 'an article about using interviews and digital exhibitions to protect local cultural memory',
    comment: 'comment on why cultural protection should respect local people',
    sample:
      'The article describes how interviews, old photos, and online exhibitions can help protect local culture. It also warns that culture should not become a simple tourist show. I think real protection must respect local people because they keep traditions alive in daily life.',
    keywords: ['local culture', 'interviews', 'tradition', 'respect', 'protection'],
  },
  {
    slug: 'environmental-action',
    title: 'Environmental Action on Campus',
    article: 'an article about reducing waste on campus through smaller portions and visible weekly reports',
    comment: 'comment on why small actions need measurable results',
    sample:
      'The article says that campus waste can be reduced by smaller portions and weekly reports. These actions make students see the result of their choices. In my opinion, small environmental actions are more effective when results are measured and shared regularly.',
    keywords: ['environment', 'waste', 'campus', 'measure', 'results'],
  },
  {
    slug: 'online-learning',
    title: 'Online Learning and Feedback',
    article: 'an article about online learning tools that provide quizzes, feedback, and review reminders',
    comment: 'comment on why feedback is necessary in independent learning',
    sample:
      'The article argues that online learning tools should include quizzes, feedback, and review reminders. Watching videos alone is not enough. I agree because feedback helps learners find problems and correct them before the same mistakes become habits.',
    keywords: ['online learning', 'feedback', 'quiz', 'review', 'mistakes'],
  },
  {
    slug: 'community-library',
    title: 'Community Libraries',
    article: 'an article about community libraries offering digital courses and study rooms for residents',
    comment: 'comment on the value of libraries in lifelong learning',
    sample:
      'The article introduces community libraries that provide digital courses, study rooms, and internet access. These services help residents continue learning outside formal schools. I believe libraries are important in lifelong learning because they make knowledge more accessible.',
    keywords: ['community library', 'digital courses', 'study rooms', 'lifelong learning', 'accessible'],
  },
  {
    slug: 'mental-health',
    title: 'Mental Health and Study',
    article: 'an article about how sleep, exercise, and communication can reduce exam pressure',
    comment: 'comment on why mental health matters in exam preparation',
    sample:
      'The article explains that sleep, exercise, and communication can reduce exam pressure. Students who ignore mental health may study for many hours but perform poorly. I think mental health matters because a calm mind helps learners concentrate and use knowledge effectively.',
    keywords: ['mental health', 'sleep', 'exercise', 'pressure', 'concentrate'],
  },
  {
    slug: 'volunteer-service',
    title: 'Volunteer Service',
    article: 'an article about students helping older residents use digital services',
    comment: 'comment on what students can learn from volunteer service',
    sample:
      'The article tells us that students can help older residents use digital services. Through this activity, students learn communication and social responsibility. In my view, volunteer service is meaningful because it connects language learning with real community needs.',
    keywords: ['volunteer service', 'older residents', 'digital services', 'communication', 'responsibility'],
  },
  {
    slug: 'transport',
    title: 'Public Transport',
    article: 'an article about improving public transport to reduce traffic pressure and support local development',
    comment: 'comment on why public transport planning should consider different groups',
    sample:
      'The article says that public transport can reduce traffic pressure and support local development. However, planning should consider workers, students, and older residents. I agree because a transport system is useful only when different groups can use it conveniently.',
    keywords: ['public transport', 'traffic', 'planning', 'residents', 'convenient'],
  },
  {
    slug: 'smart-devices',
    title: 'Smart Devices in Study',
    article: 'an article about smart devices helping students record tasks but also causing distraction',
    comment: 'comment on how students should use smart devices wisely',
    sample:
      'The article states that smart devices can help students record tasks and review words, but they may also cause distraction. I think students should set a clear purpose before using devices. Technology is useful only when it supports attention rather than breaks it.',
    keywords: ['smart devices', 'study', 'tasks', 'distraction', 'purpose'],
  },
  {
    slug: 'food-safety',
    title: 'Food Safety Awareness',
    article: 'an article about schools improving food safety through clear labels and regular checks',
    comment: 'comment on why public awareness is as important as rules',
    sample:
      'The article discusses food safety measures such as clear labels and regular checks. These rules are important, but public awareness also matters. In my opinion, people can protect health better when they understand the reasons behind safety rules.',
    keywords: ['food safety', 'labels', 'checks', 'awareness', 'health'],
  },
] as const;

export const DEGREE_ENGLISH_WRITING_PROMPT_BANK: Cet4SubjectivePrompt[] = [
  ...DEGREE_PRACTICAL_WRITING_CONFIGS.map((item, index) => ({
    id: `degree-practical-writing-${item.slug}`,
    moduleId: 'writing' as const,
    questionTypeId: 'short-essay' as const,
    title: item.title,
    prompt: `Directions: Write about 100 words based on the following situation. Punctuation is not counted. Please ${item.task}.`,
    plannedMinutes: 20,
    minWords: 100,
    keywords: [...item.keywords],
    syllabusFocus: ['学位英语小作文', '通知/申请/信函', '约100词'],
    sampleAnswer: item.sample,
  })),
  ...DEGREE_SUMMARY_COMMENT_CONFIGS.map((item) => ({
    id: `degree-summary-comment-${item.slug}`,
    moduleId: 'writing' as const,
    questionTypeId: 'short-essay' as const,
    title: item.title,
    prompt: `Directions: Read a 200-250-word English article about ${item.article}. Write about 120 words to summarize the main idea and ${item.comment}. Punctuation is not counted.`,
    plannedMinutes: 25,
    minWords: 120,
    keywords: [...item.keywords],
    syllabusFocus: ['学位英语大作文', '概括文章大意', '适当评论', '约120词'],
    sampleAnswer: item.sample,
  })),
];

const WRITING_EXPANSION_FRAMES = [
  {
    slug: 'advantages-limits',
    title: 'Advantages and Limits',
    focus: '利弊分析',
    prompt: (topic: Cet4ScaleTopicConfig) => `the advantages and possible limits of ${topic.topic.toLowerCase()}`,
    instruction: 'You should discuss one benefit, one possible problem, and your own suggestion.',
    sample: (topic: Cet4ScaleTopicConfig) =>
      `${topic.topic} has clear advantages because ${topic.benefit}. However, we should also notice that ${topic.concern}. In my view, a practical way forward is to ${topic.action}. Only when benefits and limits are both considered can this topic create lasting value.`,
  },
  {
    slug: 'personal-action',
    title: 'Personal Action',
    focus: '个人行动',
    prompt: (topic: Cet4ScaleTopicConfig) => `what college students can do about ${topic.topic.toLowerCase()}`,
    instruction: 'You should give two practical actions and explain their value.',
    sample: (topic: Cet4ScaleTopicConfig) =>
      `College students can take practical action in relation to ${topic.topic.toLowerCase()}. First, they can learn key information and explain it clearly to others. Second, they can ${topic.action}. These actions matter because ${topic.benefit}, and they also help students build responsibility.`,
  },
  {
    slug: 'public-awareness',
    title: 'Public Awareness',
    focus: '社会意识',
    prompt: (topic: Cet4ScaleTopicConfig) => `the importance of public awareness in ${topic.topic.toLowerCase()}`,
    instruction: 'You should explain why awareness matters and how it can be improved.',
    sample: (topic: Cet4ScaleTopicConfig) =>
      `Public awareness is important in ${topic.topic.toLowerCase()} because people make better choices when they understand the reason behind an action. Without awareness, ${topic.concern}. Therefore, schools and communities should use clear examples and feedback to help people take part.`,
  },
  {
    slug: 'technology-role',
    title: 'The Role of Technology',
    focus: '科技应用',
    prompt: (topic: Cet4ScaleTopicConfig) => `how technology can support ${topic.topic.toLowerCase()}`,
    instruction: 'You should mention one useful function and one risk.',
    sample: (topic: Cet4ScaleTopicConfig) =>
      `Technology can support ${topic.topic.toLowerCase()} by making information easier to collect, share, and review. For example, digital tools can show whether ${topic.benefit}. The risk is that users may focus only on speed and ignore real needs. Technology should serve thinking, not replace it.`,
  },
  {
    slug: 'problem-solution-extended',
    title: 'A Realistic Solution',
    focus: '问题解决',
    prompt: (topic: Cet4ScaleTopicConfig) => `a realistic solution to a problem in ${topic.topic.toLowerCase()}`,
    instruction: 'You should describe the problem, propose a solution, and explain how to check the result.',
    sample: (topic: Cet4ScaleTopicConfig) =>
      `A realistic problem in ${topic.topic.toLowerCase()} is that ${topic.concern}. This problem cannot be solved by slogans alone. A better solution is to ${topic.action}. After that, the result should be checked with feedback so that the solution can be adjusted in time.`,
  },
  {
    slug: 'community-benefit',
    title: 'Community Benefit',
    focus: '公共利益',
    prompt: (topic: Cet4ScaleTopicConfig) => `how ${topic.topic.toLowerCase()} can benefit a community`,
    instruction: 'You should explain the benefit and give an example.',
    sample: (topic: Cet4ScaleTopicConfig) =>
      `${topic.topic} can benefit a community when it is planned according to real needs. The main benefit is that ${topic.benefit}. For example, a local project can invite residents to give feedback and then improve the service step by step. This makes the benefit visible and reliable.`,
  },
  {
    slug: 'student-example',
    title: 'A Student Example',
    focus: '举例说明',
    prompt: (topic: Cet4ScaleTopicConfig) => `a student example related to ${topic.topic.toLowerCase()}`,
    instruction: 'You should describe one example and explain what it shows.',
    sample: (topic: Cet4ScaleTopicConfig) =>
      `A student example can show the value of ${topic.topic.toLowerCase()}. If a student joins a project and helps to ${topic.action}, he or she can connect classroom knowledge with real practice. This example shows that learning becomes deeper when students test ideas in real situations.`,
  },
  {
    slug: 'balanced-view',
    title: 'A Balanced View',
    focus: '平衡观点',
    prompt: (topic: Cet4ScaleTopicConfig) => `a balanced view of ${topic.topic.toLowerCase()}`,
    instruction: 'You should avoid a one-sided answer and support your opinion with reasons.',
    sample: (topic: Cet4ScaleTopicConfig) =>
      `A balanced view of ${topic.topic.toLowerCase()} should include both value and risk. On the one hand, ${topic.benefit}. On the other hand, ${topic.concern}. I believe the key is to ${topic.action}, because careful action can turn a familiar idea into real improvement.`,
  },
] as const;

export const CET4_WRITING_PROMPT_BANK: Cet4SubjectivePrompt[] = [
  {
    id: 'writing-consistent-practice',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'The Value of Consistent Practice',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on the value of consistent practice in English learning. You should include a clear opinion, reasons, and examples.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['practice', 'consistent', 'feedback', 'example', 'improve'],
    syllabusFocus: ['熟悉主题发表观点', '中心思想明确', '不少于120词'],
    sampleAnswer:
      'Consistent practice is valuable in English learning because it turns knowledge into real ability. If students only read explanations, they may feel familiar with words but fail to use them in an exam. For example, writing one short paragraph every day and checking mistakes can help learners improve expression gradually.',
  },
  {
    id: 'writing-campus-volunteering',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Campus Volunteering',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on whether college students should participate in campus volunteering. You should state your view and give at least one example.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['participate', 'volunteer', 'responsibility', 'communication', 'community'],
    syllabusFocus: ['熟悉校园话题', '观点与例子', '语意连贯'],
    sampleAnswer:
      'College students should participate in campus volunteering because it connects learning with real social needs. A student who helps organize a book donation activity can improve communication skills and understand responsibility more clearly. Volunteering should not replace study, but it can become a useful part of personal growth.',
  },
  {
    id: 'writing-digital-tools',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Using Digital Tools Wisely',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on how students can use digital tools wisely. You should discuss both benefits and possible risks.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['digital tools', 'benefit', 'privacy', 'distraction', 'strategy'],
    syllabusFocus: ['说明与讨论', '对比关系', '科技与学习话题'],
    sampleAnswer:
      'Digital tools can benefit students when they are used with a clear purpose. For example, a vocabulary app can remind learners to review difficult words. However, students should also avoid distraction and protect their privacy. The best strategy is to use technology as a support for thinking rather than a replacement for it.',
  },
  {
    id: 'writing-sustainable-campus',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'A Sustainable Campus',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on how students can help build a sustainable campus. You should include practical actions and their impact.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['sustainable', 'environment', 'waste', 'transport', 'impact'],
    syllabusFocus: ['环境主题', '原因与结果', '行动建议'],
    sampleAnswer:
      'Students can help build a sustainable campus through small but regular actions. They can reduce food waste, choose public transport, and reuse learning materials. These habits may seem simple, but they can lower pollution and make environmental responsibility visible in daily life.',
  },
  {
    id: 'writing-time-management',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Time Management for College Students',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on the importance of time management for college students. You should explain the problem and suggest one method.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['time management', 'schedule', 'priority', 'efficient', 'review'],
    syllabusFocus: ['个人经历与建议', '问题解决', '学习策略'],
    sampleAnswer:
      'Time management is important because college students often face several tasks at the same time. Without a clear schedule, they may spend many hours studying but still miss important review. A practical method is to set priorities each morning and leave short periods for active recall.',
  },
  {
    id: 'writing-public-services',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Improving Public Services with Technology',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on how technology can improve public services. You should mention one benefit and one concern.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['public services', 'accessible', 'reliable', 'privacy', 'offline support'],
    syllabusFocus: ['社会发展话题', '利弊分析', '观点表达'],
    sampleAnswer:
      'Technology can make public services more accessible. Residents may book appointments or check information without traveling a long distance. At the same time, public platforms must protect personal data and keep offline support for people who are not comfortable with apps.',
  },
  {
    id: 'writing-reading-habits',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Developing Good Reading Habits',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on how college students can develop good reading habits. You should give practical suggestions.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['reading habits', 'schedule', 'notes', 'reflect', 'knowledge'],
    syllabusFocus: ['学习策略', '建议表达', '篇章连贯'],
    sampleAnswer:
      'Good reading habits are built through regular practice rather than sudden effort. Students can set a weekly reading schedule, take notes on key ideas, and reflect on what they have learned. These practical steps help them turn reading into a lasting source of knowledge.',
  },
  {
    id: 'writing-food-waste',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Reducing Food Waste on Campus',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on reducing food waste on campus. You should explain why it matters and what students can do.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['food waste', 'reduce', 'responsibility', 'environment', 'measure'],
    syllabusFocus: ['环境主题', '原因与措施', '校园生活'],
    sampleAnswer:
      'Reducing food waste on campus is important because it saves resources and shows social responsibility. Students can choose smaller portions, take only what they need, and support campaigns that make waste visible. Small measures can have a meaningful environmental impact.',
  },
  {
    id: 'writing-mental-health',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Paying Attention to Mental Health',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on why college students should pay attention to mental health. You should include one example.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['mental health', 'pressure', 'support', 'habit', 'balance'],
    syllabusFocus: ['校园生活', '观点表达', '举例说明'],
    sampleAnswer:
      'College students should pay attention to mental health because pressure can affect both study and daily life. For example, a student who feels anxious before exams may perform poorly even after long preparation. Regular exercise, enough sleep, and timely support can help students keep a better balance.',
  },
  {
    id: 'writing-public-transport',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'The Value of Public Transport',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on the value of public transport in city life. You should discuss its benefits and one possible problem.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['public transport', 'urban', 'convenient', 'pollution', 'policy'],
    syllabusFocus: ['社会发展', '利弊分析', '城市主题'],
    sampleAnswer:
      'Public transport plays an important role in city life. It makes travel more convenient, reduces traffic pressure, and can lower pollution. However, if routes are poorly planned, some residents may still find it difficult to use. A fair transport policy should consider different communities.',
  },
  {
    id: 'writing-cultural-heritage',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Protecting Cultural Heritage',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on protecting cultural heritage. You should explain why it is important and how young people can help.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['cultural heritage', 'protect', 'tradition', 'young people', 'history'],
    syllabusFocus: ['中国文化', '重要性说明', '行动建议'],
    sampleAnswer:
      'Protecting cultural heritage is important because it connects people with history and local identity. Young people can help by learning traditional skills, visiting museums, and introducing cultural stories in modern ways. Protection should not only preserve old things, but also keep their meaning alive.',
  },
  {
    id: 'writing-teamwork',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Teamwork in College Study',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on the importance of teamwork in college study. You should state your view and give reasons.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['teamwork', 'communicate', 'cooperate', 'responsibility', 'project'],
    syllabusFocus: ['校园学习', '观点论证', '原因表达'],
    sampleAnswer:
      'Teamwork is important in college study because many tasks require communication and cooperation. In a group project, students can share information, divide work, and learn from different perspectives. Good teamwork also teaches responsibility, which is useful beyond the classroom.',
  },
  {
    id: 'writing-online-privacy',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Protecting Online Privacy',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on how students can protect online privacy. You should include at least two practical methods.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['online privacy', 'personal information', 'device', 'protect', 'habit'],
    syllabusFocus: ['科技应用', '方法建议', '安全主题'],
    sampleAnswer:
      'Students should protect online privacy when using digital services. They can avoid sharing personal information on unknown platforms, use strong passwords, and log out of shared devices. These habits are simple, but they reduce risk and make online learning safer.',
  },
  {
    id: 'writing-rural-tourism',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Rural Tourism',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on rural tourism. You should discuss how it can benefit local communities and what should be protected.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['rural tourism', 'local community', 'economic', 'environment', 'culture'],
    syllabusFocus: ['社会发展', '文化环境', '平衡观点'],
    sampleAnswer:
      'Rural tourism can bring economic opportunities to local communities by creating jobs and attracting visitors. It can also help people learn about local culture. However, development should protect the environment and avoid turning traditions into simple performances.',
  },
  {
    id: 'writing-independent-learning',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Independent Learning',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on independent learning. You should explain what students need in order to learn independently.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['independent learning', 'goal', 'method', 'feedback', 'self-discipline'],
    syllabusFocus: ['学习能力', '条件说明', '观点表达'],
    sampleAnswer:
      'Independent learning requires clear goals, effective methods, and self-discipline. Students should not only collect resources, but also test whether they truly understand them. Feedback is also necessary because it helps learners identify problems and adjust their plans.',
  },
  {
    id: 'writing-community-service',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Community Service',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on community service. You should explain what students can learn from it.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['community service', 'local', 'responsibility', 'communicate', 'practical'],
    syllabusFocus: ['社会实践', '个人成长', '举例说明'],
    sampleAnswer:
      'Community service gives students a chance to understand local needs. By helping older residents use digital services or organizing a reading activity, students can improve communication skills and develop responsibility. Such practical experience makes learning more meaningful.',
  },
  {
    id: 'writing-exam-preparation',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'Effective Exam Preparation',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on effective exam preparation. You should discuss accuracy, speed, and review.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['exam preparation', 'accuracy', 'speed', 'review', 'strategy'],
    syllabusFocus: ['备考策略', '并列结构', '学习方法'],
    sampleAnswer:
      'Effective exam preparation should balance accuracy, speed, and review. Students need to understand why an answer is correct, practice under time limits, and review mistakes at proper intervals. A good strategy can make effort more focused and measurable.',
  },
  {
    id: 'writing-ai-feedback',
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    title: 'AI Feedback in Learning',
    prompt: 'Directions: For this part, you are allowed 30 minutes to write a short essay on AI feedback in learning. You should discuss how to use it properly.',
    plannedMinutes: 30,
    minWords: 120,
    keywords: ['AI feedback', 'mistake', 'evidence', 'improve', 'copying'],
    syllabusFocus: ['科技与学习', '利弊分析', '建议表达'],
    sampleAnswer:
      'AI feedback can help students notice mistakes and receive specific suggestions. However, learners should not copy suggested answers without thinking. A better way is to compare the feedback with their own work, revise actively, and use evidence from practice to improve.',
  },
  ...CET4_SCALE_TOPIC_CONFIGS.flatMap((topic) => ([
    {
      id: `writing-scale-${topic.slug}-opinion`,
      moduleId: 'writing' as const,
      questionTypeId: 'short-essay' as const,
      title: `${topic.title}: Opinion`,
      prompt: `Directions: For this part, you are allowed 30 minutes to write a short essay on the value of ${topic.topic.toLowerCase()}. You should state your view and give reasons.`,
      plannedMinutes: 30,
      minWords: 120,
      keywords: topic.keywords,
      syllabusFocus: [topic.themeTag, '观点表达', '原因论证'],
      sampleAnswer:
        `${topic.topic} is valuable because ${topic.benefit}. However, this value cannot be achieved automatically. ${topic.concern}. In my view, students and communities should ${topic.action}. In this way, the topic can create practical and measurable improvement.`,
    },
    {
      id: `writing-scale-${topic.slug}-problem-solution`,
      moduleId: 'writing' as const,
      questionTypeId: 'short-essay' as const,
      title: `${topic.title}: Problem and Solution`,
      prompt: `Directions: For this part, you are allowed 30 minutes to write a short essay on one problem related to ${topic.topic.toLowerCase()} and one possible solution.`,
      plannedMinutes: 30,
      minWords: 120,
      keywords: topic.keywords,
      syllabusFocus: [topic.themeTag, '问题解决', '建议表达'],
      sampleAnswer:
        `One problem related to ${topic.topic.toLowerCase()} is that ${topic.concern}. This problem matters because it may weaken the real value of a useful idea. A practical solution is to ${topic.action}. If the result is checked regularly, the solution will be more reliable.`,
    },
    {
      id: `writing-scale-${topic.slug}-example`,
      moduleId: 'writing' as const,
      questionTypeId: 'short-essay' as const,
      title: `${topic.title}: Example`,
      prompt: `Directions: For this part, you are allowed 30 minutes to write a short essay on how ${topic.topic.toLowerCase()} can influence students or local communities. You should include an example.`,
      plannedMinutes: 30,
      minWords: 120,
      keywords: topic.keywords,
      syllabusFocus: [topic.themeTag, '举例说明', '影响表达'],
      sampleAnswer:
        `${topic.topic} can influence students and local communities in a practical way. For example, when people ${topic.action}, they can see whether the activity really helps. The main benefit is that ${topic.benefit}. This example shows that careful planning is more useful than a temporary slogan.`,
    },
    ...WRITING_EXPANSION_FRAMES.map((frame) => ({
      id: `writing-scale-${topic.slug}-${frame.slug}`,
      moduleId: 'writing' as const,
      questionTypeId: 'short-essay' as const,
      title: `${topic.title}: ${frame.title}`,
      prompt: `Directions: For this part, you are allowed 30 minutes to write a short essay on ${frame.prompt(topic)}. ${frame.instruction}`,
      plannedMinutes: 30,
      minWords: 120,
      keywords: topic.keywords,
      syllabusFocus: [topic.themeTag, frame.focus, '不少于120词'],
      sampleAnswer: frame.sample(topic),
    })),
  ])),
  ...DEGREE_ENGLISH_WRITING_PROMPT_BANK,
];

const TRANSLATION_EXPANSION_FRAMES = [
  {
    slug: 'public-service',
    suffix: '公共服务',
    focus: '公共服务',
    prompt: (topic: Cet4ScaleTopicConfig) =>
      `请将下面这段中文翻译成英文：${topic.cnTitle}正在成为公共服务和日常生活中的重要话题。它可以帮助人们更方便地获得资源，也能促进不同群体之间的交流。为了发挥长期作用，相关服务需要清晰的规则和持续的反馈。`,
    sample: (topic: Cet4ScaleTopicConfig) =>
      `${topic.topic} is becoming an important topic in public services and daily life. It can help people obtain resources more conveniently and promote communication among different groups. To play a long-term role, related services need clear rules and continuous feedback.`,
  },
  {
    slug: 'campus-practice',
    suffix: '校园实践',
    focus: '校园生活',
    prompt: (topic: Cet4ScaleTopicConfig) =>
      `请将下面这段中文翻译成英文：在大学校园里，${topic.cnTitle}不仅是一个学习话题，也是一种可以实践的能力。学生可以通过小组活动、调查和反思记录，把课堂知识转化为真实经验。`,
    sample: (topic: Cet4ScaleTopicConfig) =>
      `On a college campus, ${topic.topic.toLowerCase()} is not only a learning topic, but also an ability that can be practiced. Through group activities, surveys, and reflection records, students can turn classroom knowledge into real experience.`,
  },
  {
    slug: 'culture-society',
    suffix: '文化与社会',
    focus: '中国文化与社会发展',
    prompt: (topic: Cet4ScaleTopicConfig) =>
      `请将下面这段中文翻译成英文：${topic.cnTitle}的发展反映了社会生活的变化。人们越来越重视效率、公平和文化价值之间的平衡。只有尊重真实需求，新的做法才能被更多人理解和接受。`,
    sample: (topic: Cet4ScaleTopicConfig) =>
      `The development of ${topic.topic.toLowerCase()} reflects changes in social life. People are paying more attention to the balance among efficiency, fairness, and cultural value. Only by respecting real needs can new practices be understood and accepted by more people.`,
  },
  {
    slug: 'technology-feedback',
    suffix: '科技与反馈',
    focus: '科技应用',
    prompt: (topic: Cet4ScaleTopicConfig) =>
      `请将下面这段中文翻译成英文：数字技术为${topic.cnTitle}提供了新的工具。通过收集数据和用户反馈，管理者可以更快地发现问题并改进服务。但技术的使用必须保护个人信息。`,
    sample: (topic: Cet4ScaleTopicConfig) =>
      `Digital technology provides new tools for ${topic.topic.toLowerCase()}. By collecting data and user feedback, managers can find problems and improve services more quickly. However, the use of technology must protect personal information.`,
  },
  {
    slug: 'long-term-development',
    suffix: '长期发展',
    focus: '社会发展',
    prompt: (topic: Cet4ScaleTopicConfig) =>
      `请将下面这段中文翻译成英文：推进${topic.cnTitle}不能只看短期效果。更重要的是，要建立长期机制，定期评估结果，并根据实际情况调整措施。这样才能让发展更加稳定和可靠。`,
    sample: (topic: Cet4ScaleTopicConfig) =>
      `Promoting ${topic.topic.toLowerCase()} should not focus only on short-term effects. More importantly, a long-term mechanism should be established, results should be evaluated regularly, and measures should be adjusted according to real situations. In this way, development can become more stable and reliable.`,
  },
  {
    slug: 'youth-role',
    suffix: '青年作用',
    focus: '青年与社会',
    prompt: (topic: Cet4ScaleTopicConfig) =>
      `请将下面这段中文翻译成英文：青年人在${topic.cnTitle}中可以发挥积极作用。他们熟悉新技术，也愿意参与社区活动。如果能够把热情和专业知识结合起来，他们就能为社会带来实际改变。`,
    sample: (topic: Cet4ScaleTopicConfig) =>
      `Young people can play an active role in ${topic.topic.toLowerCase()}. They are familiar with new technology and are willing to take part in community activities. If they combine enthusiasm with professional knowledge, they can bring practical changes to society.`,
  },
  {
    slug: 'problem-and-action',
    suffix: '问题与行动',
    focus: '问题解决',
    prompt: (topic: Cet4ScaleTopicConfig) =>
      `请将下面这段中文翻译成英文：虽然${topic.cnTitle}有明显价值，但在实践中仍然存在一些问题。例如，${topic.concern}。因此，人们需要采取具体行动，而不是停留在口号上。`,
    sample: (topic: Cet4ScaleTopicConfig) =>
      `Although ${topic.topic.toLowerCase()} has clear value, there are still some problems in practice. For example, ${topic.concern}. Therefore, people need to take specific action instead of staying at the level of slogans.`,
  },
] as const;

export const CET4_TRANSLATION_PROMPT_BANK: Cet4SubjectivePrompt[] = [
  {
    id: 'translation-digital-learning',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '数字工具与英语学习',
    prompt: '请将下面这段中文翻译成英文：越来越多的大学生开始使用数字工具学习英语。有效的工具不应该只给出答案，而应该帮助学生发现错误、主动回忆知识，并在合适的时间复习。只有把技术和持续练习结合起来，学习者才能真正提高语言能力。',
    plannedMinutes: 30,
    keywords: ['college students', 'digital tools', 'active recall', 'review', 'language ability'],
    syllabusFocus: ['社会发展', '句子层面转换', '语篇连贯'],
    sampleAnswer:
      'More and more college students are beginning to use digital tools to learn English. An effective tool should not only provide answers, but also help students find mistakes, actively recall knowledge, and review it at the right time. Only by combining technology with consistent practice can learners truly improve their language ability.',
  },
  {
    id: 'translation-tea-culture',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '中国茶文化',
    prompt: '请将下面这段中文翻译成英文：茶在中国有着悠久的历史。对许多中国人来说，喝茶不仅是一种生活习惯，也是一种表达友好和尊重的方式。如今，越来越多的年轻人开始了解茶文化，并通过新的方式把它介绍给世界。',
    plannedMinutes: 30,
    keywords: ['tea', 'history', 'habit', 'respect', 'introduce'],
    syllabusFocus: ['中国文化', '基本准确表达原意', '词汇恰当'],
    sampleAnswer:
      'Tea has a long history in China. For many Chinese people, drinking tea is not only a habit of daily life, but also a way to show friendliness and respect. Today, more and more young people are learning about tea culture and introducing it to the world in new ways.',
  },
  {
    id: 'translation-high-speed-rail',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '高铁与社会发展',
    prompt: '请将下面这段中文翻译成英文：中国高铁的发展改变了许多人的出行方式。它连接了大城市和中小城市，使人们可以更方便地学习、工作和旅行。高铁也促进了地区之间的交流，为经济发展带来了新的机会。',
    plannedMinutes: 30,
    keywords: ['high-speed rail', 'connect', 'convenient', 'communication', 'economic development'],
    syllabusFocus: ['社会发展', '动词搭配', '因果表达'],
    sampleAnswer:
      'The development of China’s high-speed rail has changed the way many people travel. It connects large cities with small and medium-sized cities, allowing people to study, work, and travel more conveniently. High-speed rail also promotes communication between regions and brings new opportunities for economic development.',
  },
  {
    id: 'translation-traditional-festivals',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '传统节日',
    prompt: '请将下面这段中文翻译成英文：传统节日是中国文化的重要组成部分。春节期间，人们通常和家人团聚，表达对新一年的美好祝愿。通过这些节日，年轻一代能够了解家庭、历史和社会价值之间的联系。',
    plannedMinutes: 30,
    keywords: ['traditional festivals', 'culture', 'reunion', 'wish', 'social values'],
    syllabusFocus: ['中国文化', '语篇层面转换', '表达通顺'],
    sampleAnswer:
      'Traditional festivals are an important part of Chinese culture. During the Spring Festival, people usually get together with their families and express good wishes for the new year. Through these festivals, the younger generation can understand the connection among family, history, and social values.',
  },
  {
    id: 'translation-community-libraries',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '社区图书馆',
    prompt: '请将下面这段中文翻译成英文：社区图书馆正在成为居民终身学习的重要场所。除了借书，人们还可以在这里参加讲座、使用网络资源，并获得职业发展方面的帮助。这样的公共服务使学习更加便利，也增强了社区之间的联系。',
    plannedMinutes: 30,
    keywords: ['community library', 'lifelong learning', 'public service', 'resources', 'connection'],
    syllabusFocus: ['社会发展', '公共服务', '语句通顺'],
    sampleAnswer:
      'Community libraries are becoming important places for residents’ lifelong learning. Besides borrowing books, people can attend lectures, use online resources, and receive help with career development there. Such public services make learning more convenient and strengthen connections within the community.',
  },
  {
    id: 'translation-mobile-payment',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '移动支付',
    prompt: '请将下面这段中文翻译成英文：移动支付已经深刻影响了中国人的日常生活。无论是在商店购物，还是乘坐公共交通，人们都可以用手机快速完成支付。同时，用户也应该注意保护个人信息，养成安全使用数字服务的习惯。',
    plannedMinutes: 30,
    keywords: ['mobile payment', 'daily life', 'public transport', 'personal information', 'digital services'],
    syllabusFocus: ['社会发展', '科技应用', '翻译策略'],
    sampleAnswer:
      'Mobile payment has deeply influenced the daily life of Chinese people. Whether shopping in a store or taking public transport, people can complete payment quickly with a mobile phone. At the same time, users should protect their personal information and develop safe habits when using digital services.',
  },
  {
    id: 'translation-paper-cutting',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '剪纸艺术',
    prompt: '请将下面这段中文翻译成英文：剪纸是中国传统民间艺术之一，常用于节日装饰和表达美好祝愿。虽然制作工具很简单，但图案往往包含丰富的文化含义。如今，许多学校通过课程和展览帮助学生了解这项传统技艺。',
    plannedMinutes: 30,
    keywords: ['paper-cutting', 'folk art', 'decoration', 'cultural meaning', 'traditional skill'],
    syllabusFocus: ['中国文化', '传统技艺', '语篇连贯'],
    sampleAnswer:
      'Paper-cutting is one of China’s traditional folk arts and is often used for festival decoration and expressing good wishes. Although the tools are simple, the patterns usually contain rich cultural meanings. Today, many schools help students learn about this traditional skill through courses and exhibitions.',
  },
  {
    id: 'translation-green-transport',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '绿色出行',
    prompt: '请将下面这段中文翻译成英文：近年来，绿色出行在中国许多城市越来越受欢迎。更多居民选择乘坐公共交通、骑自行车或步行，以减少空气污染和交通压力。政府也在改善相关设施，使城市生活更加便利和可持续。',
    plannedMinutes: 30,
    keywords: ['green travel', 'public transport', 'air pollution', 'traffic pressure', 'sustainable'],
    syllabusFocus: ['社会发展', '环境主题', '措施表达'],
    sampleAnswer:
      'In recent years, green travel has become increasingly popular in many Chinese cities. More residents choose public transport, bicycles, or walking to reduce air pollution and traffic pressure. The government is also improving related facilities to make urban life more convenient and sustainable.',
  },
  {
    id: 'translation-online-education',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '在线教育',
    prompt: '请将下面这段中文翻译成英文：在线教育为学生提供了更加灵活的学习方式。学生可以根据自己的时间安排观看课程、完成练习并获得反馈。然而，在线学习也要求学生具备更强的自律能力，避免被无关信息分散注意力。',
    plannedMinutes: 30,
    keywords: ['online education', 'flexible', 'schedule', 'feedback', 'self-discipline'],
    syllabusFocus: ['教育主题', '转折关系', '学习策略'],
    sampleAnswer:
      'Online education provides students with a more flexible way of learning. Students can watch courses, complete exercises, and receive feedback according to their own schedules. However, online learning also requires stronger self-discipline so that students can avoid being distracted by unrelated information.',
  },
  {
    id: 'translation-food-safety',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '食品安全',
    prompt: '请将下面这段中文翻译成英文：食品安全关系到每个人的健康。随着生活水平的提高，人们越来越关注食品的来源和质量。相关部门应加强监管，企业也应承担责任，为消费者提供可靠的信息和安全的产品。',
    plannedMinutes: 30,
    keywords: ['food safety', 'health', 'quality', 'regulate', 'responsibility'],
    syllabusFocus: ['社会生活', '监管责任', '准确表达'],
    sampleAnswer:
      'Food safety is related to everyone’s health. With the improvement of living standards, people are paying more attention to the source and quality of food. Relevant departments should strengthen regulation, and companies should also take responsibility by providing reliable information and safe products for consumers.',
  },
  {
    id: 'translation-sports-facilities',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '公共体育设施',
    prompt: '请将下面这段中文翻译成英文：公共体育设施使居民更容易参加锻炼。许多城市在社区附近建设运动场地，鼓励人们形成健康的生活习惯。为了让这些设施发挥长期作用，还需要定期维护并听取居民的意见。',
    plannedMinutes: 30,
    keywords: ['public sports facilities', 'exercise', 'community', 'healthy habits', 'maintenance'],
    syllabusFocus: ['公共服务', '健康主题', '目的表达'],
    sampleAnswer:
      'Public sports facilities make it easier for residents to take exercise. Many cities build sports fields near communities to encourage people to develop healthy living habits. To ensure that these facilities play a long-term role, regular maintenance and residents’ opinions are also needed.',
  },
  {
    id: 'translation-rural-revitalization',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '乡村发展',
    prompt: '请将下面这段中文翻译成英文：乡村发展不仅需要改善交通和公共服务，也需要保护当地的自然环境和文化传统。越来越多的年轻人回到家乡创业，为乡村带来了新的想法和机会。',
    plannedMinutes: 30,
    keywords: ['rural development', 'public services', 'natural environment', 'cultural traditions', 'opportunities'],
    syllabusFocus: ['社会发展', '文化环境', '并列表达'],
    sampleAnswer:
      'Rural development requires not only better transport and public services, but also the protection of the local natural environment and cultural traditions. More and more young people are returning to their hometowns to start businesses, bringing new ideas and opportunities to rural areas.',
  },
  {
    id: 'translation-digital-museum',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '数字博物馆',
    prompt: '请将下面这段中文翻译成英文：数字博物馆让更多人可以方便地了解历史和文化。通过图片、视频和在线讲解，观众即使不在现场，也能欣赏展品并学习相关背景知识。这种方式尤其受到年轻人的欢迎。',
    plannedMinutes: 30,
    keywords: ['digital museum', 'history', 'culture', 'online explanation', 'background knowledge'],
    syllabusFocus: ['文化传播', '科技应用', '让步表达'],
    sampleAnswer:
      'Digital museums allow more people to learn about history and culture conveniently. Through pictures, videos, and online explanations, visitors can appreciate exhibits and learn relevant background knowledge even when they are not there in person. This method is especially popular among young people.',
  },
  {
    id: 'translation-shared-bicycles',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '共享单车',
    prompt: '请将下面这段中文翻译成英文：共享单车为城市居民提供了一种便利的短途出行方式。它有助于减少汽车使用，也鼓励人们进行日常锻炼。但是，用户应该遵守规则，把车辆停放在合适的位置。',
    plannedMinutes: 30,
    keywords: ['shared bicycles', 'convenient', 'short-distance travel', 'reduce', 'rules'],
    syllabusFocus: ['城市生活', '利弊表达', '规则意识'],
    sampleAnswer:
      'Shared bicycles provide urban residents with a convenient way to travel short distances. They help reduce the use of cars and encourage people to take daily exercise. However, users should follow rules and park bicycles in appropriate places.',
  },
  {
    id: 'translation-reading-campaign',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '全民阅读',
    prompt: '请将下面这段中文翻译成英文：近年来，许多城市开展了阅读推广活动，鼓励居民多读书、读好书。图书馆、学校和社区经常合作举办讲座和书展，使阅读资源更加容易获得。',
    plannedMinutes: 30,
    keywords: ['reading campaign', 'library', 'school', 'community', 'accessible'],
    syllabusFocus: ['教育文化', '公共服务', '使役结构'],
    sampleAnswer:
      'In recent years, many cities have launched reading campaigns to encourage residents to read more and choose good books. Libraries, schools, and communities often work together to hold lectures and book fairs, making reading resources more accessible.',
  },
  {
    id: 'translation-smart-city',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '智慧城市',
    prompt: '请将下面这段中文翻译成英文：智慧城市利用数字技术改善公共服务。居民可以通过手机查询交通信息、预约服务并反馈问题。与此同时，城市管理者也应重视数据安全，确保技术真正服务于公众利益。',
    plannedMinutes: 30,
    keywords: ['smart city', 'digital technology', 'public services', 'feedback', 'data security'],
    syllabusFocus: ['科技社会', '公共利益', '目的表达'],
    sampleAnswer:
      'Smart cities use digital technology to improve public services. Residents can check transport information, book services, and report problems through mobile phones. At the same time, city managers should pay attention to data security and ensure that technology truly serves the public interest.',
  },
  {
    id: 'translation-family-education',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '家庭教育',
    prompt: '请将下面这段中文翻译成英文：家庭教育对孩子的成长有着重要影响。父母不仅要关注学习成绩，也要帮助孩子形成良好的习惯和责任感。良好的沟通能够增强家庭成员之间的理解和信任。',
    plannedMinutes: 30,
    keywords: ['family education', 'growth', 'habit', 'responsibility', 'communication'],
    syllabusFocus: ['社会生活', '家庭主题', '并列信息'],
    sampleAnswer:
      'Family education has an important influence on children’s growth. Parents should pay attention not only to academic performance, but also to helping children develop good habits and a sense of responsibility. Good communication can strengthen understanding and trust among family members.',
  },
  {
    id: 'translation-environmental-awareness',
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    title: '环保意识',
    prompt: '请将下面这段中文翻译成英文：随着环保意识的提高，越来越多的人开始改变日常生活方式。他们减少一次性用品的使用，节约水电，并积极参加社区环保活动。这些小行动有助于建设更加可持续的社会。',
    plannedMinutes: 30,
    keywords: ['environmental awareness', 'daily lifestyle', 'save water and electricity', 'community activity', 'sustainable society'],
    syllabusFocus: ['环境主题', '社会发展', '结果表达'],
    sampleAnswer:
      'With the improvement of environmental awareness, more and more people are changing their daily lifestyles. They reduce the use of disposable products, save water and electricity, and actively participate in community environmental activities. These small actions help build a more sustainable society.',
  },
  ...CET4_SCALE_TOPIC_CONFIGS.flatMap((topic) => ([
    {
      id: `translation-scale-${topic.slug}-development`,
      moduleId: 'translation' as const,
      questionTypeId: 'paragraph-translation' as const,
      title: `${topic.cnTitle}与社会发展`,
      prompt: `请将下面这段中文翻译成英文：近年来，${topic.cnTitle}受到越来越多人的关注。它的价值在于能够${topic.benefit}。不过，如果缺少合理的规划和持续的反馈，相关措施可能难以取得稳定效果。`,
      plannedMinutes: 30,
      keywords: topic.keywords,
      syllabusFocus: [topic.themeTag, '社会发展', '语篇连贯'],
      sampleAnswer:
        `In recent years, ${topic.topic.toLowerCase()} has attracted increasing attention. Its value lies in the fact that ${topic.benefit}. However, without reasonable planning and continuous feedback, related measures may fail to achieve stable results.`,
    },
    {
      id: `translation-scale-${topic.slug}-action`,
      moduleId: 'translation' as const,
      questionTypeId: 'paragraph-translation' as const,
      title: `${topic.cnTitle}的实践`,
      prompt: `请将下面这段中文翻译成英文：为了更好地推进${topic.cnTitle}，人们需要采取更加实际的措施。例如，可以${topic.action}。这种做法不仅有助于解决现实问题，也能让公众更清楚地看到变化。`,
      plannedMinutes: 30,
      keywords: topic.keywords,
      syllabusFocus: [topic.themeTag, '措施表达', '结果表达'],
      sampleAnswer:
        `To promote ${topic.topic.toLowerCase()} more effectively, people need to take more practical measures. For example, they can ${topic.action}. This approach not only helps solve real problems, but also allows the public to see changes more clearly.`,
    },
    {
      id: `translation-scale-${topic.slug}-balance`,
      moduleId: 'translation' as const,
      questionTypeId: 'paragraph-translation' as const,
      title: `${topic.cnTitle}的平衡发展`,
      prompt: `请将下面这段中文翻译成英文：${topic.cnTitle}的发展不能只追求速度，还应重视公平和长期影响。人们应当关注这样一个问题：${topic.concern}。只有在发展过程中不断评估结果，才能真正提升公共利益。`,
      plannedMinutes: 30,
      keywords: topic.keywords,
      syllabusFocus: [topic.themeTag, '利弊平衡', '公共利益'],
      sampleAnswer:
        `The development of ${topic.topic.toLowerCase()} should not focus only on speed, but should also value fairness and long-term influence. People should pay attention to this issue: ${topic.concern}. Only by evaluating results continuously during development can public benefit truly be improved.`,
    },
    ...TRANSLATION_EXPANSION_FRAMES.map((frame) => ({
      id: `translation-scale-${topic.slug}-${frame.slug}`,
      moduleId: 'translation' as const,
      questionTypeId: 'paragraph-translation' as const,
      title: `${topic.cnTitle}${frame.suffix}`,
      prompt: frame.prompt(topic),
      plannedMinutes: 30,
      keywords: topic.keywords,
      syllabusFocus: [topic.themeTag, frame.focus, '语篇连贯'],
      sampleAnswer: frame.sample(topic),
    })),
  ])),
];

export const CET4_MOCK_EXAM: Cet4MockExamPaper = {
  id: 'cet4-standard-mock-001',
  title: 'CET-4 标准结构模拟卷 A',
  sourceNotice: '内置原创模拟题，不是官方真题；按 CET-4 笔试结构覆盖写作 1 题、听力 25 题、阅读 30 题、翻译 1 题，用于形成评分和复习闭环。',
  plannedMinutes: 125,
  writing: {
    prompt: CET4_WRITING_PROMPT_BANK[0].prompt,
    minWords: CET4_WRITING_PROMPT_BANK[0].minWords ?? 120,
    keywords: CET4_WRITING_PROMPT_BANK[0].keywords,
    sampleAnswer: CET4_WRITING_PROMPT_BANK[0].sampleAnswer,
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
    prompt: CET4_TRANSLATION_PROMPT_BANK[0].prompt,
    keywords: CET4_TRANSLATION_PROMPT_BANK[0].keywords,
    sampleAnswer: CET4_TRANSLATION_PROMPT_BANK[0].sampleAnswer,
  },
};

function takeCyclic<T>(items: T[], startIndex: number, count: number): T[] {
  if (items.length === 0) return [];
  return Array.from({ length: count }, (_, index) => items[(startIndex + index) % items.length]);
}

function buildCET4MockExamVariant(paperIndex: number): Cet4MockExamPaper {
  const paperNo = String(paperIndex + 1).padStart(3, '0');
  const writingPrompt = CET4_WRITING_PROMPT_BANK[paperIndex % CET4_WRITING_PROMPT_BANK.length];
  const translationPrompt = CET4_TRANSLATION_PROMPT_BANK[paperIndex % CET4_TRANSLATION_PROMPT_BANK.length];
  const shortNewsQuestions = CET4_LISTENING_PRACTICE_QUESTIONS.filter((question) => question.questionTypeId === 'short-news');
  const longConversationQuestions = CET4_LISTENING_PRACTICE_QUESTIONS.filter((question) => question.questionTypeId === 'long-conversation');
  const listeningPassageQuestions = CET4_LISTENING_PRACTICE_QUESTIONS.filter((question) => question.questionTypeId === 'listening-passage');
  const listeningQuestions = [
    ...takeCyclic(shortNewsQuestions, paperIndex * 7, 7),
    ...takeCyclic(longConversationQuestions, paperIndex * 8, 8),
    ...takeCyclic(listeningPassageQuestions, paperIndex * 10, 10),
  ];

  return {
    id: `cet4-standard-mock-${paperNo}`,
    title: `CET-4 标准结构模拟卷 ${String.fromCharCode(64 + paperIndex + 1)}`,
    sourceNotice: '由内置原创题池自动组卷，保持 CET-4 笔试 57 题结构；阅读 Part III 仍使用标准结构卷，听力和写译任务按题池轮换。',
    plannedMinutes: 125,
    writing: {
      prompt: writingPrompt.prompt,
      minWords: writingPrompt.minWords ?? 120,
      keywords: writingPrompt.keywords,
      sampleAnswer: writingPrompt.sampleAnswer,
    },
    listening: {
      transcript: listeningQuestions.map((question) => question.correctSentence).join(' '),
      questions: listeningQuestions,
    },
    reading: {
      passage: CET4_STANDARD_READING_PASSAGE,
      questions: CET4_STANDARD_READING_QUESTIONS,
    },
    translation: {
      prompt: translationPrompt.prompt,
      keywords: translationPrompt.keywords,
      sampleAnswer: translationPrompt.sampleAnswer,
    },
  };
}

export const CET4_MOCK_EXAM_BANK: Cet4MockExamPaper[] = [
  CET4_MOCK_EXAM,
  ...Array.from({ length: 11 }, (_, index) => buildCET4MockExamVariant(index + 1)),
];

export const CET4_QUESTION_BANK_COVERAGE: QuestionBankCoverageItem[] = [
  {
    moduleId: 'writing',
    questionTypeId: 'short-essay',
    name: '写作短文',
    officialCount: '1 题',
    builtInCount: CET4_WRITING_PROMPT_BANK.length,
    durationMinutes: 30,
    trainingRoute: '专项写作 + 阶段模考',
  },
  {
    moduleId: 'listening',
    questionTypeId: 'short-news',
    name: '听力短篇新闻',
    officialCount: '7 题',
    builtInCount: CET4_LISTENING_PRACTICE_QUESTIONS.filter((question) => question.questionTypeId === 'short-news').length,
    durationMinutes: 7,
    trainingRoute: '阶段模考 + 听力精听',
  },
  {
    moduleId: 'listening',
    questionTypeId: 'long-conversation',
    name: '听力长对话',
    officialCount: '8 题',
    builtInCount: CET4_LISTENING_PRACTICE_QUESTIONS.filter((question) => question.questionTypeId === 'long-conversation').length,
    durationMinutes: 8,
    trainingRoute: '专项听力 + 阶段模考',
  },
  {
    moduleId: 'listening',
    questionTypeId: 'listening-passage',
    name: '听力篇章',
    officialCount: '10 题',
    builtInCount: CET4_LISTENING_PRACTICE_QUESTIONS.filter((question) => question.questionTypeId === 'listening-passage').length,
    durationMinutes: 10,
    trainingRoute: '阶段模考',
  },
  {
    moduleId: 'reading',
    questionTypeId: 'word-bank',
    name: '选词填空',
    officialCount: '10 空',
    builtInCount: CET4_READING_PRACTICE_QUESTIONS.filter((question) => question.questionTypeId === 'word-bank').length,
    durationMinutes: 10,
    trainingRoute: '选词填空专项 + 词汇语块 + 阶段模考',
  },
  {
    moduleId: 'grammar',
    questionTypeId: 'cloze-choice',
    name: '完形/语境填空',
    officialCount: '补弱题型',
    builtInCount: CET4_CLOZE_PRACTICE_QUESTIONS.length,
    durationMinutes: 12,
    trainingRoute: '完形语境专项 + 诊断弱项推荐',
  },
  {
    moduleId: 'grammar',
    questionTypeId: 'grammar-structure',
    name: '语法结构',
    officialCount: '能力支撑',
    builtInCount: CET4_GRAMMAR_PRACTICE_QUESTIONS.length,
    durationMinutes: 12,
    trainingRoute: '语法结构专项 + 写译错因复盘',
  },
  {
    moduleId: 'reading',
    questionTypeId: 'long-matching',
    name: '长篇匹配',
    officialCount: '10 题',
    builtInCount: CET4_READING_PRACTICE_QUESTIONS.filter((question) => question.questionTypeId === 'long-matching').length,
    durationMinutes: 15,
    trainingRoute: '长篇匹配专项 + 段落定位 + 阶段模考',
  },
  {
    moduleId: 'reading',
    questionTypeId: 'careful-reading',
    name: '仔细阅读',
    officialCount: '10 题',
    builtInCount: CET4_READING_PRACTICE_QUESTIONS.filter((question) => question.questionTypeId === 'careful-reading').length,
    durationMinutes: 15,
    trainingRoute: '专项阅读 + 阶段模考',
  },
  {
    moduleId: 'translation',
    questionTypeId: 'paragraph-translation',
    name: '段落翻译',
    officialCount: '1 题',
    builtInCount: CET4_TRANSLATION_PROMPT_BANK.length,
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

type DegreeChoiceRow = readonly [
  id: string,
  title: string,
  prompt: string,
  optionA: string,
  optionB: string,
  optionC: string,
  optionD: string,
  correctAnswer: Choice,
  explanation: string,
  focus: string,
  correctSentence?: string,
];

const DEGREE_VOCABULARY_STRUCTURE_ROWS: DegreeChoiceRow[] = [
  ['vs-postpone', '词汇与语法 1', 'The meeting was ___ because of heavy rain.', 'postponed', 'promoted', 'protected', 'processed', 'A', 'postpone 表示“推迟”，符合 because of heavy rain 的因果语境。', '词汇用法|动词辨析', 'The meeting was postponed because of heavy rain.'],
  ['vs-submit', '词汇与语法 2', 'Applicants are required ___ the form before Friday.', 'submit', 'to submit', 'submitting', 'submitted', 'B', 'be required to do sth. 表示“被要求做某事”。', '非谓语动词|固定搭配', 'Applicants are required to submit the form before Friday.'],
  ['vs-although', '词汇与语法 3', '___ the task was difficult, she finished it on time.', 'Because', 'Unless', 'Although', 'If', 'C', '前后为让步关系，although 表示“虽然”。', '让步状语从句|逻辑关系', 'Although the task was difficult, she finished it on time.'],
  ['vs-have-lived', '词汇与语法 4', 'He ___ in Nanjing for ten years and knows the city well.', 'has lived', 'lived', 'is living', 'will live', 'A', 'for ten years 与现在关联时，常用现在完成时。', '时态|现在完成时', 'He has lived in Nanjing for ten years and knows the city well.'],
  ['vs-passive-written', '词汇与语法 5', 'The notice ___ in clear and polite language yesterday.', 'writes', 'wrote', 'was written', 'has written', 'C', 'notice 与 write 是被动关系，yesterday 用一般过去时被动语态。', '被动语态|应用文', 'The notice was written in clear and polite language yesterday.'],
  ['vs-more-convenient', '词汇与语法 6', 'Online appointment systems are often ___ than waiting in a long line.', 'convenient', 'more convenient', 'most convenient', 'the convenient', 'B', 'than 提示比较级，应选 more convenient。', '形容词比较级|公共服务', 'Online appointment systems are often more convenient than waiting in a long line.'],
  ['vs-unless', '词汇与语法 7', 'The activity will continue ___ it rains heavily.', 'unless', 'because', 'so that', 'as soon as', 'A', 'unless 表示“除非”，符合“除非下大雨，否则继续”。', '条件状语从句|连接词', 'The activity will continue unless it rains heavily.'],
  ['vs-attend', '词汇与语法 8', 'All students are welcome ___ the public lecture.', 'attend', 'attending', 'to attend', 'attended', 'C', 'be welcome to do sth. 是常见搭配。', '非谓语动词|通知', 'All students are welcome to attend the public lecture.'],
  ['vs-reliable', '词汇与语法 9', 'A report should be based on ___ information, not guesses.', 'reliable', 'rapid', 'private', 'silent', 'A', 'reliable information 表示“可靠信息”。', '词汇用法|阅读写作', 'A report should be based on reliable information, not guesses.'],
  ['vs-what-clause', '词汇与语法 10', '___ matters most is whether the method works for real learners.', 'That', 'What', 'Which', 'How', 'B', 'What 引导主语从句，并在从句中作主语。', '名词性从句|句子结构', 'What matters most is whether the method works for real learners.'],
  ['vs-despite', '词汇与语法 11', '___ limited time, adult learners can make progress through small tasks.', 'Although', 'Despite', 'Because', 'Unless', 'B', 'despite 后接名词短语 limited time。', '介词|让步关系', 'Despite limited time, adult learners can make progress through small tasks.'],
  ['vs-concentrate-on', '词汇与语法 12', 'Candidates need to concentrate ___ the reading passage.', 'for', 'with', 'on', 'about', 'C', 'concentrate on 表示“集中注意力于”。', '介词搭配|考试策略', 'Candidates need to concentrate on the reading passage.'],
  ['vs-being-repaired', '词汇与语法 13', 'The computer in the reading room ___ now.', 'repairs', 'is repaired', 'is being repaired', 'has repaired', 'C', 'now 表示正在进行，电脑被修理，应用现在进行时被动语态。', '被动语态|时态', 'The computer in the reading room is being repaired now.'],
  ['vs-relative-who', '词汇与语法 14', 'The teacher ___ gave the lecture also wrote the reference book.', 'who', 'which', 'where', 'when', 'A', '先行词 teacher 指人，定语从句中作主语，用 who。', '定语从句|关系代词', 'The teacher who gave the lecture also wrote the reference book.'],
  ['vs-effective', '词汇与语法 15', 'Regular feedback is an ___ way to improve writing.', 'effective', 'empty', 'ordinary', 'indirect', 'A', 'effective way 表示“有效方法”。', '词汇用法|写作训练', 'Regular feedback is an effective way to improve writing.'],
  ['vs-because-of', '词汇与语法 16', 'The workshop was canceled ___ the speaker’s illness.', 'because', 'because of', 'so', 'although', 'B', 'because of 后接名词短语 the speaker’s illness。', '原因表达|介词短语', 'The workshop was canceled because of the speaker’s illness.'],
  ['vs-had-finished', '词汇与语法 17', 'By the time the exam started, she ___ all the review tasks.', 'finished', 'has finished', 'had finished', 'will finish', 'C', 'By the time + 过去时间，主句表示过去之前已完成，应用过去完成时。', '过去完成时|时间状语', 'By the time the exam started, she had finished all the review tasks.'],
  ['vs-fewer', '词汇与语法 18', 'Students made ___ grammar mistakes after three weeks of practice.', 'less', 'fewer', 'little', 'much', 'B', 'mistakes 是可数名词复数，用 fewer。', '数量词|可数名词', 'Students made fewer grammar mistakes after three weeks of practice.'],
  ['vs-in-order-to', '词汇与语法 19', 'She joined the reading group ___ improve her speed.', 'so that', 'in order to', 'because of', 'even though', 'B', 'in order to 后接动词原形，表示目的。', '目的表达|非谓语', 'She joined the reading group in order to improve her speed.'],
  ['vs-neither-nor', '词汇与语法 20', 'The answer is ___ clear nor complete.', 'either', 'neither', 'both', 'not only', 'B', 'neither...nor... 表示“两者都不”。', '并列结构|固定搭配', 'The answer is neither clear nor complete.'],
  ['vs-whose', '词汇与语法 21', 'The student ___ application was approved thanked the office.', 'who', 'whose', 'which', 'whom', 'B', 'whose 表示所属关系，修饰 application。', '定语从句|所属关系', 'The student whose application was approved thanked the office.'],
  ['vs-kept', '词汇与语法 22', 'Personal information should ___ carefully on digital platforms.', 'keep', 'kept', 'be kept', 'keeping', 'C', 'information 与 keep 是被动关系，should 后接 be done。', '情态动词被动语态|隐私安全', 'Personal information should be kept carefully on digital platforms.'],
  ['vs-convenient', '词汇与语法 23', 'Mobile payment makes daily shopping more ___ for many residents.', 'convenient', 'historic', 'separate', 'distant', 'A', 'convenient 表示“方便的”。', '词汇用法|社会发展', 'Mobile payment makes daily shopping more convenient for many residents.'],
  ['vs-as-long-as', '词汇与语法 24', 'You can use the study room ___ you keep it quiet and clean.', 'as long as', 'as if', 'even though', 'in case', 'A', 'as long as 表示“只要”，引导条件。', '条件状语从句|连接词', 'You can use the study room as long as you keep it quiet and clean.'],
  ['vs-responsibility', '词汇与语法 25', 'Volunteer work can develop a sense of social ___.', 'responsibility', 'appointment', 'punctuation', 'certificate', 'A', 'social responsibility 表示“社会责任感”。', '词汇搭配|社会实践', 'Volunteer work can develop a sense of social responsibility.'],
];

const DEGREE_USE_OF_ENGLISH_ROWS: DegreeChoiceRow[] = [
  ['use-return', '实际运用 1', 'Many adult learners ___ to university after several years of work.', 'return', 'reply', 'remove', 'repair', 'A', 'return to university 表示“回到大学学习”。', '完形填空|动词辨析'],
  ['use-improve', '实际运用 2', 'They want to ___ professional skills and meet degree requirements.', 'improve', 'include', 'invent', 'invite', 'A', 'improve skills 是常见搭配。', '完形填空|词汇搭配'],
  ['use-divided', '实际运用 3', 'Their study time is often ___ among work, family, and commuting.', 'divided', 'decided', 'described', 'deleted', 'A', 'be divided among 表示“被分配/分散在……之间”。', '完形填空|被动语态'],
  ['use-schedule', '实际运用 4', 'A realistic ___ helps them continue learning.', 'schedule', 'surface', 'secret', 'speaker', 'A', 'schedule 表示“日程安排”。', '完形填空|名词辨析'],
  ['use-tasks', '实际运用 5', 'Small learning ___ are easier to complete during short breaks.', 'tasks', 'tickets', 'tastes', 'tours', 'A', 'learning tasks 表示“学习任务”。', '完形填空|名词搭配'],
  ['use-passage', '实际运用 6', 'For example, a learner can read one short ___ each day.', 'passage', 'package', 'password', 'position', 'A', 'short passage 表示“短文”。', '完形填空|阅读语境'],
  ['use-feedback', '实际运用 7', 'Quick ___ shows what should be corrected.', 'feedback', 'festival', 'furniture', 'freedom', 'A', 'feedback 表示“反馈”。', '完形填空|学习语境'],
  ['use-before', '实际运用 8', 'Mistakes should be corrected ___ they become habits.', 'before', 'unless', 'because', 'although', 'A', 'before 表示“在……之前”，符合句意。', '完形填空|时间连接词'],
  ['use-habits', '实际运用 9', 'Repeated mistakes may become bad learning ___.', 'habits', 'headers', 'heroes', 'handles', 'A', 'learning habits 表示“学习习惯”。', '完形填空|名词搭配'],
  ['use-support', '实际运用 10', 'Family and employer ___ can make study more stable.', 'support', 'surface', 'silence', 'symbol', 'A', 'support 表示“支持”。', '完形填空|名词辨析'],
  ['use-however', '实际运用 11', '___, online lessons alone are not always enough.', 'However', 'Therefore', 'Besides', 'Finally', 'A', '前后转折，however 最合适。', '完形填空|逻辑关系'],
  ['use-concentrate', '实际运用 12', 'Learners also need a quiet place to ___ on reading.', 'concentrate', 'celebrate', 'continue', 'compare', 'A', 'concentrate on reading 是固定搭配。', '完形填空|固定搭配'],
  ['use-familiar', '实际运用 13', 'A word becomes useful only when it is ___ in context.', 'familiar', 'foreign', 'formal', 'final', 'A', 'familiar in context 表示“在语境中熟悉”。', '完形填空|形容词辨析'],
  ['use-enough', '实际运用 14', 'Reading explanations is not ___ for real improvement.', 'enough', 'even', 'early', 'empty', 'A', 'not enough 表示“不足够”。', '完形填空|固定表达'],
  ['use-compare', '实际运用 15', 'Students should ___ each option with the original sentence.', 'compare', 'complete', 'confirm', 'collect', 'A', 'compare...with... 是常见搭配。', '完形填空|阅读策略'],
  ['use-options', '实际运用 16', 'Wrong ___ often change one detail in the passage.', 'options', 'offices', 'orders', 'owners', 'A', 'options 指选择题选项。', '完形填空|考试词汇'],
  ['use-conclusion', '实际运用 17', 'The final paragraph usually helps readers draw a ___.', 'conclusion', 'condition', 'conversation', 'certificate', 'A', 'draw a conclusion 表示“得出结论”。', '完形填空|固定搭配'],
  ['use-coherent', '实际运用 18', 'A good writing answer should be clear and ___.', 'coherent', 'careless', 'crowded', 'central', 'A', 'coherent 表示“连贯的”。', '完形填空|写作评分'],
  ['use-comment', '实际运用 19', 'After summarizing the article, candidates should add a brief ___.', 'comment', 'contact', 'custom', 'choice', 'A', 'comment 对应“评论”。', '完形填空|写作任务'],
  ['use-progress', '实际运用 20', 'Regular practice makes ___ visible through scores and mistakes.', 'progress', 'pressure', 'privacy', 'purpose', 'A', 'progress 表示“进步”，符合 scores and mistakes 的证据语境。', '完形填空|学习评估'],
];

function buildDegreeChoiceQuestions(
  rows: DegreeChoiceRow[],
  moduleId: DegreeEnglishChoiceQuestion['moduleId'],
  questionTypeId: DegreeEnglishChoiceQuestion['questionTypeId'],
  score: number,
) {
  return rows.map(([id, title, prompt, optionA, optionB, optionC, optionD, correctAnswer, explanation, focus, correctSentence]) => makeDegreeQuestion({
    id: `degree-${id}`,
    moduleId,
    questionTypeId,
    title,
    prompt,
    options: {
      A: optionA,
      B: optionB,
      C: optionC,
      D: optionD,
    },
    correctAnswer,
    explanation,
    score,
    syllabusFocus: focus.split('|'),
    correctSentence,
  }));
}

export const DEGREE_ENGLISH_OUTLINE_2025: DegreeEnglishOutline = {
  id: 'nanjing-tech-degree-english-2025-09',
  title: '南京工业大学高等学历继续教育学位英语考试大纲（2025年9月）',
  sourceDocument: 'D:\\桌面文件\\english\\2509学位英语考试大纲附件.docx',
  referenceTextbook: '《全国英语等级考试标准教程（第三级）》',
  examMode: '线下闭卷集中考试，考试指导语为英语，不考听力。',
  hasListening: false,
  totalScore: 100,
  totalQuestionCount: 67,
  plannedMinutes: 120,
  sections: [
    {
      moduleId: 'vocabulary-structure',
      name: 'Vocabulary and Structure（词汇与语法）',
      officialCount: '25 题，每题 1 分',
      score: 25,
      plannedMinutes: 20,
      focus: ['词汇用法', '语法掌握与运用', '单项选择'],
    },
    {
      moduleId: 'use-of-english',
      name: 'Use of English（实际运用）',
      officialCount: '完形填空 20 空，每空 0.5 分',
      score: 10,
      plannedMinutes: 15,
      focus: ['英语短语', '惯用法', '单词与语法综合运用'],
    },
    {
      moduleId: 'reading',
      name: 'Reading Comprehension（阅读理解）',
      officialCount: '3 篇传统阅读 15 题 + 1 篇 7 选 5 阅读 5 题',
      score: 40,
      plannedMinutes: 40,
      focus: ['具体信息', '主旨要义', '推理引申', '段落概括匹配'],
    },
    {
      moduleId: 'writing',
      name: 'Writing（写作）',
      officialCount: '小作文 1 篇 + 大作文 1 篇',
      score: 25,
      plannedMinutes: 45,
      focus: ['约100词通知/申请/信函', '200-250词阅读后约120词概括评论', '书面表达'],
    },
  ],
};

export const DEGREE_ENGLISH_VOCABULARY_STRUCTURE_QUESTIONS: DegreeEnglishChoiceQuestion[] =
  buildDegreeChoiceQuestions(DEGREE_VOCABULARY_STRUCTURE_ROWS, 'vocabulary-structure', 'vocabulary-structure', 1);

export const DEGREE_ENGLISH_USE_OF_ENGLISH_PASSAGE = `Many adult learners return to university after several years of work. They want to improve professional skills and meet degree requirements, but their study time is often divided among work, family, and commuting. A realistic schedule helps them continue learning. Small tasks, such as reading one short passage or reviewing one grammar point, are easier to complete during short breaks. Quick feedback shows what should be corrected before repeated mistakes become bad learning habits. Family and employer support can also make study more stable. However, online lessons alone are not always enough. Learners need a quiet place to concentrate, clear options to compare, and regular evidence that progress is becoming visible.`;

export const DEGREE_ENGLISH_USE_OF_ENGLISH_QUESTIONS: DegreeEnglishChoiceQuestion[] =
  buildDegreeChoiceQuestions(DEGREE_USE_OF_ENGLISH_ROWS, 'use-of-english', 'cloze-choice', 0.5);

export const DEGREE_ENGLISH_TRADITIONAL_READING_QUESTIONS: DegreeEnglishChoiceQuestion[] =
  DEGREE_ENGLISH_READING_PASSAGES.flatMap((passage, passageIndex) => passage.questions.map((question, questionIndex) => makeDegreeQuestion({
    id: `degree-traditional-reading-${passageIndex + 1}-${questionIndex + 1}`,
    moduleId: 'reading',
    questionTypeId: 'traditional-reading',
    title: `传统阅读 ${passageIndex + 1}-${questionIndex + 1}`,
    prompt: question.question,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    score: 2,
    syllabusFocus: ['传统阅读', question.type, ...(question.tags ?? [])],
    correctSentence: question.correctSentence,
  })));

export const DEGREE_ENGLISH_PARAGRAPH_MATCHING_PASSAGE = `A. Before starting a reading task, students should look at the title and predict the topic. This helps them build a simple framework before reading details.

B. During reading, students need to locate key sentences instead of translating every word. Topic sentences and repeated words often show the main idea of a paragraph.

C. When facing seven options, students should first remove choices that are too general, too narrow, or not related to the passage. This reduces the pressure of comparison.

D. A correct heading usually matches the whole paragraph, not just one attractive word. Students should be careful with distractors that copy vocabulary but change the meaning.

E. After finishing the matching task, students should check whether all five answers are different and whether the remaining two options are reasonable distractors.

F. Writing practice should be checked with examples and comments, because output problems are different from reading problems.

G. Listening practice is not included in this degree English outline, so training time should be moved to vocabulary, reading, and writing.`;

export const DEGREE_ENGLISH_PARAGRAPH_MATCHING_OPTIONS: Record<string, string> = {
  A: 'Predict the topic before reading',
  B: 'Locate key sentences while reading',
  C: 'Remove unsuitable options first',
  D: 'Match the whole paragraph, not one word',
  E: 'Check answers and remaining distractors',
  F: 'Revise writing after feedback',
  G: 'Move listening time to written sections',
};

export const DEGREE_ENGLISH_PARAGRAPH_MATCHING_QUESTIONS: DegreeEnglishChoiceQuestion[] = [
  ['A', 'Which paragraph advises students to predict the topic before reading?', 'A'],
  ['B', 'Which paragraph explains why key sentences matter?', 'B'],
  ['C', 'Which paragraph suggests removing unsuitable options first?', 'C'],
  ['D', 'Which paragraph warns against vocabulary-copy distractors?', 'D'],
  ['E', 'Which paragraph tells students to check unused options after answering?', 'E'],
].map(([paragraph, prompt, answer], index) => makeDegreeQuestion({
  id: `degree-paragraph-matching-${index + 1}`,
  moduleId: 'reading',
  questionTypeId: 'paragraph-matching',
  title: `7选5阅读 ${index + 1}`,
  prompt,
  options: DEGREE_ENGLISH_PARAGRAPH_MATCHING_OPTIONS,
  correctAnswer: answer,
  explanation: `正确匹配段落 ${paragraph}。本题训练段落主旨概括与干扰项排除。`,
  score: 2,
  syllabusFocus: ['7选5阅读', '段落主旨', '干扰项排除'],
  correctSentence: `Paragraph ${paragraph}`,
}));

const practicalWritingTask = DEGREE_ENGLISH_WRITING_PROMPT_BANK.find((item) => item.id === 'degree-practical-writing-lecture-notice');
const summaryCommentTask = DEGREE_ENGLISH_WRITING_PROMPT_BANK.find((item) => item.id === 'degree-summary-comment-adult-learning');

export const DEGREE_ENGLISH_MOCK_EXAM: DegreeEnglishMockExamPaper = {
  id: 'degree-english-2025-outline-mock-001',
  title: '学位英语 2025 大纲结构模拟卷 A',
  sourceNotice: '根据 2025 年 9 月南京工业大学高等学历继续教育学位英语考试大纲整理，内置题均为原创模拟材料，不复制真题；该大纲明确不考听力。',
  plannedMinutes: DEGREE_ENGLISH_OUTLINE_2025.plannedMinutes,
  totalScore: DEGREE_ENGLISH_OUTLINE_2025.totalScore,
  totalQuestionCount: DEGREE_ENGLISH_OUTLINE_2025.totalQuestionCount,
  vocabularyStructure: DEGREE_ENGLISH_VOCABULARY_STRUCTURE_QUESTIONS,
  useOfEnglish: {
    passage: DEGREE_ENGLISH_USE_OF_ENGLISH_PASSAGE,
    questions: DEGREE_ENGLISH_USE_OF_ENGLISH_QUESTIONS,
  },
  reading: {
    traditionalPassages: DEGREE_ENGLISH_READING_PASSAGES,
    traditionalQuestions: DEGREE_ENGLISH_TRADITIONAL_READING_QUESTIONS,
    matchingPassage: DEGREE_ENGLISH_PARAGRAPH_MATCHING_PASSAGE,
    matchingOptions: DEGREE_ENGLISH_PARAGRAPH_MATCHING_OPTIONS,
    matchingQuestions: DEGREE_ENGLISH_PARAGRAPH_MATCHING_QUESTIONS,
  },
  writing: {
    practical: {
      id: practicalWritingTask?.id ?? 'degree-practical-writing-lecture-notice',
      questionTypeId: 'practical-writing',
      title: practicalWritingTask?.title ?? 'Lecture Notice',
      prompt: practicalWritingTask?.prompt ?? '',
      plannedMinutes: 20,
      score: 10,
      minWords: practicalWritingTask?.minWords ?? 100,
      keywords: practicalWritingTask?.keywords ?? [],
      sampleAnswer: practicalWritingTask?.sampleAnswer ?? '',
      syllabusFocus: practicalWritingTask?.syllabusFocus ?? ['学位英语小作文'],
    },
    summaryComment: {
      id: summaryCommentTask?.id ?? 'degree-summary-comment-adult-learning',
      questionTypeId: 'summary-comment',
      title: summaryCommentTask?.title ?? 'Adult Learning and Time Management',
      prompt: summaryCommentTask?.prompt ?? '',
      plannedMinutes: 25,
      score: 15,
      minWords: summaryCommentTask?.minWords ?? 120,
      keywords: summaryCommentTask?.keywords ?? [],
      sampleAnswer: summaryCommentTask?.sampleAnswer ?? '',
      syllabusFocus: summaryCommentTask?.syllabusFocus ?? ['学位英语大作文'],
    },
  },
};

export const DEGREE_ENGLISH_QUESTION_BANK_COVERAGE: QuestionBankCoverageItem[] = [
  {
    moduleId: 'vocabulary-structure',
    questionTypeId: 'vocabulary-structure',
    name: '词汇与语法单选',
    officialCount: '25 题 / 25 分',
    builtInCount: DEGREE_ENGLISH_VOCABULARY_STRUCTURE_QUESTIONS.length,
    durationMinutes: 20,
    trainingRoute: '单词语块 + 语法单选 + 学位英语模拟卷',
  },
  {
    moduleId: 'use-of-english',
    questionTypeId: 'cloze-choice',
    name: '实际运用完形',
    officialCount: '20 空 / 10 分',
    builtInCount: DEGREE_ENGLISH_USE_OF_ENGLISH_QUESTIONS.length,
    durationMinutes: 15,
    trainingRoute: '完形语境 + 惯用法 + 学位英语模拟卷',
  },
  {
    moduleId: 'reading',
    questionTypeId: 'traditional-reading',
    name: '传统阅读理解',
    officialCount: '3 篇 15 题 / 30 分',
    builtInCount: DEGREE_ENGLISH_TRADITIONAL_READING_QUESTIONS.length,
    durationMinutes: 30,
    trainingRoute: '专项阅读 + 学位英语模拟卷',
  },
  {
    moduleId: 'reading',
    questionTypeId: 'paragraph-matching',
    name: '7选5段落匹配',
    officialCount: '1 篇 5 题 / 10 分',
    builtInCount: DEGREE_ENGLISH_PARAGRAPH_MATCHING_QUESTIONS.length,
    durationMinutes: 10,
    trainingRoute: '段落主旨匹配 + 干扰项排除',
  },
  {
    moduleId: 'writing',
    questionTypeId: 'practical-writing',
    name: '小作文应用文',
    officialCount: '1 篇约100词 / 10 分',
    builtInCount: DEGREE_ENGLISH_WRITING_PROMPT_BANK.filter((item) => item.id.startsWith('degree-practical-writing-')).length,
    durationMinutes: 20,
    trainingRoute: '专项写作 + AI/规则评阅',
  },
  {
    moduleId: 'writing',
    questionTypeId: 'summary-comment',
    name: '大作文概括评论',
    officialCount: '1 篇约120词 / 15 分',
    builtInCount: DEGREE_ENGLISH_WRITING_PROMPT_BANK.filter((item) => item.id.startsWith('degree-summary-comment-')).length,
    durationMinutes: 25,
    trainingRoute: '读后概括 + 评论输出 + AI/规则评阅',
  },
  {
    moduleId: 'listening',
    questionTypeId: 'not-tested',
    name: '听力',
    officialCount: '不考',
    builtInCount: 0,
    durationMinutes: 0,
    trainingRoute: '学位英语场景不安排听力；训练时间转入词汇、阅读、写作',
  },
];
