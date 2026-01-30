# ACTSELTURSTRPRI-14: Add `simultaneous` scheduler (Wave 2)

## Status

Completed (2026-01-30)

## What

Add a `simultaneous` scheduler type. All players plan actions in the same phase (secret/parallel), then all actions resolve in a defined order. Schema additions to `TurnDef`: `resolution: { order: "by_player_id" | "random" }`. Implement `advanceSimultaneous` in the scheduler for phase/turn/round progression. Action collection happens in the simulation loop (the scheduler does not select actions).

In the simulation engine, the `simultaneous` scheduler changes the loop flow: instead of one player acting per step, all players select actions (via their agent policies), then all actions apply in resolution order.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `"simultaneous"` to `TurnDef.scheduler` enum; add optional `resolution` object
- `src/dsl/types.ts` — add `"simultaneous"` to scheduler union; add `resolution?` field
- `src/dsl/semantic.js` — validate `simultaneous` config fields (resolution order shape)
- `src/game-kernel/scheduler.js` — add `advanceSimultaneous(definition, state)` function; update dispatch in `advanceTurnPhase`
- `src/simulation-engine/loop.js` — handle simultaneous planning/resolution flow (collect all player actions, then apply all)
- `test/unit/**` — add coverage for simultaneous schema, scheduling, and simulation flow

## Out of scope

- `random_draw` scheduler (ACTSELTURSTRPRI-15)
- `reactive` scheduler (Wave 3)
- Private zone visibility transitions (model via convention: private zones during planning, revealed at resolution)
- Wave 1 primitives (separate tickets)

## Acceptance criteria

- Test: In a 2-player simultaneous game, both players select actions before any resolve
- Test: Resolution order follows `by_player_id` (P1 first, then P2)
- Test: `random` resolution order is deterministic with seeded RNG
- Test: Phase cycling works within simultaneous turns
- Test: Round boundary detection works
- Test: Integration with `start_round`/`end_round` triggers
- Invariant: Schema validates definitions using `simultaneous` scheduler
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None (round tracking and round triggers already landed; this ticket consumes them).

## Outcome

- Implemented `simultaneous` scheduling in the simulation loop with plan-then-resolve ordering and deterministic random resolution via seeded RNG.
- Added schema/types/semantic validation for `simultaneous` + `resolution` and new unit tests for schema, scheduler flow, and simulation behavior.
- Updated simulation-engine architecture docs to describe the new scheduler flow; no `turn-advance.js` changes were needed.
