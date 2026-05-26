import React, { useEffect, useState } from 'react';
import { Cloud, DownloadCloud, LogIn, LogOut, RefreshCw, ShieldCheck, UploadCloud, UserPlus } from 'lucide-react';
import { exportLearningData, importLearningData } from '../lib/storage/db';
import SaasOperationsPanel from './SaasOperationsPanel';

export interface PublicSaasAccountContext {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'member';
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  subscription: {
    tier: 'free' | 'pro' | 'team' | 'enterprise';
    status: 'trialing' | 'active' | 'past_due' | 'canceled';
    seats: number;
    trialEndsAt?: string;
  };
  entitlements: {
    cloudSync: boolean;
    aiMonthlyCredits: number;
    teamSeats: number;
    licensedContent: boolean;
    adminConsole: boolean;
  };
}

interface SaasAccountPanelProps {
  onTriggerModal?: (title: string, body: string) => void;
  onDataRestored?: () => Promise<void>;
}

const SAAS_TOKEN_KEY = 'english-training-cabin:saas-token';
const INITIAL_CLOUD_STATUS = '登录后可把当前浏览器的学习记录同步到服务端，形成可恢复的云端学习档案。';
type AuthMode = 'login' | 'register' | 'invitation';

function getInitialAuthAction(): { mode?: AuthMode; token?: string } {
  const token = new URLSearchParams(window.location.search).get('token') ?? undefined;
  if (!token) return {};
  if (window.location.pathname.includes('/workspace/accept-invitation')) return { mode: 'invitation', token };
  return {};
}

function getApiMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后重试。';
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(payload.message || `请求失败：${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function formatSubscription(account: PublicSaasAccountContext) {
  const statusMap = {
    trialing: '试运行',
    active: '已开通',
    past_due: '需处理',
    canceled: '已停用',
  };
  const tierMap = {
    free: '本地版',
    pro: '云端版',
    team: '团队版',
    enterprise: '机构版',
  };
  return `${tierMap[account.subscription.tier]} · ${statusMap[account.subscription.status]}`;
}

export default function SaasAccountPanel({ onTriggerModal, onDataRestored }: SaasAccountPanelProps) {
  const [initialAction] = useState(getInitialAuthAction);
  const [mode, setMode] = useState<AuthMode>(initialAction.mode ?? 'register');
  const [name, setName] = useState('学习者');
  const [organizationName, setOrganizationName] = useState('英语训练团队');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [actionToken, setActionToken] = useState(initialAction.token ?? '');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(SAAS_TOKEN_KEY));
  const [account, setAccount] = useState<PublicSaasAccountContext | null>(null);
  const [statusText, setStatusText] = useState(INITIAL_CLOUD_STATUS);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let mounted = true;

    apiRequest<{ authenticated: boolean; account: PublicSaasAccountContext | null }>('/api/auth/session', {}, token)
      .then((payload) => {
        if (!mounted) return;
        if (!payload.authenticated || !payload.account) {
          localStorage.removeItem(SAAS_TOKEN_KEY);
          setToken(null);
          setAccount(null);
          setStatusText('登录状态已失效，请重新登录。');
          return;
        }
        setAccount(payload.account);
        setStatusText((current) =>
          current === INITIAL_CLOUD_STATUS || current === '登录状态已失效，请重新登录。'
            ? '云端账号已连接，可同步当前学习数据。'
            : current,
        );
      })
      .catch(() => {
        if (!mounted) return;
        localStorage.removeItem(SAAS_TOKEN_KEY);
        setToken(null);
        setAccount(null);
        setStatusText('登录状态已失效，请重新登录。');
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleAuthSubmit = async () => {
    setIsBusy(true);
    try {
      const endpoint = mode === 'register'
        ? '/api/auth/register'
        : mode === 'login'
          ? '/api/auth/login'
          : '/api/workspace/invitations/accept';
      const body = mode === 'register'
        ? { email, password, name, organizationName }
        : mode === 'login'
          ? { email, password }
          : { token: actionToken, name, password };
      const payload = await apiRequest<{ token: string; account: PublicSaasAccountContext }>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );
      localStorage.setItem(SAAS_TOKEN_KEY, payload.token);
      setToken(payload.token);
      setAccount(payload.account);
      if (mode === 'register') {
        setStatusText('云端账号已创建，可同步学习数据；团队邀请会生成可复制的邀请链接。');
        return;
      }
      const statusByMode: Record<AuthMode, string> = {
        register: '云端账号已创建，学习档案同步能力已开通。',
        login: '已登录云端账号。',
        invitation: '邀请已接受，您已加入团队。',
      };
      setStatusText(statusByMode[mode]);
    } catch (error) {
      setStatusText(getApiMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleLogout = async () => {
    setIsBusy(true);
    try {
      if (token) {
        await apiRequest('/api/auth/logout', { method: 'POST' }, token).catch(() => undefined);
      }
      localStorage.removeItem(SAAS_TOKEN_KEY);
      setToken(null);
      setAccount(null);
      setStatusText('已退出云端账号，本机学习记录仍保存在当前浏览器。');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCloudBackup = async () => {
    if (!token) return;
    setIsBusy(true);
    try {
      const backup = await exportLearningData();
      const response = await apiRequest<{ snapshot: { updatedAt: string; counts: Record<string, number> } }>(
        '/api/cloud/learning-data',
        {
          method: 'PUT',
          body: JSON.stringify({ backup }),
        },
        token,
      );
      setStatusText(`云端同步完成：${response.snapshot.counts.practiceSessions} 组练习、${response.snapshot.counts.reviewItems} 个复习项已归档。`);
    } catch (error) {
      setStatusText(getApiMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleCloudRestore = async () => {
    if (!token) return;
    setIsBusy(true);
    try {
      const response = await apiRequest<{
        snapshot: null | {
          updatedAt: string;
          exportedAt: string;
          backup: unknown;
          counts: Record<string, number>;
        };
      }>('/api/cloud/learning-data', {}, token);

      if (!response.snapshot) {
        setStatusText('云端还没有学习数据，请先同步当前浏览器数据。');
        return;
      }

      const restored = await importLearningData(response.snapshot.backup);
      await onDataRestored?.();
      const summary = `已从云端恢复：目标 ${restored.studyGoals} 项、练习 ${restored.practiceSessions} 组、错题复习 ${restored.reviewItems} 项、能力画像 ${restored.skillProfiles} 项。`;
      onTriggerModal?.('云端学习数据恢复完成', summary);
      setStatusText(summary);
    } catch (error) {
      setStatusText(getApiMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="bg-white border border-[#c3c6d4]/60 rounded-3xl p-4 sm:p-6.5 shadow-sm space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-[#003178] flex items-center gap-2">
            <Cloud className="h-4 w-4 text-[#003178]" />
            云端账号与团队协作
          </h3>
          <p className="text-[11px] leading-5 text-[#434652] font-semibold mt-2">
            账号、团队空间和云端学习快照已经接入服务端；当前仍保留本地优先体验。
          </p>
        </div>
        {account && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700 border border-emerald-100">
            {formatSubscription(account)}
          </span>
        )}
      </div>

      {!account ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAuthSubmit();
          }}
        >
          {(mode === 'register' || mode === 'login') ? <div className="flex rounded-2xl bg-[#f0f7fc] p-1 border border-[#cfe6f2]">
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-black transition ${mode === 'register' ? 'bg-[#003178] text-white' : 'text-[#003178]'}`}
            >
              创建账号
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-black transition ${mode === 'login' ? 'bg-[#003178] text-white' : 'text-[#003178]'}`}
            >
              登录
            </button>
          </div> : (
            <div className="rounded-2xl bg-[#eef7fc] border border-[#d2e2ec] p-3 flex items-center justify-between gap-3">
              <p className="text-[10.5px] font-black text-[#003178]">
                接受团队邀请
              </p>
              <button type="button" onClick={() => setMode('login')} className="text-[10px] font-black text-[#003178]">返回登录</button>
            </div>
          )}

          {(mode === 'register' || mode === 'invitation') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                data-testid="saas-name-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-4 py-3 text-xs font-bold text-[#003178] outline-none focus:ring-1 focus:ring-[#003178]"
                autoComplete="name"
                placeholder="姓名"
              />
              {mode === 'register' && <input
                data-testid="saas-organization-input"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                className="rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-4 py-3 text-xs font-bold text-[#003178] outline-none focus:ring-1 focus:ring-[#003178]"
                autoComplete="organization"
                placeholder="团队 / 学校名称"
              />}
            </div>
          )}

          {(mode === 'register' || mode === 'login') && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              data-testid="saas-email-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-4 py-3 text-xs font-bold text-[#003178] outline-none focus:ring-1 focus:ring-[#003178]"
              placeholder="邮箱"
              autoComplete="username"
              type="email"
            />
            <input
              data-testid="saas-password-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-4 py-3 text-xs font-bold text-[#003178] outline-none focus:ring-1 focus:ring-[#003178]"
              placeholder="密码至少 8 位"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              type="password"
            />
          </div>}

          {mode === 'invitation' && (
            <input
              data-testid="saas-password-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-4 py-3 text-xs font-bold text-[#003178] outline-none focus:ring-1 focus:ring-[#003178]"
              placeholder="创建密码（至少 8 位）"
              autoComplete="new-password"
              type="password"
            />
          )}

          {mode === 'invitation' && (
            <input
              data-testid="saas-action-token"
              value={actionToken}
              onChange={(event) => setActionToken(event.target.value)}
              className="w-full rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-4 py-3 text-xs font-bold text-[#003178] outline-none focus:ring-1 focus:ring-[#003178]"
              placeholder="邀请链接中的一次性 token"
            />
          )}

          <button
            data-testid="saas-auth-submit"
            type="submit"
            disabled={isBusy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#003178] px-4 py-3 text-xs font-black text-white transition hover:bg-[#07244f] disabled:bg-gray-400"
          >
            {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : mode === 'register' || mode === 'invitation' ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {mode === 'register' ? '创建云端账号' : mode === 'login' ? '登录云端账号' : '接受邀请并加入团队'}
          </button>

          {mode === 'login' && (
            <p className="text-center text-[10.5px] font-bold text-[#5d6472]">
              当前版本不提供找回密码，请妥善保存密码。
            </p>
          )}
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#f7fbff] border border-[#cfe6f2] p-4 space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black text-[#003178]">{account.user.name}</p>
                <p className="text-[10px] font-bold text-[#434652]">{account.user.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-black text-[#434652] hover:bg-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                退出
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-black">
              <span className="rounded-full bg-white px-3 py-1 text-[#003178] border border-[#dbeafe]">{account.organization.name}</span>
              <span className="rounded-full bg-white px-3 py-1 text-[#1b6d24] border border-emerald-100">云同步 {account.entitlements.cloudSync ? '已开通' : '未开通'}</span>
              <span className="rounded-full bg-white px-3 py-1 text-[#003178] border border-[#dbeafe]">AI 练习额度 {account.entitlements.aiMonthlyCredits}/月</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCloudBackup}
              disabled={isBusy || !account.entitlements.cloudSync}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#003178] px-4 py-3 text-xs font-black text-white transition hover:bg-[#07244f] disabled:bg-gray-400"
            >
              <UploadCloud className="h-4 w-4" />
              同步到云端
            </button>
            <button
              type="button"
              onClick={handleCloudRestore}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#cfe6f2] bg-[#f7fbff] px-4 py-3 text-xs font-black text-[#003178] transition hover:bg-[#eef7fc] disabled:text-gray-400"
            >
              <DownloadCloud className="h-4 w-4" />
              从云端恢复
            </button>
          </div>

          <SaasOperationsPanel
            token={token}
            account={account}
            onStatus={setStatusText}
          />
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl bg-[#eef7fc] border border-[#d2e2ec] p-3">
        <ShieldCheck className="h-4 w-4 text-[#003178] shrink-0 mt-0.5" />
        <p className="text-[10.5px] leading-5 font-bold text-[#434652]">{statusText}</p>
      </div>
    </div>
  );
}
