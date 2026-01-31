# VALSEEISS-09: NonFiniteMetrics degeneracy flag

## Summary

Add a `nonFiniteMetrics` degeneracy flag that fires when a genome has non-finite metric values. This bridges the non-finite policy (VALSEEISS-07/08) with the degeneracy system (VALSEEISS-05/06), allowing non-finite metrics to participate in compound rejection.

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
| `schemas/config/degeneracy.schema.json` | Add `"non-finite-metrics"` to DegeneracyFlag enum |
| `configs/degeneracy.json` | Add threshold, enabledFlags entry, policyByFlag entry, penalty for `non-finite-metrics` |
| `src/evaluation-analytics/degeneracy-flags.js` | Add detection logic for `non-finite-metrics` flag |
| `src/evaluation-analytics/degeneracy-statistics.js` | Accept `nonFiniteKeys` in stats or pass through options |
| `src/evaluation-analytics/degeneracy.js` | Pass `nonFiniteKeys` into degeneracy detection |
| `src/evaluation-analytics/create-evaluator.js` | Pass `nonFiniteKeys` to `detectDegeneracy()` |
| `src/evaluation-analytics/feature-vector.js` | Update `FALLBACK_DEGENERACY_ORDER` |
| `test/unit/evaluation-analytics/degeneracy-flags.test.mjs` | Tests for non-finite-metrics flag |

## Detailed changes

### Approach

The `nonFiniteMetrics` flag differs from other degeneracy flags because it doesn't come from trajectory summary statistics — it comes from the feature vector assembly step. Two integration approaches:

**Preferred approach**: Pass `nonFiniteKeys` as an extra parameter to `detectDegeneracy()`, which forwards it to `checkFlags()`. This avoids polluting `accumulateStatistics()` with non-trajectory data.

```js
// In create-evaluator.js, step 9:
const degeneracyReport = detectDegeneracy(trajectorySummaries, degeneracyThresholds, {
  nonFiniteKeys,
});
```

### `schemas/config/degeneracy.schema.json`

Add `"non-finite-metrics"` to the `DegeneracyFlag` enum.

Add threshold:
```json
"nonFiniteMetrics": {
  "type": "object",
  "additionalProperties": false,
  "required": ["minKeys"],
  "properties": {
    "minKeys": { "type": "integer", "minimum": 1 }
  }
}
```

Add policyByFlag and penalty entries.

### `configs/degeneracy.json`

```json
"thresholds": {
  "nonFiniteMetrics": { "minKeys": 1 }
},
"enabledFlags": [..., "non-finite-metrics"],
"policyByFlag": {
  "non-finite-metrics": "penalize"
},
"penalties": {
  "non-finite-metrics": { "weight": 0.15 }
}
```

### `src/evaluation-analytics/degeneracy-flags.js`

In `checkFlags()`, add:

```js
const nonFiniteKeys = extraOptions?.nonFiniteKeys ?? [];
if (nonFiniteKeys.length >= nonFiniteMetricsMinKeys) {
  flags.add("non-finite-metrics");
  details["non-finite-metrics"] = formatDetail({
    count: nonFiniteKeys.length,
    keys: nonFiniteKeys.slice(0, 5).join(","),
    threshold: nonFiniteMetricsMinKeys,
  });
}
```

### Ordering concern

Currently, `detectDegeneracy()` is called at step 9, before `assembleFeatureVector()` at step 10. But `nonFiniteKeys` comes from step 10. The evaluator needs reordering:

1. Move `assembleFeatureVector()` before `detectDegeneracy()`, OR
2. Compute `nonFiniteKeys` separately before step 9 (a simple pass over metrics checking `Number.isFinite`), OR
3. Run degeneracy detection after feature vector assembly

**Recommended**: Option 2 — extract non-finite key detection into a small utility used before step 9:

```js
const nonFiniteKeys = allMetrics
  .filter(m => m && typeof m.id === "string" && !Number.isFinite(m.value))
  .map(m => m.id);
```

Then pass to `detectDegeneracy()` and also to `assembleFeatureVector()` (or let it recompute — it's cheap).

## Out of scope

- Non-finite policy enforcement in evaluator (VALSEEISS-08)
- Other degeneracy flag changes (VALSEEISS-05/06)
- Seed generation changes
- Metric computation changes

## Acceptance criteria

### Tests

1. **non-finite-metrics flag fires when nonFiniteKeys >= minKeys**
   - Arrange: nonFiniteKeys=["agency", "variety"], minKeys=1
   - Assert: flags include "non-finite-metrics"

2. **non-finite-metrics flag does not fire when nonFiniteKeys is empty**
   - Assert: flags do not include "non-finite-metrics"

3. **non-finite-metrics participates in compound rejection**
   - Arrange: 4 penalize flags including non-finite-metrics
   - Assert: compound rejection triggers

4. **non-finite-metrics penalizes fitness**
   - Arrange: degeneracy report with non-finite-metrics flag, penalize policy
   - Assert: fitness penalty applied

5. **non-finite-metrics appears in feature vector**
   - Arrange: degeneracy report with flag
   - Assert: `featureVector["degeneracy.non-finite-metrics"] === 1`

6. **full pipeline: genome with NaN metric gets both non-finite penalty AND degeneracy flag**
   - Arrange: genome producing NaN for one metric, penalize policy
   - Assert: fitness reduced by BOTH non-finite multiplier (from VALSEEISS-08) and degeneracy penalty

### Invariants

- `non-finite-metrics` flag only fires based on metric finiteness, not simulation data
- Existing degeneracy flags unchanged
- Config validates against schema
- Deterministic: same non-finite keys always produce same flag
