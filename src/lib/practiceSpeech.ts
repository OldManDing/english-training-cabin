import { apiFetch } from './api';

type PracticeSpeechSource = 'local-tts' | 'browser-tts' | 'none';

type PracticeSpeechState = {
  source: PracticeSpeechSource;
  isPlaying: boolean;
  isPaused: boolean;
};

type PracticeSpeechOptions = {
  rate?: number;
  preferLocalAudio?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};

type PracticeSpeechVoiceChoice = {
  voice: SpeechSynthesisVoice | null;
  hasEnglishVoice: boolean;
};

let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let activeSource: PracticeSpeechSource = 'none';
let activeRunId = 0;

function clampSpeechRate(rate?: number) {
  if (!Number.isFinite(rate)) return 0.9;
  return Math.max(0.6, Math.min(1.4, Number(rate)));
}

function clearActiveAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute('src');
    activeAudio.load();
    activeAudio = null;
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

function cancelBrowserSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function pickPracticeSpeechVoice(): PracticeSpeechVoiceChoice {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { voice: null, hasEnglishVoice: false };
  }

  const voices = window.speechSynthesis.getVoices();
  const englishVoice =
    voices.find((voice) => /en-US/i.test(voice.lang) && /zira|jenny|aria|guy|david/i.test(voice.name))
    ?? voices.find((voice) => /en-US/i.test(voice.lang))
    ?? voices.find((voice) => /^en[-_]/i.test(voice.lang))
    ?? null;

  return {
    voice: englishVoice ?? voices[0] ?? null,
    hasEnglishVoice: Boolean(englishVoice),
  };
}

function canUseServerPracticeTts() {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

function playBrowserSpeech(text: string, runId: number, options: PracticeSpeechOptions): PracticeSpeechSource {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onError?.('当前浏览器不支持语音朗读。');
    activeSource = 'none';
    options.onEnd?.();
    return 'none';
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const { voice, hasEnglishVoice } = pickPracticeSpeechVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? 'en-US';
  utterance.rate = clampSpeechRate(options.rate);
  utterance.onend = () => {
    if (runId !== activeRunId) return;
    activeSource = 'none';
    options.onEnd?.();
  };
  utterance.onerror = () => {
    if (runId !== activeRunId) return;
    activeSource = 'none';
    options.onError?.(
      hasEnglishVoice
        ? '浏览器语音朗读失败，请检查系统语音设置或稍后重试。'
        : '当前浏览器没有可用英文语音，朗读失败。请在系统或浏览器中安装英文语音包后重试。',
    );
  };
  window.speechSynthesis.speak(utterance);
  return 'browser-tts';
}

export function stopPracticeSpeech() {
  activeRunId += 1;
  clearActiveAudio();
  cancelBrowserSpeech();
  activeSource = 'none';
}

export function pausePracticeSpeech(): boolean {
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) {
    activeAudio.pause();
    return true;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    return true;
  }

  return false;
}

export async function resumePracticeSpeech(): Promise<boolean> {
  if (activeAudio && activeAudio.paused && !activeAudio.ended) {
    await activeAudio.play();
    return true;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    return true;
  }

  return false;
}

export function getPracticeSpeechState(): PracticeSpeechState {
  if (activeAudio) {
    return {
      source: activeSource,
      isPlaying: !activeAudio.paused && !activeAudio.ended,
      isPaused: activeAudio.paused && !activeAudio.ended,
    };
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return {
      source: window.speechSynthesis.speaking || window.speechSynthesis.paused ? activeSource : 'none',
      isPlaying: window.speechSynthesis.speaking && !window.speechSynthesis.paused,
      isPaused: window.speechSynthesis.paused,
    };
  }

  return { source: 'none', isPlaying: false, isPaused: false };
}

export async function playPracticeSpeech(
  rawText: string,
  options: PracticeSpeechOptions = {},
): Promise<{ source: PracticeSpeechSource }> {
  const text = rawText.trim();
  if (!text) return { source: 'none' };

  const runId = activeRunId + 1;
  activeRunId = runId;
  clearActiveAudio();
  cancelBrowserSpeech();
  activeSource = 'none';
  options.onStart?.();

  if (options.preferLocalAudio !== false && canUseServerPracticeTts()) {
    try {
      const response = await apiFetch('/api/practice/tts', {
        method: 'POST',
        body: JSON.stringify({
          text,
          rate: clampSpeechRate(options.rate),
        }),
      }, null);
      if (!response.ok) throw new Error(`Local TTS failed with ${response.status}`);
      const audioBlob = await response.blob();
      if (runId !== activeRunId) return { source: 'none' };

      const objectUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(objectUrl);
      activeObjectUrl = objectUrl;
      activeAudio = audio;
      audio.onended = () => {
        if (runId !== activeRunId) return;
        clearActiveAudio();
        activeSource = 'none';
        options.onEnd?.();
      };
      audio.onerror = () => {
        if (runId !== activeRunId) return;
        clearActiveAudio();
        options.onError?.('本地语音音频播放失败，已尝试浏览器朗读。');
        activeSource = 'browser-tts';
        playBrowserSpeech(text, runId, options);
      };
      await audio.play();
      activeSource = 'local-tts';
      return { source: 'local-tts' };
    } catch {
      if (runId !== activeRunId) return { source: 'none' };
      clearActiveAudio();
      cancelBrowserSpeech();
    }
  }

  const source = playBrowserSpeech(text, runId, options);
  activeSource = source;
  return { source };
}
