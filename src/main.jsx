import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#ea5455', padding: '20px', background: '#080614', minHeight: '100vh' }}>
          <h1 style={{ color: '#ea5455' }}>App Crashed!</h1>
          <p>Please send this error to the agent:</p>
          <pre style={{ background: 'rgba(234, 84, 85, 0.1)', padding: '16px', borderRadius: '8px', overflowX: 'auto', color: '#ea5455', fontSize: '14px' }}>
            {this.state.error?.toString()}
            <br />
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
