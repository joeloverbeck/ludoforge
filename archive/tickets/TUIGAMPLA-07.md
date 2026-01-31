# TUIGAMPLA-07: Board panel + zone display + token badge + effect log

**Status:** DONE
**Risk:** LOW
**Dependencies:** TUIGAMPLA-05, TUIGAMPLA-06
**Blocks:** TUIGAMPLA-09

---

## What

Create the board visualization components (zones, tokens) and the scrollable effect log panel.

## Files to Touch

- `src/tui/components/board-panel.jsx` — zones + tokens container (new)
- `src/tui/components/zone-display.jsx` — single zone (global, per-player, spatial, empty variants) (new)
- `src/tui/components/token-badge.jsx` — color-coded token display (`id:type`) (new)
- `src/tui/components/effect-log.jsx` — scrollable log (PgUp/PgDn), newest at bottom (new)
- `src/tui/hooks/use-scroll.js` — scroll state management for effect log (new, creates `hooks/` directory)
- `src/tui/components/game-screen.jsx` — replace board and effect-log placeholders with real components (modify)

## Out of Scope

Action panel, target selection, human-agent interaction, game-over screen, simulation loop.

## Acceptance Criteria

- `npm run build:tui` succeeds.
- Global zones display: `[zoneName] type: t1 t2`.
- Per-player zones display grouped by owner.
- Spatial zones display tokens at node positions.
- Empty zones display: `[zoneName] (empty)`.
- Token badges colored by type (cycling through color scheme).
- Effect log renders formatted effect entries.
- PgUp/PgDn scrolls the log.
- Zones with `visibility: "private"` show `[hidden]` for opponent tokens (spectator sees all).
- Manual verification with multi-token-game, multi-phase-game definitions.

## Outcome

### Ticket corrections before implementation

- Added `src/tui/components/game-screen.jsx` to "Files to Touch" — the ticket omitted that this existing file must be updated to wire in the new BoardPanel and EffectLog components (replacing placeholders).
- Annotated `use-scroll.js` entry to note it creates the `hooks/` directory.

### What was actually changed

All 6 files listed in "Files to Touch" were created or modified as planned:

- **`src/tui/hooks/use-scroll.js`** (new) — Pure functions `createScrollState`, `scrollUp`, `scrollDown` for scroll offset arithmetic. No React dependency; plain JS testable without a renderer.
- **`src/tui/components/token-badge.jsx`** (new) — Renders `id:type` with color prop; shows `[hidden]` (dimmed) when `hidden` prop is true.
- **`src/tui/components/zone-display.jsx`** (new) — Handles global (flat token list), per-player (grouped by owner with privacy filtering), spatial (tokens at node positions), and empty zone variants.
- **`src/tui/components/board-panel.jsx`** (new) — Container iterating over `definition.state.zones`, builds token color map, passes zone state and tokens to `ZoneDisplay`.
- **`src/tui/components/effect-log.jsx`** (new) — Scrollable log with PgUp/PgDn via `useInput`, auto-scrolls to bottom on new entries, shows `[scroll: PgUp/PgDn]` hint when content overflows.
- **`src/tui/components/game-screen.jsx`** (modified) — Replaced board placeholder with `<BoardPanel>`, replaced effect-log placeholder with `<EffectLog>`. Added `effectLog`, `currentPlayerId`, `isSpectator` props.
- **`src/tui/app.jsx`** (modified, minor) — Threaded `effectLog` state field through to `<GameScreen>`.

### Tests added

- `test/unit/tui/use-scroll.test.mjs` — 11 tests for `createScrollState`, `scrollUp`, `scrollDown` (boundary conditions, clamping).
- `test/unit/tui/board-panel-build.test.mjs` — 8 tests verifying the esbuild bundle contains all new component names and header strings.

### Verification

- `npm run build:tui` succeeds.
- All 1658 unit tests pass (including 19 new tests).
