# EVOQUAOVE-09: Repair structural minimum checks

**Spec ref:** EQ-06
**Phase:** 3 — Structural robustness
**Depends on:** EVOQUAOVE-01 (EQ-05 — repair fallback)

## Problem

`repairActions` repairs individual actions but does not validate that the action list is non-empty. While destructive mutation operators already guard against removing the last action/zone/phase, malformed genomes (seed inputs, manual edits, or other repair steps that prune effects) can still reach `dslSafetyRepair` with `actions: []`, `termination.conditions: []`, or all actions having empty `effects`. Additionally, `repairEffect` does not drop zone-referencing effects when the zone list is empty; it leaves the invalid reference intact, which can propagate structural collapse elsewhere if `state.zones` is empty.

**Assumptions check (2026-01-30):**
- `action-remove`, `zone-remove`, and `phase-remove` already guard against removing the last element, so they do not directly create empty arrays.
- There is no dedicated repair unit test file yet; new tests are required for structural minimums.
- `repairEffect` does not return `undefined` for empty zone sets; it preserves the effect when no valid zone exists.

## Fix

Add structural minimum checks to `dslSafetyRepair` in `repair.js`:
- `actions.length >= 1` — return `null` to trigger fallback (EVOQUAOVE-01)
- `state.zones.length >= 1` if any effect references zones (`move`, `spawn`, `move_spatial`, including nested `repeat` effects)
- `termination.conditions.length >= 1`
- At least one action must have non-empty `effects`

When any minimum fails, `repairGenome()` returns `null`, which triggers the pre-mutation fallback from EVOQUAOVE-01.

## Files to touch

- `src/evolutionary-engine/repair.js` — add structural minimum validation in `dslSafetyRepair`
- `test/unit/evolutionary-engine/repair.test.mjs` — new coverage for structural minimums

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

## Status

Completed — 2026-01-30.

## Outcome

- Added structural minimum checks in `dslSafetyRepair` for actions, termination conditions, zone-referencing effects, and non-empty action effects.
- Added repair unit tests to cover structural minimum failures and valid structure behavior.
- Left mutation operators unchanged because they already guard against removing the last element.
