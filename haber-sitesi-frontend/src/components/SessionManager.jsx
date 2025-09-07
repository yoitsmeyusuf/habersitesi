// Session Management Component
import React, { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import { initializeSessionManagement } from '../utils/security'

const SessionManager = ({ children }) => {
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [countdownInterval, setCountdownInterval] = useState(null)

  // Handle session warning
  const handleSessionWarning = useCallback((event) => {
    const { timeLeft } = event.detail
    setTimeLeft(Math.floor(timeLeft / 1000)) // Convert to seconds
    setShowWarning(true)
    
    // Start countdown
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setShowWarning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    setCountdownInterval(interval)
  }, [])

  // Handle session expiry
  const handleSessionExpired = useCallback((event) => {
    setShowWarning(false)
    if (countdownInterval) {
      clearInterval(countdownInterval)
    }
    
    // Show expired message
    alert(event.detail.message)
  }, [countdownInterval])

  // Extend session
  const extendSession = useCallback(() => {
    const extended = api.extendSession()
    if (extended) {
      setShowWarning(false)
      if (countdownInterval) {
        clearInterval(countdownInterval)
        setCountdownInterval(null)
      }
    }
  }, [countdownInterval])

  // Logout immediately
  const logoutNow = useCallback(() => {
    api.logout()
    setShowWarning(false)
    if (countdownInterval) {
      clearInterval(countdownInterval)
    }
    window.location.href = '/giris'
  }, [countdownInterval])

  useEffect(() => {
    // Initialize session management when component mounts
    initializeSessionManagement()

    // Add event listeners
    window.addEventListener('sessionWarning', handleSessionWarning)
    window.addEventListener('sessionExpired', handleSessionExpired)

    // Cleanup on unmount
    return () => {
      window.removeEventListener('sessionWarning', handleSessionWarning)
      window.removeEventListener('sessionExpired', handleSessionExpired)
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
    }
  }, [handleSessionWarning, handleSessionExpired, countdownInterval])

  // Format time for display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      {children}
      
      {/* Session Warning Modal */}
      {showWarning && (
        <div className="session-warning-overlay">
          <div className="session-warning-modal">
            <div className="session-warning-header">
              <h3>⚠️ Oturum Uyarısı</h3>
            </div>
            <div className="session-warning-content">
              <p>Oturumunuz yakında sona erecek.</p>
              <p className="countdown">
                Kalan süre: <strong>{formatTime(timeLeft)}</strong>
              </p>
              <p>Devam etmek istiyor musunuz?</p>
            </div>
            <div className="session-warning-actions">
              <button 
                onClick={extendSession}
                className="btn-extend"
              >
                Evet, Devam Et
              </button>
              <button 
                onClick={logoutNow}
                className="btn-logout"
              >
                Hayır, Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .session-warning-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        }

        .session-warning-modal {
          background: white;
          border-radius: 8px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .session-warning-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .session-warning-header h3 {
          color: #e74c3c;
          margin: 0;
          font-size: 1.5rem;
        }

        .session-warning-content {
          text-align: center;
          margin-bottom: 24px;
        }

        .session-warning-content p {
          margin: 8px 0;
          color: #555;
        }

        .countdown {
          font-size: 1.2rem;
          color: #e74c3c !important;
        }

        .countdown strong {
          font-family: 'Courier New', monospace;
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #dee2e6;
        }

        .session-warning-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .btn-extend, .btn-logout {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          min-width: 120px;
        }

        .btn-extend {
          background-color: #28a745;
          color: white;
        }

        .btn-extend:hover {
          background-color: #218838;
          transform: translateY(-1px);
        }

        .btn-logout {
          background-color: #dc3545;
          color: white;
        }

        .btn-logout:hover {
          background-color: #c82333;
          transform: translateY(-1px);
        }

        @media (max-width: 480px) {
          .session-warning-modal {
            margin: 20px;
            padding: 20px;
          }

          .session-warning-actions {
            flex-direction: column;
          }

          .btn-extend, .btn-logout {
            width: 100%;
            min-width: auto;
          }
        }
      `}} />
    </>
  )
}

export default SessionManager
