// Mobile Performance Optimization Utilities

import logger from './logger'

/**
 * Lazy Loading for Images
 */
export const createLazyImageObserver = () => {
  if (!('IntersectionObserver' in window)) {
    // Fallback for older browsers
    return null
  }

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target
        img.src = img.dataset.src
        img.classList.remove('lazy')
        img.classList.add('loaded')
        observer.unobserve(img)
      }
    })
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  })

  return imageObserver
}

/**
 * Debounce function for search and scroll events
 */
export const debounce = (func, wait, immediate) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func(...args)
  }
}

/**
 * Throttle function for scroll events
 */
export const throttle = (func, limit) => {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Check if device is mobile
 */
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * Get optimal image size based on device
 */
export const getOptimalImageSize = (originalUrl, maxWidth = 800) => {
  if (!originalUrl) return originalUrl
  
  const devicePixelRatio = window.devicePixelRatio || 1
  const screenWidth = window.innerWidth
  const optimalWidth = Math.min(screenWidth * devicePixelRatio, maxWidth)
  
  // If using a CDN with resize capability, modify URL
  // Example: https://example.com/image.jpg?w=800&h=600&f=webp
  if (originalUrl.includes('placeholder') || originalUrl.includes('via.placeholder')) {
    return originalUrl
  }
  
  // For backend images, you might want to add resize parameters
  // This depends on your backend image processing capability
  // Return URL with optimal width parameter
  if (originalUrl.includes('?')) {
    return `${originalUrl}&w=${optimalWidth}`
  } else {
    return `${originalUrl}?w=${optimalWidth}`
  }
}

/**
 * Preload critical images
 */
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Virtual scrolling helper for large lists
 */
export class VirtualScroller {
  constructor(container, itemHeight, renderItem, totalItems) {
    this.container = container
    this.itemHeight = itemHeight
    this.renderItem = renderItem
    this.totalItems = totalItems
    this.visibleStart = 0
    this.visibleEnd = 0
    this.scrollTop = 0
    
    this.init()
  }
  
  init() {
    this.container.style.overflowY = 'auto'
    this.container.style.position = 'relative'
    
    // Create spacer elements
    this.topSpacer = document.createElement('div')
    this.bottomSpacer = document.createElement('div')
    this.contentContainer = document.createElement('div')
    
    this.container.appendChild(this.topSpacer)
    this.container.appendChild(this.contentContainer)
    this.container.appendChild(this.bottomSpacer)
    
    this.container.addEventListener('scroll', this.onScroll.bind(this))
    this.calculateVisible()
    this.render()
  }
  
  onScroll() {
    this.scrollTop = this.container.scrollTop
    this.calculateVisible()
    this.render()
  }
  
  calculateVisible() {
    const containerHeight = this.container.clientHeight
    const scrollTop = this.scrollTop
    
    this.visibleStart = Math.floor(scrollTop / this.itemHeight)
    this.visibleEnd = Math.min(
      this.visibleStart + Math.ceil(containerHeight / this.itemHeight) + 1,
      this.totalItems
    )
  }
  
  render() {
    // Update spacer heights
    this.topSpacer.style.height = `${this.visibleStart * this.itemHeight}px`
    this.bottomSpacer.style.height = `${(this.totalItems - this.visibleEnd) * this.itemHeight}px`
    
    // Clear content
    this.contentContainer.innerHTML = ''
    
    // Render visible items
    for (let i = this.visibleStart; i < this.visibleEnd; i++) {
      const item = this.renderItem(i)
      this.contentContainer.appendChild(item)
    }
  }
}

/**
 * Performance monitoring
 */
export const performanceMonitor = {
  startTime: null,
  
  start(label) {
    this.startTime = performance.now()
    logger.log(`⏱️ Starting: ${label}`)
  },
  
  end(label) {
    if (this.startTime) {
      const duration = performance.now() - this.startTime
      logger.log(`✅ Completed: ${label} in ${duration.toFixed(2)}ms`)
      this.startTime = null
      return duration
    }
  },
  
  measureRender(componentName, renderFunction) {
    const start = performance.now()
    const result = renderFunction()
    const end = performance.now()
    
    if (end - start > 16) { // More than one frame (60fps)
      logger.warn(`🐌 Slow render: ${componentName} took ${(end - start).toFixed(2)}ms`)
    }
    
    return result
  }
}

/**
 * Touch gestures for mobile
 */
export class TouchGestureHandler {
  constructor(element, options = {}) {
    this.element = element
    this.options = {
      threshold: 50, // Minimum distance for swipe
      restraint: 100, // Maximum distance in perpendicular direction
      allowedTime: 300, // Maximum time for swipe
      ...options
    }
    
    this.startX = null
    this.startY = null
    this.startTime = null
    
    this.init()
  }
  
  init() {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true })
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true })
  }
  
  handleTouchStart(e) {
    const touch = e.touches[0]
    this.startX = touch.clientX
    this.startY = touch.clientY
    this.startTime = Date.now()
  }
  
  handleTouchEnd(e) {
    if (!this.startX || !this.startY) return
    
    const touch = e.changedTouches[0]
    const endX = touch.clientX
    const endY = touch.clientY
    const elapsedTime = Date.now() - this.startTime
    
    if (elapsedTime <= this.options.allowedTime) {
      const distX = endX - this.startX
      const distY = endY - this.startY
      
      if (Math.abs(distX) >= this.options.threshold && Math.abs(distY) <= this.options.restraint) {
        const direction = distX < 0 ? 'left' : 'right'
        this.onSwipe(direction, distX)
      } else if (Math.abs(distY) >= this.options.threshold && Math.abs(distX) <= this.options.restraint) {
        const direction = distY < 0 ? 'up' : 'down'
        this.onSwipe(direction, distY)
      }
    }
    
    this.startX = null
    this.startY = null
    this.startTime = null
  }
  
  onSwipe(direction, distance) {
    // Override this method
    logger.log(`Swipe ${direction}: ${distance}px`)
  }
}

/**
 * Optimize images for mobile
 */
export const optimizeImageForMobile = (imageUrl, options = {}) => {
  const {
    quality = 85,
    format = 'webp',
    maxWidth = 800,
    maxHeight = 600
  } = options
  
  // Check if browser supports WebP
  const supportsWebP = (() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  })()
  
  // Return optimized URL (this would depend on your image processing service)
  if (imageUrl && !imageUrl.includes('placeholder')) {
    // Build optimization parameters
    const params = new URLSearchParams()
    params.append('w', maxWidth.toString())
    params.append('h', maxHeight.toString())
    params.append('q', quality.toString())
    params.append('f', supportsWebP && format === 'webp' ? 'webp' : 'jpg')
    
    // Example for a hypothetical image optimization service
    if (imageUrl.includes('?')) {
      return `${imageUrl}&${params.toString()}`
    } else {
      return `${imageUrl}?${params.toString()}`
    }
  }
  
  return imageUrl
}
