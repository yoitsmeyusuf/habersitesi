import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import SEOHead from '../components/SEOHead'
import { getDisplayName, getUserInitials } from '../utils/userUtils'

const AuthorProfile = () => {
  const { authorParam } = useParams()
  const [author, setAuthor] = useState(null)
  const [authorNews, setAuthorNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Check if parameter is numeric (ID) or string (username/slug)
  const isNumericId = /^\d+$/.test(authorParam)
  const actualAuthorName = isNumericId ? null : authorParam // Keep as-is for username, no space replacement

  useEffect(() => {
    const loadData = async () => {
      await loadAuthorProfile()
    }
    loadData()
  }, [authorParam]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadAuthorProfile = async () => {
    setLoading(true)
    setError('')

    try {
      let result
      
      if (isNumericId) {
        // Use ID-based endpoint
        result = await api.getAuthorProfileById(authorParam)      } else if (actualAuthorName) {
        // Use name-based endpoint with direct username
        result = await api.getAuthorProfile(actualAuthorName)
        
        // No need for case conversion - usernames should be exact match
      } else {
        // No valid author name or ID provided
        setError('Geçersiz yazar parametresi')
        return
      }        if (result.success === false) {
        setError(result.message)
      } else {
        // API response has nested author object and news array
        setAuthor(result.author || result)
          // If news data is included in the response, set it
        if (result.news) {
          setAuthorNews(result.news)
        }
      }
    } catch (error) {
      console.error('Author profile loading error:', error)
      setError('Yazar profili yüklenirken hata oluştu')    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 text-center">
        <div className="spinner mx-auto mb-4"></div>
        <div className="text-lg sm:text-xl font-semibold text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 text-center">
        <div className="alert-error">{error}</div>
        <Link to="/" className="inline-block mt-4 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all duration-200 font-semibold text-sm sm:text-base">
          Ana Sayfa'ya Dön
        </Link>
      </div>
    )
  }
  if (!author) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 text-center">
        <div className="text-lg sm:text-xl text-gray-600">Yazar bulunamadı.</div>
        <Link to="/" className="inline-block mt-4 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all duration-200 font-semibold text-sm sm:text-base">
          Ana Sayfa'ya Dön
        </Link>
      </div>
    )
  }

  return (<div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 animate-fade-in">      {/* SEO Head */}
      {author && author.username && (
        <SEOHead
          title={`${author.username} - Yazar Profili`}
          description={author.bio || `${author.username} tarafından yazılan haberler ve makaleler.`}
          keywords={`${author.username}, yazar, haber, makale`}
          author={author.username}
          type="profile"
        />
      )}      {/* Author Header */}
      <div className="card mb-8 sm:mb-10 lg:mb-12">
        {/* Author Info */}
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          <div className="flex flex-col items-center md:flex-row md:items-center gap-4 sm:gap-6 lg:gap-8">
            {/* Profile Picture */}
            <div className="relative">
              {author.profilePicture ? (                <img
                  src={author.profilePicture}
                  alt={`${getDisplayName(author)} profil resmi`}
                  className="w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-full object-cover border-4 sm:border-6 lg:border-8 border-white shadow-lg"
                />
              ) : (                <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-gradient-to-br from-primary-500 via-accent-500 to-primary-600 rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl lg:text-6xl font-bold border-4 sm:border-6 lg:border-8 border-white shadow-lg">
                  {getUserInitials(author)}
                </div>
              )}
            </div>              {/* Author Details */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-3 lg:mb-4">{getDisplayName(author)}</h1>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 sm:gap-3 lg:gap-4 mb-3 lg:mb-4">
                <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-full text-xs sm:text-sm font-semibold shadow-lg">
                  {author.role === 'admin' ? '🔧 Yönetici' : '✍️ Yazar'}
                </span>
                {author.createdAt && (
                  <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 text-gray-700 rounded-full text-xs sm:text-sm font-medium">
                    📅 {new Date(author.createdAt).toLocaleDateString('tr-TR')} tarihinden beri üye
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        {author.bio && (
          <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-7 lg:pb-8 border-t border-gray-100">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 sm:p-5 lg:p-6 rounded-xl lg:rounded-2xl">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Hakkında
              </h2>
              <p className="text-gray-700 leading-relaxed text-sm sm:text-base lg:text-lg">{author.bio}</p>
            </div>
          </div>
        )}
      </div>      {/* Author's News */}
      <div className="space-y-6 sm:space-y-8 lg:space-y-10">        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            {getDisplayName(author) || 'Yazar'} tarafından yazılan haberler
          </h2>
        </div>

        {authorNews && authorNews.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {authorNews.map((news) => (
                <article key={news.id} className="card group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                  {news.image && (
                    <div className="relative overflow-hidden rounded-t-2xl">
                      <img
                        src={news.image}
                        alt={news.title}
                        className="w-full h-40 sm:h-48 lg:h-56 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
                        <span className="category-tag shadow-lg text-xs sm:text-sm">{news.category}</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  )}
                  
                  <div className="p-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-4">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200 leading-tight">
                      <Link to={`/news/${news.id}`} className="hover:underline">
                        {news.title}
                      </Link>
                    </h3>
                    
                    {news.summary && (
                      <p className="text-gray-600 line-clamp-3 leading-relaxed text-sm sm:text-base">
                        {news.summary}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{new Date(news.date).toLocaleDateString('tr-TR')}</span>
                      </div>
                      
                      {news.commentCount > 0 && (
                        <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-500">
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">{news.commentCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}            </div>

            {/* Since all news are loaded with the profile, no need for Load More button */}
          </>
        ) : (
          <div className="text-center py-12 sm:py-16 lg:py-20">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Henüz haber yok</h3>
              <p className="text-gray-500 text-base sm:text-lg">Bu yazar henüz hiç haber yayınlamamış.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthorProfile
