type VocabularySentenceInput = {
  word: string;
  meaning: string;
  collocation: string;
  example: string;
  explanation: string;
};

type VocabularyChoice = 'A' | 'B' | 'C' | 'D';

type VocabularyQuestionInput = VocabularySentenceInput & {
  options: Record<VocabularyChoice, string>;
  correctAnswer: VocabularyChoice;
};

type QuestionSentenceInput = {
  sentence?: string;
  explanation?: string;
};

export type PracticeSentenceSupport = {
  sourceText: string;
  chineseMeaning: string;
};

export type VocabularyQuestionSupport = {
  prompt: PracticeSentenceSupport;
  optionTranslations: Array<{
    key: VocabularyChoice;
    sourceText: string;
    chineseMeaning: string;
    isCorrect: boolean;
  }>;
};

const KNOWN_SENTENCE_TRANSLATIONS: Record<string, string> = {
  'Students need to adapt to online learning when classes move to digital platforms.':
    '当课程转到数字平台时，学生需要适应在线学习。',
  'Regular review can enhance learning efficiency and reduce repeated mistakes.':
    '定期复习可以提高学习效率，并减少重复犯错。',
  'Unequal access to technology may exacerbate existing inequalities.':
    '技术获取机会不平等可能会加剧已有的不平等。',
  'A realistic study plan is useful only when students implement it consistently.':
    '只有学生持续执行，现实可行的学习计划才真正有用。',
  'The use of digital tools in education seems to be an inevitable trend.':
    '在教育中使用数字工具似乎已经成为不可避免的趋势。',
  'Data privacy is a major concern when students use AI learning tools.':
    '学生使用 AI 学习工具时，数据隐私是一个主要担忧。',
  'Cities should encourage sustainable development while protecting local communities.':
    '城市应该在保护本地社区的同时，鼓励可持续发展。',
  'Online platforms can facilitate communication between teachers and students.':
    '在线平台可以促进教师和学生之间的沟通。',
  'Solar power is often seen as an alternative energy source.':
    '太阳能常被视为一种替代能源。',
  'Human mentorship remains important even when AI tools become more common.':
    '即使 AI 工具越来越普遍，人类导师的指导仍然很重要。',
  'Consistent practice is more effective than studying for many hours only once.':
    '持续练习比一次性学习很多小时更有效。',
  'Active recall helps learners retrieve information from memory instead of only rereading it.':
    '主动回忆能帮助学习者从记忆中提取信息，而不是只反复阅读。',
  'Students acquire language skills more effectively when they use words in context.':
    '当学生在语境中使用词汇时，他们能更有效地习得语言技能。',
  'A good learner analyzes the reason for a mistake before reviewing it.':
    '优秀的学习者会在复习前先分析错误原因。',
  'A balanced approach combines practice, feedback, and review.':
    '一种平衡的方法会把练习、反馈和复习结合起来。',
  'Specific feedback is a crucial factor in efficient learning.':
    '具体反馈是高效学习中的关键因素。',
  'The weekly report demonstrates whether a learner is improving.':
    '周报能显示学习者是否正在进步。',
  'Efficient review focuses on mistakes with high exam value.':
    '高效复习会聚焦考试价值高的错误。',
  'Every practice session should create ability evidence for the next plan.':
    '每一次练习都应为下一步计划形成能力证据。',
  'Students with part-time jobs need a flexible schedule for review.':
    '有兼职工作的学生需要灵活的复习安排。',
  'The system can generate a daily plan based on mistakes and review dates.':
    '系统可以根据错误和复习日期生成每日计划。',
  'Short daily tasks help learners maintain learning momentum.':
    '简短的每日任务能帮助学习者保持学习势头。',
  'A mistake can become a learning opportunity if it is reviewed well.':
    '如果复习得当，一个错误也可以变成学习机会。',
  'Feedback helps students look at their answers from a different perspective.':
    '反馈能帮助学生从不同角度审视自己的答案。',
  'AI tools have potential benefits, but they also need careful use.':
    'AI 工具有潜在好处，但也需要谨慎使用。',
  'Schools should regulate data use when students learn with digital tools.':
    '学生使用数字工具学习时，学校应规范数据使用。',
  'Open learning resources can support students who study independently.':
    '开放学习资源可以支持自主学习的学生。',
  'Spaced review can lead to a significant improvement in long-term memory.':
    '间隔复习可以显著提升长期记忆。',
  'Learners should transfer vocabulary from reading to writing and speaking.':
    '学习者应把阅读中积累的词汇迁移到写作和口语中。',
  'Public transport plays an important role in urban development.':
    '公共交通在城市发展中发挥重要作用。',
  'A progress chart can make learning progress visible.':
    '进度图可以让学习进展变得可见。',
  'Too many notifications may lead to a decline in attention.':
    '太多通知可能会导致注意力下降。',
  'A report should provide accurate information rather than vague guesses.':
    '报告应提供准确的信息，而不是模糊的猜测。',
  'Digital libraries make learning resources more accessible to students in small towns.':
    '数字图书馆让小城镇的学生更容易获取学习资源。',
  'Learners should choose an appropriate method for their weak skills.':
    '学习者应为自己的薄弱技能选择恰当的方法。',
  'The new transport policy may benefit students who live far from campus.':
    '新的交通政策可能会使住得离校园较远的学生受益。',
  'Time management is a common challenge for part-time learners.':
    '时间管理是兼职学习者常见的挑战。',
  'Students should compare the options with the original sentence before choosing.':
    '学生在选择前应把选项与原句进行比较。',
  'Parents often raise concerns about privacy in online learning.':
    '家长常常对在线学习中的隐私问题表示担忧。',
  'Ignoring small mistakes may have serious consequences in a timed exam.':
    '在限时考试中忽视小错误可能会产生严重后果。',
  'Specific feedback can contribute to steady improvement.':
    '具体反馈可以促成稳定的进步。',
  'Museums help students understand local cultural heritage.':
    '博物馆帮助学生了解当地文化遗产。',
  'Better public transport can support economic development in a region.':
    '更好的公共交通可以支持一个地区的经济发展。',
  'Students can protect the environment by reducing daily waste.':
    '学生可以通过减少日常浪费来保护环境。',
  'Locating key sentences is an essential skill in careful reading.':
    '定位关键句是仔细阅读中的一项必要技能。',
  'Sleep is a key factor in memory and learning efficiency.':
    '睡眠是记忆和学习效率中的一个关键因素。',
  'The system can identify weak points from real practice evidence.':
    '系统可以根据真实练习证据识别薄弱点。',
  'Community service can have a positive impact on students.':
    '社区服务可以对学生产生积极影响。',
  'Adaptive learning should respond to individual needs.':
    '自适应学习应回应个人需求。',
  'Teachers can influence students through clear feedback.':
    '教师可以通过清晰反馈影响学生。',
  'Face-to-face interaction remains valuable in education.':
    '面对面互动在教育中仍然很有价值。',
  'Waste sorting has become an important social issue.':
    '垃圾分类已经成为一个重要的社会议题。',
  'Active recall is an effective learning method.':
    '主动回忆是一种有效的学习方法。',
  'Students are encouraged to participate in volunteer programs.':
    '学校鼓励学生参加志愿者项目。',
  'A clear education policy can improve access to learning resources.':
    '清晰的教育政策可以改善学习资源的获取。',
  'Schools can promote healthy habits through regular activities.':
    '学校可以通过定期活动促进健康习惯。',
  'Reliable evidence is needed before changing a study plan.':
    '改变学习计划前需要可靠证据。',
  'Writing improvement requires regular practice and feedback.':
    '写作提高需要定期练习和反馈。',
  'A good reading strategy saves time under pressure.':
    '良好的阅读策略能在压力下节省时间。',
  'The club conducted a survey about students’ reading habits.':
    '俱乐部开展了一项关于学生阅读习惯的调查。',
  'A clear plan helps learners achieve their target score.':
    '清晰的计划有助于学习者达到目标分数。',
  'Sleep can affect students’ performance in a long exam.':
    '睡眠会影响学生在长时间考试中的表现。',
  'The team arranged a meeting to discuss the survey results.':
    '团队安排了一次会议来讨论调查结果。',
  'The report examines different aspects of online learning.':
    '这份报告考察了在线学习的不同方面。',
  'Regular practice can increase a learner’s capacity to use new words.':
    '定期练习可以提高学习者使用新词的能力。',
  'Students need to communicate clearly during group projects.':
    '学生在小组项目中需要清楚地沟通。',
  'Learners should complete short tasks before reviewing mistakes.':
    '学习者应先完成短任务，再复习错误。',
  'A complex sentence may contain several clauses.':
    '一个复杂句可能包含几个从句。',
  'The university conducted research on students’ reading habits.':
    '这所大学开展了关于学生阅读习惯的研究。',
  'Turning off lights can help conserve energy on campus.':
    '关灯可以帮助校园节约能源。',
  'Large screens may consume more energy than expected.':
    '大屏幕可能比预期消耗更多能源。',
  'The growing demand for online services has changed public offices.':
    '对在线服务不断增长的需求已经改变了公共办事机构。',
  'Students should protect privacy when using a shared device.':
    '学生使用共用设备时应保护隐私。',
  'The teacher distributed reading materials before class.':
    '老师在课前分发了阅读材料。',
  'Clear feedback can encourage students to continue practicing.':
    '清晰反馈可以鼓励学生继续练习。',
  'Students need time to establish a regular review habit.':
    '学生需要时间建立定期复习的习惯。',
  'A mock exam can evaluate progress before the real test.':
    '模拟考试可以在正式考试前评估进步。',
  'Reading widely can help students expand vocabulary in context.':
    '广泛阅读可以帮助学生在语境中扩展词汇量。',
  'Some students face financial pressure when choosing learning resources.':
    '一些学生在选择学习资源时面临经济压力。',
  'The basic function of feedback is to show the next action.':
    '反馈的基本功能是指出下一步行动。',
  'Climate change is a global issue that requires cooperation.':
    '气候变化是一个需要合作的全球性问题。',
  'A strong study habit is built through small daily actions.':
    '强大的学习习惯是通过每日小行动建立起来的。',
  'A historical site can help visitors understand local culture.':
    '历史遗址可以帮助游客了解当地文化。',
  'Reviewing mistakes can improve accuracy in reading.':
    '复习错误可以提高阅读准确性。',
  'The passage provides the background knowledge needed for understanding.':
    '这篇文章提供了理解所需的背景知识。',
  'Local communities can protect traditions in practical ways.':
    '当地社区可以用实际方式保护传统。',
  'Schools can take measures to reduce food waste.':
    '学校可以采取措施减少食物浪费。',
  'Exercise and sleep are important for students’ mental health.':
    '运动和睡眠对学生的心理健康很重要。',
  'Good readers organize information from different paragraphs.':
    '优秀读者会整理不同段落中的信息。',
  'The platform records learning outcomes after each session.':
    '平台会在每次学习后记录学习结果。',
  'Students perform better when they practice under time pressure.':
    '学生在限时压力下练习时表现会更好。',
  'The teacher gave practical advice on how to review mistakes.':
    '老师给出了如何复习错误的实用建议。',
  'Previous mistakes can guide the next training plan.':
    '以前的错误可以指导下一步训练计划。',
  'Feedback should be part of the learning process.':
    '反馈应成为学习过程的一部分。',
  'Users should protect privacy when using digital services.':
    '用户使用数字服务时应保护隐私。',
  'The main purpose of the report is to explain the policy.':
    '这份报告的主要目的是解释该政策。',
  'A wide range of activities can support language learning.':
    '范围广泛的活动可以支持语言学习。',
  'Using smaller portions can reduce food waste.':
    '使用较小份量可以减少食物浪费。',
  'Students should reflect on mistakes after practice.':
    '学生练习后应反思错误。',
  'Learners should respond to feedback by revising their answers.':
    '学习者应通过修改答案来回应反馈。',
  'Volunteer work can develop students’ sense of social responsibility.':
    '志愿服务可以培养学生的社会责任感。',
  'In careful reading, students must select the best answer based on evidence.':
    '在仔细阅读中，学生必须根据证据选择最佳答案。',
  'Students should submit an application before the deadline.':
    '学生应在截止日期前提交申请。',
  'The club wrote a notice to inform students about the lecture.':
    '俱乐部写了一则通知，告知学生有关讲座的信息。',
  'Please make an appointment before visiting the office.':
    '请在访问办公室前预约。',
  'The secretary confirmed the time and place of the meeting.':
    '秘书确认了会议的时间和地点。',
  'The meeting was postponed because of heavy rain.':
    '会议因大雨而推迟。',
  'All students are welcome to attend the public lecture.':
    '欢迎所有学生参加这场公开讲座。',
  'The teacher informed students of the new exam schedule.':
    '老师通知学生新的考试安排。',
  'The student made a polite request for more reading materials.':
    '这名学生礼貌地请求更多阅读材料。',
  'Candidates must submit the form before Friday.':
    '考生必须在周五前提交表格。',
  'The teacher recommended a practical reading method.':
    '老师推荐了一种实用的阅读方法。',
  'The second writing task asks students to write a summary and a comment.':
    '第二项写作任务要求学生写一篇摘要和一段评论。',
  'After the summary, students should make a brief comment.':
    '摘要之后，学生应作出简短评论。',
  'A good paragraph expresses one clear viewpoint.':
    '好的段落表达一个清晰的观点。',
  'Readers should notice the author attitude in the final paragraph.':
    '读者应注意最后一段中的作者态度。',
  'The author suggests that public services should be easier to use.':
    '作者建议公共服务应更容易使用。',
  'Candidates read a short article before writing a summary.':
    '考生在写摘要前先阅读一篇短文。',
  'In the matching task, students match headings with paragraphs.':
    '在匹配题中，学生把标题与段落配对。',
  'Each reading passage is followed by several questions.':
    '每篇阅读文章后都有几个问题。',
  'Unknown words can often be understood from context.':
    '生词通常可以通过语境来理解。',
  'Readers can infer the meaning from examples in the passage.':
    '读者可以从文章中的例子推断含义。',
  'The sentence implies that regular practice is more useful than sudden effort.':
    '这句话暗示定期练习比临时突击更有用。',
  'Traditional reading questions often ask about specific details.':
    '传统阅读题常常询问具体细节。',
  'Vocabulary and Structure questions test grammar rules and word usage.':
    '词汇与结构题考查语法规则和词语用法。',
  'Good writing needs clear sentence structure.':
    '好的写作需要清晰的句子结构。',
  'A relative clause can add information about a noun.':
    '关系从句可以补充说明一个名词。',
  'The verb tense should agree with the time expression.':
    '动词时态应与时间表达一致。',
  'The passive voice is often used when the doer is unknown.':
    '当动作执行者未知时，常使用被动语态。',
  'Under this condition, online courses can help more learners.':
    '在这种条件下，在线课程可以帮助更多学习者。',
  'The activity will continue unless it rains heavily.':
    '除非下大雨，活动将继续。',
  'Although the task is difficult, regular practice can make it manageable.':
    '虽然任务很难，定期练习可以让它变得可处理。',
  'Despite limited time, adult learners can improve through focused practice.':
    '尽管时间有限，成人学习者仍可以通过专注练习取得进步。',
  'Besides practice, feedback is also necessary.':
    '除了练习之外，反馈也是必要的。',
  'Furthermore, online services can save time for working adults.':
    '此外，在线服务可以为在职成年人节省时间。',
  'Students should draw a conclusion based on evidence.':
    '学生应根据证据得出结论。',
  'Candidates must read the task requirement carefully before writing.':
    '考生写作前必须仔细阅读任务要求。',
  'The reference textbook is useful for building grammar and reading skills.':
    '参考教材有助于培养语法和阅读技能。',
  'The outline lists a standard textbook as reference material.':
    '大纲把一本标准教材列为参考材料。',
  'The degree English exam is an offline closed-book exam.':
    '学位英语考试是线下闭卷考试。',
  'A closed-book test requires active recall instead of copying notes.':
    '闭卷考试需要主动回忆，而不是抄笔记。',
  'Candidates need to concentrate on reading under time pressure.':
    '考生需要在时间压力下专注阅读。',
  'Many adult learners study English while working.':
    '许多成人学习者一边工作一边学习英语。',
  'Passing the exam may be related to a degree certificate requirement.':
    '通过考试可能与学位证书要求有关。',
  'The exam instructions are written in English.':
    '考试说明是用英语写的。',
  'A coherent paragraph connects summary and comment smoothly.':
    '连贯的段落会顺畅地连接摘要和评论。',
  'The outline says punctuation is not counted in the writing word limit.':
    '大纲说明标点符号不计入写作字数限制。',
  'In the 7-option task, students remove two distractors.':
    '在七选五任务中，学生需要排除两个干扰项。',
};

const KNOWN_OPTION_TRANSLATIONS: Record<string, string> = {
  'a clear improvement': '明显的改善',
  'a complete solution that needs no review': '一个不需要复习的完整解决方案',
  'a copy of an unrelated answer': '抄写一个无关答案',
  'a difficult grammar rule': '一条困难的语法规则',
  'a direct copy of a text': '直接照抄文本',
  'a final answer': '最终答案',
  'a final exam score': '期末考试分数',
  'a final paragraph': '最后一段',
  'a final result': '最终结果',
  'a fast answer with no evidence': '没有依据的快速作答',
  'a festival held in winter': '冬季举行的节日',
  'a festival with no cultural meaning': '没有文化含义的节日',
  'a fixed exam room': '固定的考场',
  'a fixed exam score': '固定的考试分数',
  'a form with no information': '没有信息的表格',
  'a full list of names': '完整的姓名列表',
  'a grammar mistake': '语法错误',
  'a grammar rule': '语法规则',
  'a grammar symbol': '语法符号',
  'a habit unrelated to learning': '与学习无关的习惯',
  'a hidden cost': '隐藏成本',
  'a hidden cost in a contract': '合同里的隐藏成本',
  'a hidden problem': '隐藏问题',
  'a hidden translation error': '隐藏的翻译错误',
  'a kind of dictionary': '一种词典',
  'a kind of exam room': '一种考场',
  'a kind of festival': '一种节日',
  'a kind of food': '一种食物',
  'a kind of form': '一种表格',
  'a kind of holiday': '一种假期',
  'a kind of payment': '一种付款方式',
  'a kind of school': '一种学校',
  'a kind of sports club': '一种体育俱乐部',
  'a kind of transport': '一种交通工具',
  'a kind of weather': '一种天气',
  'a learning schedule': '学习日程',
  'a list of unrelated names': '一串无关姓名',
  'a long journey': '长途旅行',
  'a long report': '长篇报告',
  'a meeting room': '会议室',
  'a method of payment': '付款方式',
  'a mistake that cannot be corrected': '无法纠正的错误',
  'a natural disaster': '自然灾害',
  'a number in a table': '表格里的数字',
  'a number without a unit': '没有单位的数字',
  'a number without explanation': '没有解释的数字',
  'a person in a class': '班级里的一个人',
  'a person in charge': '负责人',
  'a person who gives advice': '给建议的人',
  'a person who learns': '学习者',
  'a person who refuses feedback': '拒绝反馈的人',
  'a person who refuses help': '拒绝帮助的人',
  'a person who takes notes': '记笔记的人',
  'a person who writes': '写作者',
  'a personal feeling': '个人感受',
  'a personal feeling that cannot be checked': '无法核验的个人感受',
  'a personal habit': '个人习惯',
  'a personal object': '个人物品',
  'a personal schedule': '个人日程',
  'a piece of advice': '一条建议',
  'a piece of equipment': '一件设备',
  'a piece of furniture in a classroom': '教室里的一件家具',
  'a place for a public event': '公共活动场所',
  'a place for exercise': '锻炼场所',
  'a place to study': '学习场所',
  'a place where no one studies': '没有人学习的地方',
  'a plan with no details': '没有细节的计划',
  'a private feeling': '个人感受',
  'a private habit': '私人习惯',
  'a private joke': '私人玩笑',
  'a private letter': '私人信件',
  'a private memory': '私人记忆',
  'a private opinion with no text clue': '没有文本线索的个人观点',
  'a public event': '公共活动',
  'a public event without learning goals': '没有学习目标的公共活动',
  'a public holiday': '公共假日',
  'a public rule': '公共规则',
  'a quick payment': '快速付款',
  'a random answer without evidence': '没有依据的随机答案',
  'a random list of names': '随机姓名列表',
  'a reason for failure': '失败原因',
  'a repeated grammar rule': '重复的语法规则',
  'a repeated listening mistake': '重复的听力错误',
  'a repeated mistake': '重复错误',
  'a repeated sound': '重复的声音',
  'a repeated sound in a recording': '录音里的重复声音',
  'a result that cannot be changed': '无法改变的结果',
  'a road sign near a school': '学校附近的路牌',
  'a rule about room numbers': '关于房间号的规则',
  'a rule that cannot change': '不能改变的规则',
  'a rule that prevents all questions': '阻止所有提问的规则',
  'a school building': '学校建筑',
  'a school subject': '学校科目',
  'a score that is guessed randomly': '随机猜出的分数',
  'a sentence ending': '句子结尾',
  'a sentence pattern': '句型',
  'a sentence with no verb': '没有动词的句子',
  'a shared schedule': '共享日程',
  'a short answer': '简短答案',
  'a short appointment': '短暂预约',
  'a short break after class': '课后短暂休息',
  'a short conversation': '简短对话',
  'a short journey': '短途旅行',
  'a short meeting': '短会',
  'a short notice': '简短通知',
  'a short piece of music': '一小段音乐',
  'a short piece of news only': '只是一小段新闻',
  'a short rest': '短暂休息',
  'a short trip': '短途旅行',
  'a silent reading room only': '仅用于安静阅读的房间',
  'a simple drawing': '简单图画',
  'a single exact date': '单个准确日期',
  'a single sound': '单个声音',
  'a small mistake': '小错误',
  'a small prize': '小奖品',
  'a social issue': '社会议题',
  'a sound made by a machine': '机器发出的声音',
  'a sound that cannot be heard clearly': '听不清楚的声音',
  'a sudden accident': '突发事故',
  'a sudden change': '突然变化',
  'a sudden change in weather': '天气突变',
  'a sudden feeling': '突然的感觉',
  'a sudden mistake': '突然犯错',
  'a sudden result': '突然出现的结果',
  'a sudden sound': '突然的声音',
  'a sudden technical failure': '突发技术故障',
  'a temporary feeling after class': '课后的临时感受',
  'a tool for measuring weather': '测量天气的工具',
  'a tool for recording sound': '录音工具',
  'a tool for repairing a device': '修理设备的工具',
  'a trip that has no destination': '没有目的地的旅行',
  'a type of article': '一种文章',
  'a type of entertainment': '一种娱乐',
  'a type of exam room': '一种考场',
  'a type of food': '一种食物',
  'a type of grammar tense': '一种语法时态',
  'a type of holiday': '一种假期',
  'a type of public exam': '一种公共考试',
  'a type of public transport': '一种公共交通',
  'a useful example': '有用的例子',
  'a way of transport': '一种交通方式',
  'a way of thinking about something': '看待事物的方式',
  'a written announcement or to become aware of something': '书面通知，或注意到某事',
  'a written notice': '书面通知',
  'a written permission form only': '只是一份书面许可表',
  'a written promise': '书面承诺',
  'able to be seen or noticed': '能够被看见或注意到',
  'able to change according to needs': '能够根据需要改变',
  'able to be trusted': '值得信任',
  'already impossible to improve': '已经无法改进',
  'as a result of something': '由于某事',
  'at the same time as': '与……同时',
  'available for a short time only': '只在短时间内可用',
  'based on old stories': '基于旧故事',
  'because of a clear reason': '因为明确原因',
  'because of': '因为',
  'before a certain time': '在某个时间之前',
  'before an event': '在事件之前',
  'changing every minute': '每分钟都在变化',
  'clearly against the rules': '明显违反规则',
  'correct and exact': '正确且精确',
  'dangerous to share': '分享起来有危险',
  'difficult to pronounce': '难以发音',
  'done in the same way over time': '长期以同样方式进行',
  'easy to forget': '容易忘记',
  'easy to remember': '容易记住',
  'easy to repair': '容易修理',
  'full of emotion': '充满情绪',
  'full of repeated errors': '充满重复错误',
  'hard to understand': '难以理解',
  'heard but not written': '听得到但没有写下',
  'incorrect in every situation': '在任何情况下都不正确',
  'impossible to control': '无法控制',
  'impossible to describe': '无法描述',
  'impossible to finish': '无法完成',
  'impossible to hear': '听不见',
  'impossible to improve': '无法改进',
  'impossible to measure': '无法测量',
  'impossible to understand': '无法理解',
  'in order to': '为了',
  'interesting but useless': '有趣但无用',
  'kept completely secret': '完全保密',
  'limited to one exact answer': '只限于一个精确答案',
  'limited to one person': '只限于一个人',
  'limited to one sentence': '只限于一句话',
  'made for children only': '只为儿童制作',
  'made for experts only': '只面向专家',
  'made of expensive materials': '由昂贵材料制成',
  'made of several pages': '由几页组成',
  'made only for children': '只为儿童制作',
  'made without planning': '没有计划地制作',
  'next to a place': '在某个地方旁边',
  'not based on evidence': '没有证据支持',
  'not connected with a topic': '与话题无关',
  'not connected with the result': '与结果无关',
  'not easy to see': '不容易看见',
  'not possible to check': '无法核查',
  'not related to the topic': '与话题无关',
  'not related to writing': '与写作无关',
  'not useful at all': '完全没有用',
  'popular only for one day': '只流行一天',
  'produced by accident': '偶然产生',
  'purely imaginary': '纯属想象',
  'related only to money': '只与金钱有关',
  'related to ancient stories only': '只与古代故事有关',
  'related to buses': '与公交车有关',
  'related to cities': '与城市有关',
  'related to culture or traditions': '与文化或传统有关',
  'related to money': '与金钱有关',
  'related to numbers only': '只与数字有关',
  'related to pronunciation': '与发音有关',
  'related to sound only': '只与声音有关',
  'related to the economy or money systems': '与经济或货币体系有关',
  'related to the mind': '与心理或精神有关',
  'related to the whole world': '与全世界有关',
  'requiring no clear goal': '不需要明确目标',
  'requiring no effort': '不需要努力',
  'safe and reliable': '安全可靠',
  'shared by every country': '由所有国家共享',
  'shown only in pictures': '只在图片中展示',
  'single or separate; one person': '单个的、独立的；个人',
  'something useful for achieving a goal': '有助于实现目标的东西',
  'too expensive to buy': '太贵而买不起',
  'too expensive to use': '使用成本太高',
  'too old to be useful': '太旧而没有用',
  'too quiet to hear': '太安静以至听不见',
  'too short to read': '太短而不值得读',
  'too small to mention': '太小而不值得提',
  'too weak to be useful': '太弱而没有用',
  'unclear and indirect': '不清楚且间接',
  'very easy to break': '很容易损坏',
  'very easy to solve': '很容易解决',
  'without a clear reason': '没有明确原因',
  'without a plan': '没有计划',
  'without a reason': '没有理由',
  'without any detail': '没有任何细节',
  'without any plan': '没有任何计划',
  'without any public service': '没有任何公共服务',
  'without any value': '没有任何价值',
  'wrong in every detail': '每个细节都错',
  'wrong in every way': '各方面都错',
  'a borrowed book': '借来的书',
  'a building near campus': '校园附近的建筑',
  'a building near the library': '图书馆附近的建筑',
  'a building used for sports': '用于体育活动的建筑',
  'a class schedule': '课程表',
  'a detailed address': '详细地址',
  'a device for recording sound': '录音设备',
  'a device that only stores photos': '只存储照片的设备',
  'a difficult paragraph': '困难的段落',
  'a direct copy': '直接复制',
  'a final decision': '最终决定',
  'a final score': '最终分数',
  'a fixed rule': '固定规则',
  'a form of payment': '付款形式',
  'a hidden mistake': '隐藏错误',
  'a listening question': '听力题',
  'a paragraph title': '段落标题',
  'a payment tool': '付款工具',
  'a person in a team': '团队中的一个人',
  'a person who teaches grammar': '教授语法的人',
  'a personal story': '个人故事',
  'a place for public service': '公共服务场所',
  'a planned journey': '计划好的旅程',
  'a private feeling that cannot be checked': '无法核验的私人感受',
  'a public celebration': '公共庆祝活动',
  'a public notice': '公共通知',
  'a public service': '公共服务',
  'a public worker': '公共服务人员',
  'a reading habit': '阅读习惯',
  'a reading option': '阅读选项',
  'a reading title': '阅读标题',
  'a repeated habit': '重复的习惯',
  'a repeated word': '重复的单词',
  'a result of a survey': '调查结果',
  'a short news report': '简短新闻报道',
  'a short summary': '简短摘要',
  'a short written notice': '简短书面通知',
  'a small spelling mistake': '小拼写错误',
  'a sudden weather change': '天气突变',
  'a type of exercise': '一种练习',
  'a type of story': '一种故事',
  'a way of doing something': '做某事的方法或方式',
  'a writing task': '写作任务',
  'a wrong answer': '错误答案',
  'a wrong belief': '错误看法',
  'a wrong choice': '错误选择',
  'a wrong example': '错误例子',
  'a wrong method': '错误方法',
  'a wrong option': '错误选项',
  'a wrong option copied from the text': '从原文照搬的错误选项',
  'a wrong pronunciation': '错误发音',
  'a wrong score': '错误分数',
  'a wrong spelling': '错误拼写',
  'an empty room used for storage': '用于储物的空房间',
  'an exact number': '准确数字',
  'an official certificate': '官方证书',
  'an official score': '官方分数',
  'an old tradition': '古老传统',
  'an opinion with no action': '没有行动支撑的观点',
  'based only on listening': '只基于听力',
  'difficult to hear': '难以听见',
  'easy to replace': '容易替换',
  'fixed and impossible to change': '固定且无法改变',
  'happening next year': '明年发生的',
  'later than expected': '比预期更晚',
  'limited to one classroom': '仅限一个教室',
  'made for private use': '供私人使用的',
  'not based on facts': '不基于事实',
  'not useful in public': '在公共场合没有用',
  'not worth noticing': '不值得注意',
  'open to every visitor': '向所有访客开放',
  'public transportation': '公共交通',
  'related to ancient culture only': '只与古代文化有关',
  'related to the whole world only': '只与全世界有关',
  'to answer aloud': '大声回答',
  'to answer carelessly': '粗心回答',
  'to answer immediately': '立即回答',
  'to answer in silence': '默默回答',
  'to answer without evidence': '没有证据地回答',
  'to arrange chairs': '安排椅子',
  'to arrive early': '早到',
  'to arrive late': '迟到',
  'to avoid a public problem': '避开公共问题',
  'to avoid a topic': '避开话题',
  'to avoid all feedback': '避开所有反馈',
  'to avoid all mistakes': '避免所有错误',
  'to avoid reading': '避免阅读',
  'to avoid responsibility': '逃避责任',
  'to become invisible': '变得不可见',
  'to break a useful habit': '破坏有用的习惯',
  'to cancel a plan': '取消计划',
  'to cancel a plan suddenly': '突然取消计划',
  'to cancel an activity': '取消活动',
  'to carry a heavy object': '搬运重物',
  'to change a score': '改变分数',
  'to change a title': '改变标题',
  'to choose randomly': '随机选择',
  'to choose without reason': '无理由选择',
  'to collect waste': '收集废弃物',
  'to compare two similar ideas': '比较两个相似观点',
  'to copy a full sentence': '抄写完整句子',
  'to copy a paragraph': '抄写段落',
  'to copy a sentence': '抄写句子',
  'to copy a sentence directly': '直接抄写句子',
  'to count money': '数钱',
  'to create a useful habit': '养成有用的习惯',
  'to create confusion on purpose': '故意制造混乱',
  'to damage a plan': '破坏计划',
  'to delay a decision': '推迟决定',
  'to describe a picture': '描述图片',
  'to describe a picture wrongly': '错误描述图片',
  'to describe a sound': '描述声音',
  'to describe something in detail': '详细描述某事',
  'to explain a tradition': '解释传统',
  'to finish a form': '填完表格',
  'to finish an exam early': '提前完成考试',
  'to finish early': '提前完成',
  'to forget a deadline': '忘记截止日期',
  'to forget a detail': '忘记细节',
  'to forget a rule': '忘记规则',
  'to give a wrong answer': '给出错误答案',
  'to give up completely': '彻底放弃',
  'to guess randomly': '随机猜测',
  'to guess the answer': '猜答案',
  'to guess without evidence': '没有证据地猜测',
  'to hide a problem': '隐藏问题',
  'to hide a result': '隐藏结果',
  'to hide evidence': '隐藏证据',
  'to hide information': '隐藏信息',
  'to hide useful information': '隐藏有用信息',
  'to ignore a useful clue': '忽视有用线索',
  'to ignore details': '忽视细节',
  'to keep silent': '保持沉默',
  'to leave early': '提前离开',
  'to lose a chance': '失去机会',
  'to lose control': '失去控制',
  'to lose information': '丢失信息',
  'to lose interest': '失去兴趣',
  'to lose something by accident': '意外丢失某物',
  'to make a building taller': '把建筑加高',
  'to make a list shorter': '缩短清单',
  'to make a mistake': '犯错误',
  'to make a note shorter': '缩短笔记',
  'to make a notice longer': '加长通知',
  'to make a phone louder': '调高手机音量',
  'to make a plan later': '推迟制定计划',
  'to make a plan less useful': '让计划变得不那么有用',
  'to make a plan longer': '加长计划',
  'to make a problem worse': '使问题更严重',
  'to make a rule weaker': '削弱规则',
  'to make a sentence longer': '把句子加长',
  'to make a sentence shorter': '把句子缩短',
  'to make a sound louder': '把声音调大',
  'to make a sound lower': '把声音调低',
  'to make a sound unclear': '让声音变得不清楚',
  'to make all choices the same': '让所有选择变得相同',
  'to make less clear': '使其更不清楚',
  'to make someone silent': '让某人沉默',
  'to make something clearer': '让某事更清楚',
  'to make something dirty': '弄脏某物',
  'to make something disappear': '让某物消失',
  'to make something illegal': '使某事违法',
  'to make something less clear': '使某事更不清楚',
  'to make unclear': '使其不清楚',
  'to measure something exactly': '准确测量某物',
  'to open a door': '打开门',
  'to play a recording': '播放录音',
  'to produce a new rule': '制定新规则',
  'to produce quickly': '快速生产',
  'to provide a reason': '提供理由',
  'to punish someone': '惩罚某人',
  'to read silently only': '只默读',
  'to read without thinking': '不思考地阅读',
  'to record a voice': '录制声音',
  'to reduce a number': '减少数量',
  'to reduce all choices': '减少所有选择',
  'to refuse a new situation': '拒绝新的情况',
  'to refuse a question': '拒绝问题',
  'to refuse a request': '拒绝请求',
  'to refuse a service': '拒绝服务',
  'to refuse advice': '拒绝建议',
  'to refuse help': '拒绝帮助',
  'to refuse to answer a question': '拒绝回答问题',
  'to remember nothing': '什么也不记得',
  'to remove a paragraph': '删除段落',
  'to remove a question': '删除问题',
  'to remove a source': '移除来源',
  'to remove a useful detail': '删除有用细节',
  'to remove evidence from a report': '从报告中删除证据',
  'to remove something completely': '彻底移除某物',
  'to repair a device': '修理设备',
  'to repeat a mistake': '重复犯错',
  'to repeat a sound': '重复声音',
  'to repeat without thinking': '不思考地重复',
  'to solve a problem quickly': '快速解决问题',
  'to speak more loudly': '说得更大声',
  'to speak quietly': '轻声说话',
  'to speak too fast': '说得太快',
  'to speak without pauses': '不停顿地说话',
  'to speak without preparation': '未经准备就发言',
  'to spend more money': '花更多钱',
  'to spend without control': '无节制地花费',
  'to stop a meeting': '停止会议',
  'to stop a process suddenly': '突然停止一个过程',
  'to stop a service': '停止服务',
  'to stop learning': '停止学习',
  'to stop using a method': '停止使用一种方法',
  'to translate a passage': '翻译文章',
  'to translate a text': '翻译文本',
  'to travel quickly': '快速旅行',
  'to wait for results': '等待结果',
  'to wait without action': '不采取行动地等待',
  'too difficult to read': '太难读',
  'used to ask a question': '用于提问',
  'used to deny a fact': '用于否认事实',
  'used to list examples': '用于列举例子',
  'used to mark time': '用于标记时间',
  'used to show purpose': '用于表示目的',
  'used to show time': '用于表示时间',
  'written after class': '课后写的',
};

const CORE_DEFINITION_OPTION_TRANSLATIONS: Record<string, string> = {
  'to adjust to a new condition': '适应新的条件',
  'to make something better or stronger': '使某事物变得更好或更强',
  'to put a plan into action': '把计划付诸行动',
  'impossible to avoid': '无法避免',
  'personal information protection': '个人信息保护',
  'lasting without damaging future resources': '不损害未来资源而能够持续',
  'to make a process easier': '使过程更容易',
  'a possible different choice': '一种可能的不同选择',
  'guidance from an experienced person': '来自有经验者的指导',
  'to bring information back from memory': '从记忆中提取信息',
  'to gain knowledge or skill gradually': '逐渐获得知识或技能',
  'to study something carefully': '仔细研究某事物',
  'a way of dealing with a problem': '处理问题的一种方式',
  'extremely important': '极其重要',
  'to show something clearly': '清楚地展示某事',
  'using time and effort well': '有效利用时间和精力',
  'facts that show something is true': '表明某事为真的事实',
  'to produce or create something': '生产或创造某物',
  'to keep something at a good level': '使某事保持在良好水平',
  'a chance to do something useful': '做有用事情的机会',
  'possible but not yet fully developed': '可能存在但尚未充分发展',
  'to control something by rules': '用规则控制某事',
  'important or large enough to notice': '重要或大到足以被注意到',
  'to move something from one place or use to another': '把某物从一处或一种用途转到另一处或另一种用途',
  'easy to reach, use, or understand': '容易到达、使用或理解',
  'suitable for a particular situation': '适合特定情况',
  'an advantage or helpful result': '优势或有帮助的结果',
  'a difficult task or problem': '困难的任务或问题',
  'to examine how things are similar or different': '检查事物的相同点和不同点',
  'a worry or matter of importance': '担忧或重要事项',
  'a result of an action or situation': '行动或情况造成的结果',
  'to help cause or achieve something': '帮助造成或实现某事',
  'a decrease or to become lower': '减少，或变得更低',
  'the natural world or the conditions around people': '自然世界或人们周围的条件',
  'necessary and very important': '必要且非常重要',
  'something that helps produce a result': '有助于产生结果的事物',
  'to recognize or find out what something is': '认出或查明某物是什么',
  'an effect or influence': '效果或影响',
  'the power to affect someone or something': '影响某人或某事的力量',
  'communication or action between people or things': '人与人或事物之间的交流或作用',
  'an important topic or problem': '重要话题或问题',
  'to take part in an activity': '参加活动',
  'a rule or plan used by an organization or government': '组织或政府采用的规则或计划',
  'to support or encourage something': '支持或鼓励某事',
  'to need or demand something': '需要或要求某事',
  'a plan for achieving a goal': '实现目标的计划',
  'a study that asks people questions': '向人们提问的调查研究',
  'to succeed in reaching a goal': '成功达到目标',
  'to change or influence something': '改变或影响某事',
  'to plan or organize something': '计划或组织某事',
  'one part or feature of a situation': '某种情况的一个部分或特征',
  'the ability or space to do or hold something': '做某事或容纳某物的能力或空间',
  'to share information or ideas': '分享信息或想法',
  'to finish; having all parts': '完成；具有全部部分',
  'having many connected parts': '有许多相互连接的部分',
  'to carry out an activity or research': '开展活动或研究',
  'to protect or avoid wasting something': '保护某物或避免浪费',
  'to use resources, time, or energy': '使用资源、时间或精力',
  'a strong need or request': '强烈的需要或请求',
  'a tool or machine for a particular purpose': '用于特定目的的工具或机器',
  'to give or share something among people': '在人群中给予或分配某物',
  'to give support or make something more likely': '给予支持或使某事更可能发生',
  'to create or set up something': '创建或设立某物',
  'to judge the value or quality of something': '判断某物的价值或质量',
  'to become or make something larger': '变大或使某物变大',
  'the purpose something has; to work': '某物的用途；运转',
  'something done regularly': '经常做的事情',
  'related to history': '与历史有关',
  'to become or make something better': '变得更好或使某物更好',
  'information and understanding': '信息和理解',
  'related to a particular area': '与特定地区有关',
  'to find size or amount; an action to solve a problem': '测出大小或数量；解决问题的行动',
  'to arrange things or people in a planned way': '按计划安排事物或人员',
  'the final result of a process': '过程的最终结果',
  'to do a task or show ability': '完成任务或展示能力',
  'useful and connected with real situations': '有用且与真实情况相关',
  'happening before the present time': '发生在现在以前',
  'a series of actions; to deal with information': '一系列行动；处理信息',
  'to keep someone or something safe': '保护某人或某物安全',
  'the reason for doing something': '做某事的理由',
  'a variety or area between limits': '两个界限之间的范围或种类',
  'to make something smaller or less': '使某物变小或减少',
  'to show or think carefully about something': '反映某事或认真思考某事',
  'to answer or react to something': '回答或回应某事',
  'a duty to deal with something': '处理某事的责任',
  'to choose from a group': '从一组中选择',
  'a formal request or practical use': '正式请求或实际用途',
  'an arrangement to meet someone at a particular time': '在特定时间见某人的安排',
  'to state that something is true or certain': '说明某事真实或确定',
  'to delay an event until a later time': '把事件推迟到较晚时间',
  'to go to an event, meeting, or class': '去参加活动、会议或课程',
  'to tell someone about something': '告知某人某事',
  'an act of asking for something politely': '礼貌地请求某物的行为',
  'to give a document or answer for review': '提交文件或答案供审核',
  'to suggest that something is suitable or useful': '建议某事物合适或有用',
  'a short statement of the main ideas': '主要观点的简短陈述',
  'an opinion about something': '对某事的看法',
  'a way of thinking about a subject': '思考某个主题的方式',
  'a feeling or opinion about something': '对某事的感受或看法',
  'the writer of a book or article': '书或文章的作者',
  'a piece of writing or a grammar word like a/an/the': '一篇文字作品，或 a、an、the 这类语法词',
  'a section of writing with one main idea': '包含一个主要观点的写作段落',
  'a short piece of written text': '一小段书面文字',
  'the words and situation around an idea': '某个意思周围的词语和情境',
  'to reach an opinion from evidence': '根据证据得出看法',
  'to suggest something without saying it directly': '不直接说出而暗示某事',
  'a small piece of information': '一小条信息',
  'the rules for forming words and sentences': '构成词语和句子的规则',
  'the way parts are arranged': '各部分被安排的方式',
  'a group of words with a subject and a verb': '带有主语和动词的一组词',
  'a verb form showing time': '表示时间的动词形式',
  'sound made by speaking; active or passive verb form': '说话发出的声音；主动或被动的动词形式',
  'something required before another thing happens': '另一件事发生前所需的条件',
  'except if': '除非',
  'used to introduce a contrasting fact': '用于引出相反或转折事实',
  'without being affected by something': '不受某事影响',
  'in addition to something': '除某事之外还包括',
  'used to add a stronger point': '用于补充更有力的观点',
  'a final opinion after considering information': '考虑信息后得出的最终意见',
  'something that must be done or provided': '必须完成或提供的事情',
  'a source of information or mention of something': '信息来源或对某事的提及',
  'a book used for studying a subject': '用于学习某门科目的书',
  'not connected to the internet; in person': '未连接互联网；当面进行',
  'done without using books or notes': '不使用书本或笔记完成的',
  'to give full attention to something': '全神贯注于某事',
  'a grown person; for grown people': '成年人；供成年人使用的',
  'an official document proving something': '证明某事的正式文件',
  'information about how to do something': '关于如何做某事的信息',
  'clear and logically connected': '清楚且逻辑连贯',
  'marks such as commas and periods in writing': '写作中逗号、句号等标点符号',
  'an option designed to look possible but be wrong': '看似可能但实际错误的选项',
};

const CURATED_OPTION_TRANSLATIONS: Record<string, string> = {
  'a detail that is unrelated to the sentence': '与句子无关的细节',
  'a result with the opposite meaning': '意思相反的结果',
  'a place or time with no semantic clue': '没有语义线索的地点或时间',
};

function normalizeText(value?: string) {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function stripTrailingPunctuation(value: string) {
  return value.replace(/[。.!?]+$/u, '');
}

function extractQuotedEnglishSentence(value?: string) {
  const text = normalizeText(value);
  const quotedMatches = [
    ...text.matchAll(/['"“”]([^'"“”]{24,})['"“”]/g),
  ];
  return quotedMatches
    .map((match) => normalizeText(match[1]))
    .find((match) => /[A-Za-z]/.test(match));
}

function buildVocabularyFallback(item: VocabularySentenceInput) {
  const sourceText = normalizeText(item.example);
  const meaning = stripTrailingPunctuation(normalizeText(item.meaning));

  const productivePatterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^A clear (.+) strategy helps learners choose the next task instead of reviewing blindly\.$/u,
      () => `清晰的“${meaning}”策略能帮助学习者选择下一项任务，而不是盲目复习。`],
    [/^The platform records (.+) evidence after each exercise so progress can be verified\.$/u,
      () => `平台会在每次练习后记录“${meaning}”相关证据，以便核验进步。`],
    [/^Students remember (.+) context better when they meet the expression in a sentence\.$/u,
      () => `当学生在句子中遇到这个表达时，他们能更好地记住“${meaning}”相关语境。`],
    [/^Improving (.+) awareness can make students notice details that were ignored before\.$/u,
      () => `提高“${meaning}”意识能让学生注意到以前忽略的细节。`],
    [/^(.+) practice should include recall, feedback, and a short follow-up review\.$/u,
      () => `“${meaning}”练习应包括回忆、反馈和简短的后续复习。`],
    [/^A common (.+) challenge is knowing the expression but failing to use it under time pressure\.$/u,
      () => `常见的“${meaning}”挑战是知道这个表达，却无法在时间压力下用出来。`],
    [/^The (.+) signal helps readers find the key sentence before comparing options\.$/u,
      () => `“${meaning}”信号能帮助读者在比较选项前找到关键句。`],
    [/^A (.+) comparison can show why one option is closer to the passage than another\.$/u,
      () => `“${meaning}”比较能说明为什么某个选项比另一个更贴近文章。`],
    [/^(.+) application matters because exam questions test use in context, not isolated memory\.$/u,
      () => `“${meaning}”应用很重要，因为考试题考查的是语境中的使用，而不是孤立记忆。`],
    [/^A (.+) method should include examples, retrieval, and a short review task\.$/u,
      () => `“${meaning}”方法应包括例子、提取练习和简短复习任务。`],
    [/^(.+) review should return after one day, several days, and a later mixed exercise\.$/u,
      () => `“${meaning}”复习应在一天后、几天后以及后续混合练习中再次出现。`],
    [/^A strong (.+) response uses the expression accurately and explains the reason\.$/u,
      () => `有力的“${meaning}”回应会准确使用该表达，并说明原因。`],
    [/^(.+) accuracy improves when students compare the source sentence with their answer\.$/u,
      () => `当学生把原句和自己的答案进行比较时，“${meaning}”准确性会提高。`],
    [/^(.+) output turns recognition into writing, speaking, or translation ability\.$/u,
      () => `“${meaning}”输出能把识别能力转化为写作、口语或翻译能力。`],
  ];

  const matched = productivePatterns.find(([pattern]) => pattern.test(sourceText));
  if (matched) return matched[1](sourceText.match(matched[0])!);

  const curatedExamplePatterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^When reviewing a passage, students should notice how "(.+)" changes the key idea\.$/u,
      (match) => `复习文章时，学生应注意“${match[1]}”如何改变关键信息。`],
    [/^In writing practice, "(.+)" can help connect evidence with a clear opinion\.$/u,
      (match) => `在写作练习中，“${match[1]}”可以帮助把证据和清楚观点连接起来。`],
    [/^A listening note may include "(.+)" when speakers discuss study or public services\.$/u,
      (match) => `说话人讨论学习或公共服务时，听力笔记中可能会记录“${match[1]}”。`],
    [/^The expression "(.+)" gives learners a concrete way to talk about a CET-4 topic\.$/u,
      (match) => `“${match[1]}”这个表达给学习者提供了讨论四级话题的具体方式。`],
    [/^Teachers often ask students to explain "(.+)" with evidence from the text\.$/u,
      (match) => `老师常要求学生用文本证据解释“${match[1]}”。`],
    [/^Learners can compare answer choices by checking where "(.+)" appears in the sentence\.$/u,
      (match) => `学习者可以通过查看“${match[1]}”在句中出现的位置来比较选项。`],
    [/^A short review task asks students to use "(.+)" in a natural example\.$/u,
      (match) => `简短复习任务会要求学生在自然例句中使用“${match[1]}”。`],
    [/^In translation practice, "(.+)" is useful when the Chinese sentence implies the same idea\.$/u,
      (match) => `在翻译练习中，当中文句子含有相同意思时，“${match[1]}”很有用。`],
  ];

  const curatedMatched = curatedExamplePatterns.find(([pattern]) => pattern.test(sourceText));
  if (curatedMatched) return curatedMatched[1](sourceText.match(curatedMatched[0])!);

  return `该例句的中文译文暂缺，请以英文原句理解句意。`;
}

function translateGeneratedCorrectOption(optionText: string, meaning: string) {
  const generatedPatterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^a practical plan for using or improving (.+)$/u, () => `用于使用或提升“${meaning}”的实用计划`],
    [/^information showing whether (.+) is real or useful$/u, () => `说明“${meaning}”是否真实或有用的信息`],
    [/^the situation in which (.+) is used or understood$/u, () => `使用或理解“${meaning}”的语境`],
    [/^understanding of why (.+) matters$/u, () => `理解“${meaning}”为什么重要`],
    [/^regular training connected with (.+)$/u, () => `与“${meaning}”相关的规律练习`],
    [/^a problem learners may meet when dealing with (.+)$/u, () => `学习者处理“${meaning}”时可能遇到的问题`],
    [/^a word or clue that helps readers notice (.+)$/u, () => `帮助读者注意“${meaning}”的词语或线索`],
    [/^a way to compare (.+) with another idea or choice$/u, () => `把“${meaning}”与另一种想法或选择进行比较的方法`],
    [/^the practical use of (.+) in a sentence, passage, or task$/u, () => `在句子、文章或任务中实际使用“${meaning}”`],
    [/^a reliable method for learning, checking, or using (.+)$/u, () => `学习、检查或使用“${meaning}”的可靠方法`],
    [/^planned review that helps learners remember and reuse (.+)$/u, () => `帮助学习者记住并再次使用“${meaning}”的计划性复习`],
    [/^a written or spoken response connected with (.+)$/u, () => `与“${meaning}”相关的书面或口头回应`],
    [/^accuracy in understanding or expressing (.+)$/u, () => `理解或表达“${meaning}”时的准确性`],
    [/^language output that uses (.+) in a meaningful context$/u, () => `在有意义语境中使用“${meaning}”的语言输出`],
  ];

  for (const [pattern, translate] of generatedPatterns) {
    const match = optionText.match(pattern);
    if (match) return translate(match);
  }

  return null;
}

function translateToPhrase(optionText: string) {
  if (optionText.startsWith('to ')) {
    return `动作释义：${optionText.slice(3)}`;
  }
  if (/^(a|an|the) /u.test(optionText)) {
    return `名词释义：${optionText}`;
  }
  return `释义：${optionText}`;
}

function translateVocabularyOption(item: VocabularyQuestionInput, key: VocabularyChoice) {
  const optionText = normalizeText(item.options[key]);
  const meaning = stripTrailingPunctuation(normalizeText(item.meaning));
  const directOptionTranslation = CORE_DEFINITION_OPTION_TRANSLATIONS[optionText]
    ?? KNOWN_OPTION_TRANSLATIONS[optionText]
    ?? CURATED_OPTION_TRANSLATIONS[optionText];
  if (key === item.correctAnswer) {
    return directOptionTranslation
      ?? translateGeneratedCorrectOption(optionText, meaning)
      ?? meaning;
  }

  return directOptionTranslation
    ?? translateGeneratedCorrectOption(optionText, meaning)
    ?? `${translateToPhrase(optionText)}。干扰项，需与“${item.word}”（${meaning}）区分。`;
}

export function getVocabularySentenceSupport(item: VocabularySentenceInput): PracticeSentenceSupport {
  const sourceText = normalizeText(item.example);
  return {
    sourceText,
    chineseMeaning: KNOWN_SENTENCE_TRANSLATIONS[sourceText] ?? buildVocabularyFallback(item),
  };
}

export function getVocabularyQuestionSupport(item: VocabularyQuestionInput): VocabularyQuestionSupport {
  return {
    prompt: {
      sourceText: 'Choose the most accurate English definition after listening to the word and example sentence.',
      chineseMeaning: `听单词和例句后，选择最准确的英文释义。目标词/语块：“${item.word}”；中文义：${item.meaning}。`,
    },
    optionTranslations: (['A', 'B', 'C', 'D'] as VocabularyChoice[]).map((key) => ({
      key,
      sourceText: normalizeText(item.options[key]),
      chineseMeaning: translateVocabularyOption(item, key),
      isCorrect: key === item.correctAnswer,
    })),
  };
}

export function getQuestionSentenceSupport(input: QuestionSentenceInput): PracticeSentenceSupport | null {
  const quotedSourceText = extractQuotedEnglishSentence(input.explanation);
  const indexedOrStoredText = normalizeText(input.sentence);
  const sourceText = quotedSourceText && quotedSourceText.length > Math.max(24, indexedOrStoredText.length * 0.7)
    ? quotedSourceText
    : indexedOrStoredText;
  if (!sourceText) return null;

  const known = KNOWN_SENTENCE_TRANSLATIONS[sourceText];
  const explanation = stripTrailingPunctuation(normalizeText(input.explanation));
  return {
    sourceText,
    chineseMeaning: known ?? (explanation
      ? `这句话是本题的定位线索：${explanation}。`
      : '这句话是本题的定位原句，请结合正确答案理解它的中文含义。'),
  };
}
