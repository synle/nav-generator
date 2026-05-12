# nav-generator — Architecture

## High-Level Overview

`nav-generator` is a 100% client-side React 19 single-page app that turns a custom
plain-text schema (titles, headers, link buttons, tabs, code blocks, HTML blocks,
and nested nav blocks) into a self-contained navigation page. The output is
serialized into a `data:text/html,...` URL so the entire page — schema, rendered
DOM, and a snapshot of the renderer — can be saved as a single browser bookmark
that runs anywhere without a backend.

The app is hosted as a static site on GitHub Pages (`synle.github.io/nav-generator`).
At runtime:

1. The entry point (`index.html` locally, `index.template.html` for the deployed
   build) loads `index.js` — a single IIFE bundle produced by Vite from
   `index.jsx`.
2. `index.jsx` renders the editor (`@monaco-editor/react`), parses the schema
   via helpers in `utils.js`, syntax-highlights code blocks with `prismjs`,
   and generates / previews the resulting `data:` URL bookmark.
3. `sw-nav.js` is registered as a service worker for offline support; Vite
   stamps a fresh `CACHE_VERSION` into it on every build so old caches are
   invalidated on activate.
4. Schemas use a legacy long-form (`>>>Label|tabId` + matching block id) that
   is auto-migrated to short-form on render and save (`migrateSchemaToShortForm`
   in `utils.js`).

There is no server, no API, no database — every feature is implemented in the
browser bundle.

## Key Directories

- `/` — flat repo: source (`index.jsx`, `utils.js`, `sw-nav.js`), styles
  (`index.scss`, `common.scss`), build config (`vite.config.js`,
  `vitest.config.js`), and HTML entry points all live at the root.
- `test/` — Vitest test suite (`*.test.js`), `setup.js` for jsdom/happy-dom
  bootstrap, and a `README.md` describing the test conventions.
- `.github/workflows/` — CI pipelines: `build-main.yml` (build + Pages deploy),
  `cleanup-artifacts.yml`, `cleanup-pr-artifacts.yml`.

## Important Files

- `index.jsx` — the entire React app: schema parser glue, Monaco editor host,
  tab/nav/code/html block renderers, search, clipboard / download flows, and
  `data:` URL bookmark generation.
- `utils.js` — pure helpers: schema parsing constants (`SAME_TAB_LINK_SPLIT`,
  `NEW_TAB_LINK_SPLIT`, `HEADER_SPLIT`, etc.), `parseLinkLine`,
  `buildSearchRegex` (supports `/` fuzzy prefix), and
  `migrateSchemaToShortForm`. Tested independently.
- `sw-nav.js` — service worker. Uses a `__BUILD_TIMESTAMP__` placeholder that
  the Vite plugin replaces at `closeBundle` time so each build gets a unique
  `CACHE_NAME` and a 7-day cache TTL.
- `index.html` — local-dev shell; loads `index.js` directly and skips SW
  registration on `localhost:8080`.
- `index.template.html` — production shell deployed to GitHub Pages; also
  loads `https://synle.github.io/nav-generator/index.js?hasCustomNavBeforeLoad=1`
  so user-generated `data:` URL bookmarks can detect "wrapper" mode.
- `vite.config.js` — `lib` build, `formats: ["iife"]`, `entry: "index.jsx"`,
  `outDir: "."`, `emptyOutDir: false`, sourcemaps on, minified. Includes the
  custom `updateServiceWorker` plugin that stamps the SW build timestamp.
- `vitest.config.js` + `test/setup.js` — Vitest config (jsdom/happy-dom env,
  v8 coverage via `@vitest/coverage-v8`).
- `build.sh` — CI build script. Downloads `common.scss` from the shared
  `synle/bashrc` repo with size-sanity validation (rejects empty or
  <50%-of-current files), `npm install`s, runs `test:coverage` and tees the
  coverage report into `$GITHUB_STEP_SUMMARY`, then `npm run build`.
- `dev.sh` — thin shim around the shared `synle/workflows` dev watcher;
  reloads on `*.json *.scss *.jsx *.js` and runs `npm run start`.
- `package.json` — declares the Vite-driven build and the Vitest scripts.
  Stays `private: true`; runtime deps are React 19, Monaco editor + React
  wrapper, and Prism.
- `common.scss` — shared base styles pulled from `synle/bashrc` at build time
  (committed snapshot lives in the repo so the build is deterministic if the
  download fails).

## Build & Release Flow

- **Local dev** — `dev.sh` invokes the shared watcher from `synle/workflows`
  and serves the root via `http-server` (`npm run start`). `index.html` is
  the local entry; service-worker registration is skipped on
  `localhost:8080`.
- **CI** — `.github/workflows/build-main.yml` triggers on `push` and
  `pull_request` against `main` / `master`. It delegates to the reusable
  workflow `synle/workflows/.github/workflows/build-and-commit-sh.yml@main`
  with `deploy-to-pages: true`, which executes `build.sh`:
  1. Refresh `common.scss` from `synle/bashrc` (size-validated).
  2. `npm install`.
  3. `npm run test:coverage` — Vitest + v8 coverage; report appended to the
     GitHub Actions step summary.
  4. `npm run build` — Vite produces `index.js` (+ sourcemap) at the repo
     root; the Vite plugin rewrites `__BUILD_TIMESTAMP__` in `sw-nav.js`.
  5. The reusable workflow commits the build output back to the branch and
     publishes the root as the Pages artifact.
- **Release** — there is no semver/tag release pipeline; the deployed product
  is the latest commit on `main` published to GitHub Pages by the build
  workflow. Artifact cleanup is handled by `cleanup-artifacts.yml` and
  `cleanup-pr-artifacts.yml`.
