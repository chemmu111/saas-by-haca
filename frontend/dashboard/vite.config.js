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
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.dev',
      '.ngrok.io',
      'geneva-incapacious-romana.ngrok-free.dev'
    ],
    headers: {
      'Permissions-Policy': 'unload=*',
    },
  },
  preview: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
    host: true,
    strictPort: true,
    allowedHosts: [
      'saas-by-haca-testing-only.onrender.com',  // <-- ADD THIS
      'localhost',
      '127.0.0.1'
    ]
  }
})
