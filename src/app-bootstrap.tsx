import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import './login-support-button.css'
import App from './App.tsx'
import { initReferralCount } from './referral-count'

export function bootstrapApp() {
  initReferralCount()

  const root = document.getElementById('root')
  if (!root) {
    throw new Error('Root element #root not found')
  }

  createRoot(root).render(
    <StrictMode>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </StrictMode>,
  )
}
