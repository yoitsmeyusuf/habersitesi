import { useState, useEffect, useContext, useCallback, useMemo, memo } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { UserContext } from '../contexts/UserContext'
// import PushNotifications from '../components/PushNotifications'
import SEOHead from '../components/SEOHead'
import LazyImage from '../components/LazyImage'
import PopularNews from '../components/PopularNews'
import { trackPageView, trackNewsInteraction } from '../utils/analytics'
import { NetworkErrorHandler, ConnectionStatus } from '../components/ErrorHandling'
import { NewsLoadingSkeleton, PageLoadingProgress } from '../components/ProgressIndicators'
import { generateNewsUrl } from '../utils/slugUtils'
import { getDisplayName, getUserInitials } from '../utils/userUtils'
import { throttle } from '../utils/mobileOptimization'
import logger from '../utils/logger'

// Memoized NewsCard component for better performance
const NewsCard = memo(({ news, index, onNewsClick }) => (
  <article className={`news-card fade-in stagger-delay-${(index % 5) + 1}`}>
    {news.image && (
      <div className="relative overflow-hidden">
        <LazyImage 
          src={news.image} 
          alt={news.title}
          className="news-card-image"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute top-3 left-3">
          <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
            {news.category}
          </span>
        </div>
      </div>
    )}
    
    <div className="news-card-content">
      {/* Title */}
      <h3 className="news-card-title group-hover:text-red-600 transition-colors duration-300">
        <Link 
          to={generateNewsUrl(news)}
          onClick={() => onNewsClick(news.id, news.title, news.category)}
          className="hover:underline"
        >
          {news.title}
        </Link>
      </h3>
      
      {/* Summary */}
      <p className="news-card-summary">
        {news.summary}
      </p>
      
      {/* Meta info and actions */}
      <div className="news-card-meta">
        {/* Date and Author */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
            </svg>
            <span className="whitespace-nowrap">{new Date(news.date).toLocaleDateString('tr-TR')}</span>
          </div>
          <div className="flex items-center space-x-1 min-w-0">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="truncate max-w-24" title={news.authorDisplayName || news.author}>
              {news.authorDisplayName || news.author}
            </span>
          </div>
        </div>
        
        {/* Read More Button */}
        <Link 
          to={generateNewsUrl(news)}
          onClick={() => onNewsClick(news.id, news.title, news.category)}
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
))

NewsCard.displayName = 'NewsCard'

// Memoized SidebarNewsItem component
const SidebarNewsItem = memo(({ news, onNewsClick, index }) => (
  <article className="group hover:bg-blue-50 transition-colors duration-200">
    <Link 
      to={generateNewsUrl(news)}
      onClick={() => onNewsClick(news.id, news.title, news.category)}
      className="flex items-start space-x-3 p-4"
    >
      <div className="flex-shrink-0">
        <div className="relative">
          <LazyImage 
            src={news.image} 
            alt={news.title}
            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
            size="small"
          />
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {index + 1}
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug mb-2">
          {news.title}
        </h4>
        
        <div className="flex items-center space-x-3 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">{new Date(news.date).toLocaleDateString('tr-TR')}</span>
            <span className="sm:hidden">{new Date(news.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
          </div>
          
          {news.commentCount !== undefined && (
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{news.commentCount || 0}</span>
            </div>
          )}
          
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {news.category}
          </span>
        </div>
      </div>
    </Link>
  </article>
))

SidebarNewsItem.displayName = 'SidebarNewsItem'

const Home = () => {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [news, setNews] = useState([])
  const [categories, setCategories] = useState([])
  const [featuredNews, setFeaturedNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const { user } = useContext(UserContext)
  
  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0)
    
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [newsData, categoriesData, featuredData] = await Promise.all([
          api.getNews({ page: 1, limit: 10 }), // Get first page with 10 items
          api.getCategories(),
          api.getFeaturedNews(),
        ])        // Handle different response structures with duplicate control
        let initialNews = []
        if (Array.isArray(newsData)) {
          initialNews = newsData
        } else if (newsData.data) {
          initialNews = newsData.data
        } else {
          initialNews = []
        }

        // Remove duplicates from initial news data
        const uniqueNews = initialNews.filter((news, index, array) => 
          array.findIndex(n => n.id === news.id) === index
        )

        setNews(uniqueNews)

        // Normal kullanıcılar sadece onaylanmış haberleri görsün (admin hepsini görebilir)
        if (user?.role !== 'admin') {
          setNews(prevNews => prevNews.filter(n => n.isApproved === true))
        }

        setCategories(categoriesData || [])
        setFeaturedNews(featuredData || [])
      } catch (error) {
        logger.error('Error loading data:', error)
        setError('Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.')
        setNews([])
        setCategories([])
        setFeaturedNews([])
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [user])

  // Track page view
  useEffect(() => {
    trackPageView('/', 'Ana Sayfa')
  }, [])

  // Memoized event handlers
  const handleNewsClick = useCallback((newsId, title, category) => {
    trackNewsInteraction('click', { newsId, title, category })
  }, [])  // Load more news function
  const loadMoreNews = useCallback(async () => {
    if (loadingMore || !hasMore) return
    
    setLoadingMore(true)
    try {
      const newNewsData = await api.getNews({ page: page + 1, limit: 10 })
      const newNews = newNewsData?.data || newNewsData || []
      
      if (newNews && newNews.length > 0) {
        setNews(prevNews => {
          // Duplicate kontrolü - mevcut haberlerin ID'lerini al
          const existingIds = new Set(prevNews.map(n => n.id))
          // Sadece yeni haberleri ekle
          const uniqueNewNews = newNews.filter(n => !existingIds.has(n.id))
          
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
          setHasMore(newNews.length >= 10)
        }
      } else {
        setHasMore(false)
      }
    } catch (error) {
      logger.error('Error loading more news:', error)
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [page, loadingMore, hasMore])

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

  // Fallback dummy data if no featured news from API
  const dummyFeaturedNews = [
    {
      id: 'dummy-1',
      title: "Türkiye'de Ekonomik Büyüme Hızlanıyor: Yeni Yatırımlar Geliyor",
      summary: "Ekonomi uzmanları, son çeyrek verilerinin ülke ekonomisinde önemli bir toparlanma işareti verdiğini belirtiyor.",
      image: "https://via.placeholder.com/800x400/1f2937/ffffff?text=Ekonomi+Haberi",
      category: "Ekonomi",
      date: new Date().toISOString(),
      author: "Ahmet Yılmaz"
    },
    {
      id: 'dummy-2',
      title: "Teknoloji Sektöründe Yeni Dönem: Yapay Zeka Yatırımları Artıyor",
      summary: "Türk teknoloji şirketleri, yapay zeka alanında önemli yatırımlar yaparak global pazarda rekabet gücünü artırıyor.",
      image: "https://via.placeholder.com/800x400/dc2626/ffffff?text=Teknoloji+Haberi",
      category: "Teknoloji",
      date: new Date().toISOString(),
      author: "Ayşe Demir"
    },
    {
      id: 'dummy-3',
      title: "Spor Dünyasında Büyük Başarı: Milli Takım Avrupa Şampiyonu",
      summary: "Türk Milli Takımı, Avrupa Şampiyonası'nda tarihi bir başarıya imza atarak şampiyonluk kupasını kazandı.",
      image: "https://via.placeholder.com/800x400/059669/ffffff?text=Spor+Haberi",
      category: "Spor",
      date: new Date().toISOString(),
      author: "Mehmet Özkan"
    },
    {
      id: 'dummy-4',
      title: "Sağlık Alanında Çığır Açan Keşif: Yeni Tedavi Yöntemi Geliştirildi",
      summary: "Türk bilim insanları, kanser tedavisinde umut veren yeni bir tedavi yöntemi geliştirdi.",
      image: "https://via.placeholder.com/800x400/7c3aed/ffffff?text=Saglik+Haberi",
      category: "Sağlık",
      date: new Date().toISOString(),
      author: "Dr. Fatma Kaya"
    },
    {
      id: 'dummy-5',
      title: "Çevre Dostu Projeler Hayata Geçiyor: Yeşil Şehir Dönüşümü",
      summary: "Büyükşehir belediyesi, şehri daha yeşil ve sürdürülebilir hale getirmek için kapsamlı projeler başlatıyor.",
      image: "https://via.placeholder.com/800x400/16a34a/ffffff?text=Cevre+Haberi",
      category: "Çevre",
      date: new Date().toISOString(),
      author: "Zeynep Arslan"
    }
  ]

  // Use API data if available, otherwise use dummy data
  const displayFeaturedNews = featuredNews.length > 0 ? featuredNews : dummyFeaturedNews    // Carousel functions
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % displayFeaturedNews.length)
  }, [displayFeaturedNews.length])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + displayFeaturedNews.length) % displayFeaturedNews.length)
  }, [displayFeaturedNews.length])
  
  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(nextSlide, 5000) // 5 saniyede bir değiş
    return () => clearInterval(interval)
  }, [nextSlide])

  // Scroll event listener for infinite scroll
  useEffect(() => {
    window.addEventListener('scroll', throttledScrollHandler)
    return () => {
      window.removeEventListener('scroll', throttledScrollHandler)
    }
  }, [throttledScrollHandler])

  const goToSlide = (index) => {
    setCurrentSlide(index)
  }
  // Memoized calculations for better performance with duplicate control
  const filteredNews = useMemo(() => {
    // First remove duplicates, then filter
    const uniqueNews = news.filter((news, index, array) => 
      array.findIndex(n => n.id === news.id) === index
    )
    
    return uniqueNews.filter(
      (n) =>
        (search
          ? (n.title?.toLowerCase().includes(search.toLowerCase()) ||
            (n.summary?.toLowerCase() ?? '').includes(search.toLowerCase()))
          : true) && (filterCategory ? n.category === filterCategory : true)
    )
  }, [news, search, filterCategory])

  const sortedData = useMemo(() => {
    // First remove duplicates from news array
    const uniqueNews = news.filter((newsItem, index, array) => 
      array.findIndex(n => n.id === newsItem.id) === index
    )
    
    const latestNews = [...uniqueNews].sort((a, b) => new Date(b.date) - new Date(a.date))
    
    logger.log('🏠 Home sortedData calculation:', {
      totalNews: uniqueNews.length,
      originalNews: news.length,
      latestNewsLength: latestNews.length,
      firstFewTitles: latestNews.slice(0, 3).map(n => n.title?.substring(0, 30))
    })
    
    // Son Eklenenler için daha akıllı seçim
    // Eğer çok az haber varsa, mevcut haberlerin bir kısmını kullan
    // Eğer yeterince haber varsa, ana grid'de gösterilmeyenleri kullan
    let sidebarNews = []
    
    if (latestNews.length <= 6) {
      // Az haber varsa, son 3-5 haberi göster
      sidebarNews = latestNews.slice(0, Math.min(5, latestNews.length))
      logger.log('📰 Using first few news for sidebar (<=6 total)')
    } else if (latestNews.length <= 12) {
      // Orta miktarda haber varsa, son 6'yı ana grid'de göster, geri kalanını sidebar'da
      sidebarNews = latestNews.slice(6, latestNews.length)
      logger.log('📰 Using remaining news for sidebar (6-12 total)')
    } else {
      // Çok haber varsa, ana grid dışından 5 tanesini al
      sidebarNews = latestNews.slice(6, 11)
      logger.log('📰 Using 6-11 range for sidebar (12+ total)')
    }
    
    // Eğer hala sidebar news yoksa, en son eklenen 5 haberi al
    if (sidebarNews.length === 0 && latestNews.length > 0) {
      sidebarNews = latestNews.slice(0, Math.min(5, latestNews.length))
      logger.log('📰 Fallback: using first news for sidebar')
    }
    
    logger.log('📊 Sidebar news result:', {
      sidebarNewsLength: sidebarNews.length,
      sidebarTitles: sidebarNews.map(n => n.title?.substring(0, 30))
    })
    
    const featured = news.find((n) => n.featured)
    
    return {
      latestNews,
      sidebarNews,
      featured
    }
  }, [news])

  const { sidebarNews, featured } = sortedData
  const handleRetry = useCallback(() => {
    setError(null)
    setLoading(true)
    // Soft refresh: re-fetch homepage data without full reload
    ;(async () => {
      try {
        const [newsData, categoriesData, featuredData] = await Promise.all([
          api.getNews({ page: 1, limit: 10 }),
          api.getCategories(),
          api.getFeaturedNews(),
        ])
        const initialNews = Array.isArray(newsData) ? newsData : (newsData?.data || [])
        const uniqueNews = initialNews.filter((item, idx, arr) => arr.findIndex(n => n.id === item.id) === idx)
        setNews(uniqueNews)
        if (user?.role !== 'admin') {
          setNews(prev => prev.filter(n => n.isApproved === true))
        }
        setCategories(categoriesData || [])
        setFeaturedNews(featuredData || [])
        setPage(1)
        setHasMore(true)
      } catch (e) {
        logger.error('Soft refresh failed:', e)
        setError('Veriler yeniden yüklenemedi. Lütfen tekrar deneyin.')
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  // Listen to mobile pull-to-refresh custom event for soft refresh
  useEffect(() => {
    const onPull = () => handleRetry()
    window.addEventListener('app:pullToRefresh', onPull)
    return () => window.removeEventListener('app:pullToRefresh', onPull)
  }, [handleRetry])

  // Infinite scroll load more - REMOVED DUPLICATE LOGIC
  // This useEffect was causing duplicate news because it doesn't have proper duplicate control
  // The main loadMoreNews function above already handles infinite scrolling properly

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <PageLoadingProgress />
        <div className="max-w-7xl mx-auto px-4 py-8">
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
    <div className="bg-white">
      <ConnectionStatus />
      
      {/* SEO Head - Enhanced with better keywords and meta tags */}
      <SEOHead
        title="Güncel Haberler, Son Dakika Haberleri | Türkiye Haber Sitesi"
        description="Türkiye'nin en güncel haber sitesi. Son dakika haberleri, siyaset, ekonomi, spor, teknoloji, sağlık, dünya haberleri ve daha fazlası. 7/24 güvenilir haber kaynağı."
        keywords="son dakika, güncel haberler, türkiye haberleri, siyaset haberleri, ekonomi, spor haberleri, teknoloji, sağlık, dünya haberleri, breaking news, haber sitesi, güvenilir haber"
        url={window.location.origin}
        canonicalUrl={window.location.origin}
        ogType="website"
        ogImage={`${window.location.origin}/icon-512x512.png`}
        twitterCard="summary_large_image"
      />

      {/* Breaking News Banner - Carousel üstünde */}
      {featured && (
        <div className="bg-red-600 text-white py-2 sm:py-3 overflow-hidden border-b-2 border-red-700">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <div className="flex items-center">
              <span className="bg-yellow-400 text-red-900 px-2 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold mr-3 sm:mr-6 animate-pulse shadow-lg">
                🔥 <span className="hidden sm:inline">SON DAKİKA</span>
              </span>
              <div className="flex-1 overflow-hidden">
                <div className="breaking-news-marquee whitespace-nowrap">
                  <Link to={generateNewsUrl(featured)} className="hover:underline text-sm sm:text-lg font-medium transition-all duration-300">
                    {featured.title}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured News Carousel */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-blue-600/20"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_40%,rgba(220,38,38,0.1),transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        </div>

        {/* Carousel Container */}
        <div className="relative h-[500px] sm:h-[600px] lg:h-[700px] overflow-hidden">
          {/* Slides */}
          <div 
            className="flex transition-transform duration-700 ease-in-out h-full"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {displayFeaturedNews.map((news, idx) => (
              <div 
                key={news.id} 
                className="min-w-full h-full relative flex items-center overflow-hidden"
              >
                {/* Hero background image as real <img> for better LCP */}
                <img
                  src={news.image}
                  alt=""
                  aria-hidden="true"
                  decoding="async"
                  loading={idx === currentSlide ? 'eager' : 'lazy'}
                  fetchPriority={idx === currentSlide ? 'high' : 'auto'}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
                {/* Content */}
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 relative z-10">
                  <div className="max-w-4xl">
                    {/* Category Badge */}
                    <div className="inline-flex items-center bg-red-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base font-bold mb-4 sm:mb-6 shadow-lg animate-pulse">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3 animate-ping"></span>
                      MANŞET • {news.category.toUpperCase()}
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 leading-tight text-white">
                      {news.title}
                    </h1>

                    {/* Summary */}
                    <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-6 sm:mb-8 leading-relaxed line-clamp-3 max-w-3xl">
                      {news.summary}
                    </p>

                    {/* Meta Info */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6 mb-6 sm:mb-8 text-gray-400">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(news.date).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span>{news.authorDisplayName || news.author}</span>
                      </div>
                    </div>

                    {/* Read More Button */}                    <Link 
                      to={generateNewsUrl(news)}
                      className="inline-flex items-center px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-bold text-base sm:text-lg shadow-2xl hover:shadow-red-500/25 transform hover:scale-105 group"
                    >
                      Haberi Oku
                      <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-10 right-10 w-32 h-32 bg-red-600/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-10 left-10 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl"></div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm group z-20 hover:scale-110 active:scale-95"
          >
            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm group z-20 hover:scale-110 active:scale-95"
          >
            <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>          {/* Slide Indicators */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20 carousel-indicators">
            {displayFeaturedNews.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
                aria-label={`Slide ${index + 1}'e git`}
              >
                <div className="dot-inner"></div>
              </button>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-black/20">            <div 
              className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300"
              style={{ width: `${((currentSlide + 1) / displayFeaturedNews.length) * 100}%` }}
            />
          </div>
        </div>
      </section>{/* User Welcome */}
      {user && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg sm:rounded-2xl shadow-lg mx-3 sm:mx-0">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg">
                    {getUserInitials(user)}
                  </div>
                </div>
                <div>
                  <p className="text-blue-800 font-bold text-base sm:text-lg">
                    Hoş geldiniz, <span className="text-indigo-700">{getDisplayName(user)}</span>!
                  </p>
                  <p className="text-blue-600 text-xs sm:text-sm font-medium">
                    {user.role === 'author' ? '✍️ Yazar' : user.role === 'admin' ? '👑 Admin' : '👤 Kullanıcı'} olarak giriş yaptınız
                  </p>
                </div>
              </div>
              {(user.role === 'admin' || user.role === 'author') && (
                <Link 
                  to="/yonetim" 
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">Admin Paneli</span>
                  <span className="sm:hidden">Panel</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Push Notifications */}
      {user && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Push notifications temporarily disabled for performance */}
        </div>
      )}      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Main News Section */}
          <div className="xl:col-span-3">            {/* Search and Filter */}
            <div className="mb-6 sm:mb-8 lg:mb-12 bg-white p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 fade-in">
              <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6">
                <div className="flex-1 search-container">
                  <svg className="search-icon w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Haber ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="search-input w-full py-3 sm:py-4 text-base sm:text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300"
                  />
                </div>
                <div className="w-full">
                  <select 
                    value={filterCategory} 
                    onChange={e => setFilterCategory(e.target.value)} 
                    className="w-full px-4 py-3 sm:px-6 sm:py-4 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 text-base sm:text-lg bg-white"
                  >
                    <option value="">Tüm Kategoriler</option>
                    {categories.map(cat => (
                      <option key={cat.id || cat} value={cat.name || cat}>
                        {cat.name || cat}
                      </option>
                    ))}
                  </select>
                </div>
                <Link 
                  to="/search" 
                  className="px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg sm:rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold text-center whitespace-nowrap shadow-lg hover:shadow-xl transform hover:scale-105 btn-modern text-sm sm:text-base"
                >
                  🔍 <span className="hidden sm:inline">Gelişmiş </span>Arama
                </Link>
              </div>
            </div>

            {/* Latest News Grid */}
            <div className="space-y-6 sm:space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Son Haberler</h2>
                <div className="h-px bg-gray-300 flex-1 ml-3 sm:ml-6"></div>
              </div>              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {filteredNews.map((news, index) => (
                  <NewsCard 
                    key={`news-${news.id}-${index}`}
                    news={news}
                    index={index}
                    onNewsClick={handleNewsClick}
                  />
                ))}
              </div>
            </div>
          </div>          {/* Sidebar */}
          <div className="sidebar-sticky space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Popular News */}
            {/* Popular News - Using real backend data */}
            <PopularNews limit={5} />

            {/* Categories */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden fade-in">
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 sm:px-6 sm:py-5">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Kategoriler</h3>
                </div>
              </div>
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {categories.map(cat => (
                    <Link
                      key={cat.id || cat}
                      to={`/kategori/${cat.name || cat}`}
                      className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-all duration-300 group border border-transparent hover:border-gray-200 hover:shadow-md"
                    >
                      <span className="font-semibold text-gray-700 group-hover:text-red-600 transition-colors flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-600 rounded-full group-hover:scale-125 transition-transform flex-shrink-0"></div>
                        <span className="text-xs sm:text-sm truncate">{cat.name || cat}</span>
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 sm:px-3 sm:py-1 rounded-full group-hover:bg-red-100 group-hover:text-red-600 transition-all duration-300 font-medium shadow-sm flex-shrink-0 ml-2">
                        {news.filter(n => n.category === (cat.name || cat)).length}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent News */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden fade-in">              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 sm:px-6 sm:py-5">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Son Eklenenler</h3>
                </div>
              </div>              <div className="divide-y divide-gray-100">
                {sidebarNews && sidebarNews.length > 0 ? (
                  sidebarNews.map((news, index) => (
                    <SidebarNewsItem 
                      key={`sidebar-${news.id}-${news.date}`}
                      news={news}
                      index={index}
                      onNewsClick={handleNewsClick}
                    />
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" />
                    </svg>
                    <p className="text-gray-500 text-sm">
                      Henüz yeterli haber yok
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      Yeni haberler eklendikçe burada görünecek
                    </p>
                  </div>
                )}
              </div>

              {sidebarNews && sidebarNews.length > 0 && (
                <div className="bg-gray-50 px-4 py-3 text-center">
                  <Link 
                    to="/search?sortBy=date" 
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Tüm Son Haberleri Gör →
                  </Link>
                </div>
              )}
            </div>          </div>
        </div>
        
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
        {!hasMore && news.length > 10 && (
          <div className="flex justify-center items-center py-8">
            <span className="text-gray-500 font-medium">Tüm haberler yüklendi</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
