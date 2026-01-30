# ACTSELTURSTRPRI-15: Add `random_draw` scheduler (Wave 2)

**Status**: completed

## What

Add a `random_draw` scheduler type. At each step, a player is selected uniformly at random using the seeded RNG. The selected player takes an action, then a new random draw occurs. Schema: `{ scheduler: "random_draw" }`. No additional configuration fields needed. The scheduler must integrate with the simulation engine's seeded RNG for reproducibility.

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `"random_draw"` to `TurnDef.scheduler` enum
- `src/dsl/types.ts` — add `"random_draw"` to scheduler union
- `src/game-kernel/scheduler.js` — add `advanceRandomDraw(definition, state, rng)` function; update dispatch in `advanceTurnPhase`; accept RNG via `options.rng`
- `src/simulation-engine/turn-advance.js` — pass RNG from loop context through to `advanceTurnPhase` via options
- `src/simulation-engine/loop.js` — pass `rng` into `advanceAndCheck` so it reaches the scheduler

### Corrected assumptions (vs. original ticket)

- **Original**: "pass seeded RNG to scheduler" via `loop.js` or `turn-advance.js`
- **Actual**: The call chain is `loop.js` → `advanceAndCheck()` in `turn-advance.js` → `advanceTurnPhase()` in `scheduler.js`. RNG must flow through all three layers via an options object. `advanceTurnPhase` already accepts `options`; `advanceAndCheck` needs a new `rng` parameter.
- **Original**: mentioned `advanceRandomDraw(definition, state, rng)` with RNG as third argument
- **Actual**: follows internal pattern where scheduler-specific advance functions take `(definition, state)` plus any extra args. RNG is passed as a third parameter to `advanceRandomDraw` specifically, extracted from `options.rng` inside `advanceTurnPhase`.

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
- Test: Round boundary detection works (all players have acted at least once → round increments)
- Invariant: Schema validates definitions using `random_draw` scheduler
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-01 (round tracking)

## Outcome

### What changed vs. originally planned

The implementation followed the ticket plan exactly after correcting two assumptions:

1. **RNG threading**: The ticket originally described RNG passing loosely. The actual implementation threads `rng` through `loop.js` → `advanceAndCheck()` (via destructured options) → `advanceTurnPhase()` (via `options.rng`) → `advanceRandomDraw(definition, state, rng)`.

2. **No semantic validation needed**: `random_draw` has no extra config fields, so no changes to `src/dsl/semantic.js` were required (unlike `token_holder` or `simultaneous`).

### Files modified

- `schemas/dsl/game-definition.v1.json` — added `"random_draw"` to scheduler enum
- `src/dsl/types.ts` — added `"random_draw"` to TurnDef.scheduler union
- `src/game-kernel/scheduler.js` — added `advanceRandomDraw()`, updated whitelist and dispatch
- `src/simulation-engine/turn-advance.js` — added `rng` to destructured options, forwarded to `advanceTurnPhase`
- `src/simulation-engine/loop.js` — passed `rng` into both `advanceAndCheck` call sites
- `docs/architecture/simulation-engine.md` — added `random_draw` to scheduler documentation

### Tests added

- 8 new tests in `test/unit/game-kernel/scheduler.test.mjs` (random_draw scheduler describe block)
- 1 new test in `test/unit/dsl/schema.test.mjs` (accepts random_draw scheduler)
- 1 new type check in `test/unit/dsl/types.test.ts` (randomDrawDefinition)

All 1257 unit tests pass. `tsc` passes.
