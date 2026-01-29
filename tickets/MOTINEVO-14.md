# MOTINEVO-14: E2E fixture updates + green suite

## Description
Update all E2E test fixtures, helpers (especially `mock-simulation.js`), and assertions to include the new trace fields (`stateHash`, `bindings`, `appliedEffects`). Ensure the full E2E test suite passes with the updated simulation output format.

## Files to Touch
- `test/e2e/fixtures/` (update simulation result fixtures)
- `test/e2e/helpers/mock-simulation.js` (add trace fields to mock output)
- `test/e2e/*.test.mjs` (update assertions where needed)

## Out of Scope
- New E2E tests for motif mining pipeline
- Unit test changes — those are covered in MOTINEVO-08

## Acceptance Criteria

### Tests That Must Pass
- `npm run test:e2e` passes all existing tests (minimum 8 spec-listed tests)
- No tests are skipped or disabled
- Mock simulation output includes `stateHash`, `bindings`, and `appliedEffects` in every step
- E2E assertions validate presence and basic shape of trace fields

### Invariants That Must Remain True
- E2E tests still cover the same user flows and scenarios as before
- Mock simulation behavior is consistent with real simulation output format
- Test isolation is maintained (no cross-test state leakage)
- Fixture files conform to updated simulation-result schema

## Dependencies
- Depends on: MOTINEVO-06, MOTINEVO-07
- Blocks: none
