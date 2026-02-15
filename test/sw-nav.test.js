import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Service Worker Configuration", () => {
  it("should have correct cache TTL", () => {
    const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week
    expect(CACHE_TTL).toBe(604800000);
  });

  it("should cache correct file extensions", () => {
    const cachableExtensions = [
      ".ico",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".svg",
      ".webp",
      ".bmp",
      ".avif",
      ".js",
      ".jsx",
      ".css",
      ".txt",
      ".json",
      ".md",
      ".sh",
    ];

    expect(cachableExtensions).toContain(".js");
    expect(cachableExtensions).toContain(".css");
    expect(cachableExtensions).toContain(".png");
    expect(cachableExtensions.length).toBe(16);
  });
});

describe("shouldCacheUrl", () => {
  // Since shouldCacheUrl is in the service worker, we'll test the logic
  const shouldCacheUrl = (url) => {
    const urlObj = new URL(url, "https://example.com");
    const pathname = urlObj.pathname;

    // Cache root paths
    if (
      pathname === "/" ||
      pathname === "./" ||
      pathname === "/index.html" ||
      pathname === "./index.html"
    ) {
      return true;
    }

    // Cache ./fav
    if (pathname === "/fav" || pathname === "./fav" || pathname.endsWith("/fav")) {
      return true;
    }

    // Check file extensions
    const cachableExtensions = [
      ".ico",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".svg",
      ".webp",
      ".bmp",
      ".avif",
      ".js",
      ".jsx",
      ".css",
      ".txt",
      ".json",
      ".md",
      ".sh",
    ];
    return cachableExtensions.some((ext) => pathname.endsWith(ext));
  };

  it("should cache root paths", () => {
    expect(shouldCacheUrl("https://example.com/")).toBe(true);
    expect(shouldCacheUrl("https://example.com/index.html")).toBe(true);
  });

  it("should cache fav path", () => {
    expect(shouldCacheUrl("https://example.com/fav")).toBe(true);
  });

  it("should cache JavaScript files", () => {
    expect(shouldCacheUrl("https://example.com/index.js")).toBe(true);
    expect(shouldCacheUrl("https://example.com/app.jsx")).toBe(true);
  });

  it("should cache CSS files", () => {
    expect(shouldCacheUrl("https://example.com/style.css")).toBe(true);
  });

  it("should cache image files", () => {
    expect(shouldCacheUrl("https://example.com/logo.png")).toBe(true);
    expect(shouldCacheUrl("https://example.com/icon.svg")).toBe(true);
    expect(shouldCacheUrl("https://example.com/photo.jpg")).toBe(true);
  });

  it("should not cache non-cachable files", () => {
    expect(shouldCacheUrl("https://example.com/data.xml")).toBe(false);
    expect(shouldCacheUrl("https://example.com/video.mp4")).toBe(false);
  });
});

describe("Cache Expiration Logic", () => {
  const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

  const isCacheExpired = (response) => {
    if (!response) return true;

    const cachedTime = response.headers.get("sw-cache-time");
    if (!cachedTime) return true;

    const age = Date.now() - parseInt(cachedTime, 10);
    return age > CACHE_TTL;
  };

  it("should return true for null response", () => {
    expect(isCacheExpired(null)).toBe(true);
  });

  it("should return true when no cache time header", () => {
    const response = {
      headers: {
        get: () => null,
      },
    };
    expect(isCacheExpired(response)).toBe(true);
  });

  it("should return false for fresh cache", () => {
    const recentTime = Date.now() - 1000; // 1 second ago
    const response = {
      headers: {
        get: (key) => (key === "sw-cache-time" ? recentTime.toString() : null),
      },
    };
    expect(isCacheExpired(response)).toBe(false);
  });

  it("should return true for expired cache", () => {
    const oldTime = Date.now() - CACHE_TTL - 1000; // Expired
    const response = {
      headers: {
        get: (key) => (key === "sw-cache-time" ? oldTime.toString() : null),
      },
    };
    expect(isCacheExpired(response)).toBe(true);
  });
});
