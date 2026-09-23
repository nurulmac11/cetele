import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries change less often than app code; separate chunks stay cached across deploys
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (
            /[\\/](mathjs|decimal\.js|fraction\.js|complex\.js|typed-function|javascript-natural-sort|seedrandom|escape-latex|tiny-emitter)[\\/]/.test(
              id
            )
          )
            return 'mathjs'
          if (/node_modules[\\/](@vue|vue)[\\/]/.test(id)) return 'vue'
          // Loaded on demand by getSupabase(); naming it keeps it out of the entry chunk's name
          if (/node_modules[\\/]@supabase[\\/]/.test(id)) return 'supabase'
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
})
