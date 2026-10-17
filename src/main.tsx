import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ConfirmProvider, ToastProvider } from './components/ui'
import { StoreProvider } from './state/store'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </StoreProvider>
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is best-effort */
    })
  })
}
