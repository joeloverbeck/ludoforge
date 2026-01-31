# VALSEEISS-03: Log-adapter trajectory summary aggregation

## Summary

Extend `buildTrajectorySummary()` in the log-adapter to aggregate the new step-level trace fields (`costAborted`, `triggerAttemptCount`, `triggerSkipCount`) into trajectory-level totals. These totals are consumed by downstream metric computation (VALSEEISS-04).

## Dependencies

- VALSEEISS-02 (steps carry the new fields)

## Blocked by

- VALSEEISS-02

## Blocks

- VALSEEISS-04

## File list

### Modified

| File | Change |
|------|--------|
| `src/evaluation-analytics/log-adapter.js` | Add 5 new aggregations to `buildTrajectorySummary()` |
| `test/unit/evaluation-analytics/log-adapter.test.mjs` | Tests for new aggregation fields |

## Detailed changes

### `src/evaluation-analytics/log-adapter.js`

In the `buildTrajectorySummary()` function, add counters initialized before the step loop:

```js
let totalSkippedTriggers = 0;
let totalAttemptedTriggers = 0;
let totalCostAborts = 0;
let totalPassSteps = 0;
let totalActionSteps = 0;
```

Inside the step iteration loop, add:

```js
if (typeof step.triggerSkipCount === "number") {
  totalSkippedTriggers += step.triggerSkipCount;
}
if (typeof step.triggerAttemptCount === "number") {
  totalAttemptedTriggers += step.triggerAttemptCount;
}
if (step.costAborted === true) {
  totalCostAborts += 1;
}
if (step.actionId == null) {
  totalPassSteps += 1;
} else {
  totalActionSteps += 1;
}
```

Add these to the returned `summary` object:

```js
const summary = {
  // ... existing fields ...
  totalSkippedTriggers,
  totalAttemptedTriggers,
  totalCostAborts,
  totalPassSteps,
  totalActionSteps,
};
```

### Schema impact

The `simulation-result.schema.json` does NOT need changes because `buildTrajectorySummary` is an internal structure, not a persisted schema. The trajectory summary is a runtime object produced by the adapter.

## Out of scope

- Step-level field creation (VALSEEISS-01 + 02)
- Metric computation from these totals (VALSEEISS-04)
- Degeneracy flag changes (VALSEEISS-05)
- Any changes to the evaluator pipeline

## Acceptance criteria

### Tests

1. **totalCostAborts counts steps with costAborted=true**
   - Arrange: simulation result with 2 steps where costAborted=true, 3 without
   - Act: `adaptSimulationLog(...)`
   - Assert: `summary.totalCostAborts === 2`

2. **totalSkippedTriggers sums triggerSkipCount across steps**
   - Arrange: steps with triggerSkipCount of [0, 1, 2, 0]
   - Assert: `summary.totalSkippedTriggers === 3`

3. **totalAttemptedTriggers sums triggerAttemptCount across steps**
   - Arrange: steps with triggerAttemptCount of [2, 3, 1, 0]
   - Assert: `summary.totalAttemptedTriggers === 6`

4. **totalPassSteps counts steps where actionId is null**
   - Arrange: steps with actionId: [null, "move", null, "attack"]
   - Assert: `summary.totalPassSteps === 2`

5. **totalActionSteps counts steps where actionId is non-null**
   - Same arrange as above
   - Assert: `summary.totalActionSteps === 2`

6. **fields default to 0 when step-level fields absent (backward compat)**
   - Arrange: steps without costAborted, triggerAttemptCount, triggerSkipCount
   - Assert: all five new totals are 0

7. **totalSkippedTriggers <= totalAttemptedTriggers**
   - Arrange: valid steps with trigger counts
   - Assert: invariant holds

### Invariants

- `totalPassSteps + totalActionSteps === stepCount`
- `totalSkippedTriggers <= totalAttemptedTriggers`
- `totalCostAborts <= totalActionSteps`
- Existing summary fields unchanged
- Backward compatible: old simulation results (without new step fields) produce zeroed totals
