# MUTREF-006: Operators batch B (actions, tokens, zones)

## Goal
Split the remaining complex operators into individual modules and extend integration tests.

## Scope
- Move the following operators into `mutation/operators/`:
  - `action-duplicate`
  - `action-remove`
  - `action-effect-magnitude`
  - `token-zone-target-add`
  - `token-type-remove`
  - `zone-remove`
- Extend `mutation-operators` integration tests to cover this batch.
- Ensure ref-updater helpers are used consistently after extraction.

## File list it expects to touch
- `src/evolutionary-engine/mutation/operators/action-duplicate.js`
- `src/evolutionary-engine/mutation/operators/action-remove.js`
- `src/evolutionary-engine/mutation/operators/action-effect-magnitude.js`
- `src/evolutionary-engine/mutation/operators/token-zone-target-add.js`
- `src/evolutionary-engine/mutation/operators/token-type-remove.js`
- `src/evolutionary-engine/mutation/operators/zone-remove.js`
- `src/evolutionary-engine/mutation/index.js`
- `src/evolutionary-engine/mutation.js`
- `test/integration/mutation-operators.test.mjs`
- `test/integration/fixtures/index.mjs`
- `test/integration/fixtures/genome-actions.mjs`
- `test/integration/fixtures/genome-zones.mjs`

## Out of scope
- Orchestration changes (`mutateGenome`, `mutateAndRepairGenome`).
- Any changes to schema, repair logic, or operator selection probabilities.
- New operator types or behavior changes.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/integration/mutation-operators.test.mjs`
- `node --test test/integration/mutation-targets.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Action duplication uses a unique id and preserves action order rules.
- Action removal only removes when count > 1.
- Token/zone removals rebind references the same way as before.

## Status
Completed (2026-01-28).

## Outcome
- Extracted the six batch B operators into dedicated files under `src/evolutionary-engine/mutation/operators/`.
- Updated `src/evolutionary-engine/mutation.js` to re-export the extracted operators and keep operator ordering intact.
- Extended `test/integration/mutation-operators.test.mjs` with coverage for action duplication/removal, effect magnitude tweaks, token/zone add/removal rebinding.
