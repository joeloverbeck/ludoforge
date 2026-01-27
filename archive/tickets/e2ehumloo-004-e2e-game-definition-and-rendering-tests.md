# E2EHUMLOO-004: Add E2E tests for game definition and rendering

## Summary
Add E2E test coverage for game-definition validation/serialization and the human-facing rendered output ("look"), using the existing `test/e2e/` structure.

## File list (expected to touch)
- test/e2e/game-definition.e2e.test.mjs
- test/e2e/rendering.e2e.test.mjs
- test/e2e/fixtures.e2e.test.mjs

## Out of scope
- Changing schema validation behavior in `src/`.
- Adding or modifying fixtures unless required to cover rendering output.
- Adding new rendering features (tests should follow current renderer behavior).

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `npm run test:e2e`

### Invariants that must remain true
- Serialization output remains deterministic across runs and object key order.
- Rendering respects visibility (private zones only for active player).
- Large zones are collapsed according to existing renderer limits.

## Status
Completed

## Outcome
- Added E2E tests for deterministic serialization and rendering visibility/collapse behavior.
- Kept fixtures and renderer behavior unchanged; relied on existing visibility fixture and state seeding in tests.
