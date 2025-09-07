import { useState, useCallback } from 'react';
import { logger } from '../utils/logger';

export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const signInWithGoogle = useCallback(async (credential) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Starting Google authentication process');

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5255/api';
  const fullUrl = `${apiUrl}/kimlik/google`;
      
      logger.info('Sending request to:', fullUrl);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: credential
        })
      });

      logger.info('Response status:', response.status);
      logger.info('Response headers:', Object.fromEntries(response.headers.entries()));

      // Response text'ini önce al
      const responseText = await response.text();
      logger.info('Response text:', responseText);

      if (!responseText) {
        throw new Error(`Backend'den boş response geldi. Status: ${response.status}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('JSON parse error:', parseError);
        throw new Error(`Backend'den geçersiz JSON geldi: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      if (data.success) {
        logger.info('Google authentication successful', {
          username: data.user.username,
          role: data.user.role,
          isNewUser: data.user.isNewUser
        });

        // Token'ı cookie'ye kaydet (UserContext ile uyumlu)
        document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}` // 7 days
        
        // Eski localStorage token'larını temizle
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        return {
          success: true,
          data: data,
          user: data.user,
          token: data.token,
          warning: data.warning || null
        };
      } else {
        throw new Error(data.message || 'Google authentication failed');
      }

    } catch (error) {
      logger.error('Google authentication error:', error);
      
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        details: error.message
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getErrorMessage = (error) => {
    if (error.message) {
      // API'den gelen hata mesajları
      if (error.message.includes('token')) {
        return 'Google token geçersiz veya süresi dolmuş';
      }
      if (error.message.includes('email')) {
        return 'Email adresi ile ilgili bir sorun var';
      }
      if (error.message.includes('domain')) {
        return 'Bu domain\'den giriş yapma yetkiniz yok';
      }
      if (error.message.includes('404')) {
        return 'Sunucu endpoint\'i bulunamadı';
      }
      if (error.message.includes('500')) {
        return 'Sunucu hatası, lütfen tekrar deneyin';
      }
      return error.message;
    }
    
    return 'Google ile giriş yapılırken beklenmeyen bir hata oluştu';
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = useCallback(() => {
    try {
      // localStorage'ı temizle
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Google Sign-Out
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
      
      logger.info('User logged out successfully');
      
      return { success: true };
    } catch (error) {
      logger.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    signInWithGoogle,
    logout,
    isLoading,
    error,
    clearError
  };
};

// Google SDK durumunu kontrol eden hook
export const useGoogleSDK = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkGoogleSDK = useCallback(() => {
    const checkInterval = setInterval(() => {
      if (window.google?.accounts?.id) {
        setIsLoaded(true);
        setIsLoading(false);
        clearInterval(checkInterval);
        logger.info('Google SDK loaded successfully');
      }
    }, 100);

    // 10 saniye sonra timeout
    setTimeout(() => {
      if (!isLoaded) {
        setIsLoading(false);
        clearInterval(checkInterval);
        logger.error('Google SDK loading timeout');
      }
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [isLoaded]);

  return {
    isLoaded,
    isLoading,
    checkGoogleSDK
  };
};

// Auth durumunu yöneten hook
export const useAuthState = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const initializeAuth = useCallback(() => {
    try {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
        
        logger.info('Auth state restored from localStorage', {
          username: parsedUser.username,
          role: parsedUser.role
        });
      }
    } catch (error) {
      logger.error('Error initializing auth state:', error);
      // Bozuk veri varsa temizle
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, []);

  const updateAuthState = useCallback((authData) => {
    setToken(authData.token);
    setUser(authData.user);
    setIsAuthenticated(true);
  }, []);

  const clearAuthState = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  return {
    user,
    token,
    isAuthenticated,
    initializeAuth,
    updateAuthState,
    clearAuthState
  };
};
