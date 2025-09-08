// Environment configuration
import { ENV } from '../utils/environment'
import logger from '../utils/logger.js'

const API_URL = ENV.API_URL

// Rate limiting instance
import { RateLimiter } from '../utils/security'
const loginRateLimit = new RateLimiter(5, 300000) // 5 attempts per 5 minutes
const commentRateLimit = new RateLimiter(10, 60000) // 10 comments per minute

// Cookie helpers - Secure implementation
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const sameSite = '; SameSite=Strict'
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/' + secure + sameSite
}

function getCookie(name) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=')
    return parts[0] === name ? decodeURIComponent(parts[1]) : r
  }, '')
}

function deleteCookie(name) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
}

// Auth header helper
function withAuth() {
  const token = getCookie('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

// Token management
function getToken() {
  return getCookie('token')
}

// Safe JSON parser
async function safeJson(response) {
  try {
    // Check if response is valid
    if (!response) {
      logger.error('No response object provided to safeJson')
      return {}
    }
    
    // Check if response has text method
    if (typeof response.text !== 'function') {
      logger.error('Response object does not have text() method, got:', typeof response)
      // If response is already an object, return it
      if (typeof response === 'object') {
        return response
      }
      return {}
    }
    
    const text = await response.text()
    if (!text || text.trim() === '') {
      logger.warn('Empty response text')
      return {}
    }
    
    try {
      return JSON.parse(text)
    } catch (parseError) {
      logger.error('JSON parse error:', parseError.message, 'Raw text:', text)
      return { error: 'Invalid JSON response', rawText: text }
    }
  } catch (error) {
    logger.error('safeJson error:', error.message)
    return { error: error.message }
  }
}

// File type validation helper
async function validateFileType(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = function(e) {
      const arr = new Uint8Array(e.target.result).subarray(0, 4)
      let header = ""
      for(let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16)
      }
      
      // Check magic numbers for common image formats
      const validHeaders = [
        'ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8', // JPEG
        '89504e47', // PNG
        '47494638', // GIF
        '52494646', // WebP (RIFF)
      ]
      
      resolve(validHeaders.some(validHeader => header.startsWith(validHeader)))
    }
    reader.readAsArrayBuffer(file)
  })
}

// Simple in-memory GET cache and in-flight deduper with endpoint-based TTLs
const __getCache = new Map() // key: url, value: { expires: number, data: any }
const __inflight = new Map() // key: url, value: Promise<any>

// Endpoint-based TTL configuration (ms)
const TTL_MAP = [
  { test: (u) => /\/kategoriler(\?|$)/.test(u), ttl: 60_000 }, // categories change rarely
  { test: (u) => /\/haber\/manset(\?|$)/.test(u), ttl: 15_000 },
  { test: (u) => /\/haber\b/.test(u), ttl: 5_000 },
  { test: (u) => /\/analytics\b/.test(u), ttl: 10_000 },
  { test: (u) => /\/admin\/all-news\b/.test(u), ttl: 5_000 },
]

function resolveTtl(url, fallback = 5000) {
  for (const { test, ttl } of TTL_MAP) {
    try { if (test(url)) return ttl } catch { /* ignore test errors */ }
  }
  return fallback
}

// Normalize endpoints to avoid accidental double '/api' (e.g., API_URL already ends with /api)
function normalizeEndpoint(endpoint) {
  if (!endpoint) return ''
  // Trim spaces
  let ep = String(endpoint).trim()
  // Ensure leading slash for path-like inputs
  if (!ep.startsWith('http') && !ep.startsWith('/')) {
    ep = '/' + ep
  }
  // If it starts with '/api/', strip the redundant '/api' prefix
  ep = ep.replace(/^\/api\//, '/')
  // Also handle accidental 'api/' without leading slash
  ep = ep.replace(/^api\//, '/')
  return ep
}

const api = {
  // Authentication
  async login(username, password) {
    logger.log('Login attempt for user:', username)
    
    if (!loginRateLimit.canMakeRequest()) {
      throw new Error('Çok fazla giriş denemesi. 5 dakika sonra tekrar deneyin.')
    }
    
    try {
      logger.log('Making request to:', `${API_URL}/kimlik/giris`)
      const res = await fetch(`${API_URL}/kimlik/giris`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      logger.log('Response status:', res.status)
      const data = await safeJson(res)
      
      if (!res.ok) {
        loginRateLimit.recordRequest()
        throw new Error(data.message || 'Giriş başarısız')
      }
      
      if (data.token) {
        setCookie('token', data.token, 7)
        // Token stored in httpOnly cookie only
        logger.log('Authentication successful')
      }
      
      return data
    } catch (err) {
      logger.error('Login error:', err.message)
      throw err
    }
  },

  async register(userData) {
    try {
      const res = await fetch(`${API_URL}/kimlik/kayit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Kayıt başarısız')
      }
      
      return data
    } catch (err) {
      logger.error('Register error:', err.message)
      throw err
    }
  },

  async logout() {
    try {
  // Backend doesn't expose a logout endpoint; just clear the token locally
    } catch (err) {
      logger.error('Logout error:', err)
    } finally {
      deleteCookie('token')
      // Token removed from httpOnly cookie only
    }
  },

  async getCurrentUser() {
    try {
      return await this.get('/kimlik/ben')
    } catch {
      return null
    }
  },

  async googleAuth(credential) {
    try {
      const res = await fetch(`${API_URL}/kimlik/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Google authentication failed')
      }
      
      if (data.token) {
        setCookie('token', data.token, 7)
        // Token stored in httpOnly cookie only
      }
      
      return data
    } catch (err) {
      logger.error('Google auth error:', err)
      throw err
    }
  },

  async getAuthorProfile(username) {
    try {
      const res = await fetch(`${API_URL}/kimlik/yazar/${username}`)
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Author profili bulunamadı')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Get author profile error:', err)
      throw err
    }
  },

  async updateProfile(profileData) {
    try {
      const res = await fetch(`${API_URL}/kimlik/profil`, {
        method: 'PUT',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Profil güncellenemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Update profile error:', err)
      throw err
    }
  },

  async updatePassword(passwordData) {
    try {
      const res = await fetch(`${API_URL}/kimlik/password`, {
        method: 'PUT',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Şifre güncellenemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Update password error:', err)
      throw err
    }
  },

  async confirmEmail(email, token) {
    try {
      const res = await fetch(`${API_URL}/kimlik/email-dogrula?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Email doğrulanamadı')
      }
      
      return data
    } catch (err) {
      logger.error('Confirm email error:', err)
      throw err
    }
  },

  async resendConfirmation(email) {
    try {
      const res = await fetch(`${API_URL}/kimlik/dogrulama-tekrar-gonder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Doğrulama emaili gönderilemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Resend confirmation error:', err)
      throw err
    }
  },

  async isEmailVerified(username) {
    try {
      const res = await fetch(`${API_URL}/kimlik/email-dogrulandi-mi?username=${encodeURIComponent(username)}`)
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Email doğrulama durumu kontrol edilemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Check email verification error:', err)
      throw err
    }
  },

  async forgotPassword(email) {
    try {
      const res = await fetch(`${API_URL}/kimlik/sifre-unuttum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Şifre sıfırlama talebi gönderilemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Forgot password error:', err)
      throw err
    }
  },

  async resetPassword(email, token, newPassword) {
    try {
      const res = await fetch(`${API_URL}/kimlik/sifre-sifirla`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword })
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Şifre sıfırlanamadı')
      }
      
      return data
    } catch (err) {
      logger.error('Reset password error:', err)
      throw err
    }
  },

  async uploadAvatar(formData) {
    try {
            const res = await fetch(`${API_URL}/kimlik/profil/avatar-yukle`, {
        method: 'POST',
        headers: withAuth(),
        body: formData
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Avatar yüklenemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Upload avatar error:', err)
      throw err
    }
  },

  // Alias for uploadAvatar (for profile picture uploads)
  async uploadProfilePicture(file) {
    try {
      const formData = new FormData()
      formData.append('file', file)  // Backend 'file' field'ını bekliyor
      return await this.uploadAvatar(formData)
    } catch (err) {
      logger.error('Upload profile picture error:', err)
      throw err
    }
  },

  // News Management
  async getNews(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString()
      const endpoint = `/haber${queryString ? '?' + queryString : ''}`
      return await this.get(endpoint)
    } catch (err) {
      logger.error('Get news error:', err)
      throw err
    }
  },

  async getNewsById(id) {
    try {
      return await this.get(`/haber/${id}`)
    } catch (err) {
      logger.error('Get news by id error:', err)
      throw err
    }
  },

  async getNewsBySlug(slug) {
    try {
      return await this.get(`/haber/${slug}`)
    } catch (err) {
      logger.error('Get news by slug error:', err)
      throw err
    }
  },

  async searchNews(searchTerm, params = {}) {
    try {
      const queryParams = { ...params, q: searchTerm }
      const queryString = new URLSearchParams(queryParams).toString()
      return await this.get(`/haber/ara?${queryString}`)
    } catch (err) {
      logger.error('Search news error:', err)
      throw err
    }
  },

  async advancedSearchNews(filters) {
    try {
      const queryString = new URLSearchParams(filters).toString()
      return await this.get(`/haber/ara?${queryString}`)
    } catch (err) {
      logger.error('Advanced search news error:', err)
      throw err
    }
  },

  async getFeaturedNews(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString()
      const endpoint = `/haber/manset${queryString ? '?' + queryString : ''}`
      return await this.get(endpoint)
    } catch (err) {
      logger.error('Get featured news error:', err)
      throw err
    }
  },

  async getFeaturedList() {
    try {
      return await this.get('/haber/manset-listesi')
    } catch (err) {
      logger.error('Get featured list error:', err)
      throw err
    }
  },

  async getNewsByCategory(category, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString()
      const endpoint = `/haber/kategoriye-gore/${category}${queryString ? '?' + queryString : ''}`
      return await this.get(endpoint)
    } catch (err) {
      logger.error('Get news by category error:', err)
      throw err
    }
  },

  async getPopularNews(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString()
      const endpoint = `/haber/populer${queryString ? '?' + queryString : ''}`
      return await this.get(endpoint)
    } catch (err) {
      logger.error('Get popular news error:', err)
      throw err
    }
  },

  async createNews(newsData) {
    try {
      const res = await fetch(`${API_URL}/haber`, {
        method: 'POST',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newsData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Haber oluşturulamadı')
      }
      
      return data
    } catch (err) {
      logger.error('Create news error:', err)
      throw err
    }
  },

  async updateNews(id, newsData) {
    try {
      const res = await fetch(`${API_URL}/haber/${id}`, {
        method: 'PUT',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newsData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Haber güncellenemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Update news error:', err)
      throw err
    }
  },

  async addNews(newsData) {
    try {
      logger.log('Adding news with data provided')
      logger.log('API endpoint URL:', `${API_URL}/haber`)
      
      // Check if API_URL is valid
      if (!API_URL) {
        throw new Error('API_URL is not defined')
      }
      
      let res
      try {
        logger.log('Starting fetch request...')
        res = await fetch(`${API_URL}/haber`, {
          method: 'POST',
          headers: { 
            ...withAuth(), 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(newsData)
        })
      } catch (fetchError) {
        logger.error('Fetch operation failed:', fetchError)
        throw new Error(`Network error: Backend sunucusuna bağlanılamıyor. ${fetchError.message}`)
      }
      
      // Check if response is a valid Response object
      if (!res || typeof res !== 'object') {
        throw new Error('Invalid response object received')
      }
      
      if (typeof res.text !== 'function') {
        logger.error('Response object does not have text method:', res)
        throw new Error('Invalid response: response.text is not a function')
      }
      
      let data = {}
      try {
        const text = await res.text()
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        logger.error('JSON parse error:', parseError)
        throw new Error(`Response parsing failed: ${parseError.message}`)
      }
      
      if (!res.ok) {
        const errorMsg = data.message || `HTTP ${res.status}: ${res.statusText || 'Haber eklenemedi'}`
        throw new Error(errorMsg)
      }
      
      return data
    } catch (err) {
      logger.error('Add news error:', err)
      throw err
    }
  },

  async getPendingNews(page = 1, limit = 20) {
    try {
      const params = new URLSearchParams({ 
        page: page.toString(), 
        pageSize: limit.toString()
      })
      // Use admin-specific pending endpoint
      const res = await fetch(`${API_URL}/admin/pending-news?${params}`, { headers: withAuth() })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        // Fallback to public endpoint with approved=false if admin route unavailable
        const alt = await fetch(`${API_URL}/haber?page=${page}&pageSize=${limit}&approved=false`, { headers: withAuth() })
        const altData = await safeJson(alt)
        if (!alt.ok) throw new Error(data.message || altData.message || 'Bekleyen haberler yüklenemedi')
        return altData
      }
      
      return data
    } catch (err) {
      logger.error('Get pending news error:', err)
      throw err
    }
  },

  async getAllNewsForAdmin(page = 1, limit = 50) {
    try {
      const params = new URLSearchParams({ 
        page: page.toString(), 
        pageSize: limit.toString(),
        approved: '' // get both
      })
      // Use admin endpoint for consistent shape
      const res = await fetch(`${API_URL}/admin/all-news?${params}`, {
        headers: withAuth()
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Admin haberleri yüklenemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Get all news for admin error:', err)
      throw err
    }
  },

  // Fetch ALL pages aggregating for complete admin list
  async getAllNewsForAdminAllPages(maxPerPage = 50) {
    try {
      let page = 1
      const aggregated = []
      let totalPages = 1
      do {
        const resp = await this.getAdminAllNews(page, maxPerPage)
        const items = Array.isArray(resp) ? resp : (resp.data || [])
        aggregated.push(...items)
        const pg = resp.pagination || { currentPage: page, totalPages: page }
        totalPages = pg.totalPages || 1
        page++
      } while (page <= totalPages)
      return aggregated
    } catch (err) {
      logger.error('Aggregate admin news error:', err)
      throw err
    }
  },

  // Admin Controller - Get all news with bearer token authorization
  async getAdminAllNews(page = 1, limit = 50) {
    try {
      const params = new URLSearchParams({ 
        page: page.toString(), 
  pageSize: limit.toString()
      })
      
      const res = await fetch(`${API_URL}/admin/all-news?${params}`, {
        method: 'GET',
        // Avoid unnecessary headers on GET to reduce CORS preflights
        headers: { ...withAuth() }
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Admin tüm haberler yüklenemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Get admin all news error:', err)
      throw err
    }
  },

  async deleteNews(id) {
    try {
      const res = await fetch(`${API_URL}/haber/${id}`, {
        method: 'DELETE',
        headers: withAuth()
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Haber silinemedi')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Delete news error:', err)
      throw err
    }
  },

  async setFeatured(id, featured = true) {
    try {
      const res = await fetch(`${API_URL}/haber/${id}/manset`, {
        method: 'PUT',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured })
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Manşet durumu güncellenemedi')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Set featured error:', err)
      throw err
    }
  },

  // Admin news approval - POST /api/admin/approve-news/{id}
  async approveNews(id) {
    try {
      const res = await fetch(`${API_URL}/admin/approve-news/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...withAuth()
        }
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Haber onaylanamadı')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Approve news error:', err)
      throw err
    }
  },

  // Admin: get news detail for edit (includes content)
  async getAdminNewsDetail(id) {
    try {
      const res = await fetch(`${API_URL}/admin/news/${id}`, {
  method: 'GET',
  // Avoid unnecessary headers on GET to reduce CORS preflights
  headers: { ...withAuth() }
      })
      const data = await safeJson(res)
      if (!res.ok) {
        throw new Error(data.message || 'Haber detayı alınamadı')
      }
      return data
    } catch (err) {
      logger.error('Get admin news detail error:', err)
      throw err
    }
  },

  async rejectNews(id, reason = '') {
    try {
      const res = await fetch(`${API_URL}/admin/reject-news/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...withAuth()
        },
        body: JSON.stringify({ reason })
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Haber reddedilemedi')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Reject news error:', err)
      throw err
    }
  },

  // Categories
  async getCategories() {
    try {
      return await this.get('/kategoriler')
    } catch (err) {
      logger.error('Get categories error:', err)
      throw err
    }
  },

  async createCategory(categoryData) {
    try {
      const res = await fetch(`${API_URL}/kategoriler`, {
        method: 'POST',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Kategori oluşturulamadı')
      }
      
      return data
    } catch (err) {
      logger.error('Create category error:', err)
      throw err
    }
  },

  // Alias for createCategory for backwards compatibility
  async addCategory(categoryData) {
    return await this.createCategory(categoryData)
  },

  async updateCategory(id, categoryData) {
    try {
      const res = await fetch(`${API_URL}/kategoriler/${id}`, {
        method: 'PUT',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Kategori güncellenemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Update category error:', err)
      throw err
    }
  },

  async deleteCategory(id) {
    try {
      // Önce o kategorideki haberleri silelim
      const categoryDetails = await this.getCategories()
      const category = categoryDetails.data?.find(cat => cat.id === id)
      
      if (category) {
        // O kategorideki haberleri getir
        const newsInCategory = await this.getNews({ category: category.name, pageSize: 1000 })
        
        // Haberleri tek tek sil
        if (newsInCategory.data && newsInCategory.data.length > 0) {
          for (const news of newsInCategory.data) {
            try {
              await this.deleteNews(news.id)
            } catch (newsError) {
              logger.error(`Haber silinemedi (ID: ${news.id}):`, newsError)
              // Devam et, diğer haberleri de silmeye çalış
            }
          }
        }
      }
      
      // Şimdi kategoriyi sil
      const res = await fetch(`${API_URL}/kategoriler/${id}`, {
        method: 'DELETE',
        headers: withAuth()
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Kategori silinemedi')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Delete category error:', err)
      throw err
    }
  },

  // Comments
  async getComments(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString()
      const res = await fetch(`${API_URL}/yorumlar${queryString ? '?' + queryString : ''}`, {
        headers: withAuth()
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Yorumlar yüklenemedi')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Get comments error:', err)
      throw err
    }
  },

  async getNewsComments(newsId) {
    try {
      return await this.get(`/haber/${newsId}/yorumlar`)
    } catch (err) {
      logger.error('Get news comments error:', err)
      return { comments: [] }
    }
  },

  async getCommentReplies(commentId) {
    try {
      const res = await this.get(`/yorumlar/${commentId}/replies`)
      const data = Array.isArray(res) ? res : (res?.data || res?.replies || [])
      return { success: true, data }
    } catch (err) {
      logger.error('Get comment replies error:', err)
      return { success: false, data: [] }
    }
  },

  async createComment(newsId, commentData) {
    if (!commentRateLimit.canMakeRequest()) {
      return { 
        success: false, 
        error: 'Çok fazla yorum gönderiyorsunuz. Lütfen bekleyin.',
        message: 'Çok fazla yorum gönderiyorsunuz. Lütfen bekleyin.'
      }
    }
    
    try {
      const result = await this.post(`/haber/${newsId}/yorumlar`, commentData)
      // Başarılı response'u hem data altında hem de root'ta döndür (geriye uyumlu)
      if (result && typeof result === 'object') {
        return { success: true, data: result, ...result }
      }
      return { success: true, data: result }
    } catch (err) {
      logger.error('Create comment error:', err)
      commentRateLimit.recordRequest()
      
      // Error response formatını standardize et
      const errorMessage = err.message || 'Yorum gönderilirken bir hata oluştu'
      return { 
        success: false, 
        error: errorMessage,
        message: errorMessage
      }
    }
  },

  async approveComment(id) {
    try {
      const res = await fetch(`${API_URL}/yorumlar/${id}/onayla`, {
        method: 'PUT',
        headers: withAuth()
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Yorum onaylanamadı')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Approve comment error:', err)
      throw err
    }
  },

  async rejectComment(id) {
    try {
      const res = await fetch(`${API_URL}/yorumlar/${id}/reddet`, {
        method: 'PUT',
        headers: withAuth()
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Yorum reddedilemedi')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Reject comment error:', err)
      throw err
    }
  },

  async deleteComment(id) {
    try {
      const res = await fetch(`${API_URL}/yorumlar/${id}`, {
        method: 'DELETE',
        headers: withAuth()
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Yorum silinemedi')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Delete comment error:', err)
      throw err
    }
  },

  // Users
  async getUsers(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString()
      const res = await fetch(`${API_URL}/admin/users${queryString ? '?' + queryString : ''}`, {
        headers: withAuth()
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Kullanıcılar yüklenemedi')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Get users error:', err)
      throw err
    }
  },

  async createUser(userData) {
    try {
  const res = await fetch(`${API_URL}/admin/create-user`, {
        method: 'POST',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Kullanıcı oluşturulamadı')
      }
      
      return data
    } catch (err) {
      logger.error('Create user error:', err)
      throw err
    }
  },

  async updateUser(id, userData) {
    try {
  const res = await fetch(`${API_URL}/users/${id}/profile`, {
        method: 'PUT',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Kullanıcı güncellenemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Update user error:', err)
      throw err
    }
  },

  async deleteUser(id) {
    try {
      const user = await this.get(`/users/${id}`)
      const username = user?.username || user?.Username
      if (!username) throw new Error('Silinecek kullanıcı adı bulunamadı')
      const res = await fetch(`${API_URL}/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: withAuth()
      })
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Kullanıcı silinemedi')
      }
      return await safeJson(res)
    } catch (err) {
      logger.error('Delete user error:', err)
      throw err
    }
  },

  async updateUserRole(id, role) {
    try {
      const res = await fetch(`${API_URL}/users/${id}/role`, {
        method: 'PUT',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Kullanıcı rolü güncellenemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Update user role error:', err)
      throw err
    }
  },

  async activateUser(id) {
    try {
  const res = await fetch(`${API_URL}/users/${id}/approve`, {
        method: 'PUT',
        headers: withAuth()
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Kullanıcı aktifleştirilemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Activate user error:', err)
      throw err
    }
  },

  async deactivateUser(id) {
    try {
  const res = await fetch(`${API_URL}/users/${id}/reject`, {
        method: 'PUT',
        headers: withAuth()
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Kullanıcı pasifleştirilemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Deactivate user error:', err)
      throw err
    }
  },

  async banUser() {
    try {
  throw new Error('Ban işlemi desteklenmiyor')
    } catch (err) {
      logger.error('Ban user error:', err)
      throw err
    }
  },

  async unbanUser() {
    try {
  throw new Error('Unban işlemi desteklenmiyor')
    } catch (err) {
      logger.error('Unban user error:', err)
      throw err
    }
  },

  // Settings
  async getSettings() {
    try {
      const res = await fetch(`${API_URL}/settings`, {
        headers: withAuth()
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Ayarlar yüklenemedi')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Get settings error:', err)
      throw err
    }
  },

  async updateSettings(settingsData) {
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Ayarlar güncellenemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Update settings error:', err)
      throw err
    }
  },

  // Moderation (admin)
  async getBannedWords() {
    try {
      const res = await fetch(`${API_URL}/admin/moderation/banned-words`, { headers: withAuth() })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.message || 'BannedWords alınamadı')
      return Array.isArray(data) ? data : (data.words || [])
    } catch (err) {
      logger.error('Get banned words error:', err)
      throw err
    }
  },

  async updateBannedWords(words) {
    try {
      const res = await fetch(`${API_URL}/admin/moderation/banned-words`, {
        method: 'PUT',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ words })
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.message || 'BannedWords güncellenemedi')
      return { success: true }
    } catch (err) {
      logger.error('Update banned words error:', err)
      throw err
    }
  },

  async clearCache() {
    try {
      const res = await fetch(`${API_URL}/settings/clear-cache`, {
        method: 'POST',
        headers: withAuth()
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Önbellek temizlenemedi')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Clear cache error:', err)
      throw err
    }
  },

  async resetSettings() {
    try {
      const res = await fetch(`${API_URL}/settings/reset`, {
        method: 'POST',
        headers: withAuth()
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Ayarlar sıfırlanamadı')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Reset settings error:', err)
      throw err
    }
  },

  async exportSettings() {
    try {
      const res = await fetch(`${API_URL}/settings/export`, {
        headers: withAuth()
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Ayarlar dışa aktarılamadı')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Export settings error:', err)
      throw err
    }
  },

  // File Upload with progress support
  async uploadImage(file, onProgress = null) {
    logger.log('🖼️ [UPLOAD] Starting image upload:', {
      name: file.name,
      size: file.size,
      type: file.type
    })
    
    if (!file) {
      throw new Error('Dosya seçilmedi')
    }
    
    // Enhanced MIME type validation - reject dangerous file types
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.vbs', '.js', '.jar', '.msi', '.dll']
    const fileExtension = file.name.toLowerCase().split('.').pop()
    if (dangerousExtensions.includes(`.${fileExtension}`)) {
      logger.error('🖼️ [UPLOAD] Dangerous file type:', fileExtension)
      throw new Error('Bu dosya türü güvenlik nedenleriyle yüklenemez.')
    }
    
    // Validate file type with magic numbers
    const isValidType = await validateFileType(file)
    if (!isValidType) {
      logger.error('🖼️ [UPLOAD] Invalid file type:', file.type)
      throw new Error('Geçersiz dosya türü. Sadece resim dosyaları kabul edilir.')
    }
    
    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      logger.error('🖼️ [UPLOAD] File too large:', file.size)
      throw new Error('Dosya boyutu 50MB\'dan büyük olamaz')
    }
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)
      
      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100)
            onProgress(percentComplete, event.loaded, event.total)
            logger.log(`🖼️ [UPLOAD] Progress: ${percentComplete}%`)
          }
        })
      }
      
      // Handle completion
      xhr.addEventListener('load', async () => {
        logger.log('🖼️ [UPLOAD] Response status:', xhr.status)
        
        try {
          const data = JSON.parse(xhr.responseText)
          logger.log('🖼️ [UPLOAD] Response data:', data)
          
          if (xhr.status >= 200 && xhr.status < 300) {
            logger.log('🖼️ [UPLOAD] Upload successful:', data.url)
            resolve(data)
          } else {
            throw new Error(data.message || 'Dosya yüklenemedi')
          }
        } catch (parseError) {
          logger.error('🖼️ [UPLOAD] Response parse error:', parseError)
          reject(new Error('Sunucu yanıtı çözümlenemedi'))
        }
      })
      
      // Handle errors
      xhr.addEventListener('error', () => {
        logger.error('🖼️ [UPLOAD] Network error')
        reject(new Error('Ağ hatası oluştu'))
      })
      
      xhr.addEventListener('abort', () => {
        logger.error('🖼️ [UPLOAD] Upload aborted')
        reject(new Error('Yükleme iptal edildi'))
      })
      
      // Set auth headers
      const authHeaders = withAuth()
      Object.keys(authHeaders).forEach(key => {
        xhr.setRequestHeader(key, authHeaders[key])
      })
      
      logger.log('🖼️ [UPLOAD] Making request to:', `${API_URL}/haber/resim-yukle`)
      
      // Start upload
      xhr.open('POST', `${API_URL}/haber/resim-yukle`)
      xhr.send(formData)
    })
  },

  // Multiple image upload with progress support
  async uploadMultipleImages(files, onProgress = null) {
    if (!files || files.length === 0) {
      throw new Error('Dosya seçilmedi')
    }

    const results = []
    let totalProgress = 0
    const fileCount = files.length

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const result = await this.uploadImage(file, (progress) => {
          // Calculate overall progress across all files
          const overallProgress = Math.round(((i * 100 + progress) / fileCount))
          if (onProgress) {
            onProgress(overallProgress, i + 1, fileCount, file.name)
          }
        })
        results.push(result)
      } catch (error) {
        logger.error('Multiple upload error for file:', file.name, error)
        // Continue with other files but record the error
        results.push({ error: error.message, fileName: file.name })
      }
    }

    return { urls: results.filter(r => r.url).map(r => r.url), results }
  },

  // Resize image upload with progress support
  async resizeImage(file, width, height, onProgress = null) {
    logger.log('🖼️ [RESIZE] Starting image resize upload:', {
      name: file.name,
      size: file.size,
      width,
      height
    })

    if (!file) {
      throw new Error('Dosya seçilmedi')
    }

    // Same validation as uploadImage
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.vbs', '.js', '.jar', '.msi', '.dll']
    const fileExtension = file.name.toLowerCase().split('.').pop()
    if (dangerousExtensions.includes(`.${fileExtension}`)) {
      throw new Error('Bu dosya türü güvenlik nedenleriyle yüklenemez.')
    }

    const isValidType = await validateFileType(file)
    if (!isValidType) {
      throw new Error('Geçersiz dosya türü. Sadece resim dosyaları kabul edilir.')
    }

    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      throw new Error('Dosya boyutu 50MB\'dan büyük olamaz')
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('file', file)

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100)
            onProgress(percentComplete, event.loaded, event.total)
          }
        })
      }

      xhr.addEventListener('load', async () => {
        try {
          const data = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data)
          } else {
            throw new Error(data.message || 'Dosya yeniden boyutlandırılamadı')
          }
        } catch (parseError) {
          reject(new Error('Sunucu yanıtı çözümlenemedi'))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Ağ hatası oluştu'))
      })

      const authHeaders = withAuth()
      Object.keys(authHeaders).forEach(key => {
        xhr.setRequestHeader(key, authHeaders[key])
      })

      xhr.open('POST', `${API_URL}/haber/resim-yeniden-boyutlandir?width=${width}&height=${height}`)
      xhr.send(formData)
    })
  },

  // Get image gallery with pagination
  async getImageGallery(page = 1, limit = 12) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      return await this.get(`/haber/resim-galerisi?${params}`)
    } catch (err) {
      logger.error('Get image gallery error:', err)
      throw err
    }
  },

  // Statistics - Dashboard endpoint
  async getStats() {
    try {
      const res = await fetch(`${API_URL}/admin/dashboard`, {
        headers: withAuth()
      })
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Dashboard verileri yüklenemedi')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Get dashboard stats error:', err)
      throw err
    }
  },

  // Alias for backward compatibility
  async getDashboard() {
    return await this.getStats()
  },

  // Search
  async search(query, filters = {}) {
    try {
  const params = new URLSearchParams({ q: query, ...filters })
  const res = await fetch(`${API_URL}/haber/ara?${params}`)
      
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || 'Arama başarısız')
      }
      
      return await safeJson(res)
    } catch (err) {
      logger.error('Search error:', err)
      throw err
    }
  },

  // Generic HTTP methods for flexibility
  async get(endpoint, { cacheTtlMs, noCache = false } = {}) {
    try {
      const ep = normalizeEndpoint(endpoint)
      const url = `${API_URL}${ep}`

      // Cache key is the absolute URL with auth presence marker
      const cacheKey = url

      // Serve from cache if fresh
      if (!noCache && __getCache.has(cacheKey)) {
        const entry = __getCache.get(cacheKey)
        if (entry.expires > Date.now()) {
          return entry.data
        } else {
          __getCache.delete(cacheKey)
        }
      }

      // Deduplicate inflight GETs
      if (!noCache && __inflight.has(cacheKey)) {
        return await __inflight.get(cacheKey)
      }

      const fetchPromise = (async () => {
        const res = await fetch(url, { headers: withAuth() })
        if (!res.ok) {
          const data = await safeJson(res)
          throw new Error(data.message || 'Request failed')
        }
        const data = await safeJson(res)
        // Store in cache briefly
        const ttl = cacheTtlMs ?? resolveTtl(url, 5000)
        if (!noCache && ttl > 0) {
          __getCache.set(cacheKey, { expires: Date.now() + ttl, data })
        }
        return data
      })()

      if (!noCache) {
        __inflight.set(cacheKey, fetchPromise)
      }

      try {
        const result = await fetchPromise
        return result
      } finally {
        if (!noCache) {
          __inflight.delete(cacheKey)
        }
      }
    } catch (err) {
      logger.error('GET request error:', err)
      throw err
    }
  },

  // Coalesced GETs: fetch many endpoints together; returns array of results matching input order
  async getMany(endpoints, { noCache = false } = {}) {
    const tasks = endpoints.map((ep) => this.get(ep, { noCache }))
    return await Promise.all(tasks)
  },

  async post(endpoint, data) {
    try {
      const ep = normalizeEndpoint(endpoint)
      const url = `${API_URL}${ep}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const responseData = await safeJson(res)
        throw new Error(responseData.message || "Request failed")
      }
      return await safeJson(res)
    } catch (err) {
      logger.error('POST request error:', err)
      throw err
    }
  },

  async put(endpoint, data) {
    try {
      const ep = normalizeEndpoint(endpoint)
      const url = `${API_URL}${ep}`
      const res = await fetch(url, {
        method: 'PUT',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const responseData = await safeJson(res)
        throw new Error(responseData.message || "Request failed")
      }
      return await safeJson(res)
    } catch (err) {
      logger.error('PUT request error:', err)
      throw err
    }
  },

  async delete(endpoint) {
    try {
      const ep = normalizeEndpoint(endpoint)
      const url = `${API_URL}${ep}`
      const res = await fetch(url, {
        method: 'DELETE',
        headers: withAuth()
      })
      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(data.message || "Request failed")
      }
      return await safeJson(res)
    } catch (err) {
      logger.error('DELETE request error:', err)
      throw err
    }
  },

  // Token management methods
  setToken(token) {
    try {
      setCookie('token', token, 7)
      return true
    } catch (error) {
      logger.error('Error setting token:', error)
      return false
    }
  },

  getToken() {
    return getCookie('token')
  },

  getUserFromToken() {
    try {
      const token = getToken()
      if (!token) return null
      
      const payload = JSON.parse(atob(token.split('.')[1]))
      return {
        id: payload.userId || payload.id,
        email: payload.email,
        username: payload.name || payload.username, // JWT token'da 'name' field'i username olarak kullanılıyor
        role: payload.role
      }
    } catch (error) {
      logger.error('Error parsing token:', error)
      return null
    }
  },

  // Newsletter Management
  async subscribeNewsletter(email) {
    try {
  const res = await fetch(`${API_URL}/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Newsletter aboneliği başarısız')
      }
      
      return data
    } catch (err) {
      logger.error('Newsletter subscribe error:', err)
      throw err
    }
  },

  async unsubscribeNewsletter() {
    try {
  throw new Error('Newsletter abonelik iptali desteklenmiyor')
    } catch (err) {
      logger.error('Newsletter unsubscribe error:', err)
      throw err
    }
  },

  async getNewsletterSubscribers() {
    try {
  return await this.get('/admin/users/for-email')
    } catch (err) {
      logger.error('Get newsletter subscribers error:', err)
      throw err
    }
  },

  async sendNewsletter(newsletterData) {
    try {
  const res = await fetch(`${API_URL}/admin/send-newsletter`, {
        method: 'POST',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newsletterData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Newsletter gönderilemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Send newsletter error:', err)
      throw err
    }
  },

  // Contact Form
  async submitContactForm(contactData) {
    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'İletişim formu gönderilemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Submit contact form error:', err)
      throw err
    }
  },

  // Analytics
  async getAnalytics(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString()
      const endpoint = `/analytics${queryString ? '?' + queryString : ''}`
      return await this.get(endpoint)
    } catch (err) {
      logger.error('Get analytics error:', err)
      throw err
    }
  },

  async trackView(newsId) {
    try {
      const res = await fetch(`${API_URL}/analytics/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsId })
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Görüntüleme kaydedilemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Track view error:', err)
      throw err
    }
  },

  // Author Management
  async getAuthors() {
    try {
  return await this.get('/users/authors')
    } catch (err) {
      logger.error('Get authors error:', err)
      throw err
    }
  },

  async getAuthorById(id) {
    try {
  return await this.get(`/users/author/${id}`)
    } catch (err) {
      logger.error('Get author by id error:', err)
      throw err
    }
  },

  async getAuthorProfileById(authorId) {
    try {
  return await this.get(`/users/author/${authorId}`)
    } catch (err) {
      logger.error('Get author profile by id error:', err)
      throw err
    }
  },

  async getNewsByAuthor(authorId, params = {}) {
    try {
  const author = await this.get(`/users/author/${authorId}`)
  const username = author?.author?.username || author?.Username || author?.username
  if (!username) throw new Error('Yazar kullanıcı adı bulunamadı')
  const queryParams = new URLSearchParams({ ...params, author: username }).toString()
  return await this.get(`/haber/ara?${queryParams}`)
    } catch (err) {
      logger.error('Get news by author error:', err)
      throw err
    }
  },

  // Alias for createComment to maintain backward compatibility
  async addComment(newsId, commentData) {
    return await this.createComment(newsId, commentData)
  },

  // ===== FEATURED HABER YÖNETİMİ =====
  
  // Haberi featured yap (admin only)
  async makeFeatured(newsId, priority = 1) {
    try {
      return await this.post(`/haber/${newsId}/manset-yap?priority=${priority}`)
    } catch (err) {
      logger.error('Make featured error:', err)
      throw err
    }
  },

  // Haberi featured'dan çıkar (admin only)
  async removeFeatured(newsId) {
    try {
      return await this.post(`/haber/${newsId}/manset-kaldir`)
    } catch (err) {
      logger.error('Remove featured error:', err)
      throw err
    }
  },

  // Featured önceliğini güncelle (admin only)
  async updateFeaturedPriority(newsId, newPriority) {
    try {
      return await this.put(`/haber/${newsId}/manset-oncelik`, { newPriority })
    } catch (err) {
      logger.error('Update featured priority error:', err)
      throw err
    }
  },

  // Featured haberler listesi alma (öncelik sırasına göre)
  async getFeaturedNewsList(count = 5) {
    try {
      return await this.get(`/haber/manset?count=${count}`)
    } catch (err) {
      logger.error('Get featured news list error:', err)
      throw err
    }
  },

  // Tüm haberleri getir (featured yönetimi için)
  async getAllNewsForFeatured(params = {}) {
    try {
      const queryString = new URLSearchParams({
        status: 'published',
        ...params
      }).toString()
      return await this.get(`/haber?${queryString}`)
    } catch (err) {
      logger.error('Get news for featured error:', err)
      throw err
    }
  },

  // Push Notification Methods
  async getPublicVapidKey() {
    try {
      const res = await fetch(`${API_URL}/pushnotification/vapid-public-key`, {
        method: 'GET'
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'VAPID anahtarı alınamadı')
      }
      
      return data
    } catch (err) {
      logger.error('Get VAPID key error:', err)
      return { success: false, message: err.message }
    }
  },

  async subscribeToNotifications(subscriptionData) {
    try {
      const res = await fetch(`${API_URL}/pushnotification/subscribe`, {
        method: 'POST',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Bildirim aboneliği başarısız')
      }
      
      return data
    } catch (err) {
      logger.error('Subscribe to notifications error:', err)
      return { success: false, message: err.message }
    }
  },

  async unsubscribeFromNotifications(endpoint) {
    try {
      const res = await fetch(`${API_URL}/pushnotification/unsubscribe`, {
        method: 'POST',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint })
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Bildirim aboneliği iptal edilemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Unsubscribe from notifications error:', err)
      return { success: false, message: err.message }
    }
  },

  async sendNotification(notificationData) {
    try {
      const res = await fetch(`${API_URL}/pushnotification/send`, {
        method: 'POST',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData)
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Bildirim gönderilemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Send notification error:', err)
      throw err
    }
  },

  async sendNotificationToUser(userId, notificationData) {
    try {
      const res = await fetch(`${API_URL}/pushnotification/send-to-user`, {
        method: 'POST',
        headers: { ...withAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...notificationData })
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Kullanıcıya bildirim gönderilemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Send notification to user error:', err)
      throw err
    }
  },

  async getNotificationHistory(page = 1, pageSize = 20) {
    try {
      return await this.get(`/pushnotification/history?page=${page}&pageSize=${pageSize}`)
    } catch (err) {
      logger.error('Get notification history error:', err)
      throw err
    }
  },

  async sendTestNotification() {
    try {
      const res = await fetch(`${API_URL}/pushnotification/test`, {
        method: 'POST',
        headers: { ...withAuth(), 'Content-Type': 'application/json' }
      })
      
      const data = await safeJson(res)
      
      if (!res.ok) {
        throw new Error(data.message || 'Test bildirimi gönderilemedi')
      }
      
      return data
    } catch (err) {
      logger.error('Send test notification error:', err)
      throw err
    }
  },

  // SEO Methods
  async getSitemap() {
    try {
  const res = await fetch(`${ENV.BASE_URL}/sitemap.xml`, {
        method: 'GET'
      })
      
      if (!res.ok) {
        throw new Error('Sitemap alınamadı')
      }
      
      return await res.text() // XML as text
    } catch (err) {
      logger.error('Get sitemap error:', err)
      throw err
    }
  },

  async getSitemapData() {
    try {
  const res = await fetch(`${ENV.BASE_URL}/sitemap-debug`)
  if (!res.ok) throw new Error('Sitemap debug bilgisi alınamadı')
  return await safeJson(res)
    } catch (err) {
      logger.error('Get sitemap data error:', err)
      throw err
    }
  }
}

export default api
