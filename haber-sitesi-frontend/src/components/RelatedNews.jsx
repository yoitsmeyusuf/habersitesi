import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import logger from '../utils/logger'
import { generateNewsUrl } from '../utils/slugUtils'

const RelatedNews = ({ currentNewsId, category, tags = [], limit = 6 }) => {
  const [relatedNews, setRelatedNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchRelatedNews = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Try to fetch news by category and tags
        let related = []
        
        // First try to get news from the same category
        if (category) {
          try {
            const categoryResponse = await api.getNewsByCategory(category, { page: 1, limit: limit + 3 })
            const categoryNews = categoryResponse?.data || categoryResponse || []
            related = categoryNews.filter(news => news.id !== currentNewsId)
          } catch (err) {
            logger.warn('Could not fetch category news:', err)
          }
        }
        
        // If we don't have enough, get latest news
        if (related.length < limit) {
          try {
            const latestResponse = await api.getNews({ page: 1, limit: limit + 5, sort: 'date' })
            const latestNews = latestResponse?.data || latestResponse || []
            const filtered = latestNews.filter(news => 
              news.id !== currentNewsId && 
              !related.some(r => r.id === news.id)
            )
            related = [...related, ...filtered]
          } catch (err) {
            logger.warn('Could not fetch latest news:', err)
          }
        }
        
        // Limit to requested number
        setRelatedNews(related.slice(0, limit))
      } catch (err) {
        logger.error('Error fetching related news:', err)
        setError('İlgili haberler yüklenemedi')
      } finally {
        setLoading(false)
      }
    }

    if (currentNewsId) {
      fetchRelatedNews()
    }
  }, [currentNewsId, category, tags, limit])

  if (loading) {
    return (
      <section className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3v8m0 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            İlgili Haberler
          </h3>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="flex space-x-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3v8m0 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            İlgili Haberler
          </h3>
        </div>
        
        <div className="p-6 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
        </div>
      </section>
    )
  }

  if (relatedNews.length === 0) {
    return (
      <section className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3v8m0 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            İlgili Haberler
          </h3>
        </div>
        
        <div className="p-6 text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>İlgili haber bulunamadı</p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4">
        <h3 className="text-xl font-bold flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3v8m0 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
          İlgili Haberler
        </h3>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {relatedNews.map((news, index) => (
            <article 
              key={news.id}
              className="group flex space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-transparent hover:border-gray-200"
            >
              {/* News Image */}
              <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24">
                {news.image ? (
                  <img 
                    src={news.image} 
                    alt={news.title}
                    className="w-full h-full object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* News Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                    {index + 1}
                  </div>
                </div>
                  <h4 className="mt-2 text-sm sm:text-base font-semibold text-gray-900 line-clamp-2 leading-tight group-hover:text-red-600 transition-colors duration-200">
                  <Link to={generateNewsUrl(news)}>
                    {news.title}
                  </Link>
                </h4>
                
                <div className="mt-2 flex items-center text-xs text-gray-500 space-x-3">
                  {news.date && (
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(news.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  )}
                  
                  {news.category && (
                    <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                      {news.category}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        
        {category && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link 
              to={`/kategori/${category}`}
              className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-200"
            >
              <span>{category} kategorisindeki tüm haberleri gör</span>
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

export default RelatedNews
