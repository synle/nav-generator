import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {}
    }
  },
  build: {
    outDir: '.',
    emptyOutDir: false,
    lib: {
      entry: 'index.jsx',
      formats: ['iife'],
      name: 'App',
      fileName: () => 'index.js'
    },
    rollupOptions: {
      output: {
        extend: true,
        assetFileNames: 'index.css'
      }
    },
    minify: true
  }
});
