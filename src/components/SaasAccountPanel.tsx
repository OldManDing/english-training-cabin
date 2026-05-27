import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Cloud, Copy, DownloadCloud, KeyRound, LogIn, LogOut, RefreshCw, ShieldCheck, UploadCloud, UserPlus } from 'lucide-react';
import { exportLearningData, importLearningData } from '../lib/storage/db';
import { apiRequest, clearStoredAuthToken, getStoredAuthToken, setStoredAuthToken } from '../lib/api';
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
  onAuthenticated?: () => void;
  onLogout?: () => void;
}

const INITIAL_CLOUD_STATUS = '登录后可把当前浏览器的学习记录同步到服务端，形成可恢复的云端学习档案。';
type AuthMode = 'login' | 'register' | 'invitation' | 'reset';

function getInitialAuthAction(): { mode?: AuthMode; token?: string } {
  const token = new URLSearchParams(window.location.search).get('token') ?? undefined;
  if (window.location.pathname.includes('/workspace/accept-invitation')) return { mode: 'invitation', token };
  if (window.location.pathname.includes('/auth/reset-password')) return { mode: 'reset', token };
  return {};
}

function getApiMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后重试。';
}

function formatAccountState(account: PublicSaasAccountContext) {
  const statusMap = {
    trialing: '试运行',
    active: '可使用',
    past_due: '需处理',
    canceled: '已停用',
  };
  const syncState = account.entitlements.cloudSync ? '云同步已开通' : '仅本地可用';
  return `${syncState} · ${statusMap[account.subscription.status]}`;
}

type AuthPayload = {
  token: string;
  account: PublicSaasAccountContext;
  recoveryCode?: string;
  recoveryCodeExpiresAt?: string;
};

export default function SaasAccountPanel({ onTriggerModal, onDataRestored, onAuthenticated, onLogout }: SaasAccountPanelProps) {
  const [initialAction] = useState(getInitialAuthAction);
  const [mode, setMode] = useState<AuthMode>(initialAction.mode ?? 'login');
  const [name, setName] = useState('学习者');
  const [organizationName, setOrganizationName] = useState('英语训练团队');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState(initialAction.mode === 'reset' ? initialAction.token ?? '' : '');
  const [oneTimeRecoveryCode, setOneTimeRecoveryCode] = useState<string | null>(null);
  const [actionToken, setActionToken] = useState(initialAction.token ?? '');
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());
  const latestTokenRef = useRef<string | null>(getStoredAuthToken());
  const [account, setAccount] = useState<PublicSaasAccountContext | null>(null);
  const [statusText, setStatusText] = useState(INITIAL_CLOUD_STATUS);
  const [authError, setAuthError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [showOperations, setShowOperations] = useState(false);

  useEffect(() => {
    setAuthError('');
  }, [mode]);

  useEffect(() => {
    if (!token) return;
    if (oneTimeRecoveryCode) return;
    let mounted = true;

    apiRequest<{ authenticated: boolean; account: PublicSaasAccountContext | null }>('/api/auth/session', {}, token)
      .then((payload) => {
        if (!mounted) return;
        if (!payload.authenticated || !payload.account) {
          clearStoredAuthToken();
          latestTokenRef.current = null;
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
        clearStoredAuthToken();
        latestTokenRef.current = null;
        setToken(null);
        setAccount(null);
        setStatusText('登录状态已失效，请重新登录。');
      });

    return () => {
      mounted = false;
    };
  }, [token, oneTimeRecoveryCode]);

  const handleAuthSubmit = async () => {
    setIsBusy(true);
    setAuthError('');
    try {
      const endpoint = mode === 'register'
        ? '/api/auth/register'
        : mode === 'login'
          ? '/api/auth/login'
          : mode === 'reset'
            ? '/api/auth/password-reset'
            : '/api/workspace/invitations/accept';
      const body = mode === 'register'
        ? { email, password, name, organizationName, inviteCode }
        : mode === 'login'
          ? { email, password }
          : mode === 'reset'
            ? { email, recoveryCode, password }
            : { token: actionToken, name, password };
      const payload = await apiRequest<AuthPayload>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );
      setStoredAuthToken(payload.token, !payload.recoveryCode);
      latestTokenRef.current = payload.token;
      setToken(payload.token);
      setAccount(payload.account);
      setAuthError('');
      const statusByMode: Record<AuthMode, string> = {
        register: '云端账号已创建，学习档案同步能力已开通。请立即保存账号恢复码。',
        login: '已登录云端账号。',
        invitation: '邀请已接受，您已加入团队。',
        reset: '密码已重置并重新登录。请保存新的账号恢复码。',
      };
      setStatusText(statusByMode[mode]);
      if (payload.recoveryCode) {
        setOneTimeRecoveryCode(payload.recoveryCode);
      }
      if (!payload.recoveryCode) {
        onAuthenticated?.();
      }
    } catch (error) {
      const message = getApiMessage(error);
      setAuthError(message);
      setStatusText(message);
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
      clearStoredAuthToken();
      latestTokenRef.current = null;
      setToken(null);
      setAccount(null);
      setOneTimeRecoveryCode(null);
      setStatusText('已退出云端账号，本机学习记录仍保存在当前浏览器。');
      onLogout?.();
    } finally {
      setIsBusy(false);
    }
  };

  const handleGenerateRecoveryCode = async () => {
    if (!token) return;
    setIsBusy(true);
    try {
      const response = await apiRequest<{ recoveryCode: string; recoveryCodeExpiresAt: string }>(
        '/api/auth/recovery-code',
        { method: 'POST' },
        token,
      );
      setOneTimeRecoveryCode(response.recoveryCode);
      setStatusText('新的账号恢复码已生成，旧恢复码已失效。请立即保存。');
    } catch (error) {
      setStatusText(getApiMessage(error));
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
            {account ? '云端账号与团队协作' : '账号登录'}
          </h3>
          <p className="text-[11px] leading-5 text-[#434652] font-semibold mt-2">
            {account ? '同步学习记录、管理会话和恢复码。' : '已有账号直接登录；注册必须填写邀请码。'}
          </p>
        </div>
        {account && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700 border border-emerald-100">
            {formatAccountState(account)}
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
          {(mode === 'register' || mode === 'login' || mode === 'reset') ? <div className="space-y-1.5">
            <h3 className="text-lg font-black text-[#101828]">
              {mode === 'register' ? '邀请码注册' : mode === 'reset' ? '重置密码' : '登录'}
            </h3>
            <p className="text-xs font-semibold leading-5 text-[#667085]">
              {mode === 'register'
                ? '请输入邀请码后创建账号。没有邀请码无法注册。'
                : mode === 'reset'
                  ? '使用注册时保存的恢复码重置密码。'
                  : '输入邮箱和密码即可进入训练舱。'}
            </p>
            <button
              type="button"
              onClick={() => setMode('register')}
              className="hidden"
            >
              创建账号
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="hidden"
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode('reset')}
              className="hidden"
            >
              找回
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

          {mode === 'register' && (
            <input
              data-testid="saas-invite-code-input"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              className="w-full rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-4 py-3 text-xs font-bold text-[#003178] outline-none focus:ring-1 focus:ring-[#003178]"
              autoComplete="one-time-code"
              placeholder="注册邀请码"
            />
          )}

          {(mode === 'register' || mode === 'login' || mode === 'reset') && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              data-testid="saas-email-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-4 py-3 text-xs font-bold text-[#003178] outline-none focus:ring-1 focus:ring-[#003178]"
              placeholder="账号邮箱（仅用于登录）"
              autoComplete="username"
              type="email"
            />
            <input
              data-testid="saas-password-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-4 py-3 text-xs font-bold text-[#003178] outline-none focus:ring-1 focus:ring-[#003178]"
              placeholder={mode === 'reset' ? '设置新密码（至少 8 位）' : '密码至少 8 位'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              type="password"
            />
          </div>}

          {mode === 'reset' && (
            <div className="space-y-2">
              <input
                data-testid="saas-recovery-code-input"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                className="w-full rounded-xl border border-[#c3c6d4] bg-[#f8fafc] px-4 py-3 text-xs font-bold text-[#003178] outline-none focus:ring-1 focus:ring-[#003178]"
                autoComplete="one-time-code"
                placeholder="输入注册或上次重置时保存的账号恢复码"
              />
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10.5px] font-bold leading-5 text-amber-800">
                本产品不依赖邮箱找回密码。恢复码只显示一次，服务端只保存哈希，重置成功后旧恢复码会立即失效。
              </p>
            </div>
          )}

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
            {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : mode === 'register' || mode === 'invitation' ? <UserPlus className="h-4 w-4" /> : mode === 'reset' ? <KeyRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {mode === 'register' ? '创建云端账号' : mode === 'login' ? '登录云端账号' : mode === 'reset' ? '用恢复码重置密码' : '接受邀请并加入团队'}
          </button>

          {authError && (
            <div
              data-testid="saas-auth-error"
              role="alert"
              aria-live="assertive"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-700"
            >
              {authError}
            </div>
          )}

          {mode !== 'invitation' && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-black">
              {mode !== 'login' && (
                <button type="button" onClick={() => setMode('login')} className="text-[#003178]">
                  返回登录
                </button>
              )}
              {mode !== 'register' && (
                <button type="button" onClick={() => setMode('register')} className="text-[#003178]">
                  使用邀请码注册
                </button>
              )}
              {mode !== 'reset' && (
                <button type="button" onClick={() => setMode('reset')} className="text-[#667085]">
                  忘记密码
                </button>
              )}
            </div>
          )}

          {mode === 'login' && (
            <p className="text-center text-[10.5px] font-bold text-[#5d6472]">
              忘记密码时，请使用注册或上次重置时保存的恢复码。
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
              <span className="rounded-full bg-white px-3 py-1 text-[#003178] border border-[#dbeafe]">团队席位 {account.entitlements.teamSeats} 人</span>
            </div>
            <button
              type="button"
              onClick={handleGenerateRecoveryCode}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfe6f2] bg-white px-3 py-2 text-[10px] font-black text-[#003178] hover:bg-[#eef7fc] disabled:text-gray-400"
            >
              <KeyRound className="h-3.5 w-3.5" />
              生成新的账号恢复码
            </button>
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

          <section className="rounded-3xl border border-[#cfe6f2] bg-[#f7fbff] p-3 sm:p-4">
            <button
              data-testid="saas-ops-toggle"
              type="button"
              onClick={() => setShowOperations((current) => !current)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span>
                <span className="block text-xs font-black text-[#003178]">团队与数据管理（高级）</span>
                <span className="mt-1 block text-[10.5px] font-bold leading-5 text-[#434652]">
                  展开后可邀请成员、管理内容授权、处理数据权利请求并查看聚合观测。
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-[#003178] transition ${showOperations ? 'rotate-180' : ''}`} />
            </button>

            {showOperations && (
              <div className="mt-4">
                <SaasOperationsPanel
                  token={token}
                  account={account}
                  onStatus={setStatusText}
                />
              </div>
            )}
          </section>
        </div>
      )}

      {oneTimeRecoveryCode && (
        <div data-testid="saas-recovery-code" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-black text-amber-900">账号恢复码仅显示一次</p>
              <p className="mt-1 text-[10px] font-bold leading-5 text-amber-800">
                请保存在密码管理器中。忘记密码时需要它；生成新码后旧码会失效。
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(oneTimeRecoveryCode)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-900 px-3 py-2 text-[10px] font-black text-white"
            >
              <Copy className="h-3.5 w-3.5" />
              复制
            </button>
          </div>
          <code className="block select-all rounded-xl bg-white px-3 py-2 text-[11px] font-black text-[#003178] break-all border border-amber-100">
            {oneTimeRecoveryCode}
          </code>
          {account && onAuthenticated && (
            <button
              data-testid="saas-enter-app"
              type="button"
              onClick={() => {
                const currentToken = latestTokenRef.current ?? token ?? getStoredAuthToken();
                if (currentToken) setStoredAuthToken(currentToken, true);
                onAuthenticated();
              }}
              className="w-full rounded-xl bg-[#003178] px-4 py-3 text-xs font-black text-white hover:bg-[#07244f]"
            >
              我已保存恢复码，进入学习舱
            </button>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl bg-[#eef7fc] border border-[#d2e2ec] p-3">
        <ShieldCheck className="h-4 w-4 text-[#003178] shrink-0 mt-0.5" />
        <p className="text-[10.5px] leading-5 font-bold text-[#434652]">{statusText}</p>
      </div>
    </div>
  );
}
