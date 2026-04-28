import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Smoke tests for short-form tab syntax (`>>>Label` without `|tabId`).
 * The parser lives inside an IIFE and isn't exportable; we assert on the
 * source patterns to catch regressions in the parser fallback and in the
 * App-level auto-migration wiring.
 *
 * Coverage:
 *  - Parser falls back to the label string as the binding key when no
 *    `|tabId` is supplied.
 *  - App applies migrateSchemaToShortForm on initial state and on every
 *    schema replacement (the `onSetSchema` funnel).
 *  - migrateSchemaToShortForm is imported from utils.js (the testable
 *    surface; see test/migrate-schema.test.js for the unit-level coverage).
 *  - The default schema template ships with short-form tabs, not legacy
 *    `|tabId` syntax.
 */
describe("short-form tab syntax", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../index.jsx"), "utf-8");

  it("parser falls back to using the label as the binding key", () => {
    // The fallback is `tabId = (rawId || "").trim() || tabName`. Without
    // this, `>>>Label` (no `|`) would be silently dropped at the
    // `if (tabName && tabId)` gate.
    expect(source).toMatch(/const\s+tabId\s*=\s*\(rawId\s*\|\|\s*""\)\.trim\(\)\s*\|\|\s*tabName/);
    expect(source).toMatch(/if\s*\(tabName\s*&&\s*tabId\)/);
  });

  it("imports migrateSchemaToShortForm from utils.js", () => {
    expect(source).toMatch(/import\s*\{\s*migrateSchemaToShortForm\s*\}\s*from\s*["']\.\/utils\.js["']/);
  });

  it("App seeds initial schema state via the migration", () => {
    // useState lazy initializer keeps the cost out of every render and
    // ensures incoming schemas (default template, data URL, postMessage,
    // NavBeforeLoad cache) get normalized before the parser sees them.
    expect(source).toMatch(/useState\(\(\)\s*=>\s*migrateSchemaToShortForm\(props\.schema\)\)/);
  });

  it("onSetSchema runs every replacement through the migration", () => {
    expect(source).toMatch(/const\s+migrated\s*=\s*migrateSchemaToShortForm\(newSchema\)/);
    // The clear-store guard compares against `migrated`, not the raw input,
    // so a long-form schema that round-trips to the same short-form text as
    // before doesn't unnecessarily wipe the user's tab selection.
    expect(source).toMatch(/if\s*\(\s*prev\s*!==\s*migrated\s*\)/);
  });

  it("default schema template uses short-form tabs", () => {
    const defaultSchemaStart = source.indexOf("const DEFAULT_SCHEMA_TO_RENDER");
    expect(defaultSchemaStart).toBeGreaterThan(-1);
    const defaultSchemaEnd = source.indexOf(".split(", defaultSchemaStart);
    const defaultSchema = source.slice(defaultSchemaStart, defaultSchemaEnd);

    // The advanced tabs demo line should NOT contain `|tabId` segments.
    // Pattern: `>>>Code>>>HTML>>>Nested Nav` — three labels, no pipes.
    const tabDef = defaultSchema.match(/>>>Code[\s\S]*?>>>Nested Nav.*$/m);
    expect(tabDef).not.toBeNull();
    expect(tabDef[0]).not.toMatch(/\|adv/);
  });
});
