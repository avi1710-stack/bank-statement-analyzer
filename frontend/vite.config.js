import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During development, send /api requests to the Express backend.
    // This avoids CORS setup.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
