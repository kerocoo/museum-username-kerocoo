import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'Terjadi kesalahan pada aplikasi.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let friendly = 'Terjadi gangguan sementara saat memuat gallery.';
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          friendly = `Akses data terkendala: ${parsed.error}`;
        }
      } catch {
        if (this.state.message) {
          friendly = this.state.message;
        }
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#1f3314] text-white">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 text-center space-y-4">
            <h2 className="font-display-serif text-2xl font-bold">
              Gallery @kerocoo
            </h2>
            <p className="text-sm text-white/85 leading-relaxed">{friendly}</p>
            <button
              type="button"
              onClick={this.handleReset}
              className="glass-pill px-6 py-2.5 rounded-full text-sm font-semibold text-white cursor-pointer"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
