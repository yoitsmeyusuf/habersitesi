import { lazy, Suspense } from 'react'
import { LoadingOverlay } from './Loading'

// Lazy load components for better performance and code splitting
const LazyAdmin = lazy(() => import('../pages/Admin'))
const LazyNewsDetail = lazy(() => import('../pages/NewsDetail'))
const LazyCategory = lazy(() => import('../pages/Category'))
const LazyAuthor = lazy(() => import('../pages/Author'))
const LazyProfile = lazy(() => import('../pages/Profile'))
const LazyNewsletterPage = lazy(() => import('../pages/Newsletter'))
const LazySearch = lazy(() => import('../pages/Search'))
const LazyAbout = lazy(() => import('../pages/About'))
const LazyContact = lazy(() => import('../pages/Contact'))
const LazyFAQ = lazy(() => import('../pages/FAQ'))
const LazyLogin = lazy(() => import('../pages/Login'))
const LazyRegister = lazy(() => import('../pages/Register'))
const LazyForgotPassword = lazy(() => import('../pages/ForgotPassword'))
const LazyResetPassword = lazy(() => import('../pages/ResetPassword'))
const LazyEmailVerification = lazy(() => import('../pages/EmailVerification'))

// Heavy components
const LazyPopularNews = lazy(() => import('./PopularNews'))
const LazyRelatedNews = lazy(() => import('./RelatedNews'))
const LazySocialShare = lazy(() => import('./SocialShare'))
const LazyCommentReplySystem = lazy(() => import('./CommentReplySystem'))

// Higher-order component for lazy loading with suspense
export const withLazyLoading = (Component, fallback = <LoadingOverlay />) => {
  return (props) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  )
}

// Export lazy components with HOC
export const AdminLazy = withLazyLoading(LazyAdmin)
export const NewsDetailLazy = withLazyLoading(LazyNewsDetail)
export const CategoryLazy = withLazyLoading(LazyCategory) 
export const AuthorLazy = withLazyLoading(LazyAuthor)
export const ProfileLazy = withLazyLoading(LazyProfile)
export const NewsletterLazy = withLazyLoading(LazyNewsletterPage)
export const SearchLazy = withLazyLoading(LazySearch)
export const AboutLazy = withLazyLoading(LazyAbout)
export const ContactLazy = withLazyLoading(LazyContact)
export const FAQLazy = withLazyLoading(LazyFAQ)
export const LoginLazy = withLazyLoading(LazyLogin)
export const RegisterLazy = withLazyLoading(LazyRegister)
export const ForgotPasswordLazy = withLazyLoading(LazyForgotPassword)
export const ResetPasswordLazy = withLazyLoading(LazyResetPassword)
export const EmailVerificationLazy = withLazyLoading(LazyEmailVerification)

// Heavy components
export const PopularNewsLazy = withLazyLoading(LazyPopularNews)
export const RelatedNewsLazy = withLazyLoading(LazyRelatedNews)
export const SocialShareLazy = withLazyLoading(LazySocialShare)
export const CommentReplySystemLazy = withLazyLoading(LazyCommentReplySystem)
