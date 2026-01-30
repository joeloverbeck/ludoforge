# ACTSELTURSTRPRI-09: Add `scheduler-param-tweak` mutation operator

## What

Create a new mutation operator `scheduler-param-tweak` that tweaks parameters of the current scheduler without changing the scheduler type. For `priority_queue`: flip `direction` between `"asc"` and `"desc"`, or swap the `variable` to a different valid per-player variable. For `token_holder`: swap `tokenType` to a different valid token type, or swap `zone` to a different valid per-player zone. For `round_robin`: no-op (returns null).

## Files to touch

- `src/evolutionary-engine/mutation/operators/scheduler-param-tweak.js` — new file implementing the operator
- `configs/evolution-operators.json` — register `scheduler-param-tweak` with `enabled: true` and a weight (suggest 1.5)
- `src/evolutionary-engine/mutation/operators/index.js` (or registry file) — export/register the new operator

## Out of scope

- `scheduler-swap` operator (ACTSELTURSTRPRI-08)
- Changing scheduler type (that's scheduler-swap)
- Wave 2/3 scheduler parameters

## Acceptance criteria

- Test: For `priority_queue`, direction flips from `"asc"` to `"desc"`
- Test: For `priority_queue`, variable swaps to a different valid per-player variable
- Test: For `token_holder`, token type swaps to a different valid token type
- Test: For `token_holder`, zone swaps to a different valid per-player zone
- Test: For `round_robin`, operator returns null (no parameters to tweak)
- Test: Operator is deterministic with seeded RNG
- Invariant: Output genome passes DSL schema validation
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-05 (priority_queue scheduler)
- ACTSELTURSTRPRI-06 (token_holder scheduler)
