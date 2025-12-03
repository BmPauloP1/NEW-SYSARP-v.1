import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['@supabase/supabase-js', 'lucide-react'],
          maps: ['leaflet', 'react-leaflet'],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable']
        }
      }
    }
  }
});