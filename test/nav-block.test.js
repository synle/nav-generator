import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Smoke tests to ensure the ::: nav_block feature stays wired end-to-end in
 * index.jsx. The real parser is scoped inside an IIFE and not exportable, so
 * we assert on the source directly to catch regressions (delimiter rename,
 * missing render branch, etc.).
 */
describe("nav_block (:::) schema feature", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../index.jsx"), "utf-8");

  it("declares the ::: delimiter constant", () => {
    expect(source).toMatch(/const\s+NAV_BLOCK_SPLIT\s*=\s*":::"/);
  });

  it("opens a nav block when a line starts with :::", () => {
    // Parser opener branch for nav block
    expect(source).toMatch(/link\.trim\(\)\.indexOf\(NAV_BLOCK_SPLIT\)\s*===\s*0/);
    expect(source).toMatch(/blockType\s*=\s*"nav"/);
  });

  it("closes a nav block and emits a nav_block schema entry", () => {
    expect(source).toMatch(/blockType\s*===\s*"nav"\s*&&\s*link\.trim\(\)\s*===\s*NAV_BLOCK_SPLIT/);
    expect(source).toMatch(/type:\s*"nav_block"/);
  });

  it("renders nav_block through a dedicated NavBlock component", () => {
    expect(source).toMatch(/case\s+"nav_block":/);
    expect(source).toMatch(/function\s+NavBlock\s*\(\s*\{[^}]*schema[^}]*\}\s*\)/);
    // NavBlock must recursively render the enclosed schema with its own ref scope
    expect(source).toMatch(/<SchemaRender\s+schema=\{schema\}\s+refContainer=\{refNestedContainer\}/);
  });

  it("ships a ::: sample in the default schema template", () => {
    // Isolate the DEFAULT_SCHEMA_TO_RENDER block (template literal contains
    // escaped backticks, so match up to the closing ` followed by .split).
    const defaultSchemaStart = source.indexOf("const DEFAULT_SCHEMA_TO_RENDER");
    expect(defaultSchemaStart).toBeGreaterThan(-1);
    const defaultSchemaEnd = source.indexOf(".split(", defaultSchemaStart);
    expect(defaultSchemaEnd).toBeGreaterThan(defaultSchemaStart);
    const defaultSchema = source.slice(defaultSchemaStart, defaultSchemaEnd);
    // At least one open + one close nav_block fence
    const fenceCount = (defaultSchema.match(/^\s*:::\s*$/gm) || []).length;
    expect(fenceCount).toBeGreaterThanOrEqual(2);
  });
});
