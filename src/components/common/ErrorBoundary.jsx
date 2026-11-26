import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

/**
 * Defensive UI ErrorBoundary so any transient render exception displays
 * a safe recovery banner rather than a blank white page, without touching database records.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected UI error occurred.',
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[StockLine UI ErrorBoundary]:', error, errorInfo);
  }

  handleRecover = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          <div className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">সাময়িক প্রদর্শন ত্রুটি (UI Recovery Mode)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                আপনার সকল MongoDB ও ব্যবসায়িক ডেটা সম্পূর্ণ নিরাপদ আছে। নিচের বাটনে ক্লিক করে পেজ রিকভার করুন।
              </p>
              {this.state.errorMessage && (
                <p className="text-[11px] font-mono text-red-600 dark:text-red-400 bg-red-50/70 dark:bg-red-950/30 p-2 rounded-lg mt-2 break-words">
                  {this.state.errorMessage}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleRecover}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>পুনরায় চেষ্টা করুন (Recover View)</span>
              </button>
              <a
                href="/dashboard"
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Home className="h-3.5 w-3.5" />
                <span>ড্যাশবোর্ড</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
