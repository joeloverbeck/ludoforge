# TUIGAMPLA-05: App state reducer + color scheme + formatters + unit tests

**Status:** DONE
**Risk:** LOW
**Dependencies:** None
**Blocks:** TUIGAMPLA-06, TUIGAMPLA-07, TUIGAMPLA-08, TUIGAMPLA-09

---

## What

Create the pure state management layer (reducer + initial state), color scheme utilities, and display formatters for the TUI. All pure functions with no UI dependencies.

## Files to Touch

- `src/tui/state/app-reducer.js` — `initialAppState` + reducer handling all actions: SET_DEFINITION, ASSIGN_PLAYER, START_GAME, UPDATE_GAME_STATE, SET_LEGAL_ACTIONS, MOVE_CURSOR, CONFIRM_ACTION, CONFIRM_TARGET, CANCEL_TARGET, APPEND_LOG, SET_OUTCOME, TOGGLE_PAUSE, ADJUST_SPEED
- `src/tui/utils/color-scheme.js` — token type color map (cyan, yellow, magenta, green, red, blue, white cycling) + player color map
- `src/tui/utils/format-effect.js` — effect kind → human-readable string for all 18 kinds (set, inc, dec, spawn, move, destroy, reveal, hide, move_spatial, repeat, conditional, rng_choose, shuffle, queue_push, queue_pop, set_flag, set_turn_order) — the spec section 9.4 listed 12 display-format examples; the remaining 6 (move_spatial, set_flag, set_turn_order, queue_push, queue_pop, and the missing shuffle) get analogous short formats
- `src/tui/utils/format-action.js` — action → display label with costs/targets summary
- `test/unit/tui/app-reducer.test.mjs`
- `test/unit/tui/color-scheme.test.mjs`
- `test/unit/tui/format-effect.test.mjs`
- `test/unit/tui/format-action.test.mjs`

## Out of Scope

JSX components, Ink, simulation loop, game-kernel, human-agent.

## Acceptance Criteria

- Reducer is pure: produces new state objects, never mutates.
- Reducer handles all 13 action types.
- `initialAppState` matches spec section 13.
- `formatEffect()` covers all 18 effect kinds defined in `src/dsl/types.ts`.
- `formatAction()` produces readable labels.
- `colorScheme` assigns distinct colors per token type and per player.
- All unit tests pass.
- `tsc -p tsconfig.json` passes.

---

## Outcome

**Ticket assumption corrected**: The original ticket claimed "all 11 effect kinds" but listed 12 and the DSL actually defines 18 kinds. The ticket was updated before implementation to cover all 18.

**Files created (exactly as planned)**:
- `src/tui/state/app-reducer.js` — pure reducer with 13 action types + frozen `initialAppState`
- `src/tui/utils/color-scheme.js` — `buildTokenColorMap()`, `playerColor()`, exported color arrays
- `src/tui/utils/format-effect.js` — `formatEffect()` covering all 18 DSL effect kinds
- `src/tui/utils/format-action.js` — `formatAction()` with id + targets summary + costs summary
- `test/unit/tui/app-reducer.test.mjs` — 25 tests (immutability, all action types, cursor wrapping, edge cases)
- `test/unit/tui/color-scheme.test.mjs` — 12 tests (color assignment, cycling, distinctness)
- `test/unit/tui/format-effect.test.mjs` — 24 tests (one per effect kind + unknown fallback)
- `test/unit/tui/format-action.test.mjs` — 8 tests (simple, targets, costs, combined, edge cases)

**No deviations from plan.** All 76 new tests pass, full suite (1638 tests) green, `tsc` clean.
