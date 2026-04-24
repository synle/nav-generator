import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Smoke tests for the Alt+\ / Cmd+\ "toggle all code blocks" shortcut.
 * The wiring spans three pieces in index.jsx that must stay in sync:
 * the broadcast bus constants near CodeBlockWrapper, the useEffect
 * subscription inside CodeBlockWrapper, and the keydown dispatch in
 * the app-level keydown handler.
 */
describe("code block collapse/expand shortcut", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../index.jsx"), "utf-8");

  it("defines the shared event bus constant and global flag", () => {
    expect(source).toMatch(/const\s+CODE_BLOCK_COLLAPSE_EVENT\s*=\s*"NavGenCodeBlockCollapseAll"/);
    expect(source).toMatch(/let\s+_codeBlocksAllCollapsed\s*=\s*false/);
  });

  it("CodeBlockWrapper inherits the current flag on mount and subscribes to the bus", () => {
    // New wrappers start collapsed if the shortcut has already been pressed
    expect(source).toMatch(/useState\(\s*defaultCollapsed\s*\|\|\s*_codeBlocksAllCollapsed\s*\)/);
    // Listener updates local state from event detail
    expect(source).toMatch(
      /document\.addEventListener\(\s*CODE_BLOCK_COLLAPSE_EVENT\s*,\s*handler\s*\)[\s\S]*?document\.removeEventListener\(\s*CODE_BLOCK_COLLAPSE_EVENT/,
    );
  });

  it("Alt+\\ / Cmd+\\ flips the flag and dispatches the broadcast", () => {
    const keydownBlock = source.match(
      /document\.addEventListener\(\s*\n?\s*"keydown"[\s\S]*?_codeBlocksAllCollapsed\s*=\s*!_codeBlocksAllCollapsed[\s\S]*?dispatchEvent/,
    );
    expect(keydownBlock).not.toBeNull();
    // Modifier check — alt OR meta, NOT ctrl/shift, with the backslash key
    expect(source).toMatch(/key\s*===\s*"\\\\"\s*&&\s*\(e\.altKey\s*\|\|\s*e\.metaKey\)\s*&&\s*!e\.ctrlKey\s*&&\s*!e\.shiftKey/);
    // Dispatches the shared event name
    expect(source).toMatch(/new\s+CustomEvent\(\s*CODE_BLOCK_COLLAPSE_EVENT\s*,\s*\{\s*detail:\s*\{\s*collapsed:\s*_codeBlocksAllCollapsed\s*\}\s*\}\s*\)/);
  });
});
