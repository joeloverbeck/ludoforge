# VALSEEISS-06: Degeneracy config + penalty wiring

## Summary

Update `configs/degeneracy.json` with thresholds, policies, and penalties for the four new degeneracy flags. Wire the new flags into the evaluator pipeline so they affect genome rejection and fitness scoring.

## Dependencies

- VALSEEISS-05 (flag detection logic exists)

## Blocked by

- VALSEEISS-05

## Blocks

- VALSEEISS-09 (combined with VALSEEISS-08)

## File list

### Modified

| File | Change |
|------|--------|
| `configs/degeneracy.json` | Add thresholds, enabledFlags, policyByFlag, penalties for 4 new flags; bump version to 3 |
| `src/evaluation-analytics/degeneracy.js` | Ensure `detectDegeneracy()` passes new stats to `checkFlags()` |
| `src/evaluation-analytics/degeneracy-detection.js` | Ensure `applyDegeneracyFilters()` handles new reject flags |
| `src/evaluation-analytics/feature-vector.js` | Update `FALLBACK_DEGENERACY_ORDER` to include new flags |
| `configs/fitness.json` | Add default weights for new degeneracy flags (e.g., `"degeneracy.any-cost-abort": -0.5`) |
| `test/unit/evaluation-analytics/degeneracy.test.mjs` | Integration tests for full degeneracy pipeline with new flags |

## Detailed changes

### `configs/degeneracy.json`

Bump `version` to 3. Add to `thresholds`:

```json
"anyCostAbort": { "minCount": 1 },
"highSkippedTriggers": { "rate": 0.10, "minAttempts": 20 },
"highPassRate": { "rate": 0.30, "minSteps": 20 },
"highNoLegalActionsTermination": { "rate": 0.25, "minRuns": 10 }
```

Add to `enabledFlags`:
```json
"any-cost-abort",
"high-skipped-triggers",
"high-pass-rate",
"high-no-legal-actions-termination"
```

Add to `policyByFlag`:
```json
"any-cost-abort": "reject",
"high-skipped-triggers": "penalize",
"high-pass-rate": "penalize",
"high-no-legal-actions-termination": "penalize"
```

Add to `penalties`:
```json
"high-skipped-triggers": { "weight": 0.2 },
"high-pass-rate": { "weight": 0.15 },
"high-no-legal-actions-termination": { "weight": 0.25 }
```

### `src/evaluation-analytics/feature-vector.js`

Update `FALLBACK_DEGENERACY_ORDER` to include the 4 new flags so they appear in the feature vector.

### `src/evaluation-analytics/degeneracy.js`

Verify that `detectDegeneracy()` passes the full accumulated stats (including new fields from VALSEEISS-05) through to `checkFlags()`. This should already work if `accumulateStatistics()` returns the new fields, but verify the plumbing.

### `configs/fitness.json`

Add weights for the new degeneracy feature vector entries. These are negative weights that penalize degenerate genomes:

```json
"degeneracy.any-cost-abort": -0.5,
"degeneracy.high-skipped-triggers": -0.2,
"degeneracy.high-pass-rate": -0.15,
"degeneracy.high-no-legal-actions-termination": -0.25
```

### Schema version bump

Update `schemas/config/degeneracy.schema.json` version minimum from 2 to 3 (or make it accept both 2 and 3 with `minimum: 2`).

## Out of scope

- Flag detection logic (VALSEEISS-05)
- Non-finite metrics degeneracy flag (VALSEEISS-09)
- Seed generation changes (VALSEEISS-10)
- Evaluator pipeline structural changes

## Acceptance criteria

### Tests

1. **configs/degeneracy.json validates against schema**
   - Act: load config with `loadConfigFile({ name: "degeneracy" })`
   - Assert: `result.valid === true`

2. **any-cost-abort rejects genome in full pipeline**
   - Arrange: summaries producing any-cost-abort flag
   - Act: run `detectDegeneracy()` then `applyDegeneracyFilters()`
   - Assert: genome rejected with reason including "any-cost-abort"

3. **high-skipped-triggers penalizes fitness**
   - Arrange: summaries producing high-skipped-triggers flag
   - Act: run full degeneracy → penalty pipeline
   - Assert: penalty > 0, genome not rejected (penalize policy)

4. **new flags appear in feature vector**
   - Arrange: degeneracy report with new flags
   - Act: `assembleFeatureVector(metrics, degeneracyReport)`
   - Assert: vector contains `degeneracy.any-cost-abort`, `degeneracy.high-skipped-triggers`, etc.

5. **compound rejection includes new penalize flags**
   - Arrange: 4 penalize flags including new ones, maxPenaltyFlags=3
   - Assert: compound rejection triggers

6. **existing flags unaffected**
   - Arrange: summaries that trigger only existing flags
   - Assert: behavior identical to pre-change

### Invariants

- `configs/degeneracy.json` validates against `schemas/config/degeneracy.schema.json`
- `configs/metrics-core.json` validates against its schema
- `configs/fitness.json` validates against its schema
- `any-cost-abort` never appears in penalty computation (reject-only)
- Feature vector includes all 12 degeneracy flags in stable order
