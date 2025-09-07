import { useState, useEffect, useRef, memo } from 'react'
import { createLazyImageObserver } from '../utils/mobileOptimization'
import { getOptimizedImageUrl, generateSrcSet, generateSizes, handleImageError } from '../utils/imageOptimization'

const LazyImage = memo(({ 
  src, 
  alt, 
  className = '', 
  placeholder = '/vite.svg',
  onLoad,
  onError,
  optimize = true,
  size = 'medium',
  quality = 85,
  enableResponsive = true,
  // Performance hints
  loading: nativeLoading = 'lazy',
  fetchPriority = 'auto',
  decoding: nativeDecoding = 'async',
  width,
  height,
  // DOM'a geçirilmemesi gereken props'ları ayıralım
  ...domProps 
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef(null)
  const observerRef = useRef(null)
  
  useEffect(() => {
    const observer = createLazyImageObserver()
    const currentImg = imgRef.current
    
    if (observer && currentImg) {
      observerRef.current = observer
      
      // Set up intersection observer for this specific image
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true)
            imageObserver.unobserve(entry.target)
          }
        })
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      })
      
      imageObserver.observe(currentImg)
      
      return () => {
        if (currentImg) {
          imageObserver.unobserve(currentImg)
        }
      }
    }
  }, [])
  // Use new optimization system with fallback to old one
  const optimizedSrc = optimize ? getOptimizedImageUrl(src, { size, quality }) : src
  const srcSet = enableResponsive && optimize ? generateSrcSet(src, { size, quality }) : ''
  const sizes = enableResponsive ? generateSizes() : ''

  const handleLoad = () => {
    setIsLoaded(true)
    if (onLoad) onLoad()
  }

  const handleError = (event) => {
    handleImageError(event, placeholder)
    setHasError(true)
    if (onError) onError(event)
  }

  return (
    <div 
      ref={imgRef} 
      className={`lazy-image-container ${className}`}
      style={{ position: 'relative', overflow: 'hidden' }}
      {...domProps}
    >
      {/* Placeholder while loading */}
      {!isLoaded && !hasError && (
        <div className="lazy-placeholder">
          <div className="animate-pulse bg-gray-200 w-full h-full"></div>
        </div>
      )}
        {/* Actual image */}
    {isInView && (
        <img
          src={hasError ? placeholder : optimizedSrc}
          srcSet={srcSet || undefined}
          sizes={sizes || undefined}
          alt={alt}
          className={`
            transition-opacity duration-300 
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
            ${className}
          `}
          onLoad={handleLoad}
          onError={handleError}
      loading={nativeLoading}
      decoding={nativeDecoding}
      fetchPriority={fetchPriority}
      width={width}
      height={height}
          style={{
            position: isLoaded ? 'static' : 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      )}
      
      {/* Error fallback */}
      {hasError && (
        <div className="error-placeholder flex items-center justify-center bg-gray-100 text-gray-400 w-full h-full">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>        </div>
      )}
    </div>
  )
})

LazyImage.displayName = 'LazyImage'

export default LazyImage
