import React, { useEffect, useState } from 'react';
import { GraduationCap, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import SaasAccountPanel, { PublicSaasAccountContext } from './SaasAccountPanel';
import { apiRequest, AUTH_STATE_CHANGE_EVENT, clearStoredAuthToken, getStoredAuthToken } from '../lib/api';

interface AuthGateProps {
  children: React.ReactNode;
}

type AuthGateState = 'checking' | 'authenticated' | 'anonymous';

export default function AuthGate({ children }: AuthGateProps) {
  const [state, setState] = useState<AuthGateState>('checking');

  useEffect(() => {
    let mounted = true;

    async function verifySession() {
      const token = getStoredAuthToken();
      if (!token) {
        setState('anonymous');
        return;
      }

      try {
        const payload = await apiRequest<{ authenticated: boolean; account: PublicSaasAccountContext | null }>(
          '/api/auth/session',
          {},
          token,
        );
        if (!mounted) return;
        if (payload.authenticated && payload.account) {
          setState('authenticated');
          return;
        }
        clearStoredAuthToken();
        setState('anonymous');
      } catch {
        if (!mounted) return;
        clearStoredAuthToken();
        setState('anonymous');
      }
    }

    void verifySession();

    const handleAuthStateChange = (event: Event) => {
      const detail = (event as CustomEvent<{ authenticated?: boolean }>).detail;
      setState(detail?.authenticated ? 'authenticated' : 'anonymous');
    };
    window.addEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthStateChange);

    return () => {
      mounted = false;
      window.removeEventListener(AUTH_STATE_CHANGE_EVENT, handleAuthStateChange);
    };
  }, []);

  if (state === 'checking') {
    return (
      <div className="min-h-[100svh] bg-[#f4f6f8] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-[#d9dee7] bg-white px-6 py-5 shadow-sm flex items-center gap-3 text-[#003178]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-black">正在校验登录状态...</span>
        </div>
      </div>
    );
  }

  if (state === 'authenticated') {
    return <>{children}</>;
  }

  return (
    <main className="min-h-[100svh] bg-[#f4f6f8] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-md flex-col justify-center gap-5">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d9dee7] bg-white text-[#003178] shadow-sm">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[#d9dee7] bg-white px-3 py-1 text-[11px] font-black text-[#003178]">
              <LockKeyhole className="h-3.5 w-3.5" />
              账号密码登录
            </p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-[#101828] sm:text-3xl">
              英语训练舱
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#5d6675]">
              输入账号密码进入。新用户需要邀请码注册。
            </p>
          </div>
        </header>

        <SaasAccountPanel onAuthenticated={() => setState('authenticated')} />

        <p className="flex items-center justify-center gap-2 text-center text-[11px] font-bold text-[#667085]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#1f7a4d]" />
          服务端校验会话与邀请码，防止未授权使用。
        </p>
      </div>
    </main>
  );
}
