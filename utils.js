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

    const fuzzyPattern = new RegExp(
      "[ ]*" + cleanedSearchText.split("").join("[a-z0-9 -_]*"),
      "i",
    );

    filtered = suggestions.filter((s) => fuzzyPattern.test(s)).slice(0, limit);
  } else {
    // Normal substring search
    const searchLower = searchText.toLowerCase();
    filtered = suggestions
      .filter((s) => s.toLowerCase().includes(searchLower))
      .slice(0, limit);
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
