# ADAOPEWEIISS-04: Add retry loop for productive evaluation candidates

**Status: COMPLETED**

## What

Add a retry loop inside `applyEvolution()` so that each offspring slot targets a *productive* evaluation candidate (a genuinely mutated genome), not a fallback. When `mutateAndRepairGenome()` returns a `noOp` or `repairFailed` outcome for a slot, the applicator retries that slot with a new operator pick.

Changes:
1. `applyEvolution()` gains a per-slot retry loop around `mutateAndRepairGenome()`:
   - Call mutation → check outcome
   - If `noOp` or `repairFailed`, record telemetry and retry (new operator pick via selector)
   - Configurable `maxMutationRetries` (default 3), passed through options
   - After exhausting retries, slot keeps the unmutated parent genome
2. `applyEvolution()` returns per-slot `outcomes` array (alongside `population` and `operatorNames`) so the runner can inspect which slots were unproductive.
3. `runner.js` passes `maxMutationRetries` from runner config to `applyEvolution()`.
4. The retry loop uses the seeded RNG for determinism.

## Assumptions corrected during reassessment

- **Retry loop location**: The original ticket placed the retry loop in `runner.js`. In reality, `runner.js` calls `applyEvolution()` which iterates over all parents internally. Per-slot mutation outcome visibility is only available inside `applyEvolution()` where `mutateAndRepairGenome()` is called. The retry loop belongs in `evolution-applicator.js`, not `runner.js`.
- **Runner role**: `runner.js` only needs to pass `maxMutationRetries` config through to `applyEvolution()`. It does not need its own retry loop.
- **Outcomes return**: The `outcomes` array is added to `applyEvolution()`'s return value alongside existing `population` and `operatorNames`.

## Files to touch

- `src/evolution-runner/evolution-applicator.js` — add per-slot retry loop and return `outcomes` array
- `src/evolution-runner/runner.js` — pass `maxMutationRetries` from config to `applyEvolution()`
- `test/unit/evolution-runner/evolution-applicator-retry.test.mjs` (new) — test retry behavior
- `test/unit/evolution-runner/evolution-applicator-outcomes.test.mjs` — strengthen with outcomes return tests

## Out of scope

- MAP-Elites placement logic
- Halt-on-rejection logic
- Generation evaluation pipeline
- `maxAttemptsPerOffspring` hard cap (future enhancement)

## Acceptance criteria

- [x] Test: When first attempt returns `noOp`, applicator retries and a productive mutation fills the slot
- [x] Test: When all retries exhaust, slot keeps unmutated parent genome
- [x] Test: `maxMutationRetries` config is respected (default 3)
- [x] Test: Retry loop is deterministic given identical seeds
- [x] Invariant: Total offspring count equals population length
- [x] Invariant: `npm run test:unit` passes (1248/1248)
- [x] Invariant: `tsc -p tsconfig.json` passes with no new errors

## Dependencies

- ADAOPEWEIISS-03 (applicator handles structured outcomes) ✅ completed

## Outcome

**What changed vs originally planned:**

The retry loop was placed in `evolution-applicator.js` (not `runner.js` as originally planned) because that's where `mutateAndRepairGenome()` is called per-genome and outcomes are visible. The runner only passes `maxMutationRetries` config through.

**Changes made:**

- `src/evolution-runner/evolution-applicator.js`: Added per-slot retry loop around `mutateAndRepairGenome()` in the selector path. On `noOp` or `repairFailed`, telemetry is recorded and the loop retries up to `maxMutationRetries` (default 3). On exhaustion, the pre-mutation parent genome is kept. Added `outcomes` array to the return value (`"ok"`, `"noOp"`, `"repairFailed"`, `"exhausted"`, or `null`).
- `src/evolution-runner/runner.js`: Reads `maxMutationRetries` from `config.evolution.mutation.maxMutationRetries` and passes it to `applyEvolution()`.
- `test/unit/evolution-runner/evolution-applicator-retry.test.mjs` (new): 11 tests covering retry-on-noOp, retry-on-repairFailed, exhaustion fallback, maxMutationRetries config, default retries, telemetry across retries, population size invariant, outcomes array shape, null outcome for no-mutation, and determinism.
- `test/unit/evolution-runner/evolution-applicator-outcomes.test.mjs`: Added 2 tests for `outcomes` return value. Updated 6 existing tests to use `maxMutationRetries: 0` to test single-attempt behavior without retry interference.

**Verification:** 1248/1248 unit tests pass. `tsc` clean.
