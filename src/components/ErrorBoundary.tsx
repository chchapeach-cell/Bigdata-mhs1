import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare props: Props;
  declare state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React render:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReload = () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFF9F5',
          color: '#33272A',
          fontFamily: "'Prompt', 'Sarabun', sans-serif",
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '500px',
            backgroundColor: '#ffffff',
            border: '3px solid #33272A',
            borderRadius: '1.5rem',
            padding: '2rem',
            boxShadow: '4px 4px 0px 0px #33272A'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.75rem' }}>
              เกิดข้อผิดพลาดในการโหลดระบบ (System Error)
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              ระบบพบข้อผิดพลาดชั่วคราวในการประมวลผลคำสั่ง
            </p>
            {this.state.error && (
              <div style={{
                backgroundColor: '#FFF0F3',
                border: '1px solid #FF8BA7',
                borderRadius: '0.75rem',
                padding: '0.75rem',
                fontSize: '0.75rem',
                color: '#C01C47',
                fontFamily: 'monospace',
                marginBottom: '1.5rem',
                wordBreak: 'break-word',
                textAlign: 'left'
              }}>
                {this.state.error.toString()}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  backgroundColor: '#A0E7E5',
                  color: '#33272A',
                  border: '2px solid #33272A',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.75rem',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0px 0px #33272A'
                }}
              >
                🔄 โหลดหน้าเว็บใหม่
              </button>
              <button
                onClick={this.handleClearCacheAndReload}
                style={{
                  backgroundColor: '#FF8BA7',
                  color: '#33272A',
                  border: '2px solid #33272A',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.75rem',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0px 0px #33272A'
                }}
              >
                🧹 ล้างแคชแล้วเริ่มใหม่
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
