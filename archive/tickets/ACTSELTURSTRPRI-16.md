# ACTSELTURSTRPRI-16: Add `set_turn_order` effect (Wave 2) ✅ COMPLETED

## What

Add a new effect kind `set_turn_order` that dynamically reorders the player sequence for the current or next round. Schema: `{ kind: "set_turn_order", order: "by_variable", variable: string, direction: "asc" | "desc" }`. This effect is typically fired from `end_round` or `start_round` triggers to implement auction-based, stat-based, and pass-order turn ordering.

The effect writes a `turnOrder` array into `state.turn` that the `round_robin` scheduler (and others) consult instead of the default 1..N player ordering.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `set_turn_order` to Effect oneOf with `order`, `variable`, `direction` fields
- `src/dsl/types.ts` — add `{ kind: "set_turn_order"; order: "by_variable"; variable: string; direction: "asc" | "desc" }` to Effect union
- `src/game-kernel/effect-application.js` — add `case "set_turn_order"` handler; reads per-player variable values, sorts by direction, writes `state.turn.turnOrder` array
- `src/game-kernel/scheduler.js` — modify `advanceRoundRobin` (and other schedulers) to consult `state.turn.turnOrder` array if present, instead of default 1..N ordering
- `src/game-kernel/state.js` — optionally initialise `state.turn.turnOrder` to null

## Out of scope

- `choose` effect (ACTSELTURSTRPRI-17)
- `shuffle` effect (ACTSELTURSTRPRI-18)
- Mutation operators using set_turn_order

## Acceptance criteria

- Test: `set_turn_order` with `direction: "asc"` sorts players by ascending variable value
- Test: `set_turn_order` with `direction: "desc"` sorts players by descending variable value
- Test: After `set_turn_order`, `round_robin` scheduler follows the custom order
- Test: Tie-breaking: equal variable values → lower player ID first
- Test: `set_turn_order` in an `end_round` trigger takes effect in the next round
- Test: Default behavior (no `turnOrder` set) is unchanged from current round_robin
- Invariant: Schema validates `set_turn_order` effects
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-01 (round tracking)
- ACTSELTURSTRPRI-02 (round triggers, for typical usage)

## Outcome

All changes matched the original plan. No discrepancies found between ticket assumptions and codebase.

**Files changed:**
- `schemas/dsl/game-definition.v1.json` — added `set_turn_order` variant to Effect oneOf
- `src/dsl/types.ts` — added `set_turn_order` to Effect union type
- `src/game-kernel/state.js` — initialised `state.turn.turnOrder` to `null`
- `src/game-kernel/effect-application.js` — added `applySetTurnOrder()` handler; sorts players by variable value with direction and tie-breaking by player ID
- `src/game-kernel/scheduler.js` — extracted `resolveNextPlayerRoundRobin()` to consult `turnOrder` array; preserved `turnOrder` through state transitions and loop detection snapshots

**Tests added:** `test/unit/game-kernel/set-turn-order.test.mjs` (10 tests across 4 suites)
