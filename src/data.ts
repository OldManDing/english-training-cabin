import { Passage, ReviewItem, AbilityScore, SkillGap, TimelineLog, SpeakingSession } from './types';

export interface VocabularyPracticeItem {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaning: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  collocation: string;
  example: string;
  explanation: string;
}

export const VOCABULARY_SESSION_SIZE = 40;

type VocabularyExtensionRow = readonly [
  word: string,
  phonetic: string,
  partOfSpeech: string,
  meaning: string,
  definition: string,
  distractorB: string,
  distractorC: string,
  distractorD: string,
  collocation: string,
  example: string,
  explanation: string,
];

function buildVocabularyItem(row: VocabularyExtensionRow): VocabularyPracticeItem {
  const [
    word,
    phonetic,
    partOfSpeech,
    meaning,
    definition,
    distractorB,
    distractorC,
    distractorD,
    collocation,
    example,
    explanation,
  ] = row;

  return {
    id: `vocab-${word.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
    word,
    phonetic,
    partOfSpeech,
    meaning,
    options: {
      A: definition,
      B: distractorB,
      C: distractorC,
      D: distractorD,
    },
    correctAnswer: 'A',
    collocation,
    example,
    explanation,
  };
}

const CET4_SYLLABUS_EXTENSION_ROWS: VocabularyExtensionRow[] = [
  ['accurate', '/ˈækjərət/', 'adjective', '准确的', 'correct and exact', 'easy to remember', 'not connected with a topic', 'full of emotion', 'accurate information', 'A report should provide accurate information rather than vague guesses.', 'accurate 对应阅读、翻译中的“准确表达”和“细节判断”。'],
  ['accessible', '/əkˈsesəbl/', 'adjective', '可获得的；易懂的', 'easy to reach, use, or understand', 'impossible to control', 'made for experts only', 'dangerous to share', 'accessible public services', 'Digital libraries make learning resources more accessible to students in small towns.', 'accessible 常用于教育公平、公共服务和科技应用话题。'],
  ['appropriate', '/əˈproʊpriət/', 'adjective', '恰当的', 'suitable for a particular situation', 'too old to be useful', 'clearly against the rules', 'produced by accident', 'an appropriate method', 'Learners should choose an appropriate method for their weak skills.', 'appropriate 是写作和翻译中表达“合适、恰当”的高频词。'],
  ['benefit', '/ˈbenɪfɪt/', 'noun/verb', '益处；受益', 'an advantage or helpful result', 'a repeated mistake', 'a hidden cost', 'a short conversation', 'public benefit', 'The new transport policy may benefit students who live far from campus.', 'benefit 可作名词或动词，常见于观点论证和社会发展主题。'],
  ['challenge', '/ˈtʃælɪndʒ/', 'noun/verb', '挑战', 'a difficult task or problem', 'a final answer', 'a small prize', 'a private habit', 'face a challenge', 'Time management is a common challenge for part-time learners.', 'challenge 用于描述问题和困难，是四级阅读、写作常见词。'],
  ['compare', '/kəmˈper/', 'verb', '比较', 'to examine how things are similar or different', 'to remove a useful detail', 'to speak without preparation', 'to copy a full sentence', 'compare different options', 'Students should compare the options with the original sentence before choosing.', 'compare 支撑阅读选项辨析和写作对比论证。'],
  ['concern', '/kənˈsɜːrn/', 'noun/verb', '担忧；涉及', 'a worry or matter of importance', 'a type of public transport', 'a piece of equipment', 'an exact number', 'raise a concern', 'Parents often raise concerns about privacy in online learning.', 'concern 常与 privacy、safety、cost 搭配，适合科技和社会话题。'],
  ['consequence', '/ˈkɑːnsəkwens/', 'noun', '后果；结果', 'a result of an action or situation', 'a method of payment', 'a person who gives advice', 'a place for exercise', 'serious consequence', 'Ignoring small mistakes may have serious consequences in a timed exam.', 'consequence 用于因果关系，是听力和阅读常见逻辑词。'],
  ['contribute', '/kənˈtrɪbjuːt/', 'verb', '贡献；促成', 'to help cause or achieve something', 'to hide information', 'to stop a process suddenly', 'to repeat without thinking', 'contribute to improvement', 'Specific feedback can contribute to steady improvement.', 'contribute to 表示“促成”，常用于原因分析。'],
  ['cultural', '/ˈkʌltʃərəl/', 'adjective', '文化的', 'related to culture or traditions', 'related only to money', 'easy to repair', 'not based on evidence', 'cultural heritage', 'Museums help students understand local cultural heritage.', 'cultural 是翻译“中国文化、历史与社会发展”主题的基础词。'],
  ['decline', '/dɪˈklaɪn/', 'noun/verb', '下降；减少', 'a decrease or to become lower', 'a clear improvement', 'a planned journey', 'a public celebration', 'a decline in attention', 'Too many notifications may lead to a decline in attention.', 'decline 可用于描述趋势变化，写作中比 go down 更正式。'],
  ['economic', '/ˌiːkəˈnɑːmɪk/', 'adjective', '经济的', 'related to the economy or money systems', 'related to pronunciation', 'based on old stories', 'not easy to see', 'economic development', 'Better public transport can support economic development in a region.', 'economic development 是社会发展和翻译题常见表达。'],
  ['environment', '/ɪnˈvaɪrənmənt/', 'noun', '环境', 'the natural world or the conditions around people', 'a written promise', 'a difficult grammar rule', 'a listening question', 'protect the environment', 'Students can protect the environment by reducing daily waste.', 'environment 是四级高频主题词，连接阅读、写作和翻译。'],
  ['essential', '/ɪˈsenʃl/', 'adjective', '必要的；本质的', 'necessary and very important', 'interesting but useless', 'too expensive to buy', 'unclear and indirect', 'an essential skill', 'Locating key sentences is an essential skill in careful reading.', 'essential 可替换 very important，提高表达正式度。'],
  ['factor', '/ˈfæktər/', 'noun', '因素', 'something that helps produce a result', 'a person who takes notes', 'a kind of festival', 'a short answer', 'a key factor', 'Sleep is a key factor in memory and learning efficiency.', 'factor 常用于因果分析和观点论证。'],
  ['identify', '/aɪˈdentɪfaɪ/', 'verb', '识别；确认', 'to recognize or find out what something is', 'to make a sentence longer', 'to avoid all mistakes', 'to speak more loudly', 'identify weak points', 'The system can identify weak points from real practice evidence.', 'identify 与错因归因、阅读定位和听力识别都相关。'],
  ['impact', '/ˈɪmpækt/', 'noun/verb', '影响', 'an effect or influence', 'a type of exam room', 'a repeated sound', 'a personal schedule', 'positive impact', 'Community service can have a positive impact on students.', 'impact 是社会、教育、科技主题中的核心词。'],
  ['individual', '/ˌɪndɪˈvɪdʒuəl/', 'adjective/noun', '个人的；个人', 'single or separate; one person', 'shared by every country', 'made of several pages', 'impossible to describe', 'individual needs', 'Adaptive learning should respond to individual needs.', 'individual needs 常用于个性化学习和社会服务话题。'],
  ['influence', '/ˈɪnfluəns/', 'noun/verb', '影响', 'the power to affect someone or something', 'a short written notice', 'a wrong option', 'a fixed rule', 'influence behavior', 'Teachers can influence students through clear feedback.', 'influence 可作名词或动词，适合观点表达和阅读同义替换。'],
  ['interaction', '/ˌɪntərˈækʃn/', 'noun', '互动；相互作用', 'communication or action between people or things', 'a final exam score', 'a hidden translation error', 'a natural disaster', 'human interaction', 'Face-to-face interaction remains valuable in education.', 'interaction 常见于教育、科技、社交和口语主题。'],
  ['issue', '/ˈɪʃuː/', 'noun', '问题；议题', 'an important topic or problem', 'a tool for recording sound', 'a short piece of news only', 'a kind of weather', 'a social issue', 'Waste sorting has become an important social issue.', 'issue 比 problem 更适合正式讨论公共议题。'],
  ['method', '/ˈmeθəd/', 'noun', '方法', 'a way of doing something', 'a person in a class', 'a result of a survey', 'a building near campus', 'learning method', 'Active recall is an effective learning method.', 'method 是学习策略、实验研究、做题方法的基础词。'],
  ['participate', '/pɑːrˈtɪsɪpeɪt/', 'verb', '参与', 'to take part in an activity', 'to make a problem worse', 'to describe a picture wrongly', 'to forget a deadline', 'participate in a program', 'Students are encouraged to participate in volunteer programs.', 'participate in 是校园活动和社会实践主题高频搭配。'],
  ['policy', '/ˈpɑːləsi/', 'noun', '政策；方针', 'a rule or plan used by an organization or government', 'a personal feeling', 'a grammar mistake', 'a type of story', 'education policy', 'A clear education policy can improve access to learning resources.', 'policy 常用于公共管理、教育、环境和科技监管话题。'],
  ['promote', '/prəˈmoʊt/', 'verb', '促进；推广', 'to support or encourage something', 'to make something disappear', 'to answer without evidence', 'to wait without action', 'promote healthy habits', 'Schools can promote healthy habits through regular activities.', 'promote 是写作中表达“促进、推动”的常用动词。'],
  ['reliable', '/rɪˈlaɪəbl/', 'adjective', '可靠的', 'able to be trusted', 'difficult to pronounce', 'shown only in pictures', 'without any value', 'reliable evidence', 'Reliable evidence is needed before changing a study plan.', 'reliable 与 evidence、source、data 搭配，支撑可验证学习效果。'],
  ['require', '/rɪˈkwaɪər/', 'verb', '需要；要求', 'to need or demand something', 'to reduce a number', 'to choose randomly', 'to speak quietly', 'require effort', 'Writing improvement requires regular practice and feedback.', 'require 可替换 need，适合正式写作和翻译。'],
  ['strategy', '/ˈstrætədʒi/', 'noun', '策略', 'a plan for achieving a goal', 'a short conversation', 'a personal object', 'a wrong spelling', 'reading strategy', 'A good reading strategy saves time under pressure.', 'strategy 对应大纲中的听力、阅读、写作、翻译策略。'],
  ['survey', '/ˈsɜːrveɪ/', 'noun/verb', '调查', 'a study that asks people questions', 'a sudden change in weather', 'a short piece of music', 'a sentence pattern', 'conduct a survey', 'The club conducted a survey about students’ reading habits.', 'survey 常见于校园、社会调查和图表写作场景。'],
  ['achieve', '/əˈtʃiːv/', 'verb', '实现；达到', 'to succeed in reaching a goal', 'to lose a chance', 'to describe a sound', 'to refuse advice', 'achieve a goal', 'A clear plan helps learners achieve their target score.', 'achieve 常用于目标设定和结果描述。'],
  ['affect', '/əˈfekt/', 'verb', '影响', 'to change or influence something', 'to translate a text', 'to make a list shorter', 'to arrive late', 'affect performance', 'Sleep can affect students’ performance in a long exam.', 'affect 是阅读因果关系和写作论证高频动词。'],
  ['arrange', '/əˈreɪndʒ/', 'verb', '安排', 'to plan or organize something', 'to make something dirty', 'to give a wrong answer', 'to stop learning', 'arrange a meeting', 'The team arranged a meeting to discuss the survey results.', 'arrange 常用于校园活动、会议和计划安排。'],
  ['aspect', '/ˈæspekt/', 'noun', '方面', 'one part or feature of a situation', 'a kind of weather', 'a person in charge', 'a final score', 'different aspects', 'The report examines different aspects of online learning.', 'aspect 用于多角度分析，适合阅读和写作。'],
  ['capacity', '/kəˈpæsəti/', 'noun', '能力；容量', 'the ability or space to do or hold something', 'a sudden mistake', 'an old tradition', 'a direct copy', 'learning capacity', 'Regular practice can increase a learner’s capacity to use new words.', 'capacity 常表示能力或容量，注意和 ability 的搭配差异。'],
  ['communicate', '/kəˈmjuːnɪkeɪt/', 'verb', '交流；传达', 'to share information or ideas', 'to hide evidence', 'to read silently only', 'to make a rule weaker', 'communicate clearly', 'Students need to communicate clearly during group projects.', 'communicate 是口语、写作和校园合作主题基础词。'],
  ['complete', '/kəmˈpliːt/', 'verb/adjective', '完成；完整的', 'to finish; having all parts', 'to guess randomly', 'to make a problem worse', 'to leave early', 'complete a task', 'Learners should complete short tasks before reviewing mistakes.', 'complete 可作动词或形容词，常见于任务和信息完整性。'],
  ['complex', '/ˈkɑːmpleks/', 'adjective', '复杂的', 'having many connected parts', 'very easy to solve', 'not worth noticing', 'made only for children', 'a complex problem', 'A complex sentence may contain several clauses.', 'complex 常用于长难句、社会问题和科技话题。'],
  ['conduct', '/kənˈdʌkt/', 'verb', '实施；进行', 'to carry out an activity or research', 'to make a phone louder', 'to choose without reason', 'to become invisible', 'conduct research', 'The university conducted research on students’ reading habits.', 'conduct research/survey 是四级常见正式搭配。'],
  ['conserve', '/kənˈsɜːrv/', 'verb', '保护；节约', 'to protect or avoid wasting something', 'to spend without control', 'to answer immediately', 'to remove a source', 'conserve energy', 'Turning off lights can help conserve energy on campus.', 'conserve 常用于环境和资源保护主题。'],
  ['consume', '/kənˈsuːm/', 'verb', '消耗；消费', 'to use resources, time, or energy', 'to produce a new rule', 'to repair a device', 'to explain a tradition', 'consume energy', 'Large screens may consume more energy than expected.', 'consume 与 energy、time、resources 搭配频繁。'],
  ['demand', '/dɪˈmænd/', 'noun/verb', '需求；要求', 'a strong need or request', 'a private memory', 'a short rest', 'a grammar symbol', 'growing demand', 'The growing demand for online services has changed public offices.', 'demand 常用于社会趋势和市场需求。'],
  ['device', '/dɪˈvaɪs/', 'noun', '设备', 'a tool or machine for a particular purpose', 'a public holiday', 'a piece of advice', 'a sudden result', 'mobile device', 'Students should protect privacy when using a shared device.', 'device 是科技、学习工具和隐私话题常见词。'],
  ['distribute', '/dɪˈstrɪbjuːt/', 'verb', '分发；分配', 'to give or share something among people', 'to make a sound unclear', 'to refuse a request', 'to forget a rule', 'distribute materials', 'The teacher distributed reading materials before class.', 'distribute 常用于资源、材料和公共服务分配。'],
  ['encourage', '/ɪnˈkɜːrɪdʒ/', 'verb', '鼓励；促进', 'to give support or make something more likely', 'to make someone silent', 'to damage a plan', 'to repeat a mistake', 'encourage participation', 'Clear feedback can encourage students to continue practicing.', 'encourage 是建议类写作的高频动词。'],
  ['establish', '/ɪˈstæblɪʃ/', 'verb', '建立；确立', 'to create or set up something', 'to stop a service', 'to answer carelessly', 'to reduce all choices', 'establish a habit', 'Students need time to establish a regular review habit.', 'establish 常与 system、habit、relationship 搭配。'],
  ['evaluate', '/ɪˈvæljueɪt/', 'verb', '评估', 'to judge the value or quality of something', 'to travel quickly', 'to make a note shorter', 'to open a door', 'evaluate progress', 'A mock exam can evaluate progress before the real test.', 'evaluate 对应系统评阅、阶段模考和能力验证。'],
  ['expand', '/ɪkˈspænd/', 'verb', '扩大；扩展', 'to become or make something larger', 'to refuse help', 'to make less clear', 'to wait for results', 'expand vocabulary', 'Reading widely can help students expand vocabulary in context.', 'expand vocabulary 是词汇提升常见表达。'],
  ['financial', '/faɪˈnænʃl/', 'adjective', '财政的；金融的', 'related to money', 'related to sound only', 'not useful in public', 'without a plan', 'financial pressure', 'Some students face financial pressure when choosing learning resources.', 'financial 常用于教育成本、家庭和社会话题。'],
  ['function', '/ˈfʌŋkʃn/', 'noun/verb', '功能；运转', 'the purpose something has; to work', 'a wrong belief', 'a type of food', 'a personal story', 'basic function', 'The basic function of feedback is to show the next action.', 'function 常用于科技产品、系统和作用说明。'],
  ['global', '/ˈɡloʊbl/', 'adjective', '全球的', 'related to the whole world', 'limited to one classroom', 'difficult to hear', 'not based on facts', 'global issue', 'Climate change is a global issue that requires cooperation.', 'global issue 是环境与社会发展常用搭配。'],
  ['habit', '/ˈhæbɪt/', 'noun', '习惯', 'something done regularly', 'a public rule', 'a long report', 'a sudden accident', 'study habit', 'A strong study habit is built through small daily actions.', 'habit 常用于学习方法和生活方式主题。'],
  ['historical', '/hɪˈstɔːrɪkl/', 'adjective', '历史的', 'related to history', 'related to numbers only', 'made for private use', 'very easy to break', 'historical site', 'A historical site can help visitors understand local culture.', 'historical 是翻译“中国历史文化”主题基础词。'],
  ['improve', '/ɪmˈpruːv/', 'verb', '提高；改善', 'to become or make something better', 'to hide a problem', 'to spend more money', 'to make a sound lower', 'improve accuracy', 'Reviewing mistakes can improve accuracy in reading.', 'improve 是四级写作最基础的提升类动词。'],
  ['knowledge', '/ˈnɑːlɪdʒ/', 'noun', '知识', 'information and understanding', 'a place for exercise', 'a wrong option', 'a kind of payment', 'background knowledge', 'The passage provides the background knowledge needed for understanding.', 'knowledge 常用于学习、阅读背景和能力迁移。'],
  ['local', '/ˈloʊkl/', 'adjective', '当地的', 'related to a particular area', 'related to the whole world only', 'not useful at all', 'easy to forget', 'local community', 'Local communities can protect traditions in practical ways.', 'local 常用于社区、文化、公共服务话题。'],
  ['measure', '/ˈmeʒər/', 'verb/noun', '测量；措施', 'to find size or amount; an action to solve a problem', 'to remove a question', 'to copy a paragraph', 'to play a recording', 'take measures', 'Schools can take measures to reduce food waste.', 'measure 作名词时常表示“措施”，翻译题高频。'],
  ['mental', '/ˈmentl/', 'adjective', '心理的；精神的', 'related to the mind', 'related to buses', 'impossible to finish', 'without any detail', 'mental health', 'Exercise and sleep are important for students’ mental health.', 'mental health 是校园生活和社会关注主题。'],
  ['organize', '/ˈɔːrɡənaɪz/', 'verb', '组织；整理', 'to arrange things or people in a planned way', 'to lose control', 'to guess the answer', 'to speak too fast', 'organize information', 'Good readers organize information from different paragraphs.', 'organize information 对应阅读归纳和写作结构。'],
  ['outcome', '/ˈaʊtkʌm/', 'noun', '结果', 'the final result of a process', 'a kind of transport', 'a repeated word', 'a person who learns', 'learning outcome', 'The platform records learning outcomes after each session.', 'outcome 比 result 更正式，常用于教育评估。'],
  ['perform', '/pərˈfɔːrm/', 'verb', '表现；执行', 'to do a task or show ability', 'to keep silent', 'to collect waste', 'to make a sentence shorter', 'perform well', 'Students perform better when they practice under time pressure.', 'perform 常用于考试表现和任务执行。'],
  ['practical', '/ˈpræktɪkl/', 'adjective', '实际的；实用的', 'useful and connected with real situations', 'purely imaginary', 'wrong in every way', 'too quiet to hear', 'practical advice', 'The teacher gave practical advice on how to review mistakes.', 'practical 常用于建议、需求和解决方案。'],
  ['previous', '/ˈpriːviəs/', 'adjective', '以前的', 'happening before the present time', 'happening next year', 'not possible to check', 'made without planning', 'previous mistakes', 'Previous mistakes can guide the next training plan.', 'previous 用于时间关系和复习记录表达。'],
  ['process', '/ˈprɑːses/', 'noun/verb', '过程；处理', 'a series of actions; to deal with information', 'a public holiday', 'a wrong answer', 'a kind of sports club', 'learning process', 'Feedback should be part of the learning process.', 'process 常用于学习流程、数据处理和社会过程。'],
  ['protect', '/prəˈtekt/', 'verb', '保护', 'to keep someone or something safe', 'to produce quickly', 'to ignore details', 'to change a title', 'protect privacy', 'Users should protect privacy when using digital services.', 'protect privacy/environment 是科技和环境主题高频搭配。'],
  ['purpose', '/ˈpɜːrpəs/', 'noun', '目的', 'the reason for doing something', 'a place to study', 'a grammar rule', 'a sudden feeling', 'main purpose', 'The main purpose of the report is to explain the policy.', 'purpose 常用于主旨题和写作目的表达。'],
  ['range', '/reɪndʒ/', 'noun', '范围；一系列', 'a variety or area between limits', 'a single exact date', 'a person in a team', 'a hidden mistake', 'a wide range of', 'A wide range of activities can support language learning.', 'a wide range of 是写作常用表达。'],
  ['reduce', '/rɪˈduːs/', 'verb', '减少', 'to make something smaller or less', 'to make a plan longer', 'to refuse a service', 'to record a voice', 'reduce waste', 'Using smaller portions can reduce food waste.', 'reduce 与 waste、cost、pressure、risk 搭配常见。'],
  ['reflect', '/rɪˈflekt/', 'verb', '反映；思考', 'to show or think carefully about something', 'to stop a meeting', 'to carry a heavy object', 'to count money', 'reflect on mistakes', 'Students should reflect on mistakes after practice.', 'reflect on 是复盘、错因归因的核心表达。'],
  ['respond', '/rɪˈspɑːnd/', 'verb', '回应；反应', 'to answer or react to something', 'to make a building taller', 'to lose information', 'to avoid reading', 'respond to feedback', 'Learners should respond to feedback by revising their answers.', 'respond to 常用于反馈、变化和问题应对。'],
  ['responsibility', '/rɪˌspɑːnsəˈbɪləti/', 'noun', '责任', 'a duty to deal with something', 'a simple drawing', 'a private joke', 'a short rest', 'social responsibility', 'Volunteer work can develop students’ sense of social responsibility.', 'responsibility 是校园、志愿和社会主题高频词。'],
  ['select', '/sɪˈlekt/', 'verb', '选择', 'to choose from a group', 'to give up completely', 'to make unclear', 'to arrive early', 'select the best answer', 'In careful reading, students must select the best answer based on evidence.', 'select 常用于题目说明和选择行为。'],
];

const DEGREE_ENGLISH_SYLLABUS_EXTENSION_ROWS: VocabularyExtensionRow[] = [
  ['application', '/ˌæplɪˈkeɪʃn/', 'noun', '申请；应用', 'a formal request or practical use', 'a sudden sound', 'a wrong answer', 'a private joke', 'submit an application', 'Students should submit an application before the deadline.', 'application 对应学位英语小作文中的申请信和应用场景。'],
  ['notice', '/ˈnoʊtɪs/', 'noun/verb', '通知；注意到', 'a written announcement or to become aware of something', 'a repeated grammar rule', 'a hidden cost', 'a kind of transport', 'write a notice', 'The club wrote a notice to inform students about the lecture.', 'notice 是学位英语小作文常见应用文体。'],
  ['appointment', '/əˈpɔɪntmənt/', 'noun', '预约；约定', 'an arrangement to meet someone at a particular time', 'a public holiday', 'a difficult paragraph', 'a wrong option', 'make an appointment', 'Please make an appointment before visiting the office.', 'appointment 常用于信函、通知和校园服务语境。'],
  ['confirm', '/kənˈfɜːrm/', 'verb', '确认', 'to state that something is true or certain', 'to cancel a plan', 'to guess without evidence', 'to copy a sentence', 'confirm the time', 'The secretary confirmed the time and place of the meeting.', 'confirm 用于应用文和完形中的常见动作。'],
  ['postpone', '/poʊˈspoʊn/', 'verb', '推迟', 'to delay an event until a later time', 'to finish early', 'to make something clearer', 'to provide a reason', 'postpone a meeting', 'The meeting was postponed because of heavy rain.', 'postpone 常考词汇辨析，易与 promote 混淆。'],
  ['attend', '/əˈtend/', 'verb', '参加；出席', 'to go to an event, meeting, or class', 'to repair a device', 'to reduce a number', 'to avoid a topic', 'attend a lecture', 'All students are welcome to attend the public lecture.', 'attend 是通知、邀请和校园活动中的高频动词。'],
  ['inform', '/ɪnˈfɔːrm/', 'verb', '通知；告知', 'to tell someone about something', 'to make a mistake', 'to answer in silence', 'to change a score', 'inform students of changes', 'The teacher informed students of the new exam schedule.', 'inform sb. of sth. 是正式通知中的核心搭配。'],
  ['request', '/rɪˈkwest/', 'noun/verb', '请求；要求', 'an act of asking for something politely', 'a reason for failure', 'a kind of festival', 'a paragraph title', 'make a request', 'The student made a polite request for more reading materials.', 'request 支撑申请信、求助信和服务场景。'],
  ['submit', '/səbˈmɪt/', 'verb', '提交', 'to give a document or answer for review', 'to hide a result', 'to stop a service', 'to describe a picture', 'submit a form', 'Candidates must submit the form before Friday.', 'submit 常用于考试、申请和作业场景。'],
  ['recommend', '/ˌrekəˈmend/', 'verb', '推荐；建议', 'to suggest that something is suitable or useful', 'to damage a plan', 'to refuse a question', 'to repeat a sound', 'recommend a method', 'The teacher recommended a practical reading method.', 'recommend 是建议信和观点表达的高频词。'],
  ['summary', '/ˈsʌməri/', 'noun', '总结；概要', 'a short statement of the main ideas', 'a full list of names', 'a private letter', 'a grammar symbol', 'write a summary', 'The second writing task asks students to write a summary and a comment.', 'summary 对应学位英语大作文“概括文章大意”。'],
  ['comment', '/ˈkɑːment/', 'noun/verb', '评论；评价', 'an opinion about something', 'a meeting room', 'a quick payment', 'a wrong pronunciation', 'make a comment', 'After the summary, students should make a brief comment.', 'comment 对应读后评论写作。'],
  ['viewpoint', '/ˈvjuːpɔɪnt/', 'noun', '观点', 'a way of thinking about a subject', 'a detailed address', 'a kind of dictionary', 'an official score', 'express a viewpoint', 'A good paragraph expresses one clear viewpoint.', 'viewpoint 用于写作论证和阅读态度题。'],
  ['attitude', '/ˈætɪtuːd/', 'noun', '态度', 'a feeling or opinion about something', 'a kind of form', 'a short notice', 'a number in a table', 'author attitude', 'Readers should notice the author attitude in the final paragraph.', 'attitude 是阅读推断题常见考点。'],
  ['author', '/ˈɔːθər/', 'noun', '作者', 'the writer of a book or article', 'a public worker', 'a grammar rule', 'a class schedule', 'the author suggests', 'The author suggests that public services should be easier to use.', 'author 常出现在主旨和态度题题干中。'],
  ['article', '/ˈɑːrtɪkl/', 'noun', '文章；物品；冠词', 'a piece of writing or a grammar word like a/an/the', 'a sudden result', 'a long journey', 'a wrong option', 'read an article', 'Candidates read a short article before writing a summary.', 'article 覆盖阅读材料和语法冠词双重考点。'],
  ['paragraph', '/ˈpærəɡræf/', 'noun', '段落', 'a section of writing with one main idea', 'a kind of exam room', 'a public rule', 'a single sound', 'match the paragraph', 'In the matching task, students match headings with paragraphs.', 'paragraph 对应 7 选 5 段落匹配。'],
  ['passage', '/ˈpæsɪdʒ/', 'noun', '文章；段落', 'a short piece of written text', 'a person in charge', 'a form of payment', 'a private habit', 'reading passage', 'Each reading passage is followed by several questions.', 'passage 是阅读训练中的基础题干词。'],
  ['context', '/ˈkɑːntekst/', 'noun', '上下文；语境', 'the words and situation around an idea', 'a final decision', 'a kind of school', 'a wrong spelling', 'understand from context', 'Unknown words can often be understood from context.', 'context 支撑词义猜测和完形填空。'],
  ['infer', '/ɪnˈfɜːr/', 'verb', '推断', 'to reach an opinion from evidence', 'to copy a paragraph', 'to make a notice longer', 'to answer aloud', 'infer the meaning', 'Readers can infer the meaning from examples in the passage.', 'infer 对应阅读推理和引申能力。'],
  ['imply', '/ɪmˈplaɪ/', 'verb', '暗示；意味着', 'to suggest something without saying it directly', 'to arrange chairs', 'to finish a form', 'to choose randomly', 'the sentence implies', 'The sentence implies that regular practice is more useful than sudden effort.', 'imply 是推断题常见动词。'],
  ['detail', '/ˈdiːteɪl/', 'noun', '细节', 'a small piece of information', 'a public event', 'a type of food', 'a wrong method', 'specific detail', 'Traditional reading questions often ask about specific details.', 'detail 对应具体信息定位。'],
  ['grammar', '/ˈɡræmər/', 'noun', '语法', 'the rules for forming words and sentences', 'a school building', 'a social issue', 'a reading habit', 'grammar rule', 'Vocabulary and Structure questions test grammar rules and word usage.', 'grammar 是词汇与语法部分核心内容。'],
  ['structure', '/ˈstrʌktʃər/', 'noun', '结构', 'the way parts are arranged', 'a short meeting', 'a sudden feeling', 'a borrowed book', 'sentence structure', 'Good writing needs clear sentence structure.', 'structure 覆盖语法题和写作结构。'],
  ['clause', '/klɔːz/', 'noun', '从句；分句', 'a group of words with a subject and a verb', 'a person who writes', 'a place for exercise', 'a final result', 'relative clause', 'A relative clause can add information about a noun.', 'clause 是语法单选和长句理解高频点。'],
  ['tense', '/tens/', 'noun/adjective', '时态；紧张的', 'a verb form showing time', 'a type of article', 'a reading title', 'a public service', 'past tense', 'The verb tense should agree with the time expression.', 'tense 对应动词时态语法题。'],
  ['voice', '/vɔɪs/', 'noun', '声音；语态', 'sound made by speaking; active or passive verb form', 'a written notice', 'a payment tool', 'a short summary', 'passive voice', 'The passive voice is often used when the doer is unknown.', 'voice 覆盖听音词义和被动语态。'],
  ['condition', '/kənˈdɪʃn/', 'noun', '条件；状况', 'something required before another thing happens', 'a sentence ending', 'a school subject', 'a wrong example', 'under this condition', 'Under this condition, online courses can help more learners.', 'condition 常用于条件状语和社会议题。'],
  ['unless', '/ənˈles/', 'conjunction', '除非', 'except if', 'because of', 'at the same time as', 'in order to', 'unless it rains', 'The activity will continue unless it rains heavily.', 'unless 是条件状语从句常考连接词。'],
  ['although', '/ɔːlˈðoʊ/', 'conjunction', '虽然；尽管', 'used to introduce a contrasting fact', 'used to show purpose', 'used to list examples', 'used to mark time', 'although it is difficult', 'Although the task is difficult, regular practice can make it manageable.', 'although 对应让步关系和完形逻辑。'],
  ['despite', '/dɪˈspaɪt/', 'preposition', '尽管', 'without being affected by something', 'because of a clear reason', 'before a certain time', 'next to a place', 'despite difficulties', 'Despite limited time, adult learners can improve through focused practice.', 'despite 后接名词或动名词，常与 although 区分。'],
  ['besides', '/bɪˈsaɪdz/', 'adverb/preposition', '此外；除……之外', 'in addition to something', 'as a result of something', 'before an event', 'without a reason', 'besides practice', 'Besides practice, feedback is also necessary.', 'besides 用于补充信息和写作衔接。'],
  ['furthermore', '/ˌfɜːrðərˈmɔːr/', 'adverb', '此外；而且', 'used to add a stronger point', 'used to show time', 'used to deny a fact', 'used to ask a question', 'furthermore, it saves time', 'Furthermore, online services can save time for working adults.', 'furthermore 是正式写作衔接词。'],
  ['conclusion', '/kənˈkluːʒn/', 'noun', '结论', 'a final opinion after considering information', 'a hidden problem', 'a public notice', 'a short appointment', 'draw a conclusion', 'Students should draw a conclusion based on evidence.', 'conclusion 用于阅读推断和作文收束。'],
  ['requirement', '/rɪˈkwaɪərmənt/', 'noun', '要求；必要条件', 'something that must be done or provided', 'a sudden change', 'a wrong option', 'a kind of holiday', 'task requirement', 'Candidates must read the task requirement carefully before writing.', 'requirement 对应应用文任务要求。'],
  ['reference', '/ˈrefrəns/', 'noun', '参考；提及', 'a source of information or mention of something', 'a kind of food', 'a personal feeling', 'a short trip', 'reference material', 'The reference textbook is useful for building grammar and reading skills.', 'reference 对应大纲参考教材和资料。'],
  ['textbook', '/ˈtekstbʊk/', 'noun', '教材', 'a book used for studying a subject', 'a place for public service', 'a final score', 'a repeated habit', 'standard textbook', 'The outline lists a standard textbook as reference material.', 'textbook 直接覆盖大纲参考教材语境。'],
  ['offline', '/ˌɔːfˈlaɪn/', 'adjective/adverb', '线下的；离线的', 'not connected to the internet; in person', 'without any plan', 'later than expected', 'too difficult to read', 'offline exam', 'The degree English exam is an offline closed-book exam.', 'offline 对应线下闭卷考试方式。'],
  ['closed-book', '/ˌkloʊzd ˈbʊk/', 'adjective', '闭卷的', 'done without using books or notes', 'open to every visitor', 'based only on listening', 'written after class', 'closed-book test', 'A closed-book test requires active recall instead of copying notes.', 'closed-book 覆盖考试形式。'],
  ['concentrate', '/ˈkɑːnsntreɪt/', 'verb', '集中注意力', 'to give full attention to something', 'to make a plan later', 'to remove a paragraph', 'to refuse a request', 'concentrate on reading', 'Candidates need to concentrate on reading under time pressure.', 'concentrate on 是学习和考试状态高频搭配。'],
  ['adult', '/ˈædʌlt/', 'noun/adjective', '成年人；成人的', 'a grown person; for grown people', 'a school subject', 'a reading option', 'a small mistake', 'adult learner', 'Many adult learners study English while working.', 'adult learner 对应继续教育学位英语用户画像。'],
  ['certificate', '/sərˈtɪfɪkət/', 'noun', '证书；证明', 'an official document proving something', 'a grammar mistake', 'a short meeting', 'a type of exercise', 'degree certificate', 'Passing the exam may be related to a degree certificate requirement.', 'certificate 是学位英语目标场景相关词。'],
  ['instruction', '/ɪnˈstrʌkʃn/', 'noun', '说明；指令', 'information about how to do something', 'a kind of weather', 'a wrong score', 'a private memory', 'exam instruction', 'The exam instructions are written in English.', 'instruction 对应大纲“考试指导语为英语”。'],
  ['coherent', '/koʊˈhɪrənt/', 'adjective', '连贯的', 'clear and logically connected', 'too short to read', 'wrong in every detail', 'not related to writing', 'coherent paragraph', 'A coherent paragraph connects summary and comment smoothly.', 'coherent 对应写作评分中的语篇连贯。'],
  ['punctuation', '/ˌpʌŋktʃuˈeɪʃn/', 'noun', '标点符号', 'marks such as commas and periods in writing', 'a way of transport', 'a public rule', 'a wrong choice', 'punctuation marks', 'The outline says punctuation is not counted in the writing word limit.', 'punctuation 直接覆盖写作字数要求。'],
  ['distractor', '/dɪˈstræktər/', 'noun', '干扰项', 'an option designed to look possible but be wrong', 'a useful example', 'a final paragraph', 'a writing task', 'remove distractors', 'In the 7-option task, students remove two distractors.', 'distractor 对应 7 选 5 阅读要求。'],
];

const CET4_SYLLABUS_EXTENSION_VOCABULARY: VocabularyPracticeItem[] =
  [
    ...CET4_SYLLABUS_EXTENSION_ROWS,
    ...DEGREE_ENGLISH_SYLLABUS_EXTENSION_ROWS,
  ].map(buildVocabularyItem);

export const CET4_VOCABULARY_BANK: VocabularyPracticeItem[] = [
  {
    id: 'vocab-adapt',
    word: 'adapt',
    phonetic: '/əˈdæpt/',
    partOfSpeech: 'verb',
    meaning: '适应；改编',
    options: {
      A: 'to refuse a new situation',
      B: 'to adjust to a new condition',
      C: 'to remove something completely',
      D: 'to describe something in detail',
    },
    correctAnswer: 'B',
    collocation: 'adapt to online learning',
    example: 'Students need to adapt to online learning when classes move to digital platforms.',
    explanation: 'adapt to 表示“适应……”，CET-4 阅读和写作中常用于环境、学习方式或技术变化。',
  },
  {
    id: 'vocab-enhance',
    word: 'enhance',
    phonetic: '/ɪnˈhæns/',
    partOfSpeech: 'verb',
    meaning: '提高；增强',
    options: {
      A: 'to make something better or stronger',
      B: 'to make something disappear',
      C: 'to measure something exactly',
      D: 'to delay a decision',
    },
    correctAnswer: 'A',
    collocation: 'enhance learning efficiency',
    example: 'Regular review can enhance learning efficiency and reduce repeated mistakes.',
    explanation: 'enhance 比 improve 更正式，适合写作中替换“make better”。',
  },
  {
    id: 'vocab-exacerbate',
    word: 'exacerbate',
    phonetic: '/ɪɡˈzæsərbeɪt/',
    partOfSpeech: 'verb',
    meaning: '使恶化；加剧',
    options: {
      A: 'to solve a problem quickly',
      B: 'to make a problem worse',
      C: 'to compare two similar ideas',
      D: 'to create a useful habit',
    },
    correctAnswer: 'B',
    collocation: 'exacerbate existing inequalities',
    example: 'Unequal access to technology may exacerbate existing inequalities.',
    explanation: 'exacerbate 常与 problem、inequality、tension 搭配，表示负面情况加剧。',
  },
  {
    id: 'vocab-implement',
    word: 'implement',
    phonetic: '/ˈɪmplɪment/',
    partOfSpeech: 'verb',
    meaning: '实施；执行',
    options: {
      A: 'to put a plan into action',
      B: 'to translate a passage',
      C: 'to forget a detail',
      D: 'to avoid responsibility',
    },
    correctAnswer: 'A',
    collocation: 'implement a study plan',
    example: 'A realistic study plan is useful only when students implement it consistently.',
    explanation: 'implement 强调把计划、政策、方法真正落地执行。',
  },
  {
    id: 'vocab-inevitable',
    word: 'inevitable',
    phonetic: '/ɪnˈevɪtəbl/',
    partOfSpeech: 'adjective',
    meaning: '不可避免的',
    options: {
      A: 'hard to understand',
      B: 'impossible to avoid',
      C: 'easy to forget',
      D: 'safe and reliable',
    },
    correctAnswer: 'B',
    collocation: 'an inevitable trend',
    example: 'The use of digital tools in education seems to be an inevitable trend.',
    explanation: 'inevitable 常用于趋势判断，写作中可替换 unavoidable。',
  },
  {
    id: 'vocab-privacy',
    word: 'privacy',
    phonetic: '/ˈpraɪvəsi/',
    partOfSpeech: 'noun',
    meaning: '隐私',
    options: {
      A: 'personal information protection',
      B: 'public transportation',
      C: 'a learning schedule',
      D: 'an official certificate',
    },
    correctAnswer: 'A',
    collocation: 'data privacy',
    example: 'Data privacy is a major concern when students use AI learning tools.',
    explanation: 'privacy 在科技、教育、网络安全主题中高频出现。',
  },
  {
    id: 'vocab-sustainable',
    word: 'sustainable',
    phonetic: '/səˈsteɪnəbl/',
    partOfSpeech: 'adjective',
    meaning: '可持续的',
    options: {
      A: 'lasting without damaging future resources',
      B: 'requiring no effort',
      C: 'limited to one person',
      D: 'related to ancient culture only',
    },
    correctAnswer: 'A',
    collocation: 'sustainable development',
    example: 'Cities should encourage sustainable development while protecting local communities.',
    explanation: 'sustainable development 是 CET-4 环境与城市主题常见表达。',
  },
  {
    id: 'vocab-facilitate',
    word: 'facilitate',
    phonetic: '/fəˈsɪlɪteɪt/',
    partOfSpeech: 'verb',
    meaning: '促进；使便利',
    options: {
      A: 'to make a process easier',
      B: 'to punish someone',
      C: 'to copy a paragraph',
      D: 'to lose interest',
    },
    correctAnswer: 'A',
    collocation: 'facilitate communication',
    example: 'Online platforms can facilitate communication between teachers and students.',
    explanation: 'facilitate 是正式写作高频动词，可用于学习、沟通、合作等场景。',
  },
  {
    id: 'vocab-alternative',
    word: 'alternative',
    phonetic: '/ɔːlˈtɜːrnətɪv/',
    partOfSpeech: 'noun/adjective',
    meaning: '可替代的；替代方案',
    options: {
      A: 'a possible different choice',
      B: 'a repeated mistake',
      C: 'a personal habit',
      D: 'a grammar rule',
    },
    correctAnswer: 'A',
    collocation: 'alternative energy',
    example: 'Solar power is often seen as an alternative energy source.',
    explanation: 'alternative 可作名词也可作形容词，常见搭配包括 alternative energy / an alternative to。',
  },
  {
    id: 'vocab-mentorship',
    word: 'mentorship',
    phonetic: '/ˈmentərʃɪp/',
    partOfSpeech: 'noun',
    meaning: '导师指导；辅导关系',
    options: {
      A: 'guidance from an experienced person',
      B: 'a sudden technical failure',
      C: 'a type of public exam',
      D: 'a short news report',
    },
    correctAnswer: 'A',
    collocation: 'human mentorship',
    example: 'Human mentorship remains important even when AI tools become more common.',
    explanation: 'mentorship 常用于教育、职业发展主题，表示有经验者的持续指导。',
  },
  {
    id: 'vocab-consistent',
    word: 'consistent',
    phonetic: '/kənˈsɪstənt/',
    partOfSpeech: 'adjective',
    meaning: '持续一致的；稳定的',
    options: {
      A: 'changing every minute',
      B: 'done in the same way over time',
      C: 'too expensive to use',
      D: 'not related to the topic',
    },
    correctAnswer: 'B',
    collocation: 'consistent practice',
    example: 'Consistent practice is more effective than studying for many hours only once.',
    explanation: 'consistent practice 可直接用于学习方法表达，强调稳定重复。',
  },
  {
    id: 'vocab-retrieve',
    word: 'retrieve',
    phonetic: '/rɪˈtriːv/',
    partOfSpeech: 'verb',
    meaning: '取回；检索；主动提取',
    options: {
      A: 'to bring information back from memory',
      B: 'to ignore a useful clue',
      C: 'to make a sound louder',
      D: 'to cancel an activity',
    },
    correctAnswer: 'A',
    collocation: 'retrieve information from memory',
    example: 'Active recall helps learners retrieve information from memory instead of only rereading it.',
    explanation: 'retrieve 是主动回忆学习法的核心词，适合连接词汇练习和复习系统。',
  },
  {
    id: 'vocab-acquire',
    word: 'acquire',
    phonetic: '/əˈkwaɪər/',
    partOfSpeech: 'verb',
    meaning: '获得；习得',
    options: {
      A: 'to lose something by accident',
      B: 'to gain knowledge or skill gradually',
      C: 'to make a plan less useful',
      D: 'to avoid a public problem',
    },
    correctAnswer: 'B',
    collocation: 'acquire language skills',
    example: 'Students acquire language skills more effectively when they use words in context.',
    explanation: 'acquire 常用于“习得语言、获得技能”，比 get 更正式。',
  },
  {
    id: 'vocab-analyze',
    word: 'analyze',
    phonetic: '/ˈænəlaɪz/',
    partOfSpeech: 'verb',
    meaning: '分析',
    options: {
      A: 'to study something carefully',
      B: 'to copy a sentence directly',
      C: 'to cancel a plan suddenly',
      D: 'to hide useful information',
    },
    correctAnswer: 'A',
    collocation: 'analyze the reason for a mistake',
    example: 'A good learner analyzes the reason for a mistake before reviewing it.',
    explanation: 'analyze 与 reason、data、problem 搭配频繁，适合错因分析场景。',
  },
  {
    id: 'vocab-approach',
    word: 'approach',
    phonetic: '/əˈproʊtʃ/',
    partOfSpeech: 'noun/verb',
    meaning: '方法；接近',
    options: {
      A: 'a way of dealing with a problem',
      B: 'a person who refuses help',
      C: 'a small spelling mistake',
      D: 'a sudden weather change',
    },
    correctAnswer: 'A',
    collocation: 'a balanced approach',
    example: 'A balanced approach combines practice, feedback, and review.',
    explanation: 'approach 作名词时表示“方法、路径”，写作中常用 a balanced approach。',
  },
  {
    id: 'vocab-crucial',
    word: 'crucial',
    phonetic: '/ˈkruːʃl/',
    partOfSpeech: 'adjective',
    meaning: '关键的；至关重要的',
    options: {
      A: 'not connected with the result',
      B: 'extremely important',
      C: 'easy to replace',
      D: 'available for a short time only',
    },
    correctAnswer: 'B',
    collocation: 'a crucial factor',
    example: 'Specific feedback is a crucial factor in efficient learning.',
    explanation: 'crucial 强调决定性作用，可替换 very important。',
  },
  {
    id: 'vocab-demonstrate',
    word: 'demonstrate',
    phonetic: '/ˈdemənstreɪt/',
    partOfSpeech: 'verb',
    meaning: '证明；展示',
    options: {
      A: 'to show something clearly',
      B: 'to make something illegal',
      C: 'to remember nothing',
      D: 'to create confusion on purpose',
    },
    correctAnswer: 'A',
    collocation: 'demonstrate improvement',
    example: 'The weekly report demonstrates whether a learner is improving.',
    explanation: 'demonstrate 常用于“证明观点、展示变化、说明结果”。',
  },
  {
    id: 'vocab-efficient',
    word: 'efficient',
    phonetic: '/ɪˈfɪʃnt/',
    partOfSpeech: 'adjective',
    meaning: '高效的',
    options: {
      A: 'using time and effort well',
      B: 'requiring no clear goal',
      C: 'full of repeated errors',
      D: 'limited to one sentence',
    },
    correctAnswer: 'A',
    collocation: 'efficient review',
    example: 'Efficient review focuses on mistakes with high exam value.',
    explanation: 'efficient 强调“时间和努力利用得好”，区别于 effective 的“有效”。',
  },
  {
    id: 'vocab-evidence',
    word: 'evidence',
    phonetic: '/ˈevɪdəns/',
    partOfSpeech: 'noun',
    meaning: '证据',
    options: {
      A: 'facts that show something is true',
      B: 'a plan with no details',
      C: 'a person who teaches grammar',
      D: 'a type of entertainment',
    },
    correctAnswer: 'A',
    collocation: 'ability evidence',
    example: 'Every practice session should create ability evidence for the next plan.',
    explanation: 'evidence 常与 data、ability、research 搭配，是阅读和写作常见词。',
  },
  {
    id: 'vocab-flexible',
    word: 'flexible',
    phonetic: '/ˈfleksəbl/',
    partOfSpeech: 'adjective',
    meaning: '灵活的',
    options: {
      A: 'able to change according to needs',
      B: 'fixed and impossible to change',
      C: 'too weak to be useful',
      D: 'related only to money',
    },
    correctAnswer: 'A',
    collocation: 'a flexible schedule',
    example: 'Students with part-time jobs need a flexible schedule for review.',
    explanation: 'flexible schedule / flexible learning 是教育主题高频搭配。',
  },
  {
    id: 'vocab-generate',
    word: 'generate',
    phonetic: '/ˈdʒenəreɪt/',
    partOfSpeech: 'verb',
    meaning: '生成；产生',
    options: {
      A: 'to produce or create something',
      B: 'to break a useful habit',
      C: 'to read without thinking',
      D: 'to avoid all feedback',
    },
    correctAnswer: 'A',
    collocation: 'generate a daily plan',
    example: 'The system can generate a daily plan based on mistakes and review dates.',
    explanation: 'generate 常用于系统、数据、计划、结果等场景。',
  },
  {
    id: 'vocab-maintain',
    word: 'maintain',
    phonetic: '/meɪnˈteɪn/',
    partOfSpeech: 'verb',
    meaning: '维持；维护',
    options: {
      A: 'to keep something at a good level',
      B: 'to stop using a method',
      C: 'to guess without evidence',
      D: 'to make a sentence shorter',
    },
    correctAnswer: 'A',
    collocation: 'maintain learning momentum',
    example: 'Short daily tasks help learners maintain learning momentum.',
    explanation: 'maintain 可接 level、relationship、momentum、system 等名词。',
  },
  {
    id: 'vocab-opportunity',
    word: 'opportunity',
    phonetic: '/ˌɑːpərˈtuːnəti/',
    partOfSpeech: 'noun',
    meaning: '机会',
    options: {
      A: 'a chance to do something useful',
      B: 'a rule that cannot change',
      C: 'a sentence with no verb',
      D: 'a repeated listening mistake',
    },
    correctAnswer: 'A',
    collocation: 'learning opportunity',
    example: 'A mistake can become a learning opportunity if it is reviewed well.',
    explanation: 'opportunity 常用于教育、就业、发展主题。',
  },
  {
    id: 'vocab-perspective',
    word: 'perspective',
    phonetic: '/pərˈspektɪv/',
    partOfSpeech: 'noun',
    meaning: '角度；观点',
    options: {
      A: 'a way of thinking about something',
      B: 'a direct copy of a text',
      C: 'a device for recording sound',
      D: 'a fixed exam room',
    },
    correctAnswer: 'A',
    collocation: 'from a different perspective',
    example: 'Feedback helps students look at their answers from a different perspective.',
    explanation: 'perspective 常用于观点表达，可替换 view。',
  },
  {
    id: 'vocab-potential',
    word: 'potential',
    phonetic: '/pəˈtenʃl/',
    partOfSpeech: 'noun/adjective',
    meaning: '潜力；潜在的',
    options: {
      A: 'possible but not yet fully developed',
      B: 'already impossible to improve',
      C: 'limited to one exact answer',
      D: 'made of expensive materials',
    },
    correctAnswer: 'A',
    collocation: 'potential benefit',
    example: 'AI tools have potential benefits, but they also need careful use.',
    explanation: 'potential benefit / potential risk 是议论文常用搭配。',
  },
  {
    id: 'vocab-regulate',
    word: 'regulate',
    phonetic: '/ˈreɡjuleɪt/',
    partOfSpeech: 'verb',
    meaning: '监管；调节',
    options: {
      A: 'to control something by rules',
      B: 'to make something less clear',
      C: 'to finish an exam early',
      D: 'to speak without pauses',
    },
    correctAnswer: 'A',
    collocation: 'regulate data use',
    example: 'Schools should regulate data use when students learn with digital tools.',
    explanation: 'regulate 常用于技术、环境、市场、数据隐私等话题。',
  },
  {
    id: 'vocab-resource',
    word: 'resource',
    phonetic: '/ˈriːsɔːrs/',
    partOfSpeech: 'noun',
    meaning: '资源',
    options: {
      A: 'something useful for achieving a goal',
      B: 'a mistake that cannot be corrected',
      C: 'a type of grammar tense',
      D: 'a short break after class',
    },
    correctAnswer: 'A',
    collocation: 'learning resources',
    example: 'Open learning resources can support students who study independently.',
    explanation: 'resource 在教育、环境、科技主题中高频出现。',
  },
  {
    id: 'vocab-significant',
    word: 'significant',
    phonetic: '/sɪɡˈnɪfɪkənt/',
    partOfSpeech: 'adjective',
    meaning: '显著的；重要的',
    options: {
      A: 'important or large enough to notice',
      B: 'too small to mention',
      C: 'incorrect in every situation',
      D: 'popular only for one day',
    },
    correctAnswer: 'A',
    collocation: 'a significant improvement',
    example: 'Spaced review can lead to a significant improvement in long-term memory.',
    explanation: 'significant 可用于描述变化、影响、差异，写作中很常见。',
  },
  {
    id: 'vocab-transfer',
    word: 'transfer',
    phonetic: '/trænsˈfɜːr/',
    partOfSpeech: 'verb/noun',
    meaning: '转移；迁移',
    options: {
      A: 'to move something from one place or use to another',
      B: 'to refuse to answer a question',
      C: 'to make all choices the same',
      D: 'to remove evidence from a report',
    },
    correctAnswer: 'A',
    collocation: 'transfer knowledge',
    example: 'Learners should transfer vocabulary from reading to writing and speaking.',
    explanation: 'transfer knowledge 表示把知识迁移到新场景，是学习效果的重要指标。',
  },
  {
    id: 'vocab-urban',
    word: 'urban',
    phonetic: '/ˈɜːrbən/',
    partOfSpeech: 'adjective',
    meaning: '城市的',
    options: {
      A: 'related to cities',
      B: 'related to ancient stories only',
      C: 'without any public service',
      D: 'impossible to measure',
    },
    correctAnswer: 'A',
    collocation: 'urban development',
    example: 'Public transport plays an important role in urban development.',
    explanation: 'urban development / urban life 是四级常见社会话题表达。',
  },
  {
    id: 'vocab-visible',
    word: 'visible',
    phonetic: '/ˈvɪzəbl/',
    partOfSpeech: 'adjective',
    meaning: '可见的；明显的',
    options: {
      A: 'able to be seen or noticed',
      B: 'impossible to understand',
      C: 'heard but not written',
      D: 'kept completely secret',
    },
    correctAnswer: 'A',
    collocation: 'make progress visible',
    example: 'A progress chart can make learning progress visible.',
    explanation: 'visible 常用于“使问题/进步/影响可见”，适合产品和学习分析语境。',
  },
  ...CET4_SYLLABUS_EXTENSION_VOCABULARY,
];

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
