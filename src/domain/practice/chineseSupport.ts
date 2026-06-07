import { Question, QuestionChineseSupport } from '../../types';

type Choice = 'A' | 'B' | 'C' | 'D';

const AI_EDU_CONTEXT =
  '文章讨论人工智能进入现代教育后的机会与风险：支持者强调个性化学习和适应性练习，批评者担心隐私、偏见、基础能力下降以及教育不平等。结论强调 AI 应辅助教师，而不是取代人类导师。';

const AI_EDU_QUESTION_SUPPORT: Record<string, QuestionChineseSupport> = {
  '1': {
    question: '根据文章，当前 AI 教育工具的一个主要局限是什么？',
    options: {
      A: '它们对大多数公立学校来说太昂贵。',
      B: '它们难以有效培养高阶推理能力和共情能力。',
      C: '它们天生会歧视某些学生群体。',
      D: '它们取代了传统课程开发的需要。',
    },
  },
  '2': {
    question: '根据文章，自适应学习平台的一个主要好处是什么？',
    options: {
      A: '它们完全取代传统教师。',
      B: '它们必然导致基础学习能力下降。',
      C: '它们会根据个人学习进度调整练习难度。',
      D: '它们让所有课堂使用完全相同的教学方法。',
    },
  },
  '3': {
    question: '批评者担心 AI 在教育中的广泛采用可能会造成什么结果？',
    options: {
      A: '减少分配给科学研究的经费。',
      B: '扩大富裕学校与贫困学校之间的教育差距。',
      C: '降低公立学校整体毕业率。',
      D: '迫使有经验的教师提前退休。',
    },
  },
  '4': {
    question: '关于数字时代的“人类导师作用”，作者提出了什么看法？',
    options: {
      A: '应由先进的虚拟人类教练取代以节省成本。',
      B: '它不可替代，必须与 AI 工具一起保留下来。',
      C: '它只应专注于教授基础语法规则。',
      D: '它需要通过集中化数字追踪实现标准化。',
    },
  },
  '5': {
    question: '下面哪一个最适合作为文章标题？',
    options: {
      A: '教师主导课堂即将消亡。',
      B: 'AI 如何加剧全球经济不平等。',
      C: '平衡机会与担忧：现代教育中的 AI。',
      D: '培养批判性思维的技术指南。',
    },
  },
};

const SPECIFIC_READING_QUESTION_TRANSLATIONS: Record<string, string> = {
  'What benefit of green technology is mentioned in the first paragraph?': '第一段提到了绿色技术的什么好处？',
  'What concern do critics raise about batteries and electronic parts?': '批评者对电池和电子零部件提出了什么担忧？',
  'Which condition is necessary for green technology to support sustainable development?':
    '要让绿色技术真正支持可持续发展，哪个条件是必要的？',
  'What new role of community libraries is described in the passage?': '文章描述了社区图书馆的什么新角色？',
  'According to the passage, what makes a library program successful?': '根据文章，什么使图书馆项目取得成功？',
  'What challenge is mentioned in the last paragraph?': '最后一段提到了什么挑战？',
  'What does sleep help the brain do?': '睡眠有助于大脑完成什么？',
  'Which method is recommended before sleep?': '睡前推荐采用哪种方法？',
  'What is the main idea of the passage?': '这篇文章的主旨是什么？',
  'What is one benefit of digital public services mentioned in the first paragraph?':
    '第一段提到了数字公共服务的哪一项好处？',
  'Why may online-only public services create a new barrier?': '为什么只提供线上形式的公共服务可能带来新的障碍？',
  'What privacy issue is mentioned in the passage?': '文章提到了什么隐私问题？',
  "What is the author's main suggestion?": '作者的主要建议是什么？',
  'According to the passage, what can a reliable public transport system do?': '根据文章，可靠的公共交通系统能够起到什么作用？',
  'What problem may occur if routes focus only on the city center?': '如果线路只围绕市中心设置，可能出现什么问题？',
  'Why does the passage mention passenger surveys?': '文章为什么提到乘客调查？',
  "Which best summarizes the author's view of a good transport system?": '以下哪项最能概括作者对良好交通系统的看法？',
  'What does the passage include as cultural heritage?': '文章把哪些内容视为文化遗产？',
  'What risk does the author mention about online presentations of traditions?': '作者提到在线展示传统文化会带来什么风险？',
  'What can schools do according to the last paragraph?': '根据最后一段，学校可以做什么？',
  'Why do many adult learners return to university?': '为什么许多成年学习者会重返大学？',
  'What practical problem is mentioned in the first paragraph?': '第一段提到了什么现实问题？',
  'According to the passage, what do successful programs do?': '根据文章，成功的项目会怎么做？',
  'What can quick feedback help learners do?': '快速反馈能帮助学习者做什么？',
  'Which example of digital public services is mentioned?': '文中提到了数字公共服务的哪个例子？',
  'Who may still need face-to-face help?': '谁可能仍然需要面对面的帮助？',
  'What risk is caused by closing too many service windows too quickly?': '过快关闭过多服务窗口会带来什么风险？',
  'What should a good digital service keep?': '优质的数字服务应当保留什么？',
  'What balance does the passage support?': '文章支持哪种平衡？',
  'What helps people understand where they come from?': '什么能帮助人们理解自己的来处？',
  'Which digital tool is mentioned for cultural protection?': '文章提到了哪种用于文化保护的数字工具？',
  'What does the passage say students can do?': '文章提到学生可以做什么？',
  'What danger is mentioned in the last paragraph?': '最后一段提到了什么危险？',
  "Which statement best expresses the author's attitude?": '以下哪项最能体现作者的态度？',
};

const COMMON_LISTENING_TEXT: Record<string, string> = {
  'A detail not supported by the listening material.': '听力材料不支持的细节。',
  'A common trap that changes the original meaning.': '改变原文意思的常见陷阱。',
  'An unrelated or exaggerated statement.': '无关或夸大的说法。',
  'The opposite of the source information.': '与原文信息相反的说法。',
  'They want to make it more useful through planning and feedback.': '他们想通过规划和反馈让它更有用。',
  'Collect feedback and test whether the suggested action works.': '收集反馈并测试建议行动是否有效。',
  'To make the suggestion easier to understand.': '为了让建议更容易理解。',
  'People do not receive clear guidance or feedback.': '人们没有得到清晰指导或反馈。',
  'If feedback shows that the plan solves a real problem.': '如果反馈显示这个计划解决了真实问题。',
  'The plan may take more time than expected.': '这个计划可能比预期花费更多时间。',
  'It helps the student locate information under exam pressure.': '它帮助学生在考试压力下定位信息。',
  'She only reviewed vocabulary lists instead of practicing passages.': '她只复习了词汇表，没有练习完整篇章。',
  'She may pause too often when explaining ideas.': '她解释观点时可能停顿太多。',
  'Practice one-minute answers with a clear example.': '练习带有清晰例子的一分钟回答。',
  'The survey data is not organized clearly.': '调查数据整理得不够清楚。',
  'On Thursday after the writing class.': '周四写作课之后。',
  'She wants work experience without leaving campus.': '她想获得工作经验，同时不用离开校园。',
  'A short resume and a weekly timetable.': '一份简短简历和一张每周时间表。',
  'Recent survey data about residents’ reading habits.': '关于居民阅读习惯的最新调查数据。',
  'Online borrowing records and in-person visits.': '线上借阅记录和线下到访情况。',
  'Students know the posters but do not join the activities.': '学生知道海报，但没有参加活动。',
  'Holding ten-minute activities near the cafeteria.': '在食堂附近举办十分钟活动。',
  'The lessons were long and lacked short quizzes.': '课程太长，而且缺少短测验。',
  'Taking notes and testing recall after each part.': '每一部分后做笔记并测试回忆。',
  'The cost of buying too many learning resources.': '购买太多学习资源的成本。',
  'Use free library materials before paying for new courses.': '先使用免费的图书馆材料，再付费购买新课程。',
};

const COMMON_LISTENING_PROMPTS: Record<string, string> = {
  'What service does the new campus learning center provide?': '新校园学习中心提供什么服务？',
  'Why did the city start the bicycle repair program?': '这座城市为什么启动自行车维修项目？',
  'What change will the public library make during exam week?': '公共图书馆会在考试周做出什么调整？',
  'What result did the food-waste project report?': '减少食物浪费项目报告了什么结果？',
  'Who is the online safety workshop mainly designed for?': '线上安全工作坊主要面向谁？',
  'Why was the volunteer activity delayed?': '志愿活动为什么被推迟？',
  'What benefit can students get at the city museum?': '学生在市博物馆可以获得什么收获？',
  'Why does the tutor recommend timed reading?': '导师为什么建议限时阅读？',
  'What mistake did the student make before the quiz?': '测验前学生犯了什么错误？',
  'What is the woman worried about before joining the speaking club?': '加入口语社团前，女生担心什么？',
  'What does the man suggest she do first?': '男生建议她先做什么？',
  'What problem does the group project face?': '小组项目遇到了什么问题？',
  'When will the students meet again?': '学生们什么时候再次见面？',
  'Why does the student want a campus job?': '学生为什么想找一份校内工作？',
  'What does the advisor ask the student to prepare?': '顾问要求学生准备什么？',
  'What did the memory study find?': '这项记忆研究发现了什么？',
  'What should learners avoid according to the passage?': '根据这段材料，学习者应避免什么？',
  'What change helped the dormitory save energy?': '哪项变化帮助宿舍节省了能源？',
  'Why were the reports effective?': '这些报告为什么有效？',
  'What challenge do part-time learners often face?': '兼职学习者经常面临什么挑战？',
  'What kind of plan is recommended for part-time learners?': '建议兼职学习者采用什么样的计划？',
  'What is one social value of city gardens?': '城市花园具有哪一项社会价值？',
  'What problem do city gardens still need to solve?': '城市花园仍需解决什么问题？',
  'What makes AI feedback useful in learning?': '什么让 AI 反馈在学习中真正有用？',
  'What risk does the speaker mention about AI feedback?': '说话者提到了 AI 反馈的什么风险？',
  'What new service did the campus health center open?': '校园健康中心新开设了什么服务？',
  'Why was the local bus app updated?': '本地公交应用为什么更新？',
  'What did the recycling contest encourage students to do?': '回收竞赛鼓励学生做什么？',
  "Who is the museum's online tour mainly designed for?": '博物馆的线上导览主要面向谁？',
  'What does the woman need for her library project?': '女生的图书馆项目需要什么？',
  'What does the man suggest she compare?': '男生建议她比较什么？',
  'What is the main problem with the health campaign?': '健康宣传活动的主要问题是什么？',
  'What change will they try next week?': '他们下周会尝试什么改变？',
  'Why did the student stop watching the online course?': '学生为什么停止观看在线课程？',
  'What does the tutor recommend?': '导师建议什么？',
  'What is the student worried about?': '学生担心什么？',
  "What is the advisor's first suggestion?": '顾问的第一个建议是什么？',
  'Why do public sports facilities matter?': '为什么公共体育设施很重要？',
  'What problem may reduce the value of these facilities?': '什么问题可能削弱这些设施的价值？',
  'What advantage of digital reading is mentioned?': '文中提到了数字阅读的什么优势？',
  'What habit does the speaker recommend?': '说话者建议养成什么习惯？',
  'What action does the advisor suggest?': '顾问建议采取什么行动？',
  'What does the advisor suggest doing first?': '顾问建议先做什么？',
  'What will the speakers probably do next?': '说话者接下来可能会做什么？',
  'Why does the speaker give an example?': '说话者为什么举例？',
  'What is one cause of the problem?': '这个问题的一个原因是什么？',
  'Under what condition will the plan continue?': '在什么条件下计划会继续？',
  'What reservation does the speaker have?': '说话者有什么保留意见？',
};

const TOPIC_GLOSSARY: Record<string, string> = {
  'campus library services': '校园图书馆服务',
  'online privacy protection': '在线隐私保护',
  'food safety awareness': '食品安全意识',
  'green travel choices': '绿色出行选择',
  'mental health support': '心理健康支持',
  'public transport planning': '公共交通规划',
  'community service': '社区服务',
  'traditional crafts': '传统手工艺',
  'rural development': '乡村发展',
  'digital museums': '数字博物馆',
  'family education': '家庭教育',
  'environmental awareness': '环保意识',
  'shared bicycles': '共享单车',
  'smart city services': '智慧城市服务',
  'reading campaigns': '阅读推广活动',
  'public sports facilities': '公共体育设施',
  'online education': '在线教育',
  'urban parks': '城市公园',
  'career planning': '职业规划',
  'public health education': '公共健康教育',
  'science literacy': '科学素养',
  'volunteer tutoring': '志愿辅导',
  'digital reading': '数字阅读',
  'campus safety': '校园安全',
  'green technology': '绿色技术',
  'campus health programs': '校园健康项目',
  'reducing food waste': '减少食物浪费',
  'online courses': '在线课程',
  'community volunteer work': '社区志愿服务',
  'smart devices': '智能设备',
  'part-time work': '兼职工作',
  'teamwork in study': '学习中的团队合作',
  'time management': '时间管理',
  'recycling programs': '回收项目',
  'mobile payment': '移动支付',
  'high-speed rail': '高铁',
  'community libraries': '社区图书馆',
  'digital public services': '数字公共服务',
  'public transport system': '公共交通系统',
  'cultural heritage': '文化遗产',
  'adult learners': '成年学习者',
  'rural tourism': '乡村旅游',
};

const OPTION_PHRASE_TRANSLATIONS: Array<[RegExp, string]> = [
  [/Some students use libraries only before exams and miss the value of regular reading support/i, '有些学生只在考试前使用图书馆，忽视了常规阅读支持的价值。'],
  [/connect borrowing records, reading workshops, and personalized resource suggestions/i, '连接借阅记录、阅读工作坊和个性化资源建议。'],
  [/Many users agree to online terms without understanding what data is collected/i, '很多用户同意在线条款，却不了解哪些数据被收集。'],
  [/teach basic data rules, encourage safer passwords, and explain privacy settings clearly/i, '教授基本数据规则，鼓励更安全的密码，并清楚解释隐私设置。'],
  [/Information about food sources may be difficult for ordinary consumers to check/i, '普通消费者可能很难核查食品来源信息。'],
  [/make product information clearer and strengthen responsibility among producers/i, '让产品信息更清晰，并强化生产者责任。'],
  [/Green travel may remain inconvenient if routes and facilities are poorly planned/i, '如果路线和设施规划不佳，绿色出行仍可能不方便。'],
  [/improve transport connections and provide safe spaces for walking and cycling/i, '改善交通连接，并提供安全的步行和骑行空间。'],
  [/Some students avoid support because they worry about being judged by others/i, '有些学生因担心被别人评价而回避支持。'],
  [/offer private consultations, peer support, and clear information about stress management/i, '提供私密咨询、同伴支持和清晰的压力管理信息。'],
  [/People in new communities may still depend on cars if routes are not balanced/i, '如果路线不均衡，新社区居民可能仍依赖汽车。'],
  [/compare passenger surveys with real travel data before changing routes/i, '调整路线前比较乘客调查和真实出行数据。'],
  [/Some service activities are short and do not match the real needs of local residents/i, '有些服务活动时间短，也不匹配当地居民的真实需要。'],
  [/match service tasks with local needs and evaluate results after each project/i, '把服务任务与当地需求匹配，并在每个项目后评估结果。'],
  [/Some crafts are shown only as quick performances without enough background explanation/i, '有些手工艺只作为快速表演展示，缺少背景解释。'],
  [/combine demonstrations with school courses and stories about local history/i, '把展示活动与学校课程和本地历史故事结合。'],
  [/Rapid development may damage the environment if local conditions are ignored/i, '如果忽视当地条件，快速发展可能破坏环境。'],
  [/protect natural resources while improving transport, education, and business support/i, '在改善交通、教育和商业支持的同时保护自然资源。'],
  [/Online visitors may only look at images and miss the story behind each exhibit/i, '线上参观者可能只看图片，错过每件展品背后的故事。'],
  [/provide simple background notes, guided questions, and links to related exhibits/i, '提供简单背景说明、引导问题和相关展品链接。'],
  [/Some families focus only on scores and ignore emotional support/i, '有些家庭只关注分数，忽视情感支持。'],
  [/build regular communication and encourage children to solve problems independently/i, '建立定期沟通，并鼓励孩子独立解决问题。'],
  [/Public campaigns may not change behavior if results are never measured/i, '如果从不衡量结果，公共宣传可能无法改变行为。'],
  [/show visible data about waste, energy use, and community participation/i, '展示关于浪费、能源使用和社区参与的可见数据。'],
  [/Poor parking habits may block sidewalks and create management problems/i, '不良停车习惯可能堵塞人行道并造成管理问题。'],
  [/set clear parking areas and use reminders to encourage responsible behavior/i, '设置清晰停车区，并用提醒鼓励负责任行为。'],
  [/Digital systems may exclude residents who are not confident with mobile apps/i, '数字系统可能排除不熟悉手机应用的居民。'],
  [/keep offline support while improving data security and app instructions/i, '保留线下支持，同时改进数据安全和应用说明。'],
  [/Some campaigns count attendance but do not check whether reading habits improve/i, '有些活动只统计参与人数，不检查阅读习惯是否改善。'],
  [/combine book fairs with reading groups, notes, and follow-up activities/i, '把书展与阅读小组、笔记和后续活动结合。'],
  [/Facilities lose value if they are far away or poorly maintained/i, '如果距离太远或维护不佳，设施会失去价值。'],
  [/collect local feedback and arrange regular maintenance/i, '收集本地反馈并安排定期维护。'],
  [/Learners may watch videos passively and fail to test their understanding/i, '学习者可能被动看视频，却没有测试理解。'],
  [/Information may be ignored if it is too technical or far from real life/i, '如果信息太技术化或脱离现实生活，就可能被忽视。'],
  [/use simple examples, local data, and practical guidance/i, '使用简单例子、本地数据和实用指导。'],
  [/People may accept claims too quickly if they do not know how evidence works/i, '如果不了解证据如何发挥作用，人们可能太快接受说法。'],
  [/teach basic research methods and encourage questions about sources/i, '教授基本研究方法，并鼓励追问信息来源。'],
  [/Tutoring may become ineffective if volunteers do not prepare suitable materials/i, '如果志愿者没有准备合适材料，辅导可能变得低效。'],
  [/match tasks with learners’ needs and review progress regularly/i, '把任务与学习者需求匹配，并定期复盘进展。'],
  [/Fast scrolling may make readers miss details and weaken deep understanding/i, '快速滑动可能让读者错过细节并削弱深度理解。'],
  [/set reading goals, take notes, and compare key ideas after reading/i, '设定阅读目标、做笔记，并在阅读后比较关键观点。'],
  [/Rules may be ignored if students do not understand the reason behind them/i, '如果学生不了解规则背后的原因，规则可能被忽视。'],
  [/combine clear rules with real examples and regular safety practice/i, '把清晰规则、真实例子和定期安全练习结合。'],
];

function normalizePromptText(text: string): string {
  return text.replace(/[’]/g, "'").replace(/[“”]/g, '"').trim();
}

function translateTopicPhrase(text: string): string {
  const normalized = normalizePromptText(text);
  const exact = TOPIC_GLOSSARY[normalized.toLowerCase()];
  if (exact) return exact;

  const phraseBuilders: Array<[RegExp, (topic: string) => string]> = [
    [/^the long-term impact of (.+)$/i, (topic) => `${translateTopicPhrase(topic)}的长期影响`],
    [/^community access to (.+)$/i, (topic) => `社区获取${translateTopicPhrase(topic)}的机会`],
    [/^students and (.+)$/i, (topic) => `学生与${translateTopicPhrase(topic)}的联系`],
    [/^(.+) and feedback$/i, (topic) => `${translateTopicPhrase(topic)}与反馈`],
    [/^(.+) improvement$/i, (topic) => `${translateTopicPhrase(topic)}的改进`],
    [/^(.+) in a local case$/i, (topic) => `${translateTopicPhrase(topic)}在本地案例中的应用`],
    [/^(.+) in daily practice$/i, (topic) => `${translateTopicPhrase(topic)}在日常实践中的应用`],
    [/^(.+) in exam contexts$/i, (topic) => `${translateTopicPhrase(topic)}在考试情境中的应用`],
    [/^(.+) policy$/i, (topic) => `${translateTopicPhrase(topic)}政策`],
  ];

  for (const [pattern, build] of phraseBuilders) {
    const match = normalized.match(pattern);
    if (match) return build(match[1]);
  }

  return normalized;
}

function translateReadingQuestion(text: string): string | undefined {
  const normalized = normalizePromptText(text);
  if (SPECIFIC_READING_QUESTION_TRANSLATIONS[normalized]) return SPECIFIC_READING_QUESTION_TRANSLATIONS[normalized];

  const benefitMatch = normalized.match(/^What benefit of (.+) is mentioned in the first paragraph\?$/i);
  if (benefitMatch) {
    return `第一段提到了“${translateTopicPhrase(benefitMatch[1])}”的什么好处？`;
  }

  if (/^What concern does the passage raise\?$/i.test(normalized)) {
    return '文章提出了什么担忧？';
  }

  if (/^What solution does the author suggest\?$/i.test(normalized)) {
    return '作者建议的解决办法是什么？';
  }

  const wordMatch = normalized.match(/^What does the word "([^"]+)" in the passage mainly refer to\?$/i);
  if (wordMatch) {
    return `文中的“${wordMatch[1]}”一词主要指什么？`;
  }

  return undefined;
}

function translatePrompt(text: string): string | undefined {
  const normalized = normalizePromptText(text);
  if (COMMON_LISTENING_PROMPTS[normalized]) return COMMON_LISTENING_PROMPTS[normalized];

  const benefitReportedMatch = normalized.match(/^What benefit of (.+) is reported\?$/i);
  if (benefitReportedMatch) {
    return `材料提到了“${translateTopicPhrase(benefitReportedMatch[1])}”的什么好处？`;
  }

  const benefitMentionedMatch = normalized.match(/^What benefit of (.+) is mentioned\?$/i);
  if (benefitMentionedMatch) {
    return `文中提到了“${translateTopicPhrase(benefitMentionedMatch[1])}”的什么好处？`;
  }

  const concernReportedMatch = normalized.match(/^What concern is reported about (.+)\?$/i);
  if (concernReportedMatch) {
    return `材料提到了关于“${translateTopicPhrase(concernReportedMatch[1])}”的什么担忧？`;
  }

  const concernMatch = normalized.match(/^What concern does the student mention about (.+)\?$/i);
  if (concernMatch) {
    return `学生提到了关于“${translateTopicPhrase(concernMatch[1])}”的什么担忧？`;
  }

  const relationConcernMatch = normalized.match(/^What does the student worry about in relation to (.+)\?$/i);
  if (relationConcernMatch) {
    return `学生担心“${translateTopicPhrase(relationConcernMatch[1])}”相关的什么问题？`;
  }

  const recommendedTopicActionMatch = normalized.match(/^What action is recommended for (.+)\?$/i);
  if (recommendedTopicActionMatch) {
    return `针对“${translateTopicPhrase(recommendedTopicActionMatch[1])}”，建议采取什么行动？`;
  }

  if (/^What action is recommended\?$/i.test(normalized)) {
    return '建议采取什么行动？';
  }

  const discussionMatch = normalized.match(/^Why are the speakers discussing (.+)\?$/i);
  if (discussionMatch) {
    return `说话者为什么讨论“${translateTopicPhrase(discussionMatch[1])}”？`;
  }

  if (/^What is the passage mainly about\?$/i.test(normalized)) {
    return '这段材料主要讲什么？';
  }

  if (/^What risk does the speaker warn against\?$/i.test(normalized)) {
    return '说话者提醒要警惕什么风险？';
  }

  if (/^What risk does the speaker mention\?$/i.test(normalized)) {
    return '说话者提到了什么风险？';
  }

  const attitudeMatch = normalized.match(/^What is the speaker's attitude toward (.+)\?$/i);
  if (attitudeMatch) {
    return `说话者对“${translateTopicPhrase(attitudeMatch[1])}”持什么态度？`;
  }

  const speakerSupportMatch = normalized.match(/^What solution does the speaker support\?$/i);
  if (speakerSupportMatch) {
    return '说话者支持什么解决办法？';
  }

  if (/^Why does the speaker mention evidence and feedback\?$/i.test(normalized)) {
    return '说话者为什么提到证据和反馈？';
  }

  if (/^Why does the speaker mention evidence\?$/i.test(normalized)) {
    return '说话者为什么提到证据？';
  }

  if (/^What does the speaker say about fairness\?$/i.test(normalized)) {
    return '说话者如何看待公平性？';
  }

  if (/^When will the pilot activity be reviewed\?$/i.test(normalized)) {
    return '试点活动将在什么时候复盘？';
  }

  if (/^What result was reported after the trial\?$/i.test(normalized)) {
    return '试行后报告了什么结果？';
  }

  if (/^What contrast does the speaker make\?$/i.test(normalized)) {
    return '说话者作出了什么对比？';
  }

  if (/^Who is the activity mainly designed for\?$/i.test(normalized)) {
    return '这项活动主要是为谁设计的？';
  }

  if (/^Where will the first session take place\?$/i.test(normalized)) {
    return '第一场活动将在哪里举行？';
  }

  if (/^Which statement best summarizes the passage\?$/i.test(normalized)) {
    return '以下哪项最能概括这段材料？';
  }

  if (/^What is the speaker's main purpose\?$/i.test(normalized)) {
    return '说话者的主要目的是什么？';
  }

  if (/^What follow-up will be arranged\?$/i.test(normalized)) {
    return '后续将安排什么跟进措施？';
  }

  return undefined;
}

function translateOption(text: string): string | undefined {
  if (COMMON_LISTENING_TEXT[text]) return COMMON_LISTENING_TEXT[text];
  const matched = OPTION_PHRASE_TRANSLATIONS.find(([pattern]) => pattern.test(text));
  return matched?.[1];
}

function optionSupport(options: Record<Choice, string>): Partial<Record<Choice, string>> | undefined {
  const translated = (Object.keys(options) as Choice[]).reduce<Partial<Record<Choice, string>>>((result, key) => {
    const value = translateOption(options[key]);
    if (value) result[key] = value;
    return result;
  }, {});
  return Object.keys(translated).length > 0 ? translated : undefined;
}

export function getReadingChineseSupport(passageId: string, question: Question): QuestionChineseSupport | undefined {
  if (question.chineseSupport) return question.chineseSupport;
  const fallbackQuestion = `本题考向：${question.type}${question.tags?.length ? `；关键词：${question.tags.join('、')}` : ''}。正确答案和定位解析提交后公布。`;
  if (passageId !== 'cet-ai-edu') {
    return {
      question: translateReadingQuestion(question.question) ?? fallbackQuestion,
    };
  }
  const questionSupport = AI_EDU_QUESTION_SUPPORT[String(question.id)] ?? { question: fallbackQuestion };
  return {
    context: AI_EDU_CONTEXT,
    ...questionSupport,
  };
}

export function getListeningChineseSupport(question: {
  prompt: string;
  options: Record<Choice, string>;
}): QuestionChineseSupport | undefined {
  const support: QuestionChineseSupport = {
    question: translatePrompt(question.prompt) ?? '根据听力材料选择最佳答案；正确答案和错因解析提交后公布。',
    options: optionSupport(question.options),
  };

  return support;
}
