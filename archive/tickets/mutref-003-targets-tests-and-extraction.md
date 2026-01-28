# MUTREF-003: Target collection tests and extraction

## Goal
Lock in target-collection behavior and move target helpers into a dedicated module.

## Scope
- Add `mutation-targets` integration tests for collection helpers.
- Add or extend fixtures needed for target coverage.
- Create `mutation/targets.js` and update `src/evolutionary-engine/mutation.js` to import from it.

## Current state notes (assumption check)
- `src/evolutionary-engine/mutation/index.js` does not exist in this repo.
- `src/evolutionary-engine/mutation/` already exists with `random.js` and `value-tweaks.js`.
- `test/integration/mutation-randomness.test.mjs` already exists.

## File list it expects to touch
- `test/integration/mutation-targets.test.mjs`
- `test/integration/fixtures/genome-actions.mjs`
- `test/integration/fixtures/genome-zones.mjs`
- `test/integration/fixtures/index.mjs`
- `src/evolutionary-engine/mutation.js`
- `src/evolutionary-engine/mutation/targets.js`

## Out of scope
- Traversal or reference update logic changes.
- Operator behavior changes.
- Schema or repair logic changes.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/integration/mutation-targets.test.mjs`
- `node --test test/integration/mutation-randomness.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Target counts and indices match the pre-refactor behavior.
- Missing or empty structures are handled exactly as before (no new throws).
- Public exports from `src/evolutionary-engine/mutation.js` remain available.

## Status
Completed on 2026-01-28.

## Outcome
- Added `mutation/targets.js` and rewired `mutation.js` to import target helpers without changing behavior.
- Added `mutation-targets` integration tests covering variable, action, action-effect, zone, and tokenType target collection plus missing structure cases.
- No `mutation/index.js` was introduced; the repo already uses `mutation.js` as the public entry point.
