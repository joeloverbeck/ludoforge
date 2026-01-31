# VALSEEISS-02: Propagate trace fields through executeActionStep

**Status: COMPLETED**

## Summary

Wire `costAborted`, `triggerAttemptCount`, and `triggerSkipCount` from the action/trigger application results into the `buildStep()` trace parameter in `executeActionStep()`. After this ticket, every step in a simulation trajectory carries the new trace fields when applicable.

## Dependencies

- VALSEEISS-01 (buildStep accepts the fields) — **done**

## Blocked by

- VALSEEISS-01

## Blocks

- VALSEEISS-03

## File list

### Modified

| File | Change |
|------|--------|
| `src/simulation-engine/execute-action-step.js` | Extract costAborted from actionResult, get triggerAttemptCount from applyAfterActionTriggers, compute triggerSkipCount from skippedTriggers, pass all three to buildStep |
| `src/simulation-engine/step-execution.js` | Extend `applyAfterActionTriggers()` to return `triggerAttemptCount` derived from trigger count in definition |
| `test/unit/simulation-engine/execute-action-step.test.mjs` | Tests for trace field propagation |

### Not modified (corrected from original ticket)

| File | Original assumption | Reality |
|------|-------------------|---------|
| `src/game-kernel/index.js` / `src/game-kernel/triggers.js` | "May need to return attemptCount" | Not needed — `applyTriggers` does not expose attempt count. We derive trigger count in `applyAfterActionTriggers` from the definition instead. |

## Assumption corrections (vs original ticket)

1. **`trigger.timing` vs `trigger.event`**: The original ticket referenced `definition.triggers.filter(t => t.timing === "after_action")`. The kernel actually uses `trigger.event`, not `trigger.timing`. The correct filter is `trigger.event === "after_action"`.
2. **`collectTriggers` includes stepEffects**: The kernel's `collectTriggers(definition)` merges `definition.triggers` with `definition.turn.stepEffects`. Our count must use the same logic to stay consistent.
3. **Kernel `applyTriggers` return shape**: On success it returns `{ ok, fired, iterations, appliedEffects }`. On failure `{ ok: false, reason }`. It does NOT return `triggerAttemptCount`. We derive it from the definition.
4. **At most 1 skipped trigger per call**: `applyTriggers` stops at the first failure, so `skippedTrigger` (singular) in `applyAfterActionTriggers` is correct — at most one trigger skip per step.

## Detailed changes

### `src/simulation-engine/step-execution.js` — `applyAfterActionTriggers()`

Count matching triggers for the `"after_action"` event using the same logic as the kernel's `collectTriggers`:

```js
export function applyAfterActionTriggers(definition, state, context) {
  const allTriggers = [...(definition.triggers ?? []), ...(definition.turn?.stepEffects ?? [])];
  const triggerAttemptCount = allTriggers.filter(t => t.event === "after_action").length;
  const result = applyTriggers(definition, state, "after_action", context);
  if (!result.ok) {
    return {
      appliedEffects: result.appliedEffects ?? [],
      skippedTrigger: { reason: result.reason ?? "unknown" },
      triggerAttemptCount,
    };
  }
  return { appliedEffects: result.appliedEffects ?? [], triggerAttemptCount };
}
```

### `src/simulation-engine/execute-action-step.js`

1. Extract `costAborted` from `actionResult`.
2. Get `triggerAttemptCount` from `triggerResult`.
3. Compute `triggerSkipCount` from `skippedTriggers.length`.
4. Pass all three to `buildStep()`.

```js
const costAborted = actionResult.costAborted === true;
const triggerAttemptCount = triggerResult.triggerAttemptCount ?? 0;
const triggerSkipCount = skippedTriggers.length;

const step = buildStep(state, action.id, legalActionCount, impact, {
  stateHash,
  bindings: {},
  appliedEffects,
  skippedEffects,
  skippedTriggers,
  decisionSpaceRaw,
  decisionSpaceCapped,
  costAborted,
  triggerAttemptCount,
  triggerSkipCount,
});
```

### Pass steps (no-action steps)

`buildPassStep()` in `step-execution.js` creates steps with `actionId: null`. These do NOT get costAborted or trigger counts (no action was executed). No change needed — the fields simply won't be present, which is correct per the schema (they're optional).

## Out of scope

- Modifying `buildStep()` itself (done in VALSEEISS-01)
- Aggregation in log-adapter (VALSEEISS-03)
- Simultaneous loop propagation (same `executeActionStep` is used by both loops, so this is automatic)
- Any metric or degeneracy changes

## Acceptance criteria

### Tests

1. **costAborted appears in step when action cost fails**
   - Arrange: definition with an action whose cost will fail (variable decrement below bounds with `boundsMode: "reject"`)
   - Act: run `executeActionStep()` with that action
   - Assert: the recorded step has `costAborted === true`

2. **costAborted absent when action succeeds**
   - Arrange: action with no cost failures
   - Act: run `executeActionStep()`
   - Assert: step does not have `costAborted` property

3. **triggerAttemptCount and triggerSkipCount present when trigger fails**
   - Arrange: definition with after_action triggers, one that will fail
   - Act: run `executeActionStep()`
   - Assert: step has `triggerAttemptCount >= 1` and `triggerSkipCount >= 1`

4. **triggerAttemptCount >= triggerSkipCount**
   - Arrange: any configuration with triggers
   - Assert: `step.triggerAttemptCount >= step.triggerSkipCount`

5. **pass steps have no trigger/cost fields**
   - Arrange: build a pass step via `buildPassStep()`
   - Assert: step has no `costAborted`, `triggerAttemptCount`, or `triggerSkipCount`

6. **triggerAttemptCount reflects definition trigger count, not kernel internals**
   - Arrange: definition with 2 after_action triggers, both succeed
   - Assert: `step.triggerAttemptCount === 2` and `step.triggerSkipCount === 0`

### Invariants

- `triggerAttemptCount >= triggerSkipCount >= 0` per step
- `costAborted` is only `true`, never `false` (omitted when not applicable)
- Existing step fields remain unchanged
- Determinism: same inputs produce identical trace fields

## Outcome

### What changed vs originally planned

1. **`applyAfterActionTriggers`** (`step-execution.js`): Extended to count `after_action` triggers from `definition.triggers` AND `definition.turn.stepEffects` (using `trigger.event`, not `trigger.timing` as the original ticket incorrectly stated). Returns `triggerAttemptCount` in its result.
2. **`executeActionStep`** (`execute-action-step.js`): Now extracts `costAborted` from `actionResult`, `triggerAttemptCount` from `triggerResult`, and computes `triggerSkipCount` from `skippedTriggers.length`. All three are passed to `buildStep()`.
3. **No kernel changes**: The original ticket speculated about modifying `applyTriggers()` in the game kernel. This was unnecessary — trigger count is derived from the definition in `applyAfterActionTriggers` instead.
4. **Assumption corrections documented**: `trigger.event` (not `trigger.timing`), `collectTriggers` includes `stepEffects`, kernel `applyTriggers` doesn't expose attempt counts.
5. **Tests added**: 13 new tests across `execute-action-step.test.mjs` and `step-execution.test.mjs` covering costAborted, triggerAttemptCount, triggerSkipCount, pass steps, stepEffects inclusion, and determinism.
6. **Docs updated**: `docs/architecture/simulation-engine.md` step 13 now lists the three new trace fields with their derivation.
