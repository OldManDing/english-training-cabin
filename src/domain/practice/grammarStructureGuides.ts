export type GrammarStructureTopicId =
  | 'tense'
  | 'voice'
  | 'nonfinite'
  | 'clauses'
  | 'agreement'
  | 'fixed'
  | 'comparison'
  | 'inversion'
  | 'other';

export interface GrammarStructureTopicGuide {
  id: GrammarStructureTopicId;
  label: string;
  shortLabel: string;
  cue: string;
  methodSteps: readonly [string, string, string];
  checkpoint: string;
  keywords: readonly string[];
}

export const GRAMMAR_STRUCTURE_TOPIC_GUIDES: readonly GrammarStructureTopicGuide[] = [
  {
    id: 'tense',
    label: '时态题',
    shortLabel: '时态',
    cue: '看 since、last Friday、now、already、next 等时间线索。',
    methodSteps: [
      '先圈时间状语，判断动作发生在过去、现在、将来，还是从过去延续到现在。',
      '再判断动作是一次完成、正在进行，还是反复习惯。',
      '最后把选项代回主句，检查助动词和动词形式是否一致。',
    ],
    checkpoint: '时间线索和谓语形式必须一致。',
    keywords: ['时态', '现在完成时', '一般过去时', 'last friday', 'since', 'will'],
  },
  {
    id: 'voice',
    label: '语态题',
    shortLabel: '语态',
    cue: '看主语是动作发出者，还是动作承受者。',
    methodSteps: [
      '先找主语和核心动词，判断主语能不能主动做这个动作。',
      '主语承受动作时用 be done；有情态动词时用 should/can/must be done。',
      '再结合时间状语确定 be 的形式，如 was organized、should be kept。',
    ],
    checkpoint: '被动结构要同时满足“关系被动”和“时态正确”。',
    keywords: ['被动语态', '情态动词被动语态', 'be kept', 'was organized', 'be done'],
  },
  {
    id: 'nonfinite',
    label: '非谓语题',
    shortLabel: '非谓语',
    cue: '看句中是否已经有谓语，再判断 to do、doing、done。',
    methodSteps: [
      '先确认句子已有谓语，空格不是第二个谓语时才进入非谓语判断。',
      '表目的、将来或固定结构多用 to do；表主动进行或介词后多用 doing。',
      '表被动完成或修饰被动关系时优先考虑 done。',
    ],
    checkpoint: '非谓语先看句子成分，再看主动被动和固定搭配。',
    keywords: ['非谓语', 'in order to', '现在分词', '动名词', 'to do', 'doing', 'done', 'be encouraged to'],
  },
  {
    id: 'clauses',
    label: '从句与连接词题',
    shortLabel: '从句',
    cue: '看空格前后是不是两个完整句子，判断逻辑关系。',
    methodSteps: [
      '先判断空格前后是否都有主谓，若都有，优先考虑连接词或从句关系。',
      '再判逻辑：条件用 unless/if，目的用 so that，定语从句看先行词和从句成分。',
      '最后检查连接词后面是否接完整从句，避免把介词短语当从句。',
    ],
    checkpoint: '连接词必须同时满足句法完整性和逻辑关系。',
    keywords: ['从句', '关系代词', 'unless', 'so that', 'such...that', 'which', 'that'],
  },
  {
    id: 'agreement',
    label: '主谓一致题',
    shortLabel: '一致',
    cue: '看真正主语，尤其注意 either...or、not only...but also。',
    methodSteps: [
      '先找真正主语，不被插入语、介词短语或并列结构带偏。',
      '遇到 either...or、not only...but also，按靠近谓语的主语判断单复数。',
      '最后检查 be 动词或实义动词形式是否和主语一致。',
    ],
    checkpoint: '先找主语，再选谓语形式。',
    keywords: ['主谓一致', '就近原则', 'either...or', 'not only'],
  },
  {
    id: 'fixed',
    label: '固定搭配与结构题',
    shortLabel: '搭配',
    cue: '看固定结构是否直接决定空格形式。',
    methodSteps: [
      '先识别固定结构，如 had better do、look forward to doing、prevent...from doing。',
      '再判断结构里的 to 是不定式符号还是介词。',
      '最后用完整短语回读，排除语义能通但结构错误的选项。',
    ],
    checkpoint: '搭配题优先按结构定形，不只凭中文意思。',
    keywords: ['固定结构', '固定搭配', '并列结构', '情态表达', 'had better', 'look forward to', 'prevent', 'neither...nor'],
  },
  {
    id: 'comparison',
    label: '比较、数量与介词题',
    shortLabel: '比较数量',
    cue: '看名词可数性、比较级框架和介词后接成分。',
    methodSteps: [
      '先判断名词可数不可数，复数可数名词前用 fewer，不用 less。',
      '比较结构先找完整框架，如 the more..., the more...。',
      '介词后接名词或动名词，because of/despite 后不能直接接完整从句。',
    ],
    checkpoint: '数量、比较和介词题要先看后接成分。',
    keywords: ['数量词', '比较结构', '介词短语', '让步表达', 'fewer', 'despite', 'because of', 'the more'],
  },
  {
    id: 'inversion',
    label: '倒装与虚拟题',
    shortLabel: '倒装虚拟',
    cue: '看否定词前置和表示建议、必要的 that 从句。',
    methodSteps: [
      '否定词或限制词放句首时，主句通常要部分倒装。',
      'no sooner...than 常用 had 提前；not until 位于句首时主句用助动词提前。',
      'essential 等词后的 that 从句可用 should do，should 可省略。',
    ],
    checkpoint: '倒装看助动词位置，虚拟看动词原形。',
    keywords: ['倒装结构', '虚拟语气', 'no sooner', 'not until', 'essential'],
  },
  {
    id: 'other',
    label: '综合结构题',
    shortLabel: '综合',
    cue: '先找句子主干，再按选项差异回到具体规则。',
    methodSteps: [
      '先找主语和谓语，确认空格承担的句子成分。',
      '再比较选项差异，判断它们在考时态、语态、搭配还是逻辑关系。',
      '最后用规则回验整句，避免只凭语感作答。',
    ],
    checkpoint: '无法一眼分类时，回到句子主干。',
    keywords: [],
  },
] as const;

const DEFAULT_TOPIC = GRAMMAR_STRUCTURE_TOPIC_GUIDES.find((topic) => topic.id === 'other')
  ?? GRAMMAR_STRUCTURE_TOPIC_GUIDES[GRAMMAR_STRUCTURE_TOPIC_GUIDES.length - 1];
const TOPIC_MATCH_ORDER: readonly GrammarStructureTopicId[] = [
  'voice',
  'tense',
  'nonfinite',
  'clauses',
  'agreement',
  'inversion',
  'comparison',
  'fixed',
];

function normalizeFocus(focus: string): string {
  return focus.toLowerCase();
}

export function getGrammarStructureTopicByFocus(focus: string | undefined): GrammarStructureTopicGuide {
  const normalizedFocus = normalizeFocus(focus ?? '');
  return TOPIC_MATCH_ORDER
    .map((topicId) => GRAMMAR_STRUCTURE_TOPIC_GUIDES.find((topic) => topic.id === topicId))
    .find((topic): topic is GrammarStructureTopicGuide => Boolean(topic)
    && topic.keywords.some((keyword) => normalizedFocus.includes(keyword.toLowerCase()))
    ) ?? DEFAULT_TOPIC;
}

export function getGrammarStructureTopicByLabel(label: string | undefined): GrammarStructureTopicGuide {
  return GRAMMAR_STRUCTURE_TOPIC_GUIDES.find((topic) => (
    topic.label === label || topic.shortLabel === label
  )) ?? DEFAULT_TOPIC;
}

export function compareGrammarStructureFocus(
  leftFocus: string | undefined,
  rightFocus: string | undefined,
): number {
  const topicOrder = new Map(GRAMMAR_STRUCTURE_TOPIC_GUIDES.map((topic, index) => [topic.id, index]));
  const leftTopic = getGrammarStructureTopicByFocus(leftFocus);
  const rightTopic = getGrammarStructureTopicByFocus(rightFocus);

  return (topicOrder.get(leftTopic.id) ?? 999) - (topicOrder.get(rightTopic.id) ?? 999);
}

export function orderGrammarStructureQuestions<T extends { trapType?: string; id?: string | number }>(
  questions: readonly T[],
): T[] {
  return [...questions].sort((left, right) => (
    compareGrammarStructureFocus(left.trapType, right.trapType)
  ));
}
