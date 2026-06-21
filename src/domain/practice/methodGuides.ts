import type { PracticeProgressModuleId } from './practicedQuestions';
import { GRAMMAR_STRUCTURE_TOPIC_GUIDES, type GrammarStructureTopicGuide } from './grammarStructureGuides';

export type PracticeMethodGuideModuleId = PracticeProgressModuleId | 'speaking';

export interface PracticeMethodGuide {
  moduleId: PracticeMethodGuideModuleId;
  title: string;
  intro: string;
  steps: readonly [string, string, string, string];
  focus: readonly [string, string, string];
  payoff: string;
  topicGuides?: readonly GrammarStructureTopicGuide[];
}

export const PRACTICE_METHOD_GUIDES: Record<PracticeMethodGuideModuleId, PracticeMethodGuide> = {
  vocabulary: {
    moduleId: 'vocabulary',
    title: '词汇听音解题方法',
    intro: '先听单词和例句，再按词性、词义和搭配排除干扰项。',
    steps: [
      '先确认单词的词性和核心词义，避免被相似中文义带偏。',
      '再听例句里的搭配和语境，判断这个词在句子里如何使用。',
      '先排除词性不符、明显反义和语义不通的选项。',
      '提交后对照正确答案、例句和错因，把生词放回复习链路。',
    ],
    focus: ['词性', '搭配', '例句'],
    payoff: '先按这四步做，再看答案区的解析，记忆会更稳。',
  },
  cloze: {
    moduleId: 'cloze',
    title: '完形/选词填空解题方法',
    intro: '先读上下文，再用语法和语义一起锁空。',
    steps: [
      '先读空前空后句，确认整段在说什么。',
      '先找语法结构位，再看这个空需要什么词性。',
      '再比语义和固定搭配，排除只“看起来顺”的选项。',
      '最后整句回读，检查逻辑和语气是否自然。',
    ],
    focus: ['句法骨架', '上下文逻辑', '固定搭配'],
    payoff: '先走结构，再走语义，完形题会更稳。',
  },
  grammar: {
    moduleId: 'grammar',
    title: '语法结构解题方法',
    intro: '先把题目归到具体考点，再按该类题的固定步骤解。',
    steps: [
      '先找主语、谓语和空格位置，确认空格是在谓语、非谓语、连接词还是修饰成分上。',
      '再看显性线索：时间状语判时态，主谓关系判语态，to/doing/done 判非谓语。',
      '把选项按考点类型分组排除，不把时态题、语态题、搭配题混在一起凭语感猜。',
      '提交前用该类题的验算点回读整句，确认结构、逻辑和动词形式同时成立。',
    ],
    focus: ['时态', '语态', '非谓语'],
    payoff: '语法题先分类再套步骤，才能知道自己到底错在时态、语态还是结构。',
    topicGuides: GRAMMAR_STRUCTURE_TOPIC_GUIDES.filter((topic) => topic.id !== 'other'),
  },
  reading: {
    moduleId: 'reading',
    title: '仔细阅读解题方法',
    intro: '先定位题型，再回到原文找同义替换。',
    steps: [
      '先读题干，确认题型和问法，不急着看选项。',
      '圈出定位词，把题目和原文对应起来。',
      '回原文找同义替换、转折和限定信息。',
      '对照选项细节，选最贴近原文的一项。',
    ],
    focus: ['定位', '同义替换', '转折句'],
    payoff: '按题干定位原文，再看表达变化，阅读题会更稳。',
  },
  listening: {
    moduleId: 'listening',
    title: '长对话精听方法',
    intro: '先抓信号词和说话人态度，再做细节判断。',
    steps: [
      '先锁人名、数字、地点和转折词。',
      '再听主干信息，别被局部重复带走。',
      '记录态度、目的和结论，防止只听到表面词。',
      '提交后回看原句，把漏听点按错因归类。',
    ],
    focus: ['关键词', '转折', '态度'],
    payoff: '先抓结构线索，再补细节，精听会更高效。',
  },
  writing: {
    moduleId: 'writing',
    title: '短文写作方法',
    intro: '先列提纲，再用主题句、理由和例子把段落写满。',
    steps: [
      '先定观点，避免写着写着失焦。',
      '先列三段骨架，安排主题句、理由和例子。',
      '写作时先保证逻辑连贯，再打磨词句。',
      '交卷前检查连接词、语法和是否回应题目。',
    ],
    focus: ['观点', '提纲', '例证'],
    payoff: '先搭结构，再丰富表达，写作会更像完整答卷。',
  },
  translation: {
    moduleId: 'translation',
    title: '段落翻译方法',
    intro: '先拆句，再按主干、修饰和顺序重组英文。',
    steps: [
      '先找主语、谓语和宾语，不急着逐词对译。',
      '拆出修饰成分、从句和顺序关系。',
      '先译主干，再补修饰和连接。',
      '最后回查搭配、时态和中英文语序是否自然。',
    ],
    focus: ['句子主干', '语序重组', '搭配'],
    payoff: '先拆后拼，翻译题会更像英文而不是直译。',
  },
  mock: {
    moduleId: 'mock',
    title: '阶段模考方法',
    intro: '先按真实节奏做完整流程，再用模块结果复盘。',
    steps: [
      '先定时间节奏，别在单题上过度停留。',
      '按写作、听力、阅读、翻译的顺序完整推进。',
      '提交后先看分项，不先纠结单个错题。',
      '把失分回流到对应专项，下一轮补同类问题。',
    ],
    focus: ['时间', '节奏', '复盘'],
    payoff: '模考不是做完就结束，关键是把分项结果转回专项练习。',
  },
  speaking: {
    moduleId: 'speaking',
    title: '口语重说方法',
    intro: '先按题目搭框架，再用自然语速把观点完整说出来。',
    steps: [
      '先看题目要求，快速确定要说的核心观点。',
      '先列 2 到 3 个要点，避免口语内容散和跑题。',
      '开口时优先保证连贯，再补充例子和连接词。',
      '说完后回看示范表达，把高频问题记成下次的改进点。',
    ],
    focus: ['观点', '连贯', '发音'],
    payoff: '先用方法搭起表达框架，再练发音和流畅度，效果更稳。',
  },
};

export function getPracticeMethodGuide(moduleId: PracticeMethodGuideModuleId): PracticeMethodGuide {
  return PRACTICE_METHOD_GUIDES[moduleId];
}
