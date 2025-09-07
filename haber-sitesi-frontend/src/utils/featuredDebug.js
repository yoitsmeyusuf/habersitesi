// Featured News Debug Utility
// Bu dosya manşet haberleri yönetimindeki sorunları debug etmek için kullanılır
import { getApiUrl } from './environment'
import logger from './logger'

export const debugFeaturedNews = {
  async testAPIEndpoints() {
    logger.log('🔍 Featured News API Test Başlatılıyor...')
    
    // Test 1: Featured List API
    try {
      const response = await fetch(getApiUrl('news/featured-list'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token') || document.cookie.split('jwt_token=')[1]?.split(';')[0]}`,
          'Content-Type': 'application/json'
        }
      })
      logger.log('📋 Featured List API Response:', response.status, response.statusText)
      if (response.ok) {
        const data = await response.json()
        logger.log('📋 Featured List Data:', data)
      } else {
        const error = await response.text()
        logger.error('❌ Featured List Error:', error)
      }
    } catch (error) {
      logger.error('❌ Featured List API Test Failed:', error)
    }

    // Test 2: Regular News API
    try {
      const response = await fetch(getApiUrl('news'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token') || document.cookie.split('jwt_token=')[1]?.split(';')[0]}`,
          'Content-Type': 'application/json'
        }
      })
      logger.log('📰 News API Response:', response.status, response.statusText)
      if (response.ok) {
        const data = await response.json()
        logger.log('📰 News Data:', Array.isArray(data) ? `${data.length} haberler` : data)
      } else {
        const error = await response.text()
        logger.error('❌ News Error:', error)
      }
    } catch (error) {
      logger.error('❌ News API Test Failed:', error)
    }

    // Test 3: Make Featured API (simulasyon)
    logger.log('📌 Make Featured API endpoint: POST /api/news/{id}/make-featured?priority={priority}')
    logger.log('📌 Remove Featured API endpoint: POST /api/news/{id}/remove-featured')
    logger.log('📌 Update Priority API endpoint: PUT /api/news/{id}/featured-priority')
  },

  logCurrentState(news, featuredNews) {
    logger.log('📊 Current State Debug:')
    logger.log('- Total News:', Array.isArray(news) ? news.length : 'Not array')
    logger.log('- Featured News:', Array.isArray(featuredNews) ? featuredNews.length : 'Not array')
    logger.log('- News Structure Sample:', news[0])
    logger.log('- Featured Structure Sample:', featuredNews[0])
    
    if (Array.isArray(news) && Array.isArray(featuredNews)) {
      const availableForFeatured = news.filter(n => !featuredNews.some(f => f.id === n.id || f.newsId === n.id))
      logger.log('- Available for Featured:', availableForFeatured.length)
    }
  },

  validateDataStructure(news, featuredNews) {
    logger.log('🔍 Data Structure Validation:')
    
    // Validate news structure
    if (Array.isArray(news) && news.length > 0) {
      const newsItem = news[0]
      logger.log('✅ News has required fields:', {
        id: !!newsItem.id,
        title: !!newsItem.title,
        category: !!newsItem.category,
        author: !!newsItem.author,
        date: !!newsItem.date || !!newsItem.createdAt
      })
    } else {
      logger.log('❌ News array is empty or invalid')
    }

    // Validate featured news structure
    if (Array.isArray(featuredNews) && featuredNews.length > 0) {
      const featuredItem = featuredNews[0]
      logger.log('✅ Featured News has required fields:', {
        id: !!featuredItem.id,
        newsId: !!featuredItem.newsId,
        title: !!featuredItem.title,
        priority: !!featuredItem.priority,
        category: !!featuredItem.category,
        author: !!featuredItem.author
      })
    } else {
      logger.log('❌ Featured News array is empty or invalid')
    }
  }
}

// Global access için window object'e ekle
if (typeof window !== 'undefined') {
  window.debugFeaturedNews = debugFeaturedNews
}
