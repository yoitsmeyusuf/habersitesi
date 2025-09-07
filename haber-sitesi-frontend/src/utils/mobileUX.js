// Mobile UX Enhancement Utilities
// Comprehensive mobile user experience optimizations for Turkish news website

/**
 * Prevent iOS zoom on input focus
 */
export const preventIOSZoom = () => {
  const addViewportMeta = () => {
    let viewportMeta = document.querySelector('meta[name="viewport"]')
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta')
      viewportMeta.name = 'viewport'
      document.head.appendChild(viewportMeta)
    }
    
    // Enhanced viewport settings for better mobile experience
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
  }

  const handleInputFocus = (e) => {
    // Temporarily prevent zoom during input focus
    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport && e.target.tagName.toLowerCase().match(/input|textarea|select/)) {
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
    }
  }

  const handleInputBlur = () => {
    // Restore normal viewport after input loses focus
    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) {
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    }
  }

  addViewportMeta()
  document.addEventListener('focusin', handleInputFocus)
  document.addEventListener('focusout', handleInputBlur)

  return () => {
    document.removeEventListener('focusin', handleInputFocus)
    document.removeEventListener('focusout', handleInputBlur)
  }
}

/**
 * Touch target size optimization
 */
export const optimizeTouchTargets = () => {
  const checkTouchTargets = () => {
    const interactiveElements = document.querySelectorAll('button, a, input, textarea, select, [role="button"], [tabindex]')
    
    interactiveElements.forEach(element => {
      const rect = element.getBoundingClientRect()
      const minSize = 44 // Apple's recommended minimum touch target size
      
      if (rect.width < minSize || rect.height < minSize) {
        element.style.minWidth = `${minSize}px`
        element.style.minHeight = `${minSize}px`
        element.style.display = element.style.display || 'inline-flex'
        element.style.alignItems = 'center'
        element.style.justifyContent = 'center'
        element.classList.add('touch-optimized')
      }
    })
  }

  // Run optimization after DOM changes
  const observer = new MutationObserver(checkTouchTargets)
  observer.observe(document.body, { childList: true, subtree: true })
  
  // Initial optimization
  checkTouchTargets()

  return () => observer.disconnect()
}

/**
 * Gesture support for news cards and images
 */
export const addGestureSupport = () => {
  let startY = 0
  let currentY = 0
  let startX = 0
  let currentX = 0
  let isDragging = false
  let rafId = null
  let lastPullTs = 0
  const PULL_COOLDOWN_MS = 30000 // prevent repeated pulls within 30s

  const handleTouchStart = (e) => {
    startY = e.touches[0].clientY
    startX = e.touches[0].clientX
    isDragging = true
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return

    currentY = e.touches[0].clientY
    currentX = e.touches[0].clientX

    // Throttle DOM work to one per frame for smoother scrolling
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      const deltaY = currentY - startY
      const deltaX = currentX - startX

      // Pull to refresh gesture (swipe down from top)
      if (window.scrollY === 0 && deltaY > 50 && Math.abs(deltaX) < 30) {
        // prevent rubber-band scroll while showing indicator
        e.preventDefault()
        const pullRefreshIndicator = document.getElementById('pull-refresh-indicator')
        if (pullRefreshIndicator) {
          pullRefreshIndicator.style.transform = `translateY(${Math.min(deltaY, 100)}px)`
          pullRefreshIndicator.style.opacity = Math.min(deltaY / 100, 1)
        }
      }
    })
  }

  const handleTouchEnd = (e) => {
    if (!isDragging) return
    isDragging = false
    
    const deltaY = currentY - startY
    const deltaX = currentX - startX
    
    // Pull to refresh completion (soft event, no full reload)
    if (window.scrollY === 0 && deltaY > 100 && Math.abs(deltaX) < 50) {
      const now = Date.now()
      if (now - lastPullTs > PULL_COOLDOWN_MS) {
        lastPullTs = now
        // Emit a custom event so pages can refresh their own data without full reload
        window.dispatchEvent(new CustomEvent('app:pullToRefresh'))
      }
    }
    
    // Swipe navigation for news cards
    const newsCard = e.target.closest('.news-card')
    if (newsCard && Math.abs(deltaX) > 100 && Math.abs(deltaY) < 50) {
      if (deltaX > 0) {
        // Swipe right - go to previous news or back
        window.history.back()
      } else {
        // Swipe left - show more actions or next news
        const readButton = newsCard.querySelector('a[href*="/news/"]')
        if (readButton) {
          readButton.click()
        }
      }
    }
    
    // Reset pull refresh indicator
    const pullRefreshIndicator = document.getElementById('pull-refresh-indicator')
    if (pullRefreshIndicator) {
      pullRefreshIndicator.style.transform = 'translateY(-100%)'
      pullRefreshIndicator.style.opacity = '0'
    }
  }

  document.addEventListener('touchstart', handleTouchStart, { passive: false })
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd)

  return () => {
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
  }
}

/**
 * Haptic feedback for touch interactions
 */
export const addHapticFeedback = () => {
  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  const handleClick = (e) => {
    const element = e.target
    
    // Light haptic feedback for buttons and links
    if (element.matches('button, a, [role="button"]')) {
      vibrate(10) // Short, light vibration
    }
    
    // Stronger feedback for important actions
    if (element.matches('.btn-primary, .submit-btn, .delete-btn')) {
      vibrate(25) // Medium vibration
    }
  }

  document.addEventListener('click', handleClick)
  
  return () => document.removeEventListener('click', handleClick)
}

/**
 * Mobile-specific performance optimizations
 */
export const optimizeMobilePerformance = () => {
  // Lazy load images that are not immediately visible
  const lazyLoadImages = () => {
    const images = document.querySelectorAll('img[data-src]')
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target
          img.src = img.dataset.src
          img.removeAttribute('data-src')
          imageObserver.unobserve(img)
        }
      })
    }, {
      rootMargin: '50px 0px' // Start loading 50px before the image comes into view
    })

    images.forEach(img => imageObserver.observe(img))
  }

  // Reduce animation intensity on slower devices
  const optimizeAnimations = () => {
    const deviceMemory = navigator.deviceMemory || 4 // Default to 4GB if not available
    const connection = navigator.connection || {}
    
    if (deviceMemory < 4 || connection.effectiveType === '3g' || connection.effectiveType === '2g') {
      document.documentElement.classList.add('reduce-motion')
      
      // Add reduced motion styles
      const style = document.createElement('style')
      style.textContent = `
        .reduce-motion * {
          animation-duration: 0.1s !important;
          transition-duration: 0.1s !important;
        }
        .reduce-motion .news-card:hover {
          transform: none !important;
        }
      `
      document.head.appendChild(style)
    }
  }

  lazyLoadImages()
  optimizeAnimations()
}

/**
 * Smart scrolling enhancements
 */
export const enhanceScrolling = () => {
  let lastScrollY = window.scrollY
  let scrollTimeout

  const handleScroll = () => {
    const currentScrollY = window.scrollY
    const header = document.querySelector('header')
    
    if (header) {
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide header
        header.style.transform = 'translateY(-100%)'
      } else {
        // Scrolling up - show header
        header.style.transform = 'translateY(0)'
      }
    }
    
    lastScrollY = currentScrollY
    
    // Clear timeout and set new one for scroll end detection
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      // Scroll ended - ensure header is visible
      if (header) {
        header.style.transform = 'translateY(0)'
      }
    }, 150)
  }

  // Smooth scroll behavior for anchor links
  const handleAnchorClick = (e) => {
    const link = e.target.closest('a[href^="#"]')
    if (link) {
      e.preventDefault()
      const targetId = link.getAttribute('href').substring(1)
      const targetElement = document.getElementById(targetId)
      
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  document.addEventListener('click', handleAnchorClick)

  return () => {
    window.removeEventListener('scroll', handleScroll)
    document.removeEventListener('click', handleAnchorClick)
    clearTimeout(scrollTimeout)
  }
}

/**
 * Mobile keyboard handling
 */
export const optimizeKeyboardHandling = () => {
  let initialViewportHeight = window.innerHeight

  const handleResize = () => {
    const currentHeight = window.innerHeight
    const heightDifference = initialViewportHeight - currentHeight
    
    // If the height decreased significantly, keyboard is likely open
    if (heightDifference > 150) {
      document.body.classList.add('keyboard-open')
      
      // Ensure input is visible
      const activeElement = document.activeElement
      if (activeElement && activeElement.tagName.match(/INPUT|TEXTAREA|SELECT/)) {
        setTimeout(() => {
          activeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }, 300)
      }
    } else {
      document.body.classList.remove('keyboard-open')
    }
  }

  // Handle form submission with Enter key on mobile
  const handleKeydown = (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      const form = e.target.closest('form')
      const submitButton = form?.querySelector('[type="submit"]')
      
      if (submitButton && !e.target.matches('[type="search"]')) {
        e.preventDefault()
        submitButton.click()
      }
    }
  }

  window.addEventListener('resize', handleResize)
  document.addEventListener('keydown', handleKeydown)

  return () => {
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('keydown', handleKeydown)
  }
}

/**
 * Initialize all mobile UX enhancements
 */
export const initializeMobileUX = () => {
  const cleanupFunctions = []

  if (typeof window !== 'undefined') {
    // Only initialize on mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth < 768

    if (isMobile) {
      cleanupFunctions.push(preventIOSZoom())
      cleanupFunctions.push(optimizeTouchTargets())
      cleanupFunctions.push(addGestureSupport())
      cleanupFunctions.push(addHapticFeedback())
      cleanupFunctions.push(enhanceScrolling())
      cleanupFunctions.push(optimizeKeyboardHandling())
      
      optimizeMobilePerformance()

      // Add mobile-specific CSS
      const mobileStyles = document.createElement('style')
      mobileStyles.textContent = `
        .touch-optimized {
          -webkit-tap-highlight-color: rgba(239, 68, 68, 0.1);
          touch-action: manipulation;
        }
        
        .keyboard-open {
          padding-bottom: 0 !important;
        }
        
        #pull-refresh-indicator {
          position: fixed;
          top: -100px;
          left: 50%;
          transform: translateX(-50%) translateY(-100%);
          background: white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 1000;
          transition: transform 0.3s ease, opacity 0.3s ease;
          opacity: 0;
        }
        
        .news-card {
          touch-action: pan-y;
        }
        
        @media (max-width: 768px) {
          .mobile-swipe-hint::after {
            content: '← Kaydır';
            position: absolute;
            bottom: 10px;
            right: 10px;
            font-size: 12px;
            color: rgba(0,0,0,0.4);
            pointer-events: none;
          }
        }
      `
      document.head.appendChild(mobileStyles)

      // Add pull-to-refresh indicator
      const pullRefreshIndicator = document.createElement('div')
      pullRefreshIndicator.id = 'pull-refresh-indicator'
      pullRefreshIndicator.innerHTML = '↻'
      document.body.appendChild(pullRefreshIndicator)
    }
  }

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup && cleanup())
  }
}

export default {
  preventIOSZoom,
  optimizeTouchTargets,
  addGestureSupport,
  addHapticFeedback,
  optimizeMobilePerformance,
  enhanceScrolling,
  optimizeKeyboardHandling,
  initializeMobileUX
}
