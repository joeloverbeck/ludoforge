# TUIGAMPLA-03: TUI build infrastructure + CLI entry

**Status:** TODO
**Risk:** LOW
**Dependencies:** None
**Blocks:** TUIGAMPLA-06

---

## What

Set up the build pipeline for TUI components (esbuild for JSX transpilation) and create the CLI entry point `ludoforge-play`.

## Files to Touch

- `package.json` — add `ink`, `react`, `ink-select-input` to dependencies; `esbuild` to devDependencies; add `build:tui` and `play` scripts; add `bin.ludoforge-play`
- `scripts/build-tui.js` — esbuild config (transpile `src/tui/**/*.jsx` → `dist/tui/`, ESM, node20, jsx automatic)
- `src/tui/ludoforge-play.js` — CLI entry with `#!/usr/bin/env node`, arg parsing (`<game.json>`, `--watch`, `--speed`, `--seed`, `--player`), Ink render call

## Out of Scope

Ink components (later tickets), human-agent, simulation loop changes, existing CLI (`ludoforge-evolve`).

## Acceptance Criteria

- `npm install` succeeds with new deps.
- `npm run build:tui` produces `dist/tui/ludoforge-play.js`.
- `node dist/tui/ludoforge-play.js --help` prints usage info.
- No existing tests break (`npm run test:unit`, `npm run test:integration`).
- `tsc -p tsconfig.json` passes (new `.js` files have no type errors).
