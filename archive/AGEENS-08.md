# AGEENS-08: Feature vector and fitness integration for new metrics

**Status**: COMPLETED

**Goal**: Ensure new metric IDs are properly ordered in feature vector with default-zero fitness weights.

**Description**: Add `advantage_reversal_rate` and `policy_sensitivity` to `featureOrder` in `configs/metrics-core.json` for deterministic ordering. Add zero-weight entries in `configs/fitness.json`. Add unit tests confirming correct feature vector assembly.

**Files to touch**:
- `configs/metrics-core.json` (add new IDs to `enabled` and `featureOrder`)
- `configs/fitness.json` (add zero-weight entries)
- `schemas/shared/metric-ids.json` (add new IDs — `METRIC_IDS` is loaded from this file and existing tests assert `DEFAULT_FEATURE_ORDER === [...METRIC_IDS]`)
- `schemas/config/map-elites.schema.json` (add new IDs to `DescriptorConfig.id` enum — sync test enforces match with canonical list)
- `schemas/evolution-runner/runner-config.schema.json` (add new IDs to `MapElitesDescriptorConfig.id` enum — sync test enforces match with canonical list)
- `schemas/config/metrics-core.schema.json` — verified: `featureOrder` items use `{ "type": "string" }`, no enum; no change needed
- `schemas/config/fitness.schema.json` — verified: `weights` uses `"additionalProperties": { "type": "number" }`, no enum; no change needed
- `test/unit/evaluation-analytics/feature-vector.test.mjs` (add test cases)

**Out of scope**:
- No non-zero fitness weights (tuning is a separate concern)
- No preference model changes
- No portfolio aggregation

**Acceptance criteria**:
- [x] Tests: updated feature vector tests pass
- [x] Feature vector with new metrics contains `advantage_reversal_rate` and `policy_sensitivity` keys
- [x] Fitness computation with default weights does not change scores (zero weight = no contribution)
- [x] Invariant: existing feature vector + fitness tests pass unchanged

**Dependencies**: AGEENS-06, AGEENS-07

## Outcome

**What was actually changed vs originally planned:**

The ticket originally listed 5 files to touch. Reassessment found 3 discrepancies:

1. **Missing file**: `schemas/shared/metric-ids.json` — the canonical metric ID list that `METRIC_IDS` is loaded from. Without updating it, the existing sync test (`metric-ids-sync.test.mjs`) would fail since it asserts `DEFAULT_FEATURE_ORDER === [...METRIC_IDS]`.

2. **Missing files**: `schemas/config/map-elites.schema.json` and `schemas/evolution-runner/runner-config.schema.json` — both contain `enum` arrays for descriptor `id` fields that must match the canonical metric ID list. The sync test (`metric-ids-sync.test.mjs`) enforces this invariant.

3. **`enabled` array**: The ticket mentioned adding to `featureOrder` but not `enabled` in `metrics-core.json`. The sync test asserts `config.enabled === [...METRIC_IDS]`, so both arrays needed updating.

**Files changed (7 total):**
- `schemas/shared/metric-ids.json` — added `advantage_reversal_rate`, `policy_sensitivity`
- `configs/metrics-core.json` — added to both `enabled` and `featureOrder`
- `configs/fitness.json` — added zero-weight entries for both new metrics
- `schemas/config/map-elites.schema.json` — added to `DescriptorConfig.id` enum
- `schemas/evolution-runner/runner-config.schema.json` — added to `MapElitesDescriptorConfig.id` enum
- `test/unit/evaluation-analytics/feature-vector.test.mjs` — added 4 new test cases

**No source code changes required** — only config, schema, and test files were modified.

**All 971 unit tests pass (0 failures).**
