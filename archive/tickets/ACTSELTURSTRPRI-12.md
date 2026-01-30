# ACTSELTURSTRPRI-12: Add `action-cost-tweak` mutation operator

**Status**: Done

## What

Create a new mutation operator `action-cost-tweak` that modifies the cost amounts on existing actions. It selects a random action cost (the `costs` list on actions, typically `dec` effects on variables like AP), and tweaks the `amount` field by ±1 or ±2 (clamped to min 1). This allows the evolutionary engine to explore action economy variations. Use the action selection/turn structure mechanics reference from `reports/action-selection-turn-structure-mechanics.md` (the repo does not currently have a `specs/action-selection-turn-structure-mechanics.md`).

## Files to touch

- `src/evolutionary-engine/mutation/operators/action-cost-tweak.js` — new file implementing the operator
- `src/evolutionary-engine/mutation/orchestrator.js` — register the operator in `ALL_MUTATION_OPERATORS`
- `src/evolutionary-engine/mutation.js` — export the operator
- `configs/evolution-operators.json` — register `action-cost-tweak` with `enabled: true` and a weight (suggest 2.0)
- `schemas/config/evolution-operators.schema.json` — add the operator to the allowed enum list

## Out of scope

- Action precondition changes
- Action effect changes (covered by existing effect-param-tweak)
- Adding/removing costs entirely

## Acceptance criteria

- Test: Operator tweaks a `dec` cost amount by ±1 or ±2
- Test: Cost amount is clamped to minimum 1 (never 0 or negative)
- Test: Operator is a no-op (returns unchanged genome definition) when no actions have costs
- Test: Operator is deterministic with seeded RNG
- Test: Operator handles actions with multiple costs (tweaks one randomly)
- Invariant: Output genome passes DSL schema validation
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None (uses existing action/effect structure)

## Outcome

- Added `action-cost-tweak` mutation operator and wired it into mutation registration plus operator config/schema.
- Added unit coverage for deterministic tweaks, clamp behavior, multi-cost selection, and schema validity.
- Updated architecture docs to include the new operator and weight tier placement.
- Corrected ticket assumptions (operator registry location and no-op behavior, plus reference doc path).
