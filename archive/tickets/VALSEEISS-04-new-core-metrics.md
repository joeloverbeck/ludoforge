# VALSEEISS-04: New core metrics

## Status: COMPLETED

## Summary

Add four new metric IDs (`skipped_trigger_rate`, `cost_abort_rate`, `pass_step_rate`, `no_legal_actions_termination_rate`) and implement their computation from trajectory summaries. These metrics quantify simulation pathologies that evolution can exploit.

## Dependencies

- VALSEEISS-03 (log-adapter provides the aggregated totals)

## Blocked by

- VALSEEISS-03

## Blocks

- VALSEEISS-05

## File list

### Modified

| File | Change |
|------|--------|
| `schemas/shared/metric-id.schema.json` | Add 4 new IDs to the enum |
| `src/evaluation-analytics/metric-ids.js` | Picks up new IDs automatically (loads from schema) |
| `src/evaluation-analytics/metrics/core.js` | Implement computation for the 4 new metrics |
| `configs/metrics-core.json` | Add 4 new IDs to `enabled` and `featureOrder` arrays |
| `schemas/config/metrics-core.schema.json` | No change needed (items are `{ type: "string" }`, not enum-constrained) |
| `test/unit/evaluation-analytics/core-metrics.test.mjs` | Tests for new metric computation |

## Detailed changes

### `schemas/shared/metric-id.schema.json`

Add to the enum array:

```json
"skipped_trigger_rate",
"cost_abort_rate",
"pass_step_rate",
"no_legal_actions_termination_rate"
```

### `src/evaluation-analytics/metrics/core.js`

In `computeCoreMetrics(summaries)`, add computation for the four new metrics. The function receives `trajectorySummaries` which now (after VALSEEISS-03) contain:
- `totalSkippedTriggers`, `totalAttemptedTriggers`
- `totalCostAborts`, `totalActionSteps`, `totalPassSteps`
- `stepCount`, `terminationReason`

Metric formulas:

```js
// skipped_trigger_rate = totalSkippedTriggers / max(1, totalAttemptedTriggers)
// Aggregated across ALL summaries
let allSkippedTriggers = 0;
let allAttemptedTriggers = 0;
for (const s of summaries) {
  allSkippedTriggers += s.totalSkippedTriggers ?? 0;
  allAttemptedTriggers += s.totalAttemptedTriggers ?? 0;
}
const skippedTriggerRate = allSkippedTriggers / Math.max(1, allAttemptedTriggers);

// cost_abort_rate = totalCostAborts / max(1, totalActionSteps)
let allCostAborts = 0;
let allActionSteps = 0;
for (const s of summaries) {
  allCostAborts += s.totalCostAborts ?? 0;
  allActionSteps += s.totalActionSteps ?? 0;
}
const costAbortRate = allCostAborts / Math.max(1, allActionSteps);

// pass_step_rate = totalPassSteps / max(1, totalSteps)
let allPassSteps = 0;
let allSteps = 0;
for (const s of summaries) {
  allPassSteps += s.totalPassSteps ?? 0;
  allSteps += s.stepCount ?? 0;
}
const passStepRate = allPassSteps / Math.max(1, allSteps);

// no_legal_actions_termination_rate = runs where terminationReason == "no-legal-actions" / runs
let noLegalActionsCount = 0;
for (const s of summaries) {
  if (s.terminationReason === "no-legal-actions") {
    noLegalActionsCount += 1;
  }
}
const noLegalActionsTerminationRate = noLegalActionsCount / Math.max(1, summaries.length);
```

Return these as additional entries in the metrics array:

```js
{ id: "skipped_trigger_rate", value: skippedTriggerRate },
{ id: "cost_abort_rate", value: costAbortRate },
{ id: "pass_step_rate", value: passStepRate },
{ id: "no_legal_actions_termination_rate", value: noLegalActionsTerminationRate },
```

### `configs/metrics-core.json`

Add the 4 new IDs to `enabled` and `featureOrder`. Bump `version` to 2.

## Out of scope

- Log-adapter changes (VALSEEISS-03)
- Degeneracy flags using these metrics (VALSEEISS-05)
- Fitness weight configuration for new metrics
- Extended metrics

## Acceptance criteria

### Tests

1. **skipped_trigger_rate computed correctly**
   - Arrange: summaries with totalSkippedTriggers=5, totalAttemptedTriggers=20
   - Assert: metric value === 0.25

2. **skipped_trigger_rate is 0 when no triggers attempted**
   - Arrange: summaries with totalAttemptedTriggers=0
   - Assert: metric value === 0 (not NaN)

3. **cost_abort_rate computed correctly**
   - Arrange: summaries with totalCostAborts=3, totalActionSteps=30
   - Assert: metric value === 0.1

4. **pass_step_rate computed correctly**
   - Arrange: summaries with totalPassSteps=10, stepCount=50
   - Assert: metric value === 0.2

5. **no_legal_actions_termination_rate computed correctly**
   - Arrange: 4 summaries, 1 with terminationReason="no-legal-actions"
   - Assert: metric value === 0.25

6. **all four metrics appear in core metrics output**
   - Arrange: any valid summaries
   - Assert: output array contains entries with all 4 new IDs

7. **metrics are 0 when summaries lack the new fields (backward compat)**
   - Arrange: summaries without totalCostAborts etc.
   - Assert: all four metrics are 0

### Invariants

- All four metrics are in range [0, 1]
- Metric computation is deterministic (pure function of summaries)
- Existing 7 core metrics returned by `computeCoreMetrics` are unchanged (the other 4 IDs in the schema—structural_complexity, advantage_reversal_rate, policy_sensitivity, skipped_effect_rate—are computed by extended metrics, not core)
- `METRIC_IDS` array contains all 15 IDs after schema update
- `computeCoreMetrics` returns 11 entries (7 existing + 4 new)

## Outcome

### What changed vs originally planned

- **Test file name corrected**: Ticket referenced `metrics-core.test.mjs` but actual file is `core-metrics.test.mjs`.
- **Metric count clarified**: Ticket claimed "existing 11 metrics" — actually `computeCoreMetrics` returned 7 (the other 4 are extended). Ticket corrected to reflect this.
- **All planned code changes implemented as specified**: 4 new IDs in schema, 4 new computation functions in core.js, config updated with version bump.
- **No changes needed to `metric-ids.js`** (loads dynamically from schema, as ticket predicted).
- **No changes needed to `schemas/config/metrics-core.schema.json`** (items are `{ type: "string" }`, as ticket predicted).
- **VALSEEISS-03 dependency confirmed satisfied**: log-adapter already aggregates all required summary fields.
- **22 core-metrics tests pass** (14 existing + 8 new), **5 metric-ids-sync tests pass**, **no regressions** in feature-vector or extended-metrics tests.
