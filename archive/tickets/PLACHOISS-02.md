# PLACHOISS-02: Remove `selector.random` from the DSL

**Status:** DONE
**Dependencies:** None
**Blocks:** PLACHOISS-03

---

## What

Remove the `random` boolean from `SelectorDef`. Randomness in target selection belongs to agent policy, not kernel binding.

## Files Touched

- `schemas/dsl/game-definition.v1.json` — removed `random` from SelectorDef properties
- `src/dsl/types.ts` — removed `random?: boolean` from SelectorDef
- `src/game-kernel/selectors.js` — removed shuffle blocks in `resolveSelector()` and `resolvePlayerSelector()`
- `test/unit/game-kernel/selectors.test.mjs` — replaced random-shuffle test with deterministic-order tests
- `test/unit/game-kernel/player-selector.test.mjs` — replaced random-shuffle test with deterministic-order test
- `test/unit/dsl/schema.test.mjs` — added test: schema rejects selector with `random` property
- `docs/architecture/simulation-engine.md` — removed "random shuffle" from selector description

## Out of Scope

No changes to the `random` agent kind or `random_draw` scheduler. No params introduction.

## Acceptance Criteria

- [x] Schema rejects selector with `"random": true`.
- [x] `resolveSelector()` returns deterministic order.
- [x] All non-random selector behavior unchanged.
- [x] `npm run test:unit` passes (1434 tests).
- [x] `npm run test:integration` passes (183 tests).
- [x] `tsc -p tsconfig.json` passes.

## Outcome

**Changed vs originally planned:** The ticket's "Files to Touch" section was missing `docs/architecture/simulation-engine.md`, which referenced "random shuffle (via `context.rng`)" in the selector description. This was added to the scope and fixed. All other changes matched the original plan exactly. No mutation operators or E2E fixtures referenced `selector.random`, so no additional cleanup was needed beyond the four source/test files listed.
