import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardPaste,
  DownloadCloud,
  FileJson,
  RotateCw,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { Passage } from '../types';
import { trackTelemetry } from '../lib/telemetry';

interface MaterialImporterProps {
  onLoadCustomPassage: (customPassage: Passage) => void;
}

const SAMPLE_IMPORT_TEMPLATE = {
  title: 'Urban Green Spaces and Student Well-being',
  content:
    'Urban green spaces are becoming an important part of modern city planning. Many students live in crowded neighborhoods and spend long hours indoors, so parks and small gardens can provide a place to relax, exercise, and recover attention. Researchers have found that short exposure to natural environments may reduce stress and improve concentration. However, green spaces do not benefit everyone equally. If parks are far from schools or poorly maintained, students from low-income communities may not enjoy the same advantages. Therefore, city planners should consider both the number of green areas and their accessibility. A successful plan should combine public transport, safe walking routes, and community maintenance. In this way, green spaces can become practical learning support rather than decorative projects.',
  questions: [
    {
      id: 1,
      question: 'What is one benefit of urban green spaces for students?',
      options: {
        A: 'They replace all classroom learning.',
        B: 'They may reduce stress and improve concentration.',
        C: 'They make public transport unnecessary.',
        D: 'They remove the need for city planning.',
      },
      correctAnswer: 'B',
      explanation: '原文指出自然环境短暂接触可能降低压力并提升专注力，因此 B 正确。',
      type: '细节理解',
      tags: ['细节定位', '同义替换'],
      correctSentence: 'Researchers have found that short exposure to natural environments may reduce stress and improve concentration.',
      distractorSentence: 'A successful plan should combine public transport, safe walking routes, and community maintenance.',
    },
  ],
};

const sampleTopics = [
  'Traditional Chinese papercutting and festivals (中国传统剪纸与节日)',
  'The pros and cons of autonomous delivery vehicles in major cities (城市自动驾驶配送)',
  'Global plastic pollution and eco-friendly packaging alternatives (塑料污染与环保替代)',
  'The popularity of mental meditation among young employees (年轻雇员中的正念禅修热)',
];

async function validatePassageWithApi(passage: unknown, sourceType: 'user-imported' | 'ai-generated'): Promise<Passage> {
  const response = await fetch('/api/materials/validate-passage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ passage, sourceType }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || '材料格式校验失败');
  }

  return data.passage as Passage;
}

export default function MaterialImporter({ onLoadCustomPassage }: MaterialImporterProps) {
  const [topic, setTopic] = useState('');
  const [jsonText, setJsonText] = useState(() => JSON.stringify(SAMPLE_IMPORT_TEMPLATE, null, 2));
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const questionCount = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed?.questions) ? parsed.questions.length : 0;
    } catch {
      return 0;
    }
  }, [jsonText]);

  const handleGenerate = async (customTopic?: string) => {
    const targetTopic = customTopic || topic.trim();
    if (!targetTopic) return;

    setLoading(true);
    setStatus(null);
    const startedAt = performance.now();

    try {
      const response = await fetch('/api/ai/generate-passage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: targetTopic }),
      });

      const raw = await response.json();
      if (!response.ok) throw new Error(raw.message || 'AI 生成失败');

      const passage = await validatePassageWithApi(raw, 'ai-generated');
      setStatus({ type: 'success', text: `已生成《${passage.title}》，正在进入训练。` });
      trackTelemetry('material_generated', {
        questionCount: passage.questions.length,
        latencyMs: Math.round(performance.now() - startedAt),
      });
      onLoadCustomPassage(passage);
    } catch (error) {
      console.error(error);
      trackTelemetry('material_generation_failed', {
        latencyMs: Math.round(performance.now() - startedAt),
      });
      setStatus({
        type: 'error',
        text: `${(error as Error).message || 'AI 生成失败'}。你可以稍后重试，或改用右侧 JSON 导入继续训练。`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportJson = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const parsed = JSON.parse(jsonText);
      const passage = await validatePassageWithApi(parsed, 'user-imported');
      setStatus({ type: 'success', text: `导入成功：${passage.questions.length} 道题已通过结构校验。` });
      trackTelemetry('material_imported', {
        questionCount: passage.questions.length,
        sourceType: 'json',
      });
      onLoadCustomPassage(passage);
    } catch (error) {
      trackTelemetry('material_import_failed', {
        reason: error instanceof SyntaxError ? 'json_parse' : 'validation',
      });
      setStatus({
        type: 'error',
        text: error instanceof SyntaxError ? 'JSON 解析失败，请检查括号、逗号和引号。' : (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setJsonText(text);
    setStatus({ type: 'success', text: `已读取文件：${file.name}，请点击“校验并导入训练”。` });
    event.target.value = '';
  };

  return (
    <div className="flex-1 min-h-[calc(100svh-9rem)] lg:h-screen overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#e2f4ff,transparent_34%),linear-gradient(180deg,#f7fbff_0%,#ffffff_55%)] p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-[#cfe6f2] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#0d47a1]">Material Studio</p>
          <h2 className="mt-2 flex items-center gap-2 text-xl font-black tracking-tight text-[#003178] sm:text-2xl">
            <DownloadCloud className="h-7 w-7" />
            材料导入与 AI 模拟卷生成
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            支持 AI 生成 CET-4 模拟阅读，也支持导入合法来源的 JSON 题材。所有导入内容都会先经过后端结构校验，再进入训练舱。
          </p>
        </div>
        <div className="rounded-2xl border border-[#cfe6f2] bg-white/80 px-4 py-3 text-xs font-bold text-[#003178] shadow-xs">
          当前草稿：{questionCount || '未识别'} 道题
        </div>
      </header>

      {status && (
        <div
          className={`mb-5 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertTriangle className="mt-0.5 h-4 w-4" />}
          <span>{status.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-3xl border border-[#c3c6d4] bg-white p-4 shadow-xs sm:p-6">
          <div className="flex items-center gap-2 text-sm font-black text-[#071e27]">
            <Sparkles className="h-5 w-5 text-[#003178]" />
            AI 模拟阅读生成
          </div>
          <p className="mt-3 text-xs font-semibold leading-6 text-slate-500">
            输入话题后，系统会调用 AI 生成原创模拟材料；供应商不可用时会返回离线样例，保证演示和训练流程不断裂。
          </p>

          <div className="mt-5 space-y-3">
            <input
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="例如：Space exploration or plastic pollution..."
              className="w-full rounded-2xl border border-[#c3c6d4] bg-white px-4 py-3 text-sm font-semibold outline-hidden transition focus:border-[#003178] focus:ring-2 focus:ring-[#cfe6f2]"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={loading || !topic.trim()}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black shadow-sm transition ${
                topic.trim() && !loading
                  ? 'bg-[#003178] text-white hover:-translate-y-0.5 hover:bg-[#0d47a1]'
                  : 'cursor-not-allowed bg-slate-100 text-slate-400'
              }`}
            >
              {loading ? <RotateCw className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
              <span>{loading ? '正在处理材料...' : '一键生成 CET-4 模拟阅读'}</span>
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">推荐话题</h3>
            <div className="mt-3 space-y-3">
              {sampleTopics.map((sample) => (
                <button
                  key={sample}
                  onClick={() => {
                    setTopic(sample);
                    handleGenerate(sample);
                  }}
                  disabled={loading}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 text-left text-xs font-bold text-[#071e27] transition hover:border-[#003178] hover:bg-[#e6f6ff]/45 hover:text-[#003178]"
                >
                  <span className="truncate pr-3">{sample}</span>
                  <Sparkles className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#c3c6d4] bg-white p-4 shadow-xs sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-[#071e27]">
                <FileJson className="h-5 w-5 text-[#003178]" />
                JSON 题材导入
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                适合导入自有或授权材料。字段至少包含 title、content、questions、options、correctAnswer。
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#cfe6f2] bg-[#eef7fc] px-4 py-2 text-xs font-black text-[#003178] transition hover:bg-[#dbf1fe]">
              <UploadCloud className="h-4 w-4" />
              选择 JSON 文件
              <input type="file" accept="application/json,.json" className="sr-only" onChange={handleFileUpload} />
            </label>
          </div>

          <textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            spellCheck={false}
            className="mt-5 min-h-[280px] sm:min-h-[380px] w-full rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-hidden transition focus:border-[#003178] focus:ring-2 focus:ring-[#cfe6f2]"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => {
                setJsonText(JSON.stringify(SAMPLE_IMPORT_TEMPLATE, null, 2));
                setStatus({ type: 'success', text: '已恢复示例模板，可直接校验导入。' });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600 transition hover:border-[#003178] hover:text-[#003178]"
            >
              <ClipboardPaste className="h-4 w-4" />
              填入示例模板
            </button>
            <button
              onClick={handleImportJson}
              disabled={loading || !jsonText.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1b6d24] px-6 py-3 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {loading ? <RotateCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              校验并导入训练
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
