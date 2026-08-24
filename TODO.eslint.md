# TODO.eslint — oxlint rules audit for nav-generator

## TLDR

oxlint (v1.79.0) runs on this repo with **default rules only** — there is no
`.oxlintrc.json` and no rule was disabled in config. The codebase passes
`npm run lint` clean. Exactly **one** inline suppression exists. This file is
the handoff for a future agent that wants to tighten, replace, or migrate the
lint setup.

## Current lint setup

- Tool: `oxlint` 1.79.0 (`npm run lint` → `oxlint .`)
- Config file: **none** (no `.oxlintrc.json`) — default rule set applies
- Gate: `build.sh` runs `npm run lint` before tests/build; CI re-runs it via
  `.github/workflows/build-main.yml`
- Formatter: `oxfmt` is separate (`npm run format:check`), not part of lint

## Rules disabled / excluded

| Rule | Where | Why | TODO for future agent |
| ---- | ----- | --- | --------------------- |
| `no-eval` | `index.jsx:2204` (inline `// oxlint-disable-next-line no-eval`) | `javascript://` links are a documented schema feature; link URLs execute via `eval()` by design | Consider a safer execution path (e.g. `new Function`, sandboxed iframe, or explicit allowlist) so the disable can be removed |

That is the entire list. No rules were turned off globally, no files were
excluded from linting.

## Code fixed instead of disabling rules

Commit `da98816` ("feat: add oxlint static analysis, fix all findings") made the
codebase pass by fixing findings, not muting them:

- Dropped unused imports / vars / params (loader import, vestigial
  `forceOpenWindow` param, dead `encodedSchema` compute, unused test imports)
- Empty catch bindings → bare `catch {}`
- Guard expressions rewritten as `if` statements

Nothing from that set needs revisiting; listed here so the future agent knows
no suppressions hide behind it.

## Follow-up ideas

1. Add an `.oxlintrc.json` to make the implicit default config explicit and
   reviewable (categories enabled, ignored paths).
2. Revisit the single `no-eval` disable — either remove the feature or find a
   non-eval implementation.
3. Decide whether stricter categories (correctness beyond defaults,
   suspicious/pedantic) should be enabled incrementally.
4. If migrating to ESLint later, the only port-over is the one `no-eval`
   suppression at `index.jsx:2204`.
