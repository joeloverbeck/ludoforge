# AGEENS-07: policy_sensitivity metric

**Status**: DONE

**Goal**: Measure marginal win-rate improvement across a ladder of agent tiers.

**Description**: Implemented `computePolicySensitivity(definition, options?)`. Uses same tier resolution and seat-bias cancellation as `skill-expression.js`. Runs a ladder: baseline->tier1, tier1->tier2, etc. Computes marginal win-rate delta per step, averages, clamps to [0,1]. Wired into `aggregation.js`.

**Files touched**:
- `src/evaluation-analytics/metrics/extended/policy-sensitivity.js` (new)
- `src/evaluation-analytics/metrics/extended/aggregation.js` (modified — added policy_sensitivity block)
- `src/evaluation-analytics/metrics/extended/config.js` (modified — added defaults)
- `configs/metrics-extended.json` (modified — added `policySensitivity` section)
- `schemas/config/metrics-extended.schema.json` (modified — added `PolicySensitivityConfig` def + property)
- `test/unit/evaluation-analytics/policy-sensitivity.test.mjs` (new)

**Out of scope**:
- No portfolio/suite integration (that's AGEENS-09)
- No `agent_robustness` metric
- No fitness weight changes

**Acceptance criteria**:
- [x] Tests: `node --test test/unit/evaluation-analytics/policy-sensitivity.test.mjs` passes
- [x] Game where greedy beats random: `policy_sensitivity > 0` (verified via choice-game fixture)
- [x] Stable under seat swaps (seat-bias cancellation)
- [x] Fewer than 2 tiers -> returns 0
- [x] Result always within [0,1]
- [x] Invariant: all existing tests pass; `skill_expression` behavior unchanged

**Dependencies**: None (follows `skill-expression.js` patterns)
