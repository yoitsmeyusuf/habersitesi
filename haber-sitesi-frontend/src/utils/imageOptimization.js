/**
 * Image optimization utilities for handling image URLs and transformations
 * Supports CDN optimizations, format conversion, and responsive images
 */

import { useState, useEffect } from 'react'

// Configuration for image optimization
const IMAGE_CONFIG = {
  // CDN settings (configure based on your CDN provider)
  cdnBaseUrl: '', // e.g., 'https://cdn.example.com'
  enableWebP: true, // Enable WebP format when supported
  enableAvif: false, // Enable AVIF format when supported (newer, less browser support)
  enableResponsive: true, // Enable responsive image URLs
  defaultQuality: 85, // Default image quality (1-100)
  
  // Image size presets
  sizes: {
    thumbnail: { width: 150, height: 150 },
    small: { width: 300, height: 200 },
    medium: { width: 600, height: 400 },
    large: { width: 1200, height: 800 },
    hero: { width: 1920, height: 1080 },
  },
  
  // Breakpoints for responsive images
  breakpoints: [480, 768, 1024, 1200, 1920],
}

// Check browser support for modern image formats
const checkImageFormatSupport = () => {
  if (typeof window === 'undefined') return { webp: false, avif: false }
  
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  
  const webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  let avifSupport = false
  
  try {
    // Basic AVIF detection (may not be 100% accurate)
    avifSupport = canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0  } catch {
    avifSupport = false
  }
  
  return { webp: webpSupport, avif: avifSupport }
}

// Cache format support detection
let formatSupport = null
const getFormatSupport = () => {
  if (!formatSupport) {
    formatSupport = checkImageFormatSupport()
  }
  return formatSupport
}

// Get optimized image URL
export const getOptimizedImageUrl = (originalUrl, options = {}) => {
  if (!originalUrl) return ''
  
  // If it's already a data URL or blob, return as-is
  if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
    return originalUrl
  }
  
  const {
    width,
    height,
    quality = IMAGE_CONFIG.defaultQuality,
    format,
    size = 'medium',
  } = options
  
  // Use size preset if no explicit dimensions provided
  let targetWidth = width
  let targetHeight = height
  
  if (!width && !height && IMAGE_CONFIG.sizes[size]) {
    targetWidth = IMAGE_CONFIG.sizes[size].width
    targetHeight = IMAGE_CONFIG.sizes[size].height
  }
  
  // Determine optimal format
  const support = getFormatSupport()
  let optimalFormat = format
  
  if (!optimalFormat && IMAGE_CONFIG.enableWebP && support.webp) {
    optimalFormat = 'webp'
  } else if (!optimalFormat && IMAGE_CONFIG.enableAvif && support.avif) {
    optimalFormat = 'avif'
  }
  
  // Build optimized URL based on CDN provider
  // This is a generic implementation - customize based on your CDN
  if (IMAGE_CONFIG.cdnBaseUrl) {
    const params = new URLSearchParams()
    
    if (targetWidth) params.set('w', targetWidth.toString())
    if (targetHeight) params.set('h', targetHeight.toString())
    if (quality && quality !== IMAGE_CONFIG.defaultQuality) params.set('q', quality.toString())
    if (optimalFormat) params.set('f', optimalFormat)
    
    // Add auto optimization flags
    params.set('auto', 'compress,format')
    
    const encodedUrl = encodeURIComponent(originalUrl)
    return `${IMAGE_CONFIG.cdnBaseUrl}/${encodedUrl}?${params.toString()}`
  }
  
  // If no CDN, return original URL (or implement your own optimization logic)
  return originalUrl
}

// Generate responsive image srcSet
export const generateSrcSet = (originalUrl, options = {}) => {
  if (!originalUrl || !IMAGE_CONFIG.enableResponsive) return ''
  
  const { breakpoints = IMAGE_CONFIG.breakpoints, quality, format } = options
  
  return breakpoints
    .map(width => {
      const optimizedUrl = getOptimizedImageUrl(originalUrl, {
        width,
        quality,
        format,
      })
      return `${optimizedUrl} ${width}w`
    })
    .join(', ')
}

// Generate sizes attribute for responsive images
export const generateSizes = (options = {}) => {
  const {
    mobile = '100vw',
    tablet = '50vw',
    desktop = '33vw',
    large = '25vw',
  } = options
  
  return [
    `(max-width: 480px) ${mobile}`,
    `(max-width: 768px) ${tablet}`,
    `(max-width: 1024px) ${desktop}`,
    large,
  ].join(', ')
}

// Get image dimensions from URL (if supported by CDN)
export const getImageDimensions = async (imageUrl) => {
  if (!imageUrl) return null
  
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      })
    }
    img.onerror = () => resolve(null)
    img.src = imageUrl
  })
}

// Preload critical images
export const preloadImage = (imageUrl, options = {}) => {
  if (!imageUrl || typeof window === 'undefined') return
  
  const { priority = false, ...optimizationOptions } = options
  const optimizedUrl = getOptimizedImageUrl(imageUrl, optimizationOptions)
  
  const link = document.createElement('link')
  link.rel = priority ? 'preload' : 'prefetch'
  link.as = 'image'
  link.href = optimizedUrl
  
  // Add responsive preloading if enabled
  if (IMAGE_CONFIG.enableResponsive && !priority) {
    const srcSet = generateSrcSet(imageUrl, optimizationOptions)
    if (srcSet) {
      link.imageSrcset = srcSet
      link.imageSizes = generateSizes()
    }
  }
  
  document.head.appendChild(link)
}

// Utility to handle image loading errors
export const handleImageError = (event, fallbackUrl) => {
  const img = event.target
  if (img.src !== fallbackUrl) {
    img.src = fallbackUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4='
  }
}

// Utility to create placeholder while image loads
export const createImagePlaceholder = (width, height, text = 'Loading...') => {
  const canvas = document.createElement('canvas')
  canvas.width = width || 300
  canvas.height = height || 200
  
  const ctx = canvas.getContext('2d')
  
  // Draw placeholder background
  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Draw text
  ctx.fillStyle = '#9ca3af'
  ctx.font = '16px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  
  return canvas.toDataURL()
}

// Image optimization hook for React components
export const useImageOptimization = (originalUrl, options = {}) => {
  const [optimizedUrl, setOptimizedUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  
  useEffect(() => {
    if (!originalUrl) {
      setOptimizedUrl('')
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    setHasError(false)
    
    const url = getOptimizedImageUrl(originalUrl, options)
    
    // Test if image loads successfully
    const img = new Image()
    img.onload = () => {
      setOptimizedUrl(url)
      setIsLoading(false)
    }
    img.onerror = () => {
      setOptimizedUrl(originalUrl) // Fallback to original
      setHasError(true)
      setIsLoading(false)
    }
    img.src = url
    
  }, [originalUrl, options])
  
  return {
    src: optimizedUrl,
    isLoading,
    hasError,
    srcSet: IMAGE_CONFIG.enableResponsive ? generateSrcSet(originalUrl, options) : '',
    sizes: generateSizes(),
  }
}

// Export configuration for customization
export { IMAGE_CONFIG }

export default {
  getOptimizedImageUrl,
  generateSrcSet,
  generateSizes,
  getImageDimensions,
  preloadImage,
  handleImageError,
  createImagePlaceholder,
  useImageOptimization,
}
