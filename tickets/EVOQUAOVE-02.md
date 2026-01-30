# EVOQUAOVE-02: Structural guard clauses in destructive operators

**Spec ref:** EQ-09
**Phase:** 1 — Stop the bleeding
**Depends on:** None

## Problem

Destructive mutation operators (`action-remove`, `zone-remove`, `phase-remove`, `token-type-remove`, `effect-delete`) remove elements unconditionally. `action-remove` can delete the last action. `zone-remove` can delete the last zone. This causes structural collapse.

## Fix

Each destructive operator must check a minimum count before applying. If removal would leave the collection empty (or below a structural minimum), the mutation is a no-op — return the genome unchanged.

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
- When the guard fires, the returned genome is identical to the input genome (no mutation applied)
- Immutability: input genome is never mutated
