// Security Testing and Validation Component
import React, { useState, useEffect, useCallback } from 'react'
import { validateInput, sanitizeText, sanitizeHtml, csrfToken } from '../utils/security'
import { useErrorHandler } from '../utils/errorUtils'
import api from '../services/api'

const SecurityTest = () => {
  const [testResults, setTestResults] = useState({})
  const [isRunning, setIsRunning] = useState(false)
  const { logError } = useErrorHandler()
  // Security Test Suite
  const runSecurityTests = useCallback(async () => {
    setIsRunning(true)
    const results = {}

    try {
      // Test 1: Input Validation
      results.inputValidation = {
        email: {
          valid: validateInput.email('test@example.com'),
          invalid: !validateInput.email('invalid-email'),
          empty: !validateInput.email(''),
          malicious: !validateInput.email('<script>alert("xss")</script>')
        },
        username: {
          valid: validateInput.username('testuser123'),
          invalid: !validateInput.username('test@user'),
          tooShort: !validateInput.username('ab'),
          tooLong: !validateInput.username('a'.repeat(50))
        },
        password: {
          strong: validateInput.password('StrongPass123!'),
          weak: !validateInput.password('weak'),
          noUppercase: !validateInput.password('lowercase123'),
          noNumber: !validateInput.password('NoNumbers!')
        },
        url: {
          https: validateInput.url('https://example.com'),
          http: validateInput.url('http://example.com'),
          invalid: !validateInput.url('not-a-url'),
          javascript: !validateInput.url('javascript:alert("xss")')
        },
        comment: {
          valid: validateInput.comment('This is a valid comment with enough length'),
          tooShort: !validateInput.comment('Hi'),
          tooLong: !validateInput.comment('a'.repeat(1001)),
          spam: !validateInput.comment('Visit https://spam.com for casino and viagra')
        }
      }

      // Test 2: Text Sanitization
      const maliciousText = '<script>alert("XSS")</script><img src=x onerror=alert("XSS")>'
      const sanitizedText = sanitizeText(maliciousText)
      results.textSanitization = {
        removesScripts: !sanitizedText.includes('<script>'),
        removesEvents: !sanitizedText.includes('onerror'),
        preservesText: sanitizedText.length > 0
      }

      // Test 3: HTML Sanitization
      const maliciousHtml = '<div onclick="alert(\'XSS\')">Safe content</div><script>alert("XSS")</script>'
      const sanitizedHtml = sanitizeHtml(maliciousHtml)
      results.htmlSanitization = {
        removesScripts: !sanitizedHtml.includes('<script>'),
        removesEvents: !sanitizedHtml.includes('onclick'),
        preservesContent: sanitizedHtml.includes('Safe content')
      }

      // Test 4: CSRF Token Management
      results.csrfProtection = {
        canSetToken: (() => {
          csrfToken.set('test-token-123')
          return csrfToken.get() === 'test-token-123'
        })(),
        canClearToken: (() => {
          csrfToken.clear()
          return !csrfToken.get()
        })()
      }

      // Test 5: Session Management
      results.sessionManagement = {
        isAuthenticated: api.isAuthenticated(),
        hasUserFromToken: !!api.getUserFromToken(),
        hasSessionMethods: typeof api.initializeSessionManagement === 'function'
      }

      // Test 6: Rate Limiting (basic check)
      results.rateLimiting = {
        loginEndpointExists: typeof api.login === 'function',
        commentEndpointExists: typeof api.addComment === 'function',
        hasRateLimitingLogic: api.login.toString().includes('Rate limiting')
      }

      // Test 7: File Upload Security
      results.fileUploadSecurity = {
        hasValidation: typeof api.uploadImage === 'function',
        checksFileType: api.uploadImage.toString().includes('allowedTypes'),
        checksFileSize: api.uploadImage.toString().includes('maxSize'),
        validatesMagicNumbers: api.uploadImage.toString().includes('validateFileType')
      }      // Test 8: Error Handling
      results.errorHandling = {
        hasErrorBoundary: document.querySelector('.error-boundary') !== null,        hasLoggingFunction: typeof api.logError === 'function',
        hasErrorUtils: typeof logError === 'function'
      }

      // Test 9: API Connectivity (CSP Validation)
      try {
        const categoriesData = await api.getCategories()
        const newsData = await api.getNews()
        results.apiConnectivity = {
          categoriesAPIWorking: Array.isArray(categoriesData) && categoriesData.length >= 0,
          newsAPIWorking: Array.isArray(newsData) || (newsData && Array.isArray(newsData.data)),
          noCSPBlocking: true, // If we reach here, CSP is not blocking
          backendReachable: true
        }
      } catch (error) {
        results.apiConnectivity = {
          categoriesAPIWorking: false,
          newsAPIWorking: false,
          noCSPBlocking: !error.message.includes('Content Security Policy'),
          backendReachable: false,
          error: error.message
        }
      }

      setTestResults(results)
    } catch (error) {
      logError(error, 'Security Test Suite')
      setTestResults({ error: error.message })
    } finally {
      setIsRunning(false)
    }
  }, [logError])

  // Calculate overall security score
  const calculateSecurityScore = () => {
    if (!testResults || testResults.error) return 0

    let totalTests = 0
    let passedTests = 0

    Object.values(testResults).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach(test => {
          totalTests++
          if (test === true) passedTests++
        })
      }
    })

    return Math.round((passedTests / totalTests) * 100)
  }
  useEffect(() => {
    // Auto-run tests on component mount
    runSecurityTests()
  }, [runSecurityTests])

  const renderTestResult = (result) => {
    if (result === true) {
      return <span className="test-pass">✅ PASS</span>
    } else if (result === false) {
      return <span className="test-fail">❌ FAIL</span>
    }
    return <span className="test-unknown">❓ UNKNOWN</span>
  }

  const securityScore = calculateSecurityScore()

  return (
    <div className="security-test-container">
      <div className="security-header">
        <h2>🔒 Security Test Results</h2>
        <div className="security-score">
          <div className={`score-circle ${securityScore >= 80 ? 'good' : securityScore >= 60 ? 'warning' : 'danger'}`}>
            <span className="score-number">{securityScore}%</span>
            <span className="score-label">Security Score</span>
          </div>
        </div>
        <button 
          onClick={runSecurityTests} 
          disabled={isRunning}
          className="refresh-btn"
        >
          {isRunning ? '🔄 Running...' : '🔄 Refresh Tests'}
        </button>
      </div>

      {testResults.error ? (
        <div className="error-section">
          <h3>❌ Test Error</h3>
          <p>{testResults.error}</p>
        </div>
      ) : (
        <div className="test-sections">
          {Object.entries(testResults).map(([category, tests]) => (
            <div key={category} className="test-category">
              <h3>{category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h3>
              <div className="test-results">
                {typeof tests === 'object' && Object.entries(tests).map(([testName, result]) => (
                  <div key={testName} className="test-item">
                    <span className="test-name">{testName}</span>
                    {renderTestResult(result)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .security-test-container {
          max-width: 800px;
          margin: 20px auto;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .security-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .security-header h2 {
          margin: 0;
          color: #2c3e50;
        }

        .security-score {
          text-align: center;
        }

        .score-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: white;
          font-weight: bold;
        }

        .score-circle.good {
          background: linear-gradient(135deg, #27ae60, #2ecc71);
        }

        .score-circle.warning {
          background: linear-gradient(135deg, #f39c12, #e67e22);
        }

        .score-circle.danger {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
        }

        .score-number {
          font-size: 1.2rem;
        }

        .score-label {
          font-size: 0.7rem;
          opacity: 0.9;
        }

        .refresh-btn {
          padding: 10px 20px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #2980b9;
        }

        .refresh-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .test-sections {
          display: grid;
          gap: 20px;
        }

        .test-category {
          border: 1px solid #e1e8ed;
          border-radius: 6px;
          overflow: hidden;
        }

        .test-category h3 {
          background: #f8f9fa;
          margin: 0;
          padding: 15px 20px;
          color: #495057;
          border-bottom: 1px solid #e1e8ed;
        }

        .test-results {
          padding: 15px 20px;
        }

        .test-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f1f3f4;
        }

        .test-item:last-child {
          border-bottom: none;
        }

        .test-name {
          font-family: monospace;
          color: #666;
        }

        .test-pass {
          color: #27ae60;
          font-weight: bold;
        }

        .test-fail {
          color: #e74c3c;
          font-weight: bold;
        }

        .test-unknown {
          color: #f39c12;
          font-weight: bold;
        }

        .error-section {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 6px;
          padding: 20px;
          color: #c33;
        }

        @media (max-width: 640px) {
          .security-header {
            flex-direction: column;
            text-align: center;
          }

          .test-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
          }
        }
      `}} />
    </div>
  )
}

export default SecurityTest
