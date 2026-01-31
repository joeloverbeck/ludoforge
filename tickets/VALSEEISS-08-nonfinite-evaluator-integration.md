# VALSEEISS-08: Non-finite evaluator integration

## Summary

Wire the non-finite policy into the evaluator pipeline (`createEvaluator`). When `nonFinitePolicy="reject"`, genomes with any non-finite metric get `{ fitness: null, descriptors: null }`. When `nonFinitePolicy="penalize"`, fitness is multiplied by the penalty multiplier. Diagnostics include `nonFiniteMetrics` and `nonFinitePenaltyMultiplier`.

## Dependencies

- VALSEEISS-07 (policy config + penalty multiplier function)

## Blocked by

- VALSEEISS-07

## Blocks

- VALSEEISS-09 (combined with VALSEEISS-06)

## File list

### Modified

| File | Change |
|------|--------|
| `src/evaluation-analytics/create-evaluator.js` | Add non-finite policy enforcement between step 10 and step 11 |
| `test/unit/evaluation-analytics/create-evaluator.test.mjs` | Tests for reject and penalize policies |

## Detailed changes

### `src/evaluation-analytics/create-evaluator.js`

Import the new exports from feature-vector:

```js
import {
  assembleFeatureVector,
  NON_FINITE_POLICY_MODE,
  NON_FINITE_PER_KEY_PENALTY,
  NON_FINITE_MAX_PENALTY,
  computeNonFinitePenaltyMultiplier,
} from "./feature-vector.js";
```

After step 10 (`assembleFeatureVector`) and before step 11 (`computePreferenceAwareFitness`), add a new step 10c:

```js
// Step 10c: Non-finite metric policy enforcement
if (nonFiniteKeys.length > 0) {
  if (NON_FINITE_POLICY_MODE === "reject") {
    return {
      fitness: null,
      descriptors: null,
      diagnostics: {
        coreMetrics,
        extendedMetrics: includeExtendedMetrics ? extendedMetrics : null,
        degeneracy: degeneracyReport,
        featureVector,
        simulationCount: results.length,
        logAdapterOk: true,
        nonFiniteMetrics: nonFiniteKeys,
        nonFinitePolicy: "reject",
        ...(suiteResults != null ? { suiteResults } : {}),
      },
    };
  }
}
```

After step 11 (fitness computation), apply the penalty multiplier if policy is "penalize" and there are non-finite keys:

```js
let finalFitness = fitnessScore;
let nonFinitePenaltyMultiplier = 1;

if (NON_FINITE_POLICY_MODE === "penalize" && nonFiniteKeys.length > 0) {
  nonFinitePenaltyMultiplier = computeNonFinitePenaltyMultiplier(
    nonFiniteKeys.length,
    NON_FINITE_PER_KEY_PENALTY,
    NON_FINITE_MAX_PENALTY
  );
  finalFitness = fitnessScore * nonFinitePenaltyMultiplier;
}
```

Update the non-finite fitness check to use `finalFitness`:

```js
if (!Number.isFinite(finalFitness)) { ... }
```

Add to diagnostics:
```js
diagnostics: {
  ...existing,
  nonFiniteMetrics: nonFiniteKeys.length > 0 ? nonFiniteKeys : undefined,
  nonFinitePenaltyMultiplier: nonFinitePenaltyMultiplier < 1 ? nonFinitePenaltyMultiplier : undefined,
}
```

Return `finalFitness` instead of `fitnessScore`.

### Allow evaluator-level override

Accept `nonFinitePolicy` as an option in `createEvaluator()` to allow per-evaluator override:

```js
const {
  ...existing,
  nonFinitePolicy = NON_FINITE_POLICY_MODE,
  nonFinitePenalty = { perKeyPenalty: NON_FINITE_PER_KEY_PENALTY, maxPenalty: NON_FINITE_MAX_PENALTY },
} = options;
```

Use these local values instead of the module-level constants inside `evaluator()`.

## Out of scope

- Config/schema changes (VALSEEISS-07)
- Degeneracy flag for non-finite metrics (VALSEEISS-09)
- Descriptor handling (already correct — non-finite keys produce `null` descriptors)
- Simulation engine changes
- Seed generation changes

## Acceptance criteria

### Tests

1. **reject policy returns null fitness when any metric is non-finite**
   - Arrange: evaluator with `nonFinitePolicy: "reject"`, genome that produces a NaN metric
   - Assert: result is `{ fitness: null, descriptors: null }` with `diagnostics.nonFiniteMetrics` array

2. **reject policy returns normal result when all metrics finite**
   - Arrange: evaluator with `nonFinitePolicy: "reject"`, genome with all finite metrics
   - Assert: result has numeric fitness

3. **penalize policy reduces fitness proportionally**
   - Arrange: evaluator with `nonFinitePolicy: "penalize"`, genome with 2 non-finite metrics, perKeyPenalty=0.05
   - Assert: fitness === baseFitness * 0.90 (within floating point tolerance)

4. **penalize policy caps at maxPenalty**
   - Arrange: genome with 20 non-finite metrics, maxPenalty=0.50
   - Assert: fitness === baseFitness * 0.50

5. **penalize policy with 0 non-finite keys applies no penalty**
   - Assert: fitness unchanged, no `nonFinitePenaltyMultiplier` in diagnostics

6. **fitness strictly decreases as nonFiniteKeys.length increases (all else equal)**
   - Arrange: same genome but with 0, 1, 2, 3 non-finite keys
   - Assert: fitness[0] > fitness[1] > fitness[2] > fitness[3]

7. **diagnostics include nonFiniteMetrics and multiplier**
   - Arrange: penalize policy, 3 non-finite keys
   - Assert: `diagnostics.nonFiniteMetrics` is array of length 3, `diagnostics.nonFinitePenaltyMultiplier < 1`

8. **evaluator-level override works**
   - Arrange: config says "penalize", but evaluator created with `nonFinitePolicy: "reject"`
   - Assert: reject behavior

### Invariants

- Descriptors still use `null` for non-finite keys (unchanged)
- If `nonFinitePolicy="reject"` and `k > 0`: evaluator MUST return `fitness: null`
- If `nonFinitePolicy="penalize"`: fitness MUST strictly decrease as `nonFiniteKeys.length` increases
- Determinism preserved
- Existing evaluator behavior unchanged when all metrics are finite
