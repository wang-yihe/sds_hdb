import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

// Create __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Export config
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` (e.g., .env, .env.dev)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: env.VITE_SUBURL,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
