import { useParams, Link } from 'react-router-dom'
import { useState, useEffect, useContext, useMemo, useCallback } from 'react'
import api from '../services/api'
import { UserContext } from '../contexts/UserContext'
import LazyImage from '../components/LazyImage'
import { trackPageView, trackNewsInteraction } from '../utils/analytics'
import { NetworkErrorHandler, ConnectionStatus } from '../components/ErrorHandling'
import { NewsLoadingSkeleton, PageLoadingProgress } from '../components/ProgressIndicators'
import { generateNewsUrl } from '../utils/slugUtils'
import { throttle } from '../utils/mobileOptimization'
import logger from '../utils/logger'

const PAGE_SIZE = 6

const Category = () => {
  const { name } = useParams()
  const { user } = useContext(UserContext)
  
  logger.log('🌟 Category.jsx: Component rendered with category name:', name)
  
  const [page, setPage] = useState(1)
  const [news, setNews] = useState([])
  const [categories, setCategories] = useState([])
  const [sort, setSort] = useState('date')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      setPage(1) // Reset page when category changes
      setHasMore(true) // Reset hasMore when category changes
      try {
        logger.log('🔍 Category.jsx: Loading data for category:', name)
        const [newsData, categoriesData] = await Promise.all([
          api.getNewsByCategory(name, { page: 1, limit: PAGE_SIZE }), // Category specific news
          api.getCategories()
        ])
        
        logger.log('📊 Category.jsx: Raw newsData received:', newsData)
        logger.log('📂 Category.jsx: Categories received:', categoriesData)
        
        // Backend'den gelen format: {"data": [...], "pagination": {...}}
        let newsArray = []
        if (newsData) {
          if (newsData.data) {
            // Yeni format: {data: [...], pagination: {...}}
            newsArray = newsData.data
            logger.log('✅ Category.jsx: Using newsData.data format, items:', newsArray.length)
          } else if (Array.isArray(newsData)) {
            // Eski format: direct array
            newsArray = newsData
            logger.log('✅ Category.jsx: Using direct array format, items:', newsArray.length)
          } else {
            logger.log('⚠️ Category.jsx: Unknown newsData format:', typeof newsData)
          }
        } else {
          logger.log('❌ Category.jsx: No newsData received')
        }
        
        // Normal kullanıcılar sadece onaylanmış haberleri görsün (admin hepsini görebilir)
        if (user?.role !== 'admin') {
          const beforeFilter = newsArray.length
          newsArray = newsArray.filter(n => n.isApproved === true)
          logger.log(`🔒 Category.jsx: Filtered news for non-admin user. Before: ${beforeFilter}, After: ${newsArray.length}`)
        } else {
          logger.log('👑 Category.jsx: Admin user - showing all news items:', newsArray.length)
        }
        
        logger.log('📰 Category.jsx: Final news array to set:', newsArray)
        setNews(newsArray)
        setCategories(categoriesData || [])
        
        // Check if there are more pages
        if (newsData?.pagination) {
          setHasMore(newsData.pagination.hasNext)
        } else {
          setHasMore(newsArray.length >= PAGE_SIZE)
        }
      } catch (err) {
        logger.error('Error loading category data:', err)
        setError('Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user, name]) // Add 'name' dependency to reload when category changes

  useEffect(() => {
    setPage(1)
  }, [name])
  const handleRetry = () => {
    setError(null)
    setLoading(true)
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [newsData, categoriesData] = await Promise.all([
          api.getNewsByCategory(name, { page: 1, limit: PAGE_SIZE }), // Category specific news
          api.getCategories()
        ])
        
        // Backend'den gelen format: {"data": [...], "pagination": {...}}
        let newsArray = []
        if (newsData) {
          if (newsData.data) {
            // Yeni format: {data: [...], pagination: {...}}
            newsArray = newsData.data
          } else if (Array.isArray(newsData)) {
            // Eski format: direct array
            newsArray = newsData
          }
        }
        
        // Normal kullanıcılar sadece onaylanmış haberleri görsün (admin hepsini görebilir)
        if (user?.role !== 'admin') {
          newsArray = newsArray.filter(n => n.isApproved === true)
        }
        
        setNews(newsArray)
        setCategories(categoriesData || [])
      } catch (err) {
        logger.error('Error loading category data:', err)
        setError('Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }

  // Track page view
  useEffect(() => {
    trackPageView(`/kategori/${name}`, `${name} Kategorisi`)
  }, [name])

  // Handle news click tracking
  const handleNewsClick = useCallback((newsId, title, category) => {
    trackNewsInteraction(newsId, 'click', {
      news_title: title,
      news_category: category,
      page: 'category',
      category_filter: name,
    })
  }, [name])

  // Load more news function
  const loadMoreNews = useCallback(async () => {
    if (loadingMore || !hasMore) return
    
    setLoadingMore(true)
    try {
      const newNewsData = await api.getNewsByCategory(name, { page: page + 1, limit: PAGE_SIZE }) // Category specific news
      
      // Backend'den gelen format: {"data": [...], "pagination": {...}}
      let newNews = []
      if (newNewsData) {
        if (newNewsData.data) {
          // Yeni format: {data: [...], pagination: {...}}
          newNews = newNewsData.data
        } else if (Array.isArray(newNewsData)) {
          // Eski format: direct array
          newNews = newNewsData
        }
      }
      
      if (newNews && newNews.length > 0) {
        let filteredNewNews = newNews
        if (user?.role !== 'admin') {
          filteredNewNews = newNews.filter(n => n.isApproved === true)
        }
        
        setNews(prevNews => {
          // Duplicate kontrolü - mevcut haberlerin ID'lerini al
          const existingIds = new Set(prevNews.map(n => n.id))
          // Sadece yeni haberleri ekle
          const uniqueNewNews = filteredNewNews.filter(n => !existingIds.has(n.id))
          
          if (uniqueNewNews.length > 0) {
            return [...prevNews, ...uniqueNewNews]
          }
          return prevNews
        })
        setPage(prevPage => prevPage + 1)
        
        // Check pagination info from backend
        if (newNewsData?.pagination) {
          setHasMore(newNewsData.pagination.hasNext)
        } else {
          setHasMore(filteredNewNews.length >= PAGE_SIZE)
        }
      } else {
        setHasMore(false)
      }
    } catch (error) {
      logger.error('Error loading more news:', error)
      setHasMore(false) // Stop trying to load more on error
    } finally {
      setLoadingMore(false)
    }
  }, [page, loadingMore, hasMore, user, name]) // Add 'name' dependency

  // Throttled scroll handler for infinite scrolling
  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop >= 
        document.documentElement.offsetHeight - 1000 && 
        hasMore && !loadingMore && !loading) {
      loadMoreNews()
    }
  }, [hasMore, loadingMore, loading, loadMoreNews])

  // Apply throttle to scroll handler
  const throttledScrollHandler = useMemo(
    () => throttle(handleScroll, 200),
    [handleScroll]
  )

  // Scroll event listener for infinite scroll
  useEffect(() => {
    window.addEventListener('scroll', throttledScrollHandler)
    return () => window.removeEventListener('scroll', throttledScrollHandler)
  }, [throttledScrollHandler])

  // Memoized filtered and sorted news
  const processedNews = useMemo(() => {
    logger.log('🔍 processedNews: Filtering news for category:', name)
    logger.log('🔍 processedNews: Available news items:', news.length)
    
    // Önce tüm haberlerin kategorilerini listeleyelim
    const allCategories = [...new Set(news.map(n => n.category))]
    logger.log('📂 processedNews: All available categories in news:', allCategories)
    
    // İki farklı filtreleme deneyelim: exact match ve case-insensitive
    let filtered = news.filter(n => n.category === name)
    logger.log('🔍 processedNews: Exact match filtered count:', filtered.length)
    
    if (filtered.length === 0) {
      // Case-insensitive deneme
      filtered = news.filter(n => n.category?.toLowerCase() === name?.toLowerCase())
      logger.log('🔍 processedNews: Case-insensitive match count:', filtered.length)
    }
    
    if (filtered.length === 0) {
      // Eğer hiç match etmiyorsa, tüm haberleri göster (debug için)
      logger.log('⚠️ processedNews: No category match found, showing all news for debugging')
      filtered = news
    }
    
    // Debugging: log the first few news items and their categories
    news.slice(0, 3).forEach((n, index) => {
      logger.log(`📰 processedNews: News item ${index + 1}: "${n.title}" - Category: "${n.category}"`)
    })
    
    // Sorting
    if (sort === 'date') {
      filtered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
    } else if (sort === 'title') {
      filtered = filtered.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sort === 'popularity') {
      filtered = filtered.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0))
    }
    
    logger.log('📊 processedNews: Final processed news count:', filtered.length)
    return filtered
  }, [news, name, sort])

  const pagedNews = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE
    return processedNews.slice(startIndex, startIndex + PAGE_SIZE)
  }, [processedNews, page])

  const totalPages = Math.ceil(processedNews.length / PAGE_SIZE)

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <PageLoadingProgress />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse"></div>
          </div>
          <NewsLoadingSkeleton count={6} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white min-h-screen">
        <NetworkErrorHandler 
          error={error}
          onRetry={handleRetry}
          showRefresh={true}
        />
      </div>
    )
  }  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 animate-fade-in">
      <ConnectionStatus />
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
          Kategori: <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">{name}</span>
        </h1>
        <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Bu kategorideki tüm haberler</p>
      </div>

      {/* Category Navigation */}
      <div className="card p-4 sm:p-6 mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Kategoriler</h3>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {categories.map(cat => (
            <Link
              key={cat.id || cat}
              to={`/kategori/${cat.name || cat}`}
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border-2 transition-all duration-200 font-medium text-sm sm:text-base ${
                (cat.name || cat) === name 
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white border-primary-500 shadow-red' 
                  : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
              }`}
            >
              {cat.name || cat}
            </Link>
          ))}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">        <div className="text-gray-600 text-sm sm:text-base">
          <span className="font-medium">{processedNews.length}</span> haber bulundu
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="text-xs sm:text-sm font-semibold text-gray-700">Sırala:</label>
          <select 
            value={sort} 
            onChange={e => setSort(e.target.value)} 
            className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"
          >
            <option value="date">Yeniden eskiye</option>
            <option value="popular">Popüler (Yorum)</option>
          </select>
        </div>
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
        {pagedNews.map((n, index) => (
          <article key={`category-news-${n.id}-${index}`} className="news-card fade-in">
            <div className="relative overflow-hidden">
              <LazyImage 
                src={n.image} 
                alt={n.title} 
                className="news-card-image" 
              />
              <div className="absolute top-3 left-3">
                <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">{n.category}</span>
              </div>
            </div>
            
            <div className="news-card-content">
              {/* Title */}
              <h3 className="news-card-title group-hover:text-red-600 transition-colors duration-300">
                <Link 
                  to={generateNewsUrl(n)}
                  onClick={() => handleNewsClick(n.id, n.title, n.category)}
                  className="hover:underline"
                >
                  {n.title}
                </Link>
              </h3>
              
              {/* Summary */}
              <p className="news-card-summary">
                {n.summary}
              </p>
              
              {/* Meta info and actions */}
              <div className="news-card-meta">
                {/* Date and Author */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="whitespace-nowrap">{new Date(n.date).toLocaleDateString('tr-TR')}</span>
                  </div>
                  {n.author && (
                    <div className="flex items-center space-x-1 min-w-0">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <Link
                        to={`/yazar/${n.AuthorId || n.authorId}`}
                        className="text-red-600 hover:text-red-700 font-medium transition-colors duration-200 truncate max-w-24"
                        title={n.authorDisplayName || n.author}
                      >
                        {n.authorDisplayName || n.author}
                      </Link>
                    </div>
                  )}
                </div>
                
                {/* Read More Button */}
                <Link 
                  to={generateNewsUrl(n)}
                  onClick={() => handleNewsClick(n.id, n.title, n.category)}
                  className="news-card-button group"
                >
                  Devamını Oku
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex gap-1 sm:gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-2 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-2 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border-2 transition-all duration-200 font-medium text-sm sm:text-base ${
                  page === i + 1 
                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white border-primary-500 shadow-red' 
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
                }`}
              >
                {i + 1}
              </button>
            ))}
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-2 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>          </div>
        </div>
      )}
      
      {/* Loading More Indicator */}
      {loadingMore && (
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            <span className="text-gray-600 font-medium">Daha fazla haber yükleniyor...</span>
          </div>
        </div>
      )}
      
      {/* No More News Indicator */}
      {!hasMore && processedNews.length > PAGE_SIZE && (
        <div className="flex justify-center items-center py-8">
          <span className="text-gray-500 font-medium">Bu kategorideki tüm haberler yüklendi</span>
        </div>
      )}
    </div>
  )
}

export default Category
