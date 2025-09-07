import React, { createContext, useContext, useState, useCallback } from 'react'

const BreadcrumbContext = createContext()

export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext)
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider')
  }
  return context
}

export const BreadcrumbProvider = ({ children }) => {
  const [breadcrumbItems, setBreadcrumbItems] = useState(null)

  const setBreadcrumb = useCallback((items) => {
    setBreadcrumbItems(items)
  }, [])

  const clearBreadcrumb = useCallback(() => {
    setBreadcrumbItems(null)
  }, [])

  return (
    <BreadcrumbContext.Provider 
      value={{ 
        breadcrumbItems, 
        setBreadcrumb, 
        clearBreadcrumb 
      }}
    >
      {children}
    </BreadcrumbContext.Provider>
  )
}
