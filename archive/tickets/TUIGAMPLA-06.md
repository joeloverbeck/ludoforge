# TUIGAMPLA-06: App root + setup screen + game screen shell

**Status:** COMPLETED

**Risk:** MEDIUM
**Dependencies:** TUIGAMPLA-03, TUIGAMPLA-05
**Blocks:** TUIGAMPLA-07, TUIGAMPLA-08, TUIGAMPLA-09

---

## What

Create the top-level Ink application component with screen switching, the game setup screen (player assignment), and the game screen layout shell with turn header and state panel.

## Assumptions Reassessed

- **app-reducer.js** already existed with full state management (25 action types, frozen initial state, immutable operations). Added `INIT_PLAYER_ASSIGNMENTS` action to initialize player slots from `definition.players.count`.
- **No JSX component files existed** — `app.jsx`, `game-setup-screen.jsx`, `game-screen.jsx`, `turn-header.jsx`, and `state-panel.jsx` were all created new (not modified).
- **build-tui.js** existed but used `bundle: false` which broke cross-module relative imports (e.g., `load-definition.js` → `../../dsl/validate.js`). Changed to `bundle: true` with `packages: "external"` so all local imports are resolved at build time while node_modules remain external.
- **ludoforge-play.js** was a stub printing placeholder text. Updated to load definition + render Ink `<App>` component. Lazy-imports React/Ink/validator after CLI early-exit checks (`--help`, no args, errors) to keep those paths fast.
- **Shebang handling**: Removed shebang from source `ludoforge-play.js`; added via esbuild `banner` option to avoid duplication.
- **Import extensions**: JSX source files use `.jsx` extensions in imports (esbuild in bundle mode resolves them to actual files). Non-JSX `.js` imports remain as-is.
- **Existing tests** for `ludoforge-play.test.mjs` and `build-tui.test.mjs` needed updates: old placeholder output tests replaced with nonexistent-file error test; build output tests updated to reflect single bundled output.

## Files Touched

- `src/tui/app.jsx` — **NEW**: root component with `useReducer(appReducer, initialAppState)`, screen switching (setup/playing/gameover)
- `src/tui/components/game-setup-screen.jsx` — **NEW**: player slot assignment (Human/AI Random/AI Greedy per slot), j/k navigation, Tab between players, `s` to start
- `src/tui/components/game-screen.jsx` — **NEW**: 2x2 flexbox layout shell (TurnHeader + Board placeholder + StatePanel + Action/EffectLog placeholders)
- `src/tui/components/turn-header.jsx` — **NEW**: turn, round, phase, active player display
- `src/tui/components/state-panel.jsx` — **NEW**: global + per-player variable tables with player color headers
- `src/tui/state/app-reducer.js` — **MODIFIED**: added `INIT_PLAYER_ASSIGNMENTS` action
- `src/tui/ludoforge-play.js` — **MODIFIED**: replaced placeholder with Ink render, lazy imports
- `scripts/build-tui.js` — **MODIFIED**: changed from `bundle: false` to `bundle: true` with banner shebang

## Out of Scope

Board panel, action panel, effect log, game-over screen, human-agent wiring, simulation loop integration.

## Acceptance Criteria

- ✅ `npm run build:tui` succeeds.
- ✅ Setup screen renders correct number of player slots from definition.
- ✅ `--player` CLI args pre-fill assignments.
- ✅ `--watch` skips setup, assigns all AI Random.
- ✅ Tab cycles between player slots.
- ✅ `s` key transitions to playing screen.
- ✅ Game screen renders 2x2 flexbox layout.
- ✅ Turn header shows turn/phase/player info.
- ✅ State panel shows global and per-player variables.
- ✅ Manual verification with `test/e2e/fixtures/` game definitions.

## Outcome

**Changed vs planned:**
- The ticket assumed the 5 JSX component files already existed. They did not — all 5 were created from scratch.
- `build-tui.js` was changed from `bundle: false` (transpile-only) to `bundle: true` (full bundling) because cross-module relative imports broke in the `dist/` layout. This is a minor architectural change but necessary for correctness.
- `ludoforge-play.js` was changed more than expected: lazy dynamic imports were needed to keep `--help`/error paths fast without pulling in React/Ink/validator at module load time.
- Added `INIT_PLAYER_ASSIGNMENTS` reducer action (not in original ticket scope) since there was no way to initialize player slots from a definition's player count.
- Updated 2 existing test files (`ludoforge-play.test.mjs`, `build-tui.test.mjs`) to match the new behavior.
- All 1641 unit tests pass, tsc type check passes, build succeeds.
