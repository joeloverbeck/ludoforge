# ACTSELTURSTRPRI-10: Add `conditional-effect-insert` mutation operator

## What

Create a new mutation operator `conditional-effect-insert` that wraps an existing effect in a `conditional` block. It selects a random effect from a random action's effect list, removes it, and replaces it with a `conditional` effect whose `then` branch contains the original effect. The `condition` is generated from a random valid expression (e.g., comparing a random variable to a random threshold). Optionally adds an `else` branch with a simple no-op or alternative effect.

## Files to touch

- `src/evolutionary-engine/mutation/operators/conditional-effect-insert.js` — new file implementing the operator
- `configs/evolution-operators.json` — register `conditional-effect-insert` with `enabled: true` and a weight (suggest 1.5)
- `src/evolutionary-engine/mutation/operators/index.js` (or registry file) — export/register the new operator

## Out of scope

- `conditional` effect implementation (ACTSELTURSTRPRI-03)
- `choose-effect-insert` operator (Wave 2)
- Repair of invalid conditional conditions

## Acceptance criteria

- Test: Operator wraps an existing effect in a `conditional` block with a valid condition
- Test: The `then` branch contains the original effect
- Test: Generated condition references a valid variable from the game definition
- Test: Operator returns null when game has no actions or no effects to wrap
- Test: Operator is deterministic with seeded RNG
- Invariant: Output genome passes DSL schema validation
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-03 (conditional effect kind)
