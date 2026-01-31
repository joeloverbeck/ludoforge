# TUIGAMPLA-02: Async eval-analytics callers + e2e tests

**Status:** TODO
**Risk:** MEDIUM
**Dependencies:** TUIGAMPLA-01
**Blocks:** None

---

## What

Update all evaluation-analytics functions that call simulation engine APIs to `await` the now-async return values. Update e2e tests similarly.

## Files to Touch

Source files:
- `src/evaluation-analytics/skill-expression.js` — `await runBatchSimulations()` (lines ~153-154), make calling fn async
- `src/evaluation-analytics/extended/policy-sensitivity.js` — `await runBatchSimulations()` (lines ~245, 256), make calling fn async
- `src/evaluation-analytics/extended/decision-quality/meaningful-choice.js` — `await runRollout()` (line ~107), make calling fn async

Test files:
- `test/e2e/simulation-correctness.e2e.test.mjs` — `await runSimulation()`
- `test/e2e/state-transition.e2e.test.mjs` — `await runSimulation()`
- `test/e2e/preference-model-update.e2e.test.mjs` — `await runSimulation()`

## Out of Scope

Simulation-engine internals (done in TUIGAMPLA-01), TUI code, evolutionary-engine mutation/crossover, game-kernel.

## Acceptance Criteria

- `npm run test:unit` passes.
- `npm run test:e2e` passes.
- `tsc -p tsconfig.json` passes.
- Evaluation metrics produce identical results for same inputs.
