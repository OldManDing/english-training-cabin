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
      <div className="min-h-[100svh] bg-[radial-gradient(circle_at_18%_18%,#dff4ff,transparent_32%),linear-gradient(135deg,#f8fcff_0%,#eaf6ef_100%)] flex items-center justify-center p-6">
        <div className="rounded-3xl border border-white/70 bg-white/85 px-6 py-5 shadow-xl flex items-center gap-3 text-[#003178]">
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
    <main className="min-h-[100svh] bg-[radial-gradient(circle_at_top_left,#cfeeff,transparent_34%),radial-gradient(circle_at_85%_18%,#d7f5df,transparent_24%),linear-gradient(135deg,#f8fcff_0%,#eef7fc_48%,#ffffff_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100svh-2rem)] max-w-6xl grid-cols-1 items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[#003178] p-6 text-white shadow-2xl sm:p-8 lg:p-10">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 left-8 h-44 w-44 rounded-full bg-emerald-300/20" />
          <div className="relative space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black">
              <LockKeyhole className="h-4 w-4 text-emerald-200" />
              账号密码保护已启用
            </div>
            <div>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#003178] shadow-lg">
                <GraduationCap className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">
                登录后进入英语训练舱
              </h1>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-white/82">
                为防止未授权访问和 AI 接口滥用，学习舱需要账号密码登录。账号用于隔离学习数据、云端备份、设备会话和恢复码。
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 text-xs font-bold sm:grid-cols-3">
              {[
                '服务端校验会话',
                'AI 接口强制登录',
                '恢复码不明文落库',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/15 bg-white/10 p-3">
                  <ShieldCheck className="mb-2 h-4 w-4 text-emerald-200" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <SaasAccountPanel onAuthenticated={() => setState('authenticated')} />
        </section>
      </div>
    </main>
  );
}
