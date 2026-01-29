# BUIINEVA-5: E2E test rewrite

## Summary

Replace mock evaluators with `createEvaluator()` in the E2E evolution pipeline tests. Replace phase-ordering assertions with output-shape assertions.

## Files to Modify

| File | Change |
|------|--------|
| `test/e2e/evolution-pipeline.e2e.test.mjs` | Replace mock evaluators with `createEvaluator()`, rewrite assertions |

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
   - `descriptors` is an object with expected keys
   - `diagnostics` is an object
4. `result.nextGeneration.length === population.length` — MAP-Elites produces next generation

### Rewrite determinism test

- Use `createEvaluator({ seed: N })` instead of mock evaluator
- Verify two runs with same seed produce identical `evaluated` and `nextIds`

### Rewrite safety cutoffs test

- Use `createEvaluator()` instead of mock evaluator
- Verify diagnostics include degeneracy information

### Keep unchanged

- **"invalid seeds" test** — still uses a mock evaluator (tests that invalid genomes are rejected before evaluation runs)
- **`mock-fitness.e2e.test.mjs`** — tests the mock helper itself, not the real pipeline
- **`preference-model-update.e2e.test.mjs`** — already uses real modules directly

## Out of Scope

- No changes to `mock-fitness.e2e.test.mjs`
- No changes to `preference-model-update.e2e.test.mjs`
- No production code changes

## Acceptance Criteria

- [ ] `npm run test:e2e` passes
- [ ] `node --test test/e2e/evolution-pipeline.e2e.test.mjs` passes
- [ ] Invalid seeds test still verifies evaluator is never called
- [ ] No mock evaluator remains in happy path, safety, or determinism tests

## Invariants

1. No mock evaluator in happy path / safety / determinism tests
2. Evaluation shape is `{ evaluator }` from `createEvaluator()`
3. Invalid seeds test still verifies no evaluation occurs for invalid genomes

## Dependencies

- BUIINEVA-4 (CLI changes)
