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
      'geneva-incapacious-romana.ngrok-free.dev',
      '.ngrok-free.dev', // Allow any ngrok-free.dev subdomain
      '.ngrok.io', // Allow any ngrok.io subdomain
    ],
    headers: {
      'Permissions-Policy': 'unload=*',
    },
    proxy: {
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
    },
  },
})

