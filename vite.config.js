import react from "@vitejs/plugin-react";
import fs from "fs";
import { defineConfig } from "vite";

// Plugin to update service worker with build timestamp
const updateServiceWorker = () => ({
  name: "update-service-worker",
  closeBundle() {
    const swPath = "./sw-nav.js";
    if (fs.existsSync(swPath)) {
      let content = fs.readFileSync(swPath, "utf-8");
      const timestamp = Date.now();
      // Always restamp the CACHE_VERSION line regardless of its current value
      // (a previously stamped timestamp or a fresh __BUILD_TIMESTAMP__ placeholder)
      content = content.replace(
        /const CACHE_VERSION = "[^"]*";/,
        `const CACHE_VERSION = "${timestamp}";`,
      );
      fs.writeFileSync(swPath, content);
      console.log(`Service Worker updated with build timestamp: ${timestamp}`);
    }
  },
});

export default defineConfig({
  plugins: [react(), updateServiceWorker()],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
  build: {
    outDir: ".",
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: "index.jsx",
      formats: ["iife"],
      name: "App",
      fileName: () => "index.js",
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
    minify: true,
  },
});
