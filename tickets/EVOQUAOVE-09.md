# EVOQUAOVE-09: Repair structural minimum checks

**Spec ref:** EQ-06
**Phase:** 3 — Structural robustness
**Depends on:** EVOQUAOVE-01 (EQ-05 — repair fallback)

## Problem

`repairActions` repairs individual actions but does not validate that the action list is non-empty. After `action-remove` deletes the last action, repair produces `actions: []`. Similarly, `zone-remove` can empty all zones, and `phase-remove` can empty all phases. When `repairEffect` encounters an empty zone set, it silently returns `undefined`, which gets filtered out, leaving `effects: []`.

## Fix

Add structural minimum checks to `dslSafetyRepair` in `repair.js`:
- `actions.length >= 1` — return `null` to trigger fallback (EVOQUAOVE-01)
- `state.zones.length >= 1` if any effect references zones
- `termination.conditions.length >= 1`
- At least one action must have non-empty `effects`

When any minimum fails, `repairGenome()` returns `null`, which triggers the pre-mutation fallback from EVOQUAOVE-01.

## Files to touch

- `src/evolutionary-engine/repair.js` — add structural minimum validation in `dslSafetyRepair`

## Out of scope

- Do NOT change mutation operators (guard clauses are in EVOQUAOVE-02)
- Do NOT change `orchestrator.js` (fallback is in EVOQUAOVE-01)
- Do NOT change effect repair logic itself (`repairEffect`)
- Do NOT add reference validation (that's EVOQUAOVE-10)

## Acceptance criteria

### Tests that must pass

1. **New unit tests** in `test/unit/evolutionary-engine/repair.test.mjs` (or new file):
   - Genome with `actions: []` → repair returns `null`
   - Genome with `state.zones: []` and zone-referencing effects → repair returns `null`
   - Genome with `termination.conditions: []` → repair returns `null`
   - Genome with all actions having `effects: []` → repair returns `null`
   - Genome with valid structure → repair succeeds as before

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- Repair never produces a genome with empty `actions`, empty `termination.conditions`, or all-empty-effects actions
- When structural minimums fail, repair returns `null` (not a patched genome)
- Existing repair logic for valid genomes is unchanged
