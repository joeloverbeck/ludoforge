# AGEENS-08: Feature vector and fitness integration for new metrics

**Status**: TODO

**Goal**: Ensure new metric IDs are properly ordered in feature vector with default-zero fitness weights.

**Description**: Add `advantage_reversal_rate` and `policy_sensitivity` to `featureOrder` in `configs/metrics-core.json` for deterministic ordering. Add zero-weight entries in `configs/fitness.json`. Add unit tests confirming correct feature vector assembly.

**Files to touch**:
- `configs/metrics-core.json` (add new IDs to `featureOrder`)
- `configs/fitness.json` (add zero-weight entries)
- `schemas/config/metrics-core.schema.json` (if `featureOrder` is validated against enum — verify)
- `schemas/config/fitness.schema.json` (if weights are validated against enum — verify)
- `test/unit/evaluation-analytics/feature-vector.test.mjs` (add test cases)

**Out of scope**:
- No non-zero fitness weights (tuning is a separate concern)
- No preference model changes
- No portfolio aggregation

**Acceptance criteria**:
- [ ] Tests: updated feature vector tests pass
- [ ] Feature vector with new metrics contains `advantage_reversal_rate` and `policy_sensitivity` keys
- [ ] Fitness computation with default weights does not change scores (zero weight = no contribution)
- [ ] Invariant: existing feature vector + fitness tests pass unchanged

**Dependencies**: AGEENS-06, AGEENS-07
