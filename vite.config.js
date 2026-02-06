import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import fs from 'fs';

// Plugin to update service worker with build timestamp
const updateServiceWorker = () => ({
  name: 'update-service-worker',
  closeBundle() {
    const swPath = './sw.js';
    if (fs.existsSync(swPath)) {
      let content = fs.readFileSync(swPath, 'utf-8');
      const timestamp = Date.now();
      content = content.replace(/__BUILD_TIMESTAMP__/g, timestamp);
      fs.writeFileSync(swPath, content);
      console.log(`Service Worker updated with build timestamp: ${timestamp}`);
    }
  },
});

export default defineConfig({
  plugins: [react(), updateServiceWorker()],
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
