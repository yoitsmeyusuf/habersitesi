import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.jsx'

const Breadcrumb = () => {
  const location = useLocation()
  const { breadcrumbItems } = useBreadcrumb()
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Smart text truncation function
  const truncateText = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    
    // Try to break at word boundary
    const truncated = text.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + '...'
    }
    
    return truncated + '...'
  }
  
  // Get responsive character limit
  const getCharLimit = () => {
    if (windowWidth < 640) return 15  // Mobile
    if (windowWidth < 768) return 20  // Tablet
    return 30  // Desktop
  }
  
  // If custom items are provided via context, use them
  if (breadcrumbItems) {
    return (
      <nav className="bg-gray-50 border-b border-gray-100 py-3" aria-label="Breadcrumb">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ol className="flex items-center space-x-1 sm:space-x-2 text-sm overflow-hidden">
            <li className="flex-shrink-0">
              <Link 
                to="/" 
                className="text-gray-500 hover:text-red-600 transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011 1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="hidden sm:inline">Ana Sayfa</span>
                <span className="sm:hidden">🏠</span>
              </Link>
            </li>
            {breadcrumbItems.map((item, index) => (
              <li key={index} className="flex items-center min-w-0">
                <svg className="w-3 h-3 text-gray-400 mx-1 sm:mx-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {item.href ? (
                  <Link 
                    to={item.href} 
                    className="text-gray-500 hover:text-red-600 transition-colors duration-200 truncate min-w-0 max-w-[100px] sm:max-w-[150px] md:max-w-[200px]"
                    title={item.label}
                  >
                    {truncateText(item.label, getCharLimit())}
                  </Link>
                ) : (
                  <span 
                    className="text-gray-900 font-medium truncate min-w-0 max-w-[100px] sm:max-w-[150px] md:max-w-[200px]" 
                    title={item.label}
                  >
                    {truncateText(item.label, getCharLimit())}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>
    )
  }

  // Auto-generate breadcrumbs from current path
  const pathnames = location.pathname.split('/').filter(x => x)
  const breadcrumbNameMap = {
    'news': 'Haberler',
    'haber': 'Haberler',
    'category': 'Kategori', 
    'kategori': 'Kategori',
    'search': 'Arama',
    'profile': 'Profil',
    'admin': 'Yönetim',
    'login': 'Giriş',
    'register': 'Kayıt',
    'about': 'Hakkımızda',
    'contact': 'İletişim',
    'faq': 'Sık Sorulan Sorular',
    'author': 'Yazar',
    'yazar': 'Yazar'
  }

  // Don't show breadcrumb on home page, or if pathnames is empty, or on news detail pages
  if (pathnames.length === 0 || pathnames[0] === 'news' || pathnames[0] === 'haber') {
    return null
  }

  return (
    <nav className="bg-gray-50 border-b border-gray-100 py-3" aria-label="Breadcrumb">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ol className="flex items-center space-x-1 sm:space-x-2 text-sm overflow-hidden">
          <li className="flex-shrink-0">
            <Link 
              to="/" 
              className="text-gray-500 hover:text-red-600 transition-colors duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011 1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:inline">Ana Sayfa</span>
              <span className="sm:hidden">🏠</span>
            </Link>
          </li>
          
          {pathnames.map((value, index) => {
            const to = `/${pathnames.slice(0, index + 1).join('/')}`
            const isLast = index === pathnames.length - 1
            const breadcrumbName = breadcrumbNameMap[value] || decodeURIComponent(value)

            return (
              <li key={to} className="flex items-center min-w-0">
                <svg className="w-3 h-3 text-gray-400 mx-1 sm:mx-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {isLast ? (
                  <span className="text-gray-900 font-medium truncate min-w-0 max-w-[100px] sm:max-w-[150px] md:max-w-[200px]" title={breadcrumbName}>
                    {truncateText(breadcrumbName, getCharLimit())}
                  </span>
                ) : (
                  <Link 
                    to={to} 
                    className="text-gray-500 hover:text-red-600 transition-colors duration-200 truncate min-w-0 max-w-[100px] sm:max-w-[150px] md:max-w-[200px]"
                    title={breadcrumbName}
                  >
                    {truncateText(breadcrumbName, getCharLimit())}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

export default Breadcrumb