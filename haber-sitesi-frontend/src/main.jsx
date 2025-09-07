import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UserProvider } from './contexts/UserContext.jsx'
import { ToastProvider } from './components/Toast'
import { logEnvironment } from './utils/environment'

// Log environment configuration in development
logEnvironment()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </ToastProvider>
  </StrictMode>,
)
