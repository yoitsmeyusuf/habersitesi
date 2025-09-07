/**
 * Analytics utilities for tracking user interactions and page views
 * Supports Google Analytics 4 (gtag) and custom analytics
 */

import logger from './logger'

// Analytics configuration
const ANALYTICS_CONFIG = {
  GA_MEASUREMENT_ID: import.meta.env.VITE_GA_ID || 'G-XXXXXXXXXX', // Use env variable
  enableLocalAnalytics: import.meta.env.DEV, // Only in development
  enableConsoleLogging: import.meta.env.DEV, // Only in development
  enableUserTimings: true, // Track performance metrics
}

// Check if Google Analytics is loaded
const isGoogleAnalyticsLoaded = () => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

// Initialize analytics
export const initializeAnalytics = () => {
  if (typeof window === 'undefined') return

  // Add Google Analytics script if measurement ID is provided
  if (ANALYTICS_CONFIG.GA_MEASUREMENT_ID && ANALYTICS_CONFIG.GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.GA_MEASUREMENT_ID}`
    document.head.appendChild(script)

    script.onload = () => {
      window.dataLayer = window.dataLayer || []
      function gtag() {
        window.dataLayer.push(arguments)
      }
      window.gtag = gtag
      
      gtag('js', new Date())
      gtag('config', ANALYTICS_CONFIG.GA_MEASUREMENT_ID, {
        page_title: document.title,
        page_location: window.location.href,
      })

      if (ANALYTICS_CONFIG.enableConsoleLogging) {
        logger.log('Analytics: Google Analytics initialized')
      }
    }
  }

  // Initialize local analytics storage
  if (ANALYTICS_CONFIG.enableLocalAnalytics) {
    const analytics = getLocalAnalytics()
    if (!analytics.session_start) {
      trackEvent('session', 'start', { timestamp: Date.now() })
    }
  }
}

// Track page views
export const trackPageView = (path, title) => {
  if (typeof window === 'undefined') return

  const data = {
    page_path: path || window.location.pathname,
    page_title: title || document.title,
    page_location: window.location.href,
    timestamp: Date.now(),
  }

  // Google Analytics
  if (isGoogleAnalyticsLoaded()) {
    window.gtag('config', ANALYTICS_CONFIG.GA_MEASUREMENT_ID, {
      page_path: data.page_path,
      page_title: data.page_title,
    })
  }

  // Local analytics
  if (ANALYTICS_CONFIG.enableLocalAnalytics) {
    addToLocalAnalytics('page_view', data)
  }

  if (ANALYTICS_CONFIG.enableConsoleLogging) {
    logger.log('Analytics: Page view tracked', data)
  }
}

// Track custom events
export const trackEvent = (category, action, data = {}) => {
  if (typeof window === 'undefined') return

  const eventData = {
    event_category: category,
    event_action: action,
    timestamp: Date.now(),
    ...data,
  }

  // Google Analytics
  if (isGoogleAnalyticsLoaded()) {
    window.gtag('event', action, {
      event_category: category,
      ...data,
    })
  }

  // Local analytics
  if (ANALYTICS_CONFIG.enableLocalAnalytics) {
    addToLocalAnalytics('event', eventData)
  }

  if (ANALYTICS_CONFIG.enableConsoleLogging) {
    logger.log('Analytics: Event tracked', eventData)
  }
}

// Track news interactions
export const trackNewsInteraction = (newsId, action, additionalData = {}) => {
  trackEvent('news', action, {
    news_id: newsId,
    ...additionalData,
  })
}

// Track search interactions
export const trackSearchInteraction = (query, resultsCount, additionalData = {}) => {
  trackEvent('search', 'query', {
    search_query: query,
    results_count: resultsCount,
    ...additionalData,
  })
}

// Track user interactions
export const trackUserInteraction = (action, additionalData = {}) => {
  trackEvent('user', action, additionalData)
}

// Track errors
export const trackError = (error, context = 'unknown', additionalData = {}) => {
  const errorData = {
    error_message: error.message || 'Unknown error',
    error_stack: error.stack || '',
    error_context: context,
    page_path: window.location.pathname,
    user_agent: navigator.userAgent,
    timestamp: Date.now(),
    ...additionalData,
  }

  trackEvent('error', 'exception', errorData)

  // Also log to console for debugging
  logger.error('Analytics: Error tracked', errorData)
}

// Track performance metrics
export const trackPerformance = (metric, value, additionalData = {}) => {
  if (!ANALYTICS_CONFIG.enableUserTimings) return

  const performanceData = {
    metric_name: metric,
    metric_value: value,
    timestamp: Date.now(),
    ...additionalData,
  }

  // Google Analytics User Timing
  if (isGoogleAnalyticsLoaded()) {
    window.gtag('event', 'timing_complete', {
      name: metric,
      value: Math.round(value),
    })
  }

  trackEvent('performance', 'timing', performanceData)
}

// Track page load performance
export const trackPageLoadPerformance = () => {
  if (typeof window === 'undefined' || !window.performance) return

  // Wait for page to fully load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      if (navigation) {
        trackPerformance('page_load_time', navigation.loadEventEnd - navigation.fetchStart)
        trackPerformance('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart)
        trackPerformance('first_paint', navigation.responseEnd - navigation.fetchStart)
      }

      // Track Core Web Vitals if available
      if ('PerformanceObserver' in window) {
        try {
          // Largest Contentful Paint (LCP)
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1]
            trackPerformance('largest_contentful_paint', lastEntry.startTime)
          }).observe({ entryTypes: ['largest-contentful-paint'] })

          // First Input Delay (FID)
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry) => {
              trackPerformance('first_input_delay', entry.processingStart - entry.startTime)
            })
          }).observe({ entryTypes: ['first-input'] })

          // Cumulative Layout Shift (CLS)
          let clsScore = 0
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            entries.forEach((entry) => {
              if (!entry.hadRecentInput) {
                clsScore += entry.value
              }
            })
            trackPerformance('cumulative_layout_shift', clsScore)
          }).observe({ entryTypes: ['layout-shift'] })
        } catch (error) {
          logger.warn('Analytics: Performance observer not supported', error)
        }
      }
    }, 100)
  })
}

// Local analytics storage utilities
const getLocalAnalytics = () => {
  try {
    const analytics = localStorage.getItem('app_analytics')
    return analytics ? JSON.parse(analytics) : {}
  } catch (error) {
    logger.warn('Analytics: Failed to read local analytics', error)
    return {}
  }
}

const addToLocalAnalytics = (type, data) => {
  try {
    const analytics = getLocalAnalytics()
    if (!analytics[type]) {
      analytics[type] = []
    }
    
    analytics[type].push(data)
    
    // Keep only last 100 entries per type to prevent storage bloat
    if (analytics[type].length > 100) {
      analytics[type] = analytics[type].slice(-100)
    }
    
    localStorage.setItem('app_analytics', JSON.stringify(analytics))
  } catch (error) {
    logger.warn('Analytics: Failed to store local analytics', error)
  }
}

// Get analytics data for debugging/admin purposes
export const getAnalyticsData = () => {
  return getLocalAnalytics()
}

// Clear analytics data
export const clearAnalyticsData = () => {
  try {
    localStorage.removeItem('app_analytics')
    if (ANALYTICS_CONFIG.enableConsoleLogging) {
      logger.log('Analytics: Local analytics data cleared')
    }
  } catch (error) {
    logger.warn('Analytics: Failed to clear analytics data', error)
  }
}

// Export configuration for customization
export { ANALYTICS_CONFIG }

export default {
  initialize: initializeAnalytics,
  trackPageView,
  trackEvent,
  trackNewsInteraction,
  trackSearchInteraction,
  trackUserInteraction,
  trackError,
  trackPerformance,
  trackPageLoadPerformance,
  getAnalyticsData,
  clearAnalyticsData,
}
