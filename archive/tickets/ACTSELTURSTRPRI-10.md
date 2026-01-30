# ACTSELTURSTRPRI-10: Add `conditional-effect-insert` mutation operator

**Status**: COMPLETED

## What

Create a new mutation operator `conditional-effect-insert` that wraps an existing effect in a `conditional` block. It selects a random effect from a random action's effect list, removes it, and replaces it with a `conditional` effect whose `then` branch contains the original effect. The `condition` is generated from a random valid `cmp` expression comparing a variable from the game definition to a random threshold. Optionally adds an `else` branch with a simple alternative effect.

## Files to touch

- `src/evolutionary-engine/mutation/operators/conditional-effect-insert.js` — new file implementing the operator
- `configs/evolution-operators.json` — register `conditional-effect-insert` with `enabled: true` and a weight (suggest 1.5)
- `src/evolutionary-engine/mutation/orchestrator.js` — import and add to `ALL_MUTATION_OPERATORS`
- `src/evolutionary-engine/mutation.js` — import and re-export in barrel

## Assumptions corrected

- The ticket originally referenced `src/evolutionary-engine/mutation/operators/index.js` as the registry file. The actual registry is `src/evolutionary-engine/mutation/orchestrator.js` (operator array) and `src/evolutionary-engine/mutation.js` (barrel re-exports).
- The ticket said "returns null when game has no actions or no effects to wrap". Existing operator convention returns an unchanged clone of the genome, not null. Corrected to match convention.
- The `conditional` effect kind and its schema already exist (added by ACTSELTURSTRPRI-03). The `Expr` type supports `cmp`, `value`, `ref`, `and`, `or`, `not` kinds.

## Out of scope

- `conditional` effect implementation (ACTSELTURSTRPRI-03)
- `choose-effect-insert` operator (Wave 2)
- Repair of invalid conditional conditions

## Acceptance criteria

- Test: Operator wraps an existing effect in a `conditional` block with a valid `cmp` condition
- Test: The `then` branch contains the original effect
- Test: Generated condition references a valid variable from the game definition
- Test: Operator returns unchanged clone when game has no actions or no effects to wrap
- Test: Operator is deterministic with seeded RNG
- Invariant: Output genome passes DSL schema validation
- Invariant: `tsc -p tsconfig.json` passes
- Invariant: `npm run test:unit` passes

## Dependencies

- ACTSELTURSTRPRI-03 (conditional effect kind)

## Outcome

**What changed vs originally planned:**

- Created `src/evolutionary-engine/mutation/operators/conditional-effect-insert.js` — operator that wraps a random existing effect from a random action in a `conditional` block with a `cmp` condition referencing a game variable
- Updated `schemas/config/evolution-operators.schema.json` — added `conditional-effect-insert` to `MutationOperatorKind` enum (not anticipated in original ticket)
- Updated `configs/evolution-operators.json` — registered with weight 1.5
- Updated `src/evolutionary-engine/mutation/orchestrator.js` — imported and added to `ALL_MUTATION_OPERATORS` (ticket incorrectly referenced `operators/index.js`)
- Updated `src/evolutionary-engine/mutation.js` — barrel re-export (ticket incorrectly referenced `operators/index.js`)
- Created `test/unit/evolutionary-engine/conditional-effect-insert.test.mjs` — 9 tests covering all acceptance criteria
- Corrected ticket assumptions: registry files, return convention (clone not null), schema file needing update
