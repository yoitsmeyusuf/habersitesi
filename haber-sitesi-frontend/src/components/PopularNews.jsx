import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { generateNewsUrl } from '../utils/slugUtils'
import LazyImage from './LazyImage'
import logger from '../utils/logger'

const PopularNews = ({ limit = 5 }) => {
  const [popularNews, setPopularNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchPopularNews = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await api.getPopularNews({ limit })
        const data = response?.data || response || []
        // Frontend'de de limit uygula (backend limit çalışmıyorsa)
        const limitedData = Array.isArray(data) ? data.slice(0, limit) : []
        setPopularNews(limitedData)
      } catch (error) {
        logger.error('Error fetching popular news:', error)
        setError('Popüler haberler yüklenirken hata oluştu')
        setPopularNews([])
      } finally {
        setLoading(false)
      }
    }

    fetchPopularNews()
  }, [limit])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold">Popüler Haberler</h3>
          </div>
        </div>
        <div className="p-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex space-x-3 p-3 animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || popularNews.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold">Popüler Haberler</h3>
          </div>
        </div>
        <div className="p-4 text-center text-gray-500">
          {error || 'Henüz popüler haber bulunmuyor'}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold">Popüler Haberler</h3>
        </div>
      </div>
      
      <div className="divide-y divide-gray-100">
        {popularNews.slice(0, limit).map((news, index) => (
          <article key={news.id} className="group hover:bg-gray-50 transition-colors duration-200">
            <Link 
              to={generateNewsUrl(news)}
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
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-snug mb-2">
                  {news.title}
                </h4>
                
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>{news.viewCount || 0}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{news.commentCount || 0}</span>
                  </div>
                  
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                    {news.category}
                  </span>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
      
      <div className="bg-gray-50 px-4 py-3 text-center">
        <Link 
          to="/popular" 
          className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
        >
          Tüm Popüler Haberleri Gör →
        </Link>
      </div>
    </div>
  )
}

export default PopularNews
