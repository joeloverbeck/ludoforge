# EVOQUAOVE-10: Repair effect-to-state reference validation

**Spec ref:** EQ-07
**Phase:** 3 — Structural robustness
**Depends on:** EVOQUAOVE-09 (EQ-06 — structural minimums)

## Problem

Repair fixes `move`/`spawn` effects pointing to deleted zones, but does not fix:
- Effects referencing deleted variables (e.g., `set`/`inc`/`dec` effects with `target.kind: "var"` and `target.id` missing from `state.variables`)
- Effects referencing deleted token types (e.g., `spawn` effects with `target.kind: "token"` and `target.id` missing from `state.tokenTypes`)
- Effects referencing deleted zones (`toZone` on `move`/`spawn`, or `zone` on `move_spatial`)
- Action preconditions that reference deleted variables (Expr `ref.kind: "var"` with missing `ref.id`)

After token-type or variable mutations, effects and preconditions can reference state that no longer exists.

## Fix

Add reference validation to `repairEffect` and precondition repair:
- For each effect, verify that referenced `target.id`/`toZone`/`zone` exist in the current definition state (by reference kind)
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
   - Effect with `target.kind: "var"` and invalid `target.id` → repaired to valid variable or removed
   - `spawn` effect with `target.kind: "token"` and invalid `target.id` → repaired to valid token type or removed
   - Effect with invalid `toZone`/`zone` → repaired to valid zone or removed
   - Action precondition Expr with invalid variable ref → precondition removed
   - All references valid → no changes made

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- After repair, no effect references a missing variable/token type/zone when that reference is expected by the effect kind
- After repair, no precondition references a `variableId` that doesn't exist
- Repair still returns `null` if structural minimums (EVOQUAOVE-09) are violated after reference cleanup
- Immutability: input genome is never mutated

## Status

Completed — 2026-01-30

## Outcome

- Updated repair to validate effect target refs (vars/spawn token types) and zone refs; invalid refs are replaced or removed, and action preconditions with missing variables are dropped.
- Added/updated repair tests to cover reference repair and removal, including the zone-empty case now removing zone-referencing effects instead of failing repair.
