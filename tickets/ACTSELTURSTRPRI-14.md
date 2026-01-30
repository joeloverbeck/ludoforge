# ACTSELTURSTRPRI-14: Add `simultaneous` scheduler (Wave 2)

## What

Add a `simultaneous` scheduler type. All players plan actions in the same phase (secret/parallel), then all actions resolve in a defined order. Schema additions to `TurnDef`: `resolution: { order: "by_player_id" | "random" }`. Implement `advanceSimultaneous` in the scheduler. The scheduler collects one action from each player before advancing to resolution.

In the simulation engine, the `simultaneous` scheduler changes the loop flow: instead of one player acting per step, all players select actions (via their agent policies), then all actions apply in resolution order.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `"simultaneous"` to `TurnDef.scheduler` enum; add optional `resolution` object
- `src/dsl/types.ts` — add `"simultaneous"` to scheduler union; add `resolution?` field
- `src/game-kernel/scheduler.js` — add `advanceSimultaneous(definition, state)` function; update dispatch in `advanceTurnPhase`
- `src/simulation-engine/loop.js` — handle simultaneous planning/resolution flow (collect all player actions, then apply all)
- `src/simulation-engine/turn-advance.js` — handle simultaneous advancement result

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

- ACTSELTURSTRPRI-01 (round tracking)
- ACTSELTURSTRPRI-02 (round triggers)
