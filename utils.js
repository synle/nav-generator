// Schema parsing constants
export const SAME_TAB_LINK_SPLIT = "|";
export const NEW_TAB_LINK_SPLIT = "|||";
export const HEADER_SPLIT = "#";
export const TITLE_SPLIT = "!";
export const CODE_BLOCK_SPLIT = "```";
export const HTML_BLOCK_SPLIT = "---";
export const TAB_SPLIT = ">>>";
export const TAB_TITLE_SPLIT = "|";
export const FAV_ICON_SPLIT = "@";

/**
 * Escape regex special characters
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build search regex from search text
 */
export function buildSearchRegex(searchText) {
  const isFuzzy = searchText.startsWith("/");

  if (isFuzzy) {
    const cleaned = searchText
      .slice(1)
      .replace(/[\W_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return null;

    const pattern = cleaned
      .split("")
      .map((c) => escapeRegex(c))
      .join(".*?");

    return new RegExp(pattern, "i");
  } else {
    return new RegExp(escapeRegex(searchText), "i");
  }
}

/**
 * Parse a link line from schema
 */
export function parseLinkLine(line) {
  const trimmedLine = line.trim();
  if (!trimmedLine) return null;

  // Check for new tab link (|||)
  if (trimmedLine.includes(NEW_TAB_LINK_SPLIT)) {
    const [linkText, ...rest] = trimmedLine.split(NEW_TAB_LINK_SPLIT);
    const linkUrl = rest.join(NEW_TAB_LINK_SPLIT).trim();

    if (!linkUrl) return null;

    return {
      type: "newTabLink",
      linkText: linkText.trim(),
      linkUrl: linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`,
    };
  }

  // Check for same tab link (|)
  if (trimmedLine.includes(SAME_TAB_LINK_SPLIT)) {
    const [linkText, ...rest] = trimmedLine.split(SAME_TAB_LINK_SPLIT);
    const linkUrl = rest.join(SAME_TAB_LINK_SPLIT).trim();

    if (!linkUrl) return null;

    // Check if it's a javascript link
    if (linkUrl.startsWith("javascript:")) {
      return {
        type: "jsLink",
        linkText: linkText.trim(),
        linkUrl: linkUrl,
      };
    }

    // Check if it's a data URL
    if (linkUrl.startsWith("data:")) {
      return {
        type: "dataLink",
        linkText: linkText.trim(),
        linkUrl: linkUrl,
      };
    }

    return {
      type: "sameTabLink",
      linkText: linkText.trim(),
      linkUrl: linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`,
    };
  }

  // Plain URL (no pipe separator)
  if (trimmedLine.match(/^https?:\/\//) || trimmedLine.includes(".")) {
    const url = trimmedLine.startsWith("http") ? trimmedLine : `https://${trimmedLine}`;
    return {
      type: "newTabLink",
      linkText: trimmedLine,
      linkUrl: url,
    };
  }

  return null;
}

/**
 * Parse schema line type
 */
export function parseSchemaLineType(line) {
  const trimmedLine = line.trim();

  if (!trimmedLine) return { type: "empty" };

  // Title
  if (trimmedLine.startsWith(TITLE_SPLIT + " ")) {
    return {
      type: "title",
      value: trimmedLine.substring(2).trim(),
    };
  }

  // Header
  if (trimmedLine.startsWith(HEADER_SPLIT + " ")) {
    return {
      type: "header",
      value: trimmedLine.substring(2).trim(),
    };
  }

  // Tab definition
  if (trimmedLine.startsWith(TAB_SPLIT)) {
    return {
      type: "tabs",
      value: trimmedLine,
    };
  }

  // Link (with | or |||)
  const linkResult = parseLinkLine(trimmedLine);
  if (linkResult) {
    return {
      type: "link",
      ...linkResult,
    };
  }

  return { type: "text", value: trimmedLine };
}

/**
 * Filter fuzzy search suggestions
 */
export function filterFuzzySuggestions(searchText, suggestions, limit = 10) {
  if (!searchText || searchText.startsWith("?")) {
    return [];
  }

  let filtered;

  // Fuzzy search
  if (searchText.startsWith("/")) {
    const cleanedSearchText = searchText
      .slice(1)
      .replace(/[\W_]+/gi, " ")
      .replace(/[ ][ ]+/, " ")
      .trim();

    if (!cleanedSearchText) {
      return [];
    }

    const fuzzyPattern = new RegExp("[ ]*" + cleanedSearchText.split("").join("[a-z0-9 -_]*"), "i");

    filtered = suggestions.filter((s) => fuzzyPattern.test(s)).slice(0, limit);
  } else {
    // Normal substring search
    const searchLower = searchText.toLowerCase();
    filtered = suggestions.filter((s) => s.toLowerCase().includes(searchLower)).slice(0, limit);
  }

  return filtered;
}

/**
 * Sort schema by section name and title
 */
export function sortSchemaLines(schema) {
  const rows = schema.split("\n");
  let sections = [];
  let sectionIdx = 0;

  for (const row of rows) {
    const trimmedRow = row.trim();

    if (trimmedRow.startsWith(TITLE_SPLIT)) {
      sections.push({ type: "title", content: row });
      continue;
    }

    if (trimmedRow.startsWith(HEADER_SPLIT)) {
      sectionIdx++;
      sections.push({ type: "header", content: row, idx: sectionIdx });
      continue;
    }

    if (!sections[sections.length - 1]) {
      sections.push({ type: "other", content: row, idx: sectionIdx });
    } else {
      const lastSection = sections[sections.length - 1];
      if (lastSection.type === "other") {
        lastSection.content += "\n" + row;
      } else {
        sections.push({ type: "other", content: row, idx: sectionIdx });
      }
    }
  }

  // Group sections and sort content within each section
  const titleSections = sections.filter((s) => s.type === "title");
  const groupedSections = [];

  for (let i = 0; i <= sectionIdx; i++) {
    const header = sections.find((s) => s.type === "header" && s.idx === i);
    const content = sections
      .filter((s) => s.type === "other" && s.idx === i)
      .map((s) => s.content)
      .join("\n")
      .split("\n")
      .filter((line) => line.trim())
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .join("\n");

    if (header) {
      groupedSections.push(header.content);
      if (content) groupedSections.push(content);
    }
  }

  return [...titleSections.map((s) => s.content), ...groupedSections].join("\n");
}

/**
 * Normalize a schema by rewriting long-form tab definitions
 * (`>>>Label|tabId`) and their matching delimiter blocks
 * (`:::tabId`, ` ```tabId `, `---tabId`) into short-form
 * (`>>>Label`, `:::Label`, ` ```Label `, `---Label`).
 *
 * The parser accepts both forms, but short-form is the canonical
 * authoring style going forward — this function is run on the
 * schema when it first enters App state and again on every save
 * so authored schemas converge to short-form without any manual
 * editing required.
 *
 * Behavior:
 *  - Per parse scope (top-level + each `:::` nav-block body),
 *    builds a map of `tabId → label` from `>>>` lines in that scope.
 *  - Rewrites delimiter lines whose suffix matches a known id;
 *    leaves unrelated suffixes alone (e.g. ` ```bash ` stays a
 *    syntax-highlight hint when "bash" isn't a tab id).
 *  - Code-block bodies and HTML-block bodies are passed through
 *    untouched (they're user content, not schema).
 *  - Nav-block bodies recurse — each `:::` block has its own scope,
 *    matching the existing NavBlock-recursion semantics.
 *  - Idempotent: a schema already in short-form is returned unchanged.
 *
 * @param {string} schema - Raw schema text.
 * @returns {string} The normalized schema text.
 */
export function migrateSchemaToShortForm(schema) {
  if (!schema || typeof schema !== "string") return schema;

  const lines = schema.split("\n");

  // First pass: collect id→label map from `>>>` lines at this scope only.
  // Skip lines inside code, html, and nav blocks (those have their own
  // scope or are user content).
  const idToLabel = {};
  let blockKind = null;
  for (const line of lines) {
    const t = line.trim();

    if (blockKind === "code") {
      if (t === CODE_BLOCK_SPLIT) blockKind = null;
      continue;
    }
    if (blockKind === "html") {
      if (t === HTML_BLOCK_SPLIT) blockKind = null;
      continue;
    }
    if (blockKind === "nav") {
      if (t === ":::") blockKind = null;
      continue;
    }

    if (t.startsWith(CODE_BLOCK_SPLIT)) {
      blockKind = "code";
      continue;
    }
    if (t.startsWith(HTML_BLOCK_SPLIT)) {
      blockKind = "html";
      continue;
    }
    if (t.startsWith(":::") && t.length > 3) {
      blockKind = "nav";
      continue;
    }
    if (t === ":::") continue; // stray close

    if (t.startsWith(TAB_SPLIT)) {
      const segments = t.split(TAB_SPLIT).map((s) => s.trim()).filter((s) => s);
      for (const seg of segments) {
        const [rawName, rawId] = seg.split(TAB_TITLE_SPLIT);
        const name = (rawName || "").trim();
        const id = (rawId || "").trim();
        if (name && id && id !== name) idToLabel[id] = name;
      }
    }
  }

  // Second pass: rewrite. Recurse into nav-block bodies.
  const result = [];
  let inBlockKind = null;
  let navBuffer = [];

  for (const line of lines) {
    const t = line.trim();

    if (inBlockKind === "code") {
      result.push(line);
      if (t === CODE_BLOCK_SPLIT) inBlockKind = null;
      continue;
    }
    if (inBlockKind === "html") {
      result.push(line);
      if (t === HTML_BLOCK_SPLIT) inBlockKind = null;
      continue;
    }
    if (inBlockKind === "nav") {
      if (t === ":::") {
        // Recurse on the buffered body (separate scope).
        const recursed = migrateSchemaToShortForm(navBuffer.join("\n"));
        recursed.split("\n").forEach((l) => result.push(l));
        result.push(line);
        navBuffer = [];
        inBlockKind = null;
      } else {
        navBuffer.push(line);
      }
      continue;
    }

    // Code-block open: rewrite suffix only if it matches a known id.
    if (t.startsWith(CODE_BLOCK_SPLIT) && t.length > CODE_BLOCK_SPLIT.length) {
      const id = t.substr(CODE_BLOCK_SPLIT.length).trim();
      if (idToLabel[id]) {
        result.push(line.replace(/```.*/, CODE_BLOCK_SPLIT + idToLabel[id]));
      } else {
        result.push(line);
      }
      inBlockKind = "code";
      continue;
    }
    if (t === CODE_BLOCK_SPLIT) {
      result.push(line);
      inBlockKind = "code";
      continue;
    }

    // HTML-block open: same rule.
    if (t.startsWith(HTML_BLOCK_SPLIT) && t.length > HTML_BLOCK_SPLIT.length) {
      const id = t.substr(HTML_BLOCK_SPLIT.length).trim();
      if (idToLabel[id]) {
        result.push(line.replace(/---.*/, HTML_BLOCK_SPLIT + idToLabel[id]));
      } else {
        result.push(line);
      }
      inBlockKind = "html";
      continue;
    }
    if (t === HTML_BLOCK_SPLIT) {
      result.push(line);
      inBlockKind = "html";
      continue;
    }

    // Nav-block open: rewrite suffix, then start buffering body for recursion.
    if (t.startsWith(":::") && t.length > 3) {
      const id = t.substr(3).trim();
      if (idToLabel[id]) {
        result.push(line.replace(/:::.*/, ":::" + idToLabel[id]));
      } else {
        result.push(line);
      }
      inBlockKind = "nav";
      continue;
    }

    // Tab definition: drop `|tabId` from each segment whose id maps to a label.
    if (t.startsWith(TAB_SPLIT)) {
      const leadingWs = line.match(/^\s*/)[0];
      const segments = t.split(TAB_SPLIT).filter((s) => s.trim());
      const rewritten =
        TAB_SPLIT +
        segments
          .map((seg) => {
            const [rawName, rawId] = seg.split(TAB_TITLE_SPLIT);
            const name = (rawName || "").trim();
            const id = (rawId || "").trim();
            if (name && id && idToLabel[id] === name) {
              return name; // drop |tabId
            }
            return seg.trim();
          })
          .join(TAB_SPLIT);
      result.push(leadingWs + rewritten);
      continue;
    }

    result.push(line);
  }

  return result.join("\n");
}

/**
 * Generate data URL from schema
 */
export function generateDataUrl(schema, baseUrl = "https://synle.github.io/nav-generator") {
  const encodedSchema = encodeURIComponent(schema);
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Loading...</title>
    <link rel="stylesheet" href="${baseUrl}/index.css" />
  </head>
  <body>
    <script type='schema'>${schema}</script>
    <script src="${baseUrl}/index.js"></script>
  </body>
</html>`;

  return `data:text/html,${encodeURIComponent(html)}`;
}
