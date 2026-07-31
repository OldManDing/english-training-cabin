import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  FilePenLine,
  GraduationCap,
  ListChecks,
  Mic,
  Play,
  Target,
  Volume2,
  X,
} from 'lucide-react';
import { StudyGoal } from '../types';
import { DateField, SelectField } from './controls/FormControls';
import {
  buildOnboardingDiagnosticReport,
  createOnboardingDiagnosticItems,
  DiagnosticAiEvaluationMap,
  DiagnosticAnswerMap,
  DiagnosticItem,
  ONBOARDING_DIAGNOSTIC_EXPECTED_ITEM_COUNT,
  OnboardingDiagnosticReport,
  ONBOARDING_DIAGNOSTIC_ITEMS,
} from '../domain/diagnostic/onboardingDiagnostic';
import { getExamRegistryEntry, listPublicExamProfiles } from '../exams/registry';
import { apiRequest } from '../lib/api';
import { stopPracticeSpeech } from '../lib/practiceSpeech';
import DiagnosticResultPanel from './diagnostic/DiagnosticResultPanel';
import { getSuggestedExamDate } from '../domain/planner/defaultExamDate';

interface OnboardingDiagnosticProps {
  onDismiss: () => void;
  onSetScoreLimit?: (score: number) => void;
  onCompleteDiagnostic?: (result: {
    examId: string;
    targetScore: number;
    examDate: string;
    dailyMinutes: number;
    prioritySkills: StudyGoal['prioritySkills'];
    skillProfiles: OnboardingDiagnosticReport['skillProfiles'];
    diagnosticReport: OnboardingDiagnosticReport;
  }) => Promise<void> | void;
}

const skillLabels: Record<string, string> = {
  reading: '阅读',
  listening: '听力',
  vocabulary: '词汇完形',
  grammar: '语法',
  translation: '翻译',
  writing: '写作',
  speaking: '口语',
};

const skillIcons: Record<string, React.ReactNode> = {
  reading: <BookOpenCheck className="h-4 w-4" />,
  listening: <ListChecks className="h-4 w-4" />,
  vocabulary: <BookOpenCheck className="h-4 w-4" />,
  grammar: <ListChecks className="h-4 w-4" />,
  translation: <FilePenLine className="h-4 w-4" />,
  writing: <FilePenLine className="h-4 w-4" />,
  speaking: <Mic className="h-4 w-4" />,
};

const examOptions = listPublicExamProfiles();
const previousDiagnosticItemsKey = 'english-training-cabin:last-onboarding-diagnostic-items';

type DiagnosticAiResponse = {
  usedFallback: boolean;
  evaluations: DiagnosticAiEvaluationMap;
};

type DiagnosticAiReviewResult = {
  usedFallback: boolean;
  evaluations: DiagnosticAiEvaluationMap;
};

type DiagnosticRecordingStatus = 'idle' | 'recording' | 'ready' | 'unsupported' | 'blocked';

interface DiagnosticRecordingState {
  status: DiagnosticRecordingStatus;
  audioUrl: string | null;
  message: string;
}

type DiagnosticSpeechRole = 'male' | 'female' | 'neutral';

interface DiagnosticSpeechSegment {
  role: DiagnosticSpeechRole;
  text: string;
}

type DiagnosticVoiceMode = 'gendered' | 'distinct' | 'simulated' | 'loading';

interface DiagnosticVoiceAssignment {
  mode: DiagnosticVoiceMode;
  maleVoice: SpeechSynthesisVoice | null;
  femaleVoice: SpeechSynthesisVoice | null;
  neutralVoice: SpeechSynthesisVoice | null;
  note: string;
}

const defaultDiagnosticRecordingState: DiagnosticRecordingState = {
  status: 'idle',
  audioUrl: null,
  message: '录音只保存在当前页面，用于回放检查；请同时填写下方英文转写文本用于诊断评分。',
};

const diagnosticFemaleVoiceHints = [
  'female',
  'woman',
  'zira',
  'samantha',
  'victoria',
  'karen',
  'susan',
  'hazel',
  'ava',
  'allison',
  'joanna',
  'aria',
  'jenny',
  'emily',
  'olivia',
  'sara',
  'huihui',
  'yaoyao',
  'xiaoxiao',
  'xiaoyi',
  'xiaomo',
  'xiaoqiu',
  'xiaorui',
  'xiaoshuang',
  'xiaoxuan',
  'xiaoyan',
];

const diagnosticMaleVoiceHints = [
  'male',
  'man',
  'david',
  'mark',
  'alex',
  'daniel',
  'fred',
  'tom',
  'guy',
  'george',
  'ryan',
  'brian',
  'christopher',
  'kangkang',
  'yunxi',
  'yunyang',
  'yunjian',
  'xiaogang',
  'xiaobei',
];

function getDaysRemaining(date: string): number {
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

function getAnswerPreview(value: string | undefined): string {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '未作答';
  return normalized.length > 42 ? `${normalized.slice(0, 42)}...` : normalized;
}

function readPreviousDiagnosticItemIds(): string[] {
  try {
    const rawValue = window.localStorage.getItem(previousDiagnosticItemsKey);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function rememberDiagnosticItemIds(items: DiagnosticItem[]) {
  try {
    window.localStorage.setItem(previousDiagnosticItemsKey, JSON.stringify(items.map((item) => item.id)));
  } catch {
    // Storage can be unavailable in private or restricted browser modes.
  }
}

function normalizeDiagnosticSpeechRole(label: string): DiagnosticSpeechRole {
  const normalized = label.toLowerCase();
  if (normalized === 'man' || normalized === 'male' || label === '男') return 'male';
  if (normalized === 'woman' || normalized === 'female' || label === '女') return 'female';
  return 'neutral';
}

function splitDiagnosticSpeechSegments(text: string): DiagnosticSpeechSegment[] {
  const segments: DiagnosticSpeechSegment[] = [];
  const markerPattern = /\b(Man|Woman|Male|Female)\s*:\s*|([男女])\s*[：:]\s*/g;
  let match: RegExpExecArray | null;
  let currentRole: DiagnosticSpeechRole = 'neutral';
  let currentTextStart = 0;

  while ((match = markerPattern.exec(text)) !== null) {
    const previousText = text.slice(currentTextStart, match.index).trim();
    if (previousText) segments.push({ role: currentRole, text: previousText });
    currentRole = normalizeDiagnosticSpeechRole(match[1] ?? match[2] ?? '');
    currentTextStart = markerPattern.lastIndex;
  }

  const tailText = text.slice(currentTextStart).trim();
  if (tailText) segments.push({ role: currentRole, text: tailText });

  return segments.length > 0 ? segments : [{ role: 'neutral', text }];
}

function getDiagnosticVoiceSearchText(voice: SpeechSynthesisVoice): string {
  return `${voice.name} ${voice.voiceURI} ${voice.lang}`.toLowerCase();
}

function findDiagnosticVoiceByHints(voices: SpeechSynthesisVoice[], hints: string[], excludedVoice?: SpeechSynthesisVoice | null) {
  return voices.find((voice) => {
    if (excludedVoice && voice.voiceURI === excludedVoice.voiceURI && voice.name === excludedVoice.name) return false;
    const searchText = getDiagnosticVoiceSearchText(voice);
    return hints.some((hint) => searchText.includes(hint));
  }) ?? null;
}

function buildDiagnosticVoiceAssignment(voices: SpeechSynthesisVoice[]): DiagnosticVoiceAssignment {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  const candidates = englishVoices.length > 0 ? englishVoices : voices;

  if (candidates.length === 0) {
    return {
      mode: 'loading',
      maleVoice: null,
      femaleVoice: null,
      neutralVoice: null,
      note: '正在加载系统语音；首次进入页面时浏览器可能还没返回 voice 列表。',
    };
  }

  const maleVoice = findDiagnosticVoiceByHints(candidates, diagnosticMaleVoiceHints);
  const femaleVoice = findDiagnosticVoiceByHints(candidates, diagnosticFemaleVoiceHints, maleVoice);
  if (maleVoice && femaleVoice) {
    return {
      mode: 'gendered',
      maleVoice,
      femaleVoice,
      neutralVoice: femaleVoice,
      note: `当前使用 ${maleVoice.name} / ${femaleVoice.name} 区分男女声，并启用慢速清晰播报。`,
    };
  }

  if (candidates.length >= 2) {
    const firstVoice = maleVoice ?? candidates[0];
    const secondVoice = femaleVoice ?? candidates.find((voice) => voice.voiceURI !== firstVoice.voiceURI || voice.name !== firstVoice.name) ?? candidates[1];
    return {
      mode: 'distinct',
      maleVoice: firstVoice,
      femaleVoice: secondVoice,
      neutralVoice: secondVoice,
      note: `系统未提供明确英文男女声，已用 ${firstVoice.name} / ${secondVoice.name} 加强区分，并启用慢速清晰播报。`,
    };
  }

  return {
    mode: 'simulated',
    maleVoice: candidates[0],
    femaleVoice: candidates[0],
    neutralVoice: candidates[0],
    note: `当前浏览器只提供 ${candidates[0].name}，只能用温和音高和慢速语速模拟男女声。`,
  };
}

function chooseDiagnosticVoice(assignment: DiagnosticVoiceAssignment, role: DiagnosticSpeechRole): SpeechSynthesisVoice | null {
  if (role === 'male') return assignment.maleVoice ?? assignment.neutralVoice;
  if (role === 'female') return assignment.femaleVoice ?? assignment.neutralVoice;
  return assignment.neutralVoice ?? assignment.femaleVoice ?? assignment.maleVoice;
}

function getDiagnosticProsody(role: DiagnosticSpeechRole) {
  if (role === 'male') return { pitch: 0.86, rate: 0.82, volume: 1 };
  if (role === 'female') return { pitch: 1.14, rate: 0.8, volume: 1 };
  return { pitch: 1, rate: 0.86, volume: 1 };
}

function getDiagnosticSegmentDelayMs(index: number): number {
  return index === 0 ? 0 : 380;
}

async function evaluateDiagnosticSubjectiveAnswersWithAi(params: {
  examId: string;
  items: DiagnosticItem[];
  answers: DiagnosticAnswerMap;
}): Promise<DiagnosticAiReviewResult> {
  const subjectiveItems = params.items
    .filter((item): item is Extract<DiagnosticItem, { kind: 'text' }> =>
      item.kind === 'text' && (params.answers[item.id] ?? '').trim().length > 0)
    .map((item) => ({
      id: item.id,
      skillArea: item.skillArea,
      title: item.title,
      context: item.context,
      prompt: item.prompt,
      answer: params.answers[item.id],
      minWords: item.minWords,
    }));

  if (subjectiveItems.length === 0) return { usedFallback: false, evaluations: {} };

  const response = await apiRequest<DiagnosticAiResponse>('/api/ai/evaluate-diagnostic', {
    method: 'POST',
    body: JSON.stringify({
      examId: params.examId,
      items: subjectiveItems,
    }),
  });

  if (response.usedFallback) return { usedFallback: true, evaluations: {} };

  return {
    usedFallback: false,
    evaluations: Object.fromEntries(
      Object.entries(response.evaluations ?? {}).filter(([, evaluation]) => evaluation.source === 'ai'),
    ),
  };
}

export default function OnboardingDiagnostic({
  onDismiss,
  onSetScoreLimit,
  onCompleteDiagnostic,
}: OnboardingDiagnosticProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [targetExamId, setTargetExamId] = useState<string>('cet4');
  const [targetScore, setTargetScore] = useState<number>(550);
  const [countdownDate, setCountdownDate] = useState<string>(() => getSuggestedExamDate());
  const [dailyMinutes, setDailyMinutes] = useState<number>(45);
  const [diagnosticItems, setDiagnosticItems] = useState<DiagnosticItem[]>([]);
  const [answers, setAnswers] = useState<DiagnosticAnswerMap>({});
  const [startedAt, setStartedAt] = useState<string>(() => new Date().toISOString());
  const [report, setReport] = useState<OnboardingDiagnosticReport | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [aiReviewNotice, setAiReviewNotice] = useState<string | null>(null);
  const [speakingItemId, setSpeakingItemId] = useState<string | null>(null);
  const [isDiagnosticSpeechPaused, setIsDiagnosticSpeechPaused] = useState(false);
  const [diagnosticVoices, setDiagnosticVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [diagnosticRecordings, setDiagnosticRecordings] = useState<Record<string, DiagnosticRecordingState>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeRecordingItemIdRef = useRef<string | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const diagnosticRecordingUrlsRef = useRef<string[]>([]);
  const diagnosticSpeechRunRef = useRef(0);

  const activeDiagnosticItems = diagnosticItems.length > 0 ? diagnosticItems : ONBOARDING_DIAGNOSTIC_ITEMS;
  const answeredCount = activeDiagnosticItems.filter((item) => (answers[item.id] ?? '').trim().length > 0).length;
  const unansweredCount = Math.max(0, activeDiagnosticItems.length - answeredCount);
  const canSubmitDiagnostic = activeDiagnosticItems.length > 0 && !isSaving;
  const daysRemaining = getDaysRemaining(countdownDate);
  const selectedExam = getExamRegistryEntry(targetExamId) ?? getExamRegistryEntry('cet4')!;
  const selectedExamName = selectedExam.profile.name;
  const selectedExamIsTrainable = selectedExam.routeAvailability === 'trainable';
  const diagnosticVoiceAssignment = buildDiagnosticVoiceAssignment(diagnosticVoices);
  const diagnosticMinutes = Math.max(8, Math.round(dailyMinutes * 0.25));
  const practiceMinutes = Math.max(12, Math.round(dailyMinutes * 0.45));
  const reviewMinutes = Math.max(6, dailyMinutes - diagnosticMinutes - practiceMinutes);
  const setAnswer = (itemId: string, value: string) => {
    setAnswers((current) => ({ ...current, [itemId]: value }));
    setSaveError(null);
    setAiReviewNotice(null);
  };

  const setDiagnosticRecording = (itemId: string, patch: Partial<DiagnosticRecordingState>) => {
    setDiagnosticRecordings((current) => ({
      ...current,
      [itemId]: {
        ...defaultDiagnosticRecordingState,
        ...(current[itemId] ?? {}),
        ...patch,
      },
    }));
  };

  const discardActiveDiagnosticRecording = (resetMessage?: string) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    const itemId = activeRecordingItemIdRef.current;
    recorder.ondataavailable = null;
    recorder.onstop = null;
    if (recorder.state === 'recording') recorder.stop();
    recorder.stream.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    activeRecordingItemIdRef.current = null;
    audioChunksRef.current = [];
    if (itemId && resetMessage) {
      setDiagnosticRecording(itemId, {
        status: 'idle',
        audioUrl: null,
        message: resetMessage,
      });
    }
  };

  const revokeDiagnosticRecordingUrls = () => {
    diagnosticRecordingUrlsRef.current.forEach((audioUrl) => URL.revokeObjectURL(audioUrl));
    diagnosticRecordingUrlsRef.current = [];
  };

  useEffect(() => {
    return () => {
      diagnosticSpeechRunRef.current += 1;
      stopPracticeSpeech();
      discardActiveDiagnosticRecording();
      revokeDiagnosticRecordingUrls();
    };
  }, []);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;
    const speechSynthesis = window.speechSynthesis;

    const refreshVoices = () => {
      setDiagnosticVoices(speechSynthesis.getVoices());
    };

    refreshVoices();
    if (typeof speechSynthesis.addEventListener === 'function') {
      speechSynthesis.addEventListener('voiceschanged', refreshVoices);
      return () => speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices);
    }

    const previousVoicesChangedHandler = speechSynthesis.onvoiceschanged;
    speechSynthesis.onvoiceschanged = refreshVoices;
    return () => {
      speechSynthesis.onvoiceschanged = previousVoicesChangedHandler;
    };
  }, []);

  useEffect(() => {
    const defaultDate = selectedExam.defaultExamDate;
    if (defaultDate) setCountdownDate(defaultDate);
  }, [selectedExam.defaultExamDate]);

  const speakDiagnosticContext = (itemId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      setSaveError('当前浏览器不支持语音播报，请先查看听力转写完成诊断。');
      return;
    }

    if (speakingItemId === itemId) {
      if (!isDiagnosticSpeechPaused && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        setIsDiagnosticSpeechPaused(true);
        return;
      }

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsDiagnosticSpeechPaused(false);
        return;
      }

      diagnosticSpeechRunRef.current += 1;
      window.speechSynthesis.cancel();
      setSpeakingItemId(null);
      setIsDiagnosticSpeechPaused(false);
      return;
    }

    const runId = diagnosticSpeechRunRef.current + 1;
    diagnosticSpeechRunRef.current = runId;
    stopPracticeSpeech();
    const segments = splitDiagnosticSpeechSegments(text);
    const liveVoices = window.speechSynthesis.getVoices();
    const voiceAssignment = buildDiagnosticVoiceAssignment(liveVoices.length > 0 ? liveVoices : diagnosticVoices);
    if (liveVoices.length > diagnosticVoices.length) setDiagnosticVoices(liveVoices);
    let segmentIndex = 0;

    const speakNextSegment = () => {
      const segment = segments[segmentIndex];
      if (!segment) {
        setSpeakingItemId(null);
        setIsDiagnosticSpeechPaused(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(segment.text);
      const prosody = getDiagnosticProsody(segment.role);
      utterance.lang = 'en-US';
      utterance.rate = prosody.rate;
      utterance.pitch = prosody.pitch;
      utterance.volume = prosody.volume;
      utterance.voice = chooseDiagnosticVoice(voiceAssignment, segment.role);
      utterance.onend = () => {
        if (diagnosticSpeechRunRef.current !== runId) return;
        segmentIndex += 1;
        speakNextSegment();
      };
      utterance.onerror = () => {
        if (diagnosticSpeechRunRef.current !== runId) return;
        setSpeakingItemId(null);
        setIsDiagnosticSpeechPaused(false);
      };
      window.setTimeout(() => {
        if (diagnosticSpeechRunRef.current !== runId) return;
        window.speechSynthesis.speak(utterance);
      }, getDiagnosticSegmentDelayMs(segmentIndex));
    };

    setSpeakingItemId(itemId);
    setIsDiagnosticSpeechPaused(false);
    speakNextSegment();
  };

  const startDiagnosticRecording = async (itemId: string) => {
    setSaveError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setDiagnosticRecording(itemId, {
        status: 'unsupported',
        audioUrl: null,
        message: '当前浏览器不支持本地录音，请直接输入英文转写文本完成口语诊断。',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      activeRecordingItemIdRef.current = itemId;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const audioUrl = audioChunksRef.current.length > 0 ? URL.createObjectURL(blob) : null;
        if (audioUrl) diagnosticRecordingUrlsRef.current.push(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        activeRecordingItemIdRef.current = null;
        audioChunksRef.current = [];
        setDiagnosticRecording(itemId, {
          status: audioUrl ? 'ready' : 'idle',
          audioUrl,
          message: audioUrl
            ? '录音完成，可在当前页面回放；请把你刚才说的英文补全到下方文本框。'
            : '本次没有采集到有效音频，请重试或直接填写英文转写。',
        });
      };
      recorder.start();
      setDiagnosticRecording(itemId, {
        status: 'recording',
        audioUrl: null,
        message: '正在录音。结束后可回放检查，音频只保存在当前页面。',
      });
    } catch (error) {
      console.warn('Diagnostic speaking recording unavailable:', error);
      setDiagnosticRecording(itemId, {
        status: 'blocked',
        audioUrl: null,
        message: '麦克风授权未完成。你仍可输入英文转写文本完成口语诊断。',
      });
    }
  };

  const stopDiagnosticRecording = (itemId: string) => {
    if (activeRecordingItemIdRef.current !== itemId) return;
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  };

  const goBack = () => {
    setSaveError(null);
    diagnosticSpeechRunRef.current += 1;
    stopPracticeSpeech();
    setSpeakingItemId(null);
    setIsDiagnosticSpeechPaused(false);
    discardActiveDiagnosticRecording('录音已停止。回到诊断页后可以重新录音。');
    if (step === 1) {
      onDismiss();
      return;
    }
    setStep((current) => (current - 1) as 1 | 2 | 3 | 4);
  };

  const beginQuestions = () => {
    if (!selectedExamIsTrainable) {
      setSaveError('当前目标考试还没有开放诊断题库，请先选择 CET-4。');
      return;
    }
    if (diagnosticItems.length === 0) {
      const nextDiagnosticItems = createOnboardingDiagnosticItems({
        excludeItemIds: readPreviousDiagnosticItemIds(),
        shuffleOrder: true,
      });
      setDiagnosticItems(nextDiagnosticItems);
      setAnswers({});
      setDiagnosticRecordings({});
      revokeDiagnosticRecordingUrls();
      setReport(null);
      setAiReviewNotice(null);
      rememberDiagnosticItemIds(nextDiagnosticItems);
    }
    setStartedAt(new Date().toISOString());
    setStep(3);
  };

  const submitDiagnostic = async () => {
    if (!canSubmitDiagnostic) return;
    const baseReportInput = {
      answers,
      items: activeDiagnosticItems,
      examId: targetExamId,
      targetScore,
      dailyMinutes,
      startedAt,
    };
    let diagnosticReport = buildOnboardingDiagnosticReport(baseReportInput);
    setReport(diagnosticReport);
    setIsSaving(true);
    setSaveError(null);
    setAiReviewNotice(null);

    try {
      try {
        const aiReview = await evaluateDiagnosticSubjectiveAnswersWithAi({
          examId: targetExamId,
          items: activeDiagnosticItems,
          answers,
        });
        if (aiReview.usedFallback) {
          setAiReviewNotice('AI 复核暂不可用，已使用本地规则诊断保存。');
        } else if (Object.keys(aiReview.evaluations).length > 0) {
          diagnosticReport = buildOnboardingDiagnosticReport({
            ...baseReportInput,
            aiEvaluations: aiReview.evaluations,
          });
          setReport(diagnosticReport);
          setAiReviewNotice('主观题已完成 AI Rubric 复核；结果仅作训练建议，不写入正式画像。');
        }
      } catch (error) {
        console.warn('Diagnostic AI review unavailable, keeping rule-based diagnostic:', error);
        setAiReviewNotice('AI 复核暂不可用，已使用本地规则诊断保存。');
      }

      if (onCompleteDiagnostic) {
        await onCompleteDiagnostic({
          examId: targetExamId,
          targetScore,
          examDate: countdownDate,
          dailyMinutes,
          prioritySkills: diagnosticReport.weakestSkills as StudyGoal['prioritySkills'],
          skillProfiles: diagnosticReport.skillProfiles,
          diagnosticReport,
        });
      } else if (onSetScoreLimit) {
        onSetScoreLimit(targetScore);
      }
      setStep(4);
    } catch (error) {
      console.error('Failed to save diagnostic result:', error);
      setSaveError('诊断已经完成，但服务器尚未确认能力证据。请保持页面打开并重试一次。');
    } finally {
      setIsSaving(false);
    }
  };

  const renderSpeakingRecorder = (item: Extract<DiagnosticItem, { kind: 'text' }>) => {
    const recording = diagnosticRecordings[item.id] ?? defaultDiagnosticRecordingState;
    const isRecording = recording.status === 'recording';

    return (
      <div
        className="mt-4 rounded-2xl border border-[#cfe6f2] bg-[#f7fbff] p-4"
        data-testid={`diagnostic-speaking-recorder-${item.id}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-black text-[#003178]">
              <Mic className="h-4 w-4" />
              口语录音
            </div>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{recording.message}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isRecording) stopDiagnosticRecording(item.id);
              else void startDiagnosticRecording(item.id);
            }}
            data-testid={isRecording ? 'diagnostic-speaking-stop-recording' : 'diagnostic-speaking-start-recording'}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black shadow-sm transition ${
              isRecording
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-[#003178] text-white hover:bg-[#0d47a1]'
            }`}
          >
            <Mic className="h-4 w-4" />
            {isRecording ? '停止录音' : recording.audioUrl ? '重新录音' : '开始录音'}
          </button>
        </div>
        {recording.audioUrl ? (
          <audio
            className="mt-3 w-full"
            controls
            data-testid="diagnostic-speaking-audio"
            src={recording.audioUrl}
          />
        ) : null}
        <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">
          录音不会直接进入评分；当前诊断评分读取下方英文转写，所以请把实际口述内容转写或校正后再提交。
        </p>
      </div>
    );
  };

  return (
    <main className="app-page-surface ui-page">
      <div className="ui-page-content flex w-full flex-col gap-4">
        <div className="ui-page-header flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#003178] shadow-xs transition hover:border-[#003178]"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 1 ? '返回今日训练' : '上一步'}
          </button>
          <div className="flex items-center justify-center gap-2 text-xs font-black text-slate-500">
            {[1, 2, 3, 4].map((item) => (
              <span
                key={item}
                className={`h-2.5 rounded-full transition-all ${step >= item ? 'w-8 bg-[#003178]' : 'w-2.5 bg-slate-200'}`}
                aria-label={`第 ${item} 步`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-500 shadow-xs transition hover:border-rose-200 hover:text-rose-600"
          >
            <X className="h-4 w-4" />
            退出诊断
          </button>
        </div>

        {step === 1 && (
          <section className="flex min-h-[calc(100svh-160px)] items-center justify-center">
            <div className="ui-panel w-full max-w-3xl sm:p-8">
              <div className="ui-page-eyebrow mb-5">
                <GraduationCap className="h-4 w-4" />
                3 分钟启动
              </div>
              <h1 className="text-3xl font-black leading-tight text-[#071e27] sm:text-5xl">
                入门诊断：先得到今天该做什么
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
                设置目标，完成 {ONBOARDING_DIAGNOSTIC_EXPECTED_ITEM_COUNT} 个小任务，生成今日计划。
              </p>
              <div data-testid="onboarding-three-minute-start" className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ['1', '选目标考试', '当前完整闭环先开放 CET-4'],
                  ['2', '设目标分和时间', '让计划匹配真实投入'],
                  ['3', '完成小诊断', '直接回到今日教练'],
                ].map(([stepNo, title, body]) => (
                  <div key={stepNo} className="rounded-2xl border border-[#dde5ee] bg-[#f8fafc] p-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#003178] text-xs font-black text-white">
                      {stepNo}
                    </div>
                    <div className="mt-3 text-sm font-black text-[#003178]">{title}</div>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-3xl border border-[#cfe6f2] bg-[#f7fbff] p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-sm font-black text-[#003178]" htmlFor="diagnostic-exam-select">
                    目标考试
                  </label>
                  <span className="text-xs font-bold leading-5 text-slate-500">
                    当前完整训练闭环先开放 CET-4。
                  </span>
                </div>
                <SelectField
                  ariaLabel="先选择目标考试"
                  testId="diagnostic-exam-select"
                  className="mt-3"
                  value={targetExamId}
                  onChange={setTargetExamId}
                  options={examOptions.map((exam) => ({
                    value: exam.id,
                    label: `${exam.name}${exam.routeAvailability === 'trainable' ? ' · 已开放诊断题库' : ' · 题库建设中'}`,
                    disabled: exam.routeAvailability !== 'trainable',
                  }))}
                />
              </div>
              <details className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-600">
                <summary className="cursor-pointer text-xs font-black text-[#003178]">查看诊断规则</summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {[
                    `${selectedExamName} 题库`,
                    '客观题足够才写入画像',
                    '主观题只做复核样本',
                    '答后才显示中文辅助',
                  ].map((item) => (
                    <div key={item} className="flex gap-2 rounded-2xl bg-white px-3 py-2 font-bold text-slate-700">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </details>
              <button
                type="button"
                onClick={() => {
                  setDiagnosticItems([]);
                  setAnswers({});
                  setReport(null);
                  setStep(2);
                }}
                disabled={!selectedExamIsTrainable}
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1b6d24] px-6 text-sm font-black text-white shadow-md transition enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
              >
                <Play className="h-4 w-4 fill-white" />
                开始诊断
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="ui-panel sm:p-8">
              <h2 className="flex items-center gap-2 text-2xl font-black text-[#003178]">
                <Target className="h-6 w-6" />
                学习目标设置
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                设定目标分、日期和每日时间，然后进入诊断。
              </p>

              <div className="mt-6 space-y-7">
                <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-[#cfe6f2] bg-[#f7fbff] px-4 py-3 text-sm font-black text-[#003178]">
                  <span>目标考试</span>
                  <span className="rounded-full bg-white px-3 py-1">{selectedExamName}</span>
                  <span className="text-xs text-slate-500">切换考试需返回上一步</span>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-black text-slate-700">目标分数</label>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <input
                      type="range"
                      aria-label="目标分数"
                      min="425"
                      max="710"
                      step="5"
                      value={targetScore}
                      onChange={(event) => setTargetScore(Number(event.target.value))}
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[#dbf1fe] accent-[#003178]"
                    />
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3 text-3xl font-black text-[#003178]">
                      {targetScore}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-xs font-bold text-slate-400">
                    <span>425 过线</span>
                    <span>550 稳妥</span>
                    <span>710 满分</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                      <Calendar className="h-4 w-4" />
                      考试日期
                    </label>
                    <DateField ariaLabel="考试日期" value={countdownDate} onChange={setCountdownDate} />
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-[#dbf1fe] p-4">
                    <div className="text-xs font-black text-[#003178]">距离目标</div>
                    <div className="mt-1 text-3xl font-black text-[#003178]">{daysRemaining} 天</div>
                  </div>
                </div>

                <div>
                  <label className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                    <Clock className="h-4 w-4" />
                    每日可投入时间
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[30, 45, 60, 90].map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setDailyMinutes(minutes)}
                        className={`min-h-12 rounded-2xl border px-3 text-sm font-black transition ${
                          dailyMinutes === minutes
                            ? 'border-[#003178] bg-[#003178] text-white shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#003178] hover:text-[#003178]'
                        }`}
                      >
                        {minutes} 分钟
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-[#071e27]">准备开始</h3>
              <div className="mt-3 rounded-2xl bg-[#eef7fc] px-4 py-3 text-sm font-black text-[#003178]">
                当前题库：{selectedExamName}
              </div>
              <button
                type="button"
                onClick={beginQuestions}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#003178] px-5 text-sm font-black text-white shadow-md transition hover:bg-[#0d47a1]"
              >
                进入真实诊断
                <ChevronRight className="h-4 w-4" />
              </button>
              <details className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-600">
                <summary className="cursor-pointer text-xs font-black text-[#003178]">查看今日时间分配</summary>
                <div className="mt-3 space-y-2">
                  {[
                    ['入门诊断', diagnosticMinutes, 'bg-blue-600'],
                    ['弱项专项', practiceMinutes, 'bg-emerald-600'],
                    ['错因复习', reviewMinutes, 'bg-amber-500'],
                  ].map(([label, minutes, color]) => (
                    <div key={String(label)} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 font-black text-slate-600">
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                        {label}
                      </span>
                      <span className="text-[#003178]">{minutes} 分钟</span>
                    </div>
                  ))}
                </div>
              </details>
            </aside>
          </section>
        )}

        {step === 3 && (
          <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                      <h2 className="text-2xl font-black text-[#003178]">真实小题诊断</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        当前目标：{selectedExamName}。完成后先确认客观基线，主观题只决定后续复核方向。
                      </p>
                      <details className="mt-3 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-xs font-semibold leading-6 text-slate-600">
                        <summary className="cursor-pointer text-xs font-black text-[#003178]">查看本次评分规则</summary>
                        <p className="mt-2">阅读、听力、词汇、语法会各抽 2 道客观题聚合判定；只有题数足够时才写入正式能力画像。</p>
                        <p className="mt-2">翻译、写作、口语当前只采集 1 次主观样本，用来决定专项训练顺序，不直接计入总分或定级。</p>
                        <p className="mt-2">结果页会明确区分“已确认客观基线”和“主观题待复核”，避免把单次主观作答包装成确定结论。</p>
                      </details>
                  </div>
                  <div className="rounded-2xl bg-[#003178]/10 px-4 py-2 text-sm font-black text-[#003178]">
                    {answeredCount}/{activeDiagnosticItems.length} 已完成
                  </div>
                </div>
              </div>

              {activeDiagnosticItems.map((item, index) => (
                <article key={item.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {skillIcons[item.skillArea]}
                        {index + 1}. {skillLabels[item.skillArea]} · {item.title}
                      </div>
                      <h3 className="text-lg font-black text-[#071e27]">{item.contextLabel}</h3>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-[#003178]">
                      {item.kind === 'single-choice' ? '客观题' : '产出题'}
                    </span>
                  </div>

                  {item.skillArea === 'listening' ? (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-black text-[#003178]">听力材料</div>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
                            先听后答；听不清可展开转写。
                          </p>
                          <p
                            className="mt-1 text-[11px] font-bold leading-5 text-slate-500"
                            data-testid="diagnostic-listening-voice-status"
                          >
                            {diagnosticVoiceAssignment.note}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakDiagnosticContext(item.id, item.context)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#003178] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0d47a1]"
                        >
                          <Volume2 className="h-4 w-4" />
                          {speakingItemId === item.id
                            ? isDiagnosticSpeechPaused
                              ? '继续男女声听力材料'
                              : '暂停男女声听力材料'
                            : '播放男女声听力材料'}
                        </button>
                      </div>
                      <details className="mt-3 rounded-2xl border border-sky-100 bg-white p-3 text-sm font-semibold leading-7 text-slate-600">
                        <summary className="cursor-pointer text-xs font-black text-[#003178]">听不清时查看听力转写</summary>
                        <p className="mt-2">{item.context}</p>
                      </details>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                      {item.context}
                    </div>
                  )}
                  <p className="mt-4 text-sm font-black text-[#071e27]">{item.prompt}</p>

                  {item.kind === 'single-choice' ? (
                    <div className="mt-4 grid gap-2">
                      {item.options.map((option) => {
                        const selected = answers[item.id] === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setAnswer(item.id, option.id)}
                            className={`min-h-12 rounded-2xl border px-4 text-left text-sm font-bold transition ${
                              selected
                                ? 'border-[#003178] bg-[#003178] text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-[#003178] hover:text-[#003178]'
                            }`}
                          >
                            <span className="block">{option.id}. {option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      {item.skillArea === 'speaking' ? renderSpeakingRecorder(item) : null}
                      <textarea
                        aria-label={`${item.title}作答`}
                        value={answers[item.id] ?? ''}
                        onChange={(event) => setAnswer(item.id, event.target.value)}
                        placeholder={item.placeholder}
                        className="mt-4 min-h-36 w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-7 text-slate-700 outline-none transition focus:border-[#003178] focus:ring-2 focus:ring-[#003178]/10"
                      />
                    </>
                  )}
                </article>
              ))}
            </div>

            <aside className="h-fit rounded-[2rem] border border-[#cfe6f2] bg-white p-5 shadow-sm lg:sticky lg:top-6">
              <h3 className="text-lg font-black text-[#071e27]">诊断提交前检查</h3>
              <div className="mt-4 space-y-3">
                {activeDiagnosticItems.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs font-black text-[#003178]">{skillLabels[item.skillArea]} · {item.title}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{getAnswerPreview(answers[item.id])}</div>
                  </div>
                ))}
              </div>
              {saveError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  {saveError}
                </div>
              ) : null}
              {unansweredCount > 0 ? (
                <div
                  className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800"
                  data-testid="diagnostic-unanswered-warning"
                >
                  还有 {unansweredCount} 题未作答，可直接提交；未作答题不会计入本次有效作答、能力画像或复习队列。
                </div>
              ) : null}
              <button
                type="button"
                disabled={!canSubmitDiagnostic}
                onClick={submitDiagnostic}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1b6d24] px-5 text-sm font-black text-white shadow-md transition enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? '正在规则评分与 AI 复核...' : '提交诊断并生成基线'}
                <CheckCircle className="h-4 w-4" />
              </button>
            </aside>
          </section>
        )}

        {step === 4 && report && (
          <DiagnosticResultPanel
            activeDiagnosticItems={activeDiagnosticItems}
            aiReviewNotice={aiReviewNotice}
            answers={answers}
            onDismiss={onDismiss}
            report={report}
            skillLabels={skillLabels}
          />
        )}
      </div>
    </main>
  );
}
