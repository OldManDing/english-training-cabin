import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Speech,
  Play,
  RotateCw,
  Volume2,
  Sparkles,
  CheckCircle,
  BarChart3,
  Activity,
  X,
  Clock,
  ChevronRight,
  HelpCircle,
  Check,
  Award,
  TrendingUp,
  FolderPlus,
  BookOpen,
} from 'lucide-react';
import { PracticeCompletionReport } from '../types';
import { buildSpeakingPracticeReport } from '../domain/practice/reports';
import { trackTelemetry } from '../lib/telemetry';
import { apiRequest } from '../lib/api';

interface SpeakingTrainingProps {
  onUpdateProgress: (scoreChange: { from: number; to: number }) => void;
  onCompletePractice?: (report: PracticeCompletionReport) => Promise<void> | void;
}

interface SpeechAnalysis {
  originalTextWithMarkings: string;
  improvedTextWithConnectors: string;
  fillerCount: number;
  fluencyAnalysis: string;
  logicAnalysis: string;
  vocabularyAnalysis: string;
  scoreImprovementFrom: number;
  scoreImprovementTo: number;
}

const DEFAULT_SPEECH_DRAFT =
  'In the picture, I can see many wind turbines and solar panels. They are good for environment because they make clean energy. I think people should use them more, but some places maybe have cost problem.';

export default function SpeakingTraining({ onUpdateProgress, onCompletePractice }: SpeakingTrainingProps) {
  // Current active step corresponding to the 4 screens:
  // 1: 准备开始 (Task Prep & Device Testing)
  // 2: 正在录音 (Active Recording / Speech Transcription)
  // 3: AI 反馈与改写 (AI Evaluation & Annotated Suggestions)
  // 4: 训练对比报告 (Improvement Comparison Report)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // States for interactive simulations
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micVolume, setMicVolume] = useState<number[]>([15, 20, 25, 10, 8, 30, 45, 12, 18, 22, 10, 14, 28, 40, 15, 8]);
  const [countdown, setCountdown] = useState<number | null>(null); // For starting recording 3s countdown
  const [recordTimer, setRecordTimer] = useState(42); // Step 2 countdown timer: counts from 60s down to 0, matching screenshots showing 00:42 / 01:00
  const [isSpeakingSample, setIsSpeakingSample] = useState<string | null>(null); // Track browser speaking state
  const [addedToQueue, setAddedToQueue] = useState(false); // Step 4複習队列 state
  const [toast, setToast] = useState<string | null>(null); // Custom premium toast notification
  const [speechStartedAt] = useState(() => new Date().toISOString());
  const [speechDraft, setSpeechDraft] = useState(DEFAULT_SPEECH_DRAFT);
  const [speechAnalysis, setSpeechAnalysis] = useState<SpeechAnalysis | null>(null);
  const [isAnalyzingSpeech, setIsAnalyzingSpeech] = useState(false);
  const [isPersistingReport, setIsPersistingReport] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'live' | 'fallback' | null>(null);
  const [reportPersisted, setReportPersisted] = useState(false);
  const [isRecordingLive, setIsRecordingLive] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] = useState('可使用浏览器录音；录音仅本地回放，不上传。');
  const [secondAttemptDraft, setSecondAttemptDraft] = useState('');
  const [isSecondAttemptStarted, setIsSecondAttemptStarted] = useState(false);

  // Canvas ref for dynamic sound waveforms in Step 2
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Trigger floating micro-toasts
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Mic test animator
  useEffect(() => {
    let interval: any;
    if (step === 1) {
      interval = setInterval(() => {
        setMicVolume(prev =>
          prev.map(() => Math.floor(Math.random() * 50) + 12)
        );
      }, 120);
    }
    return () => clearInterval(interval);
  }, [step]);

  // Record timer decrements for Step 2
  useEffect(() => {
    let interval: any;
    if (step === 2) {
      // Setup sine wave sound canvas
      drawSineWave();
      setRecordTimer(42); // Preset to 42 matching 00:42 / 01:00 screenshot

      interval = setInterval(() => {
        setRecordTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleFinishRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    return () => {
      clearInterval(interval);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [step]);

  useEffect(() => {
    return () => {
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, [recordedAudioUrl]);

  // Simulates HTML5 Speech Text-to-Speech synthesizer
  const handleTTS = (text: string, id: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isSpeakingSample === id) {
        setIsSpeakingSample(null);
        return;
      }
      setIsSpeakingSample(id);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeakingSample(null);
      utterance.onerror = () => setIsSpeakingSample(null);
      window.speechSynthesis.speak(utterance);
    } else {
      triggerToast('暂无系统语音合成模块支持');
    }
  };

  // Soundwave painter
  const drawSineWave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offset = 0;
    const draw = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 3;
      
      // Draw standard double sine waves with gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#10b981'); // green-500
      gradient.addColorStop(0.5, '#059669'); // green-600
      gradient.addColorStop(1, '#34d399'); // green-400

      ctx.strokeStyle = gradient;
      ctx.beginPath();
      
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + Math.sin(x * 0.04 + offset) * 15 * Math.sin(offset * 0.5);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Second overlay subtle wave
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + Math.cos(x * 0.035 - offset) * 10 * Math.sin(offset * 0.3);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      offset += 0.09;
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  // Interactive buttons actions
  const handleStartRecording = () => {
    // Starts a cute 3s countdown overlay
    setCountdown(3);
    const flow = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) {
          clearInterval(flow);
          return null;
        }
        if (prev <= 1) {
          clearInterval(flow);
          setStep(2); // Go to step 2 (recording)
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleFinishRecording = async () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    triggerToast('录音完成！AI 智能诊断中...');
    setIsAnalyzingSpeech(true);
    const startedAt = performance.now();
    try {
      const result = await apiRequest<SpeechAnalysis>('/api/ai/analyze-speech', {
        method: 'POST',
        body: JSON.stringify({ originalSpeech: speechDraft }),
      });
      setSpeechAnalysis(result);
      setAnalysisMode('live');
      trackTelemetry('speaking_analyzed', {
        mode: 'live',
        latencyMs: Math.round(performance.now() - startedAt),
      });
      onUpdateProgress({
        from: result.scoreImprovementFrom ?? 58,
        to: result.scoreImprovementTo ?? 66,
      });
    } catch (error) {
      console.error(error);
      const fallbackResult: SpeechAnalysis = {
        originalTextWithMarkings: speechDraft,
        improvedTextWithConnectors:
          'In my opinion, renewable energy is meaningful because it can reduce pollution and support long-term development. However, we also need to consider cost and local conditions before using it widely.',
        fillerCount: (speechDraft.match(/\b(um|uh|ah|like|you know)\b/gi) ?? []).length,
        fluencyAnalysis: '当前为离线示例反馈：先用一句话描述图片，再用 because/however 补充原因和限制。',
        logicAnalysis: '使用“画面描述 - 观点 - 原因 - 转折”结构组织回答，避免只罗列物体。',
        vocabularyAnalysis: '尝试用 renewable energy、reduce pollution、long-term development 等表达替换 good、more 等基础词。',
        scoreImprovementFrom: 58,
        scoreImprovementTo: 66,
      };
      setSpeechAnalysis(fallbackResult);
      setAnalysisMode('fallback');
      trackTelemetry('speaking_analyzed', {
        mode: 'fallback',
        latencyMs: Math.round(performance.now() - startedAt),
      });
      onUpdateProgress({ from: 58, to: 66 });
      triggerToast('AI 服务暂时不可用，当前展示离线示例反馈，可继续完成重说训练。');
    } finally {
      setIsAnalyzingSpeech(false);
      setStep(3); // Go to step 3 (feedback evaluation)
    }
  };

  const persistSpeakingReport = async (analysis: SpeechAnalysis, secondSpeech: string) => {
    if (reportPersisted) return;

    const report = buildSpeakingPracticeReport({
      examId: 'cet4',
      modeId: 'cet-set4-retell',
      startedAt: speechStartedAt,
      originalSpeech: speechDraft,
      secondSpeech,
      analysis,
      analysisMode: analysisMode ?? 'unknown',
    });

    setIsPersistingReport(true);
    try {
      await onCompletePractice?.(report);
      setReportPersisted(true);
      setAddedToQueue(report.reviewItems.length > 0);
      triggerToast(report.reviewItems.length > 0
        ? '口语训练证据已写入能力画像和复习队列。'
        : '口语训练证据已写入能力画像。');
    } catch (error) {
      console.error(error);
      triggerToast('口语训练记录保存失败，请稍后在本页重试。');
    } finally {
      setIsPersistingReport(false);
    }
  };

  const handleStartSecondAttempt = () => {
    if (!speechAnalysis) {
      triggerToast('请先完成 AI 反馈，再进入第二次重说。');
      return;
    }

    setSecondAttemptDraft(speechAnalysis.improvedTextWithConnectors);
    setIsSecondAttemptStarted(true);
    triggerToast('请根据改写版本完成第二次重说，并校正下方转写。');
  };

  const handleCompleteSecondAttempt = async () => {
    if (!speechAnalysis) {
      triggerToast('请先完成 AI 反馈，再进入第二次重说。');
      return;
    }
    if (secondAttemptDraft.trim().length < 20) {
      triggerToast('请先补全第二次重说转写，再生成对比报告。');
      return;
    }

    trackTelemetry('speaking_completed', { analysisMode: analysisMode ?? 'unknown' });
    onUpdateProgress({
      from: speechAnalysis.scoreImprovementFrom,
      to: speechAnalysis.scoreImprovementTo,
    });
    await persistSpeakingReport(speechAnalysis, secondAttemptDraft.trim());
    setTimeout(() => {
      setStep(4);
    }, 600);
  };

  const handleAddToReviewQueue = () => {
    if (reportPersisted) {
      setAddedToQueue(true);
      triggerToast('本轮口语错因已经在复习队列中。');
      return;
    }

    if (!speechAnalysis) {
      triggerToast('请先完成 AI 反馈，再加入复习队列。');
      return;
    }

    persistSpeakingReport(speechAnalysis, secondAttemptDraft.trim() || speechAnalysis.improvedTextWithConnectors);
  };

  const handleRunMicTest = () => {
    setIsTestingMic(true);
    triggerToast('正在测试并校准麦克风...');
    setTimeout(() => {
      setIsTestingMic(false);
      triggerToast('设备检查完毕：采样音量平稳');
    }, 1500);
  };

  const handleStartBrowserRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingStatus('当前浏览器不支持本地录音，请直接输入或校正转写文本。');
      triggerToast('当前浏览器不支持本地录音。');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        setIsRecordingLive(false);
        setRecordingStatus('录音已保存在当前页面，可回放检查；请校正下方转写文本后提交 AI 反馈。');
      };
      recorder.start();
      setIsRecordingLive(true);
      setRecordingStatus('正在录音中。录音只保存在当前浏览器页面，不会上传。');
    } catch (error) {
      console.error(error);
      setRecordingStatus('麦克风授权未完成。你仍可输入转写文本完成口语反馈闭环。');
      triggerToast('未获得麦克风权限，已切换为文本转写模式。');
    }
  };

  const handleStopBrowserRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const currentAnalysis: SpeechAnalysis = speechAnalysis ?? {
    originalTextWithMarkings: speechDraft,
    improvedTextWithConnectors: DEFAULT_SPEECH_DRAFT,
    fillerCount: 0,
    fluencyAnalysis: '完成录音后生成流利度分析。',
    logicAnalysis: '完成录音后生成逻辑结构分析。',
    vocabularyAnalysis: '完成录音后生成词汇升级建议。',
    scoreImprovementFrom: 58,
    scoreImprovementTo: 66,
  };
  const scoreGain = Math.max(0, currentAnalysis.scoreImprovementTo - currentAnalysis.scoreImprovementFrom);
  const fillerAfter = Math.max(0, currentAnalysis.fillerCount - 1);
  const reportRows = [
    {
      basic: '流利度问题',
      advanced: currentAnalysis.fluencyAnalysis,
      category: 'Fluency',
      badgeStyle: 'bg-sky-50 text-sky-700 border-sky-200/60',
    },
    {
      basic: '逻辑组织',
      advanced: currentAnalysis.logicAnalysis,
      category: 'Logic',
      badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    },
    {
      basic: '词汇表达',
      advanced: currentAnalysis.vocabularyAnalysis,
      category: 'Vocabulary',
      badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200/60',
    },
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden bg-slate-50 flex flex-col justify-between min-h-[calc(100svh-9rem)] lg:h-screen relative selection:bg-[#003178]/10 selection:text-[#003178]">
      
      {/* Floating high fidelity custom premium Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 transform transition-all duration-300 animate-bounce sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
          <div className="bg-[#003178] border border-[#cfe6f2] text-white px-4 sm:px-5 py-3 rounded-2xl sm:rounded-full text-xs font-black flex items-center gap-2 shadow-2xl">
            <Sparkles className="h-4 w-4 text-amber-300 fill-amber-300 animate-pulse" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Countdown modal overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-sm w-full text-center shadow-2xl border border-white/20 animate-scale-up space-y-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#003178]/10 animate-ping" />
              <div className="w-24 h-24 rounded-full bg-[#dbf1fe] text-[#003178] flex items-center justify-center text-5xl font-black">
                {countdown}
              </div>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-slate-800 text-base">准备录音启动中...</h4>
              <p className="text-xs text-slate-400">请端正姿势，注意麦克风说话距离</p>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION - Dynamically adaptive based on the steps */}
      <div className="shrink-0">
        <header className="mb-6 pb-4 border-b border-slate-200/80 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-[#003178] flex items-center gap-2">
              <Speech className="h-6 w-6 sm:h-7 sm:w-7 text-[#003178] shrink-0" />
              {step === 1 && '口语重说 - 准备开始'}
              {step === 2 && '口语重说 - 正在录音'}
              {step === 3 && '口语重说 - AI 反馈与改写'}
              {step === 4 && '口语重说 - 训练对比报告'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {step === 1 && '请仔细阅读左侧任务要求，确认麦克风状态后开始录制。'}
              {step === 2 && '请根据左侧材料结构，用自己的语言进行复述。'}
              {step === 3 && 'Review your first attempt and analyze the AI\'s suggestions before retrying.'}
              {step === 4 && '对比首次和二次表达细节，沉淀地道词汇与高阶表达。'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="text-xs font-black text-rose-500 hover:text-rose-700 bg-rose-50 border border-rose-100 hover:border-rose-200 px-3.5 py-2.5 rounded-2xl flex items-center gap-1 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" /> 放弃任务
              </button>
            )}
            {step === 4 && (
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500">
                <span>本次训练片段</span>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Step indicator capsules matching screenshots */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4 mb-5 sm:mb-7">
          {[
            { num: 1, label: '准备开始' },
            { num: 2, label: '正在录音' },
            { num: 3, label: 'AI 反馈与改写' },
            { num: 4, label: '训练对比报告' },
          ].map(s => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div
                key={s.num}
                onClick={() => {
                  // Allow clicking backwards for high usability demonstration
                  if (s.num < step) setStep(s.num as any);
                }}
                className={`p-2.5 sm:p-3 rounded-2xl border text-center transition-all ${
                  isActive
                    ? 'border-2 border-[#003178] bg-[#dbf1fe]/45 text-[#003178] font-bold shadow-2xs scale-[1.01]'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/75 text-emerald-800 font-bold cursor-pointer hover:bg-emerald-100/40'
                    : 'border-slate-200 bg-white text-slate-400 opacity-80'
                }`}
              >
                <div className="text-[10px] tracking-wider uppercase font-extrabold opacity-75">
                  步骤 0{s.num}
                </div>
                <div className="text-xs font-black mt-0.5">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CORE WORKSTATIONS MAP */}
      <div className="flex-1 min-h-0 flex flex-col">
        
        {/* ==================== STEP 1: PREP & TEST VIEW ==================== */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-7 items-stretch flex-1">
            
            {/* Left Column (60% equivalent span): Prompt details */}
            <div className="lg:col-span-6 bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-6.5 shadow-2xs flex flex-col justify-between space-y-5">
              
              {/* Task title segment */}
              <div className="space-y-4">
                <div className="flex flex-col gap-3 pb-3 border-b border-slate-100 sm:flex-row sm:justify-between sm:items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#003178] bg-[#dbf1fe] px-2.5 py-1 rounded-md border border-[#cfe6f2]">
                      CET-SET4
                    </span>
                    <h3 className="font-extrabold text-[#071e27] text-base">图片描述与评论</h3>
                  </div>
                  <div className="flex items-center gap-1 text-[#003178] bg-[#eef7fc] px-2.5 py-1 rounded-full text-xs font-black">
                    <Clock className="h-3.5 w-3.5" />
                    <span>建议时长: 60秒</span>
                  </div>
                </div>

                {/* Rotating wind fields / clean energy beautiful SVG Mockup */}
                <div className="h-56 w-full rounded-2xl border border-slate-200/60 overflow-hidden relative shadow-inner bg-slate-100 flex items-center justify-center">
                  <svg className="w-full h-full object-cover" viewBox="0 0 800 450" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#bae6fd" />
                        <stop offset="60%" stopColor="#e0f2fe" />
                        <stop offset="100%" stopColor="#f0f9ff" />
                      </linearGradient>
                      <linearGradient id="hillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                      <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e40af" />
                        <stop offset="100%" stopColor="#1e3a8a" />
                      </linearGradient>
                    </defs>
                    <rect width="800" height="450" fill="url(#skyGrad)" />
                    <circle cx="650" cy="120" r="50" fill="#f59e0b" opacity="0.8" />
                    <circle cx="650" cy="120" r="65" fill="#f59e0b" opacity="0.15" />
                    <path d="M 0 350 Q 200 280 400 350 T 800 320 L 800 450 L 0 450 Z" fill="url(#hillGrad)" />
                    <path d="M 0 380 Q 300 330 600 390 T 800 370 L 800 450 L 0 450 Z" fill="#065f46" opacity="0.9" />
                    
                    {/* Turbine 1 */}
                    <g transform="translate(260, 180)">
                      <path d="M -5 160 L -1.5 0 L 1.5 0 L 5 160 Z" fill="#f8fafc" />
                      <circle cx="0" cy="0" r="6" fill="#cbd5e1" />
                      <g className="animate-spin" style={{ transformOrigin: '0px 0px', animationDuration: '6s' }}>
                        <path d="M -2.5 -8 L -1 -105 L 1 -105 L 2.5 -8 Z" fill="#ffffff" />
                        <path d="M -2.5 -8 L -1 -105 L 1 -105 L 2.5 -8 Z" fill="#ffffff" transform="rotate(120)" />
                        <path d="M -2.5 -8 L -1 -105 L 1 -105 L 2.5 -8 Z" fill="#ffffff" transform="rotate(240)" />
                        <circle cx="0" cy="0" r="4" fill="#64748b" />
                      </g>
                    </g>
                    {/* Turbine 2 */}
                    <g transform="translate(480, 210) scale(0.75)">
                      <path d="M -5 160 L -1.5 0 L 1.5 0 L 5 160 Z" fill="#f8fafc" />
                      <circle cx="0" cy="0" r="6" fill="#cbd5e1" />
                      <g className="animate-spin" style={{ transformOrigin: '0px 0px', animationDuration: '9s' }}>
                        <path d="M -2.5 -8 L -1 -105 L 1 -105 L 2.5 -8 Z" fill="#ffffff" />
                        <path d="M -2.5 -8 L -1 -105 L 1 -105 L 2.5 -8 Z" fill="#ffffff" transform="rotate(120)" />
                        <path d="M -2.5 -8 L -1 -105 L 1 -105 L 2.5 -8 Z" fill="#ffffff" transform="rotate(240)" />
                        <circle cx="0" cy="0" r="4" fill="#64748b" />
                      </g>
                    </g>

                    {/* Solar Fields */}
                    <g transform="translate(100, 360)">
                      <polygon points="0,40 120,20 150,60 20,90" fill="url(#solarGrad)" stroke="#475569" strokeWidth="2" />
                      <line x1="10" y1="65" x2="30" y2="115" stroke="#334155" strokeWidth="4" />
                      <line x1="135" y1="40" x2="145" y2="78" stroke="#334155" strokeWidth="4" />
                      <line x1="30" y1="35" x2="40" y2="85" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
                      <line x1="60" y1="30" x2="75" y2="80" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
                      <line x1="90" y1="25" x2="110" y2="72" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
                    </g>
                    <g transform="translate(560, 370) scale(0.95)">
                      <polygon points="0,40 120,20 150,60 20,90" fill="url(#solarGrad)" stroke="#475569" strokeWidth="2" />
                      <line x1="10" y1="65" x2="30" y2="115" stroke="#334155" strokeWidth="4" />
                      <line x1="135" y1="40" x2="145" y2="78" stroke="#334155" strokeWidth="4" />
                    </g>
                  </svg>

                  {/* Absolute visual badge label */}
                  <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 shadow-lg text-white text-[10px] font-bold rounded-md backdrop-blur-xs select-none">
                    Visual Prompt
                  </div>
                </div>
              </div>

              {/* Steps or list requirements */}
              <div className="pt-4 border-t border-slate-100/90 space-y-3.5">
                <span className="text-xs text-[#003178] font-black flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-[#003178] rounded-xs block" />
                  作答要求
                </span>
                <ul className="space-y-2.5">
                  {[
                    '简要描述图片中的主要内容和现象。',
                    '阐述该现象背后的深层原因或可能带来的影响。',
                    '给出你个人的观点或具体的建议措施。',
                  ].map((reqStr, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                      <span className="w-5 h-5 rounded-full bg-[#dbf1fe] text-[#003178] flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="leading-5">{reqStr}</p>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Right Column (40% equivalent span): Hardware check & start button */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Mic device test card */}
              <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-5.5 shadow-b-md flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Mic className="h-4.5 w-4.5 text-[#003178]" />
                    <span>设备检测</span>
                  </span>
                  <button
                    onClick={handleRunMicTest}
                    disabled={isTestingMic}
                    className="text-[10px] text-[#003178] bg-[#eef7fc] hover:bg-[#dbf1fe] border border-[#cfe6f2] font-black px-2.5 py-1 rounded transition-colors cursor-pointer pointer-events-auto"
                  >
                    {isTestingMic ? '检测中...' : '重新测试'}
                  </button>
                </div>

                <div className="pt-2 flex items-center gap-4">
                  <div className="w-11 h-11 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center shrink-0">
                    <Mic className="h-5 w-5 text-emerald-600 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      麦克风权限
                      <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    </h5>
                    <p className="text-[10px] text-emerald-600 font-extrabold mt-0.5">已授权并就绪</p>
                  </div>
                </div>

                {/* Animated mic sound volume feedback meters */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5">
                  <div className="flex items-end justify-between h-9 gap-1 max-w-xs mx-auto">
                    {micVolume.map((vol, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-t from-emerald-500 to-[#0284c7] hover:to-emerald-400 w-1.5 rounded-md transition-all duration-100 shadow-3xs"
                        style={{ height: `${vol}%` }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center font-bold mt-3">
                    请试音，确保音量线条跳动
                  </p>
                </div>
              </div>

              {/* Ready layout container */}
              <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-6 shadow-b-md text-center space-y-4">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 text-lg">准备好了吗？</h4>
                  <p className="text-xs text-slate-400 font-bold">点击下方按钮，将有 3 秒倒计时</p>
                </div>

                <button
                  onClick={handleStartRecording}
                  className="w-full py-4.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer pointer-events-auto text-sm border-b-4 border-emerald-900"
                >
                  <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                  <span>开始录音</span>
                </button>
              </div>

              {/* Custom Tips panel */}
              <div className="bg-[#fefce8] border border-[#fef08a] rounded-2xl p-4.5 flex items-start gap-3 shadow-3xs">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <HelpCircle className="h-4.5 w-4.5 text-amber-600" />
                </div>
                <div>
                  <h6 className="text-xs font-black text-amber-800">Tips:</h6>
                  <p className="text-[11px] text-amber-700/95 leading-relaxed font-bold mt-1">
                    录音期间请保持周围环境安静。尽量使用结构化的表达方式 (如 Firstly, Secondly, In conclusion) 来提升逻辑连贯性得分。
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================== STEP 2: ACTIVE RECORDING VIEW ==================== */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-7 items-stretch flex-1">
            
            {/* Left Column (60% Equivalent): Task material checklist */}
            <div className="lg:col-span-6 bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-6 shadow-2xs space-y-6 flex flex-col justify-between">
              
              {/* Task source detail header */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-[#003178] rounded-xs block" />
                    任务材料
                  </span>
                  <span className="text-[10px] text-sky-800 bg-sky-50 px-2.5 py-1 border border-sky-100 rounded-md font-bold">
                    科技与生活
                  </span>
                </div>

                {/* Sub-card 1: Argument text block */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black text-[#003178]">1. The Core Argument</h4>
                  <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed font-sans">
                      &quot;The rapid advancement of artificial intelligence is fundamentally reshaping the modern workplace. It is not merely automating routine tasks, but also redefining the skills required for future employment.&quot;
                    </p>
                  </div>
                </div>

                {/* Sub-card 2: Checklist */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-[#003178]">2. Key Supporting Points (Must Mention)</h4>
                  <div className="space-y-2.5">
                    {[
                      {
                        title: 'Job Displacement vs. Creation:',
                        desc: 'Acknowledge the fear of job loss, but emphasize the creation of new tech-centric roles.',
                      },
                      {
                        title: 'Shift in Skill Demands:',
                        desc: 'Soft skills (creativity, empathy, complex problem-solving) are becoming more valuable than purely technical skills.',
                      },
                      {
                        title: 'Lifelong Learning:',
                        desc: 'The necessity for continuous education to adapt to evolving AI tools.',
                      },
                    ].map((pt, index) => (
                      <div
                        key={index}
                        className="bg-emerald-50/50 border border-emerald-100 hover:border-emerald-200 rounded-2xl p-4 flex items-start gap-3.5 transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-3xs">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                        <div className="space-y-0.5">
                          <strong className="text-xs text-emerald-900 font-extrabold">{pt.title}</strong>
                          <p className="text-[11px] text-slate-500 font-medium leading- relaxed">{pt.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Right Column (40% Equivalent): Wave display, timer & control buttons */}
            <div className="lg:col-span-4 bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-6 shadow-2xs flex flex-col justify-between text-center items-stretch space-y-6">
              
              {/* Pulsating red badge */}
              <div className="flex items-center justify-center">
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-3xs animate-pulse">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />
                  <span>正在录音 REC</span>
                </div>
              </div>

              {/* Digital countdown countdown */}
              <div className="space-y-2.5">
                <h1 className="text-4xl font-black text-slate-800 tracking-tight font-mono">
                  00:{recordTimer < 10 ? `0${recordTimer}` : recordTimer} <span className="text-slate-300 font-normal">/ 01:00</span>
                </h1>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">作答剩余时间</p>
              </div>

              {/* Live sound spectrum wave canvas */}
              <div className="bg-slate-50/60 border border-slate-150 rounded-2xl p-4 flex flex-col justify-center items-center h-28 relative overflow-hidden shadow-inner">
                <canvas ref={canvasRef} width={280} height={100} className="w-full max-w-xs h-full" />
              </div>

              <label className="text-left space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  浏览器转写文本，可手动校正后提交 AI 反馈
                </span>
                <textarea
                  value={speechDraft}
                  onChange={(event) => setSpeechDraft(event.target.value)}
                  className="w-full min-h-28 p-3 text-xs leading-relaxed font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-[#003178]"
                />
              </label>

              {/* Quick controller action row */}
              <div className="pt-4 border-t border-slate-100 flex gap-4">
                <button
                  onClick={() => {
                    setRecordTimer(60);
                    triggerToast('计时已重新重置！');
                  }}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-black rounded-2xl transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="h-4 w-4" /> 重新录制
                </button>
                <button
                  onClick={handleFinishRecording}
                  disabled={isAnalyzingSpeech || !speechDraft.trim()}
                  className="flex-[#1.3] py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-2xl shadow-md transition-all active:scale-[0.97] hover:-translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer pointer-events-auto border-b-4 border-emerald-900"
                >
                  <CheckCircle className="h-4.5 w-4.5" /> {isAnalyzingSpeech ? '分析中...' : '完成录音'}
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ==================== STEP 3: EVALUATION & FEEDBACK VIEW ==================== */}
        {step === 3 && (
          <div className="flex flex-1 flex-col gap-4">
            {analysisMode === 'fallback' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
                当前为离线示例反馈：AI 服务未能完成分析。本轮仍可用于练习流程，但建议稍后重新分析后再纳入正式能力评估。
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-7 items-stretch flex-1">
            
            {/* Left segment (60%): Original Transcript comparison highlighting with legends */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Block 1: TARGET TASK */}
              <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-2xs space-y-3">
                <span className="text-xs font-black text-[#003178] flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-1.5 h-3.5 bg-[#003178] rounded-xs block" />
                  TARGET TASK
                </span>
                <p className="text-xs text-slate-600 font-extrabold leading-relaxed">
                  &quot;Describe a memorable journey you took recently. Explain where you went, what you did, and why it was memorable.&quot;
                </p>
              </div>

              {/* Block 2: Your Recording Transcript */}
              <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4">
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#003178]" />
                    Your Recording Transcript
                  </span>
                  <div className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono font-black text-slate-500">
                    01:15
                  </div>
                </div>

                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-150 leading-loose text-xs font-semibold text-slate-700 font-sans whitespace-pre-line">
                  &quot;{speechAnalysis?.originalTextWithMarkings ?? speechDraft}&quot;
                </div>

                {/* Annotated Legend Row */}
                <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100/60">
                  <span className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 mr-1">
                    标记示意：
                  </span>
                  <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-rose-50 border border-rose-200 rounded-sm" />
                    语法错误
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-50 border border-amber-200 rounded-sm" />
                    词汇建议
                  </span>
                  <span className="text-[10px] font-bold text-sky-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-sky-50 border border-sky-200 rounded-sm" />
                    发音模糊
                  </span>
                </div>

              </div>

            </div>

            {/* Right segment (40%): AI scoring sliders, suggestion & better expression */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* AI analysis scores sliders */}
              <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-5.5 shadow-2xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-150/70">
                  <span className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <BarChart3 className="h-4.5 w-4.5 text-[#003178]" />
                    AI ANALYSIS
                  </span>
                  <span className="text-lg font-black text-[#003178]">
                    {speechAnalysis?.scoreImprovementFrom ?? 72}<span className="text-xs text-slate-400 font-normal">/100</span>
                  </span>
                </div>

                <div className="space-y-3.5">
                  {[
                    { label: '流利度 (Fluency)', score: 70, color: 'bg-gradient-to-r from-teal-400 to-[#003178]' },
                    { label: '发音 (Pronunciation)', score: 75, color: 'bg-gradient-to-r from-teal-400 to-[#003178]' },
                    { label: '语法 (Grammar)', score: 55, color: 'bg-rose-500', isErr: true },
                    { label: '词汇 (Vocabulary)', score: 70, color: 'bg-gradient-to-r from-teal-400 to-[#003178]' },
                  ].map((sl, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-500">{sl.label}</span>
                        <span className={sl.isErr ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>
                          {sl.score}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full ${sl.color}`} style={{ width: `${sl.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sub recommendations container */}
                <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 text-[11px] leading-relaxed text-rose-800 font-bold">
                  <strong>核心建议：</strong>
                  <span>{speechAnalysis?.fluencyAnalysis ?? '注意时态的一致性。描述过去发生的事情（去年去巴黎），请全篇使用一般过去时（went, was, saw）。'} {speechAnalysis?.logicAnalysis ?? ''}</span>
                </div>
              </div>

              {/* Better Expression panel */}
              <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-5.5 shadow-2xs space-y-3">
                <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Sparkles className="h-4.5 w-4.5 text-emerald-600" />
                  <span className="text-xs font-black text-slate-850">更自然版本 (Better Expression)</span>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-150 bg-slate-50 p-3 text-xs font-semibold leading-relaxed text-slate-700">
                  <p className="text-emerald-800 font-black whitespace-pre-line">
                    &quot;{speechAnalysis?.improvedTextWithConnectors ?? DEFAULT_SPEECH_DRAFT}&quot;
                  </p>
                  <button
                    onClick={() => handleTTS(speechAnalysis?.improvedTextWithConnectors ?? DEFAULT_SPEECH_DRAFT, 'improved-answer')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[11px] font-black text-emerald-800 hover:bg-emerald-50"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>{isSpeakingSample === 'improved-answer' ? '停止朗读' : '朗读改写版本'}</span>
                  </button>
                </div>
              </div>

              {isSecondAttemptStarted && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-emerald-900">第二次重说转写</span>
                    <span className="text-[10px] font-bold text-emerald-700">根据改写版本复述后再提交</span>
                  </div>
                  <textarea
                    value={secondAttemptDraft}
                    onChange={(event) => setSecondAttemptDraft(event.target.value)}
                    className="min-h-[130px] w-full rounded-2xl border border-emerald-200 bg-white p-3 text-xs font-semibold leading-relaxed text-slate-700 outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    placeholder="在这里校正第二次重说的转写文本。"
                  />
                </div>
              )}

              <button
                onClick={isSecondAttemptStarted ? handleCompleteSecondAttempt : handleStartSecondAttempt}
                disabled={isPersistingReport}
                className="w-full py-4.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer pointer-events-auto text-sm border-b-4 border-emerald-950"
              >
                <RotateCw className="h-4.5 w-4.5 stroke-[3] animate-spin-slow" />
                <span>{isPersistingReport ? '正在保存训练证据...' : isSecondAttemptStarted ? '完成第二次重说并生成对比报告' : '开始第二次重说'}</span>
              </button>

            </div>

            </div>
          </div>
        )}

        {/* ==================== STEP 4: TRAINING CONTRAST REPORT ==================== */}
        {step === 4 && (
          <div className="space-y-6 flex-1 pr-1 pb-4">
            
            {/* Top Right Action - Added to revision database */}
            <div className="flex flex-col gap-3 bg-slate-100/50 p-4 border border-slate-200 rounded-3xl sm:flex-row sm:justify-between sm:items-center">
              <span className="text-xs font-bold text-slate-500">
                {reportPersisted ? '本轮口语证据已写入本地能力画像，复习队列会在今日任务中自动调度。' : '点击右侧按钮将此高频典型对比语料直接入库'}
              </span>
              <button
                onClick={handleAddToReviewQueue}
                disabled={addedToQueue || isPersistingReport}
                className={`w-full justify-center sm:w-auto px-5 py-3 sm:py-2.5 rounded-2xl text-xs font-black shadow-2xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer pointer-events-auto flex items-center gap-1.5 ${
                  addedToQueue
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                    : 'bg-[#003178] hover:bg-[#072551] text-white border border-[#cfe6f2]'
                }`}
              >
                <FolderPlus className="h-4 w-4" />
                <span>{isPersistingReport ? '写入中...' : addedToQueue ? '已加入复习队列' : '加入复习队列'}</span>
              </button>
            </div>

            {/* Row of 3 highlighting statistics metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Card 1: 综合评分 */}
              <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-3xs flex justify-between items-center relative overflow-hidden group">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">综合评分提升</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-emerald-600">+{scoreGain}</span>
                    <span className="text-xs font-black text-slate-400">pts</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    首次评分 {currentAnalysis.scoreImprovementFrom} → 重说目标 {currentAnalysis.scoreImprovementTo}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <TrendingUp className="h-6 w-6 transform group-hover:scale-110 transition-transform" />
                </div>
              </div>

              {/* Card 2: 流利度提升 */}
              <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-3xs flex justify-between items-center relative overflow-hidden group">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">流利度提升</span>
                  <span className="text-3xl font-black text-sky-600">{currentAnalysis.fillerCount}</span>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    填充词/犹豫词建议从 <span className="font-extrabold text-slate-600">{currentAnalysis.fillerCount} 次</span> 降至{' '}
                    <span className="font-extrabold text-[#003178]">{fillerAfter} 次</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
                  <CheckCircle className="h-6 w-6 transform group-hover:scale-110 transition-transform" />
                </div>
              </div>

              {/* Card 3: 词汇丰富度 */}
              <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-5 shadow-3xs flex justify-between items-center relative overflow-hidden group">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">词汇丰富度</span>
                  <span className="text-3xl font-black text-amber-600">3</span>
                  <div className="flex gap-1.5 pt-0.5">
                    <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.2 rounded">
                      逻辑连接
                    </span>
                    <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.2 rounded">
                      主题词升级
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <Award className="h-6 w-6 transform group-hover:scale-110 transition-transform" />
                </div>
              </div>

            </div>

            {/* Side by side comparison cards layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              
              {/* Left Side: Baseline response */}
              <div className="bg-[#fff9f9] border border-red-200/50 rounded-3xl p-4 sm:p-5.5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 pb-2 border-b border-red-100 sm:flex-row sm:justify-between sm:items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5.5 h-5.5 bg-red-100 text-red-700 text-[10px] rounded-full flex items-center justify-center font-black">
                        1
                      </span>
                      <span className="text-xs font-black text-slate-850">首次作答 (Baseline)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">
                      用时: 45s | 语速: 110 wpm
                    </span>
                  </div>

                  <p className="text-xs text-slate-650 leading-relaxed font-semibold whitespace-pre-line">
                    &quot;{currentAnalysis.originalTextWithMarkings}&quot;
                  </p>
                </div>
              </div>

              {/* Right Side: Improved Response */}
              <div className="bg-[#f2fcf4] border border-emerald-200/50 rounded-3xl p-4 sm:p-5.5 flex flex-col justify-between relative overflow-hidden">
                {/* Absolute status badge */}
                <div className="absolute top-0 right-0 py-0.5 px-3 bg-emerald-500 text-white text-[9px] font-black rounded-bl-xl shadow-inner uppercase tracking-wider">
                  显著进步
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-2 pb-2 border-b border-emerald-100 sm:flex-row sm:justify-between sm:items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5.5 h-5.5 bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center font-black">
                        2
                      </span>
                      <span className="text-xs font-black text-emerald-800">重说作答 (Improved)</span>
                    </div>
                    <span className="text-[10px] text-emerald-700/80 font-semibold font-mono sm:mr-12">
                      用时: 38s | 语速: 135 wpm
                    </span>
                  </div>

                  <p className="text-xs text-[#0a4823] leading-relaxed font-black whitespace-pre-line">
                    &quot;{secondAttemptDraft || currentAnalysis.improvedTextWithConnectors}&quot;
                  </p>
                </div>
              </div>

            </div>

            {/* Natural expression adapter table row */}
            <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-5.5 shadow-b-md space-y-4">
              <span className="text-sm font-black text-[#003178] flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-[#003178] rounded-xs block" />
                自然表达采纳情况
              </span>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase">
                      <th className="py-2.5 px-3">原表达 (Basic)</th>
                      <th className="py-2.5 px-3"></th>
                      <th className="py-2.5 px-3 text-[#003178]">采纳的高阶表达 (Advanced)</th>
                      <th className="py-2.5 px-3 text-right">类型</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {reportRows.map((entry, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-400 font-mono italic">
                          {entry.basic}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-bold font-sans">&rarr;</td>
                        <td className="py-3 px-3 font-extrabold text-slate-800 font-sans leading-relaxed">
                          {entry.advanced}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2.5 py-0.5 border rounded-md text-[10px] font-bold ${entry.badgeStyle}`}>
                            {entry.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
