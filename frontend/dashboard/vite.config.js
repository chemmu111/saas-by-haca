import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      'react-router-dom': new URL('./node_modules/react-router-dom', import.meta.url).pathname,
      'lucide-react': new URL('./node_modules/lucide-react', import.meta.url).pathname,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'haca-social-x.onrender.com',
      '.onrender.com',
      '.ngrok-free.dev',
      '.ngrok.io',
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: true,
    port: 3000,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'haca-social-x.onrender.com',
      '.onrender.com',
      '.ngrok-free.dev',
      '.ngrok.io',
    ],
  },
  publicDir: 'public',
})
