import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // No base URL - routes work from root
  // In production, the app will be served from /dashboard/ by the backend
  base: '/',
  build: {
    outDir: '../public/dashboard',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    headers: {
      'Permissions-Policy': 'unload=*',
    },
  },
})

