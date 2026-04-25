import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Kasir Warung',
        short_name: 'Kasir',
        description: 'Aplikasi kasir digital offline-first untuk warung',
        theme_color: '#1A6B45',
        background_color: '#F5F3EE',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'favicon.ico', sizes: '64x64', type: 'image/x-icon' }
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache' },
          },
        ],
      },
    }),
  ],
});
