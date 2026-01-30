# ACTSELTURSTRPRI-15: Add `random_draw` scheduler (Wave 2)

## What

Add a `random_draw` scheduler type. At each step, a player is selected uniformly at random using the seeded RNG. The selected player takes an action, then a new random draw occurs. Schema: `{ scheduler: "random_draw" }`. No additional configuration fields needed. The scheduler must integrate with the simulation engine's seeded RNG for reproducibility.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `"random_draw"` to `TurnDef.scheduler` enum
- `src/dsl/types.ts` — add `"random_draw"` to scheduler union
- `src/game-kernel/scheduler.js` — add `advanceRandomDraw(definition, state, rng)` function; update dispatch in `advanceTurnPhase`; accept RNG via options
- `src/simulation-engine/loop.js` or `turn-advance.js` — pass seeded RNG to scheduler

## Out of scope

- `simultaneous` scheduler (ACTSELTURSTRPRI-14)
- `reactive` scheduler (Wave 3)
- Weighted random draw (uniform only)
- Mutation operators for random_draw

## Acceptance criteria

- Test: With seed S, player selection sequence is deterministic
- Test: Over many steps, all players are eventually selected
- Test: Same seed produces identical game trajectory
- Test: Different seeds produce different sequences
- Test: Phase cycling still works
- Test: Round boundary detection works (all players have acted at least once → round increments, or define round as N steps)
- Invariant: Schema validates definitions using `random_draw` scheduler
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-01 (round tracking)
