# MAPELIBINISS-01 — Add nonFiniteKeys metadata to assembleFeatureVector

**Status**: ✅ Completed

**Goal**: Track which metric IDs had non-finite raw values before normalization, so descriptor extraction can distinguish "unknown" from real 0.

**Dependencies**: None (first in chain).

## Files to touch

- `src/evaluation-analytics/feature-vector.js` — Change `assembleFeatureVector()` return from plain `FeatureVector` object to `{ vector, nonFiniteKeys }`. Collect non-finite metric IDs into an array during the metric-mapping loop, before `normalizeMetricValue()` replaces them with 0.
- `src/evaluation-analytics/feature-vector.d.ts` — Add `FeatureVectorResult` interface: `{ vector: FeatureVector, nonFiniteKeys: ReadonlyArray<string> }`. Update `assembleFeatureVector` return type.
- `src/evaluation-analytics/types.ts` — Add `FeatureVectorResult` type export.
- `src/evaluation-analytics/create-evaluator.js` — Step 10: destructure `{ vector: featureVector, nonFiniteKeys }`. Step 12: use `nonFiniteKeys` (via a `Set` for O(1) lookup) to produce `null` for unknown descriptors.
- `src/evaluation-analytics/create-evaluator.d.ts` — Update `EvaluationResultSuccess.descriptors` to `Record<string, number | null>`.
- `src/evolutionary-engine/types.ts` — Change `DescriptorValue` from `number` to `number | null`.
- `test/e2e/helpers/mock-fitness.js` — `resolveFeatureVector()` destructures `{ vector }` and returns it.
- `test/e2e/preference-model-update.e2e.test.mjs` — `buildFeatureVector()` destructures `{ vector }` and returns it.
- `test/unit/evaluation-analytics/feature-vector.test.mjs` — Updated existing tests for new return shape. Added 5 new tests for nonFiniteKeys tracking.

## Out of scope

- `binDescriptorValue`, `getDescriptorCoordinates`, `getNicheId` — no changes to MAP-Elites binning logic.
- `coverage-policy.js`, `generate-seed-population.js` — no seed generation changes.
- Schema files, architecture docs.

## Acceptance criteria

### Tests

- `assembleFeatureVector([{ id: "x", value: NaN }], ...)` returns `{ vector: { x: 0, ... }, nonFiniteKeys: ["x"] }`.
- `assembleFeatureVector([{ id: "x", value: 0.5 }], ...)` returns `nonFiniteKeys` not containing `"x"`.
- `assembleFeatureVector([{ id: "a", value: Infinity }, { id: "b", value: 0.5 }], ...)` returns `nonFiniteKeys: ["a"]` and `vector.a === 0`, `vector.b === 0.5`.
- `create-evaluator` step 12: when a descriptorKey is in nonFiniteKeys, `descriptors[key] === null`.
- `create-evaluator` step 12: when a descriptorKey is NOT in nonFiniteKeys, `descriptors[key]` is the numeric feature vector value.
- All existing `test/unit/evaluation-analytics/feature-vector.test.mjs` tests pass (updated for new return shape).

### Invariants

- Feature vector numeric values unchanged (non-finite replaced with 0). Fitness pipeline unaffected.
- `evaluation-adapter.js` line 98 (`evaluation.descriptors == null`) still passes — the descriptors object is non-null, only individual values may be null.
- `tsc -p tsconfig.json` passes.
- `npm run test:unit` passes.

## Outcome

### What was actually changed vs originally planned

**All planned changes were implemented as specified.** One additional caller was discovered and updated:

| File | Planned | Actual |
|------|---------|--------|
| `src/evaluation-analytics/feature-vector.js` | Return `{ vector, nonFiniteKeys }` | Done. Used array (not Set) for nonFiniteKeys collection. |
| `src/evaluation-analytics/feature-vector.d.ts` | Add `FeatureVectorResult`, update return type | Done. |
| `src/evaluation-analytics/types.ts` | Add `FeatureVectorResult` export | Done. |
| `src/evaluation-analytics/create-evaluator.js` | Destructure Step 10, null-check Step 12 | Done. Used `new Set(nonFiniteKeys)` for O(1) lookup in Step 12 (minor optimization over ticket's `includes()`). |
| `src/evaluation-analytics/create-evaluator.d.ts` | Update descriptor type to allow null | Done. |
| `src/evolutionary-engine/types.ts` | `DescriptorValue = number \| null` | Done. |
| `test/e2e/helpers/mock-fitness.js` | Destructure `{ vector }` | Done. |
| `test/e2e/preference-model-update.e2e.test.mjs` | **Not in ticket** — also calls `assembleFeatureVector()` directly | Updated to destructure `{ vector }`. |
| `test/unit/.../feature-vector.test.mjs` | Update existing + add new tests | Done: 2 existing updated, 5 new tests added. |

**Verification**: 675/675 unit tests pass. `tsc` clean. 5 e2e failures are pre-existing (unrelated MAP-Elites config issue from another session).
