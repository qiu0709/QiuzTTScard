import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './FullFlashcardApp.jsx'

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Root render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: 760,
            width: '100%',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20
          }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: 22 }}>頁面載入失敗</h1>
            <p style={{ margin: '0 0 10px 0', color: '#475569' }}>
              已捕捉到前端錯誤，請把下方訊息貼給我，我會直接修。
            </p>
            <pre style={{
              margin: 0,
              padding: 12,
              background: '#f1f5f9',
              borderRadius: 8,
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {String(this.state.error?.stack || this.state.error || 'Unknown error')}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
)
