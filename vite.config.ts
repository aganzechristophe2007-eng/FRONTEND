import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://cbfsoko-backend.onrender.com/', // Remplace 5000 par le port de ton backend Express si c'est un autre
        changeOrigin: true,
        secure: false,
      },
    },
  },
});