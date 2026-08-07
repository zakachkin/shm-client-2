import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './login-support-button.css'
import App from './App.tsx'
import { initReferralCount } from './referral-count'

// Capture beforeinstallprompt before React mounts (event fires very early)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as Window & { __pwaInstallPrompt?: Event }).__pwaInstallPrompt = e
})

initReferralCount()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>,
)
