import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3001,
        host: 'localhost',
        strictPort: true,
        // Proxy API and websocket requests to backend during dev
        proxy: {
          '/api': {
            target: env.VITE_API_URL ? env.VITE_API_URL.replace(/\/api$/i, '') : 'http://localhost:5000',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api/, '/api')
          },
          // If your frontend uses a websocket path like /ws, forward it
          '/ws': {
            target: env.VITE_WS_URL ? env.VITE_WS_URL.replace(/\/ws$/i, '') : 'ws://localhost:5000',
            ws: true,
            changeOrigin: true,
            secure: false
          }
        }
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          injectRegister: 'auto',
          devOptions: {
            enabled: mode === 'development',
          },
          manifest: {
            name: 'lunesa - Dating Platform',
            short_name: 'lunesa',
            description: 'A high-end dating PWA with AI-powered swiping, chat moderation, and premium features.',
            theme_color: '#000000',
            background_color: '#000000',
            display: 'fullscreen',
            display_override: ['fullscreen', 'standalone', 'minimal-ui'],
            orientation: 'portrait-primary',
            scope: '/',
            start_url: '/#/',
            categories: ['social'],
            icons: [
              {
                src: '/images/logo/logo.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/images/logo/logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/images/logo/logo.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
              },
              {
                src: '/images/logo/logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ],
            screenshots: [
              {
                src: '/images/screenshot-narrow.png',
                sizes: '540x720',
                form_factor: 'narrow',
                type: 'image/png'
              },
              {
                src: '/images/screenshot-wide.png',
                sizes: '1280x720',
                form_factor: 'wide',
                type: 'image/png'
              }
            ],
            shortcuts: [
              {
                name: 'Open Chats',
                short_name: 'Chats',
                description: 'View your conversations',
                url: '/#/chats',
                icons: [
                  {
                    src: '/images/logo/logo.png',
                    sizes: '96x96',
                    type: 'image/png'
                  }
                ]
              },
              {
                name: 'View Matches',
                short_name: 'Matches',
                description: 'Browse your matches',
                url: '/#/matches',
                icons: [
                  {
                    src: '/images/logo/logo.png',
                    sizes: '96x96',
                    type: 'image/png'
                  }
                ]
              },
              {
                name: 'Discover Singles',
                short_name: 'Discover',
                description: 'Swipe and discover people',
                url: '/#/',
                icons: [
                  {
                    src: '/images/logo/logo.png',
                    sizes: '96x96',
                    type: 'image/png'
                  }
                ]
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf,eot}'],
            globIgnores: ['**/node_modules/**/*', '.git/**/*'],
            cleanupOutdatedCaches: true,
            navigateFallback: 'index.html',
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/api\./i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  networkTimeoutSeconds: 10,
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 5 * 60 // 5 minutes
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'fonts-cache',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  }
                }
              },
              {
                urlPattern: /\.(?:png|gif|jpg|jpeg|svg|webp)$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'image-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  }
                }
              }
            ]
          }
        })
      ],
      // No Gemini env vars defined (Gemini removed)
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
