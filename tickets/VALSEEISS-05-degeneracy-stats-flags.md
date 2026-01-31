# VALSEEISS-05: Degeneracy statistics + flags for new signals

## Summary

Add four new degeneracy flags (`anyCostAbort`, `highSkippedTriggers`, `highPassRate`, `highNoLegalActionsTermination`) with corresponding statistics accumulation, threshold detection, and penalty configuration.

## Dependencies

- VALSEEISS-04 (metrics provide the underlying data; statistics come from trajectory summaries)

## Blocked by

- VALSEEISS-04

## Blocks

- VALSEEISS-06

## File list

### Modified

| File | Change |
|------|--------|
| `schemas/config/degeneracy.schema.json` | Add 4 new flags to enum, add threshold/penalty/policy definitions |
| `src/evaluation-analytics/degeneracy-statistics.js` | Accumulate new statistics from summaries |
| `src/evaluation-analytics/degeneracy-flags.js` | Implement `checkFlags()` detection for 4 new flags |
| `src/evaluation-analytics/degeneracy-config.js` | Add threshold resolution for new flags |
| `src/evaluation-analytics/degeneracy-penalty.js` | Add penalty computation for new penalizable flags |
| `test/unit/evaluation-analytics/degeneracy-statistics.test.mjs` | Tests for new statistics |
| `test/unit/evaluation-analytics/degeneracy-flags.test.mjs` | Tests for new flag detection |

## Detailed changes

### `schemas/config/degeneracy.schema.json`

**DegeneracyFlag enum**: Add:
```json
"any-cost-abort",
"high-skipped-triggers",
"high-pass-rate",
"high-no-legal-actions-termination"
```

**thresholds**: Add new threshold objects:
```json
"anyCostAbort": {
  "type": "object",
  "additionalProperties": false,
  "required": ["minCount"],
  "properties": {
    "minCount": { "type": "integer", "minimum": 1 }
  }
},
"highSkippedTriggers": {
  "type": "object",
  "additionalProperties": false,
  "required": ["rate", "minAttempts"],
  "properties": {
    "rate": { "type": "number", "minimum": 0, "maximum": 1 },
    "minAttempts": { "type": "integer", "minimum": 1 }
  }
},
"highPassRate": {
  "type": "object",
  "additionalProperties": false,
  "required": ["rate", "minSteps"],
  "properties": {
    "rate": { "type": "number", "minimum": 0, "maximum": 1 },
    "minSteps": { "type": "integer", "minimum": 1 }
  }
},
"highNoLegalActionsTermination": {
  "type": "object",
  "additionalProperties": false,
  "required": ["rate", "minRuns"],
  "properties": {
    "rate": { "type": "number", "minimum": 0, "maximum": 1 },
    "minRuns": { "type": "integer", "minimum": 1 }
  }
}
```

**policyByFlag**: Add entries for all 4 new flags.

**penalties**: Add weight entries for the 3 penalizable flags (not `any-cost-abort` which is reject-only).

### `src/evaluation-analytics/degeneracy-statistics.js`

In `accumulateStatistics(summaries)`, add:

```js
let totalCostAborts = 0;
let totalSkippedTriggers = 0;
let totalAttemptedTriggers = 0;
let totalPassSteps = 0;
let totalSteps = 0;
let noLegalActionsTerminationCount = 0;
```

Inside the summary loop:
```js
totalCostAborts += summary?.totalCostAborts ?? 0;
totalSkippedTriggers += summary?.totalSkippedTriggers ?? 0;
totalAttemptedTriggers += summary?.totalAttemptedTriggers ?? 0;
totalPassSteps += summary?.totalPassSteps ?? 0;
totalSteps += summary?.stepCount ?? 0;
if (summary?.terminationReason === "no-legal-actions") {
  noLegalActionsTerminationCount += 1;
}
```

Return all 6 new fields.

### `src/evaluation-analytics/degeneracy-flags.js`

In `checkFlags()`, add detection for each new flag:

**any-cost-abort** (reject policy):
```js
if (totalCostAborts >= anyCostAbortMinCount) {
  flags.add("any-cost-abort");
  // details...
}
```

**high-skipped-triggers** (penalize policy):
```js
if (totalAttemptedTriggers >= highSkippedTriggersMinAttempts) {
  const rate = totalSkippedTriggers / totalAttemptedTriggers;
  ratios["high-skipped-triggers"] = rate;
  if (rate >= highSkippedTriggersRate) {
    flags.add("high-skipped-triggers");
    // details...
  }
}
```

**high-pass-rate** (penalize policy):
```js
if (totalSteps >= highPassRateMinSteps) {
  const rate = totalPassSteps / totalSteps;
  ratios["high-pass-rate"] = rate;
  if (rate >= highPassRateRate) {
    flags.add("high-pass-rate");
    // details...
  }
}
```

**high-no-legal-actions-termination** (penalize policy):
```js
if (summaryCount >= highNoLegalActionsMinRuns) {
  const rate = noLegalActionsTerminationCount / summaryCount;
  ratios["high-no-legal-actions-termination"] = rate;
  if (rate >= highNoLegalActionsRate) {
    flags.add("high-no-legal-actions-termination");
    // details...
  }
}
```

### `src/evaluation-analytics/degeneracy-config.js`

Add threshold resolution for the 4 new flag thresholds, extracting from config with fallback defaults.

### `src/evaluation-analytics/degeneracy-penalty.js`

Add penalty weights for `high-skipped-triggers`, `high-pass-rate`, `high-no-legal-actions-termination`. These follow the existing flat-weight pattern (like `dominant-action`). `any-cost-abort` is reject-only, no penalty weight needed.

## Out of scope

- Config file changes (VALSEEISS-06)
- Feature vector changes
- Non-finite metric degeneracy flag (VALSEEISS-09)
- Evaluator pipeline changes

## Acceptance criteria

### Tests

1. **any-cost-abort fires when totalCostAborts >= minCount**
   - Arrange: stats with totalCostAborts=1, threshold minCount=1
   - Assert: flags include "any-cost-abort"

2. **any-cost-abort does not fire when totalCostAborts=0**
   - Assert: flags do not include "any-cost-abort"

3. **high-skipped-triggers fires above threshold**
   - Arrange: totalSkippedTriggers=5, totalAttemptedTriggers=20 (rate=0.25), threshold rate=0.10
   - Assert: flags include "high-skipped-triggers", ratios has key

4. **high-skipped-triggers does not fire below minAttempts**
   - Arrange: totalAttemptedTriggers=5, minAttempts=20
   - Assert: does not fire regardless of rate

5. **high-pass-rate fires above threshold**
   - Arrange: totalPassSteps=40, totalSteps=100 (rate=0.40), threshold rate=0.30
   - Assert: flags include "high-pass-rate"

6. **high-no-legal-actions-termination fires above threshold**
   - Arrange: 3 of 10 summaries with terminationReason="no-legal-actions", threshold rate=0.25
   - Assert: flags include "high-no-legal-actions-termination"

7. **statistics accumulation includes new fields**
   - Arrange: summaries with known totalCostAborts, trigger counts, pass steps
   - Assert: accumulated stats match expected values

8. **new flags participate in compound rejection**
   - Arrange: 4+ penalize flags including new ones
   - Assert: compound rejection triggers

### Invariants

- `any-cost-abort` must have policy `"reject"` (never penalize)
- New flags are disabled by default if not in `enabledFlags`
- Existing 8 flags are completely unchanged in behavior
- Statistics accumulation is backward-compatible (missing fields default to 0)
