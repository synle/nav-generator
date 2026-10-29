// @vitest-environment jsdom
/** @file Snapshots fixed TV parser output while preserving table, fuzz, and visibility contracts. */
// Real stylesheet invalidation is required; Happy DOM caches stale ancestor-attribute matches.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { compile } from "sass";
import path from "node:path";
import { parseLinkLine, parseSchemaLineType, parseTvLinkLine } from "../utils.js";

/**
 * Builds repeatable hostile-label vectors without introducing a fuzzing dependency.
 * @returns {Object[]} Independent link inputs and their original fields for round-trip assertions.
 */
function tvLinkFuzzCases() {
  const alphabet = Array.from("abc XYZ012'\"<>\\&?#😀中é\u202e");
  let seed = 1729;
  return Array.from({ length: 64 }, () => {
    let label = "start ";
    for (let index = 0; index < 32; index += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      label += alphabet[seed % alphabet.length];
    }
    label += " end";
    const url = `https://example.com/path?q=${encodeURIComponent(label)}&literal=|tv|tail|||end`;
    return { line: `  ${label} |tv| ${url}  `, label, url };
  });
}

describe("dedicated TV schema grammar", () => {
  it.each(["?tv", "  ?tv  ", "\t?tv\r"])(
    "recognizes only the exact trimmed directive (%s)",
    (line) => {
      expect(parseSchemaLineType(line)).toMatchInlineSnapshot(`
        {
          "type": "tv_mode",
        }
      `);
    },
  );

  it.each([
    "?TV",
    "?touch",
    "?tv=1",
    "?tv extra",
    "prefix?tv",
    "?tv?",
    "// ?tv",
    "?tv => explanation",
  ])("does not accept a partial or annotated directive (%s)", (line) => {
    expect(parseSchemaLineType(line)).toEqual({ type: "text", value: line });
  });

  it("does not mistake a URL query parameter for a schema directive", () => {
    expect(parseSchemaLineType("https://example.com/?tv")).toMatchInlineSnapshot(`
      {
        "linkText": "https://example.com/?tv",
        "linkUrl": "https://example.com/?tv",
        "type": "newTabLink",
      }
    `);
  });

  it.each([
    ["News |tv| example.com", { linkText: "News", linkUrl: "example.com" }],
    [" |tv| /relative", { linkText: "", linkUrl: "/relative" }],
    [" News |tv| ", { linkText: "News", linkUrl: "" }],
    [
      "股票 😀 |tv| https://example.com/?q=1|tv|two|||three",
      { linkText: "股票 😀", linkUrl: "https://example.com/?q=1|tv|two|||three" },
    ],
  ])("extracts raw TV fields without truncating the URL (%s)", (line, expected) => {
    expect(parseTvLinkLine(line)).toEqual(expected);
  });

  it.each([
    "",
    "regular text",
    "News | example.com/?q=|tv|",
    "News ||| example.com/?q=|tv|",
    "News |TV| example.com",
    "News | tv | example.com",
    "left | label |tv| example.com",
  ])("does not reinterpret a later or non-exact delimiter (%s)", (line) => {
    expect(parseTvLinkLine(line)).toBeNull();
  });

  it.each([
    [
      "News |tv| example.com",
      { type: "sameTabLink", isTvLink: true, linkText: "News", linkUrl: "https://example.com" },
    ],
    [
      "News |tv| http://example.com",
      { type: "sameTabLink", isTvLink: true, linkText: "News", linkUrl: "http://example.com" },
    ],
    [
      "News |tv| https://example.com/?q=one|||two",
      {
        type: "sameTabLink",
        isTvLink: true,
        linkText: "News",
        linkUrl: "https://example.com/?q=one|||two",
      },
    ],
    [
      "Run |tv| javascript://alert('TV')",
      { type: "jsLink", isTvLink: true, linkText: "Run", linkUrl: "javascript://alert('TV')" },
    ],
    [
      "Data |tv| data:text/html,<p>TV</p>",
      { type: "dataLink", isTvLink: true, linkText: "Data", linkUrl: "data:text/html,<p>TV</p>" },
    ],
    [
      " |tv| example.com",
      { type: "sameTabLink", isTvLink: true, linkText: "", linkUrl: "https://example.com" },
    ],
  ])("preserves same-tab semantics and adds TV metadata (%s)", (line, expected) => {
    expect(parseLinkLine(line)).toEqual(expected);
    expect(parseSchemaLineType(line)).toEqual(expected);
  });

  it.each(["News |tv|", "|tv|   "])("rejects a TV link with no URL (%s)", (line) => {
    expect(parseLinkLine(line)).toBeNull();
  });

  it("does not change ordinary link behavior when a URL contains the TV delimiter", () => {
    expect(parseLinkLine("Normal | https://example.com/?literal=|tv|")).toMatchInlineSnapshot(`
      {
        "linkText": "Normal",
        "linkUrl": "https://example.com/?literal=|tv|",
        "type": "sameTabLink",
      }
    `);
    expect(parseLinkLine("New ||| https://example.com/?literal=|tv|")).toMatchInlineSnapshot(`
      {
        "linkText": "New",
        "linkUrl": "https://example.com/?literal=|tv|",
        "type": "newTabLink",
      }
    `);
  });

  it.each(tvLinkFuzzCases())(
    "round-trips hostile label bytes without losing URL delimiters (%#)",
    ({ line, label, url }) => {
      expect(parseTvLinkLine(line)).toEqual({ linkText: label, linkUrl: url });
      expect(parseLinkLine(line)).toEqual({
        type: "sameTabLink",
        isTvLink: true,
        linkText: label,
        linkUrl: url,
      });
    },
  );
});

let compiledStyles;
let style;
let fixture;

afterEach(() => {
  style?.remove();
  fixture?.remove();
  document.documentElement.removeAttribute("data-tv-mode");
});

/**
 * Installs the compiled production stylesheet and representative schema DOM.
 * @param {Object} options - Independent schema opt-in and display-preference states.
 * @param {boolean} options.dedicated - Whether the parser marked the schema for a dedicated view.
 * @param {boolean} options.enabled - Whether the saved/URL/keyboard display preference is on.
 * @returns {void} Adds only this test's removable style and navigation fixture.
 */
function mountStyleFixture({ dedicated, enabled }) {
  style = document.createElement("style");
  style.textContent = compiledStyles;
  document.head.appendChild(style);
  fixture = document.createElement("div");
  fixture.id = "fav";
  fixture.toggleAttribute("data-tv-schema", dedicated);
  fixture.innerHTML = `
    <div class="title">Navigation <div class="action-bar"><button>Edit</button></div></div>
    <div class="header">Stock</div>
    <a class="link" role="button" href="https://example.com/regular">Regular link</a>
    <a class="link" role="button" data-tv-link="true" href="https://example.com/tv">TV link</a>
    <tabs class="tabs"><tab>Tab label</tab></tabs>
    <div class="block codeBlock">Code content</div>
    <div class="block htmlBlock">HTML content</div>
    <div class="block navBlock"><a class="link" data-tv-link="true" href="https://example.com/nested">Nested TV link</a></div>`;
  document.body.appendChild(fixture);
  document.documentElement.toggleAttribute("data-tv-mode", enabled);
}

describe("compiled TV stylesheet integration", () => {
  beforeAll(() => {
    compiledStyles = compile(path.resolve(__dirname, "../index.scss")).css;
  });
  it("keeps regular content but hides TV links when display mode is off", () => {
    mountStyleFixture({ dedicated: true, enabled: false });
    expect(fixture.querySelector(".title")).toBeVisible();
    expect(fixture.querySelector(".header")).toBeVisible();
    expect(fixture.querySelector(".link:not([data-tv-link])")).toBeVisible();
    expect(fixture.querySelector("[data-tv-link]")).not.toBeVisible();
    expect(fixture.querySelector(".navBlock [data-tv-link]")).not.toBeVisible();
    expect(fixture.querySelector(".htmlBlock")).toBeVisible();
  });

  it("hides TV links in normal mode even when the schema has no marker", () => {
    mountStyleFixture({ dedicated: false, enabled: false });
    expect(fixture.querySelector(".link:not([data-tv-link])")).toBeVisible();
    expect(fixture.querySelector("[data-tv-link]")).not.toBeVisible();
  });

  it("only enlarges content when display mode is on without a schema marker", () => {
    mountStyleFixture({ dedicated: false, enabled: true });
    expect(fixture.querySelector(".header")).toBeVisible();
    expect(fixture.querySelector(".link:not([data-tv-link])")).toBeVisible();
    expect(fixture.querySelector("[data-tv-link]")).toBeVisible();
    expect(fixture.querySelector(".htmlBlock")).toBeVisible();
    expect(fixture.querySelector(".action-bar")).not.toBeVisible();
  });

  it("keeps only the title and top-level TV links when both states are enabled", () => {
    mountStyleFixture({ dedicated: true, enabled: true });
    expect(fixture.querySelector(".title")).toBeVisible();
    expect(fixture.querySelector(":scope > [data-tv-link]")).toBeVisible();
    expect(fixture.querySelector(".header")).not.toBeVisible();
    expect(fixture.querySelector(".link:not([data-tv-link])")).not.toBeVisible();
    expect(fixture.querySelector(".tabs")).not.toBeVisible();
    expect(fixture.querySelector(".codeBlock")).not.toBeVisible();
    expect(fixture.querySelector(".htmlBlock")).not.toBeVisible();
    expect(fixture.querySelector(".navBlock [data-tv-link]")).not.toBeVisible();
    expect(fixture.querySelector(".action-bar")).not.toBeVisible();
  });

  it("restores ordinary links and sections immediately when toggled off", () => {
    mountStyleFixture({ dedicated: true, enabled: true });
    expect(fixture.querySelector(".header")).not.toBeVisible();
    document.documentElement.removeAttribute("data-tv-mode");
    expect(fixture.querySelector(".header")).toBeVisible();
    expect(fixture.querySelector(".link:not([data-tv-link])")).toBeVisible();
    expect(fixture.querySelector(".htmlBlock")).toBeVisible();
  });

  it("does not expose regular content if the dedicated schema contains no TV links", () => {
    mountStyleFixture({ dedicated: true, enabled: true });
    fixture.querySelector(":scope > [data-tv-link]").remove();
    expect(fixture.querySelector(".title")).toBeVisible();
    expect(fixture.querySelector(".link:not([data-tv-link])")).not.toBeVisible();
    expect(fixture.querySelector(".header")).not.toBeVisible();
  });

  it("preserves the title while search hides other non-link elements", () => {
    mountStyleFixture({ dedicated: true, enabled: true });
    fixture.querySelector(".title").classList.add("hidden");
    expect(fixture.querySelector(".title")).toBeVisible();
    expect(fixture.querySelector(".header")).not.toBeVisible();
  });
});
