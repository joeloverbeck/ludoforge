# ACTSELTURSTRPRI-09: Add `scheduler-param-tweak` mutation operator

**Status: COMPLETED**

## What

Create a new mutation operator `scheduler-param-tweak` that tweaks parameters of the current scheduler without changing the scheduler type. For `priority_queue`: flip `direction` between `"asc"` and `"desc"`, or swap the `variable` to a different valid per-player variable. For `token_holder`: swap `tokenType` to a different valid token type, or swap `zone` to a different valid per-player zone. For `round_robin`: no-op (returns null).

## Files to touch

- `src/evolutionary-engine/mutation/operators/scheduler-param-tweak.js` — new file implementing the operator
- `configs/evolution-operators.json` — register `scheduler-param-tweak` with `enabled: true` and a weight (suggest 1.5)
- `src/evolutionary-engine/mutation.js` — add import and re-export of the new operator
- `src/evolutionary-engine/mutation/orchestrator.js` — import and add to `ALL_MUTATION_OPERATORS` array
- `schemas/config/evolution-operators.schema.json` — add to `MutationOperatorKind` enum

## Out of scope

- `scheduler-swap` operator (ACTSELTURSTRPRI-08)
- Changing scheduler type (that's scheduler-swap)
- Wave 2/3 scheduler parameters

## Acceptance criteria

- Test: For `priority_queue`, direction flips from `"asc"` to `"desc"` ✅
- Test: For `priority_queue`, variable swaps to a different valid per-player variable ✅
- Test: For `token_holder`, token type swaps to a different valid token type ✅
- Test: For `token_holder`, zone swaps to a different valid per-player zone ✅
- Test: For `round_robin`, operator returns null (no parameters to tweak) ✅
- Test: Operator is deterministic with seeded RNG ✅
- Invariant: Output genome passes DSL schema validation ✅
- Invariant: `tsc -p tsconfig.json` passes ✅
- Invariant: `npm run test:unit` passes (1166/1166) ✅

## Dependencies

- ACTSELTURSTRPRI-05 (priority_queue scheduler)
- ACTSELTURSTRPRI-06 (token_holder scheduler)

## Outcome

**What was actually changed vs originally planned:**

The implementation matched the original plan closely. The only discrepancy in the original ticket was the "Files to touch" section, which referenced `index.js` as the registry file. The actual registration points are `mutation.js` (barrel export) and `mutation/orchestrator.js` (ALL_MUTATION_OPERATORS array). The ticket also omitted `schemas/config/evolution-operators.schema.json`, which required adding `scheduler-param-tweak` to the `MutationOperatorKind` enum for config validation to pass. Both were corrected in the ticket before implementation.

**Files created:**
- `src/evolutionary-engine/mutation/operators/scheduler-param-tweak.js` — operator implementation
- `test/unit/evolutionary-engine/scheduler-param-tweak.test.mjs` — 14 tests across 4 suites

**Files modified:**
- `src/evolutionary-engine/mutation.js` — import + re-export
- `src/evolutionary-engine/mutation/orchestrator.js` — import + array entry
- `configs/evolution-operators.json` — enabled + weight 1.5
- `schemas/config/evolution-operators.schema.json` — enum entry

**Test results:** 1166/1166 unit tests pass, tsc clean.
