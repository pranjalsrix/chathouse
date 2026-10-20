import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to backend during development
      '/auth': 'http://localhost:5000',
      '/users': 'http://localhost:5000',
      '/friends': 'http://localhost:5000',
      '/messages': 'http://localhost:5000'
    }
  }
});
