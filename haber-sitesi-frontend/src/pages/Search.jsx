import { useState, useEffect, useContext, useMemo } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { UserContext } from '../contexts/UserContext'
import SEOHead from '../components/SEOHead'
import LazyImage from '../components/LazyImage'
import { debounce, TouchGestureHandler } from '../utils/mobileOptimization'
import { trackSearchInteraction } from '../utils/analytics'
import { NetworkErrorHandler, FormErrorDisplay, ConnectionStatus } from '../components/ErrorHandling'
import { PageLoadingProgress } from '../components/ProgressIndicators'
import { LoadingSkeleton } from '../components/Loading'
import { withRetry } from '../utils/formUtils'
import { generateNewsUrl } from '../utils/slugUtils'

const Search = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useContext(UserContext)
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState(null)
  const [error, setError] = useState('')
  const [networkError, setNetworkError] = useState(false)
  
  // Gelişmiş arama filtreleri
  const [filters, setFilters] = useState({
    q: '',
    category: '',
    author: '',
    tags: '',
    startDate: '',
    endDate: '',
    featured: '',
    sortBy: 'relevance',
    page: 1,
    pageSize: 12
  })

  // URL'den arama parametrelerini al
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const urlFilters = {
      q: params.get('q') || '',
      category: params.get('category') || '',
      author: params.get('author') || '',
      tags: params.get('tags') || '',
      startDate: params.get('startDate') || '',
      endDate: params.get('endDate') || '',
      featured: params.get('featured') || '',
      sortBy: params.get('sortBy') || 'relevance',
      page: parseInt(params.get('page')) || 1,
      pageSize: parseInt(params.get('pageSize')) || 12
    }
    setFilters(urlFilters)
  }, [location.search])
  // Kategorileri yükle
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setError('')
        const result = await withRetry(() => api.getCategories(), 3)
        setCategories(result)
      } catch (error) {
        console.error('Kategoriler yüklenirken hata:', error)
        setError('Kategoriler yüklenirken hata oluştu')
        setNetworkError(true)
      }
    }    
    loadCategories()
  }, [])
  // Debounced search function for better performance
  const debouncedSearch = useMemo(
    () => debounce(async (searchFilters) => {
      if (!searchFilters.q && !searchFilters.category && !searchFilters.author && !searchFilters.tags) {
        setSearchResults([])
        setPagination(null)
        return
      }

      setLoading(true)
      setError('')
      setNetworkError(false)
      
      try {
        const result = await withRetry(() => api.advancedSearchNews(searchFilters), 3)
        
        if (result.success === false) {
          setSearchResults([])
          setPagination(null)
        } else {
          let filteredResults = result.data || []
          // Normal kullanıcılar sadece onaylanmış haberleri görsün (admin hepsini görebilir)
          if (user?.role !== 'admin') {
            filteredResults = filteredResults.filter(n => n.isApproved === true)
          }
          
          setSearchResults(filteredResults)
          setPagination(result.pagination || null)

          // Track search analytics
          trackSearchInteraction(searchFilters.q, filteredResults.length, {
            category: searchFilters.category,
            author: searchFilters.author,
            sortBy: searchFilters.sortBy,
            page: searchFilters.page
          })
        }
      } catch (error) {
        console.error('Search error:', error)
        setError('Arama sırasında bir hata oluştu. Lütfen tekrar deneyin.')
        setNetworkError(true)
        setSearchResults([])
        setPagination(null)
      } finally {
        setLoading(false)
      }
    }, 500), // 500ms debounce
    [user]
  )

  // Use debounced search
  useEffect(() => {
    debouncedSearch(filters)
  }, [filters, debouncedSearch])

  // Memoized search results for better performance
  const memoizedSearchResults = useMemo(() => {
    return searchResults.map(news => ({
      ...news,
      // Pre-calculate display values
      displayDate: new Date(news.date).toLocaleDateString('tr-TR'),
      displayCategory: news.category || 'Genel'
    }))
  }, [searchResults])

  const updateFilters = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 }
    setFilters(updatedFilters)
    
    // URL'yi güncelle
    const params = new URLSearchParams()
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })
    navigate(`/search?${params.toString()}`, { replace: true })
  }

  const changePage = (newPage) => {
    const updatedFilters = { ...filters, page: newPage }
    setFilters(updatedFilters)
    
    const params = new URLSearchParams(location.search)
    params.set('page', newPage)
    navigate(`/search?${params.toString()}`, { replace: true })
  }

  const clearFilters = () => {
    setFilters({
      q: '',
      category: '',
      author: '',
      tags: '',
      startDate: '',
      endDate: '',
      featured: '',
      sortBy: 'relevance',
      page: 1,
      pageSize: 12    })
    navigate('/search')
  }

  return (    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8 animate-fade-in">
      <ConnectionStatus />
      
      <SEOHead 
        title={`Arama Sonuçları${filters.q ? ` - ${filters.q}` : ''}`}
        description={`Türkiye'nin en güncel haber sitesinde arama yapın. ${filters.q ? `'${filters.q}' için sonuçlar` : 'Tüm haberlerimizi inceleyin'}.`}
        keywords={`haber arama, ${filters.q || 'güncel haberler'}, türkiye haberleri`}
        url={`/search${location.search}`}
      />

      {/* Network Error Handler */}
      {networkError && (
        <NetworkErrorHandler 
          onRetry={() => {
            setNetworkError(false)
            setError('')
            // Trigger search again
            const event = new Event('searchRetry')
            window.dispatchEvent(event)
          }}
        />
      )}

      {/* Error Display */}
      {error && !networkError && (
        <div className="alert-error mb-6">
          {error}
        </div>
      )}
      
      {/* Arama Başlığı */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-3 sm:mb-4">
          Gelişmiş Arama
        </h1>
        <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Haber arşivinde detaylı arama yapın</p>
      </div>

      {/* Arama Filtreleri */}
      <div className="card p-4 sm:p-6 mb-6 sm:mb-8 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Arama Terimi */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Arama Terimi</label>
            <input
              type="text"
              placeholder="Haber ara..."
              value={filters.q}
              onChange={(e) => updateFilters({ q: e.target.value })}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Kategori</label>
            <select
              value={filters.category}
              onChange={(e) => updateFilters({ category: e.target.value })}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"            >
              <option value="">Tüm Kategoriler</option>
              {categories.map(cat => (
                <option key={cat.id || cat} value={cat.name || cat}>
                  {cat.name || cat}
                </option>
              ))}
            </select>
          </div>

          {/* Yazar */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Yazar</label>
            <input
              type="text"
              placeholder="Yazar adı..."
              value={filters.author}
              onChange={(e) => updateFilters({ author: e.target.value })}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"
            />
          </div>

          {/* Etiketler */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Etiketler</label>
            <input
              type="text"
              placeholder="Etiket1, Etiket2..."
              value={filters.tags}
              onChange={(e) => updateFilters({ tags: e.target.value })}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"
            />
          </div>

          {/* Başlangıç Tarihi */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Başlangıç Tarihi</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilters({ startDate: e.target.value })}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"
            />
          </div>

          {/* Bitiş Tarihi */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Bitiş Tarihi</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilters({ endDate: e.target.value })}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"
            />
          </div>          {/* Manşet Filtresi */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Manşet Haberleri</label>
            <select
              value={filters.featured}
              onChange={(e) => updateFilters({ featured: e.target.value })}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"
            >
              <option value="">Tümü</option>
              <option value="true">Sadece Manşet</option>
              <option value="false">Manşet Değil</option>
            </select>
          </div>

          {/* Sıralama */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Sıralama</label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilters({ sortBy: e.target.value })}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-sm sm:text-base"
            >
              <option value="relevance">İlgililik</option>
              <option value="date">Tarih (Yeniden Eskiye)</option>
              <option value="title">Başlık (A-Z)</option>
              <option value="author">Yazar (A-Z)</option>
              <option value="comments">Yorum Sayısı</option>
            </select>
          </div>

          {/* Temizle Butonu */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-500 text-white rounded-lg sm:rounded-xl hover:bg-gray-600 transition-all duration-200 font-semibold text-sm sm:text-base"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
      </div>      {/* Arama Sonuçları */}
      {loading ? (
        <div className="space-y-6">
          <div className="text-center py-4">
            <PageLoadingProgress />
            <p className="mt-4 text-gray-600">Aranıyor...</p>
          </div>
          
          {/* Loading skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <LoadingSkeleton key={index} type="news-card" />
            ))}
          </div>
        </div>
      ) : (
        <>          {/* Sonuç Sayısı */}
          {pagination && (
            <div className="mb-4 sm:mb-6 text-gray-600 text-sm sm:text-base">
              <span className="font-semibold">{pagination.totalCount}</span> sonuç bulundu
              {filters.q && <span> - "{filters.q}" için</span>}
            </div>
          )}          {/* Sonuçlar Grid */}
          {memoizedSearchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {memoizedSearchResults.map((news, index) => (
                <article key={`search-result-${news.id}-${index}`} className="news-card fade-in">
                  <div className="relative overflow-hidden">
                    {news.image && (
                      <LazyImage 
                        src={news.image} 
                        alt={news.title} 
                        className="news-card-image" 
                      />
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">{news.category}</span>
                    </div>
                    {news.featured && (
                      <div className="absolute top-3 right-3">
                        <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full text-xs font-bold shadow-lg">
                          MANŞET
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="news-card-content">
                    <h3 className="news-card-title group-hover:text-primary-600 transition-colors duration-200">
                      <Link to={generateNewsUrl(news)}>
                        {news.title}
                      </Link>
                    </h3>
                    <p className="news-card-summary">{news.summary}</p>
                    
                    <div className="news-card-meta">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                          <span className="whitespace-nowrap">{news.displayDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="category-tag text-xs bg-gray-100 px-2 py-1 rounded-full">{news.displayCategory}</span>
                        </div>
                      </div>

                      {news.author && (
                        <div className="mb-3">
                          <Link 
                            to={`/yazar/${news.AuthorId || news.authorId}`}
                            className="text-primary-600 hover:text-primary-700 transition-colors duration-200 truncate max-w-24 text-xs font-medium"
                            title={news.authorDisplayName || news.author}
                          >
                            {news.authorDisplayName || news.author}
                          </Link>
                        </div>
                      )}

                      {/* Etiketler */}
                      {news.tags && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {news.tags.split(',').slice(0, 3).map(tag => (
                            <span 
                              key={tag.trim()} 
                              className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                            >
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      <Link 
                        to={generateNewsUrl(news)} 
                        className="news-card-button group"
                      >
                        Devamını Oku
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            !loading && (
              <div className="text-center py-8 sm:py-12 card">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">Sonuç Bulunamadı</h3>
                <p className="text-gray-500 text-sm sm:text-base">Arama kriterlerinize uygun haber bulunamadı. Farklı terimlerle deneyiniz.</p>
              </div>
            )
          )}

          {/* Sayfalama */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <div className="flex gap-1 sm:gap-2">
                <button
                  onClick={() => changePage(Math.max(1, filters.page - 1))}
                  disabled={filters.page === 1}
                  className="px-2 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {Array.from({ length: pagination.totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => changePage(i + 1)}
                    className={`px-2 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border-2 transition-all duration-200 font-medium text-sm sm:text-base ${
                      filters.page === i + 1 
                        ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white border-primary-500 shadow-red' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                
                <button
                  onClick={() => changePage(Math.min(pagination.totalPages, filters.page + 1))}
                  disabled={filters.page === pagination.totalPages}
                  className="px-2 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Search
