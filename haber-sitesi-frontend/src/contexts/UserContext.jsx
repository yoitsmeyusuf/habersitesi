import { createContext, useContext, useReducer, useEffect } from 'react'
import { removeToken, logError } from '../utils/security'
import logger from '../utils/logger'

// UserContext definition
export const UserContext = createContext()

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null
}

// Action types
const ACTIONS = {
  SET_USER: 'SET_USER',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
}

// Reducer
const userReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false,
        error: null
      }
    case ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null
      }
    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      }
    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      }
    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      }
    default:
      return state
  }
}

// UserProvider component
export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState)

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        dispatch({ type: ACTIONS.SET_LOADING, payload: true })
        
        // Get token from cookie (primary) or localStorage (fallback for migration)
        let token = document.cookie.split('; ').reduce((r, v) => {
          const parts = v.split('=')
          return parts[0] === 'token' ? decodeURIComponent(parts[1]) : r
        }, '')
        
        // If no cookie token, check localStorage and migrate
        if (!token) {
          const localToken = localStorage.getItem('token')
          if (localToken) {
            // Migrate from localStorage to cookie
            document.cookie = `token=${localToken}; path=/; max-age=${7 * 24 * 60 * 60}`
            localStorage.removeItem('token')
            token = localToken
          }
        }
        
        if (token) {
          try {
            // Decode token to get user info
            const payload = JSON.parse(atob(token.split('.')[1]))
            
            // Check if token is expired
            const now = Date.now() / 1000
            
            if (payload.exp && payload.exp < now) {
              // Token expired, remove it
              document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
              localStorage.removeItem('token')
              removeToken()
              dispatch({ type: ACTIONS.SET_LOADING, payload: false })
              return
            }
            
            const user = {
              id: payload.userId || payload.id || payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"],
              email: payload.email || payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
              role: payload.role || payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || 'user',
              username: payload.name || payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]
            }
            
            // Set basic user data from token first
            dispatch({ type: ACTIONS.SET_USER, payload: user })
            
            // Then fetch complete user profile from server to get updated info
            try {
              const api = (await import('../services/api')).default
              const completeUserData = await api.getCurrentUser()
              
              if (completeUserData) {
                const fullUser = {
                  ...user, // Keep token data as base
                  ...completeUserData, // Override with fresh server data
                  emailVerified: completeUserData.emailVerified || completeUserData.emailConfirmed || false
                }
                dispatch({ type: ACTIONS.SET_USER, payload: fullUser })
                logger.log('UserContext: Complete user data loaded from server')
              }
            } catch (serverError) {
              logger.log('Could not fetch complete user data, using token data only:', serverError.message)
              // Keep the basic token user data if server fetch fails
            }
          } catch (error) {
            logError('Error decoding token:', error)
            // Clear both cookie and localStorage on error
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
            localStorage.removeItem('token')
            removeToken()
            dispatch({ type: ACTIONS.SET_LOADING, payload: false })
          }
        } else {
          dispatch({ type: ACTIONS.SET_LOADING, payload: false })
        }
      } catch (error) {
        logError('Error initializing session:', error)
        dispatch({ type: ACTIONS.SET_ERROR, payload: 'Oturum başlatılamadı' })
      }
    }

    initializeSession()
  }, [])

  // Actions
  const login = (userData, token) => {
    try {
      logger.log('UserContext login initiated')
      
      // Backend field mapping - emailConfirmed -> emailVerified
      const normalizedUser = {
        ...userData,
        emailVerified: userData.emailVerified || userData.emailConfirmed || false
      }
      logger.log('UserContext: User data normalized')
      
      if (token) {
        localStorage.setItem('token', token)
      }
      dispatch({ type: ACTIONS.SET_USER, payload: normalizedUser })
      dispatch({ type: ACTIONS.CLEAR_ERROR })
      logger.log('UserContext login completed successfully')
    } catch (error) {
      logError('Login error:', error)
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Giriş yapılamadı' })
    }
  }

  const logout = () => {
    try {
      removeToken()
      dispatch({ type: ACTIONS.LOGOUT })
    } catch (error) {
      logError('Logout error:', error)
    }
  }

  const updateUser = (userData) => {
    try {
      logger.log('UserContext: Updating user data')
      
      // Backend field mapping - emailConfirmed -> emailVerified
      const normalizedUser = {
        ...state.user,
        ...userData,
        emailVerified: userData.emailVerified || userData.emailConfirmed || false
      }
      
      dispatch({ type: ACTIONS.SET_USER, payload: normalizedUser })
      logger.log('UserContext: User data updated successfully')
    } catch (error) {
      logError('Update user error:', error)
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Kullanıcı bilgileri güncellenemedi' })
    }
  }

  const refreshUser = async () => {
    try {
      logger.log('UserContext: Refreshing user data from server')
      dispatch({ type: ACTIONS.SET_LOADING, payload: true })
      
      const api = (await import('../services/api')).default
      const userData = await api.getCurrentUser()
      
      if (userData) {
        const normalizedUser = {
          ...userData,
          emailVerified: userData.emailVerified || userData.emailConfirmed || false
        }
        dispatch({ type: ACTIONS.SET_USER, payload: normalizedUser })
        logger.log('UserContext: User data refreshed successfully')
      } else {
        throw new Error('No user data received')
      }
    } catch (error) {
      logError('Refresh user error:', error)
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Kullanıcı bilgileri yenilenemedi' })
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false })
    }
  }

  const setError = (error) => {
    dispatch({ type: ACTIONS.SET_ERROR, payload: error })
  }

  const clearError = () => {
    dispatch({ type: ACTIONS.CLEAR_ERROR })
  }

  const value = {
    ...state,
    login,
    logout,
    updateUser,
    refreshUser,
    setError,
    clearError
  }

  logger.log('UserContext Provider initialized')

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

// Custom hook to use UserContext
export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
