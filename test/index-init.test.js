import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("index.jsx initialization order", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../index.jsx"), "utf-8");

  it("should declare _appRoot before any _render() call", () => {
    const appRootDeclaration = source.indexOf("let _appRoot");
    const firstRenderCall = source.indexOf("_render()");

    expect(appRootDeclaration).toBeGreaterThan(-1);
    expect(firstRenderCall).toBeGreaterThan(-1);
    expect(appRootDeclaration).toBeLessThan(firstRenderCall);
  });
});
