import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../public/dashboard',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: true, // Listen on all addresses
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'haca-social-x.onrender.com',
      'geneva-incapacious-romana.ngrok-free.dev',
      '.ngrok-free.dev', // Allow any ngrok-free.dev subdomain
      '.ngrok.io', // Allow any ngrok.io subdomain
      '.onrender.com', // Allow any onrender.com subdomain
    ],
    headers: {
      'Permissions-Policy': 'unload=*',
    },
    // Proxy only in development mode
    proxy: process.env.NODE_ENV !== 'production' ? {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    } : undefined,
  },
})

