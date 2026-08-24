# Test Suite

Vitest with Happy DOM. Tests cover the pure helpers in `utils.js`, the service worker, and schema behaviors (migration, tabs, nav blocks, caching).

## Test Files

- `utils.test.js` — link/schema line parsing, search regex, sorting, data URL generation
- `search.test.js` — fuzzy (`/`), substring, and Google (`?`) search plus autocomplete
- `sw-nav.test.js` — cache configuration, URL filtering, expiration
- `migrate-schema.test.js` / `tab-shortform.test.js` — short-form tab migration (idempotent, scope-aware)
- `tab-persistence.test.js` — sessionStorage tab selection across refreshes
- `nav-block.test.js` — nested nav block rendering/parsing
- `nav-schema-cache.test.js` — localStorage schema cache behavior
- `code-block-collapse-shortcut.test.js` — Alt+\ / Cmd+\ bulk collapse event
- `index-init.test.js` — app bootstrap smoke test

## Running

```bash
npm test               # all tests
npm run test:watch     # watch mode
npm run test:coverage  # coverage (80% minimum on all metrics)
npm run test:ui        # Vitest UI
```

## Setup

`setup.js` configures cleanup after each test plus mocks for `window.matchMedia`, `localStorage`, `navigator.clipboard`, IndexedDB, and a crypto polyfill for Happy DOM.

CI runs tests via `build.sh` before every build; failures block the build.
