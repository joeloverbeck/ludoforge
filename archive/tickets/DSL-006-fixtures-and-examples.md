# DSL-006: Add DSL fixtures and examples

Status: Completed (2026-01-27)

## Goal
Create reusable DSL JSON fixtures for tests and provide a minimal example for documentation.

## File list (expected to touch)
- test/fixtures/dsl/valid/minimal.json
- test/fixtures/dsl/invalid/missing-termination.json
- examples/dsl/minimal-game.json
- README.md
- test/dsl/schema.test.mjs
- test/dsl/semantic.test.mjs
- test/dsl/validate.test.mjs

## Out of scope
- Any DSL execution or simulation
- Schema or semantic validator logic changes
- Serialization changes

## Acceptance criteria
### Specific tests that must pass
- `node --test test/dsl/schema.test.mjs`
- `node --test test/dsl/semantic.test.mjs`
- `node --test test/dsl/validate.test.mjs`

### Invariants that must remain true
- Fixtures remain aligned with specs/dsl.md (no fields outside the spec).
- Example file is a valid DSL document that passes schema and semantic validation.

## Notes
- Keep the example intentionally small (2 players, 1-2 variables, 1 action, 1 termination condition).

## Updated assumptions and scope
- The test suite uses `.mjs` files, so fixtures must be consumed by the `node --test` ESM tests.
- Fixtures should be loaded by the existing schema/semantic/validate tests to avoid duplicating inline JSON.

## Outcome
- Added reusable JSON fixtures and wired schema/semantic/validate tests to load them, plus schema/semantic coverage for the example.
- Added a minimal example DSL file referenced from the README.
