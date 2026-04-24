import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Smoke tests for the NavBeforeLoad stale-while-revalidate cache. The real
 * cache logic runs inside the IIFE in index.jsx, so we assert on the source
 * to make sure the key pieces remain wired up: cache key helpers with the
 * right exclusions, stale render before dispatch, write-through on
 * renderSchema.
 */
describe("NavBeforeLoad schema cache", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../index.jsx"), "utf-8");

  it("defines the cache-key helper with data:/newNav/loadNav exclusions", () => {
    expect(source).toMatch(/function\s+_getNavSchemaCacheKey\s*\(\s*\)/);
    // http(s) gate
    expect(source).toMatch(/\/\^https\?:\/i\.test\(location\.href\)/);
    // new-nav + load-nav gates
    expect(source).toMatch(/newNav/);
    expect(source).toMatch(/loadNav/);
  });

  it("exposes read + write helpers that go through safe localStorage wrappers", () => {
    expect(source).toMatch(/function\s+_readNavSchemaCache\s*\(\s*key\s*\)/);
    expect(source).toMatch(/function\s+_writeNavSchemaCache\s*\(\s*key\s*,\s*value\s*\)/);
    // Avoid redundant writes
    expect(source).toMatch(/_getLocalValue\(key\)\s*===\s*value/);
  });

  it("paints from cache before dispatching NavBeforeLoad", () => {
    // Cache-key lookup + conditional _render must precede _dispatchCustomEvent
    const dispatcherBlock = source.match(
      /document\.addEventListener\("DOMContentLoaded"[\s\S]*?_dispatchCustomEvent\(document,\s*"NavBeforeLoad"/,
    );
    expect(dispatcherBlock).not.toBeNull();
    const body = dispatcherBlock[0];
    expect(body).toMatch(/_getNavSchemaCacheKey\(\)/);
    expect(body).toMatch(/_readNavSchemaCache\(cacheKey\)/);
    expect(body).toMatch(/inputSchema\s*=\s*cachedSchema/);
  });

  it("writes through to cache when the consumer calls renderSchema", () => {
    expect(source).toMatch(/renderSchema:\s*\(newSchema\)\s*=>\s*\{[\s\S]*?_writeNavSchemaCache\(cacheKey,\s*newSchema\)/);
  });
});
