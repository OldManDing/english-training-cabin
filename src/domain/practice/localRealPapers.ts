export interface LocalRealExamPaper {
  id: string;
  title: string;
  examDate: string;
  setLabel: string;
  pdfUrl: string;
  year?: number;
  month?: number;
  fileName?: string;
  sizeBytes?: number;
  lastModifiedAt?: string;
  pageCount?: number;
  hasListeningContent: boolean;
  hasAnswerKey: boolean;
  hasListeningAudio?: boolean;
  answerKeyUrl?: string;
  listeningAudioUrl?: string;
  answerSource?: 'local-file' | 'ai-reference' | 'missing';
  listeningSource?: 'local-file' | 'generated-tts' | 'browser-tts' | 'missing';
  note: string;
  source?: 'bundled' | 'local-scan';
}

export interface LocalRealPaperAnswerItem {
  questionNumber: string;
  answer: string;
  confidence: 'low' | 'medium' | 'high';
  explanation?: string;
}

export interface LocalRealPaperAnswerSection {
  section: string;
  answers: LocalRealPaperAnswerItem[];
}

export interface LocalRealPaperAnswerReference {
  paperId: string;
  paperTitle: string;
  generatedAt: string;
  source: 'ai-reference';
  confidence: 'low' | 'medium' | 'high';
  notice: string;
  writingReference?: string;
  translationReference?: string;
  answerSections: LocalRealPaperAnswerSection[];
  listeningPractice?: {
    mode: 'browser-tts';
    title: string;
    script: string;
    notice: string;
  };
}

export interface LocalRealPaperContentPage {
  pageNumber: number;
  text: string;
}

export interface LocalRealPaperContentSection {
  id: 'writing' | 'listening' | 'reading' | 'translation' | 'full-text';
  label: string;
  title: string;
  text: string;
}

export interface LocalRealPaperContent {
  paperId: string;
  paperTitle: string;
  pageCount: number;
  truncated: boolean;
  generatedAt: string;
  sections: LocalRealPaperContentSection[];
  pages: LocalRealPaperContentPage[];
}

export const CET4_LOCAL_REAL_PAPERS: LocalRealExamPaper[] = [
  {
    id: 'cet4-2023-06-set1',
    title: '2023 年 6 月英语四级真题（第 1 套）',
    examDate: '2023-06',
    setLabel: '第 1 套',
    pdfUrl: '/local-real-papers/cet4-2023-06-set1.pdf',
    pageCount: 9,
    hasListeningContent: true,
    hasAnswerKey: false,
    hasListeningAudio: false,
    answerSource: 'missing',
    listeningSource: 'browser-tts',
    source: 'bundled',
    note: '本地 PDF 试题卷；未包含标准答案键，适合计时自练和人工核对。',
  },
  {
    id: 'cet4-2023-12-set2',
    title: '2023 年 12 月英语四级真题（第 2 套）',
    examDate: '2023-12',
    setLabel: '第 2 套',
    pdfUrl: '/local-real-papers/cet4-2023-12-set2.pdf',
    pageCount: 8,
    hasListeningContent: true,
    hasAnswerKey: false,
    hasListeningAudio: false,
    answerSource: 'missing',
    listeningSource: 'browser-tts',
    source: 'bundled',
    note: '本地 PDF 试题卷；未包含标准答案键，适合计时自练和人工核对。',
  },
  {
    id: 'cet4-2023-12-set3',
    title: '2023 年 12 月英语四级真题（第 3 套）',
    examDate: '2023-12',
    setLabel: '第 3 套',
    pdfUrl: '/local-real-papers/cet4-2023-12-set3.pdf',
    pageCount: 6,
    hasListeningContent: false,
    hasAnswerKey: false,
    hasListeningAudio: false,
    answerSource: 'missing',
    listeningSource: 'missing',
    source: 'bundled',
    note: 'PDF 明确说明听力未重复显示；当前只覆盖写作、阅读和翻译自练。',
  },
];
