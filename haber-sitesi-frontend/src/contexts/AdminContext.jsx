import { createContext, useReducer, useEffect, useMemo } from 'react'
import api from '../services/api'
import { ADMIN_ACTIONS } from '../hooks/useAdmin'
import logger from '../utils/logger'

// Initial State
const initialState = {
  // Data states
  news: [],
  categories: [],
  comments: [],
  users: [],
  featuredNews: [],
  pendingNews: [],
  allNews: [],
  dashboardData: null,
  stats: {
    // Legacy format for backward compatibility
    totalNews: 0,
    activeUsers: 0,
    pendingComments: 0,
    totalCategories: 0,
    approvedNews: 0,
    pendingNews: 0,
    rejectedNews: 0,
    
    // New backend format (camelCase)
    systemInfo: {
      totalUsers: 0,
      totalNews: 0,
      totalComments: 0,
      totalCategories: 0,
      totalEmails: 0,
      totalPushNotifications: 0,
      lastUpdated: null
    },
    userStats: {
      total: 0,
      approved: 0,
      emailConfirmed: 0,
      pendingApproval: 0,
      pendingEmailConfirmation: 0,
      newToday: 0,
      newThisWeek: 0,
      roleDistribution: {
        admin: 0,
        author: 0,
        user: 0
      }
    },
    newsStats: {
      total: 0,
      approved: 0,
      pending: 0,
      approvalRate: 0,
      featured: 0,
      publishedToday: 0,
      publishedThisWeek: 0,
      publishedThisMonth: 0,
      pendingToday: 0,
      pendingThisWeek: 0,
      categoriesInUse: 0
    },
    commentStats: {
      total: 0,
      approved: 0,
      pending: 0,
      approvalRate: 0,
      newToday: 0,
      newThisWeek: 0
    },
    emailStats: {
      total: 0,
      successful: 0,
      failed: 0,
      successRate: 0,
      sentToday: 0,
      sentThisWeek: 0
    },
    pushNotificationStats: {
      total: 0,
      sent: 0,
      pending: 0,
      sendRate: 0
    },
    recentActivity: {
      users: [],
      news: [],
      comments: [],
      pendingNews: []
    },
    popularData: {
      categories: [],
      authors: []
    },
    monthlyTrends: []
  },
  
  // Form states
  form: {
    title: '',
    summary: '',
    image: '',
    category: '',
    content: '',
    author: '',
    featured: false,
    tags: ''
  },
  editId: null,
  categoryInput: '',
  tagInput: '',
  
  // UI states
  activeTab: 'dashboard',
  loading: true,
  submitting: false,
  error: null,
  validationErrors: {},
  
  // Approval system
  approvalFilter: 'pending',
  rejectReason: '',
  rejectModal: { open: false, newsId: null, newsTitle: '' },
}

// Reducer function
const adminReducer = (state, action) => {
  switch (action.type) {
    case ADMIN_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload }
    
    case ADMIN_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false }
    
    case ADMIN_ACTIONS.SET_SUBMITTING:
      return { ...state, submitting: action.payload }
    
    case ADMIN_ACTIONS.SET_VALIDATION_ERRORS:
      return { ...state, validationErrors: action.payload }
    
    case ADMIN_ACTIONS.SET_NEWS:
      return { ...state, news: action.payload }
    
    case ADMIN_ACTIONS.SET_CATEGORIES:
      return { ...state, categories: action.payload }
    
    case ADMIN_ACTIONS.SET_COMMENTS:
      return { ...state, comments: action.payload }
    
    case ADMIN_ACTIONS.SET_USERS:
      return { ...state, users: action.payload }
    
    case ADMIN_ACTIONS.SET_STATS:
      return { ...state, stats: action.payload }
    
    case ADMIN_ACTIONS.SET_FEATURED_NEWS:
      return { ...state, featuredNews: action.payload }
    
    case ADMIN_ACTIONS.SET_PENDING_NEWS:
      return { ...state, pendingNews: action.payload }
    
    case ADMIN_ACTIONS.SET_ALL_NEWS:
      return { ...state, allNews: action.payload }
    
    case ADMIN_ACTIONS.SET_DASHBOARD_DATA:
      return { ...state, dashboardData: action.payload }
    
    case ADMIN_ACTIONS.SET_ACTIVE_TAB:
      return { ...state, activeTab: action.payload }
    
    case ADMIN_ACTIONS.UPDATE_FORM:
      return { 
        ...state, 
        form: { ...state.form, ...action.payload }
      }
    
    case ADMIN_ACTIONS.RESET_FORM:
      return {
        ...state,
        form: initialState.form,
        editId: null,
        validationErrors: {}
      }
    
    case ADMIN_ACTIONS.SET_EDIT_MODE:
      return {
        ...state,
        editId: action.payload.id,
        form: { ...action.payload.data }
      }
    
    case ADMIN_ACTIONS.CLEAR_EDIT_MODE:
      return {
        ...state,
        editId: null,
        form: initialState.form
      }
    
    default:
      return state
  }
}

// Context
const AdminContext = createContext()

// Provider component
export const AdminProvider = ({ children, user }) => {
  const [state, dispatch] = useReducer(adminReducer, {
    ...initialState,
    activeTab: user?.role === 'author' ? 'news' : 'dashboard'
  })

  // Action creators with useMemo
  const actions = useMemo(() => ({
    setLoading: (loading) => dispatch({ type: ADMIN_ACTIONS.SET_LOADING, payload: loading }),
    setError: (error) => dispatch({ type: ADMIN_ACTIONS.SET_ERROR, payload: error }),
    setSubmitting: (submitting) => dispatch({ type: ADMIN_ACTIONS.SET_SUBMITTING, payload: submitting }),
    setValidationErrors: (errors) => dispatch({ type: ADMIN_ACTIONS.SET_VALIDATION_ERRORS, payload: errors }),
    setNews: (news) => dispatch({ type: ADMIN_ACTIONS.SET_NEWS, payload: news }),
    setCategories: (categories) => dispatch({ type: ADMIN_ACTIONS.SET_CATEGORIES, payload: categories }),
    setComments: (comments) => dispatch({ type: ADMIN_ACTIONS.SET_COMMENTS, payload: comments }),
    setUsers: (users) => dispatch({ type: ADMIN_ACTIONS.SET_USERS, payload: users }),
    setStats: (stats) => dispatch({ type: ADMIN_ACTIONS.SET_STATS, payload: stats }),
    setFeaturedNews: (featured) => dispatch({ type: ADMIN_ACTIONS.SET_FEATURED_NEWS, payload: featured }),
    setPendingNews: (pending) => dispatch({ type: ADMIN_ACTIONS.SET_PENDING_NEWS, payload: pending }),
    setAllNews: (allNews) => dispatch({ type: ADMIN_ACTIONS.SET_ALL_NEWS, payload: allNews }),
    setDashboardData: (data) => dispatch({ type: ADMIN_ACTIONS.SET_DASHBOARD_DATA, payload: data }),
    setActiveTab: (tab) => dispatch({ type: ADMIN_ACTIONS.SET_ACTIVE_TAB, payload: tab }),
    updateForm: (formData) => dispatch({ type: ADMIN_ACTIONS.UPDATE_FORM, payload: formData }),
    resetForm: () => dispatch({ type: ADMIN_ACTIONS.RESET_FORM }),
    setEditMode: (id, data) => dispatch({ type: ADMIN_ACTIONS.SET_EDIT_MODE, payload: { id, data } }),
    clearEditMode: () => dispatch({ type: ADMIN_ACTIONS.CLEAR_EDIT_MODE }),
  }), [dispatch])

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        actions.setLoading(true)
        // Coalesce first batch: news + categories
        const [newsData, categoriesData] = await Promise.all([
          user?.role === 'admin' ? api.getAllNewsForAdminAllPages(50) : api.getNews(),
          api.get('/kategoriler') // let TTL map cache this
        ])
        
        let processedNews = Array.isArray(newsData) ? newsData : newsData?.data || []
        
        // Filter news for authors to show only their own
        if (user?.role === 'author') {
          processedNews = processedNews.filter(n => n.author === user.username)
        }
        
        actions.setNews(processedNews)
        actions.setCategories(Array.isArray(categoriesData) ? categoriesData : categoriesData?.data || [])
        
        // Load admin-specific data
        if (user?.role === 'admin') {
          // Coalesce secondary admin batch
          const [commentsData, usersData, featuredData, pendingData, allNewsData, statsData] = await Promise.all([
            api.getComments().catch(() => []),
            api.get('/admin/users', { noCache: true }).catch(() => []),
            api.get('/haber/manset-listesi').catch(() => []),
            api.getPendingNews(1, 20).catch(() => []),
            api.getAllNewsForAdminAllPages(50).catch(() => []),
            api.get('/admin/dashboard').catch(() => ({}))
          ])
          
          actions.setComments(Array.isArray(commentsData) ? commentsData : commentsData?.data || [])
          actions.setUsers(Array.isArray(usersData) ? usersData : usersData?.data || [])
          actions.setFeaturedNews(Array.isArray(featuredData) ? featuredData : featuredData?.featuredNews || [])
          actions.setPendingNews(Array.isArray(pendingData) ? pendingData : pendingData?.data || [])
          actions.setAllNews(Array.isArray(allNewsData) ? allNewsData : allNewsData?.data || [])
          actions.setStats(statsData || {})
        }
        
        actions.setLoading(false)
      } catch (error) {
        logger.error('Error loading initial data:', error)
        actions.setError('NETWORK_ERROR')
      }
    }

    if (user) {
      loadInitialData()
    }
  }, [user, actions])

  return (
    <AdminContext.Provider value={{ state, actions }}>
      {children}
    </AdminContext.Provider>
  )
}

export default AdminContext
