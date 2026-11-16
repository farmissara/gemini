import React from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';
import { AppLanguage } from '../../types';

interface ViewErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: string | number;
  lang?: AppLanguage;
  viewName?: string;
  onBackHome?: () => void;
}

interface ViewErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ViewErrorBoundary extends React.Component<ViewErrorBoundaryProps, ViewErrorBoundaryState> {
  constructor(props: ViewErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: unknown): ViewErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error || 'Unexpected error');
    return {
      hasError: true,
      errorMessage: message,
    };
  }

  componentDidUpdate(prevProps: ViewErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  componentDidCatch(error: unknown) {
    console.error(`[ViewErrorBoundary${this.props.viewName ? `:${this.props.viewName}` : ''}]`, error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isTh = (this.props.lang || 'th') === 'th';

    return (
      <div className="w-full min-h-[280px] h-full flex items-center justify-center p-4 bg-[var(--color-canvas)] text-[var(--color-text-body)]">
        <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-extrabold text-[var(--color-text-title)]">
              {isTh ? 'ไม่สามารถแสดงหน้านี้ได้ชั่วคราว' : 'Unable to display this section'}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              {isTh
                ? 'เกิดข้อผิดพลาดระหว่างเปิดฟังก์ชันบนหน้าจอนี้ คุณสามารถกดลองใหม่หรือกลับหน้าหลักได้ทันที'
                : 'A rendering error occurred in this view. You can retry or return home safely.'}
            </p>
            {this.state.errorMessage && (
              <p className="mt-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text-muted)] break-words">
                {this.state.errorMessage}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold transition cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isTh ? 'ลองเปิดใหม่อีกครั้ง' : 'Try Again'}</span>
            </button>
            {this.props.onBackHome && (
              <button
                type="button"
                onClick={() => {
                  this.handleRetry();
                  this.props.onBackHome?.();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-card)] text-[var(--color-text-title)] text-xs font-bold transition cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>{isTh ? 'กลับหน้าหลัก' : 'Back Home'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
