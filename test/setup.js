import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { webcrypto } from "node:crypto";

// Polyfill crypto for jsdom
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock localStorage
const localStorageMock = {
  getItem: (key) => localStorageMock[key] || null,
  setItem: (key, value) => {
    localStorageMock[key] = value.toString();
  },
  removeItem: (key) => {
    delete localStorageMock[key];
  },
  clear: () => {
    Object.keys(localStorageMock).forEach((key) => {
      if (key !== "getItem" && key !== "setItem" && key !== "removeItem" && key !== "clear") {
        delete localStorageMock[key];
      }
    });
  },
};

global.localStorage = localStorageMock;

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: () => Promise.resolve(),
    readText: () => Promise.resolve(""),
  },
  writable: true,
});

// Mock IndexedDB for version history tests
const indexedDB = {
  open: () => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: () => ({
        objectStore: () => ({
          add: () => ({ onsuccess: null, onerror: null }),
          getAll: () => ({ onsuccess: null, onerror: null }),
          delete: () => ({ onsuccess: null, onerror: null }),
        }),
      }),
    },
  }),
};

global.indexedDB = indexedDB;
