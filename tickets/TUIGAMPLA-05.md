# TUIGAMPLA-05: App state reducer + color scheme + formatters + unit tests

**Status:** TODO
**Risk:** LOW
**Dependencies:** None
**Blocks:** TUIGAMPLA-06, TUIGAMPLA-07, TUIGAMPLA-08, TUIGAMPLA-09

---

## What

Create the pure state management layer (reducer + initial state), color scheme utilities, and display formatters for the TUI. All pure functions with no UI dependencies.

## Files to Touch

- `src/tui/state/app-reducer.js` — `initialAppState` + reducer handling all actions: SET_DEFINITION, ASSIGN_PLAYER, START_GAME, UPDATE_GAME_STATE, SET_LEGAL_ACTIONS, MOVE_CURSOR, CONFIRM_ACTION, CONFIRM_TARGET, CANCEL_TARGET, APPEND_LOG, SET_OUTCOME, TOGGLE_PAUSE, ADJUST_SPEED
- `src/tui/utils/color-scheme.js` — token type color map (cyan, yellow, magenta, green, red, blue, white cycling) + player color map
- `src/tui/utils/format-effect.js` — effect kind → human-readable string for all 11 kinds (set, inc, dec, spawn, move, destroy, reveal, hide, shuffle, conditional, repeat, rng_choose)
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
- `formatEffect()` covers all 11 effect kinds.
- `formatAction()` produces readable labels.
- `colorScheme` assigns distinct colors per token type and per player.
- All unit tests pass.
- `tsc -p tsconfig.json` passes.
