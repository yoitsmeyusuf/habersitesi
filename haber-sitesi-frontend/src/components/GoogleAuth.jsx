import React, { useEffect, useState } from 'react';
import { logger } from '../utils/logger';

const GoogleAuth = ({ onSuccess, onError, className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  useEffect(() => {
    // Google SDK'nın yüklenmesini kontrol et
    const checkGoogleLoaded = () => {
      if (window.google?.accounts?.id) {
        setIsGoogleLoaded(true);
        initializeGoogleSignIn();
      } else {
        // Google SDK yüklenmesini bekle
        setTimeout(checkGoogleLoaded, 100);
      }
    };

    checkGoogleLoaded();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const initializeGoogleSignIn = () => {
    try {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID",
        callback: handleCredentialResponse,
        context: 'signin',
        ux_mode: 'popup',
        auto_prompt: false,
        cancel_on_tap_outside: false
      });

      // Button'ı render et
      const buttonContainer = document.getElementById('google-signin-button');
      if (buttonContainer) {
        window.google.accounts.id.renderButton(buttonContainer, {
          type: 'standard',
          shape: 'rectangular',
          theme: 'outline',
          text: 'signin_with',
          size: 'large',
          logo_alignment: 'left',
          width: '100%'
        });
      }

      logger.info('Google Sign-In initialized successfully');
    } catch (error) {
      logger.error('Google Sign-In initialization failed:', error);
      setError('Google Sign-In yüklenemedi');
    }
  };

  const handleCredentialResponse = async (response) => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Google credential received, sending to backend');

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5255/api';
  const fullUrl = `${apiUrl}/kimlik/google`;
      
      logger.info('Sending request to:', fullUrl);

      const result = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: response.credential
        })
      });

      logger.info('Response status:', result.status);
      logger.info('Response headers:', Object.fromEntries(result.headers.entries()));

      // Response text'ini önce al
      const responseText = await result.text();
      logger.info('Response text:', responseText);

      if (!responseText) {
        throw new Error(`Backend'den boş response geldi. Status: ${result.status}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('JSON parse error:', parseError);
        throw new Error(`Backend'den geçersiz JSON geldi: ${responseText.substring(0, 100)}`);
      }

      if (data.success) {
        logger.info('Google login successful:', data.user.username);

        // Token'ı cookie'ye kaydet (UserContext ile uyumlu)
        document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}` // 7 days
        
        // Eski localStorage token'ını temizle
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Başarı callback'ini çağır
        if (onSuccess) {
          onSuccess(data);
        }

        // Admin onay uyarısı
        if (data.warning) {
          alert(data.warning);
        }

      } else {
        throw new Error(data.message || 'Google giriş başarısız');
      }

    } catch (error) {
      logger.error('Google login failed:', error);
      const errorMessage = error.message || 'Google ile giriş yapılırken bir hata oluştu';
      setError(errorMessage);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    initializeGoogleSignIn();
  };

  return (
    <div className={`google-auth-container ${className}`}>
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-blue-700">Google ile giriş yapılıyor...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-red-400 mr-3">⚠️</div>
            <div>
              <p className="text-sm text-red-700">{error}</p>
              <button 
                onClick={handleRetry}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Tekrar dene
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Button Container */}
      {!isLoading && (
        <div className="space-y-3">
          {/* Otomatik Google Button */}
          <div id="google-signin-button" className="w-full"></div>

          {/* Loading Indicator for Google SDK */}
          {!isGoogleLoaded && !error && (
            <div className="w-full flex items-center justify-center p-4 bg-gray-50 rounded-lg">
              <div className="animate-pulse flex items-center">
                <div className="w-5 h-5 bg-gray-300 rounded mr-3"></div>
                <span className="text-gray-500">Google Sign-In yükleniyor...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleAuth;
