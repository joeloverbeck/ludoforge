# VALSEEISS-01: Trace schema + buildStep additions ✅ COMPLETED

## Summary

Add `costAborted`, `triggerAttemptCount`, and `triggerSkipCount` fields to the simulation step record produced by `buildStep()`. These fields are the foundation for downstream degeneracy metrics (tickets 02-06).

## Dependencies

- None (entry point)

## Blocked by

- Nothing

## Blocks

- VALSEEISS-02

## File list

### Modified

| File | Change |
|------|--------|
| `src/simulation-engine/step-execution.js` | Add `costAborted`, `triggerAttemptCount`, `triggerSkipCount` to `buildStep()` trace handling |
| `schemas/simulation-engine/simulation-result.schema.json` | Add the three optional fields to the step schema |
| `test/unit/simulation-engine/step-execution.test.mjs` | Tests for new trace fields |

### New

None.

## Detailed changes

### `src/simulation-engine/step-execution.js`

In `buildStep()`, after the existing trace field assignments (lines 113-129), add handling for three new optional trace fields:

```
if (trace.costAborted === true) {
  step.costAborted = true;
}
if (typeof trace.triggerAttemptCount === "number") {
  step.triggerAttemptCount = trace.triggerAttemptCount;
}
if (typeof trace.triggerSkipCount === "number") {
  step.triggerSkipCount = trace.triggerSkipCount;
}
```

These follow the same "only-set-when-present" pattern used by `decisionSpaceRaw`, `skippedEffects`, etc.

### `schemas/simulation-engine/simulation-result.schema.json`

Add to the step object `properties`:

```json
"costAborted": { "type": "boolean" },
"triggerAttemptCount": { "type": "integer", "minimum": 0 },
"triggerSkipCount": { "type": "integer", "minimum": 0 }
```

These are NOT required — existing steps remain valid.

## Out of scope

- Propagating values into `buildStep()` call sites (that is VALSEEISS-02)
- Aggregation in log-adapter (that is VALSEEISS-03)
- Any metric computation
- Any degeneracy flag changes

## Acceptance criteria

### Tests

1. **buildStep includes costAborted when trace.costAborted is true**
   - Arrange: call `buildStep(state, actionId, legalActionCount, impact, { ..., costAborted: true })`
   - Assert: returned step has `step.costAborted === true`

2. **buildStep omits costAborted when trace.costAborted is falsy/absent**
   - Arrange: call `buildStep(state, actionId, legalActionCount, impact, { ... })` without costAborted
   - Assert: returned step does not have own property `costAborted`

3. **buildStep includes triggerAttemptCount and triggerSkipCount**
   - Arrange: call `buildStep(...)` with `trace.triggerAttemptCount = 5, trace.triggerSkipCount = 2`
   - Assert: `step.triggerAttemptCount === 5`, `step.triggerSkipCount === 2`

4. **buildStep omits trigger counts when absent**
   - Arrange: call `buildStep(...)` without trigger fields
   - Assert: step does not have `triggerAttemptCount` or `triggerSkipCount`

5. **Schema validates steps with new fields**
   - Arrange: step object with all three new fields
   - Assert: passes JSON Schema validation

6. **Schema validates steps without new fields (backward compat)**
   - Arrange: step object without the three new fields
   - Assert: still passes JSON Schema validation

### Invariants

- `buildStep()` return value is a new object (immutability preserved)
- No existing tests break
- `triggerAttemptCount >= triggerSkipCount >= 0` is enforced by the caller, not by `buildStep()` (buildStep just stores what it receives)

## Outcome

### What changed vs originally planned

Implementation matched the ticket exactly — no discrepancies found between ticket assumptions and actual code.

**Code changes (3 files modified, 0 new):**
- `src/simulation-engine/step-execution.js` — Added 9 lines in `buildStep()` (lines 129-137) handling `costAborted`, `triggerAttemptCount`, `triggerSkipCount` using the same "only-set-when-present" pattern as existing trace fields.
- `schemas/simulation-engine/simulation-result.schema.json` — Added 3 optional properties to `TrajectoryStep`: `costAborted` (boolean), `triggerAttemptCount` (integer, min 0), `triggerSkipCount` (integer, min 0).
- `test/unit/simulation-engine/step-execution.test.mjs` — Added 7 new tests covering all 6 acceptance criteria plus an edge case.
- `test/unit/simulation-engine/trace-schema.test.mjs` — Added 6 schema validation tests (positive and negative) for the new fields.

**All 1942 unit tests pass. No existing tests broken.**
