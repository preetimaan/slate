import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Recommended by Excalidraw for Vite builds
  define: {
    'process.env.IS_PREACT': JSON.stringify('false'),
  },
})
