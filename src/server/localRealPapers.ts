import fs from 'node:fs/promises';
import path from 'node:path';
import type { LocalRealExamPaper } from '../domain/practice/localRealPapers';

export type LocalRealPaperExamId = 'cet4';

interface ParsedLocalRealPaperFileName {
  id: string;
  title: string;
  examDate: string;
  setLabel: string;
  year: number;
  month: number;
  setOrder: number;
}

export interface LocalRealPaperCatalog {
  examId: LocalRealPaperExamId;
  root: string;
  directory: string;
  papers: LocalRealExamPaper[];
}

interface ScannedLocalRealPaper extends LocalRealExamPaper {
  absolutePath: string;
  answerKeyPath?: string;
  answerKeyText?: string;
  answerKeySourcePath?: string;
  listeningAudioPath?: string;
  setOrder: number;
}

const DEFAULT_WINDOWS_LOCAL_REAL_PAPER_ROOT = 'D:\\桌面文件\\英语真题-2026-05-31';
const DEFAULT_WINDOWS_LOCAL_REAL_ANSWER_ROOT = 'D:\\桌面文件\\真题纯答案-2026-05-31';
const DEFAULT_CONTAINER_LOCAL_REAL_PAPER_ROOT = path.join(process.cwd(), 'data', 'local-real-papers');
const DEFAULT_CONTAINER_LOCAL_REAL_ANSWER_ROOT = path.join(process.cwd(), 'data', 'local-real-answers');
const GENERATED_LISTENING_AUDIO_PUBLIC_VERSION = 'question-focused-v2';
const CET4_DIRECTORY_NAME = '大学英语四级';
const CET4_FILE_NAME_PATTERN = /^(\d{4})年(\d{1,2})月英语四级真题\((第(\d+)套|组合卷)\)\.pdf$/u;
const ANSWER_EXTENSIONS = new Set(['.pdf', '.txt', '.md', '.json', '.doc', '.docx']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg']);
const ANSWER_KEYWORDS = ['答案', '解析', 'answer', 'answers', 'key', 'solution'];
const AUDIO_KEYWORDS = ['听力', '音频', '录音', 'audio', 'listening'];

export function canGenerateLocalRealPaperListeningAudio() {
  const configured = process.env.LOCAL_REAL_PAPER_GENERATED_AUDIO_ENABLED?.trim().toLowerCase();
  if (configured === 'false' || configured === '0' || configured === 'no') return false;

  return true;
}

function resolveConfiguredRoot(root?: string) {
  return path.resolve(root?.trim() || (
    process.platform === 'win32' ? DEFAULT_WINDOWS_LOCAL_REAL_PAPER_ROOT : DEFAULT_CONTAINER_LOCAL_REAL_PAPER_ROOT
  ));
}

function resolveConfiguredAnswerRoot(root?: string) {
  return path.resolve(root?.trim() || (
    process.platform === 'win32' ? DEFAULT_WINDOWS_LOCAL_REAL_ANSWER_ROOT : DEFAULT_CONTAINER_LOCAL_REAL_ANSWER_ROOT
  ));
}

function resolveConfiguredAudioRoot(root: string, audioRoot?: string) {
  return path.resolve(audioRoot?.trim() || root);
}

async function isDirectory(candidate: string) {
  try {
    return (await fs.stat(candidate)).isDirectory();
  } catch {
    return false;
  }
}

async function resolveExamDirectory(root: string, examId: LocalRealPaperExamId) {
  if (examId !== 'cet4') return root;

  const nestedCet4Directory = path.join(root, CET4_DIRECTORY_NAME);
  if (await isDirectory(nestedCet4Directory)) {
    return nestedCet4Directory;
  }

  return root;
}

function isPathInsideRoot(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return relative === '' || (Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function isPathInsideAnyRoot(roots: string[], candidate: string) {
  return roots.some((root) => isPathInsideRoot(root, candidate));
}

export function normalizeLocalRealPaperExamId(value: unknown): LocalRealPaperExamId | null {
  const normalized = typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'cet4';
  return normalized === 'cet4' ? 'cet4' : null;
}

export function parseLocalRealPaperFileName(fileName: string): ParsedLocalRealPaperFileName | null {
  const match = CET4_FILE_NAME_PATTERN.exec(fileName.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const rawSetLabel = match[3];
  const setNumber = match[4] ? Number(match[4]) : null;
  const paddedMonth = String(month).padStart(2, '0');
  const setSlug = setNumber ? `set${setNumber}` : 'combo';
  const setLabel = setNumber ? `第 ${setNumber} 套` : '组合卷';

  return {
    id: `cet4-${year}-${paddedMonth}-${setSlug}`,
    title: `${year} 年 ${month} 月英语四级真题（${setLabel}）`,
    examDate: `${year}-${paddedMonth}`,
    setLabel: rawSetLabel === '组合卷' ? '组合卷' : setLabel,
    year,
    month,
    setOrder: setNumber ?? 99,
  };
}

function toPublicPaper(paper: ScannedLocalRealPaper): LocalRealExamPaper {
  const {
    absolutePath: _absolutePath,
    answerKeyPath: _answerKeyPath,
    answerKeyText: _answerKeyText,
    answerKeySourcePath: _answerKeySourcePath,
    listeningAudioPath: _listeningAudioPath,
    setOrder: _setOrder,
    ...publicPaper
  } = paper;
  return publicPaper;
}

async function listFilesIfDirectory(directory: string): Promise<string[]> {
  try {
    const stat = await fs.stat(directory);
    if (!stat.isDirectory()) return [];
    return await fs.readdir(directory);
  } catch {
    return [];
  }
}

function includesKeyword(value: string, keywords: string[]) {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

async function findSidecarFile(options: {
  root: string;
  examDirectory: string;
  sidecarRoot?: string;
  paperBaseName: string;
  kind: 'answer' | 'audio';
}): Promise<string | undefined> {
  const extensions = options.kind === 'answer' ? ANSWER_EXTENSIONS : AUDIO_EXTENSIONS;
  const keywords = options.kind === 'answer' ? ANSWER_KEYWORDS : AUDIO_KEYWORDS;
  const sidecarRoot = options.sidecarRoot ? path.resolve(options.sidecarRoot) : options.root;
  const allowedRoots = [...new Set([options.root, sidecarRoot])];
  const directories = [
    options.examDirectory,
    path.join(options.examDirectory, options.kind === 'answer' ? '答案' : '听力'),
    path.join(options.examDirectory, options.kind === 'answer' ? '解析' : '音频'),
    path.join(options.root, options.kind === 'answer' ? '答案' : '听力'),
    path.join(options.root, options.kind === 'answer' ? '解析' : '音频'),
    path.join(options.root, options.kind === 'answer' ? '大学英语四级答案' : '大学英语四级听力'),
    sidecarRoot,
    path.join(sidecarRoot, options.kind === 'answer' ? '答案' : '听力'),
    path.join(sidecarRoot, options.kind === 'answer' ? '解析' : '音频'),
    path.join(sidecarRoot, options.kind === 'answer' ? '大学英语四级答案' : '大学英语四级听力'),
  ];

  for (const directory of directories) {
    const files = await listFilesIfDirectory(directory);
    for (const fileName of files) {
      const extension = path.extname(fileName).toLowerCase();
      if (!extensions.has(extension)) continue;

      const baseName = path.basename(fileName, extension);
      const normalizedBaseName = baseName.toLowerCase();
      const matchesPaper = normalizedBaseName.startsWith(options.paperBaseName.toLowerCase());
      if (!matchesPaper) continue;

      const isLikelySidecar = directory !== options.examDirectory || includesKeyword(baseName, keywords);
      if (!isLikelySidecar) continue;

      const absolutePath = path.resolve(directory, fileName);
      if (!isPathInsideAnyRoot(allowedRoots, absolutePath)) continue;
      return absolutePath;
    }
  }

  return undefined;
}

interface IndexedAnswerKey {
  text: string;
  sourcePath: string;
}

function hasUsableObjectiveAnswerText(text: string) {
  return /\b\d{1,2}\s*[.:]\s*[A-P]\b/u.test(text) && !/未解析到客观题答案/u.test(text);
}

function parseCentralAnswerIndex(markdown: string, sourcePath: string) {
  const answerIndex = new Map<string, IndexedAnswerKey>();
  const lines = markdown.split(/\r?\n/);
  let currentHeading = '';
  let currentLines: string[] = [];

  const flush = () => {
    if (!currentHeading) return;
    const parsed = parseLocalRealPaperFileName(`${currentHeading}.pdf`);
    const body = currentLines.join('\n').trim();
    if (!parsed || !hasUsableObjectiveAnswerText(body)) return;
    answerIndex.set(parsed.id, {
      sourcePath,
      text: `# ${currentHeading} 答案\n\n${body}\n`,
    });
  };

  for (const line of lines) {
    const headingMatch = /^###\s+(.+?)\s*$/u.exec(line);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1].trim();
      currentLines = [];
      continue;
    }

    if (currentHeading) {
      currentLines.push(line);
    }
  }

  flush();
  return answerIndex;
}

async function buildCentralAnswerIndex(options: {
  answerRoot: string;
  examId: LocalRealPaperExamId;
}) {
  if (options.examId !== 'cet4') return new Map<string, IndexedAnswerKey>();

  const candidates = [
    path.join(options.answerRoot, '大学英语四级-纯答案.md'),
    path.join(options.answerRoot, '大学英语四级答案.md'),
    path.join(options.answerRoot, 'cet4-answers.md'),
  ];

  for (const candidate of candidates) {
    const absolutePath = path.resolve(candidate);
    if (!isPathInsideRoot(options.answerRoot, absolutePath)) continue;

    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) continue;
      const markdown = await fs.readFile(absolutePath, 'utf8');
      return parseCentralAnswerIndex(markdown, absolutePath);
    } catch {
      // Try the next conventional answer-index filename.
    }
  }

  return new Map<string, IndexedAnswerKey>();
}

async function scanLocalRealPaperFiles(options: {
  root?: string;
  answerRoot?: string;
  audioRoot?: string;
  examId: LocalRealPaperExamId;
}): Promise<{ root: string; directory: string; papers: ScannedLocalRealPaper[] }> {
  const root = resolveConfiguredRoot(options.root);
  const answerRoot = resolveConfiguredAnswerRoot(options.answerRoot);
  const audioRoot = resolveConfiguredAudioRoot(root, options.audioRoot);
  const directory = await resolveExamDirectory(root, options.examId);

  if (!isPathInsideRoot(root, directory)) {
    return { root, directory, papers: [] };
  }

  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch {
    return { root, directory, papers: [] };
  }

  const answerIndex = await buildCentralAnswerIndex({ answerRoot, examId: options.examId });
  const papers: ScannedLocalRealPaper[] = [];
  for (const fileName of entries) {
    const parsed = parseLocalRealPaperFileName(fileName);
    if (!parsed) continue;

    const absolutePath = path.resolve(directory, fileName);
    if (!isPathInsideRoot(root, absolutePath)) continue;

    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) continue;
    const paperBaseName = path.basename(fileName, path.extname(fileName));
    const indexedAnswerKey = answerIndex.get(parsed.id);
    const [answerKeyPath, listeningAudioPath] = await Promise.all([
      findSidecarFile({ root, examDirectory: directory, sidecarRoot: answerRoot, paperBaseName, kind: 'answer' }),
      findSidecarFile({ root, examDirectory: directory, sidecarRoot: audioRoot, paperBaseName, kind: 'audio' }),
    ]);
    const hasAnswerKey = Boolean(answerKeyPath || indexedAnswerKey);
    const hasLocalListeningAudio = Boolean(listeningAudioPath);
    const canGenerateListeningAudio = canGenerateLocalRealPaperListeningAudio();
    const listeningSource = hasLocalListeningAudio
      ? 'local-file'
      : canGenerateListeningAudio
        ? 'generated-tts'
        : 'browser-tts';

    papers.push({
      id: parsed.id,
      title: parsed.title,
      examDate: parsed.examDate,
      setLabel: parsed.setLabel,
      year: parsed.year,
      month: parsed.month,
      fileName,
      sizeBytes: stat.size,
      lastModifiedAt: stat.mtime.toISOString(),
      pdfUrl: `/api/local-real-papers/${parsed.id}/pdf`,
      hasListeningContent: false,
      hasAnswerKey,
      hasListeningAudio: hasLocalListeningAudio || canGenerateListeningAudio,
      answerKeyUrl: hasAnswerKey ? `/api/local-real-papers/${parsed.id}/answer-key` : undefined,
      listeningAudioUrl: hasLocalListeningAudio
        ? `/api/local-real-papers/${parsed.id}/audio`
        : canGenerateListeningAudio
          ? `/api/local-real-papers/${parsed.id}/generated-listening-audio?v=${GENERATED_LISTENING_AUDIO_PUBLIC_VERSION}`
          : undefined,
      answerSource: hasAnswerKey ? 'local-file' : 'missing',
      listeningSource,
      note: hasLocalListeningAudio
        ? '本地扫描 PDF；已自动挂载同名答案或听力配套文件。'
        : canGenerateListeningAudio
          ? '本地扫描 PDF；未发现配套官方听力原音，已启用本机 TTS 练习音频。'
          : '本地扫描 PDF；未发现配套官方听力原音，页面版听力文本支持浏览器朗读。',
      source: 'local-scan',
      absolutePath,
      answerKeyPath,
      answerKeyText: indexedAnswerKey?.text,
      answerKeySourcePath: indexedAnswerKey?.sourcePath,
      listeningAudioPath,
      setOrder: parsed.setOrder,
    });
  }

  papers.sort((left, right) => {
    if ((left.year ?? 0) !== (right.year ?? 0)) return (right.year ?? 0) - (left.year ?? 0);
    if ((left.month ?? 0) !== (right.month ?? 0)) return (right.month ?? 0) - (left.month ?? 0);
    return left.setOrder - right.setOrder;
  });

  return { root, directory, papers };
}

export async function listLocalRealPapers(options: {
  root?: string;
  answerRoot?: string;
  audioRoot?: string;
  examId: LocalRealPaperExamId;
}): Promise<LocalRealPaperCatalog> {
  const scan = await scanLocalRealPaperFiles(options);
  return {
    examId: options.examId,
    root: scan.root,
    directory: scan.directory,
    papers: scan.papers.map(toPublicPaper),
  };
}

export async function findLocalRealPaperFile(options: {
  root?: string;
  answerRoot?: string;
  audioRoot?: string;
  examId: LocalRealPaperExamId;
  paperId: string;
}): Promise<ScannedLocalRealPaper | null> {
  const scan = await scanLocalRealPaperFiles(options);
  return scan.papers.find((paper) => paper.id === options.paperId) ?? null;
}
