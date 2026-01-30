# ACTSELTURSTRPRI-12: Add `action-cost-tweak` mutation operator

## What

Create a new mutation operator `action-cost-tweak` that modifies the cost amounts on existing actions. It selects a random action that has costs (e.g., `dec` effects on variables like AP), and tweaks the `amount` field by ±1 or ±2 (clamped to min 1). This allows the evolutionary engine to explore action economy variations.

## Files to touch

- `src/evolutionary-engine/mutation/operators/action-cost-tweak.js` — new file implementing the operator
- `configs/evolution-operators.json` — register `action-cost-tweak` with `enabled: true` and a weight (suggest 2.0)
- `src/evolutionary-engine/mutation/operators/index.js` (or registry file) — export/register the new operator

## Out of scope

- Action precondition changes
- Action effect changes (covered by existing effect-param-tweak)
- Adding/removing costs entirely

## Acceptance criteria

- Test: Operator tweaks a `dec` cost amount by ±1 or ±2
- Test: Cost amount is clamped to minimum 1 (never 0 or negative)
- Test: Operator returns null when no actions have costs
- Test: Operator is deterministic with seeded RNG
- Test: Operator handles actions with multiple costs (tweaks one randomly)
- Invariant: Output genome passes DSL schema validation
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

None (uses existing action/effect structure)
