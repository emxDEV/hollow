import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        mobile: './mobile.html'
      },
      output: {
        manualChunks(id) {
          // Isolate dateUtils completely to prevent circular vendor chunk dependency
          if (id.includes('src/utils/dateUtils.js')) {
            return 'dateUtils';
          }
          // Put third-party libraries in a separate vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 5173
  }
})
