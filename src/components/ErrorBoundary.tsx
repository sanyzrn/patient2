// Fix 1.9: ErrorBoundary with self-reset capability
import React, { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { withTranslation, WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        this.props.fallback || (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-skin-overlay backdrop-blur-md">
            <div className="bg-skin-card p-8 rounded-2xl shadow-xl border border-skin-border w-full max-w-md text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-red-50 rounded-full text-red-600">
                  <AlertTriangle size={32} />
                </div>
              </div>
              <h2 className="text-xl font-bold text-skin-text mb-2">{t('errorBoundary.title')}</h2>
              <p className="text-skin-muted text-sm mb-6">
                {t('errorBoundary.message')}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-5 py-2 bg-skin-control-bg hover:bg-skin-control-hover text-skin-control-text rounded-lg font-medium transition-colors"
                >
                  <RotateCcw size={16} />
                  {t('errorBoundary.retry')}
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-5 py-2 bg-skin-primary hover:bg-skin-primary-hover text-white rounded-lg font-medium transition-colors"
                >
                  <RefreshCw size={16} />
                  {t('errorBoundary.reload')}
                </button>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
