# Spec: Systemic Validity Fixes

## Problem

Evolved genomes contain out-of-bounds variable values, unreachable termination conditions, and duplicate actions. The root cause is a gap between structural validation (which passes) and semantic/game-logic validation (which is missing). The runtime silently allows overflow because `boundsMode` is not passed for action effects and trigger effects.

## Report Claim Validation

### Confirmed Valid Claims

| Claim | Evidence |
|-------|----------|
| Set effects can write values outside variable [min,max] | `step-execution.js:42` applies effects without boundsMode |
| Trigger effects overflow variables | `triggers.js:87` applies effects without boundsMode |
| Mutation produces out-of-bounds set values | `effect-param-tweak.js:44-48` uses `tweakNonNegative` (no upper bound) |
| Termination thresholds can exceed variable max | Semantic validator only checks condition existence, not threshold range |
| No duplicate action detection | `action-analysis.js` checks dominance/free-lunch but not duplicates |
| Repair doesn't fix effect values | `effect-repair.js` fixes dangling refs only, not value ranges |
| Termination repair doesn't check reachability | `termination-repair.js` only repairs `outcome.players` |

### Invalid / Already Handled Claims

| Claim | Reality |
|-------|---------|
| "Duplicate genome IDs in shortlist" | IDs use SHA256 content hash + dedup in elite-selector. Different niches can select the same genome. |
| "Costs allow underflow" | Costs use `boundsMode: "reject"` at both preflight (`actions.js:56`) and application (`step-execution.js:32`). |
| "Token references cause deadlocks" | `token-effects.js` returns `{ ok: false }` for missing tokens; simulation skips the effect. |
| "Termination threshold mutation ignores bounds" | `termination-threshold.js:47` uses `tweakIntValue(current, min, max, rng)` correctly. |

---

## Changes

### P1: Runtime Bounds Enforcement

**Rationale**: Safety net. Even if mutations produce bad values, runtime clamping prevents game state corruption and ensures genotype matches phenotype.

#### P1-A: Clamp action effects

**File**: `src/simulation-engine/step-execution.js`

**Change**: Line 42, add `{ boundsMode: "clamp" }` to action effect application.

```js
// Before:
const result = applyEffect(state, effect, effectContext);
// After:
const result = applyEffect(state, effect, effectContext, { boundsMode: "clamp" });
```

#### P1-B: Clamp trigger effects

**File**: `src/game-kernel/triggers.js`

**Change**: Line 87, add `{ boundsMode: "clamp" }` to trigger effect application.

```js
// Before:
const result = applyEffect(state, effect, {
  state, playerId: context.playerId, phase: context.phase,
  variableIndex, impact: context.impact,
});
// After:
const result = applyEffect(state, effect, {
  state, playerId: context.playerId, phase: context.phase,
  variableIndex, impact: context.impact,
}, { boundsMode: "clamp" });
```

---

### P2: Mutation Operator Bounds Awareness

**Rationale**: Prevent out-of-bounds values from being generated in the first place, reducing repair workload.

#### P2-A: Bounds-aware effect-param-tweak

**File**: `src/evolutionary-engine/mutation/operators/effect-param-tweak.js`

**Change**: Look up target variable's [min, max] before tweaking. Use `tweakIntValue` for int variables instead of `tweakNonNegative`.

- For `set` effects: `tweakIntValue(effect.value, min, max, rng)`
- For `inc`/`dec` effects: `tweakIntValue(effect.amount, 0, max - min, rng)`
- Fallback to `tweakNonNegative` if variable not found or not int type

Add helper `findVariableBounds(definition, variableId)` returning `{ min, max } | null`.

---

### P3: Semantic Validation Additions

**Rationale**: Provide warnings about remaining genome quality issues that slip through mutation and repair.

#### P3-A: Validate effect values against variable bounds

**File**: `src/dsl/semantic/semantic-validators.js`

**Change**: In `validateEffect()`, after existing ref validation, add:
- If `set` effect targets a var with int type: check `value` is within [min, max]. Push warning rule `"effect-value-out-of-bounds"`.
- If `inc`/`dec` effect: check `amount` does not exceed `max - min`. Push warning rule `"effect-amount-excessive"`.

**File**: `src/dsl/semantic/semantic-validators.js` (function signature)

**Change**: Add `variableById` parameter to `createSemanticValidators`.

**File**: `src/dsl/semantic.js`

**Change**: Pass `variableById` (from `buildIdIndex`) into `createSemanticValidators`. Register new rules as warnings.

#### P3-B: Validate termination thresholds

**File**: `src/dsl/semantic/termination-validator.js`

**Change**: Add exported function `validateTerminationThresholds(terminationConditions, variableById, pushIssue)`:
- For `cmp` conditions where left is a var ref and right is a literal: check literal is within variable [min, max]. Rule: `"termination-threshold-out-of-bounds"`.
- Check if condition is trivially true at initial state. Rule: `"termination-immediately-true"`.

**File**: `src/dsl/semantic.js`

**Change**: Call new validator and register rules as warnings.

#### P3-C: Detect duplicate actions

**File**: `src/dsl/semantic/duplicate-action-detector.js` (new)

**Change**: Export `detectDuplicateActions(actions, pushIssue)`:
- Compare action pairs (excluding `id`). Use JSON.stringify for deep equality.
- Push info-level issue with rule `"duplicate-action"`.

**File**: `src/dsl/semantic.js`

**Change**: Import and call after action validation. Register as info-level rule.

---

### P4: Repair Operator Enhancements

**Rationale**: Ensure mutations that slip through P2 are corrected before evaluation.

#### P4-A: Clamp effect values in repair

**File**: `src/evolutionary-engine/repair/effect-repair.js`

**Change**: In `repairEffect()`, after existing reference repairs, before returning:
- If target is a var with int type:
  - `set` value: clamp to [min, max]
  - `inc`/`dec` amount: clamp to [0, max - min]
- Use `clampNumber` from `./utils.js` (already imported).

The `definition` parameter is already available in `repairEffect()`.

#### P4-B: Clamp termination thresholds in repair

**File**: `src/evolutionary-engine/repair/termination-repair.js`

**Change**: Add exported function `repairTerminationThresholds(definition)`:
- For each termination condition with `cmp` comparing a var ref to a literal:
  - If literal is outside variable [min, max], clamp it.
- Return the (possibly updated) definition.

**File**: `src/evolutionary-engine/repair/orchestrator.js`

**Change**: After `repairTerminationOutcomes(definition)`, call `repairTerminationThresholds(repairedDefinition)`.

---

### P5: Lightweight Reachability Check (deferred)

An interval abstract interpretation pass computing [minReachable, maxReachable] per variable. Reject genomes with unreachable termination thresholds. This is non-trivial and deferred. P1-P4 together handle the most critical issues.

---

## Invariants

After all changes, the following must hold:

1. **No variable can be set outside [min, max] during simulation.** Any `set`, `inc`, or `dec` effect that would produce an out-of-bounds value is clamped to the nearest bound.

2. **Costs still use `boundsMode: "reject"`.** An action whose cost would underflow a variable is still correctly marked illegal. (Regression guard.)

3. **`effect-param-tweak` produces values within target variable bounds.** For `set` effects on int variables: `min <= value <= max`. For `inc`/`dec`: `0 <= amount <= max - min`.

4. **Repair clamps effect values and termination thresholds to variable bounds.** After repair, no `set` value exceeds the target variable's range, no termination threshold exceeds the referenced variable's range.

5. **Semantic validation warns about out-of-bounds effect values, unreachable termination thresholds, immediately-true termination conditions, and duplicate actions.**

6. **Existing tests continue to pass.** All changes are additive (new boundsMode, new validation rules, enhanced repair). No existing behavior is removed.

---

## Tests

### New Test Files

#### `test/unit/simulation-engine/step-execution-bounds.test.mjs`
1. `inc` effect that would exceed variable max is clamped to max
2. `dec` effect that would go below variable min is clamped to min
3. `set` effect with value above max is clamped
4. `set` effect with value below min is clamped
5. Costs still reject on underflow (regression)

#### `test/unit/game-kernel/trigger-bounds.test.mjs`
1. Trigger `inc` effect that would overflow is clamped
2. Trigger `set` effect above max is clamped
3. Multiple trigger firings: cumulative result still clamped

#### `test/unit/dsl/semantic/effect-bounds-validation.test.mjs`
1. `set` value above variable max produces warning
2. `set` value within bounds produces no issue
3. `inc` amount exceeding range produces warning
4. Non-int variable effects are not flagged

#### `test/unit/dsl/semantic/termination-threshold-validation.test.mjs`
1. Threshold above variable max produces warning
2. Threshold below variable min produces warning
3. Threshold within bounds produces no issue
4. Immediately-true condition produces warning

#### `test/unit/dsl/semantic/duplicate-action-detection.test.mjs`
1. Two identical actions (different IDs) produce info issue
2. Different actions produce no issue

### Extended Test Files

#### `test/unit/evolutionary-engine/effect-param-tweak.test.mjs`
Add tests:
1. `set` value stays within variable [min, max] after mutation
2. `inc` amount does not exceed variable range after mutation
3. Falls back to tweakNonNegative for unknown variables

#### `test/unit/evolutionary-engine/repair.test.mjs`
Add tests:
1. Effect `set` value clamped to variable bounds after repair
2. Effect `inc`/`dec` amount clamped after repair
3. Termination threshold clamped to variable bounds after repair

---

## Implementation Order

1. P1 (runtime clamping) -- two one-line changes, immediate safety net
2. P2 (mutation bounds) -- prevents most bad values at source
3. P4 (repair clamping) -- catches remaining bad values before evaluation
4. P3 (semantic warnings) -- informational quality signals

---

## Verification

```bash
# Run all unit tests
npm run test:unit

# Run specific new tests
node --test test/unit/simulation-engine/step-execution-bounds.test.mjs
node --test test/unit/game-kernel/trigger-bounds.test.mjs
node --test test/unit/dsl/semantic/effect-bounds-validation.test.mjs
node --test test/unit/dsl/semantic/termination-threshold-validation.test.mjs
node --test test/unit/dsl/semantic/duplicate-action-detection.test.mjs

# Run existing tests that could be affected
node --test test/unit/simulation-engine/step-execution.test.mjs
node --test test/unit/simulation-engine/cost-abort.test.mjs
node --test test/unit/evolutionary-engine/effect-param-tweak.test.mjs
node --test test/unit/evolutionary-engine/repair.test.mjs
node --test test/unit/dsl/semantic.test.mjs

# Type check
tsc -p tsconfig.json

# Integration tests (simulation pipeline)
npm run test:integration

# E2E tests (full evolution run)
npm run test:e2e
```
