# MOTINEVO-03: Remove random/foreach refs from mutation operators

**Status: COMPLETED**

## Description
Update the effect-kind filter in `action-effect-magnitude.js` to remove `"random"` and `"foreach"` from the kind check, keeping only `"inc"` and `"dec"` (the numeric effect kinds that magnitude tweaking applies to). This ensures mutation operators no longer reference retired effect kinds.

## Files to Touch
- `src/evolutionary-engine/mutation/operators/action-effect-magnitude.js`

## Out of Scope
- Adding new mutation operators — handled in MOTINEVO-13
- Config schema changes — handled in MOTINEVO-09
- Other operator files (unless they also reference random/foreach)

## Acceptance Criteria

### Tests That Must Pass
- `grep -r '"random"\|"foreach"' src/evolutionary-engine/` returns zero hits in effect-kind contexts
- Existing unit tests for `action-effect-magnitude` operator pass
- `npm run test:unit` passes

### Invariants That Must Remain True
- The operator still correctly handles `inc` and `dec` effect kinds
- No other mutation operators are modified unless they contain random/foreach references
- Operator selection logic in `mutation.js` is unchanged

## Dependencies
- Depends on: MOTINEVO-01
- Blocks: none

## Outcome

**What was changed vs originally planned:**

The ticket was accurate — no corrections needed. The implementation matched the plan exactly:

- **Code change**: Removed `|| kind === "random" || kind === "foreach"` from the effect-kind filter in `action-effect-magnitude.js:11`. One line changed, minimal diff.
- **No other files required changes** — grep confirmed no other effect-kind filter contexts reference `random`/`foreach` in `src/evolutionary-engine/`.
- **Tests added**: Two new test cases in `test/unit/evolutionary-engine/mutation.test.mjs`:
  1. `ignores effects whose kind is not inc or dec` — verifies the operator is a no-op when all effects are non-numeric kinds.
  2. `only targets inc and dec effects in a mixed-kind action` — verifies only `inc`/`dec` effects are tweaked in an action containing mixed effect kinds.
- **All 357 unit tests pass** (355 existing + 2 new).
