import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./test/setup.js",
    coverage: {
      reporter: ["text", "json", "html", "lcov"],
      include: ["utils.js"],
      exclude: [
        "node_modules/",
        "test/",
        "*.config.js",
        "build.sh",
        "dev.sh",
        "sw-nav.js",
        "index.js",
        "index.jsx",
        "index.css",
        "index.html",
        "index.template.html",
        "test-runner.js",
      ],
      all: false,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
});
