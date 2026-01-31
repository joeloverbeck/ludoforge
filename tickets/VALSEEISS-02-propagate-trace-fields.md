# VALSEEISS-02: Propagate trace fields through executeActionStep

## Summary

Wire `costAborted`, `triggerAttemptCount`, and `triggerSkipCount` from the action/trigger application results into the `buildStep()` trace parameter in `executeActionStep()`. After this ticket, every step in a simulation trajectory carries the new trace fields when applicable.

## Dependencies

- VALSEEISS-01 (buildStep accepts the fields)

## Blocked by

- VALSEEISS-01

## Blocks

- VALSEEISS-03

## File list

### Modified

| File | Change |
|------|--------|
| `src/simulation-engine/execute-action-step.js` | Compute trigger counts, pass costAborted + trigger counts to buildStep |
| `src/simulation-engine/step-execution.js` | Possibly extend `applyAfterActionTriggers()` to return attempt count (see details) |
| `test/unit/simulation-engine/execute-action-step.test.mjs` | Tests for trace field propagation (create if not exists) |

### Possibly modified

| File | Change |
|------|--------|
| `src/game-kernel/index.js` → `applyTriggers()` | May need to return `attemptCount` alongside `appliedEffects` and error info. Inspect actual return shape. |

## Detailed changes

### `src/simulation-engine/execute-action-step.js`

Currently (line 51-63):

```js
const actionResult = applyAction(definition, state, action, effectContext, args);
const triggerResult = applyAfterActionTriggers(definition, state, effectContext);
// ...
const skippedTriggers = triggerResult.skippedTrigger
  ? [triggerResult.skippedTrigger]
  : [];
```

After changes:

1. Extract `costAborted` from `actionResult`:
   ```js
   const costAborted = actionResult.costAborted === true;
   ```

2. Compute trigger counts. Two approaches depending on what `applyTriggers` returns:
   - **If `applyTriggers` returns attempt count**: use it directly
   - **If not**: count from the definition's trigger array for "after_action" timing, and derive skip count from `skippedTriggers.length`

3. Pass new fields to `buildStep()`:
   ```js
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

### `src/simulation-engine/step-execution.js` — `applyAfterActionTriggers()`

Extend the return value to include `triggerAttemptCount`:

```js
return {
  appliedEffects: result.appliedEffects ?? [],
  skippedTrigger: ...,
  triggerAttemptCount: result.triggerAttemptCount ?? 0,
};
```

This requires inspecting the kernel's `applyTriggers()` to see how many triggers were attempted. If the kernel does not currently expose this, derive it from `definition.triggers.filter(t => t.timing === "after_action").length`.

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
   - Arrange: definition with an action whose cost will fail (e.g., variable decrement below bounds with `boundsMode: "reject"`)
   - Act: run `executeActionStep()` with that action
   - Assert: the recorded step has `costAborted === true`

2. **costAborted absent when action succeeds**
   - Arrange: action with no cost failures
   - Act: run `executeActionStep()`
   - Assert: step does not have `costAborted` property

3. **triggerAttemptCount and triggerSkipCount present**
   - Arrange: definition with after_action triggers, one that will fail
   - Act: run `executeActionStep()`
   - Assert: step has `triggerAttemptCount >= 1` and `triggerSkipCount >= 1`

4. **triggerAttemptCount >= triggerSkipCount**
   - Arrange: any configuration with triggers
   - Assert: `step.triggerAttemptCount >= step.triggerSkipCount`

5. **pass steps have no trigger/cost fields**
   - Arrange: build a pass step via `buildPassStep()`
   - Assert: step has no `costAborted`, `triggerAttemptCount`, or `triggerSkipCount`

### Invariants

- `triggerAttemptCount >= triggerSkipCount >= 0` per step
- `costAborted` is only `true`, never `false` (omitted when not applicable)
- Existing step fields remain unchanged
- Determinism: same inputs produce identical trace fields
