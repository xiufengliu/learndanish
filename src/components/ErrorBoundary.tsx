import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      errorInfo
    });
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <DefaultErrorFallback 
          error={this.state.error} 
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const handleClearData = () => {
    if (window.confirm('This will clear all app data. Are you sure?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="error-boundary-fallback">
      <div className="error-boundary-content">
        <h1>Oops! Something went wrong</h1>
        <p className="error-message">
          We encountered an unexpected error. Don't worry, your progress is saved.
        </p>
        <details className="error-details">
          <summary>Error details</summary>
          <pre>{error.message}</pre>
          <pre>{error.stack}</pre>
        </details>
        <div className="error-actions">
          <button onClick={resetError} className="primary-button">
            Try Again
          </button>
          <button onClick={() => window.location.reload()} className="secondary-button">
            Reload Page
          </button>
          <button onClick={handleClearData} className="danger-button">
            Clear All Data & Reset
          </button>
        </div>
      </div>
    </div>
  );
};
