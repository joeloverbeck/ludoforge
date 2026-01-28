# MUTREF-001: Integration fixtures and randomness tests

## Goal
Create shared integration fixtures and the randomness/value-tweaks integration test to lock in current behavior before refactoring.

## Scope
- Add representative genome fixtures for integration tests.
- Add a deterministic RNG test helper fixture (wrapping the existing `createSeededRng` helper).
- Add `mutation-randomness` integration test that asserts deterministic results and bounds via public mutation APIs.

## Assumptions & scope corrections
- Random/value tweak helpers are not exported; integration coverage should exercise them through existing mutation operators.
- Deterministic RNG already exists in `src/simulation-engine/rng.js`; integration helper should reuse it instead of re-implementing.

## File list it expects to touch
- `test/integration/fixtures/genome-basic.mjs`
- `test/integration/fixtures/genome-actions.mjs`
- `test/integration/fixtures/genome-zones.mjs`
- `test/integration/fixtures/index.mjs`
- `test/integration/helpers/seeded-rng.mjs`
- `test/integration/mutation-randomness.test.mjs`

## Out of scope
- Any production code changes under `src/`.
- Changes to mutation operator logic.
- Adding or modifying unit tests under `test/unit/`.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/integration/mutation-randomness.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Fixtures mirror the existing genome schema and do not introduce new fields.
- RNG helper produces deterministic sequences when seeded.
- `tweakNonNegative` never yields negative values in tests.

## Status
Completed on 2026-01-28.

## Outcome
- Confirmed helper/coverage approach: integration tests exercise randomness helpers through mutation operators while reusing `createSeededRng`.
- Added integration fixtures, RNG helper, and the `mutation-randomness` integration test under `test/integration/`.
