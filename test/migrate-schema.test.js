/**
 * @file Tests for migrateSchemaToShortForm — rewrites long-form
 * `>>>Label|tabId` tab definitions and matching delimiter blocks
 * (`:::tabId`, ` ```tabId `, `---tabId`) into short-form.
 */

import { describe, it, expect } from "vitest";
import { migrateSchemaToShortForm } from "../utils.js";

describe("migrateSchemaToShortForm", () => {
  it("returns input unchanged for empty or non-string", () => {
    expect(migrateSchemaToShortForm("")).toBe("");
    expect(migrateSchemaToShortForm(null)).toBe(null);
    expect(migrateSchemaToShortForm(undefined)).toBe(undefined);
  });

  it("leaves a schema with no tabs unchanged", () => {
    const schema = `# Section
google | google.com
hacker news | news.ycombinator.com`;
    expect(migrateSchemaToShortForm(schema)).toBe(schema);
  });

  it("rewrites a flat long-form tab definition + nav block", () => {
    const input = [
      ">>>URL Porter|tabUrlPorter>>>RVX|tabRvx",
      ":::tabUrlPorter",
      "google | google.com",
      ":::",
      ":::tabRvx",
      "hacker news | news.ycombinator.com",
      ":::",
    ].join("\n");
    const expected = [
      ">>>URL Porter>>>RVX",
      ":::URL Porter",
      "google | google.com",
      ":::",
      ":::RVX",
      "hacker news | news.ycombinator.com",
      ":::",
    ].join("\n");
    expect(migrateSchemaToShortForm(input)).toBe(expected);
  });

  it("rewrites code-block fence ids that match a tab definition", () => {
    const input = [
      ">>>Download|tabPortDown>>>MetaData|tabPortMeta",
      "```tabPortDown",
      "echo hello",
      "```",
      "```tabPortMeta",
      '{ "k": 1 }',
      "```",
    ].join("\n");
    const expected = [
      ">>>Download>>>MetaData",
      "```Download",
      "echo hello",
      "```",
      "```MetaData",
      '{ "k": 1 }',
      "```",
    ].join("\n");
    expect(migrateSchemaToShortForm(input)).toBe(expected);
  });

  it("preserves code-block language hints that don't match a tab id", () => {
    // No `>>>` definitions, so "bash" is just a language hint and must stay.
    const input = ["```bash", "echo hello", "```"].join("\n");
    expect(migrateSchemaToShortForm(input)).toBe(input);
  });

  it("rewrites html-block fence ids that match a tab definition", () => {
    const input = [
      ">>>HTML|advHtml",
      "---advHtml",
      "<b>html</b>",
      "---",
    ].join("\n");
    const expected = [
      ">>>HTML",
      "---HTML",
      "<b>html</b>",
      "---",
    ].join("\n");
    expect(migrateSchemaToShortForm(input)).toBe(expected);
  });

  it("does not touch user content inside code or html blocks", () => {
    // The string ">>>Code|fake" inside a code body must not be rewritten.
    const input = [
      ">>>Code|advCode",
      "```advCode",
      ">>>Code|fake",
      ":::fake",
      "---fake",
      "```",
    ].join("\n");
    const expected = [
      ">>>Code",
      "```Code",
      ">>>Code|fake",
      ":::fake",
      "---fake",
      "```",
    ].join("\n");
    expect(migrateSchemaToShortForm(input)).toBe(expected);
  });

  it("recurses into nested nav-block bodies as a separate scope", () => {
    // Outer scope: tabUrlPorter, tabRvx
    // Inner scope of tabUrlPorter: tabPortDown, tabPortMeta
    const input = [
      ">>>URL Porter|tabUrlPorter>>>RVX|tabRvx",
      ":::tabUrlPorter",
      ">>>Download|tabPortDown>>>MetaData|tabPortMeta",
      "```tabPortDown",
      "code",
      "```",
      "```tabPortMeta",
      "meta",
      "```",
      ":::",
      ":::tabRvx",
      "rvx content",
      ":::",
    ].join("\n");
    const expected = [
      ">>>URL Porter>>>RVX",
      ":::URL Porter",
      ">>>Download>>>MetaData",
      "```Download",
      "code",
      "```",
      "```MetaData",
      "meta",
      "```",
      ":::",
      ":::RVX",
      "rvx content",
      ":::",
    ].join("\n");
    expect(migrateSchemaToShortForm(input)).toBe(expected);
  });

  it("inner-scope rewrite is independent of outer-scope ids", () => {
    // Inner uses an id name that's also the OUTER label — must still
    // rewrite from the inner `>>>` map, not bleed across scopes.
    const input = [
      ">>>A|x>>>B|y",
      ":::x",
      ">>>A|inner",
      "```inner",
      "body",
      "```",
      ":::",
    ].join("\n");
    const expected = [
      ">>>A>>>B",
      ":::A",
      ">>>A",
      "```A",
      "body",
      "```",
      ":::",
    ].join("\n");
    expect(migrateSchemaToShortForm(input)).toBe(expected);
  });

  it("handles mixed segments where only some have explicit ids", () => {
    // First segment is short-form already; second is long-form.
    const input = [">>>Already|already>>>Long|tabLong", ":::tabLong", "x", ":::"].join("\n");
    const expected = [">>>Already>>>Long", ":::Long", "x", ":::"].join("\n");
    expect(migrateSchemaToShortForm(input)).toBe(expected);
  });

  it("is idempotent — running twice equals running once", () => {
    const input = [
      ">>>URL Porter|tabUrlPorter>>>RVX|tabRvx",
      ":::tabUrlPorter",
      "x",
      ":::",
    ].join("\n");
    const once = migrateSchemaToShortForm(input);
    const twice = migrateSchemaToShortForm(once);
    expect(twice).toBe(once);
  });

  it("preserves leading whitespace on `>>>` lines", () => {
    const input = "    >>>Foo|f>>>Bar|b";
    const expected = "    >>>Foo>>>Bar";
    expect(migrateSchemaToShortForm(input)).toBe(expected);
  });

  it("leaves orphan delimiter ids alone (no matching `>>>` definition)", () => {
    // No `>>>` line refers to "orphan", so `:::orphan` should pass through.
    const input = [":::orphan", "content", ":::"].join("\n");
    expect(migrateSchemaToShortForm(input)).toBe(input);
  });
});
