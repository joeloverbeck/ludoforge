# ACTSELTURSTRPRI-08: Add `scheduler-swap` mutation operator

## What

Create a new mutation operator `scheduler-swap` that changes a game definition's `turn.scheduler` from one type to another. It picks a random scheduler from the valid set (`round_robin`, `priority_queue`, `token_holder`) and swaps to it. When swapping to `priority_queue`, it also generates a valid `orderBy` field referencing a random existing per-player integer variable. When swapping to `token_holder`, it generates a valid `holderOf` field referencing a random existing token type and per-player zone. When swapping away from these, it removes the now-irrelevant field.

## Files to touch

- `src/evolutionary-engine/mutation/operators/scheduler-swap.js` — new file implementing the operator
- `configs/evolution-operators.json` — register `scheduler-swap` with `enabled: true` and a weight (suggest 1.0)
- `src/evolutionary-engine/mutation/operators/index.js` (or registry file) — export/register the new operator

## Out of scope

- `scheduler-param-tweak` operator (ACTSELTURSTRPRI-09)
- Wave 2/3 scheduler types (`simultaneous`, `random_draw`, `reactive`)
- Repair operators for invalid scheduler configurations
- Crossover operators

## Acceptance criteria

- Test: Operator swaps from `round_robin` to `priority_queue` and produces valid `orderBy`
- Test: Operator swaps from `priority_queue` to `token_holder` and produces valid `holderOf`
- Test: Swapping to `round_robin` removes `orderBy` and `holderOf` fields
- Test: Operator returns `null` or unchanged genome when no valid swap target exists (e.g., no per-player variables for priority_queue)
- Test: Operator is deterministic with seeded RNG
- Invariant: Output genome passes DSL schema validation
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-05 (priority_queue scheduler)
- ACTSELTURSTRPRI-06 (token_holder scheduler)
