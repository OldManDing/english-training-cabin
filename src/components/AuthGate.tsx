import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import SaasAccountPanel, { PublicSaasAccountContext } from './SaasAccountPanel';
import { apiRequest, AUTH_STATE_CHANGE_EVENT, clearStoredAuthToken, getStoredAuthToken } from '../lib/api';
import { prepareLearningWorkspaceForAccount } from '../lib/storage/db';
import { preparePracticeDraftWorkspaceForAccount } from '../domain/practice/draftProgress';

interface AuthGateProps {
  children: React.ReactNode;
}

type AuthGateState = 'checking' | 'authenticated' | 'anonymous';

export default function AuthGate({ children }: AuthGateProps) {
  const [state, setState] = useState<AuthGateState>('checking');
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);

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
          await prepareLearningWorkspaceForAccount(payload.account.user.id);
          preparePracticeDraftWorkspaceForAccount(payload.account.user.id);
          if (!mounted) return;
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
      <div className="app-page-surface flex min-h-[100svh] items-center justify-center bg-[#f4f6f8] p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-[#d9dee7] bg-white px-5 py-4 text-[#003178] shadow-sm">
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
    <>
      <main className="app-page-surface flex min-h-[100svh] items-center justify-center bg-[#f4f6f8] px-4 py-6 sm:px-6">
        <div className="w-full max-w-[380px] space-y-4">
          <header className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-[#101828]">
              英语训练舱
            </h1>
            <p className="mt-2 text-sm font-semibold text-[#5d6675]">
              登录 / 邀请码注册
            </p>
          </header>

          <SaasAccountPanel
            onAuthenticated={() => setState('authenticated')}
            onTriggerModal={(title, body) => setModalContent({ title, body })}
          />
        </div>
      </main>

      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="flex max-h-[88svh] w-full max-w-md flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-[#003178]">{modalContent.title}</h2>
              <button
                type="button"
                aria-label="关闭提示"
                onClick={() => setModalContent(null)}
                className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-[#003178]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 max-h-[58svh] overflow-y-auto whitespace-pre-line rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 text-xs font-semibold leading-6 text-slate-700">
              {modalContent.body}
            </div>
            <button
              type="button"
              onClick={() => setModalContent(null)}
              className="mt-4 min-h-11 rounded-xl bg-[#003178] px-4 text-xs font-black text-white transition hover:bg-[#0d47a1]"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}
