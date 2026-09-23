import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
import { inject } from '@vercel/analytics'

// Initialize Vercel Web Analytics
inject()

createApp(App).mount('#app')

// Offline support: cache the app so it opens without a connection (production builds only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err)
    })
  })
}
