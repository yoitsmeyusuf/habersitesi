// Error Boundary Component with Logging
import React from 'react'
import { logError } from '../utils/security'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    })

    // Log to API service
    logError(`React Error Boundary: ${this.props.context || 'Unknown'}`, error)

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error Boundary caught an error:', error, errorInfo)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h2>Bir Hata Oluştu</h2>
            <p>Üzgünüz, beklenmeyen bir hata oluştu.</p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary>Hata Detayları (Geliştirici Modu)</summary>
                <pre className="error-trace">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            
            <div className="error-actions">
              <button onClick={this.handleRetry} className="btn-retry">
                Tekrar Dene
              </button>
              <button onClick={this.handleReload} className="btn-reload">
                Sayfayı Yenile
              </button>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            .error-boundary {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 400px;
              padding: 20px;
              background-color: #f8f9fa;
            }

            .error-container {
              text-align: center;
              max-width: 500px;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }

            .error-icon {
              font-size: 4rem;
              margin-bottom: 20px;
            }

            .error-container h2 {
              color: #e74c3c;
              margin-bottom: 16px;
              font-size: 1.5rem;
            }

            .error-container p {
              color: #666;
              margin-bottom: 24px;
              line-height: 1.5;
            }

            .error-details {
              text-align: left;
              margin: 20px 0;
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 12px;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 500;
              color: #495057;
              margin-bottom: 8px;
            }

            .error-trace {
              background: #fff;
              border: 1px solid #dee2e6;
              padding: 12px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 0.85rem;
              color: #e74c3c;
              overflow-x: auto;
              white-space: pre-wrap;
              max-height: 200px;
              overflow-y: auto;
            }

            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              flex-wrap: wrap;
            }

            .btn-retry, .btn-reload {
              padding: 10px 20px;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-weight: 500;
              transition: all 0.2s ease;
              min-width: 120px;
            }

            .btn-retry {
              background-color: #28a745;
              color: white;
            }

            .btn-retry:hover {
              background-color: #218838;
              transform: translateY(-1px);
            }

            .btn-reload {
              background-color: #007bff;
              color: white;
            }

            .btn-reload:hover {
              background-color: #0056b3;
              transform: translateY(-1px);
            }

            @media (max-width: 480px) {
              .error-container {
                padding: 24px;
                margin: 10px;
              }

              .error-actions {
                flex-direction: column;
              }

              .btn-retry, .btn-reload {
                width: 100%;
                min-width: auto;
              }
            }
          `}} />
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
