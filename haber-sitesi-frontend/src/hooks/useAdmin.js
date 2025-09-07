import { useContext } from 'react'
import AdminContext from '../contexts/AdminContext'

// Hook to use admin context
export const useAdmin = () => {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider')
  }
  return context
}

// Admin Action Types
export const ADMIN_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_SUBMITTING: 'SET_SUBMITTING',
  SET_VALIDATION_ERRORS: 'SET_VALIDATION_ERRORS',
  SET_NEWS: 'SET_NEWS',
  SET_CATEGORIES: 'SET_CATEGORIES',
  SET_COMMENTS: 'SET_COMMENTS',
  SET_USERS: 'SET_USERS',
  SET_STATS: 'SET_STATS',
  SET_FEATURED_NEWS: 'SET_FEATURED_NEWS',
  SET_PENDING_NEWS: 'SET_PENDING_NEWS',
  SET_ALL_NEWS: 'SET_ALL_NEWS',
  SET_DASHBOARD_DATA: 'SET_DASHBOARD_DATA',
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  RESET_FORM: 'RESET_FORM',
  UPDATE_FORM: 'UPDATE_FORM',
  SET_EDIT_MODE: 'SET_EDIT_MODE',
  CLEAR_EDIT_MODE: 'CLEAR_EDIT_MODE',
}
