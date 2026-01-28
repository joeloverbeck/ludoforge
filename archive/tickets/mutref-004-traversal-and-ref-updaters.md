# MUTREF-004: Traversal and reference updater refactor

## Goal
Add traversal/reference-update integration tests and move traversal helpers into dedicated modules.

## Scope
- Add `mutation-traversal` integration tests covering traversal and ref-updaters.
- Extend fixtures to include deep selectors, effects, triggers, and refs.
- Extract traversal helpers from `src/evolutionary-engine/mutation.js` into `mutation/traversal.js`.
- Extract ref update helpers from `src/evolutionary-engine/mutation.js` into `mutation/ref-updaters.js`.
- Update mutation code to use the new modules while preserving behavior.

## File list it expects to touch
- `test/integration/mutation-traversal.test.mjs`
- `test/integration/fixtures/genome-actions.mjs`
- `test/integration/fixtures/genome-zones.mjs`
- `test/integration/fixtures/genome-traversal.mjs`
- `test/integration/fixtures/index.mjs`
- `src/evolutionary-engine/mutation.js`
- `src/evolutionary-engine/mutation/traversal.js`
- `src/evolutionary-engine/mutation/ref-updaters.js`

## Out of scope
- Operator logic changes.
- Orchestration changes.
- Schema or repair logic changes.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/integration/mutation-traversal.test.mjs`
- `node --test test/integration/mutation-targets.test.mjs`
- `node --test test/integration/mutation-randomness.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- All relevant token type and zone refs are updated; unrelated refs are unchanged.
- Selector and expression traversal order and mutation behavior match current behavior.
- Token ref attribute pruning remains unchanged.

## Status
Completed on January 28, 2026.

## Outcome
- Extracted traversal and ref-updater helpers into `mutation/traversal.js` and `mutation/ref-updaters.js`, wired `mutation.js` to use them.
- Added `mutation-traversal` integration coverage with a new traversal fixture for deep selectors, triggers, and refs.
- No `mutation/index.js` was created; existing public entrypoints remain unchanged.
