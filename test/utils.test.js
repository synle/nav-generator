import { describe, it, expect } from "vitest";
import {
  escapeRegex,
  buildSearchRegex,
  parseLinkLine,
  parseSchemaLineType,
  filterFuzzySuggestions,
  sortSchemaLines,
  generateDataUrl,
  SAME_TAB_LINK_SPLIT,
  NEW_TAB_LINK_SPLIT,
  HEADER_SPLIT,
  TITLE_SPLIT,
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
    expect(result).toEqual({
      type: "newTabLink",
      linkText: "Google",
      linkUrl: "https://google.com",
    });
  });

  it("should parse same tab link with |", () => {
    const result = parseLinkLine("Google | google.com");
    expect(result).toEqual({
      type: "sameTabLink",
      linkText: "Google",
      linkUrl: "https://google.com",
    });
  });

  it("should parse javascript link", () => {
    const result = parseLinkLine("Alert | javascript://alert('hello')");
    expect(result).toEqual({
      type: "jsLink",
      linkText: "Alert",
      linkUrl: "javascript://alert('hello')",
    });
  });

  it("should parse data URL link", () => {
    const result = parseLinkLine("Data | data:text/html,<html></html>");
    expect(result).toEqual({
      type: "dataLink",
      linkText: "Data",
      linkUrl: "data:text/html,<html></html>",
    });
  });

  it("should parse plain URL without separator", () => {
    const result = parseLinkLine("google.com");
    expect(result).toEqual({
      type: "newTabLink",
      linkText: "google.com",
      linkUrl: "https://google.com",
    });
  });

  it("should parse URL with http protocol", () => {
    const result = parseLinkLine("Google ||| http://google.com");
    expect(result).toEqual({
      type: "newTabLink",
      linkText: "Google",
      linkUrl: "http://google.com",
    });
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
    expect(result).toEqual({
      type: "newTabLink",
      linkText: "Test",
      linkUrl: "https://example.com?a=b|c=d",
    });
  });
});

describe("parseSchemaLineType", () => {
  it("should parse title line", () => {
    const result = parseSchemaLineType("! My Navigation");
    expect(result).toEqual({
      type: "title",
      value: "My Navigation",
    });
  });

  it("should parse header line", () => {
    const result = parseSchemaLineType("# Main Section");
    expect(result).toEqual({
      type: "header",
      value: "Main Section",
    });
  });

  it("should parse tabs line", () => {
    const result = parseSchemaLineType(">>>tab1|id1>>>tab2|id2");
    expect(result).toEqual({
      type: "tabs",
      value: ">>>tab1|id1>>>tab2|id2",
    });
  });

  it("should parse link line", () => {
    const result = parseSchemaLineType("Google | google.com");
    expect(result.type).toBe("sameTabLink");
    expect(result.linkText).toBe("Google");
  });

  it("should parse empty line", () => {
    const result = parseSchemaLineType("");
    expect(result).toEqual({ type: "empty" });
  });

  it("should parse text line", () => {
    const result = parseSchemaLineType("Some random text");
    expect(result).toEqual({
      type: "text",
      value: "Some random text",
    });
  });
});

describe("filterFuzzySuggestions", () => {
  const suggestions = [
    "google",
    "google finance",
    "facebook",
    "twitter",
    "github",
    "gitlab",
  ];

  it("should filter with fuzzy search", () => {
    const results = filterFuzzySuggestions("/ggl", suggestions);
    expect(results).toContain("google");
    expect(results).not.toContain("facebook");
  });

  it("should filter with normal search", () => {
    const results = filterFuzzySuggestions("google", suggestions);
    expect(results).toContain("google");
    expect(results).toContain("google finance");
    expect(results).not.toContain("facebook");
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
    expect(results).toContain("google");
    expect(results).toContain("google finance");
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
    const lines = result.split("\n").filter((l) => l.trim());

    // Find indices
    const section1Idx = lines.findIndex((l) => l.includes("Section 1"));
    const section2Idx = lines.findIndex((l) => l.includes("Section 2"));

    // Get links in section 1 (after header, before next section)
    const section1Links = lines.slice(section1Idx + 1, section2Idx);

    expect(section1Links[0]).toContain("apple");
    expect(section1Links[1]).toContain("banana");
    expect(section1Links[2]).toContain("zebra");
  });

  it("should preserve title at the top", () => {
    const schema = `! My Navigation

# Section
link | url.com`;

    const result = sortSchemaLines(schema);
    expect(result.startsWith("! My Navigation")).toBe(true);
  });

  it("should handle schema without title", () => {
    const schema = `# Section
link | url.com`;

    const result = sortSchemaLines(schema);
    expect(result).toContain("# Section");
    expect(result).toContain("link | url.com");
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
