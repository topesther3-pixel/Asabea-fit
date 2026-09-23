import { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ASABEA FIT Root Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FAF9F6] text-[#252525] text-center font-sans">
          <div className="max-w-xs bg-white rounded-3xl p-7 shadow-xl border border-[#FCECEF] space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FCECEF] text-[#E96A8D] flex items-center justify-center mx-auto text-2xl font-bold">
              🌸
            </div>
            <h1 className="text-lg font-extrabold text-[#252525]">ASABEA FIT</h1>
            <p className="text-xs text-gray-500 leading-relaxed">
              Something interrupted the view. Tap below to reload your journey.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-2xl bg-[#E96A8D] text-white font-bold text-xs shadow-md shadow-[#E96A8D]/25 active:scale-95 transition cursor-pointer"
            >
              Refresh App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
