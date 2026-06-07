import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Cloud, Copy, DownloadCloud, KeyRound, LogIn, LogOut, RefreshCw, ShieldCheck, UploadCloud, UserPlus } from 'lucide-react';
import { exportLearningData, importLearningData } from '../lib/storage/db';
import { apiRequest, clearStoredAuthToken, getStoredAuthToken, setStoredAuthToken } from '../lib/api';
import SaasOperationsPanel from './SaasOperationsPanel';
import LegalLinks from './LegalLinks';

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

const INITIAL_CLOUD_STATUS = '登录后可同步。';
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.querySelector('main')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  const validateAuthForm = () => {
    const normalizedEmail = email.trim();
    const normalizedName = name.trim();
    const normalizedOrganization = organizationName.trim();
    const normalizedInviteCode = inviteCode.trim();
    const normalizedRecoveryCode = recoveryCode.trim();
    const normalizedActionToken = actionToken.trim();

    if ((mode === 'register' || mode === 'invitation') && !normalizedName) {
      return '请输入姓名。';
    }
    if (mode === 'register' && !normalizedOrganization) {
      return '请输入团队或学校名称。';
    }
    if (mode === 'register' && !normalizedInviteCode) {
      return '请输入有效邀请码。';
    }
    if ((mode === 'register' || mode === 'login' || mode === 'reset') && !EMAIL_PATTERN.test(normalizedEmail)) {
      return '请输入有效邮箱。';
    }
    if (mode === 'reset' && !normalizedRecoveryCode) {
      return '请输入账号恢复码。';
    }
    if (mode === 'invitation' && !normalizedActionToken) {
      return '请输入邀请链接中的 token。';
    }
    if (password.length < 8) {
      return '密码至少需要 8 位。';
    }
    return '';
  };

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
            ? '已连接。'
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
    setAuthError('');
    const validationError = validateAuthForm();
    if (validationError) {
      setAuthError(validationError);
      return;
    }

    const normalizedEmail = email.trim();
    const normalizedName = name.trim();
    const normalizedOrganization = organizationName.trim();
    const normalizedInviteCode = inviteCode.trim();
    const normalizedRecoveryCode = recoveryCode.trim();
    const normalizedActionToken = actionToken.trim();

    setIsBusy(true);
    try {
      const endpoint = mode === 'register'
        ? '/api/auth/register'
        : mode === 'login'
          ? '/api/auth/login'
          : mode === 'reset'
            ? '/api/auth/password-reset'
            : '/api/workspace/invitations/accept';
      const body = mode === 'register'
        ? {
            email: normalizedEmail,
            password,
            name: normalizedName,
            organizationName: normalizedOrganization,
            inviteCode: normalizedInviteCode,
          }
        : mode === 'login'
          ? { email: normalizedEmail, password }
          : mode === 'reset'
            ? { email: normalizedEmail, recoveryCode: normalizedRecoveryCode, password }
            : { token: normalizedActionToken, name: normalizedName, password };
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
        register: '账号已创建，请保存恢复码。',
        login: '已登录。',
        invitation: '邀请已接受，您已加入团队。',
        reset: '密码已重置，请保存新恢复码。',
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
      setStatusText('已退出。');
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
      setStatusText('新恢复码已生成，请保存。');
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
      setStatusText(`已同步：练习 ${response.snapshot.counts.practiceSessions} 组，复习 ${response.snapshot.counts.reviewItems} 项。`);
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
        setStatusText('云端暂无数据。');
        return;
      }

      const restored = await importLearningData(response.snapshot.backup);
      await onDataRestored?.();
      const summary = `已恢复：目标 ${restored.studyGoals} 项、练习 ${restored.practiceSessions} 组、复习 ${restored.reviewItems} 项、画像 ${restored.skillProfiles} 项。`;
      onTriggerModal?.('云端学习数据恢复完成', summary);
      setStatusText(summary);
    } catch (error) {
      setStatusText(getApiMessage(error));
    } finally {
      setIsBusy(false);
    }
  };

  const modeTitle =
    mode === 'register'
      ? '邀请码注册'
      : mode === 'reset'
        ? '重置密码'
        : mode === 'invitation'
          ? '接受邀请'
          : '登录';
  const showStatus = Boolean(account || oneTimeRecoveryCode || statusText !== INITIAL_CLOUD_STATUS);

  return (
    <div className="space-y-3 rounded-[1.5rem] border border-[#dde5ee] bg-white p-4 shadow-sm sm:p-5">
      {account && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-[#003178] flex items-center gap-2">
              <Cloud className="h-4 w-4 text-[#003178]" />
              账户
            </h3>
            <p className="mt-1 text-[11px] font-semibold text-[#434652]">
              同步与团队
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700 border border-emerald-100">
            {formatAccountState(account)}
          </span>
        </div>
      )}

      {!account ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAuthSubmit();
          }}
        >
          {(mode === 'register' || mode === 'login' || mode === 'reset') ? (
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-[#101828]">
                {modeTitle}
              </h2>
              <div className="flex shrink-0 flex-wrap gap-2">
                {mode !== 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="min-h-[44px] rounded-full border border-[#d9dee7] bg-white px-3 text-[11px] font-black text-[#003178] transition hover:border-[#003178]"
                  >
                    返回登录
                  </button>
                )}
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="min-h-[44px] rounded-full border border-[#d9dee7] bg-white px-3 text-[11px] font-black text-[#003178] transition hover:border-[#003178]"
                  >
                    邀请码注册
                  </button>
                )}
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="min-h-[44px] rounded-full border border-[#d9dee7] bg-white px-3 text-[11px] font-black text-[#5d6675] transition hover:border-[#5d6675]"
                  >
                    忘记密码
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#d2e2ec] bg-[#eef7fc] p-3">
              <p className="text-[10.5px] font-black text-[#003178]">
                接受团队邀请
              </p>
              <button type="button" onClick={() => setMode('login')} className="ui-button ui-button-secondary ui-button-compact">返回登录</button>
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
              placeholder="邮箱"
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
                placeholder="账号恢复码"
              />
              <p className="text-[10.5px] font-bold text-amber-800">恢复码仅显示一次。</p>
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
            className="ui-button ui-button-primary ui-button-full"
          >
            {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : mode === 'register' || mode === 'invitation' ? <UserPlus className="h-4 w-4" /> : mode === 'reset' ? <KeyRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {mode === 'register' ? '创建账号' : mode === 'login' ? '登录' : mode === 'reset' ? '重置密码' : '接受邀请'}
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

          <div className="rounded-2xl border border-[#cfe6f2] bg-[#f7fbff] p-3 text-center">
            <p className="mb-2 text-[10.5px] font-bold leading-5 text-[#434652]">
              注册或登录即表示你已了解本地数据、云同步、AI 反馈和内容来源边界。
            </p>
            <LegalLinks onOpen={onTriggerModal} compact />
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2 rounded-2xl border border-[#cfe6f2] bg-[#f7fbff] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black text-[#003178]">{account.user.name}</p>
                <p className="text-[10px] font-bold text-[#434652]">{account.user.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="ui-button ui-button-muted ui-button-compact"
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
              className="ui-button ui-button-secondary ui-button-compact"
            >
              <KeyRound className="h-3.5 w-3.5" />
              生成新恢复码
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCloudBackup}
              disabled={isBusy || !account.entitlements.cloudSync}
              className="ui-button ui-button-primary ui-button-full"
            >
              <UploadCloud className="h-4 w-4" />
              同步到云端
            </button>
            <button
              type="button"
              onClick={handleCloudRestore}
              disabled={isBusy}
              className="ui-button ui-button-secondary ui-button-full"
            >
              <DownloadCloud className="h-4 w-4" />
              从云端恢复
            </button>
          </div>

          <section className="rounded-2xl border border-[#cfe6f2] bg-[#f7fbff] p-3 sm:p-4">
            <button
              data-testid="saas-ops-toggle"
              type="button"
              onClick={() => setShowOperations((current) => !current)}
              className="ui-button ui-button-secondary ui-button-full justify-between text-left"
            >
              <span className="block text-xs font-black text-[#003178]">团队与数据管理（高级）</span>
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
        <div data-testid="saas-recovery-code" className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-black text-amber-900">恢复码仅显示一次</p>
              <p className="mt-1 text-[10px] font-bold leading-5 text-amber-800">请保存。</p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(oneTimeRecoveryCode)}
              className="ui-button ui-button-warning ui-button-compact"
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
              className="ui-button ui-button-primary ui-button-full"
            >
              已保存，进入学习舱
            </button>
          )}
        </div>
      )}

      {showStatus && (
        <div className="flex items-start gap-2 rounded-2xl border border-[#d2e2ec] bg-[#f8fafc] px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-[#003178] shrink-0 mt-0.5" />
          <p className="text-[10.5px] leading-5 font-bold text-[#434652]">{statusText}</p>
        </div>
      )}
    </div>
  );
}
