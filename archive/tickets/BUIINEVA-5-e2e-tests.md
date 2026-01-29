# BUIINEVA-5: E2E test rewrite

**Status: COMPLETED**

## Summary

Replace mock evaluators with `createEvaluator()` in the E2E evolution pipeline tests. Replace phase-ordering assertions with output-shape assertions.

## Files Modified

| File | Change |
|------|--------|
| `test/e2e/evolution-pipeline.e2e.test.mjs` | Replaced mock evaluators with `createEvaluator()`, rewrote assertions |
| `schemas/simulation-engine/simulation-result.schema.json` | Added `scope` to `ResolvedRef` (schema bug fix) |
| `test/unit/simulation-engine/trace-schema.test.mjs` | Updated unit test for `ResolvedRef` to accept `scope` |

## Depends On

- **BUIINEVA-4** — CLI must use built-in evaluator before E2E tests can validate the full pipeline

## Scope

### Replace mock evaluators

- Import `createEvaluator` from `../../src/evaluation-analytics/create-evaluator.js`
- Remove `createMockSimulation`, `createMockHumanEval`, `createMockFitness` imports and usage
- Remove `timeline`, `seenPhases`, `perCandidateSteps`, `evaluationArtifacts` tracking
- Remove `recordPhase()` / `recordCandidateStep()` functions

### Rewrite happy path test

Replace phase-ordering assertions with output-shape assertions:

1. `result.evaluated.length === population.length` — all genomes evaluated
2. `result.rejected.length === 0` — valid seeds are not rejected
3. Each `result.evaluated[i]` has:
   - `fitness` is a finite number
   - `descriptors` is an object with `agency` and `variety` keys
   - `diagnostics` is an object
4. `result.nextGeneration.length >= 1` — MAP-Elites produces at least one elite

### Rewrite determinism test

- Use `createEvaluator({ seed: N })` instead of mock evaluator
- Verify two runs with same seed produce identical `evaluated` and `nextIds`

### Rewrite safety cutoffs test

- Use `createEvaluator()` instead of mock evaluator
- Verify diagnostics include degeneracy report with `flags` array
- Verify `logAdapterOk` and `simulationCount` are present

### Keep unchanged

- **"invalid seeds" test** — still uses a mock evaluator (tests that invalid genomes are rejected before evaluation runs)
- **`mock-fitness.e2e.test.mjs`** — tests the mock helper itself, not the real pipeline
- **`preference-model-update.e2e.test.mjs`** — already uses real modules directly

## Corrections to Original Ticket Assumptions

1. **MAP-Elites descriptors**: Original ticket used `{ id: "length" }` and `{ id: "randomness" }` — these were mock descriptors. `createEvaluator()` defaults to `["agency", "variety"]`, so the MAP-Elites config was updated to use `{ id: "agency" }` and `{ id: "variety" }`.

2. **`nextGeneration.length` assertion**: Original ticket assumed `nextGeneration.length === population.length`. MAP-Elites is niche-based — two genomes mapping to the same cell means only the fitter survives. Changed to `>= 1`.

3. **"No production code changes"**: The `ResolvedRef` schema in `simulation-result.schema.json` was missing the `scope` property that `effects.js` emits on resolved targets (from MOTINEVO work). This schema mismatch caused `adaptSimulationLog` to fail for all genomes, blocking the real evaluator entirely. A one-line schema fix was required.

## Out of Scope

- No changes to `mock-fitness.e2e.test.mjs`
- No changes to `preference-model-update.e2e.test.mjs`

## Acceptance Criteria

- [x] `npm run test:e2e` passes (34/34)
- [x] `node --test test/e2e/evolution-pipeline.e2e.test.mjs` passes (4/4)
- [x] Invalid seeds test still verifies evaluator is never called
- [x] No mock evaluator remains in happy path, safety, or determinism tests
- [x] `npm run test:unit` passes (408/408)
- [x] `tsc -p tsconfig.json` passes

## Invariants

1. No mock evaluator in happy path / safety / determinism tests
2. Evaluation shape is `{ evaluator }` from `createEvaluator()`
3. Invalid seeds test still verifies no evaluation occurs for invalid genomes

## Dependencies

- BUIINEVA-4 (CLI changes)

## Outcome

### What was actually changed vs originally planned

**Planned**: Modify only `test/e2e/evolution-pipeline.e2e.test.mjs` — replace mock evaluators with `createEvaluator()` and rewrite assertions.

**Actual**: Three files changed:

1. **`test/e2e/evolution-pipeline.e2e.test.mjs`** — As planned. Replaced all mock evaluator imports and inline evaluators in happy path, safety cutoffs, and determinism tests with `createEvaluator()`. Replaced timeline/phase-ordering assertions with output-shape assertions. MAP-Elites config updated to use `agency`/`variety` descriptors matching the evaluator defaults. Invalid seeds test kept with mock evaluator.

2. **`schemas/simulation-engine/simulation-result.schema.json`** — Bug fix. Added `scope` property to `ResolvedRef` definition. The MOTINEVO-05 work added `scope` to the resolved target in `effects.js`, but the schema (added in MOTINEVO-04) did not include it. This caused `adaptSimulationLog` validation to reject all simulation results, making `createEvaluator()` return `fitness: null` for every genome.

3. **`test/unit/simulation-engine/trace-schema.test.mjs`** — Updated the "rejects unknown properties on ResolvedRef" test to use a genuinely unknown property (`bogus`) instead of `scope`. Added a new "accepts scope property on ResolvedRef" positive test.
