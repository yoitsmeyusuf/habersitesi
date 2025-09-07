// Error handling utilities
import api from '../services/api'
import React from 'react'

// HOC for wrapping components with error boundary
export const withErrorBoundary = (Component, context = '') => {
  return function WrappedComponent(props) {
    const ErrorBoundary = React.lazy(() => import('../components/ErrorBoundary'))
    return (
      <React.Suspense fallback={<div>Loading...</div>}>
        <ErrorBoundary context={context}>
          <Component {...props} />
        </ErrorBoundary>
      </React.Suspense>
    )
  }
}

// Hook for error logging in functional components
export const useErrorHandler = () => {
  const logError = React.useCallback((error, context = '') => {
    api.logError(error, context)
  }, [])

  const handleAsyncError = React.useCallback((asyncFn, context = '') => {
    return async (...args) => {
      try {
        return await asyncFn(...args)
      } catch (error) {
        logError(error, context)
        throw error // Re-throw to allow component handling
      }
    }
  }, [logError])

  return { logError, handleAsyncError }
}
