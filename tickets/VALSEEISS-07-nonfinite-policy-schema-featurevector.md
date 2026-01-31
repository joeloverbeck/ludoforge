# VALSEEISS-07: Non-finite policy — schema + feature-vector

## Summary

Replace the hardcoded `nonFinite: "zero"` normalization policy with a configurable `nonFinitePolicy` that supports `"penalize"` and `"reject"` modes. Update the metrics-core config schema, the config file, and the feature-vector assembly to support the new policy and track diagnostics.

## Dependencies

- None (independent entry point)

## Blocked by

- Nothing

## Blocks

- VALSEEISS-08

## File list

### Modified

| File | Change |
|------|--------|
| `schemas/config/metrics-core.schema.json` | Expand `normalization` to include `nonFinitePolicy`, `nonFinitePenalty` |
| `configs/metrics-core.json` | Add `nonFinitePolicy` and `nonFinitePenalty` fields |
| `src/evaluation-analytics/feature-vector.js` | Read new config, apply policy logic, export policy + penalty config |
| `test/unit/evaluation-analytics/feature-vector.test.mjs` | Tests for policy behavior |

## Detailed changes

### `schemas/config/metrics-core.schema.json`

Expand the `normalization` object:

```json
"normalization": {
  "type": "object",
  "additionalProperties": false,
  "required": ["nonFinite"],
  "properties": {
    "nonFinite": { "type": "string", "enum": ["zero"] },
    "nonFinitePolicy": {
      "type": "string",
      "enum": ["penalize", "reject"],
      "default": "penalize"
    },
    "nonFinitePenalty": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "perKeyPenalty": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "default": 0.05
        },
        "maxPenalty": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "default": 0.50
        }
      }
    }
  }
}
```

Note: `nonFinite: "zero"` is kept for backward compatibility — it controls the normalization of non-finite values in the feature vector. The new `nonFinitePolicy` controls what the evaluator does about genomes that have non-finite metrics.

### `configs/metrics-core.json`

Add the new fields with opinionated defaults. Bump `version` to 2:

```json
{
  "version": 2,
  "normalization": {
    "nonFinite": "zero",
    "nonFinitePolicy": "penalize",
    "nonFinitePenalty": {
      "perKeyPenalty": 0.05,
      "maxPenalty": 0.50
    }
  }
}
```

### `src/evaluation-analytics/feature-vector.js`

1. Load the new config fields from `DEFAULT_METRICS_CORE_CONFIG`:
   ```js
   const NON_FINITE_POLICY_MODE = DEFAULT_METRICS_CORE_CONFIG?.normalization?.nonFinitePolicy ?? "penalize";
   const NON_FINITE_PER_KEY_PENALTY = DEFAULT_METRICS_CORE_CONFIG?.normalization?.nonFinitePenalty?.perKeyPenalty ?? 0.05;
   const NON_FINITE_MAX_PENALTY = DEFAULT_METRICS_CORE_CONFIG?.normalization?.nonFinitePenalty?.maxPenalty ?? 0.50;
   ```

2. Export these constants so the evaluator (VALSEEISS-08) can use them:
   ```js
   export {
     NON_FINITE_POLICY_MODE,
     NON_FINITE_PER_KEY_PENALTY,
     NON_FINITE_MAX_PENALTY,
   };
   ```

3. `assembleFeatureVector()` behavior is unchanged — it still normalizes non-finite to zero and tracks `nonFiniteKeys`. The policy enforcement happens in the evaluator (VALSEEISS-08).

### Penalty multiplier utility

Add a pure function (exported) for computing the penalty multiplier:

```js
/**
 * @param {number} nonFiniteCount - Number of non-finite metric keys
 * @param {number} perKeyPenalty
 * @param {number} maxPenalty
 * @returns {number} Multiplier in [0, 1]
 */
export function computeNonFinitePenaltyMultiplier(nonFiniteCount, perKeyPenalty, maxPenalty) {
  if (nonFiniteCount <= 0) return 1;
  const penalty = Math.min(maxPenalty, nonFiniteCount * perKeyPenalty);
  return Math.max(0, 1 - penalty);
}
```

## Out of scope

- Evaluator pipeline changes to apply the policy (VALSEEISS-08)
- Degeneracy flag for non-finite metrics (VALSEEISS-09)
- Any simulation engine changes
- Any seed generation changes

## Acceptance criteria

### Tests

1. **computeNonFinitePenaltyMultiplier returns 1 when count is 0**
   - Assert: `computeNonFinitePenaltyMultiplier(0, 0.05, 0.50) === 1`

2. **computeNonFinitePenaltyMultiplier applies per-key penalty**
   - Assert: `computeNonFinitePenaltyMultiplier(3, 0.05, 0.50) === 0.85`

3. **computeNonFinitePenaltyMultiplier clamps at maxPenalty**
   - Assert: `computeNonFinitePenaltyMultiplier(20, 0.05, 0.50) === 0.50`

4. **computeNonFinitePenaltyMultiplier never returns negative**
   - Assert: `computeNonFinitePenaltyMultiplier(100, 0.5, 1.0) === 0`

5. **penalty multiplier decreases monotonically with nonFiniteCount**
   - For counts 0, 1, 2, ..., 10: each multiplier <= previous

6. **configs/metrics-core.json validates against updated schema**
   - Act: load config
   - Assert: valid

7. **feature-vector exports policy constants**
   - Assert: `NON_FINITE_POLICY_MODE`, `NON_FINITE_PER_KEY_PENALTY`, `NON_FINITE_MAX_PENALTY` are exported and have expected types

### Invariants

- `assembleFeatureVector()` return shape unchanged
- `nonFiniteKeys` tracking unchanged
- Existing metric normalization ("zero") unchanged
- `computeNonFinitePenaltyMultiplier` is a pure function
- Config backward-compatible: old configs without new fields still validate (new fields have defaults)
