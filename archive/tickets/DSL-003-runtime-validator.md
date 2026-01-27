# DSL-003: Implement runtime schema validation helper

## Goal
Provide a runtime validator that loads the DSL JSON Schema and returns structured errors for invalid inputs.

## File list (expected to touch)
- src/dsl/validate.js
- src/dsl/validate.d.ts
- src/dsl/index.ts
- test/dsl/validate.test.mjs

## Out of scope
- Semantic validation (cross-reference, boundedness)
- Serialization or canonicalization
- Any CLI commands

## Acceptance criteria
### Specific tests that must pass
- `node --test test/dsl/validate.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Validator uses the JSON Schema from `schemas/dsl/game-definition.v1.json`.
- Errors are deterministic: same input yields same error list ordering.
- Valid inputs produce no errors and a boolean `valid: true` result.

## Notes
- Keep API small: `validateGameDefinition(input)` returning `{ valid, errors }`.
- Use Ajv compiled schema; cache the compiled validator.

## Assumptions & scope update
- The repo runs Node.js tests directly against `.mjs` files; there is no TS runtime loader in the test pipeline.
- TypeScript is `noEmit`, so runtime helpers must exist as `.js` to be executed in tests; type info should be provided via `.d.ts`.

## Status
- Completed (2026-01-27)

## Outcome
- Implemented a runtime validator in `src/dsl/validate.js` with deterministic, structured errors and added `src/dsl/validate.d.ts` for typing support.
- Added `test/dsl/validate.test.mjs` and exported the helper from `src/dsl/index.ts` to match the runtime usage and test setup.
