# EVOQUAOVE-10: Repair effect-to-state reference validation

**Spec ref:** EQ-07
**Phase:** 3 — Structural robustness
**Depends on:** EVOQUAOVE-09 (EQ-06 — structural minimums)

## Problem

Repair fixes `move`/`spawn` effects pointing to deleted zones, but does not fix:
- Effects referencing deleted variables (e.g., `set` effect with `variableId` not in `state.variables`)
- Effects referencing deleted token types
- Preconditions referencing deleted variables

After `token-type-remove` or variable-impacting mutations, effects and preconditions can reference state that no longer exists.

## Fix

Add reference validation to `repairEffect` and precondition repair:
- For each effect, verify that referenced `variableId`, `tokenTypeId`, and `zoneId` exist in the current definition state
- Replace missing references with valid alternatives from the remaining state
- If no valid target exists, remove the effect entirely
- For preconditions, verify referenced variables exist; remove preconditions with invalid references

## Files to touch

- `src/evolutionary-engine/repair.js` — extend `repairEffect` and add precondition reference repair

## Out of scope

- Do NOT change mutation operators
- Do NOT change the DSL schema or validation
- Do NOT change semantic checks (`semantic.js`)
- Do NOT change the evaluation pipeline

## Acceptance criteria

### Tests that must pass

1. **New unit tests** in `test/unit/evolutionary-engine/repair.test.mjs` (or new file):
   - Effect with `variableId` not in `state.variables` → repaired to valid variable or removed
   - Effect with `tokenTypeId` not in `state.tokenTypes` → repaired to valid type or removed
   - Effect with `zoneId` not in `state.zones` → repaired to valid zone or removed
   - Precondition with `variableId` not in `state.variables` → precondition removed
   - All references valid → no changes made

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- After repair, no effect references a `variableId`, `tokenTypeId`, or `zoneId` that doesn't exist in the definition
- After repair, no precondition references a `variableId` that doesn't exist
- Repair still returns `null` if structural minimums (EVOQUAOVE-09) are violated after reference cleanup
- Immutability: input genome is never mutated
