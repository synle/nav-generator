# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

Client-side React application that converts bookmark lists into self-contained data URLs that can be bookmarked in browsers. No backend; everything runs in the browser. Build artifacts are committed to the repo root for GitHub Pages deployment.

## Commands

```bash
npm test               # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report (80% minimum on all metrics)
./build.sh             # Full build: install, tests with coverage, build
npm run build          # Production build -> index.js / index.css / source maps at repo root
npm start              # HTTP server with CORS on port 8080
./dev.sh               # Watch mode, rebuilds every 3 seconds
npm run format         # oxfmt --write .
npm run format:check   # oxfmt --check .
```

Tests live in `test/` and run on Vitest with Happy DOM (Node 16+).

## Architecture

- `index.jsx` (~3,800 lines) — the entire app in one file:
  - Modal system overriding `window.alert` / `confirm` / `prompt`
  - Schema parser for the custom markup language
  - Core components: `CodeBlockWrapper`, `SearchBox`, `PageRead`, `PageEdit`, `SchemaRender`, `SchemaEditor` (Monaco wrapper with textarea fallback), `App`, `PageVersionHistory`, Chrome bookmark import/export pages, backup download page
  - Utilities: theme toggle, IndexedDB version history, data URL generation, Chrome bookmark file parsing
- `utils.js` — pure helpers extracted for testability: link/schema line parsing (`parseLinkLine`, `parseSchemaLineType`), search regex building, sorting, tab short-form migration (`migrateSchemaToShortForm`)
- `sw-nav.js` — service worker using stale-while-revalidate; cache version stamped at build time via a Vite plugin; 7-day TTL
- `index.scss` — app-specific styles; `common.scss` — shared theme styles kept in sync with the `synle/bashrc` repo (changes must be mirrored there)

### Schema syntax

| Marker   | Meaning                   |
| -------- | ------------------------- |
| `!`      | Page title                |
| `#`      | Section header            |
| `\|`     | Same-tab link             |
| `\|\|\|` | New-tab link              |
| ` ``` `  | Code block                |
| `---`    | HTML block                |
| `:::`    | Nav block (nested schema) |
| `>>>`    | Tabs                      |
| `@`      | Custom favicon URL        |

Tabs bind by label: short-form `>>>Label` matches its content block (`:::Label`, ` ```Label `, or `---Label`) by trimmed label string. Legacy long-form `>>>Label\|tabId` still parses (explicit id wins). Schemas auto-migrate to short-form on first render and every save; migration is idempotent and scope-aware (see `test/migrate-schema.test.js`).

## Key Concepts

- **Data URLs** — generated pages load CSS/JS from GitHub Pages and embed the schema inline in `<script type='schema'>`; work offline after first load via the service worker.
- **NavBeforeLoad + schema cache** — consumer pages loading `index.js?hasCustomNavBeforeLoad=1` supply the schema through a `NavBeforeLoad` DOM event (`renderSchema(newSchema)` callback). Renders are cached stale-while-revalidate in localStorage under `navSchemaCache:<href>`. Cache is disabled for non-http(s) URLs and for `?newNav` / `?loadNav`.
- **Tab selection persistence** — selected tabs survive refresh via sessionStorage key `navTabSelection`, scoped by stable tab-id suffixes and cleared whenever the schema changes (`App.onSetSchema`). Anonymous generated blocks are not persisted.
- **CodeBlockWrapper** — collapsible code block, collapsed by default; content over 10 lines shows a preview plus a "Show More" link (the only per-block expand affordance). Alt+\ / Cmd+\ bulk-toggles all blocks via the `NavGenCodeBlockCollapseAll` custom event.
- **Monaco editor** — loaded from npm (`@monaco-editor/react`) with custom `nav-generator` language and light/dark themes; falls back to textarea if not ready within 5 seconds.
- **Version history** — IndexedDB database `VersionsDB`; snapshots auto-save deduplicated by value; restore via dedicated page.

## CI/CD

`.github/workflows/build-main.yml` runs on push to main/master: delegates to the reusable workflow `synle/workflows/build-and-commit-sh.yml@main`, which executes `build.sh` (refresh `common.scss` from `synle/bashrc` with size validation, install, coverage-gated tests, build), commits the build output back, and deploys to GitHub Pages.

## Notes

- Pure JavaScript/JSX — no TypeScript.
- JSDoc comments are mandatory for all functions, components, and non-trivial code on every change.
- Custom HTML elements `<load>`, `<tabs>`, `<tab>` are used for styling.
- `javascript://` links execute via eval().
- PRs merge with squash only — one commit per PR.
