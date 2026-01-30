# ACTSELTURSTRPRI-01: Add `round` tracking to turn state and schema

**Status**: Completed

## What

Add `state.turn.round` (integer, 1-indexed) to game state. The round increments when the player index wraps back to player 1 in `advanceRoundRobin`. Update `createInitialState` to initialise `round: 1`. Update `TurnState` TypeScript type in `state.d.ts`. Update the loop snapshot to include round so loop detection accounts for it.

## Files to touch

- `src/game-kernel/state.js` — add `round: 1` to `state.turn` in `createInitialState`
- `src/game-kernel/scheduler.js` — `advanceRoundRobin` returns `nextRound`; `advanceTurnPhase` writes `state.turn.round`; `snapshotLoopState` includes `round`
- `src/game-kernel/state.d.ts` — add `round: number` to `TurnState` interface

### Corrected assumptions (vs original ticket)

- ~~`src/dsl/types.ts` — add `round?: number` to `TurnDef`~~: `TurnDef` defines game definition schema (scheduler, phases), not runtime state. `round` is runtime state; the correct location is `TurnState` in `state.d.ts`.
- ~~`schemas/dsl/game-definition.v1.json` — if turn state is schema-validated, add `round`~~: The JSON Schema validates `TurnDef` (the game definition), not runtime `TurnState`. No schema change needed.
- ~~`src/game-kernel/scheduler.d.ts` — update `.d.ts` if it declares turn shape~~: `scheduler.d.ts` declares `SchedulerStepResult` and `advanceTurnPhase` signature, not turn state. Turn shape is in `state.d.ts`.

## Out of scope

- New trigger events (`start_round`, `end_round`) — that is ACTSELTURSTRPRI-02
- New scheduler types — later tickets
- Simulation loop changes
- Mutation operators

## Acceptance criteria

- Test: `createInitialState(definition)` returns `state.turn.round === 1`
- Test: After all players take one turn in a 2-player round_robin game, `state.turn.round === 2`
- Test: After 3 full rounds in a 3-player game, `state.turn.round === 4`
- Test: `snapshotLoopState` distinguishes identical board states in different rounds
- Invariant: `state.turn.round` is always a positive integer >= 1
- Invariant: `state.turn.round` only increments when all players have completed a turn cycle
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None

## Outcome

### What was actually changed (vs originally planned)

**Planned but not needed:**
- `src/dsl/types.ts` (`TurnDef`) — `round` is runtime state, not a definition property. No change.
- `schemas/dsl/game-definition.v1.json` — JSON Schema validates game definitions, not runtime state. No change.
- `src/game-kernel/scheduler.d.ts` — does not declare turn shape. No change.

**Actually changed (3 source files):**
- `src/game-kernel/state.js` — added `round: 1` to initial turn state
- `src/game-kernel/scheduler.js` — `advanceRoundRobin` computes `nextRound` (increments when `nextPlayer === 1`); `advanceTurnPhase` writes `round`; `snapshotLoopState` includes `round`
- `src/game-kernel/state.d.ts` — added `round: number` to `TurnState` interface

**Test files updated:**
- `test/unit/game-kernel/state.test.mjs` — added "initialises round to 1" test
- `test/unit/game-kernel/scheduler.test.mjs` — added 5 round-tracking tests; updated loop-detection test (round prevents false loops now; trigger-loop still detected)
- `test/unit/data-persistence/types.test.ts` — added `round: 1` to mock TurnState
- `test/unit/evaluation-analytics/types.test.ts` — added `round: 1` to mock TurnState

**Side effect:** The existing "halts repeated states with a failsafe draw flag" test was split into two tests: one verifying that round prevents false state-loop detection (correct new behavior), and one verifying trigger-loop detection still works. With round in the snapshot, identical board states in different rounds are no longer falsely flagged as loops — they are correctly distinguished.
