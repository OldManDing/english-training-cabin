import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { trackClientError } from '../lib/telemetry';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  props: AppErrorBoundaryProps;
  state: AppErrorBoundaryState;

  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    trackClientError(error, {
      source: 'react_error_boundary',
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-page-surface flex min-h-[100svh] items-center justify-center bg-[#f4f6f8] px-4 py-6">
        <section className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-5 text-center shadow-sm">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-700">
            <TriangleAlert className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-lg font-black text-[#101828]">页面暂时无法继续</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#434652]">
            已记录前端错误。刷新后可以继续学习；如果重复出现，请在设置页反馈入口提交问题。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#003178] px-4 text-xs font-black text-white transition hover:bg-[#0d47a1]"
          >
            <RefreshCw className="h-4 w-4" />
            刷新页面
          </button>
        </section>
      </main>
    );
  }
}
