import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Enhanced headers for development
    headers: {
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
  },
  // Preview server config for production builds
  preview: {
    port: 4173,
    host: true,
    headers: {
      // Cache headers for static assets
      'Cache-Control': 'public, max-age=31536000, immutable',
      // Security headers
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  },
  define: {
    __DEV_CSP__: JSON.stringify(mode === 'development')
  },
  build: {
    // Enhanced production optimizations
    minify: 'terser',
    sourcemap: mode === 'development',
    // Compress assets
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // 4kb
    // Bundle size optimizations
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          editor: ['@ckeditor/ckeditor5-react', 'ckeditor5']
          // utils: ['lodash', 'date-fns'] // Removed - these packages are not installed
        },
        // Enhanced asset file naming with better cache busting
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/css/[name].[hash].${ext}`
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name)) {
            return `assets/images/[name].[hash].${ext}`
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `assets/fonts/[name].[hash].${ext}`
          }
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(assetInfo.name)) {
            return `assets/media/[name].[hash].${ext}`
          }
          return `assets/misc/[name].[hash].${ext}`
        },
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js'
      }
    },
    // Increase chunk size limit
    chunkSizeWarningLimit: 1000,
    // Enhanced Terser options for production
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'], // Remove specific console methods
        passes: 2 // Multiple compression passes
      }
    }
  },
  // Production optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
}))
