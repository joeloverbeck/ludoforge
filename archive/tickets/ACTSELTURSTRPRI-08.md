# ACTSELTURSTRPRI-08: Add `scheduler-swap` mutation operator

## What

Create a new mutation operator `scheduler-swap` that changes a game definition's `turn.scheduler` from one type to another. It picks a random scheduler from the valid set (`round_robin`, `priority_queue`, `token_holder`) and swaps to it. When swapping to `priority_queue`, it also generates a valid `orderBy` field referencing a random existing per-player integer variable. When swapping to `token_holder`, it generates valid `tokenType` and `zone` fields referencing a random existing token type and per-player zone. When swapping away from these, it removes the now-irrelevant field.

## Files to touch

- `src/evolutionary-engine/mutation/operators/scheduler-swap.js` — new file implementing the operator
- `configs/evolution-operators.json` — register `scheduler-swap` with `enabled: true` and a weight (suggest 1.0)
- `src/evolutionary-engine/mutation/orchestrator.js` — import and add to `ALL_MUTATION_OPERATORS` array
- `src/evolutionary-engine/mutation.js` — import and re-export the new operator

## Out of scope

- `scheduler-param-tweak` operator (ACTSELTURSTRPRI-09)
- Wave 2/3 scheduler types (`simultaneous`, `random_draw`, `reactive`)
- Repair operators for invalid scheduler configurations
- Crossover operators

## Acceptance criteria

- Test: Operator swaps from `round_robin` to `priority_queue` and produces valid `orderBy`
- Test: Operator swaps from `priority_queue` to `token_holder` and produces valid `tokenType` and `zone`
- Test: Swapping to `round_robin` removes `orderBy`, `tokenType`, and `zone` fields
- Test: Operator returns `null` or unchanged genome when no valid swap target exists (e.g., no per-player variables for priority_queue)
- Test: Operator is deterministic with seeded RNG
- Invariant: Output genome passes DSL schema validation
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-05 (priority_queue scheduler)
- ACTSELTURSTRPRI-06 (token_holder scheduler)

## Status: COMPLETED

## Outcome

**What was actually changed vs originally planned:**

The ticket was implemented as planned with minor corrections to assumptions:

1. **Ticket corrections** (before implementation):
   - Fixed file references: `index.js` → `orchestrator.js` + `mutation.js` (the actual registry/re-export files)
   - Fixed field name: `holderOf` → `tokenType` + `zone` (actual schema field names for `token_holder`)

2. **Files created/modified**:
   - `src/evolutionary-engine/mutation/operators/scheduler-swap.js` — new operator (130 lines)
   - `src/evolutionary-engine/mutation/orchestrator.js` — import + registration
   - `src/evolutionary-engine/mutation.js` — import + re-export
   - `configs/evolution-operators.json` — enabled with weight 1.0
   - `schemas/config/evolution-operators.schema.json` — added to `MutationOperatorKind` enum
   - `test/unit/evolutionary-engine/mutation.test.mjs` — 8 new tests

3. **Operator behavior**:
   - Validates swap targets based on definition state (per-player int vars for priority_queue, per-player zones with matching token types for token_holder)
   - Strips old scheduler-specific fields, adds new ones
   - Returns unchanged genome when no valid swap target exists
   - All outputs pass DSL schema validation
