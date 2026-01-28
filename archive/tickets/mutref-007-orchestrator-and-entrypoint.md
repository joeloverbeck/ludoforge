# MUTREF-007: Orchestrator module and entrypoint cleanup

## Goal
Move orchestration logic into its own module and ensure the public API remains stable.

## Assumptions (revised)
- `src/evolutionary-engine/mutation.js` currently contains `defaultMutationOperators`, `mutateGenome`, and `mutateAndRepairGenome`.
- `src/evolutionary-engine/mutation/index.js` re-exports from `../mutation.js`.
- `src/evolutionary-engine/mutation/orchestrator.js` does not exist yet.
- There is no `test/integration/mutation-orchestrator.test.mjs` yet.

## Scope
- Create `mutation/orchestrator.js` with `defaultMutationOperators`, `mutateGenome`, and `mutateAndRepairGenome`.
- Move orchestration logic out of `src/evolutionary-engine/mutation.js` and make it a thin re-export to preserve existing imports.
- Ensure `mutation/index.js` continues to re-export orchestration functions and operators.
- Add `mutation-orchestrator` integration test.

## File list it expects to touch
- `src/evolutionary-engine/mutation/orchestrator.js`
- `src/evolutionary-engine/mutation.js`
- `test/integration/mutation-orchestrator.test.mjs`

## Out of scope
- Any operator logic changes.
- Changes to repair implementation or schema.
- Migrating downstream callers to new import paths.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/integration/mutation-orchestrator.test.mjs`
- `node --test test/integration/mutation-operators.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Default operator selection order and probabilities are unchanged.
- `mutateGenome` and `mutateAndRepairGenome` signatures are unchanged.
- Existing imports from `src/evolutionary-engine/mutation.js` continue to work.

## Status
Completed (2026-01-28).

## Outcome
- Added `src/evolutionary-engine/mutation/orchestrator.js` to host `defaultMutationOperators`, `mutateGenome`, and `mutateAndRepairGenome`.
- Converted `src/evolutionary-engine/mutation.js` into a thin re-export for orchestration while keeping operator exports intact.
- Added `test/integration/mutation-orchestrator.test.mjs` to cover operator selection, empty operator handling, and repair pipeline wiring.
