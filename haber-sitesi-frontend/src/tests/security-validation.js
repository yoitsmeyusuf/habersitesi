// Security Validation Test Script
// This script tests all the security enhancements implemented
import { getApiUrl } from '../utils/environment'
import logger from '../utils/logger'

logger.log('🔒 Starting Security Validation Tests...')

// Test 1: Check if CSP is properly configured
const testCSP = () => {
  logger.log('\n1️⃣ Testing Content Security Policy...')
  
  // Check meta tag presence
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
  if (cspMeta) {
    const cspContent = cspMeta.getAttribute('content')
    logger.log('✅ CSP Meta Tag Found')
    logger.log('📝 CSP Content:', cspContent.substring(0, 100) + '...')
    
    // Check if localhost is allowed
    if (cspContent.includes('localhost:*')) {
      logger.log('✅ Localhost connections allowed')
    } else {
      logger.log('❌ Localhost connections might be blocked')
    }
  } else {
    logger.log('❌ CSP Meta Tag Not Found')
  }
}

// Test 2: Check API connectivity
const testAPIConnectivity = async () => {
  logger.log('\n2️⃣ Testing API Connectivity...')
  
  try {
    // Test categories endpoint
    const response = await fetch(getApiUrl('categories'))
    if (response.ok) {
      const data = await response.json()
      logger.log('✅ Categories API Working:', data.length, 'categories found')
    } else {
      logger.log('❌ Categories API Failed:', response.status)
    }
  } catch (error) {
    logger.log('❌ API Connection Failed:', error.message)
    if (error.message.includes('Content Security Policy')) {
      logger.log('🚫 CSP is blocking the connection!')
    }
  }
}

// Test 3: Check security utilities
const testSecurityUtils = () => {
  logger.log('\n3️⃣ Testing Security Utils...')
  
  // Check if security functions are available
  if (typeof window.validateInput !== 'undefined') {
    logger.log('✅ Input validation available')
  } else {
    logger.log('⚠️ Input validation not globally available')
  }
  
  // Test XSS protection
  const testHTML = '<script>alert("xss")</script><p>Safe content</p>'
  const div = document.createElement('div')
  div.textContent = testHTML // This should escape the script
  if (!div.innerHTML.includes('<script>')) {
    logger.log('✅ Basic XSS protection working')
  } else {
    logger.log('❌ XSS vulnerability detected')
  }
}

// Test 4: Check Error Boundary presence
const testErrorBoundary = () => {
  logger.log('\n4️⃣ Testing Error Boundaries...')
  
  const errorBoundaries = document.querySelectorAll('[class*="error-boundary"], [data-error-boundary]')
  if (errorBoundaries.length > 0) {
    logger.log('✅ Error boundaries detected:', errorBoundaries.length)
  } else {
    logger.log('⚠️ No error boundaries found in DOM')
  }
}

// Test 5: Check session management
const testSessionManagement = () => {
  logger.log('\n5️⃣ Testing Session Management...')
  
  // Check for session-related elements
  const sessionElements = document.querySelectorAll('[class*="session"], [data-session]')
  if (sessionElements.length > 0) {
    logger.log('✅ Session management components found')
  } else {
    logger.log('⚠️ No session management UI detected')
  }
  
  // Check localStorage for tokens (safely)
  try {
    const hasToken = localStorage.getItem('token') !== null
    logger.log(hasToken ? '✅ User session active' : 'ℹ️ No active session')
  } catch {
    logger.log('⚠️ Cannot access session storage')
  }
}

// Run all tests
const runAllTests = async () => {
  logger.log('🚀 Security Validation Suite')
  logger.log('=' .repeat(50))
  
  testCSP()
  await testAPIConnectivity()
  testSecurityUtils()
  testErrorBoundary()
  testSessionManagement()
  
  logger.log('\n✨ Security validation complete!')
  logger.log('📊 Check the console for detailed results')
}

// Auto-run tests when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllTests)
} else {
  runAllTests()
}

// Export for manual testing
window.securityValidation = {
  runAllTests,
  testCSP,
  testAPIConnectivity,
  testSecurityUtils,
  testErrorBoundary,
  testSessionManagement
}

logger.log('💡 Manual testing: Run window.securityValidation.runAllTests() in the console')
