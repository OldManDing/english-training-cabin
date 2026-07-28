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

type PracticeSpeechAudioCacheEntry = {
  promise: Promise<Blob>;
  blob?: Blob;
  createdAt: number;
  lastUsedAt: number;
};

type PracticeSpeechVoiceChoice = {
  voice: SpeechSynthesisVoice | null;
  hasEnglishVoice: boolean;
};

const PRACTICE_SPEECH_AUDIO_CACHE_MAX_ITEMS = 12;
const PRACTICE_SPEECH_AUDIO_CACHE_TTL_MS = 10 * 60 * 1_000;

let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let activeSource: PracticeSpeechSource = 'none';
let activeRunId = 0;
const practiceSpeechAudioCache = new Map<string, PracticeSpeechAudioCacheEntry>();

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

export function isLoopbackHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (normalized === '::1' || normalized === '[::1]') return true;

  const octets = normalized.split('.');
  return octets.length === 4
    && octets[0] === '127'
    && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
}

function canUseServerPracticeTts() {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:' || isLoopbackHostname(window.location.hostname);
}

function buildPracticeSpeechAudioCacheKey(text: string, rate?: number) {
  return JSON.stringify({
    text,
    rate: clampSpeechRate(rate),
  });
}

function prunePracticeSpeechAudioCache() {
  const now = Date.now();
  for (const [key, entry] of practiceSpeechAudioCache.entries()) {
    if (now - entry.createdAt > PRACTICE_SPEECH_AUDIO_CACHE_TTL_MS) {
      practiceSpeechAudioCache.delete(key);
    }
  }

  if (practiceSpeechAudioCache.size <= PRACTICE_SPEECH_AUDIO_CACHE_MAX_ITEMS) return;

  const staleEntries = Array.from(practiceSpeechAudioCache.entries())
    .sort(([, a], [, b]) => a.lastUsedAt - b.lastUsedAt)
    .slice(0, practiceSpeechAudioCache.size - PRACTICE_SPEECH_AUDIO_CACHE_MAX_ITEMS);
  staleEntries.forEach(([key]) => practiceSpeechAudioCache.delete(key));
}

async function fetchPracticeSpeechAudio(text: string, rate?: number) {
  const response = await apiFetch('/api/practice/tts', {
    method: 'POST',
    body: JSON.stringify({
      text,
      rate: clampSpeechRate(rate),
    }),
  }, null);
  if (!response.ok) throw new Error(`Local TTS failed with ${response.status}`);
  return response.blob();
}

function getPracticeSpeechAudio(text: string, rate?: number) {
  const cacheKey = buildPracticeSpeechAudioCacheKey(text, rate);
  const now = Date.now();
  const cached = practiceSpeechAudioCache.get(cacheKey);
  if (cached && now - cached.createdAt <= PRACTICE_SPEECH_AUDIO_CACHE_TTL_MS) {
    cached.lastUsedAt = now;
    return cached.blob ? Promise.resolve(cached.blob) : cached.promise;
  }

  const entry: PracticeSpeechAudioCacheEntry = {
    createdAt: now,
    lastUsedAt: now,
    promise: fetchPracticeSpeechAudio(text, rate),
  };
  entry.promise
    .then((blob) => {
      entry.blob = blob;
      return blob;
    })
    .catch(() => {
      if (practiceSpeechAudioCache.get(cacheKey) === entry) {
        practiceSpeechAudioCache.delete(cacheKey);
      }
    });
  practiceSpeechAudioCache.set(cacheKey, entry);
  prunePracticeSpeechAudioCache();
  return entry.promise;
}

export async function preloadPracticeSpeech(rawText: string, options: Pick<PracticeSpeechOptions, 'rate' | 'preferLocalAudio'> = {}) {
  const text = rawText.trim();
  if (!text || options.preferLocalAudio === false || !canUseServerPracticeTts()) return false;

  try {
    await getPracticeSpeechAudio(text, options.rate);
    return true;
  } catch {
    return false;
  }
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
  let endedBeforeStart = false;
  utterance.onend = () => {
    if (runId !== activeRunId) return;
    endedBeforeStart = true;
    activeSource = 'none';
    options.onEnd?.();
  };
  utterance.onerror = () => {
    if (runId !== activeRunId) return;
    endedBeforeStart = true;
    activeSource = 'none';
    options.onError?.(
      hasEnglishVoice
        ? '浏览器语音朗读失败，请检查系统语音设置或稍后重试。'
        : '当前浏览器没有可用英文语音，朗读失败。请在系统或浏览器中安装英文语音包后重试。',
    );
  };
  window.speechSynthesis.speak(utterance);
  if (endedBeforeStart) return 'none';
  options.onStart?.();
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

  if (options.preferLocalAudio !== false && canUseServerPracticeTts()) {
    try {
      const audioBlob = await getPracticeSpeechAudio(text, options.rate);
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
      options.onStart?.();
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
