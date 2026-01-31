# VALSEEISS-09: NonFiniteMetrics degeneracy flag

**Status: COMPLETED**

## Summary

Add a `non-finite-metrics` degeneracy flag that fires when a genome has non-finite metric values. This bridges the non-finite policy (VALSEEISS-07/08) with the degeneracy system (VALSEEISS-05/06), allowing non-finite metrics to participate in compound rejection.

## Dependencies

- VALSEEISS-06 (degeneracy config/penalty wiring complete)
- VALSEEISS-08 (non-finite evaluator integration complete)

## Blocked by

- VALSEEISS-06
- VALSEEISS-08

## Blocks

- Nothing (terminal ticket)

## File list

### Modified

| File | Change |
|------|--------|
| `schemas/config/degeneracy.schema.json` | Add `"non-finite-metrics"` to DegeneracyFlag enum, policyByFlag, penalties, threshold |
| `configs/degeneracy.json` | Add threshold, enabledFlags entry, policyByFlag entry, penalty for `non-finite-metrics` |
| `configs/fitness.json` | Add `degeneracy.non-finite-metrics` weight entry (0) |
| `src/evaluation-analytics/degeneracy-flags.js` | Add `extraOptions` 4th parameter to `checkFlags()` for `nonFiniteKeys` detection |
| `src/evaluation-analytics/degeneracy-detection.js` | Add `options` 3rd parameter to `detectDegeneracy()`, forward `nonFiniteKeys` and resolve `nonFiniteMetricsMinKeys` threshold |
| `src/evaluation-analytics/degeneracy-config.js` | Add `nonFiniteMetricsMinKeys` to fallback + resolved thresholds, add `"non-finite-metrics"` to fallback flags |
| `src/evaluation-analytics/feature-vector.js` | Add `"non-finite-metrics"` to `FALLBACK_DEGENERACY_ORDER` |
| `src/evaluation-analytics/create-evaluator.js` | Compute `nonFiniteKeys` from `allMetrics` before degeneracy detection; pass to `detectDegeneracy()` |
| `test/unit/evaluation-analytics/degeneracy-flags.test.mjs` | Add 6 tests for non-finite-metrics flag |
| `test/unit/evaluation-analytics/feature-vector.test.mjs` | Update flag count assertions (12→13), add feature vector + fitness config tests |
| `test/unit/evaluation-analytics/create-evaluator-nonfinite-policy.test.mjs` | Mock `computeCoreMetrics` for non-finite key propagation; update mock degeneracy order |

## Corrected assumptions (vs original ticket)

1. **`degeneracy-statistics.js` NOT modified**: The ticket originally listed this file. Non-finite keys don't come from trajectory statistics — they come from metric values. No change needed.

2. **`checkFlags()` signature**: The ticket proposed `extraOptions` as a concept but didn't account for the actual current signature `(stats, resolvedThresholds, summaryCount)`. Added `extraOptions` as a 4th parameter (backward-compatible — existing callers pass 3 args, 4th defaults to `undefined`).

3. **`detectDegeneracy()` signature**: Added `options` as a 3rd parameter (backward-compatible).

4. **Evaluator ordering**: The ticket correctly identified the ordering issue (nonFiniteKeys needed before degeneracy detection, but computed during feature vector assembly). Implemented Option 2: a lightweight scan of `allMetrics` for non-finite values before degeneracy detection. Feature vector assembly still re-computes them internally (cheap, O(n) on metrics array).

5. **Mock test update required**: The `create-evaluator-nonfinite-policy.test.mjs` mock test needed updating because the evaluator now computes `nonFiniteKeys` from `allMetrics` (not from `assembleFeatureVector` return). Added `computeCoreMetrics` mock to inject non-finite values at the metrics level.

## Acceptance criteria — all met

1. ✅ non-finite-metrics flag fires when nonFiniteKeys >= minKeys
2. ✅ non-finite-metrics flag does not fire when nonFiniteKeys is empty
3. ✅ non-finite-metrics participates in compound rejection (via enabledFlags + policyByFlag "penalize")
4. ✅ non-finite-metrics penalizes fitness (via degeneracy penalty weight 0.15)
5. ✅ non-finite-metrics appears in feature vector (`degeneracy.non-finite-metrics`)
6. ✅ Config validates against schema
7. ✅ All 2043 unit tests pass

## Outcome

### What was actually changed vs originally planned

**Planned**: 8 source files modified, tests for degeneracy-flags only.
**Actual**: 7 source files modified (degeneracy-statistics.js was NOT needed), 3 test files updated, 1 config file added (fitness.json weight).

The core approach matched the ticket's recommendation: pass `nonFiniteKeys` through `detectDegeneracy()` → `checkFlags()` via extra options, and pre-compute non-finite keys from `allMetrics` before degeneracy detection in the evaluator. The key deviation was that `degeneracy-statistics.js` needed no changes, and the mock-based integration test required a `computeCoreMetrics` mock to properly inject non-finite values now that the evaluator independently computes nonFiniteKeys.
