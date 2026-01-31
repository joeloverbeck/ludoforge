# TUIGAMPLA-09: use-game-loop hook (integration glue)

**Status:** TODO
**Risk:** HIGH
**Dependencies:** TUIGAMPLA-01, TUIGAMPLA-04, TUIGAMPLA-05, TUIGAMPLA-06, TUIGAMPLA-07, TUIGAMPLA-08
**Blocks:** TUIGAMPLA-10

---

## What

Create the React hook that orchestrates the full game loop: creates agents from player assignments, calls `runSimulation()` with step control, wires the human agent's `onActionNeeded` to the UI dispatch, and handles watch mode delay.

## Files to Touch

- `src/tui/hooks/use-game-loop.js` — orchestrates: create agents from assignments, call `runSimulation()` with `stepControl.onStep`, wire human agent `onActionNeeded` to dispatch `SET_LEGAL_ACTIONS`, handle watch mode delay

## Out of Scope

Individual component rendering (done in TUIGAMPLA-06 through TUIGAMPLA-08), game-over screen, simulation-engine internals.

## Acceptance Criteria

- Full game plays through with human + AI players.
- `runSimulation()` called with correct config (definition, agents, stepControl, seed).
- `onStep` callback dispatches `UPDATE_GAME_STATE` and `APPEND_LOG` after each step.
- Human turns: simulation pauses until action selected in UI.
- AI turns (mixed mode): brief 200ms delay so human can see the action.
- Watch mode (all AI): configurable delay (default 500ms).
- Game termination dispatches `SET_OUTCOME`, transitions to gameover screen.
- Manual verification: play `multi-token-game.json` with 1 human + 1 AI to completion.
