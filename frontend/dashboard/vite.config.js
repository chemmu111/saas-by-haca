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
  },
  preview: {
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    host: true,
    strictPort: true,
  },
})

