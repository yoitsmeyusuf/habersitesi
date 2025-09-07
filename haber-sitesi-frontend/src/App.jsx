import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useContext, Suspense } from 'react'
import { UserContext } from './contexts/UserContext.jsx'
import { BreadcrumbProvider } from './contexts/BreadcrumbContext.jsx'
import Home from './pages/Home'
// Lazy loaded pages for better performance
import {
  NewsDetailLazy,
  CategoryLazy,
  AdminLazy,
  LoginLazy,
  AuthorLazy,
  ProfileLazy,
  RegisterLazy,
  ForgotPasswordLazy,
  ResetPasswordLazy,
  EmailVerificationLazy,
  SearchLazy,
  AboutLazy,
  ContactLazy,
  FAQLazy
} from './components/LazyComponents'
import AuthorProfile from './pages/AuthorProfile'
import Authors from './pages/Authors'
import NotFound from './pages/NotFound'
import ServerError from './pages/ServerError'
import Breadcrumb from './components/Breadcrumb'
import ProtectedRoute from './components/ProtectedRoute'
import SessionManager from './components/SessionManager'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import { GlobalLoadingOverlay } from './components/Loading'
import api from './services/api'
import logger from './utils/logger'
import { initializeMobileUX } from './utils/mobileUX'
import analytics, { trackPageView, trackPageLoadPerformance } from './utils/analytics'
import { ConnectionStatus } from './components/ErrorHandling'
import { PageLoadingProgress } from './components/ProgressIndicators'
import { getDisplayName, getUserInitials } from './utils/userUtils'
import ScrollToTop from './components/ScrollToTop'

// Modern Navigation Header Component
function NavigationHeader() {
  const { user, logout } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await api.getCategories()
        setCategories(categoriesData || [])
      } catch (error) {
        logger.error('Error loading categories:', error)
      }
    }
    loadCategories()
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/giris')
  }

  const isActiveRoute = (path) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 bg-white/98 backdrop-blur-xl border-b border-gray-100 shadow-sm" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-2 sm:py-3 text-xs sm:text-sm border-b border-gray-50">
          <div className="flex items-center space-x-2 sm:space-x-4 text-gray-600">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <time className="font-medium hidden sm:block" dateTime={new Date().toISOString()}>
                {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </time>
              <time className="font-medium sm:hidden" dateTime={new Date().toISOString()}>
                {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
              </time>
            </div>
          </div>
          <nav className="flex items-center space-x-1 sm:space-x-4" role="navigation" aria-label="Kullanıcı menüsü">
            {user ? (
              <div className="flex items-center space-x-1 sm:space-x-3">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg" role="img" aria-label={`${getDisplayName(user)} profil resmi`}>
                    {getUserInitials(user)}
                  </div>
                  <span className="text-gray-700 font-semibold text-xs sm:text-sm hidden sm:block">{getDisplayName(user)}</span>
                  <span className="px-2 py-1 sm:px-3 sm:py-1 bg-gradient-to-r from-red-100 to-red-50 text-red-700 text-xs rounded-full font-semibold border border-red-200 hidden md:block" role="status" aria-label="Kullanıcı rolü">
                    {user.role === 'author' ? 'Yazar' : user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                  </span>
                </div>
                <Link 
                  to="/profil" 
                  className="px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-blue-800 focus:from-blue-700 focus:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  aria-label="Profil sayfasına git"
                >
                  <span className="hidden sm:inline">Profil</span>
                  <span className="sm:hidden" aria-hidden="true">👤</span>
                </Link>
                {(user.role === 'admin' || user.role === 'author') && (
                  <Link 
                    to="/yonetim" 
                    className="px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs rounded-lg sm:rounded-xl hover:from-red-700 hover:to-red-800 focus:from-red-700 focus:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    aria-label="Yönetim paneline git"
                  >
                    <span className="hidden sm:inline">Panel</span>
                    <span className="sm:hidden" aria-hidden="true">⚙️</span>
                  </Link>
                )}
                <button 
                  onClick={handleLogout} 
                  className="px-2 py-1 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-xs rounded-lg sm:rounded-xl hover:from-gray-700 hover:to-gray-800 focus:from-gray-700 focus:to-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  aria-label="Çıkış yap"
                >
                  <span className="hidden sm:inline">Çıkış</span>
                  <span className="sm:hidden" aria-hidden="true">🚪</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1 sm:space-x-3">
                <Link 
                  to="/giris" 
                  className="text-gray-700 hover:text-red-600 focus:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-semibold transition-colors duration-200 px-2 py-1 sm:px-3 sm:py-2 rounded-lg hover:bg-red-50 focus:bg-red-50 text-xs sm:text-sm"
                  aria-label="Giriş yap"
                >
                  Giriş
                </Link>
                <Link 
                  to="/kayit" 
                  className="px-3 py-1 sm:px-5 sm:py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-xs sm:text-sm rounded-lg sm:rounded-xl hover:from-red-700 hover:to-red-800 focus:from-red-700 focus:to-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  aria-label="Kayıt ol"
                >
                  Kayıt
                </Link>
              </div>
            )}
          </nav>
        </div>

        {/* Main Navigation */}
        <div className="flex items-center justify-between py-3 sm:py-5">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-red-600 to-red-700 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
              <span className="text-white font-bold text-lg sm:text-2xl">H</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">HaberSitesi</h1>
              <p className="text-xs text-gray-500 leading-none font-medium">Güncel Haberler</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Haber</h1>
            </div>
          </Link>

          {/* Desktop Navigation - Sağ tarafa hizalanmış */}
          <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
            <Link 
              to="/" 
              className={`font-semibold transition-all duration-200 px-3 py-2 xl:px-4 xl:py-2 rounded-xl text-sm xl:text-base ${isActiveRoute('/') ? 'text-red-600 bg-red-50 border border-red-200' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'}`}
            >
              Ana Sayfa
            </Link>
            {categories.slice(0, 4).map(cat => (
              <Link 
                key={cat.id || cat} 
                to={`/kategori/${cat.name || cat}`}
                className={`font-semibold transition-all duration-200 px-3 py-2 xl:px-4 xl:py-2 rounded-xl text-sm xl:text-base ${
                  location.pathname === `/kategori/${cat.name || cat}` ? 'text-red-600 bg-red-50 border border-red-200' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                }`}
              >
                {cat.name || cat}
              </Link>
            ))}
            <Link 
              to="/hakkimizda" 
              className={`font-semibold transition-all duration-200 px-3 py-2 xl:px-4 xl:py-2 rounded-xl text-sm xl:text-base ${isActiveRoute('/hakkimizda') ? 'text-red-600 bg-red-50 border border-red-200' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'}`}
            >
              Hakkımızda
            </Link>
            <Link 
              to="/yazarlar" 
              className={`font-semibold transition-all duration-200 px-3 py-2 xl:px-4 xl:py-2 rounded-xl text-sm xl:text-base ${isActiveRoute('/yazarlar') ? 'text-red-600 bg-red-50 border border-red-200' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'}`}
            >
              Yazarlar
            </Link>
            <Link 
              to="/iletisim" 
              className={`font-semibold transition-all duration-200 px-3 py-2 xl:px-4 xl:py-2 rounded-xl text-sm xl:text-base ${isActiveRoute('/iletisim') ? 'text-red-600 bg-red-50 border border-red-200' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'}`}
            >
              İletişim
            </Link>
            <Link 
              to="/search" 
              className={`font-semibold transition-all duration-200 px-3 py-2 xl:px-4 xl:py-2 rounded-xl text-sm xl:text-base ${isActiveRoute('/search') ? 'text-red-600 bg-red-50 border border-red-200' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'}`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden xl:inline">Arama</span>
              </div>
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 sm:p-3 rounded-lg sm:rounded-xl text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-200 border border-gray-200 hover:border-red-200"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-3 sm:py-4 border-t border-gray-100 bg-white/95 backdrop-blur-lg">
            <nav className="flex flex-col space-y-1 sm:space-y-2">
              <Link 
                to="/" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base ${isActiveRoute('/') ? 'bg-red-100 text-red-700 border border-red-200' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'}`}
              >
                🏠 Ana Sayfa
              </Link>
              {categories.map(cat => (
                <Link 
                  key={cat.id || cat} 
                  to={`/kategori/${cat.name || cat}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base ${
                    location.pathname === `/kategori/${cat.name || cat}` ? 'bg-red-100 text-red-700 border border-red-200' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  📂 {cat.name || cat}
                </Link>
              ))}
              <Link 
                to="/hakkimizda" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base ${isActiveRoute('/hakkimizda') ? 'bg-red-100 text-red-700 border border-red-200' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'}`}
              >
                📖 Hakkımızda
              </Link>
              <Link 
                to="/yazarlar" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base ${isActiveRoute('/yazarlar') ? 'bg-red-100 text-red-700 border border-red-200' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'}`}
              >
                ✍️ Yazarlar
              </Link>
              <Link 
                to="/iletisim" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base ${isActiveRoute('/iletisim') ? 'bg-red-100 text-red-700 border border-red-200' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'}`}
              >
                📧 İletişim
              </Link>
              <Link 
                to="/search" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base ${isActiveRoute('/search') ? 'bg-red-100 text-red-700 border border-red-200' : 'text-gray-700 hover:text-red-600 hover:bg-red-50'}`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>🔍 Arama</span>
                </div>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

// Footer Component
function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Logo ve Açıklama */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-xl">
                <span className="text-white font-bold text-2xl">H</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">HaberSitesi</h1>
                <p className="text-sm text-gray-400 font-medium">Güncel Haberler</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6 max-w-md leading-relaxed text-lg">
              Türkiye'nin en güncel ve güvenilir haber kaynağı. Son dakika haberleri, siyaset, ekonomi, spor ve daha fazlası için bizi takip edin.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="group w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600 transition-all duration-300 transform hover:scale-110">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="group w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-blue-600 transition-all duration-300 transform hover:scale-110">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" className="group w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-pink-600 transition-all duration-300 transform hover:scale-110">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.749-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.986C24.007 5.367 18.641.001.012.001z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Hızlı Linkler */}
          <div>
            <h3 className="text-xl font-bold mb-6 text-white">Hızlı Linkler</h3>
            <ul className="space-y-3">
              <li><Link to="/" className="text-gray-300 hover:text-red-400 transition-all duration-200 flex items-center space-x-2 group">
                <span className="w-1 h-1 bg-red-500 rounded-full group-hover:w-2 transition-all duration-200"></span>
                <span>Ana Sayfa</span>
              </Link></li>
              <li><Link to="/search" className="text-gray-300 hover:text-red-400 transition-all duration-200 flex items-center space-x-2 group">
                <span className="w-1 h-1 bg-red-500 rounded-full group-hover:w-2 transition-all duration-200"></span>
                <span>Haber Ara</span>
              </Link></li>
              <li><Link to="/hakkimizda" className="text-gray-300 hover:text-red-400 transition-all duration-200 flex items-center space-x-2 group">
                <span className="w-1 h-1 bg-red-500 rounded-full group-hover:w-2 transition-all duration-200"></span>
                <span>Hakkımızda</span>
              </Link></li>
              <li><Link to="/yazarlar" className="text-gray-300 hover:text-red-400 transition-all duration-200 flex items-center space-x-2 group">
                <span className="w-1 h-1 bg-red-500 rounded-full group-hover:w-2 transition-all duration-200"></span>
                <span>Yazarlar</span>
              </Link></li>
              <li><Link to="/iletisim" className="text-gray-300 hover:text-red-400 transition-all duration-200 flex items-center space-x-2 group">
                <span className="w-1 h-1 bg-red-500 rounded-full group-hover:w-2 transition-all duration-200"></span>
                <span>İletişim</span>
              </Link></li>
              <li><Link to="/sss" className="text-gray-300 hover:text-red-400 transition-all duration-200 flex items-center space-x-2 group">
                <span className="w-1 h-1 bg-red-500 rounded-full group-hover:w-2 transition-all duration-200"></span>
                <span>SSS</span>
              </Link></li>
            </ul>
          </div>

          {/* İletişim */}
          <div>
            <h3 className="text-xl font-bold mb-6 text-white">İletişim</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>info@habersitesi.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+90 (212) 123 45 67</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} HaberSitesi. Tüm hakları saklıdır.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Kullanım Şartları</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Gizlilik</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Çerezler</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Sağ üst kullanıcı barı
function UserBar() {
  const { user, setUser } = useContext(UserContext)
  const navigate = useNavigate()
  const handleLogout = () => {
    api.logout()
    setUser(null)
    navigate('/giris')
  }
  if (!user) return (
    <div className="absolute top-6 right-6 flex gap-3">
      <Link 
        to="/giris" 
        className="px-4 py-2 text-primary-600 hover:text-primary-700 font-semibold border border-primary-200 rounded-xl hover:bg-primary-50 transition-all duration-200"
      >
        Giriş Yap
      </Link>
      <Link 
        to="/kayit" 
        className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all duration-200 font-semibold shadow-red"
      >
        Kayıt Ol
      </Link>
    </div>
  )
  return (
    <div className="absolute top-6 right-6 flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-red border border-primary-100">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {getUserInitials(user)}
        </div>
        <div>
          <span className="font-semibold text-gray-900 text-sm">{getDisplayName(user)}</span>
          <span className="text-xs text-gray-500 block">({user.role})</span>
        </div>
      </div>
      <Link 
        to="/profil" 
        className="ml-2 px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-all duration-200 font-medium"
      >
        Profil
      </Link>
      <button 
        onClick={handleLogout} 
        className="ml-2 px-3 py-1 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-all duration-200 font-medium"
      >
        Çıkış
      </button>
    </div>
  )
}

// Main App Content Component (BrowserRouter içinde olacak)
function AppContent() {
  const location = useLocation()

  // Initialize mobile UX enhancements
  useEffect(() => {
    const cleanup = initializeMobileUX()
    return cleanup
  }, [])

  // Initialize analytics
  useEffect(() => {
    analytics.initialize()
    trackPageLoadPerformance()
  }, [])

  // Track page views on route changes - location dependency eklendi
  useEffect(() => {
    trackPageView()
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      <Breadcrumb />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={
            <ErrorBoundary context="Home Page">
              <Home />
            </ErrorBoundary>
          } />
                  <Route path="/news/:id" element={
                    <ErrorBoundary context="News Detail">
                      <NewsDetailLazy />
                    </ErrorBoundary>
                  } />
                  <Route path="/haber/:slugWithId" element={
                    <ErrorBoundary context="News Detail">
                      <NewsDetailLazy />
                    </ErrorBoundary>
                  } />
                  <Route path="/kategori/:name" element={
                    <ErrorBoundary context="Category Page">
                      <CategoryLazy />
                    </ErrorBoundary>
                  } />
                  <Route path="/search" element={
                    <ErrorBoundary context="Search Page">
                      <SearchLazy />
                    </ErrorBoundary>
                  } />
                  <Route path="/profil" element={
                    <ErrorBoundary context="Profile Page">
                      <ProtectedRoute>
                        <ProfileLazy />
                      </ProtectedRoute>
                    </ErrorBoundary>
                  } />
                  <Route path="/yonetim" element={
                    <ErrorBoundary context="Admin Panel">
                      <ProtectedRoute requiredRole="author">
                        <AdminLazy />
                      </ProtectedRoute>
                    </ErrorBoundary>
                  } />
                  <Route path="/giris" element={
                    <ErrorBoundary context="Login Page">
                      <LoginLazy />
                    </ErrorBoundary>
                  } />
                  <Route path="/yazar/:authorParam" element={
                    <ErrorBoundary context="Author Profile Page">
                      <AuthorProfile />
                    </ErrorBoundary>
                  } />
                  <Route path="/yazarlar" element={
                    <ErrorBoundary context="Authors Page">
                      <Authors />
                    </ErrorBoundary>
                  } />
                  <Route path="/kayit" element={
                    <ErrorBoundary context="Register Page">
                      <RegisterLazy />
                    </ErrorBoundary>
                  } />
                  <Route path="/sifremi-unuttum" element={
                    <ErrorBoundary context="Forgot Password Page">
                      <ForgotPasswordLazy />
                    </ErrorBoundary>
                  } />
                  <Route path="/sifre-sifirla" element={
                    <ErrorBoundary context="Reset Password Page">
                      <ResetPasswordLazy />
                    </ErrorBoundary>
                  } />
                  <Route path="/email-dogrula" element={
                    <ErrorBoundary context="Email Verification Page">
                      <EmailVerificationLazy />
                    </ErrorBoundary>
                  } />
                  <Route path="/hakkimizda" element={
                    <ErrorBoundary context="About Page">
                      <AboutLazy />
                    </ErrorBoundary>
                  } />
                  <Route path="/iletisim" element={
                    <ErrorBoundary context="Contact Page">
                      <ContactLazy />
                    </ErrorBoundary>
                  } />
                  <Route path="/sss" element={
                    <ErrorBoundary context="FAQ Page">
                      <FAQLazy />
                    </ErrorBoundary>
                  } />
                  <Route path="/sunucu-hatasi" element={
                    <ErrorBoundary context="Server Error Page">
                      <ServerError />
                    </ErrorBoundary>
                  } />
                  <Route path="*" element={
                    <ErrorBoundary context="404 Page">
                      <NotFound />
                    </ErrorBoundary>
                  } />
                </Routes>
              </main>
              <Footer />
            </div>
  )
}

// Ana App wrapper component
function App() {
  return (
    <ErrorBoundary context="App Root">
      <BreadcrumbProvider>
        <PageLoadingProgress isLoading={false} />
        <ConnectionStatus />
        <GlobalLoadingOverlay />
        <SessionManager>
          <BrowserRouter>
            <ScrollToTop />
            <AppContent />
          </BrowserRouter>
        </SessionManager>
      </BreadcrumbProvider>
    </ErrorBoundary>
  )
}

export default App