/** @file Verifies helper contracts with inline snapshots for stable parser and schema output. */
import { describe, it, expect } from "vitest";
import {
  escapeRegex,
  buildSearchRegex,
  parseLinkLine,
  parseSchemaLineType,
  filterFuzzySuggestions,
  sortSchemaLines,
  generateDataUrl,
} from "../utils.js";

describe("escapeRegex", () => {
  it("should escape regex special characters", () => {
    expect(escapeRegex("test.com")).toBe("test\\.com");
    expect(escapeRegex("test*")).toBe("test\\*");
    expect(escapeRegex("test?")).toBe("test\\?");
    expect(escapeRegex("test[abc]")).toBe("test\\[abc\\]");
    expect(escapeRegex("test(abc)")).toBe("test\\(abc\\)");
  });

  it("should handle strings without special characters", () => {
    expect(escapeRegex("test")).toBe("test");
    expect(escapeRegex("hello world")).toBe("hello world");
  });

  it("should handle empty strings", () => {
    expect(escapeRegex("")).toBe("");
  });
});

describe("buildSearchRegex", () => {
  it("should build fuzzy search regex", () => {
    const regex = buildSearchRegex("/ggl");
    expect(regex).toBeInstanceOf(RegExp);
    expect(regex.test("google")).toBe(true);
    expect(regex.test("guggle")).toBe(true);
    expect(regex.test("facebook")).toBe(false);
  });

  it("should build normal search regex", () => {
    const regex = buildSearchRegex("google");
    expect(regex).toBeInstanceOf(RegExp);
    expect(regex.test("google")).toBe(true);
    expect(regex.test("google.com")).toBe(true);
    expect(regex.test("facebook")).toBe(false);
  });

  it("should return null for empty fuzzy search", () => {
    const regex = buildSearchRegex("/");
    expect(regex).toBeNull();
  });

  it("should be case insensitive", () => {
    const regex = buildSearchRegex("Google");
    expect(regex.test("google")).toBe(true);
    expect(regex.test("GOOGLE")).toBe(true);
  });
});

describe("parseLinkLine", () => {
  it("should parse new tab link with |||", () => {
    const result = parseLinkLine("Google ||| google.com");
    expect(result).toMatchInlineSnapshot(`
      {
        "linkText": "Google",
        "linkUrl": "https://google.com",
        "type": "newTabLink",
      }
    `);
  });

  it("should parse same tab link with |", () => {
    const result = parseLinkLine("Google | google.com");
    expect(result).toMatchInlineSnapshot(`
      {
        "linkText": "Google",
        "linkUrl": "https://google.com",
        "type": "sameTabLink",
      }
    `);
  });

  it("should parse javascript link", () => {
    const result = parseLinkLine("Alert | javascript://alert('hello')");
    expect(result).toMatchInlineSnapshot(`
      {
        "linkText": "Alert",
        "linkUrl": "javascript://alert('hello')",
        "type": "jsLink",
      }
    `);
  });

  it("should parse data URL link", () => {
    const result = parseLinkLine("Data | data:text/html,<html></html>");
    expect(result).toMatchInlineSnapshot(`
      {
        "linkText": "Data",
        "linkUrl": "data:text/html,<html></html>",
        "type": "dataLink",
      }
    `);
  });

  it("should parse plain URL without separator", () => {
    const result = parseLinkLine("google.com");
    expect(result).toMatchInlineSnapshot(`
      {
        "linkText": "google.com",
        "linkUrl": "https://google.com",
        "type": "newTabLink",
      }
    `);
  });

  it("should parse URL with http protocol", () => {
    const result = parseLinkLine("Google ||| http://google.com");
    expect(result).toMatchInlineSnapshot(`
      {
        "linkText": "Google",
        "linkUrl": "http://google.com",
        "type": "newTabLink",
      }
    `);
  });

  it("should return null for empty line", () => {
    expect(parseLinkLine("")).toBeNull();
    expect(parseLinkLine("   ")).toBeNull();
  });

  it("should return null for line with separator but no URL", () => {
    expect(parseLinkLine("Google |")).toBeNull();
  });

  it("should handle multiple pipes in URL", () => {
    const result = parseLinkLine("Test ||| https://example.com?a=b|c=d");
    expect(result).toMatchInlineSnapshot(`
      {
        "linkText": "Test",
        "linkUrl": "https://example.com?a=b|c=d",
        "type": "newTabLink",
      }
    `);
  });
});

describe("parseSchemaLineType", () => {
  it("should parse title line", () => {
    const result = parseSchemaLineType("! My Navigation");
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "title",
        "value": "My Navigation",
      }
    `);
  });

  it("should parse header line", () => {
    const result = parseSchemaLineType("# Main Section");
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "header",
        "value": "Main Section",
      }
    `);
  });

  it("should parse tabs line", () => {
    const result = parseSchemaLineType(">>>tab1|id1>>>tab2|id2");
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "tabs",
        "value": ">>>tab1|id1>>>tab2|id2",
      }
    `);
  });

  it("should parse link line", () => {
    const result = parseSchemaLineType("Google | google.com");
    expect(result).toMatchInlineSnapshot(`
      {
        "linkText": "Google",
        "linkUrl": "https://google.com",
        "type": "sameTabLink",
      }
    `);
  });

  it("should parse empty line", () => {
    const result = parseSchemaLineType("");
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "empty",
      }
    `);
  });

  it("should parse text line", () => {
    const result = parseSchemaLineType("Some random text");
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "text",
        "value": "Some random text",
      }
    `);
  });
});

describe("filterFuzzySuggestions", () => {
  const suggestions = ["google", "google finance", "facebook", "twitter", "github", "gitlab"];

  it("should filter with fuzzy search", () => {
    const results = filterFuzzySuggestions("/ggl", suggestions);
    expect(results).toMatchInlineSnapshot(`
      [
        "google",
        "google finance",
      ]
    `);
  });

  it("should filter with normal search", () => {
    const results = filterFuzzySuggestions("google", suggestions);
    expect(results).toMatchInlineSnapshot(`
      [
        "google",
        "google finance",
      ]
    `);
  });

  it("should return empty for ? search", () => {
    const results = filterFuzzySuggestions("?test", suggestions);
    expect(results).toEqual([]);
  });

  it("should return empty for empty search", () => {
    const results = filterFuzzySuggestions("", suggestions);
    expect(results).toEqual([]);
  });

  it("should limit results", () => {
    const manySuggestions = Array.from({ length: 20 }, (_, i) => `item${i}`);
    const results = filterFuzzySuggestions("item", manySuggestions, 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("should be case insensitive", () => {
    const results = filterFuzzySuggestions("GOOGLE", suggestions);
    expect(results).toMatchInlineSnapshot(`
      [
        "google",
        "google finance",
      ]
    `);
  });
});

describe("sortSchemaLines", () => {
  it("should sort links within sections alphabetically", () => {
    const schema = `! My Nav

# Section 1
zebra | zebra.com
apple | apple.com
banana | banana.com

# Section 2
dog | dog.com
cat | cat.com`;

    const result = sortSchemaLines(schema);
    expect(result).toMatchInlineSnapshot(`
      "! My Nav
      # Section 1
      apple | apple.com
      banana | banana.com
      zebra | zebra.com
      # Section 2
      cat | cat.com
      dog | dog.com"
    `);
  });

  it("should preserve title at the top", () => {
    const schema = `! My Navigation

# Section
link | url.com`;

    const result = sortSchemaLines(schema);
    expect(result).toMatchInlineSnapshot(`
      "! My Navigation
      # Section
      link | url.com"
    `);
  });

  it("should handle schema without title", () => {
    const schema = `# Section
link | url.com`;

    const result = sortSchemaLines(schema);
    expect(result).toMatchInlineSnapshot(`
      "# Section
      link | url.com"
    `);
  });

  it("should handle empty schema", () => {
    const result = sortSchemaLines("");
    expect(result).toBe("");
  });
});

describe("generateDataUrl", () => {
  it("should generate valid data URL with schema", () => {
    const schema = "! Test Nav\n\n# Section\nGoogle | google.com";
    const dataUrl = generateDataUrl(schema);

    expect(dataUrl).toContain("data:text/html,");
    expect(dataUrl).toContain("Test%20Nav");
    expect(dataUrl).toContain("Google");
  });

  it("should use default base URL", () => {
    const schema = "! Test";
    const dataUrl = generateDataUrl(schema);

    expect(dataUrl).toContain("synle.github.io");
  });

  it("should accept custom base URL", () => {
    const schema = "! Test";
    const dataUrl = generateDataUrl(schema, "https://custom.com");

    expect(dataUrl).toContain("custom.com");
    expect(dataUrl).not.toContain("synle.github.io");
  });

  it("should properly encode special characters", () => {
    const schema = "! Test <>&";
    const dataUrl = generateDataUrl(schema);

    // Should be properly encoded
    expect(dataUrl).toContain("%3C%3E%26");
  });

  it("should include necessary HTML structure", () => {
    const schema = "! Test";
    const dataUrl = generateDataUrl(schema);
    const decoded = decodeURIComponent(dataUrl.replace("data:text/html,", ""));

    expect(decoded).toContain("<!doctype html>");
    expect(decoded).toContain("<html");
    expect(decoded).toContain("</html>");
    expect(decoded).toContain("<script type='schema'>");
  });
});
