import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
      build: {
        // Optimize build output
        target: 'esnext',
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        },
        // Code splitting for better caching
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor': [
                'react',
                'react-dom',
                'react-router-dom'
              ],
              'ui-libs': [
                'bootstrap',
                'jquery',
                'swiper',
                'isotope-layout'
              ]
            }
          }
        },
        // Increase chunk size limits for vendors
        chunkSizeWarningLimit: 1000
      },
      plugins: [react()],
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Optimize dependencies for faster cold starts
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'react-router-dom',
          'bootstrap',
          'jquery',
          'swiper',
          'isotope-layout'
        ]
      }
    };
});

