# ADAOPEWEIISS-04: Add runner retry loop for productive evaluation candidates

## What

Add a retry loop in `runner.js` so that each offspring slot targets a *productive* evaluation candidate (a genuinely mutated genome), not a fallback. When `applyEvolution()` returns a `noOp` or `repairFailed` outcome for a slot, the runner retries that slot with a new operator pick.

Changes:
1. `applyEvolution()` returns per-slot `outcomes` (alongside the offspring array) so the runner can inspect which slots were unproductive.
2. `runner.js` wraps offspring generation in a retry loop per slot:
   - Pick operator → invoke → check outcome
   - If `noOp` or `repairFailed`, retry (new operator pick)
   - Configurable `maxMutationRetries` (default 3)
   - After exhausting retries, slot keeps the unmutated parent genome
3. The retry loop uses the seeded RNG for determinism.

## Files to touch

- `src/evolution-runner/evolution-applicator.js` — return per-slot `outcomes` array from `applyEvolution()`
- `src/evolution-runner/runner.js` — add retry loop around offspring generation
- `test/unit/evolution-runner/runner-retry-loop.test.mjs` (new) — test retry behavior
- `test/unit/evolution-runner/evolution-applicator-outcomes-return.test.mjs` (new) — test outcomes array return

## Out of scope

- MAP-Elites placement logic
- Halt-on-rejection logic
- Generation evaluation pipeline
- `maxAttemptsPerOffspring` hard cap (future enhancement)

## Acceptance criteria

- Test: When first attempt returns `noOp`, runner retries and a productive mutation fills the slot
- Test: When all retries exhaust, slot keeps unmutated parent genome
- Test: `maxMutationRetries` config is respected (default 3)
- Test: Retry loop is deterministic given identical seeds
- Invariant: Total offspring count equals configured `offspringCountPerGen`
- Invariant: `npm run test:unit` passes
- Invariant: `tsc -p tsconfig.json` passes with no new errors

## Dependencies

- ADAOPEWEIISS-03 (applicator handles structured outcomes)
