import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          spreadsheet: ['xlsx'],
          vendor: ['react', 'react-dom', 'dexie', 'dexie-react-hooks', 'zustand']
        }
      }
    }
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,webmanifest,csv,xlsx}'],
      },
      manifest: {
        name: 'Ridzal POS',
        short_name: 'Ridzal POS',
        description: 'Aplikasi kasir digital offline-first untuk toko ritel',
        theme_color: '#8B5E34',
        background_color: '#F7F0E6',
        display: 'standalone',
        lang: 'id'
      }
    })
  ]
})
