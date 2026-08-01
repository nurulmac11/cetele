import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
import { inject } from '@vercel/analytics'

// Initialize Vercel Web Analytics
inject()

createApp(App).mount('#app')
