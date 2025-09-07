import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../services/api'
import SEOHead from '../components/SEOHead'
import { generateNewsUrl } from '../utils/slugUtils'

const Author = () => {
  const { author } = useParams()
  // URL'deki '-' karakterlerini boşluğa çevir
  const authorName = author.replace(/-/g, ' ')
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState("Test Display Name") // Test için sabit değer
  const [authorInfo, setAuthorInfo] = useState(null) // Yazar detay bilgileri

  useEffect(() => {
    const loadAuthorData = async () => {
      setLoading(true)
      try {
        // Yazar bilgilerini çek
        const authorProfile = await api.getAuthorProfile(authorName)
        
        if (authorProfile && authorProfile.author) {
          setAuthorInfo(authorProfile.author)
          
          // En basit test - direkt displayName kullan
          const displayNameFromAPI = authorProfile.author.displayName
          
          if (displayNameFromAPI) {
            setDisplayName(displayNameFromAPI)
          } else {
            setDisplayName(authorProfile.author.username)
          }
        } else {
          // No author response
        }
        
        // Haberleri çek
        const allNewsResponse = await api.getNews({ author: authorName })
        const allNews = allNewsResponse.news || allNewsResponse || []
        // Backend'den gelen authorDisplayName veya author ile eşleştir
        const filteredNews = allNews.filter(n => {
          const authorMatch = n.author?.toLowerCase() === authorName.toLowerCase()
          const displayNameMatch = n.authorDisplayName?.toLowerCase() === authorName.toLowerCase()
          return authorMatch || displayNameMatch
        })
        setNews(filteredNews)
        
        // Eğer API'den yazar bilgisi gelmedi ama haberler var ve authorDisplayName varsa onu kullan
        if ((!authorProfile || !authorProfile.author || authorProfile.success === false) && filteredNews.length > 0 && filteredNews[0].authorDisplayName) {
          setDisplayName(filteredNews[0].authorDisplayName)
        }
      } catch (error) {
        console.error('[ERROR] Author data loading error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAuthorData()
  }, [authorName])
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 animate-fade-in">
      <SEOHead 
        title={`${displayName} - Yazarın Haberleri`}
        description={`${displayName} tarafından yazılan tüm haberler. Türkiye'nin en güncel haber sitesinde yazarın makalelerini okuyun.`}
        keywords={`${displayName}, yazar, haberci, türkiye haberleri`}
        url={`/yazar/${author}`}
      />
      
      {/* Yazar Başlığı */}
      <div className="text-center mb-8 sm:mb-10 lg:mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-red-600 to-red-700 rounded-full mb-4 sm:mb-6 overflow-hidden">
          {authorInfo?.profilePicture ? (
            <img 
              src={authorInfo.profilePicture} 
              alt={`${displayName} profil resmi`}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
          {displayName}
        </h1>
        <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
          {authorInfo?.bio || 'Yazarın tüm haberleri ve makaleleri'}
        </p>
        {authorInfo && (
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span>{authorInfo.role === 'admin' ? 'Yönetici' : 'Yazar'}</span>
            </div>
            {authorInfo.createdAt && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>{new Date(authorInfo.createdAt).getFullYear()} yılından beri üye</span>
              </div>
            )}
          </div>
        )}
        <div className="w-16 sm:w-20 lg:w-24 h-1 bg-gradient-to-r from-red-600 to-red-700 mx-auto mt-4 sm:mt-6 rounded-full"></div>
      </div>

      {/* Alt başlık */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-700">
          {displayName} tarafından yazılan haberler
        </h2>
      </div>

      {loading ? (
        <div className="text-center py-8 sm:py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-red-500"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">Haberler yükleniyor...</p>
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-12 sm:py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full mb-4 sm:mb-6">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl sm:text-2xl font-semibold text-gray-600 mb-2 sm:mb-3">Henüz Haber Yok</h3>
          <p className="text-gray-500 text-base sm:text-lg">Bu yazarın henüz yayınlanmış bir haberi bulunmuyor.</p>
        </div>
      ) : (        <>
          {/* Haberler Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {news.map((n, index) => (
              <article key={n.id} className={`news-card bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-500 group overflow-hidden fade-in stagger-delay-${(index % 3) + 1}`}>
                {n.image && (
                  <div className="relative overflow-hidden">
                    <img 
                      src={n.image} 
                      alt={n.title}
                      className="news-card-image w-full h-48 sm:h-56 lg:h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
                      <span className="category-pill bg-red-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-full text-xs font-bold shadow-lg">
                        {n.category}
                      </span>
                    </div>
                    <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                <div className="p-4 sm:p-6">                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 line-clamp-2 group-hover:text-red-600 transition-colors duration-300">
                    <Link to={generateNewsUrl(n)}>
                      {n.title}
                    </Link>
                  </h3>
                  <p className="text-gray-600 mb-4 sm:mb-6 line-clamp-3 leading-relaxed text-sm sm:text-base">
                    {n.summary}
                  </p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(n.date).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-red-600 font-medium">{n.authorDisplayName || n.author}</span>
                      </div>
                      {n.readTime && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{n.readTime} dk</span>
                        </div>
                      )}
                    </div>                    <Link
                      to={generateNewsUrl(n)}
                      className="inline-flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold text-xs sm:text-sm shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span>Oku</span>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default Author
