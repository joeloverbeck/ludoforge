# EVOQUAOVE-05: Weight destructive operators lower than conservative ones

**Spec ref:** EQ-08
**Phase:** 2 — Strengthen selection pressure
**Depends on:** None

## Problem

All 21 mutation operators have equal weight `1` in `configs/evolution-operators.json`. Destructive structural operators (`action-remove`, `zone-remove`, `phase-remove`, `token-type-remove`, `effect-delete`) are equally likely as conservative operators (`numeric-tweak`, `boolean-toggle`, `effect-param-tweak`). Over 1000 generations, structural collapse is statistically inevitable.

## Fix

Update `configs/evolution-operators.json` to assign differentiated weights:
- Conservative operators (numeric-tweak, boolean-toggle, enum-cycle, effect-param-tweak, effect-reorder, precondition-negation, termination-threshold, termination-outcome, action-effect-magnitude): weight `3`–`5`
- Constructive operators (action-add-small, action-duplicate, effect-insert, phase-add, token-zone-target-add, motif-inject): weight `2`–`3`
- Destructive operators (action-remove, zone-remove, phase-remove, token-type-remove, effect-delete): weight `0.5`–`1`

Exact values from the spec:
```json
"numeric-tweak": 5, "boolean-toggle": 3, "enum-cycle": 3,
"effect-param-tweak": 4, "effect-reorder": 2,
"action-remove": 0.5, "zone-remove": 0.5, "phase-remove": 0.5,
"token-type-remove": 0.5, "effect-delete": 1
```
All other operators not listed: assign reasonable weights in the 2–3 range.

## Files to touch

- `configs/evolution-operators.json` — update `mutation.weights` object

## Out of scope

- Do NOT change `operator-selector.js` or the `WeightedSelector` class
- Do NOT change any operator implementation files
- Do NOT change crossover or repair weights
- Do NOT implement adaptive weighting (that's EVOQUAOVE-13)

## Acceptance criteria

### Tests that must pass

1. **Updated schema test** in `test/unit/evolution-runner/schema.test.mjs` (if it validates config): config must still pass schema validation
2. Existing operator-config tests pass

3. All existing tests:
   - `npm run test:unit` passes

### Invariants

- All operator names in `mutation.enabled` have a corresponding entry in `mutation.weights`
- All weights are positive numbers (> 0)
- `configs/evolution-operators.json` remains valid against `schemas/config/evolution-operators.schema.json`
- The `WeightedSelector` continues to work with non-integer weights (verify it supports floats like `0.5`)
