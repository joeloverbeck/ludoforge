# MUTREF-005: Operators batch A (simple operators)

## Goal
Split the simpler operators into individual modules and add integration tests for their behavior.

## Current state check (2026-01-28)
- `src/evolutionary-engine/mutation.js` still defines all operators inline (no operator modules yet).
- `src/evolutionary-engine/mutation/index.js` does not exist yet.
- `src/evolutionary-engine/mutation/operators/` does not exist yet.
- `test/integration/mutation-operators.test.mjs` does not exist yet.
- `test/integration/fixtures/index.mjs` exists and exports basic fixtures only.

## Scope
- Move the following operators into `mutation/operators/`:
  - `numeric-tweak`
  - `boolean-toggle`
  - `enum-cycle`
  - `precondition-negation`
  - `termination-threshold`
  - `termination-outcome`
  - `phase-add`
  - `phase-remove`
- Add or extend `mutation-operators` integration tests to cover this batch.
- Wire exports through `mutation/index.js` and `mutation.js`.

## File list it expects to touch
- `src/evolutionary-engine/mutation/operators/`
- `src/evolutionary-engine/mutation/operators/numeric-tweak.js`
- `src/evolutionary-engine/mutation/operators/boolean-toggle.js`
- `src/evolutionary-engine/mutation/operators/enum-cycle.js`
- `src/evolutionary-engine/mutation/operators/precondition-negation.js`
- `src/evolutionary-engine/mutation/operators/termination-threshold.js`
- `src/evolutionary-engine/mutation/operators/termination-outcome.js`
- `src/evolutionary-engine/mutation/operators/phase-add.js`
- `src/evolutionary-engine/mutation/operators/phase-remove.js`
- `src/evolutionary-engine/mutation/index.js`
- `src/evolutionary-engine/mutation.js`
- `test/integration/mutation-operators.test.mjs`
- `test/integration/fixtures/index.mjs`

## Out of scope
- Operators that manipulate actions, token types, or zones.
- Orchestration changes (`mutateGenome`, `defaultMutationOperators`).
- Any changes to RNG semantics or operator probabilities.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/integration/mutation-operators.test.mjs`
- `node --test test/integration/mutation-traversal.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Each operator returns the same mutated structure for a given RNG seed.
- Operator names and exports stay identical to current public API.
- Phase list invariants (min 1 phase) are preserved.

## Status
Completed (2026-01-28)

## Outcome
- Split the batch A operators into `src/evolutionary-engine/mutation/operators/` and re-exported through `mutation.js`/`mutation/index.js`.
- Added `test/integration/mutation-operators.test.mjs` plus a phases fixture to cover the batch invariants.
- Left orchestration and non-batch operators unchanged.
