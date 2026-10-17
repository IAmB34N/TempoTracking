import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps the built app relocatable (GitHub Pages sub-paths, file hosting, Capacitor shells).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { target: 'es2022', sourcemap: false },
})
