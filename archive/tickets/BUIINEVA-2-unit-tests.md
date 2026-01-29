# BUIINEVA-2: Unit tests for factory ✅ COMPLETED

## Summary

Write comprehensive unit tests for `createEvaluator` covering the happy path, return shape, determinism, custom options, and error paths.

## Files to Create

| File | Purpose |
|------|---------|
| `test/unit/evaluation-analytics/create-evaluator.test.mjs` | Unit tests for evaluator factory (16 tests) |
| `test/unit/evaluation-analytics/create-evaluator-adapter-failure.test.mjs` | Log adapter failure path test (requires `mock.module()`) |

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
- Use real production modules (no mocking of internal functions) **except** test case 11 (log adapter failure), which requires `node:test` `mock.module()` to stub `adaptSimulationLog` — the failure path cannot be triggered through normal production usage since the evaluator always constructs valid log adapter input
- Use fixture genomes from `test/e2e/fixtures/` (e.g., `choice-game.json`) or inline minimal valid game definitions
- Seeded RNG for determinism tests

## Out of Scope

- No production code changes
- No E2E or integration tests
- No changes to existing test files

## Acceptance Criteria

- [x] `node --test test/unit/evaluation-analytics/create-evaluator.test.mjs` passes
- [x] `npm run test:unit` passes (all 358 tests, 0 failures)
- [x] Tests use `node:test` + `node:assert/strict` (no Jest/Mocha/Vitest)

## Invariants

1. Tests use real production modules — no mocking of `computeCoreMetrics`, `detectDegeneracy`, etc. Exception: test case 11 uses `node:test` `mock.module()` to stub `adaptSimulationLog` for the error path
2. Tests use `node:test` and `node:assert/strict` exclusively
3. Fixture genomes are valid game definitions that pass JSON Schema validation

## Dependencies

- BUIINEVA-1 (factory implementation)

## Outcome

### What was actually changed vs originally planned

**Planned**: Create `test/unit/evaluation-analytics/create-evaluator.test.mjs` with 12 test cases, no production code changes, no mocking.

**Actual**:
- The main test file already existed with 16 tests covering cases 1-10, 12, plus 3 bonus tests (immutability, custom agentFactory, missing descriptor key defaults). No changes needed to the main test file.
- **Created** `test/unit/evaluation-analytics/create-evaluator-adapter-failure.test.mjs` for case 11 (log adapter failure path), using `node:test` `mock.module()` because the failure cannot be triggered through normal production flow.
- **Modified** `package.json`: Added `--experimental-test-module-mocks` flag to `test:unit` script to enable `mock.module()` support.
- **Corrected ticket assumptions**: The original ticket assumed "no mocking" was possible for all 12 cases. The log adapter failure path requires module-level mocking since `createEvaluator` always constructs valid adapter input internally.
- **Corrected fixture path**: Tests use `test/e2e/fixtures/choice-game.json`, not `test/unit/fixtures/dsl/`.

### Files created/modified
| File | Change |
|------|--------|
| `test/unit/evaluation-analytics/create-evaluator-adapter-failure.test.mjs` | New: log adapter failure path test |
| `package.json` | Added `--experimental-test-module-mocks` to `test:unit` script |

### Test results
- 358 unit tests, 0 failures
- 17 tests across both evaluator test files (16 main + 1 adapter failure)
