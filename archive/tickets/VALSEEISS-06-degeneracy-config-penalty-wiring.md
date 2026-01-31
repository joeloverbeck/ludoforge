# VALSEEISS-06: Degeneracy config + penalty wiring

**Status**: Completed

## Summary

Update `configs/degeneracy.json` with thresholds, policies, and penalties for the four new degeneracy flags. Wire the new flags into the evaluator pipeline so they affect genome rejection and fitness scoring.

## Dependencies

- VALSEEISS-05 (flag detection logic exists)

## Blocked by

- VALSEEISS-05

## Blocks

- VALSEEISS-09 (combined with VALSEEISS-08)

## Outcome

### Ticket assumptions vs reality

The ticket assumed most config, schema, and detection code still needed to be written. In practice, VALSEEISS-05 had already implemented the bulk of the work:

| Ticket assumption | Actual state |
|---|---|
| `configs/degeneracy.json` needs new thresholds, enabledFlags, policyByFlag, penalties; bump to v3 | Already at v2 with all 4 new flags fully configured. No version bump needed. |
| `schemas/config/degeneracy.schema.json` needs new threshold objects and flag enums | Already included all new entries. |
| `src/evaluation-analytics/degeneracy-config.js` needs fallback thresholds/flags | Already had all 12 flags and all threshold keys. |
| `src/evaluation-analytics/degeneracy-flags.js` needs new flag checks | Already handled all 4 new flags in `checkFlags()`. |
| `src/evaluation-analytics/degeneracy-statistics.js` needs new accumulation fields | Already accumulated all new fields. |
| `configs/fitness.json` weights should be negative (e.g. `-0.5`) | Degeneracy weights are all 0; penalty is applied multiplicatively via `computeDegeneracyPenalty()`, not through the weighted sum. |
| `high-skipped-triggers` penalty weight = 0.2 | Actual config value: 0.15 |
| `high-pass-rate` penalty weight = 0.15 | Actual config value: 0.2 |

### Actual changes (3 fixes)

1. **`src/evaluation-analytics/degeneracy-detection.js`** — `detectDegeneracy()` was missing threshold resolution for 7 keys needed by the 4 new flags. Without explicit resolution, `checkFlags()` received `undefined` for these thresholds, which `clampNumber()` silently converted to 0, breaking threshold-based detection. Added resolution for: `anyCostAbortMinCount`, `highSkippedTriggersRate`, `highSkippedTriggersMinAttempts`, `highPassRateRate`, `highPassRateMinSteps`, `highNoLegalActionsTerminationRate`, `highNoLegalActionsTerminationMinRuns`.

2. **`src/evaluation-analytics/feature-vector.js`** — `FALLBACK_DEGENERACY_ORDER` only had 7 original flags. Added the 5 missing flags: `high-skipped-effects`, `any-cost-abort`, `high-skipped-triggers`, `high-pass-rate`, `high-no-legal-actions-termination`. This is a resilience-only fix (config load provides the correct 12-flag list), but keeps the fallback accurate.

3. **`configs/fitness.json`** — Added 5 missing `degeneracy.*` weight entries (all 0): `degeneracy.high-skipped-effects`, `degeneracy.any-cost-abort`, `degeneracy.high-skipped-triggers`, `degeneracy.high-pass-rate`, `degeneracy.high-no-legal-actions-termination`.

### New/modified tests

| File | Tests added | Rationale |
|---|---|---|
| `test/unit/evaluation-analytics/degeneracy.test.mjs` | 4 penalty computation tests | Verify penalty weight for each new flag (`high-skipped-triggers`=0.15, `high-pass-rate`=0.2, `high-no-legal-actions-termination`=0.25, `any-cost-abort`=0) |
| `test/unit/evaluation-analytics/degeneracy.test.mjs` | 6 pipeline integration tests | `any-cost-abort` rejects; 3 penalize flags penalize but don't reject; compound rejection with new flags; existing flags unaffected |
| `test/unit/evaluation-analytics/feature-vector.test.mjs` | 3 tests | All 12 degeneracy flags in feature vector; new fitness weights exist; `DEFAULT_DEGENERACY_ORDER` has 12 flags |

All 118 tests pass (91 existing + 13 new).

### Architecture docs

`docs/architecture/metrics-and-fitness.md` already documents all 12 degeneracy flags, threshold configs, policies, compound rejection, and the 12-flag feature vector. No updates needed.

## File list

### Modified

| File | Change |
|------|--------|
| `src/evaluation-analytics/degeneracy-detection.js` | Add 7 missing threshold resolution keys in `detectDegeneracy()` |
| `src/evaluation-analytics/feature-vector.js` | Add 5 missing flags to `FALLBACK_DEGENERACY_ORDER` |
| `configs/fitness.json` | Add 5 missing `degeneracy.*` weight entries (all 0) |
| `test/unit/evaluation-analytics/degeneracy.test.mjs` | Add 10 tests (4 penalty + 6 pipeline integration) |
| `test/unit/evaluation-analytics/feature-vector.test.mjs` | Add 3 tests (12-flag coverage) |

## Acceptance criteria

### Tests

1. **configs/degeneracy.json validates against schema** — pre-existing, passes.
2. **any-cost-abort rejects genome in full pipeline** — new test, passes.
3. **high-skipped-triggers penalizes fitness** — new test, passes.
4. **new flags appear in feature vector** — new test, passes.
5. **compound rejection includes new penalize flags** — new test, passes.
6. **existing flags unaffected** — new test, passes.

### Invariants

- `configs/degeneracy.json` validates against `schemas/config/degeneracy.schema.json` ✓
- `configs/metrics-core.json` validates against its schema ✓
- `configs/fitness.json` validates against its schema ✓
- `any-cost-abort` never appears in penalty computation (reject-only) ✓
- Feature vector includes all 12 degeneracy flags in stable order ✓
