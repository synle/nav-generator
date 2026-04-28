import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Smoke tests for tab selection persistence (sessionStorage save / restore /
 * clear). The helpers and wiring live inside the IIFE in index.jsx and
 * aren't exportable, so we assert on source patterns to catch regressions.
 *
 * Coverage:
 *  - Stable storage key constant is declared.
 *  - The four helper functions exist (_getUserTabIdPart, _getTabsScopeKey,
 *    _saveSelectedTab, _findRestoredTab, _clearTabSelectionStore).
 *  - Restore is wired into SchemaRender's auto-select effect.
 *  - Save is wired into the document click handler for `.tab` elements.
 *  - Clear is invoked from App.onSetSchema (the single funnel for
 *    Apply / Restore / Chrome import).
 */
describe("tab selection persistence", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../index.jsx"), "utf-8");

  it("declares the sessionStorage key constant", () => {
    expect(source).toMatch(/const\s+TAB_SELECTION_STORAGE_KEY\s*=\s*"navTabSelection"/);
  });

  it("defines the suffix-extracting regex helper", () => {
    expect(source).toMatch(/function\s+_getUserTabIdPart\s*\(/);
    // Strips `block_<digits>_` prefix; treats the literal "generated" suffix
    // as unstable (no user-supplied id) and skips persistence.
    expect(source).toMatch(/\^block_\\d\+_/);
    expect(source).toMatch(/===\s*"generated"/);
  });

  it("defines the scope-key helper that joins child user-id parts", () => {
    expect(source).toMatch(/function\s+_getTabsScopeKey\s*\(/);
    // Empty / partial user ids must produce an empty scope key so we skip
    // persistence rather than persist under a colliding "" key.
    expect(source).toMatch(/parts\.some\(\(p\)\s*=>\s*!p\)/);
  });

  it("defines save / restore / clear helpers that touch sessionStorage", () => {
    expect(source).toMatch(/function\s+_saveSelectedTab\s*\(/);
    expect(source).toMatch(/function\s+_findRestoredTab\s*\(/);
    expect(source).toMatch(/function\s+_clearTabSelectionStore\s*\(/);
    expect(source).toMatch(/sessionStorage\.setItem\(TAB_SELECTION_STORAGE_KEY/);
    expect(source).toMatch(/sessionStorage\.removeItem\(TAB_SELECTION_STORAGE_KEY\)/);
  });

  it("auto-select effect prefers a restored tab over the first child", () => {
    // useLayoutEffect in SchemaRender uses _findRestoredTab(tabs) || tabChildren[0]
    expect(source).toMatch(/_findRestoredTab\(tabs\)\s*\|\|\s*tabChildren\[0\]/);
  });

  it("click handler persists the selection after toggling visibility", () => {
    // The save call sits in the document-level click handler that scopes to
    // `tab.parentElement`. Asserting on the call expression is enough to
    // catch accidental removal.
    expect(source).toMatch(/_saveSelectedTab\(tabsEl,\s*tab\)/);
  });

  it("App.onSetSchema clears the selection store when the schema changes", () => {
    // Schema replacement (Apply / Restore / Import) routes through the
    // onSetSchema funnel. The clear must guard on `prev !== migrated` so a
    // no-op Apply doesn't disturb the user's selection.
    expect(source).toMatch(/const\s+onSetSchema\s*=\s*\(newSchema\)\s*=>\s*\{[\s\S]*?_clearTabSelectionStore\(\)/);
    expect(source).toMatch(/if\s*\(\s*prev\s*!==\s*migrated\s*\)\s*\{\s*_clearTabSelectionStore\(\)/);
  });
});
