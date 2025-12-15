import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    preview: {
        allowedHosts: [
            'social-x-idsr.onrender.com',
            'haca-social-x.onrender.com',
            'localhost',
            '.ngrok-free.dev',
            '.ngrok.io'
        ]
    },
    server: {
        host: true,
        port: 5173
    }
})
