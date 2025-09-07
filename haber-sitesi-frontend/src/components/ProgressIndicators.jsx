// Progress Indicators and Feedback Components
// Comprehensive progress tracking for uploads, forms, and long operations

import React, { useState, useEffect } from 'react'

/**
 * Linear Progress Bar Component
 */
export const ProgressBar = ({ 
  progress = 0, 
  showPercentage = true, 
  height = 'h-2', 
  color = 'bg-red-600', 
  backgroundColor = 'bg-gray-200',
  animated = true,
  label = null
}) => {
  const progressValue = Math.min(100, Math.max(0, progress))

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
          <span>{label}</span>
          {showPercentage && <span>{progressValue.toFixed(0)}%</span>}
        </div>
      )}
      <div className={`w-full ${backgroundColor} rounded-full ${height} overflow-hidden`}>
        <div 
          className={`${height} ${color} rounded-full transition-all duration-300 ease-out ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${progressValue}%` }}
          role="progressbar"
          aria-valuenow={progressValue}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          {animated && (
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Circular Progress Indicator
 */
export const CircularProgress = ({ 
  progress = 0, 
  size = 120, 
  strokeWidth = 8, 
  color = '#ef4444', 
  backgroundColor = '#e5e7eb',
  showPercentage = true,
  label = null
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progressValue = Math.min(100, Math.max(0, progress))
  const strokeDashoffset = circumference - (progressValue / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
          role="progressbar"
          aria-valuenow={progressValue}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-700">
              {progressValue.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <p className="mt-3 text-sm font-medium text-gray-600 text-center">{label}</p>
      )}
    </div>
  )
}

/**
 * Step Progress Indicator
 */
export const StepProgress = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          const isClickable = onStepClick && (isCompleted || isActive)

          return (
            <div key={index} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex items-center">
                <button
                  onClick={() => isClickable && onStepClick(stepNumber)}
                  disabled={!isClickable}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200
                    ${isCompleted 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : isActive 
                        ? 'bg-red-600 text-white shadow-red' 
                        : 'bg-gray-200 text-gray-500'
                    }
                    ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                  `}
                  aria-label={`Adım ${stepNumber}: ${step.title}`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </button>
              </div>

              {/* Step Label */}
              <div className="ml-3 min-w-0 flex-1">
                <p className={`text-sm font-medium ${isActive ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-gray-400 mt-1">
                    {step.description}
                  </p>
                )}
              </div>

              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4 h-0.5 bg-gray-200">
                  <div 
                    className={`h-full transition-all duration-500 ${stepNumber < currentStep ? 'bg-green-600' : 'bg-gray-200'}`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * File Upload Progress Component
 */
export const FileUploadProgress = ({ 
  files = [], 
  onRemove = null,
  showDetails = true 
}) => {
  if (files.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Dosya Yükleme ({files.length})
      </h3>
      
      {files.map((file, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              {/* File Icon */}
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              
              {/* File Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                {showDetails && (
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
            </div>

            {/* Remove Button */}
            {onRemove && (
              <button
                onClick={() => onRemove(index)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                aria-label={`${file.name} dosyasını kaldır`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <ProgressBar 
              progress={file.progress || 0}
              height="h-2"
              animated={file.progress < 100}
              showPercentage={false}
            />
            
            <div className="flex justify-between text-xs">
              <span className={`font-medium ${
                file.status === 'completed' ? 'text-green-600' :
                file.status === 'error' ? 'text-red-600' :
                'text-blue-600'
              }`}>
                {file.status === 'completed' ? 'Tamamlandı' :
                 file.status === 'error' ? 'Hata oluştu' :
                 'Yükleniyor...'}
              </span>
              <span className="text-gray-500">
                {file.progress || 0}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Form Submission Progress
 */
export const FormSubmissionProgress = ({ 
  isSubmitting, 
  steps = [], 
  currentStep = 0,
  message = 'Form gönderiliyor...' 
}) => {
  if (!isSubmitting) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center animate-slide-up">
        {/* Loading Animation */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>

        {/* Message */}
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {message}
        </h3>

        {/* Steps */}
        {steps.length > 0 && (
          <div className="space-y-3 mb-6">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`flex items-center text-sm ${
                  index < currentStep ? 'text-green-600' :
                  index === currentStep ? 'text-red-600' :
                  'text-gray-400'
                }`}
              >
                <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${
                  index < currentStep ? 'bg-green-600 text-white' :
                  index === currentStep ? 'bg-red-600 text-white' :
                  'bg-gray-200'
                }`}>
                  {index < currentStep ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <span className="font-medium">{step}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        <ProgressBar 
          progress={(currentStep / Math.max(steps.length - 1, 1)) * 100}
          showPercentage={false}
          height="h-2"
          animated={true}
        />

        <p className="text-xs text-gray-500 mt-4">
          Lütfen bekleyin, işlem tamamlanıyor...
        </p>
      </div>
    </div>
  )
}

/**
 * Page Loading Progress Bar (Top of page)
 */
export const PageLoadingProgress = ({ isLoading, progress = null }) => {
  const [displayProgress, setDisplayProgress] = useState(0)

  useEffect(() => {
    if (isLoading) {
      if (progress !== null) {
        setDisplayProgress(progress)
      } else {
        // Simulate progress if not provided
        const interval = setInterval(() => {
          setDisplayProgress(prev => {
            if (prev >= 90) return prev
            return prev + Math.random() * 20
          })
        }, 200)

        return () => clearInterval(interval)
      }
    } else {
      setDisplayProgress(100)
      setTimeout(() => setDisplayProgress(0), 500)
    }
  }, [isLoading, progress])

  if (!isLoading && displayProgress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div 
        className="h-1 bg-gradient-to-r from-red-600 to-red-700 transition-all duration-300 ease-out"
        style={{ width: `${displayProgress}%` }}
      >
        <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
      </div>
    </div>
  )
}

/**
 * News Loading Skeleton
 */
export const NewsLoadingSkeleton = ({ count = 3 }) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
          <div className="flex space-x-4">
            {/* Image Skeleton */}
            <div className="w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0"></div>
            
            {/* Content Skeleton */}
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Admin Loading Skeleton Component
 */
export const AdminLoadingSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Form Skeleton */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="h-12 bg-gray-200"></div>
        {[...Array(5)].map((_, index) => (
          <div key={index} className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-200 rounded"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
              <div className="flex space-x-2">
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Form Submission Overlay Component
 */
export const FormSubmissionOverlay = ({ 
  isVisible = true,
  message = "İşleminiz gerçekleştiriliyor...",
  progress = null,
  showSpinner = true
}) => {
  if (!isVisible) return null

  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center z-50">
      <div className="text-center p-6">
        {showSpinner && (
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
        )}
        <p className="text-lg font-medium text-gray-800 mb-2">{message}</p>
        {progress !== null && (
          <div className="w-64 mx-auto">
            <ProgressBar progress={progress} showPercentage={true} />
          </div>
        )}
      </div>
    </div>
  )
}

// CSS animations to add to the main CSS file
export const progressAnimationStyles = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

@keyframes toast-progress {
  from { width: 100%; }
  to { width: 0%; }
}

.animate-toast-progress {
  animation: toast-progress linear forwards;
}
`

export default {
  ProgressBar,
  CircularProgress,
  StepProgress,
  FileUploadProgress,
  FormSubmissionProgress,
  FormSubmissionOverlay,
  PageLoadingProgress,
  NewsLoadingSkeleton,
  AdminLoadingSkeleton,
  progressAnimationStyles
}
