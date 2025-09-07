import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Scroll to top on route changes; if URL has a hash, scroll to that element instead
export default function ScrollToTop() {
  const location = useLocation()

  // Ensure browser doesn't try to restore previous scroll automatically
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      const prev = window.history.scrollRestoration
      window.history.scrollRestoration = 'manual'
      return () => { window.history.scrollRestoration = prev }
    }
  }, [])

  useEffect(() => {
    // Defer until after route content has painted
    const id = window.requestAnimationFrame(() => {
      if (location.hash) {
        const targetId = location.hash.slice(1)
        const el = document.getElementById(targetId)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
      }
      // Default: jump to top (override global smooth for instant positioning)
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [location.pathname, location.search, location.hash])

  return null
}
