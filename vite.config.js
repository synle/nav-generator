import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
  build: {
    outDir: '.',
    emptyOutDir: false,
    lib: {
      entry: 'index.jsx',
      formats: ['iife'],
      name: 'App',
      fileName: () => 'index.js',
    },
    rollupOptions: {
      output: {
        extend: true,
        assetFileNames: 'index.css',
      },
    },
    minify: true,
  },
});
