# DONE.eslint — oxlint rules audit for nav-generator

## TLDR

All follow-ups from the original oxlint audit are resolved: the `eval()` call
was replaced with `new Function`, an explicit `.oxlintrc.json` now documents the
rule set, and the `suspicious` category is enabled with the six genuine findings
fixed in code. React dependency-array rules run as warnings pending a dedicated
behavior-safe refactor.

## Status: DONE (2026-08-23)

| Original TODO                        | Outcome                                                                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revisit the single `no-eval` disable | **Fixed** — `eval(schemaComponent.linkUrl)` at `index.jsx` jsLink onClick replaced with `new Function(schemaComponent.linkUrl)()`; inline disable comment removed |
| Add explicit `.oxlintrc.json`        | **Done** — config committed; plugins, categories, rule overrides and ignore list now explicit and reviewable                                                      |
| Stricter categories incrementally    | **Partially done** — `suspicious` enabled (errors); React plugin enabled; `pedantic`, `perf`, `style`, `restriction` deliberately left off                        |
| ESLint migration port-over note      | **Moot** — no inline suppression remains to port                                                                                                                  |

## Current lint setup

- Tool: `oxlint` 1.79.0 (`npm run lint` → `oxlint .`), config `.oxlintrc.json`
- Plugins: `typescript`, `unicorn`, `oxc` (defaults) + `react`
- Categories: `correctness` (error), `suspicious` (error)
- Gate: `build.sh` runs lint before tests/build; CI re-runs it
- Known warnings: 19 React dependency-array findings
  (`react-hooks/exhaustive-deps`, `react/exhaustive-effect-dependencies`,
  `react/memo-dependencies`, `react/refs`, `react/set-state-in-effect`) — all
  set to `warn`; fixing them changes effect timing and needs per-site runtime
  verification

## Rules disabled (with reason)

| Rule                                  | Reason it stays off                                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-underscore-dangle`                | `_`-prefixed module-level helpers (`_log`, `_render`, `_onLinkNavigate`, …) are the codebase's deliberate private-naming convention — 42 sites              |
| `unicorn/prefer-add-event-listener`   | `window.onmessage = …` style assignments are intentional single-handler wiring; converting to `addEventListener()` risks duplicate-handler behavior changes |
| `unicorn/consistent-function-scoping` | Hoisting nested functions out would change closures over component state                                                                                    |

## Code fixes made this pass (instead of disabling rules)

- `index.jsx`: `eval()` → `new Function()` for `javascript://` schema links;
  linkUrl is pre-wrapped into a self-contained async IIFE at parse time, so
  global-scope execution is equivalent
- `utils.js` + `index.jsx` (3 sites): `.sort()` → `.toSorted()` where the array
  is freshly derived — removes mutation hazard flagged by `unicorn/no-array-sort`
- `index.jsx`: renamed params shadowing outer scope in `_upsertBlockId`
  (`blockId` → `newBlockId`) and `onSortSchemaBySectionNameAndTitle`
  (`schema` → `schemaText`)
- `index.jsx`: Chrome-bookmark parse errors now attach `{ cause: error }`
  when re-thrown (`eslint/preserve-caught-error`)

## Deliberately not enabled

- `pedantic` (~283 findings), `perf` (1 finding:
  `no-await-in-loop` in `sw-nav.js` sequential cache write — intentional),
  `style`, `restriction` — noise outweighs signal today; revisit individually
- React dependency-array rules stay warnings until each effect can be verified
  by hand — do not auto-fix them blind

## Follow-up ideas

1. Burn down the 19 React deps-array warnings one hook at a time with manual
   behavior verification per site.
2. Evaluate `perf` category after deciding on the `sw-nav.js` loop.
3. If migrating to ESLint later, port `.oxlintrc.json` categories/rules as-is.
