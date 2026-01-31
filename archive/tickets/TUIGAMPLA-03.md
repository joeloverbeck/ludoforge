# TUIGAMPLA-03: TUI build infrastructure + CLI entry

**Status:** DONE
**Risk:** LOW
**Dependencies:** None
**Blocks:** TUIGAMPLA-06

---

## What

Set up the build pipeline for TUI components (esbuild for JSX transpilation) and create the CLI entry point `ludoforge-play`.

## Files to Touch

- `package.json` — add `ink`, `react`, `ink-select-input` to dependencies; `esbuild` to devDependencies; add `build:tui` and `play` scripts; add `bin.ludoforge-play`
- `scripts/build-tui.js` — esbuild config (transpile `src/tui/**/*.{js,jsx}` → `dist/tui/`, ESM, node20, jsx automatic)
- `src/tui/ludoforge-play.js` — CLI entry with `#!/usr/bin/env node`, arg parsing (`<game.json>`, `--watch`, `--speed`, `--seed`, `--player`)
- `src/tui/parse-play-args.js` — extracted argument parser (testable, throws on invalid input)

## Out of Scope

Ink components (later tickets), human-agent, simulation loop changes, existing CLI (`ludoforge-evolve`).

## Acceptance Criteria

- `npm install` succeeds with new deps.
- `npm run build:tui` produces `dist/tui/ludoforge-play.js`.
- `node dist/tui/ludoforge-play.js --help` prints usage info.
- No existing tests break (`npm run test:unit`, `npm run test:integration`).
- `tsc -p tsconfig.json` passes (new `.js` files have no type errors).

## Outcome

**All acceptance criteria met.**

Changes vs plan:
- **Added `src/tui/parse-play-args.js`**: The arg parser was extracted into a separate module (matching the existing `src/cli/parse-args.js` pattern) to enable direct unit testing. The ticket originally had parsing inline in the entry point.
- **Build script uses glob**: `scripts/build-tui.js` uses `glob("src/tui/**/*.{js,jsx}")` to discover all entry points rather than hardcoding a single file, so future TUI modules are automatically included.
- **No `CLIError` dependency**: The parser throws plain `Error` instead of importing `CLIError` from `../cli/`, avoiding cross-tree import issues between `dist/tui/` and `src/cli/`.
- **32 new tests**: 20 unit tests for `parsePlayArgs`, 8 subprocess tests for the CLI, 4 build output verification tests. All 1517 tests pass (1485 existing + 32 new).
