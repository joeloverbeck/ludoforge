# BUIINEVA-2: Unit tests for factory

## Summary

Write comprehensive unit tests for `createEvaluator` covering the happy path, return shape, determinism, custom options, and error paths.

## Files to Create

| File | Purpose |
|------|---------|
| `test/unit/evaluation-analytics/create-evaluator.test.mjs` | Unit tests for evaluator factory |

## Depends On

- **BUIINEVA-1** — factory must exist before tests can run

## Scope

Test cases to implement:

1. **Happy path** — factory returns `{ evaluator }` where evaluator is a function
2. **Return shape** — evaluator returns `{ fitness, descriptors, diagnostics }` for a valid genome
3. **Fitness is finite** — `fitness` is a finite number for valid genomes
4. **Descriptors shape** — `descriptors` is an object with keys matching `descriptorKeys` (default: `["agency", "variety"]`)
5. **Custom descriptorKeys** — passing custom `descriptorKeys` extracts those keys from the feature vector
6. **Core metrics in diagnostics** — `diagnostics.coreMetrics` is a non-empty array
7. **Feature vector in diagnostics** — `diagnostics.featureVector` is present
8. **Degeneracy in diagnostics** — `diagnostics.degeneracy` (degeneracy report) is present
9. **Determinism with seed** — two evaluations with the same `seed` produce identical `fitness` and `descriptors`
10. **Extended metrics toggle** — when `includeExtendedMetrics: true`, `diagnostics.extendedMetrics` is a non-empty array; when `false`, it is `null`
11. **Log adapter failure path** — when the log adapter returns `ok: false`, evaluator returns `{ fitness: null, descriptors: null, diagnostics: { logAdapterOk: false } }`
12. **simulationCount in diagnostics** — `diagnostics.simulationCount` matches `simulationRuns` option

### Test Conventions

- Use `node:test` (`describe`, `it`) and `node:assert/strict`
- Use real production modules (no mocking of internal functions)
- Use fixture genomes from `test/unit/fixtures/dsl/` or inline minimal valid game definitions
- Seeded RNG for determinism tests

## Out of Scope

- No production code changes
- No E2E or integration tests
- No changes to existing test files

## Acceptance Criteria

- [ ] `node --test test/unit/evaluation-analytics/create-evaluator.test.mjs` passes
- [ ] `npm run test:unit` passes (all existing + new tests)
- [ ] Tests use `node:test` + `node:assert/strict` (no Jest/Mocha/Vitest)

## Invariants

1. Tests use real production modules — no mocking of `computeCoreMetrics`, `detectDegeneracy`, etc.
2. Tests use `node:test` and `node:assert/strict` exclusively
3. Fixture genomes are valid game definitions that pass JSON Schema validation

## Dependencies

- BUIINEVA-1 (factory implementation)
