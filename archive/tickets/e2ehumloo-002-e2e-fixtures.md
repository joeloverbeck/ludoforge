# E2EHUMLOO-002: Add E2E fixtures for human-loop coverage

## Summary
Create JSON fixtures in `test/e2e/fixtures/` that cover minimal validity, action choice, visibility, multi-phase scheduling, token movement, and per-player variables using the current DSL schema.

## File list (expected to touch)
- test/e2e/fixtures/minimal-game.json
- test/e2e/fixtures/choice-game.json
- test/e2e/fixtures/visibility-game.json
- test/e2e/fixtures/multi-phase-game.json
- test/e2e/fixtures/token-movement-game.json
- test/e2e/fixtures/per-player-vars-game.json
- test/e2e/fixtures.e2e.test.mjs

## Out of scope
- Modifying schema definitions in `schemas/`.
- Editing production logic in `src/`.
- Adding or changing tests outside `test/e2e/`.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `npm run test:e2e`

### Fixture validation
- Each fixture validates with `validateGameDefinition` and `validateSemanticDefinition`.
- Fixtures cover the intended features without relying on unsupported fields (e.g., zone capacity).

### Invariants that must remain true
- Fixtures are deterministic (no timestamps or randomized values).
- Fixtures are valid JSON and align with existing schema expectations.
- Fixtures do not require filesystem writes outside `test/e2e/fixtures/` at runtime.

## Status
Completed (2026-01-27)

## Outcome
- Dropped the unsupported zone capacity fixture; replaced it with a token-movement fixture aligned to the current schema.
- Added fixture validation coverage in `test/e2e/fixtures.e2e.test.mjs`.
- Added six fixtures under `test/e2e/fixtures/`.
