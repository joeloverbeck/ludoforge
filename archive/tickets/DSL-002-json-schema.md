# DSL-002: Author JSON Schema v1.0 for the DSL

## Status
Completed (2026-01-27)

## Goal
Implement a versioned JSON Schema that validates the external JSON DSL format described in specs/dsl.md.

## File list (expected to touch)
- schemas/dsl/game-definition.v1.json
- src/dsl/schema.ts
- test/dsl/schema.test.mjs
- package.json (add Ajv dependency and test script)

## Out of scope
- Semantic validation beyond JSON Schema (cross-references, boundedness checks)
- Deterministic serialization
- Any parser for a future textual DSL

## Acceptance criteria
### Specific tests that must pass
- `node --test test/dsl/schema.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Schema is versioned and validates `GameDefinition.version` as a required string.
- All required fields in specs/dsl.md are enforced by schema.
- Enum values in the schema match those listed in specs/dsl.md exactly.

## Notes
- Use Ajv (per specs/stack.md) with JSON Schema draft supported by Ajv.
- Keep schema file path stable for future versioning (e.g., v1.1 side-by-side).
- The repo currently has no package.json; add a minimal one to manage Ajv and node --test.
- Existing DSL checks are type-level in `test/dsl/types.test.ts` and run via `tsc -p tsconfig.json`.

## Outcome
- Shipped `schemas/dsl/game-definition.v1.json` aligned to the DSL outline and enums.
- Added an Ajv-based Node test in `test/dsl/schema.test.mjs` instead of a TS runtime test, since the repo has no TS runtime harness.
- Added `src/dsl/schema.ts` exports and a minimal `package.json` to support Ajv and `node --test`.
