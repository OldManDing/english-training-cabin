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

export type PracticeSentenceChunk = {
  sourceText: string;
  chineseMeaning: string;
};

export type PracticeSentenceSupport = PracticeSentenceChunk & {
  chunks: PracticeSentenceChunk[];
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
  'She stayed after class in order to finish the application form.':
    '她课后留下来，以便完成申请表。',
  'The group chose a short survey instead of a long interview.':
    '小组选择了简短问卷，而不是长时间访谈。',
  'Students checked the evidence rather than guessing from memory.':
    '学生核对了证据，而不是凭记忆猜测。',
  'The office should not change the deadline without a reason.':
    '办公室不应无故更改截止日期。',
  'Under this circumstance, the library extended its evening hours.':
    '在这种情况下，图书馆延长了晚间开放时间。',
  'The reading group meets on a regular basis to discuss short articles.':
    '阅读小组定期见面，讨论短文。',
  'The delay was beyond control after the storm damaged the road.':
    '暴风雨破坏道路后，延误已经无法控制。',
  'The new members were eager to learn when the workshop began.':
    '工作坊开始时，新成员们渴望学习。',
  'The new schedule saved time and moreover improved attendance.':
    '新的时间安排节省了时间，而且还提高了出勤率。',
  'A short message can provide comfort to a nervous student before the exam.':
    '考前，一条简短的信息可以安慰紧张的学生。',
  'Students should be aware of the deadline before submitting the form.':
    '学生在提交表格前应注意截止日期。',
  'Drivers should avoid alcohol before getting behind the wheel.':
    '司机开车前应避免饮酒。',
  'Emergency training teaches students how to stay alive during a fire.':
    '应急训练教学生如何在火灾中活下来。',
  'Some candidates feel anxious before an important exam.':
    '一些考生在重要考试前会感到焦虑。',
  'No learner should feel ashamed after making a correctable mistake.':
    '犯了可以纠正的错误后，学习者不应感到羞愧。',
  'The child fell asleep after the long trip.':
    '长途旅行后，孩子睡着了。',
  'New members feel more confident when they belong to a team.':
    '新成员归属于团队时会更有信心。',
  'Students can borrow a book from the library with a campus card.':
    '学生可以用校园卡从图书馆借书。',
  'Students should stay calm when a difficult question appears.':
    '遇到难题时，学生应保持冷静。',
  'The report did not dismiss a claim until the evidence was checked.':
    '报告在核验证据之前没有驳回这一说法。',
  'She decided to accept the invitation after checking her schedule.':
    '她查看日程后决定接受邀请。',
  'Proper treatment can reduce pain after an injury.':
    '适当治疗可以减轻受伤后的疼痛。',
  'A reliable teammate should keep a promise even when plans change.':
    '可靠的队友即使计划变化也应信守承诺。',
  'Writers should support a view with clear evidence.':
    '写作者应使用清楚证据支持观点。',
  'Small businesses can create wealth for local communities.':
    '小企业可以为当地社区创造财富。',
  'A quiet study room helps learners avoid distraction.':
    '安静的自习室能帮助学习者避免分心。',
  'Class groups help teachers keep contact with adult learners.':
    '班级群能帮助老师与成人学习者保持联系。',
  'Early warnings can reduce damage during a storm.':
    '预警可以减少暴风雨期间的损害。',
  'Good readers depend on evidence instead of guessing.':
    '好的读者依靠证据，而不是猜测。',
  'Short daily tasks help learners develop a habit of review.':
    '简短的每日任务能帮助学习者养成复习习惯。',
  'Turning off unused lights can save energy on campus.':
    '关掉不用的灯可以在校园里节约能源。',
  'Before the trip, students estimate the cost of transportation.':
    '出行前，学生估算交通费用。',
  'Group discussion allows students to exchange ideas before writing.':
    '小组讨论让学生在写作前交流想法。',
  'The survey can expose a problem in campus services.':
    '这项调查可以暴露校园服务中的问题。',
  'Students should not hesitate to ask when they need help.':
    '学生需要帮助时不应犹豫提问。',
  'Writers should not ignore feedback when revising a draft.':
    '写作者修改草稿时不应忽视反馈。',
  'The teacher used a simple chart to illustrate a point.':
    '老师用一张简单图表来说明一个观点。',
  'The survey results indicate a trend in online learning.':
    '调查结果表明了在线学习的一种趋势。',
  'A clear speech can inspire action in the community.':
    '清晰的演讲可以激励社区采取行动。',
  'Good classroom activities involve students in real discussion.':
    '好的课堂活动会让学生参与真实讨论。',
  'The library will launch a program for exam preparation.':
    '图书馆将推出一个备考项目。',
  'A weekly chart helps learners monitor progress.':
    '每周图表能帮助学习者监控进步。',
  'Students can obtain information from the school website.':
    '学生可以从学校网站获取信息。',
  'Practice helps readers recognize a pattern in grammar questions.':
    '练习能帮助读者识别语法题中的规律。',
  'This paragraph may represent a view shared by many students.':
    '这段话可能代表许多学生共有的一种观点。',
  'The system can restrict access to private learning data.':
    '系统可以限制对私人学习数据的访问。',
  'A mock exam can reveal a weakness before the real test.':
    '模拟考试可以在正式考试前暴露弱点。',
  'Students should revise a draft after receiving feedback.':
    '学生收到反馈后应修改草稿。',
  'Regular practice can transform a habit over time.':
    '定期练习会随着时间改变习惯。',
  'Clear guidance should accompany a change in exam policy.':
    '清楚的说明应伴随考试政策变化一起发布。',
  'A clear checklist helps students accomplish a task on time.':
    '清晰的清单能帮助学生按时完成任务。',
  'Volunteer work helps students accumulate experience.':
    '志愿服务能帮助学生积累经验。',
  'A responsible team should acknowledge a problem before solving it.':
    '负责任的团队应先承认问题，再解决问题。',
  'Effective review can combine methods from reading and writing.':
    '有效复习可以结合阅读和写作的方法。',
  'Learners improve faster when they accept feedback.':
    '学习者接受反馈时进步更快。',
  'People should not accuse others unfairly without evidence.':
    '没有证据时，人们不应不公平地指责他人。',
  'The class decided to adopt a method for weekly review.':
    '全班决定采用一种每周复习的方法。',
  'The notice helps the center advertise a service for students.':
    '这则通知帮助中心向学生宣传服务。',
  'The new card will allow access to the reading room.':
    '新卡将允许进入阅览室。',
  'The teacher may alter a plan after checking student progress.':
    '老师查看学生进度后可能会调整计划。',
  'Students often appreciate support from classmates during review.':
    '学生复习期间常常感激同学的支持。',
  'Please attach a file before submitting the application.':
    '提交申请前请附上文件。',
  'The club had to cancel a meeting because of heavy rain.':
    '俱乐部因大雨不得不取消会议。',
  'The team gathered to celebrate success after the project.':
    '项目结束后，团队聚在一起庆祝成功。',
  'Students collect data before writing the report.':
    '学生写报告前收集数据。',
  'Adult learners must commit time to regular review.':
    '成人学习者必须投入时间进行定期复习。',
  'Customers should complain politely when a service fails.':
    '服务出问题时，顾客应礼貌投诉。',
  'Writers conclude a report with a clear suggestion.':
    '写作者用清楚建议结束报告。',
  'Readers should consider evidence before choosing an answer.':
    '读者选择答案前应考虑证据。',
  'The final score can consist of parts from several tasks.':
    '最终分数可以由几项任务的得分组成。',
  'The committee will consult an expert before changing the rule.':
    '委员会在修改规则前会咨询专家。',
  'Solar panels convert energy from sunlight into electricity.':
    '太阳能板把阳光中的能量转化为电力。',
  'Clear evidence can convince readers in an essay.':
    '清楚证据可以在文章中说服读者。',
  'A reviewer should criticize fairly and offer useful advice.':
    '评阅者应公平批评，并提供有用建议。',
  'A reliable team can deliver results before the deadline.':
    '可靠的团队能在截止日期前交付成果。',
  'The chart can describe a trend in student attendance.':
    '图表可以描述学生出勤的趋势。',
  'Wasteful habits may destroy resources over time.':
    '浪费的习惯长期来看可能破坏资源。',
  'Daily effort can determine success in language learning.':
    '每日努力可以决定语言学习的成败。',
  'The error message may disappear suddenly after the page reloads.':
    '页面重新加载后，错误提示可能会突然消失。',
  'Public museums can educate students about local history.':
    '公共博物馆可以向学生介绍本地历史。',
  'Careful proofreading helps writers eliminate errors.':
    '仔细校对能帮助写作者消除错误。',
  'Stable internet access can enable learning at home.':
    '稳定的网络接入可以让居家学习成为可能。',
  'The club prepared music to entertain guests at the party.':
    '俱乐部准备了音乐来招待聚会上的客人。',
  'Students examine evidence before writing a conclusion.':
    '学生写结论前检查证据。',
  'The class used library resources to explore a topic.':
    '全班利用图书馆资源探索一个话题。',
  'Campus rules forbid smoking inside the library.':
    '校园规定禁止在图书馆内吸烟。',
  'Students intend to improve reading speed through daily practice.':
    '学生打算通过每日练习提高阅读速度。',
  'Learners need to invest time in daily practice.':
    '学习者需要在每日练习中投入时间。',
  'A weekly schedule helps students manage time.':
    '每周计划能帮助学生管理时间。',
  'The best answer should stand apart from the distractors.':
    '最佳答案应与干扰项明显区分开。',
  'A responsible leader should take blame for a clear mistake.':
    '负责任的领导者应为明确错误承担责任。',
  'Deep breathing can help students control emotion before an exam.':
    '深呼吸可以帮助学生在考前控制情绪。',
  'Clear instructions are especially important in an online course.':
    '清楚的说明在在线课程中尤其重要。',
  'Some graduates choose to join the army after college.':
    '一些毕业生大学毕业后选择参军。',
  'Learners can derive benefit from regular feedback.':
    '学习者可以从定期反馈中受益。',
  'The main idea will emerge clearly after readers compare the details.':
    '读者比较细节后，主旨会清楚显现。',
  'A perfect score is possible only with careful preparation.':
    '只有认真准备，才可能取得满分。',
  'Writers should present evidence before giving a conclusion.':
    '写作者在下结论前应先呈现证据。',
  'Survey data can help researchers predict a trend.':
    '调查数据可以帮助研究者预测趋势。',
  'The student group will publish a report after the survey.':
    '学生小组将在调查后发布报告。',
  'Many students purchase online when textbooks are discounted.':
    '教材打折时，许多学生会在线购买。',
  'Reading every day can accelerate growth in vocabulary.':
    '每天阅读可以加快词汇量增长。',
  'The school held a meeting to address a problem in the dormitory.':
    '学校开会处理宿舍里的一个问题。',
  'Teachers admire effort even when the first result is imperfect.':
    '即使第一次结果不完美，老师也欣赏努力。',
  'Citizens should assert a right politely and clearly.':
    '公民应礼貌而清楚地主张权利。',
  'A realistic plan helps learners attain a goal step by step.':
    '现实可行的计划能帮助学习者逐步达成目标。',
  'Students calculate cost before choosing a travel plan.':
    '学生在选择出行计划前计算费用。',
  'Candidates should circle the answer clearly on the sheet.':
    '考生应在答题卡上清楚圈出答案。',
  'A strong opening can command attention in a speech.':
    '有力的开头可以在演讲中吸引注意力。',
  'Please copy a file before editing the original version.':
    '编辑原始版本前请先复制文件。',
  'Readers may discover a fact by comparing two paragraphs.':
    '读者可以通过比较两个段落发现事实。',
  'Workers inspect equipment before the lab begins.':
    '实验开始前，工作人员检查设备。',
  'Volunteers plant trees near the school every spring.':
    '志愿者每年春天在学校附近植树。',
  'Students should possess knowledge and know how to use it.':
    '学生应拥有知识，并知道如何运用知识。',
  'Local factories produce goods for nearby stores.':
    '本地工厂为附近商店生产商品。',
  'Candidates need to register online before the deadline.':
    '考生需要在截止日期前在线注册。',
  'The office will release information on the school website.':
    '办公室将在学校网站发布信息。',
  'The club teaches students how to repair a bike.':
    '俱乐部教学生如何修自行车。',
  'The secretary will reply quickly after checking the form.':
    '秘书查看表格后会迅速回复。',
  'Students can reserve a seat in the library app.':
    '学生可以在图书馆应用中预订座位。',
  'After the introduction, writers should shift focus to evidence.':
    '引言之后，写作者应把重点转向证据。',
  'Spaced review can strengthen memory over several weeks.':
    '间隔复习可以在几周内强化记忆。',
  'Teachers may suppose a case to explain the grammar rule.':
    '老师可以假设一个案例来解释语法规则。',
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
  'Volunteer service gave students a chance to support younger learners.':
    '志愿服务给了学生支持低年级学习者的机会。',
  'A traffic jam near the station delayed the morning bus.':
    '车站附近的交通拥堵耽误了早班公交。',
  'The town opened a clinic to provide medical treatment for elderly residents.':
    '镇上开设了一家诊所，为老年居民提供医疗服务。',
  'The report used a market trend to explain why local stores changed prices.':
    '报告用市场趋势解释了为什么当地商店调整价格。',
  'The company will train workers before introducing new equipment.':
    '公司会在引入新设备前培训工人。',
  'The notice explained how students could pay the tuition fee in two parts.':
    '通知说明了学生如何分两次缴纳学费。',
  'Respect for fairness is a universal value in public discussion.':
    '尊重公平是公共讨论中的普遍价值。',
  'Students may feel upset when feedback only points out mistakes without guidance.':
    '如果反馈只指出错误却不给指导，学生可能会感到沮丧。',
  'The teacher corrected word usage in each student’s draft.':
    '老师纠正了每个学生草稿中的词语用法。',
  'The teacher gave valuable advice on how to revise the first draft.':
    '老师就如何修改初稿给出了有价值的建议。',
  'The library offered a wide variety of books for the reading campaign.':
    '图书馆为阅读推广活动提供了种类丰富的书籍。',
  'The report described how an accident victim received help from local volunteers.':
    '报告描述了一名事故受害者如何得到当地志愿者的帮助。',
  'The meeting discussed school violence and ways to protect students.':
    '会议讨论了校园暴力以及保护学生的方法。',
  'Honesty is a traditional virtue that appears often in Chinese stories.':
    '诚实是中国故事中经常出现的传统美德。',
  'A computer virus damaged several files before the technician removed it.':
    '技术人员清除电脑病毒前，它已经损坏了几个文件。',
  'Clear communication plays a vital role in group projects.':
    '清晰沟通在小组项目中发挥重要作用。',
  'Residents can witness change when public services respond to feedback.':
    '当公共服务回应反馈时，居民能够见证变化。',
  'Students can withdraw money from the campus ATM before the trip.':
    '学生可以在出行前从校园自动取款机取钱。',
  'Some readers wonder why the writer changed his opinion in the final paragraph.':
    '有些读者想知道作者为什么在最后一段改变了观点。',
  'The nurse cleaned the serious wound before sending the patient to hospital.':
    '护士先清理了严重伤口，然后把病人送往医院。',
  'The article described youth culture through music, fashion, and online habits.':
    '文章通过音乐、时尚和网络习惯描述了青年文化。',
  'The map marked a safe zone for students during the emergency drill.':
    '地图为应急演练中的学生标出了安全区。',
  'Regular reading and speaking practice can improve language ability.':
    '规律的阅读和口语练习可以提高语言能力。',
  'The school contacted parents when student absence became frequent.':
    '学生缺勤变得频繁时，学校联系了家长。',
  'The team chose free online tools because it had a limited budget.':
    '由于预算有限，团队选择了免费的在线工具。',
  'Clear feedback is a key component of effective language practice.':
    '清晰反馈是有效语言练习的关键组成部分。',
  'The library app offers a convenient service for reserving study rooms.':
    '图书馆应用提供便捷服务，方便预约自习室。',
  'Public debate can help citizens understand a policy.':
    '公共辩论可以帮助公民理解一项政策。',
  'Clear user feedback can increase the commercial value of a service.':
    '清晰的用户反馈可以提升一项服务的商业价值。',
  'Air pollution can affect children’s health in busy cities.':
    '在繁忙城市中，空气污染可能影响儿童健康。',
  'Many international programs aim to protect world peace.':
    '许多国际项目旨在维护世界和平。',
  'Good time management helps students finish review tasks before work.':
    '良好的时间管理能帮助学生在工作前完成复习任务。',
  'Students study psychology to understand how people learn and behave.':
    '学生学习心理学，以理解人们如何学习和表现。',
  'Excess pressure can reduce students’ confidence before an exam.':
    '过度压力会降低学生考前的信心。',
  'Better technology can improve crop production in rural areas.':
    '更好的技术可以提升农村地区的农作物产量。',
  'Flood control protects towns during heavy rain.':
    '洪水防控能在暴雨期间保护城镇。',
  'Mass communication changes how people receive public information.':
    '大众传播改变了人们接收公共信息的方式。',
  'Neat handwriting helps teachers read answers clearly.':
    '工整的书写能帮助老师清楚阅读答案。',
  'Knowing word origin can help students remember vocabulary.':
    '了解词源可以帮助学生记忆词汇。',
  'The article discussed social justice in public education.':
    '文章讨论了公共教育中的社会公平。',
  'A research fund supported the student survey.':
    '一笔研究基金支持了这项学生调查。',
  'A sleep disorder can affect daytime study.':
    '睡眠障碍会影响白天学习。',
  'Students show courage when they ask questions after a difficult lesson.':
    '学生在一节难课后主动提问时表现出勇气。',
  'A careful reader should mention a detail only when it supports the main idea.':
    '细心的读者只有在细节支持主旨时才应提到它。',
  'Problems arise when instructions are unclear.':
    '说明不清楚时，问题就会出现。',
  'The study group set aside time to review difficult words.':
    '学习小组留出时间复习难词。',
  'Students usually behave well when classroom rules are clear.':
    '课堂规则清楚时，学生通常表现良好。',
  'Candidates compose an essay after reading the short passage.':
    '考生阅读短文后写一篇作文。',
  'Some students earn income through part-time work during holidays.':
    '一些学生在假期通过兼职获得收入。',
  'Learners eventually succeed when they keep practicing with feedback.':
    '学习者持续带着反馈练习时，最终会成功。',
  'Public feedback can force change in a slow service system.':
    '公众反馈可以促使响应缓慢的服务系统作出改变。',
  'The project can move forward after the team agrees on a plan.':
    '团队就计划达成一致后，项目可以向前推进。',
  'Good writers frame a question before collecting evidence.':
    '好的写作者会在收集证据前构建问题。',
  'Readers grasp meaning faster when examples are clear.':
    '例子清楚时，读者能更快把握含义。',
  'Clear rules guard safety during a science activity.':
    '清楚的规则能在科学活动中保障安全。',
  'Busy students may hardly notice small errors in a first draft.':
    '忙碌的学生可能几乎注意不到初稿中的小错误。',
  'Many residents hate waste and support recycling programs.':
    '许多居民讨厌浪费，并支持回收项目。',
  'The claim is indeed true when the data supports it.':
    '当数据支持这一说法时，它确实是真的。',
  'Overseas study can broaden a student’s academic experience.':
    '海外学习可以拓宽学生的学术经历。',
  'Some learners prefer reading short articles before discussion.':
    '一些学习者更喜欢在讨论前阅读短文。',
  'The committee may reject a proposal if it lacks evidence.':
    '如果提案缺少证据，委员会可能会拒绝它。',
  'Some workers retire early because of health problems.':
    '一些工人因健康问题提前退休。',
  'The teacher may suggest a method after checking common mistakes.':
    '老师检查常见错误后可能会建议一种方法。',
  'Students can survive difficulty when they ask for help early.':
    '学生及早求助时，就能渡过难关。',
  'The listening task was somewhat difficult for new learners.':
    '这项听力任务对新学习者来说有些困难。',
  'The team reviewed feedback and therefore improved the service.':
    '团队复盘了反馈，因此改进了服务。',
  'The interview lasted approximately twenty minutes in the student center.':
    '这次采访在学生中心持续了大约二十分钟。',
  'The student spoke on behalf of the class at the meeting.':
    '这名学生在会议上代表全班发言。',
  'For instance, a short notice can explain the new rule clearly.':
    '例如，一则简短通知可以把新规则解释清楚。',
  'Some students preferred online feedback, whereas others wanted face-to-face guidance.':
    '一些学生更喜欢线上反馈，而另一些学生想要面对面指导。',
  'Several volunteers were willing to help after the community notice was posted.':
    '社区通知发布后，几名志愿者愿意提供帮助。',
  'The article is worth reading because it explains a real campus problem.':
    '这篇文章值得一读，因为它解释了一个真实的校园问题。',
  'The office will announce a result after checking the records.':
    '办公室核对记录后会公布结果。',
  'Writers should support an argument with clear examples.':
    '写作者应当用清楚的例子支持论点。',
  'The team leader will assign a task after checking each member’s schedule.':
    '组长会在核对每名成员的日程后分配任务。',
  'Readers should not assume a reason before checking the evidence.':
    '读者在核验证据前不应假定原因。',
  'A good notice should contain useful details about time, place, and cost.':
    '一则好的通知应包含时间、地点和费用等有用细节。',
  'Community projects can create value when residents solve real problems together.':
    '居民一起解决真实问题时，社区项目就能创造价值。',
  'Engineers design a system only after studying user needs.':
    '工程师只有研究用户需求后才会设计系统。',
  'Readers employ a strategy when a passage has too much information.':
    '文章信息过多时，读者会采用策略。',
  'The school uses passwords to secure data in the learning system.':
    '学校使用密码来保护学习系统中的数据。',
  'A steady review plan may yield results after several weeks.':
    '稳定的复习计划可能在几周后产生效果。',
  'Students should use caution when sharing personal information online.':
    '学生在网上分享个人信息时应谨慎。',
  'The group leader decided to claim responsibility after the error was confirmed.':
    '错误确认后，小组负责人决定承担责任。',
  'Small wins can build confidence during a long review plan.':
    '在长期复习计划中，小的进步能建立信心。',
  'The two groups finally reach agreement after a long discussion.':
    '经过长时间讨论，两个小组最终达成一致。',
  'Adult learners should plan ahead before a busy work week.':
    '成人学习者应在忙碌的一周工作开始前提前规划。',
  'Some visitors still prefer to pay in cash at the front desk.':
    '一些访客仍然更愿意在前台用现金付款。',
  'Both sides tried to reach compromise before the meeting ended.':
    '会议结束前，双方都试图达成妥协。',
  'The family planned carefully so they could pay debt on time.':
    '这家人认真规划，以便按时偿还债务。',
  'The teacher asked students to draw a diagram before explaining the process.':
    '老师要求学生先画图，再解释这个过程。',
  'Clean water and regular exercise can help prevent disease.':
    '清洁用水和规律运动有助于预防疾病。',
  'One unclear detail may raise doubt about the speaker’s claim.':
    '一个不清楚的细节可能会让人怀疑说话人的说法。',
  'Readers should draw a conclusion after comparing all the evidence.':
    '读者应在比较所有证据后得出结论。',
  'A realistic schedule can ease pressure before the final exam.':
    '现实可行的日程可以缓解期末考试前的压力。',
  'Students write an essay after reading the summary task carefully.':
    '学生认真阅读概要任务后写一篇短文。',
  'Students conduct an experiment only after the lab equipment is checked.':
    '实验设备检查完毕后，学生才进行实验。',
  'A senior student may lead a team during the volunteer project.':
    '一名高年级学生可能会在志愿项目中带领团队。',
  'A rushed plan can make a mess of an otherwise simple task.':
    '仓促的计划会把原本简单的任务弄乱。',
  'Some candidates feel nervous before speaking in class.':
    '一些考生在课堂发言前会感到紧张。',
  'Closing the windows can reduce noise during listening practice.':
    '关上窗户可以在听力练习时减少噪音。',
  'Classmates can offer help when a new student misses instructions.':
    '新同学错过说明时，同班同学可以提供帮助。',
  'Small shops can make a profit after improving their service.':
    '小商店改善服务后可以盈利。',
  'Writers receive feedback before revising the second draft.':
    '写作者在修改第二稿前会收到反馈。',
  'Students feel relief when they finally understand a difficult rule.':
    '学生终于理解一条难规则时会感到轻松。',
  'Better instructions can remove barriers for new users.':
    '更清楚的说明可以为新用户消除障碍。',
  'Students should make a reservation before using the study room.':
    '学生使用自习室前应先预约。',
  'Good teachers reward effort as well as correct answers.':
    '优秀教师既奖励正确答案，也奖励努力。',
  'The team used survey results to solve a problem in the dormitory.':
    '团队用调查结果解决宿舍里的一个问题。',
  'Clear rules can build trust between students and teachers.':
    '清晰的规则可以在师生之间建立信任。',
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
  'to one side or away from the main point': '在一旁；偏离主要话题',
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
  'a short break after a class': '下课后的短暂休息',
  'a person who checks tickets': '检票的人',
  'a building used only for sports': '只用于运动的建筑',
  'a number written on a receipt': '写在收据上的数字',
  'a tool for cooking food': '烹饪食物的工具',
  'a private message with no evidence': '没有证据的私人消息',
  'a road sign near a station': '车站附近的路牌',
  'a picture used for decoration': '用于装饰的图片',
  'a meal served before a meeting': '会议前供应的一餐',
  'a sound made by a machine': '机器发出的声音',
  'a color used in a chart': '图表中使用的颜色',
  'a holiday plan with no details': '没有细节的假期计划',
  'a chair placed near a door': '放在门边的椅子',
  'a weather report for tomorrow': '明天的天气预报',
  'a price printed on a label': '标签上印的价格',
  'a story about an old town': '关于老城镇的故事',
  'to close a door quietly': '轻轻关门',
  'to copy a sentence without thinking': '不思考地抄写句子',
  'to paint a wall quickly': '快速粉刷墙面',
  'to wait with no purpose': '毫无目的地等待',
  'to carry a bag across a room': '把包从房间一头拿到另一头',
  'to cancel a meal order': '取消餐食订单',
  'to turn a light off': '关灯',
  'to arrange chairs in a line': '把椅子排成一行',
  'to count numbers aloud': '大声数数',
  'to clean a desk after class': '课后清理课桌',
  'to draw a circle on paper': '在纸上画圆',
  'to open a window slowly': '慢慢打开窗户',
  'to send a package by mail': '邮寄包裹',
  'to repair a broken chair': '修理坏椅子',
  'to lock a bicycle outside': '把自行车锁在外面',
  'to watch a film at home': '在家看电影',
  'clearly made of metal': '明显由金属制成的',
  'full of loud music': '充满吵闹音乐的',
  'covered with bright colors': '覆盖着鲜艳颜色的',
  'connected only with cooking': '只和烹饪有关的',
  'located under the table': '位于桌子下面的',
  'used once and then thrown away': '只用一次就扔掉的',
  'too small to hold books': '太小而装不下书的',
  'written without punctuation': '没有标点地写成的',
  'shaped like a circle': '形状像圆形的',
  'shown only on weekends': '只在周末展示的',
  'heavier than a school bag': '比书包更重的',
  'made for winter sports': '为冬季运动制作的',
  'empty after the meeting': '会议后空着的',
  'drawn in black ink': '用黑色墨水画出的',
  'hidden behind a curtain': '藏在窗帘后面的',
  'broken by accident': '意外损坏的',
  'in a very noisy way': '以非常吵闹的方式',
  'only during the morning': '只在上午期间',
  'without checking the answer': '没有核对答案地',
  'in the opposite direction': '朝相反方向',
  'after the class has ended': '在课程结束之后',
  'for no clear reason': '没有明确原因地',
  'with no connection to the topic': '与话题没有联系地',
  'only by looking at the title': '只通过看标题',
  'before the teacher arrives': '在老师到达之前',
  'without using any evidence': '没有使用任何证据地',
  'in a completely random order': '以完全随机的顺序',
  'only when the room is empty': '只在房间空着时',
};

const COLLOCATION_USAGE_TRANSLATIONS: Record<string, string> = {
  'adjust a plan': '调整计划',
  'afford the cost': '负担得起费用',
  'annual report': '年度报告',
  'accident victim': '事故受害者',
  'alternative energy': '替代能源',
  'a balanced approach': '平衡的方法',
  'a crucial factor': '关键因素',
  'a flexible schedule': '灵活的安排',
  'a significant improvement': '显著提升',
  'available resources': '可用资源',
  'build trust': '建立信任',
  'convenient service': '便捷服务',
  'commercial value': '商业价值',
  'computer virus': '电脑病毒',
  'data privacy': '数据隐私',
  'digital technology': '数字技术',
  'efficient review': '高效复习',
  'enhance learning efficiency': '提高学习效率',
  'facilitate communication': '促进沟通',
  'feel upset': '感到沮丧',
  'human mentorship': '人的指导',
  'imitate pronunciation': '模仿发音',
  'key component': '关键组成部分',
  'language ability': '语言能力',
  'learning resources': '学习资源',
  'limited budget': '有限预算',
  'air pollution': '空气污染',
  'main point': '主要观点',
  'major change': '重大变化',
  'majority opinion': '多数意见',
  'market trend': '市场趋势',
  'medical treatment': '医疗服务',
  'necessary step': '必要步骤',
  'ordinary people': '普通人',
  'practical wisdom': '实用智慧',
  'public debate': '公共辩论',
  'reduce waste': '减少浪费',
  'resolve a conflict': '解决冲突',
  'safe zone': '安全区',
  'school violence': '校园暴力',
  'serious wound': '严重伤口',
  'similar meaning': '相似含义',
  'student absence': '学生缺勤',
  'support an argument': '支持论点',
  'time management': '时间管理',
  'traffic jam': '交通拥堵',
  'traditional virtue': '传统美德',
  'tuition fee': '学费',
  'universal value': '普遍价值',
  'valuable advice': '有价值的建议',
  'vital role': '重要作用',
  'volunteer service': '志愿服务',
  'voluntary work': '志愿工作',
  'whereas others': '而其他人',
  'wide variety': '多种多样',
  'willing to help': '愿意帮忙',
  'withdraw money': '取钱',
  'witness change': '见证变化',
  'wonder why': '想知道为什么',
  'academic writing': '学术写作',
  'academic journal': '学术期刊',
  'accept invitation': '接受邀请',
  'admit a mistake': '承认错误',
  'adopt a method': '采用方法',
  'advertise a service': '宣传服务',
  'academic discipline': '学科',
  'advocate fair access': '倡导公平获取机会',
  'answer a question': '回答问题',
  'central idea': '中心思想',
  'avoid alcohol': '避免饮酒',
  'avoid conflict': '避免冲突',
  'avoid distraction': '避免分心',
  'avoid failure': '避免失败',
  'avoid panic': '避免慌乱',
  'associate ideas': '联想观点',
  'battle disease': '抗击疾病',
  'belong to a team': '属于团队',
  'board a train': '登上火车',
  'borrow a book': '借书',
  'build confidence': '建立信心',
  'build friendship': '建立友谊',
  'cheat in an exam': '考试作弊',
  'claim responsibility': '承担责任',
  'combine methods': '结合方法',
  'common error': '常见错误',
  'civil responsibility': '公民责任',
  'conduct an experiment': '进行实验',
  'conduct experiment': '进行实验',
  'create wealth': '创造财富',
  'decrease waste': '减少浪费',
  'determine success': '决定成败',
  'dismiss a claim': '驳回说法',
  'display information': '展示信息',
  'ease pressure': '缓解压力',
  'estimate the cost': '估算费用',
  'exchange ideas': '交流想法',
  'daily expense': '日常开销',
  'entire process': '整个过程',
  'exhibit ability': '展示能力',
  'expose a problem': '暴露问题',
  'focus attention': '集中注意力',
  'gain experience': '获得经验',
  'host an event': '举办活动',
  'involve students': '让学生参与',
  'keep balance': '保持平衡',
  'keep contact': '保持联系',
  'learning experience': '学习经历',
  'good fortune': '好运',
  'lack evidence': '缺少证据',
  'make a profit': '盈利',
  'make a reservation': '预约',
  'narrow gap': '缩小差距',
  'narrow the gap': '缩小差距',
  'plan ahead': '提前计划',
  'put emphasis on the main idea': '强调主要观点',
  'protect the planet': '保护地球',
  'provide comfort': '提供安慰',
  'public affair': '公共事务',
  'parent support': '家长支持',
  'career path': '职业道路',
  'industrial development': '工业发展',
  'intense competition': '激烈竞争',
  'receive an award': '获奖',
  'raise doubt': '提出疑问',
  'reach agreement': '达成一致',
  'reach compromise': '达成妥协',
  'reduce burden': '减轻负担',
  'reduce damage': '减少损害',
  'reduce harm': '减少伤害',
  'reduce noise': '降低噪音',
  'reduce pain': '减轻疼痛',
  'reduce stress': '减轻压力',
  'reflect afterward': '事后反思',
  'revise a draft': '修改草稿',
  'ride a bicycle': '骑自行车',
  'reward effort': '奖励努力',
  'save electricity': '节约用电',
  'save fuel': '节省燃料',
  'service charge': '服务费',
  'senior student': '高年级学生',
  'stand apart': '与众不同',
  'stay alive': '活下来',
  'stay calm': '保持冷静',
  'support a view': '支持观点',
  'target the audience': '面向目标受众',
  'target a weakness': '针对弱点',
  'use caution': '谨慎行事',
  'use imagination': '发挥想象力',
  'work with a colleague': '与同事合作',
  'work contract': '工作合同',
  'write an essay': '写文章',
  'word usage': '词语用法',
  'youth culture': '青年文化',
};

const COMMON_VERB_TRANSLATIONS: Record<string, string> = {
  accept: '接受',
  achieve: '实现',
  adjust: '调整',
  admit: '承认',
  advance: '推进',
  advocate: '倡导',
  affect: '影响',
  afford: '负担得起',
  allow: '允许',
  announce: '宣布',
  arrange: '安排',
  assess: '评估',
  assign: '分配',
  avoid: '避免',
  board: '登上',
  build: '建立',
  cheat: '作弊',
  collect: '收集',
  compare: '比较',
  confirm: '确认',
  consume: '消耗',
  contain: '包含',
  create: '创造',
  decrease: '减少',
  develop: '培养',
  design: '设计',
  determine: '决定',
  discuss: '讨论',
  dismiss: '驳回',
  encourage: '鼓励',
  ease: '缓解',
  estimate: '估算',
  evaluate: '评估',
  exchange: '交流',
  exhibit: '展示',
  expose: '暴露',
  focus: '集中',
  host: '举办',
  identify: '识别',
  improve: '改进',
  inform: '告知',
  keep: '保持',
  maintain: '维持',
  obtain: '获得',
  organize: '组织',
  perform: '执行',
  plan: '计划',
  protect: '保护',
  raise: '提出',
  reach: '达成',
  reduce: '减少',
  reflect: '反思',
  regulate: '规范',
  revise: '修改',
  save: '节约',
  select: '选择',
  stand: '站立',
  stay: '保持',
  support: '支持',
  train: '培训',
  transfer: '迁移',
  use: '使用',
  work: '合作',
};

const COMMON_NOUN_TRANSLATIONS: Record<string, string> = {
  access: '机会',
  activity: '活动',
  alcohol: '酒精',
  advice: '建议',
  argument: '论点',
  behavior: '行为',
  burden: '负担',
  case: '案例',
  change: '变化',
  choice: '选择',
  claim: '说法',
  community: '社区',
  concept: '概念',
  confidence: '信心',
  conflict: '冲突',
  cost: '费用',
  caution: '谨慎',
  damage: '损害',
  data: '数据',
  details: '细节',
  draft: '草稿',
  distraction: '分心',
  electricity: '电力',
  energy: '能源',
  evidence: '证据',
  failure: '失败',
  feature: '功能',
  feedback: '反馈',
  fuel: '燃料',
  friendship: '友谊',
  harm: '伤害',
  habit: '习惯',
  ideas: '想法',
  imagination: '想象力',
  information: '信息',
  invitation: '邀请',
  issue: '议题',
  knowledge: '知识',
  method: '方法',
  mistake: '错误',
  noise: '噪音',
  pain: '疼痛',
  panic: '慌乱',
  plan: '计划',
  pressure: '压力',
  progress: '进步',
  promise: '承诺',
  project: '项目',
  report: '报告',
  resources: '资源',
  result: '结果',
  service: '服务',
  stress: '压力',
  strategy: '策略',
  success: '成败',
  system: '系统',
  task: '任务',
  value: '价值',
  view: '观点',
  wealth: '财富',
};

const COMMON_MODIFIER_TRANSLATIONS: Record<string, string> = {
  accurate: '准确',
  basic: '基础',
  clear: '清晰',
  domestic: '国内',
  educational: '教育',
  effective: '有效',
  efficient: '高效',
  financial: '经济',
  friendly: '友好',
  local: '当地',
  practical: '实用',
  public: '公共',
  reliable: '可靠',
  responsible: '负责',
  social: '社会',
  useful: '有用',
};

function cleanArticle(value: string) {
  return value.replace(/^(?:a|an|the|this|that|these|those)\s+/iu, '').trim();
}

function lookupNounTranslation(value: string) {
  const normalized = normalizeText(value).toLowerCase();
  const clean = cleanArticle(normalized);
  return COLLOCATION_USAGE_TRANSLATIONS[normalized]
    ?? COLLOCATION_USAGE_TRANSLATIONS[clean]
    ?? COMMON_NOUN_TRANSLATIONS[normalized]
    ?? COMMON_NOUN_TRANSLATIONS[clean];
}

function normalizeText(value?: string) {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function stripTrailingPunctuation(value: string) {
  return value.replace(/[。.!?]+$/u, '');
}

function cleanChineseGloss(value: string) {
  const parenthetical = value.match(/（(.+)）$/u)?.[1] ?? value;
  return stripTrailingPunctuation(parenthetical)
    .replace(/^核心词义：/u, '')
    .split(/[；;,，]/u)[0]
    .trim();
}

function buildSingleSentenceChunk(sourceText: string, chineseMeaning: string): PracticeSentenceChunk[] {
  return [{ sourceText, chineseMeaning }];
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

function translateCollocationUse(item: VocabularySentenceInput): string {
  const collocation = normalizeText(item.collocation).toLowerCase();
  return translateCollocationText(collocation, item, cleanChineseGloss(normalizeText(item.meaning)));
}

function translateCollocationText(
  phrase: string,
  item: VocabularySentenceInput,
  fallback: string,
): string {
  const rawKey = normalizeText(phrase).toLowerCase();
  const key = cleanArticle(rawKey).toLowerCase();
  const exact = COLLOCATION_USAGE_TRANSLATIONS[rawKey] ?? COLLOCATION_USAGE_TRANSLATIONS[key];
  if (exact) return exact;

  const tokens = key.split(/\s+/).filter(Boolean);
  const first = tokens[0] ?? '';
  const rest = tokens.slice(1).join(' ');
  const last = tokens[tokens.length - 1] ?? '';

  if (COMMON_VERB_TRANSLATIONS[first]) {
    const object = lookupNounTranslation(rest)
      ?? COMMON_NOUN_TRANSLATIONS[last]
      ?? rest;
    return `${COMMON_VERB_TRANSLATIONS[first]}${object}`;
  }

  if (COMMON_NOUN_TRANSLATIONS[last]) {
    const modifier = COMMON_MODIFIER_TRANSLATIONS[first] ?? cleanChineseGloss(normalizeText(item.meaning));
    return `${modifier}${COMMON_NOUN_TRANSLATIONS[last]}`;
  }

  return fallback;
}

function translateCapturedCollocation(
  match: RegExpMatchArray,
  item: VocabularySentenceInput,
  fallback: string,
) {
  return translateCollocationText(match[1], item, fallback);
}

function buildVocabularyFallback(item: VocabularySentenceInput): Pick<PracticeSentenceSupport, 'chineseMeaning' | 'chunks'> {
  const sourceText = normalizeText(item.example);
  const meaning = stripTrailingPunctuation(normalizeText(item.meaning));
  const collocationUse = translateCollocationUse(item);

  const productivePatterns: Array<[RegExp, (match: RegExpMatchArray) => Pick<PracticeSentenceSupport, 'chineseMeaning' | 'chunks'>]> = [
    [/^During a campus project, students learned to (.+) in a practical way\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `在校园项目中，学生学习了如何以实际方式${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^After comparing two drafts, the writer decided to (.+) in the final version\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `比较两份草稿后，作者决定在终稿中${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The course adviser showed candidates how to (.+) under time pressure\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `课程顾问向考生展示了如何在时间压力下${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^When the policy changed, residents needed to (.+) without delaying other work\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `政策变化时，居民需要${use}，同时不耽误其他工作。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The club used a checklist to (.+) before sending the notice\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `俱乐部在发送通知前用清单来${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^During the interview, the applicant explained how she would (.+) at work\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `面试中，申请人说明了她会如何在工作中${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A community program helped volunteers (.+) while serving elderly neighbors\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `社区项目帮助志愿者在服务老年邻居时${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^In a timed task, candidates must (.+) quickly and still check the result\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `在限时任务中，考生必须快速${use}，同时还要核对结果。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The student reporter tried to (.+) after reading several sources\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学生记者阅读几份资料后，试着${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The project leader asked each member to (.+) before the meeting\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `项目负责人要求每名成员在会前${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The school office created a simple form so families could (.+) more easily\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学校办公室制作了一份简表，让家庭能更方便地${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^During peer review, classmates practiced how to (.+) with clear evidence\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `同伴互评时，同学们练习如何用清楚证据${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The evening class set aside ten minutes to (.+) before the quiz\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `晚间班在小测前留出十分钟来${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A local volunteer showed new members how to (.+) safely\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `一名当地志愿者向新成员示范如何安全地${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The study group agreed to (.+) after checking the requirements\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学习小组核对要求后同意${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The committee needed to (.+) before announcing the decision\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `委员会在宣布决定前需要${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The campus team used last week's data to (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `校园团队利用上周的数据来${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^At the workshop, participants learned how to (.+) step by step\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `在工作坊中，参与者一步步学习如何${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The librarian helped first-year students (.+) during orientation\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `迎新期间，图书管理员帮助一年级学生${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Before the deadline, the group had to (.+) and record the result\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `截止日期前，小组必须${use}并记录结果。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The training session gave employees time to (.+) with guidance\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `培训课给员工时间在指导下${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^After the survey, the team chose to (.+) in the next update\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `调查之后，团队选择在下一次更新中${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A paragraph can (.+) when it gives enough evidence\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `一个段落在提供足够证据时可以${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Writers learn to (.+) by checking facts first\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `写作者通过先核对事实来学习${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The debate team used two examples to (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `辩论队用两个例子来${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A clear report should (.+) without adding unrelated details\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `清楚的报告应当${use}，而不添加无关细节。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Students used the data to (.+) before choosing an answer\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学生在选择答案前用数据来${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The class learned how to (.+) by comparing two cases\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `全班通过比较两个案例学习如何${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A careful reader can (.+) after checking the context\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `细心的读者核对语境后可以${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The survey helped the team (.+) more accurately\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `调查帮助团队更准确地${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The online form explains how to (.+) before the deadline\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `在线表格说明了如何在截止日期前${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Students checked the instructions before they tried to (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学生先核对说明，再尝试${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The service desk helped visitors (.+) without confusion\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `服务台帮助访客顺利${use}，没有造成困惑。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A short checklist reminded users to (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `简短清单提醒用户${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Regular practice can (.+) over several weeks\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `规律练习可以在几周内${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The new plan helped the class (.+) step by step\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `新计划帮助全班一步步${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Feedback gave learners a practical way to (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `反馈给学习者提供了一个实际方法来${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The project showed how small changes can (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `这个项目展示了小改变如何${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Clear rules help students (.+) in daily study\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `清晰规则帮助学生在日常学习中${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The school used a simple policy to (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学校用一项简单政策来${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A careful plan can (.+) before it becomes serious\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `周密计划可以在问题变严重前${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The warning notice reminded everyone to (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `警示通知提醒大家${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The notice helped the office (.+) clearly\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `这则通知帮助办公室清楚地${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Students learned to (.+) after checking the facts\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学生在核对事实后学会了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A short announcement can (.+) without confusing readers\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `简短公告可以${use}，同时不让读者困惑。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The student reporter used interviews to (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学生记者用采访来${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^During registration, (.+) asked for help at the service desk\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `登记时，${use}在服务台寻求帮助。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+) joined the evening review session after work\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `下班后，${use}参加了晚间复习课。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The workshop invited (.+) to share a learning experience\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `工作坊邀请${use}分享学习经历。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A counselor helped (.+) choose a realistic study plan\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `辅导员帮助${use}选择现实可行的学习计划。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The survey recorded how (.+) used campus services\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `调查记录了${use}如何使用校园服务。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^During orientation, (.+) received clear instructions\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `迎新期间，${use}收到了清晰说明。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The notice reminded (.+) to check the deadline\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `通知提醒${use}核对截止日期。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The interview showed why (.+) needed better support\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `采访说明了为什么${use}需要更好的支持。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A school survey asked students how (.+) affected their daily study\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学校调查询问学生${use}如何影响日常学习。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The class discussed (.+) during a short case study\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `课堂在简短案例学习中讨论了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The student union included (.+) in its campus service plan\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学生会把${use}纳入校园服务计划。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The evening workshop used (.+) to start a group discussion\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `晚间工作坊用${use}开启小组讨论。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The library notice explained (.+) before the new rule took effect\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `新规定生效前，图书馆通知解释了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A local news report linked (.+) to changes in public services\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `本地新闻报道把${use}与公共服务变化联系起来。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The course adviser compared (.+) with another solution\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `课程顾问把${use}与另一种解决方案进行比较。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^During orientation, new students asked practical questions about (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `迎新期间，新生提出了关于${use}的实际问题。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The committee reviewed (.+) before changing the schedule\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `委员会在调整日程前审查了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The teacher connected (.+) with a problem students had seen before\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `老师把${use}和学生以前见过的问题联系起来。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A chart in the report showed how (.+) changed over time\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `报告中的图表显示了${use}如何随时间变化。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A chart in the report highlighted (.+) for the class\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `报告中的图表为全班突出了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The campus team collected feedback about (.+) after the event\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `活动结束后，校园团队收集了关于${use}的反馈。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A short interview showed how residents understood (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `一次简短采访显示居民如何理解${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A short interview explored how residents understood (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `一次简短采访探讨了居民如何理解${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The workshop placed (.+) beside a real decision students had to make\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `工作坊把${use}放进学生必须做出的真实决定中讲解。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The workshop used (.+) in a real decision-making example\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `工作坊在真实决策例子中使用了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The student newsletter used (.+) to explain a broader issue\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学生通讯用${use}解释一个更广泛的问题。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The class debate treated (.+) as evidence for the main claim\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `课堂辩论把${use}视为主要论点的证据。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The guidance sheet turned (.+) into a concrete action point\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `指导单把${use}转化为具体行动点。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The guidance sheet gave practical advice about (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `指导单给出了关于${use}的实用建议。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^During the meeting, parents raised concerns about (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `会议期间，家长提出了对${use}的担忧。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The app reminder helped learners review (.+) before class\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `应用提醒帮助学习者课前复习${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The teacher asked students to compare (.+) with their own experience\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `老师要求学生把${use}与自己的经历比较。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A poster near the library summarized (.+) in one sentence\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `图书馆附近的海报用一句话概括了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The morning announcement gave students updated information about (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `晨间通知向学生提供了关于${use}的最新信息。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The final paragraph connected (.+) to the writer's opinion\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `最后一段把${use}和作者观点联系起来。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A small change in the policy made (.+) easier to understand\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `政策中的一个小变化让${use}更容易理解。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The policy note explained (.+) in plain language\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `政策说明用通俗语言解释了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The report's first chart made (.+) visible to the whole class\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `报告的第一张图表让全班都看清了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The report's first chart highlighted (.+) for the whole class\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `报告的第一张图表为全班突出了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The activity gave students a chance to (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `这项活动给学生提供了${use}的机会。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The teacher asked the class to (.+) during the lesson\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `老师要求全班在课上${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The report explains how people can (.+) in a real situation\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `报告解释了人们如何在真实情境中${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^In the practice task, learners try to (.+) with a clear purpose\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `在练习任务中，学习者尝试有明确目的地${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The project helped students learn how to (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `这个项目帮助学生学习如何${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The notice showed when people should (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `通知说明了人们什么时候应该${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The report on (.+) gave the committee enough detail to revise the plan\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `关于${use}的报告给委员会提供了足够细节，使其能够修改计划。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The report discussed (.+) in relation to student life\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `报告讨论了${use}与学生生活之间的关系。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The reading passage mentioned (.+) in a realistic school situation\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `阅读文章在真实的学校情境中提到了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A teacher used a short example to explain (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `老师用一个简短例子来解释${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Students discussed (.+) after reading a campus notice\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学生读完校园通知后讨论了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^During the seminar, students used (.+) as evidence in their discussion\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `研讨课上，学生把${use}作为讨论中的证据。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^During the seminar, students used (.+) as supporting evidence\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `研讨课上，学生把${use}用作支撑证据。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+) became a useful example when the class compared two cases\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `班级比较两个案例时，${use}成了一个有用例子。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The article gave a clear example of (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `文章给出了一个关于${use}的清楚例子。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The article connected (.+) with a problem in everyday life\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `文章把${use}和日常生活中的一个问题联系起来。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A survey about (.+) changed how the school arranged support\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `一项关于${use}的调查改变了学校安排支持服务的方式。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A survey about (.+) helped the school improve its support plan\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `一项关于${use}的调查帮助学校改进了支持计划。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The speaker mentioned (.+) while explaining the new policy\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `演讲者在解释新政策时提到了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The speaker introduced (.+) while explaining the new policy\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `演讲者在解释新政策时介绍了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A short case showed why (.+) matters in daily life\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `一个简短案例说明了为什么${use}在日常生活中很重要。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The class compared different views about (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `课堂比较了关于${use}的不同观点。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Researchers examined (.+) through interviews with local residents\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `研究人员通过采访当地居民来考察${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The chart showed why (.+) mattered to working adults\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `图表说明了为什么${use}对在职成年人很重要。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A classroom discussion connected (.+) with everyday experience\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `课堂讨论把${use}和日常经验联系起来。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The campus notice gave a clear example of (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `校园通知给出了一个关于${use}的清楚例子。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The campus notice explained (.+) in simple language\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `校园通知用简单语言解释了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The campus notice gave practical details about (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `校园通知给出了关于${use}的实用细节。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The reading group chose (.+) as evidence for its final presentation\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `阅读小组选择${use}作为最终展示的证据。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The group presentation used (.+) to support its main point\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `小组展示用${use}来支撑主要观点。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The group presentation described (.+) with one clear example\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `小组展示用一个清楚例子描述了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A short case study helped students understand (.+) beyond the definition\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `一篇简短案例研究帮助学生在定义之外理解${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A short case helped students understand (.+) in context\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `一个简短案例帮助学生在语境中理解${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Students used the paragraph to understand (.+) in context\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学生借助这个段落在语境中理解${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The article described how (.+) handled a familiar problem\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `文章描述了${use}如何处理一个常见问题。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^During the interview, (.+) explained a learning experience\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `面试中，${use}解释了一段学习经历。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The report mentioned (.+) while discussing campus services\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `报告在讨论校园服务时提到了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A short case showed how (.+) made a practical decision\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `一个简短案例展示了${use}如何作出实际决定。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The class discussion connected (.+) with everyday study and work\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `课堂讨论把${use}和日常学习工作联系起来。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The speaker introduced (.+) to explain the new policy\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `演讲者通过介绍${use}来解释新政策。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The town meeting turned (.+) into a concrete public concern\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `镇上的会议把${use}变成了一个具体的公共关切。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The local report treated (.+) as an issue worth attention\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `本地报告把${use}视为一个值得关注的问题。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The example sentence placed (.+) in a realistic setting\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `这个例句把${use}放在了真实场景中。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^During the project meeting, students learned to (.+) before making a decision\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `在项目会议上，学生先学习如何${use}，再作决定。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^In the writing workshop, a short checklist helped learners (.+) clearly\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `在写作工作坊中，一份简短清单帮助学习者清楚地${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^After reading the notice, the group decided to (.+) instead of waiting\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `看完通知后，小组决定${use}，而不是继续等待。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A campus survey showed why residents needed to (.+) in daily life\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `校园调查说明了居民为什么需要在日常生活中${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Before the deadline, the team used feedback to (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `截止日期前，团队利用反馈来${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The discussion gave students a chance to (.+) in a real situation\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `这场讨论给了学生在真实情境中${use}的机会。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A community program helped volunteers (.+) with practical support\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `社区项目通过实际支持帮助志愿者${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The teacher used a local example to show how people can (.+)\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `老师用本地例子说明人们如何${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The campus survey collected views on (.+) from first-year students\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `校园调查收集了一年级学生对${use}的看法。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A local report used (.+) to explain a change in daily life\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `本地报告用${use}来解释日常生活中的变化。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+) became the main reason for revising the plan\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `${use}成为修改计划的主要原因。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The reading passage described (.+) through a real example\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `阅读文章通过真实例子描述了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^During the workshop, students compared (.+) with another case\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `工作坊中，学生把${use}与另一个案例进行比较。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The notice mentioned (.+) because many residents had questions\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `通知提到${use}，因为许多居民对此有疑问。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A short interview showed how (.+) affected the family\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `一段简短采访展示了${use}如何影响这个家庭。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The group presentation connected (.+) with evidence from the survey\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `小组展示把${use}和调查证据联系起来。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A clear (.+) strategy helps learners choose the next task instead of reviewing blindly\.$/u,
      () => {
        const chineseMeaning = `清晰的“${meaning}”策略能帮助学习者选择下一项任务，而不是盲目复习。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The platform records (.+) evidence after each exercise so progress can be verified\.$/u,
      () => {
        const chineseMeaning = `平台会在每次练习后记录“${meaning}”相关证据，以便核验进步。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Students remember (.+) context better when they meet the expression in a sentence\.$/u,
      () => {
        const chineseMeaning = `当学生在句子中遇到这个表达时，他们能更好地记住“${meaning}”相关语境。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Improving (.+) awareness can make students notice details that were ignored before\.$/u,
      () => {
        const chineseMeaning = `提高“${meaning}”意识能让学生注意到以前忽略的细节。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+) practice should include recall, feedback, and a short follow-up review\.$/u,
      () => {
        const chineseMeaning = `“${meaning}”练习应包括回忆、反馈和简短的后续复习。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A common (.+) challenge is knowing the expression but failing to use it under time pressure\.$/u,
      () => {
        const chineseMeaning = `常见的“${meaning}”挑战是知道这个表达，却无法在时间压力下用出来。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The (.+) signal helps readers find the key sentence before comparing options\.$/u,
      () => {
        const chineseMeaning = `“${meaning}”信号能帮助读者在比较选项前找到关键句。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A (.+) comparison can show why one option is closer to the passage than another\.$/u,
      () => {
        const chineseMeaning = `“${meaning}”比较能说明为什么某个选项比另一个更贴近文章。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+) application matters because exam questions test use in context, not isolated memory\.$/u,
      () => {
        const chineseMeaning = `“${meaning}”应用很重要，因为考试题考查的是语境中的使用，而不是孤立记忆。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A (.+) method should include examples, retrieval, and a short review task\.$/u,
      () => {
        const chineseMeaning = `“${meaning}”方法应包括例子、提取练习和简短复习任务。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+) review should return after one day, several days, and a later mixed exercise\.$/u,
      () => {
        const chineseMeaning = `“${meaning}”复习应在一天后、几天后以及后续混合练习中再次出现。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A strong (.+) response uses the expression accurately and explains the reason\.$/u,
      () => {
        const chineseMeaning = `有力的“${meaning}”回应会准确使用该表达，并说明原因。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+) accuracy improves when students compare the source sentence with their answer\.$/u,
      () => {
        const chineseMeaning = `当学生把原句和自己的答案进行比较时，“${meaning}”准确性会提高。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+) output turns recognition into writing, speaking, or translation ability\.$/u,
      () => {
        const chineseMeaning = `“${meaning}”输出能把识别能力转化为写作、口语或翻译能力。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
  ];

  const matched = productivePatterns.find(([pattern]) => pattern.test(sourceText));
  if (matched) return matched[1](sourceText.match(matched[0])!);

  const curatedExamplePatterns: Array<[RegExp, (match: RegExpMatchArray) => Pick<PracticeSentenceSupport, 'chineseMeaning' | 'chunks'>]> = [
    [/^With a scholarship, more learners can afford the cost of an online course\.$/u,
      () => {
        const chineseMeaning = '有了奖学金支持，更多学习者能够负担得起在线课程的费用。';
        return {
          chineseMeaning,
          chunks: [
            {
              sourceText: 'With a scholarship',
              chineseMeaning: '有了奖学金支持',
            },
            {
              sourceText: 'more learners can afford the cost of an online course',
              chineseMeaning: '更多学习者能够负担得起一门在线课程的费用',
            },
          ],
        };
      }],
    [/^Careful planning helps students (.+) during daily study\.$/u,
      () => {
        const chineseMeaning = `细致规划能帮助学生在日常学习中更好地${collocationUse}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A focused exercise helps learners (.+) before the exam\.$/u,
      () => {
        const chineseMeaning = `有针对性的练习能帮助学习者在考试前更好地${collocationUse}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Teacher feedback helps students (.+) more accurately\.$/u,
      () => {
        const chineseMeaning = `教师反馈能帮助学生更准确地${collocationUse}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A realistic task lets learners (.+) instead of guessing\.$/u,
      () => {
        const chineseMeaning = `真实任务能让学习者实际${collocationUse}，而不是靠猜。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Regular review helps students (.+) with confidence\.$/u,
      () => {
        const chineseMeaning = `规律复习能帮助学生更有把握地${collocationUse}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A clear example shows how learners can (.+) in context\.$/u,
      () => {
        const chineseMeaning = `清楚的例子展示了学习者如何在语境中${collocationUse}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Timed practice helps students (.+) under pressure\.$/u,
      () => {
        const chineseMeaning = `限时练习能帮助学生在压力下${collocationUse}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Group discussion helps learners (.+) and explain their choice\.$/u,
      () => {
        const chineseMeaning = `小组讨论能帮助学习者${collocationUse}，并解释自己的选择。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+) helps learners understand the topic more clearly\.$/u,
      () => {
        const chineseMeaning = `${collocationUse}能帮助学习者更清楚地理解话题。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The passage describes (.+) in a familiar campus situation\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `文章在熟悉的校园情境中描述了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The reading passage described (.+) in a familiar campus situation\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `阅读文章在熟悉的校园情境中描述了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+) can become the key clue in a listening question\.$/u,
      () => {
        const chineseMeaning = `${collocationUse}可能成为听力题中的关键线索。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Students discuss (.+) when they prepare for a writing task\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `学生准备写作任务时会讨论${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+) makes the speaker's attitude easier to understand\.$/u,
      () => {
        const chineseMeaning = `${collocationUse}让说话人的态度更容易理解。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A class report connects (.+) with evidence from daily life\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `课堂报告把${use}和日常生活证据联系起来。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+) gives learners a concrete detail for comparison\.$/u,
      () => {
        const chineseMeaning = `${collocationUse}给学习者提供了可比较的具体细节。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The dialogue mentions (.+) while explaining a practical problem\.$/u,
      (match) => {
        const use = translateCapturedCollocation(match, item, collocationUse);
        const chineseMeaning = `对话在解释实际问题时提到了${use}。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+), learners can still make progress through focused practice\.$/u,
      () => {
        const chineseMeaning = `即使存在这种情况，学习者仍能通过集中练习取得进步。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The study group will continue (.+) tomorrow\.$/u,
      () => {
        const chineseMeaning = `只要条件允许，学习小组明天会继续进行。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+), adult learners can finish a short review task\.$/u,
      () => {
        const chineseMeaning = `尽管有这种限制，成人学习者仍能完成一项简短复习任务。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+), feedback also helps learners correct mistakes\.$/u,
      () => {
        const chineseMeaning = `除了前面的内容，反馈也能帮助学习者纠正错误。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+), so learners can keep their study plan\.$/u,
      () => {
        const chineseMeaning = `而且这样能节省时间，所以学习者可以坚持学习计划。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^(.+), learners can choose a better answer\.$/u,
      () => {
        const chineseMeaning = `在这个条件或角度下，学习者可以选择更合适的答案。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^When reviewing a passage, students should notice how "(.+)" changes the key idea\.$/u,
      (match) => {
        const chineseMeaning = `复习文章时，学生应注意“${COLLOCATION_USAGE_TRANSLATIONS[match[1]] ?? match[1]}”如何改变关键信息。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^In writing practice, "(.+)" can help connect evidence with a clear opinion\.$/u,
      (match) => {
        const chineseMeaning = `在写作练习中，“${COLLOCATION_USAGE_TRANSLATIONS[match[1]] ?? match[1]}”可以帮助把证据和清楚观点连接起来。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^A listening note may include "(.+)" when speakers discuss study or public services\.$/u,
      (match) => {
        const chineseMeaning = `说话人讨论学习或公共服务时，听力笔记中可能会记录“${COLLOCATION_USAGE_TRANSLATIONS[match[1]] ?? match[1]}”。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^The expression "(.+)" gives learners a concrete way to talk about a CET-4 topic\.$/u,
      (match) => {
        const chineseMeaning = `“${COLLOCATION_USAGE_TRANSLATIONS[match[1]] ?? match[1]}”这个表达给学习者提供了讨论四级话题的具体方式。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Teachers often ask students to explain "(.+)" with evidence from the text\.$/u,
      (match) => {
        const chineseMeaning = `老师常要求学生用文本证据解释“${COLLOCATION_USAGE_TRANSLATIONS[match[1]] ?? match[1]}”。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^Learners can compare answer choices by checking where "(.+)" appears in the sentence\.$/u,
      () => {
        const chineseMeaning = `学习者可以通过检查“${collocationUse}”在句子中出现的位置来比较答案选项。`;
        return {
          chineseMeaning,
          chunks: [
            {
              sourceText: 'Learners can compare answer choices',
              chineseMeaning: '学习者可以比较答案选项',
            },
            {
              sourceText: `by checking where "${item.collocation}"`,
              chineseMeaning: `方法是检查“${collocationUse}”`,
            },
            {
              sourceText: 'appears in the sentence',
              chineseMeaning: '在句子中出现的位置',
            },
          ],
        };
      }],
    [/^A short review task asks students to use "(.+)" in a natural example\.$/u,
      (match) => {
        const chineseMeaning = `简短复习任务会要求学生在自然例句中使用“${COLLOCATION_USAGE_TRANSLATIONS[match[1]] ?? match[1]}”。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
    [/^In translation practice, "(.+)" is useful when the Chinese sentence implies the same idea\.$/u,
      (match) => {
        const chineseMeaning = `在翻译练习中，当中文句子含有相同意思时，“${COLLOCATION_USAGE_TRANSLATIONS[match[1]] ?? match[1]}”很有用。`;
        return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
      }],
  ];

  const curatedMatched = curatedExamplePatterns.find(([pattern]) => pattern.test(sourceText));
  if (curatedMatched) return curatedMatched[1](sourceText.match(curatedMatched[0])!);

  const chineseMeaning = `该例句的中文译文暂缺，请以英文原句理解句意。`;
  return { chineseMeaning, chunks: buildSingleSentenceChunk(sourceText, chineseMeaning) };
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
  const known = KNOWN_SENTENCE_TRANSLATIONS[sourceText];
  const fallback = known ? null : buildVocabularyFallback(item);
  const chineseMeaning = known ?? fallback?.chineseMeaning ?? '';
  return {
    sourceText,
    chineseMeaning,
    chunks: fallback?.chunks ?? buildSingleSentenceChunk(sourceText, chineseMeaning),
  };
}

export function getVocabularyQuestionSupport(item: VocabularyQuestionInput): VocabularyQuestionSupport {
  return {
    prompt: {
      sourceText: 'Choose the most accurate English definition after listening to the word and example sentence.',
      chineseMeaning: `听单词和例句后，选择最准确的英文释义。目标词/语块：“${item.word}”；中文义：${item.meaning}。`,
      chunks: buildSingleSentenceChunk(
        'Choose the most accurate English definition after listening to the word and example sentence.',
        `听单词和例句后，选择最准确的英文释义。目标词/语块：“${item.word}”；中文义：${item.meaning}。`,
      ),
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
  const chineseMeaning = known ?? (explanation
    ? `这句话是本题的定位线索：${explanation}。`
    : '这句话是本题的定位原句，请结合正确答案理解它的中文含义。');
  return {
    sourceText,
    chineseMeaning,
    chunks: buildSingleSentenceChunk(sourceText, chineseMeaning),
  };
}
