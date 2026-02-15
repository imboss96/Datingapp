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
      plugins: [react()],
      // No Gemini env vars defined (Gemini removed)
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
