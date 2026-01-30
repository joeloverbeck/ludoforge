# ACTSELTURSTRPRI-17: Add `choose` effect (Wave 2)

## What

Add a new effect kind `choose` that presents the acting player with a choice between multiple effect branches. Schema: `{ kind: "choose", options: Effect[][], count: number }`. The player (or their agent policy in simulation) selects `count` option(s) from the available `options` array, and only those effects are applied. This enables mechanics like "choose one of these three bonuses".

In the simulation engine, the agent policy must handle `choose` effects by selecting from the options (e.g., randomly, heuristically, or via a dedicated choice policy).

## Files to touch

- `schemas/dsl/game-definition.v1.json` — add `choose` to Effect oneOf with `options` (array of Effect arrays) and `count` (integer, default 1)
- `src/dsl/types.ts` — add `{ kind: "choose"; options: Effect[][]; count?: number }` to Effect union
- `src/game-kernel/effect-application.js` — add `applyChoose()` handler; uses `context.rng` to select `count` options from `options` array and applies their effects recursively
- `src/simulation-engine/loop.js` — thread `rng` through `effectContext` so `applyChoose()` can access it for deterministic selection
- `src/simulation-engine/step-execution.js` — forward `rng` from caller context into the effect context passed to `applyEffect`

## Out of scope

- `set_turn_order` effect (ACTSELTURSTRPRI-16)
- `shuffle` effect (ACTSELTURSTRPRI-18)
- Human interface for choose (simulation agents only)
- Mutation operators for choose effects

## Acceptance criteria

- Test: `choose` with 2 options and `count: 1` applies exactly one option's effects
- Test: Agent policy selects deterministically with seeded RNG
- Test: `choose` with `count: 2` applies two distinct options
- Test: `choose` with 0 options is a no-op
- Test: Nested `choose` inside `conditional` works
- Invariant: Schema validates `choose` effects
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None (independent effect kind)

## Status

**COMPLETED**

## Outcome

### What was actually changed vs originally planned

**Planned**: Modify 4 files (schema, types, effect-application, loop.js).
**Actual**: Modified 4 files, but the loop.js change was different than anticipated.

- The ticket originally described `loop.js` as "ensure agent policies can handle choice resolution." In practice, agent policies (which handle action selection) don't participate in mid-effect choices. Instead, the `choose` effect handler uses `context.rng` directly for deterministic selection. The actual loop.js change was threading `rng` into the `effectContext` object so it reaches `applyChoose()`.
- `step-execution.js` did not need explicit changes because the `...context` spread already forwards `rng` from the caller.

### Files modified
1. `schemas/dsl/game-definition.v1.json` — added `choose` to Effect `oneOf`
2. `src/dsl/types.ts` — added `choose` variant to Effect union type
3. `src/game-kernel/effect-application.js` — added `applyChoose()` function and dispatch
4. `src/simulation-engine/loop.js` — added `rng` to `effectContext` in both standard and simultaneous loops

### Tests added
1. `test/unit/game-kernel/choose-effect.test.mjs` — 8 tests covering all acceptance criteria
2. `test/unit/dsl/schema.test.mjs` — 2 new tests for `choose` schema validation
