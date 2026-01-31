# TUIGAMPLA-02: Async eval-analytics callers + e2e tests

**Status:** COMPLETED
**Risk:** MEDIUM
**Dependencies:** TUIGAMPLA-01
**Blocks:** None

---

## What

Update all evaluation-analytics functions that call simulation engine APIs to `await` the now-async return values. Update e2e tests similarly.

## Assumptions Reassessment

The original ticket listed incorrect file paths and assumed the work was not yet done. After investigation:

1. **File paths were wrong.** The ticket listed:
   - `src/evaluation-analytics/skill-expression.js` — actual path is `src/evaluation-analytics/metrics/skill-expression.js`
   - `src/evaluation-analytics/extended/policy-sensitivity.js` — actual path is `src/evaluation-analytics/metrics/extended/policy-sensitivity.js`
   - `src/evaluation-analytics/extended/decision-quality/meaningful-choice.js` — actual path is `src/evaluation-analytics/metrics/extended/decision-quality/meaningful-choice.js`

2. **All source files already have `await` and `async`.** TUIGAMPLA-01 (or prior work) already converted:
   - `computeSkillExpressionMetric()` — async, awaits `runBatchSimulations()` at lines 153-154
   - `computePolicySensitivity()` — async, awaits `runBatchSimulations()` at lines 245, 256
   - `computeMeaningfulChoice()` — async, awaits `runRollout()` at line 107
   - `createEvaluator()` — already awaits `engine.runBatch()` at line 79

3. **All e2e test files already have `await`.** The three test files listed:
   - `test/e2e/simulation-correctness.e2e.test.mjs` — already `await runSimulation()`
   - `test/e2e/state-transition.e2e.test.mjs` — already `await runSimulation()`
   - `test/e2e/preference-model-update.e2e.test.mjs` — already `await runSimulation()`

## Corrected Scope

**No code changes required.** All work described in this ticket was already completed as part of TUIGAMPLA-01's async simulation loop refactoring. The async conversion was applied consistently across the entire call chain, including evaluation-analytics callers and e2e tests.

## Acceptance Criteria

- [x] `npm run test:unit` passes (1468 tests, 0 failures).
- [x] `npm run test:e2e` passes (120 tests, 0 failures).
- [x] `tsc -p tsconfig.json` passes (clean).
- [x] Evaluation metrics produce identical results for same inputs (no behavioral change from async conversion).

## Out of Scope

Simulation-engine internals (done in TUIGAMPLA-01), TUI code, evolutionary-engine mutation/crossover, game-kernel.

## Outcome

**Originally planned:** Convert 3 source files and 3 e2e test files to async/await for simulation engine calls.

**Actually changed:** Nothing. Investigation revealed that:
- The ticket's file paths were incorrect (missing `/metrics/` directory segment).
- All 3 source functions were already `async` with `await` on simulation calls.
- All 3 e2e test files already used `await` on `runSimulation()` calls.
- All acceptance criteria (unit tests, e2e tests, type checking) already pass.

The entire scope of this ticket was completed as part of TUIGAMPLA-01's async simulation loop refactoring, which converted the full call chain consistently.
