
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for running as a local app and deploying to GitHub Pages
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    // base: '/' is the default for most deployments
    base: '/', 
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    server: {
      port: 3000
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: 'index.html'
      }
    }
  }
})
