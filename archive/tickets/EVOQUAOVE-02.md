# EVOQUAOVE-02: Structural guard clauses in destructive operators

**Spec ref:** EQ-09
**Phase:** 1 — Stop the bleeding
**Depends on:** None

## Problem

Reassessment: the destructive mutation operators already include guard clauses that prevent removal when only a single structural element remains. The gap is test coverage verifying the guard behavior and the "no-op" invariants across all listed operators.

## Fix

Confirm existing guard clauses align with EQ-09 and add unit tests that assert no-op behavior at the minimum counts, plus the normal removal path when counts exceed the minimum.

Minimum counts:
- `action-remove`: `actions.length > 1`
- `zone-remove`: `state.zones.length > 1` (if zones exist)
- `phase-remove`: `turn.phases.length > 1` (if phases exist)
- `token-type-remove`: `state.tokenTypes.length > 1` (if token types exist)
- `effect-delete`: action must retain at least 1 effect after deletion

## Files to touch

- `src/evolutionary-engine/mutation/operators/action-remove.js`
- `src/evolutionary-engine/mutation/operators/zone-remove.js`
- `src/evolutionary-engine/mutation/operators/phase-remove.js`
- `src/evolutionary-engine/mutation/operators/token-type-remove.js`
- `src/evolutionary-engine/mutation/operators/effect-delete.js`

## Out of scope

- Do NOT change operator weights (that's EVOQUAOVE-05)
- Do NOT change the repair pipeline
- Do NOT change non-destructive operators
- Do NOT add new operators

## Acceptance criteria

### Tests that must pass

1. **New/updated unit tests** for each operator:
   - `action-remove` returns genome unchanged when `actions.length === 1`
   - `zone-remove` returns genome unchanged when `state.zones.length === 1`
   - `phase-remove` returns genome unchanged when `turn.phases.length === 1`
   - `token-type-remove` returns genome unchanged when `state.tokenTypes.length === 1`
   - `effect-delete` returns genome unchanged when the target action has only 1 effect
   - Each operator still removes normally when count > minimum

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- No destructive operator ever produces a definition with zero actions, zero zones (if zones were present), zero phases (if phases were present), zero token types (if present), or an action with zero effects
- When the guard fires, the returned genome is deep-equal to the input genome and the input is not mutated (a cloned definition is acceptable)
- Immutability: input genome is never mutated

## Completion

- Status: Completed
- Completed: 2026-01-30

## Outcome

Guard clauses already existed in the operators, so the scope shifted to test coverage. Added unit tests for no-op guard behavior across action/phase/zone/token-type removal and tightened the effect-delete no-op assertion; no operator code changes were needed.
