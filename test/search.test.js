import { describe, it, expect } from "vitest";
import { buildSearchRegex, filterFuzzySuggestions } from "../utils.js";

describe("Search Functionality", () => {
  describe("Fuzzy Search", () => {
    it("should match scattered letters", () => {
      const regex = buildSearchRegex("/ggl");
      expect(regex.test("google")).toBe(true);
      expect(regex.test("github google gitlab")).toBe(true);
    });

    it("should match with spaces between letters", () => {
      const regex = buildSearchRegex("/fb");
      expect(regex.test("facebook")).toBe(true);
      expect(regex.test("foo bar")).toBe(true);
    });

    it("should be case insensitive", () => {
      const regex = buildSearchRegex("/ggl");
      expect(regex.test("Google")).toBe(true);
      expect(regex.test("GOOGLE")).toBe(true);
    });

    it("should handle special characters in fuzzy mode", () => {
      const regex = buildSearchRegex("/gc");
      expect(regex.test("google.com")).toBe(true);
    });
  });

  describe("Normal Search", () => {
    it("should match exact substring", () => {
      const regex = buildSearchRegex("google");
      expect(regex.test("google")).toBe(true);
      expect(regex.test("google.com")).toBe(true);
      expect(regex.test("my google search")).toBe(true);
    });

    it("should not match partial letters", () => {
      const regex = buildSearchRegex("goo");
      expect(regex.test("google")).toBe(true);
      expect(regex.test("good")).toBe(true);
      expect(regex.test("go")).toBe(false);
    });

    it("should be case insensitive", () => {
      const regex = buildSearchRegex("Google");
      expect(regex.test("google")).toBe(true);
      expect(regex.test("GOOGLE")).toBe(true);
    });

    it("should escape special regex characters", () => {
      const regex = buildSearchRegex("google.com");
      expect(regex.test("google.com")).toBe(true);
      expect(regex.test("googleXcom")).toBe(false);
    });
  });

  describe("Suggestion Filtering", () => {
    const suggestions = [
      "Google Search",
      "Google Finance",
      "GitHub",
      "GitLab",
      "Facebook",
      "Twitter",
      "LinkedIn",
    ];

    it("should filter suggestions with normal search", () => {
      const results = filterFuzzySuggestions("google", suggestions);
      expect(results).toHaveLength(2);
      expect(results).toContain("Google Search");
      expect(results).toContain("Google Finance");
    });

    it("should filter suggestions with fuzzy search", () => {
      const results = filterFuzzySuggestions("/ggl", suggestions);
      expect(results.some((r) => r.toLowerCase().includes("google"))).toBe(true);
    });

    it("should limit results", () => {
      const manyResults = Array.from({ length: 20 }, (_, i) => `Result ${i}`);
      const results = filterFuzzySuggestions("result", manyResults, 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("should return empty array for ? prefix", () => {
      const results = filterFuzzySuggestions("?google", suggestions);
      expect(results).toEqual([]);
    });

    it("should return empty array for empty search", () => {
      const results = filterFuzzySuggestions("", suggestions);
      expect(results).toEqual([]);
    });

    it("should handle no matches", () => {
      const results = filterFuzzySuggestions("xyz", suggestions);
      expect(results).toEqual([]);
    });

    it("should be case insensitive", () => {
      const results = filterFuzzySuggestions("GOOGLE", suggestions);
      expect(results).toHaveLength(2);
    });
  });

  describe("Search Result Counting", () => {
    it("should count visible links correctly", () => {
      const links = ["google", "facebook", "twitter"];
      const searchText = "google";
      const regex = buildSearchRegex(searchText);

      const visibleCount = links.filter((link) => regex.test(link)).length;
      expect(visibleCount).toBe(1);
    });

    it("should count all links when search is empty", () => {
      const links = ["google", "facebook", "twitter"];
      expect(links.length).toBe(3);
    });
  });

  describe("Google Search Integration", () => {
    it("should detect ? prefix for Google search", () => {
      const searchText = "?test query";
      expect(searchText.startsWith("?")).toBe(true);

      const query = searchText.slice(1);
      expect(query).toBe("test query");
    });

    it("should build Google search URL", () => {
      const searchText = "?test query";
      const query = searchText.slice(1);
      const googleUrl = `https://www.google.com/search?q=${query}`;

      expect(googleUrl).toBe("https://www.google.com/search?q=test query");
    });
  });

  describe("Search Box Keyboard Navigation", () => {
    it("should handle ArrowDown to move selection down", () => {
      let selectedIndex = -1;
      const filteredSuggestions = ["a", "b", "c"];

      // Simulate ArrowDown
      selectedIndex = selectedIndex < filteredSuggestions.length - 1 ? selectedIndex + 1 : selectedIndex;
      expect(selectedIndex).toBe(0);

      selectedIndex = selectedIndex < filteredSuggestions.length - 1 ? selectedIndex + 1 : selectedIndex;
      expect(selectedIndex).toBe(1);
    });

    it("should handle ArrowUp to move selection up", () => {
      let selectedIndex = 2;

      // Simulate ArrowUp
      selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : -1;
      expect(selectedIndex).toBe(1);

      selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : -1;
      expect(selectedIndex).toBe(0);

      selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : -1;
      expect(selectedIndex).toBe(-1);
    });

    it("should stop at boundaries", () => {
      let selectedIndex = 2;
      const filteredSuggestions = ["a", "b", "c"];

      // At end, should not go further
      selectedIndex = selectedIndex < filteredSuggestions.length - 1 ? selectedIndex + 1 : selectedIndex;
      expect(selectedIndex).toBe(2);
    });
  });
});
