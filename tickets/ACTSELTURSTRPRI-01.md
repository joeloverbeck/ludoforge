# ACTSELTURSTRPRI-01: Add `round` tracking to turn state and schema

## What

Add `state.turn.round` (integer, 1-indexed) to game state. The round increments when the player index wraps back to player 1 in `advanceRoundRobin`. Update `createInitialState` to initialise `round: 1`. Update `TurnDef` TypeScript type and JSON Schema `TurnState` if one exists. Update the loop snapshot to include round so loop detection accounts for it.

## Files to touch

- `src/game-kernel/state.js` — add `round: 1` to `state.turn` in `createInitialState`
- `src/game-kernel/scheduler.js` — `advanceRoundRobin` returns `nextRound`; `advanceTurnPhase` writes `state.turn.round`; `snapshotLoopState` includes `round`
- `src/dsl/types.ts` — add `round?: number` to `TurnDef` interface (or a new `TurnState` type if none exists)
- `schemas/dsl/game-definition.v1.json` — if turn state is schema-validated, add `round`
- `src/game-kernel/scheduler.d.ts` — update `.d.ts` if it declares turn shape

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
