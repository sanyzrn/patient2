import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // TECH-02: Path alias for @/* imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Strip noisy logs from production bundles; keep console.warn/error for diagnostics.
  esbuild: {
    drop: ['debugger'],
    // Keep console.debug for intentional diagnostics; only strip log/info noise.
    pure: ['console.log', 'console.info'],
  },
  server: {
    watch: {
      ignored: ['**/code4.zip']
    },
    // Proxy /api.php requests to the Node.js Dev API Server
    proxy: {
      '/api.php': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'data.js'],
      manifest: {
        name: 'آموزش و حمایت از بیمار | نفس زیست فارمد',
        short_name: 'نفس فارمد',
        description: 'پورتال جامع آموزش و حمایت از بیماران شامل کاتالوگ‌های آموزشی، بروشورهای دارویی و ویدئوهای آموزشی.',
        lang: 'fa',
        dir: 'rtl',
        theme_color: '#b61615',
        start_url: '.',
        scope: '.',
        id: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        background_color: '#ffffff',
        categories: ['medical', 'health', 'education'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            // Maskable copy for Android adaptive icons.
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mjs,wasm}'],
        ignoreURLParametersMatching: [/^catalogId/, /^page/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|pdf)(?:\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  base: './',
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdfjs-dist')) return 'pdf';
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('react-pageflip') || id.includes('page-flip')) return 'flipbook';
            if (id.includes('motion') || id.includes('framer')) return 'motion';
            if (id.includes('react-dom') || id.includes('scheduler') || id.includes('/react/')) return 'react-vendor';
          }
        },
      },
    },
  },
})
