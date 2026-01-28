# NOLEGACT-003: Add `turn.noLegalActions` to the DSL schema and types

## Status
Completed (2026-01-28)

## Goal
Define the DSL surface for `turn.noLegalActions` so definitions can declare the policy and defaults for no-legal-actions handling.

## Updated assumptions
- Meta refs (`legalActionCount`, `hasLegalActions`) are already supported in schema, types, and semantic validation.
- No `turn.noLegalActions` block exists yet in schema or types.

## Scope
- Extend JSON Schema with a `turn.noLegalActions` block and policy enum.
- Extend TypeScript DSL types to include `noLegalActions` and its fields.
- Add semantic validation for required/optional `noLegalActions` fields.

## File list
- `schemas/dsl/game-definition.v1.json`
- `src/dsl/types.ts`
- `src/dsl/semantic.js`
- `test/unit/dsl/schema.test.mjs`
- `test/unit/dsl/semantic.test.mjs`
- `test/unit/dsl/types.test.ts`

## Out of scope
- Runtime behavior changes in the simulation engine.
- Termination evaluation changes.
- Analytics/degeneracy updates.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/dsl/schema.test.mjs`
- `node --test test/unit/dsl/semantic.test.mjs`
- `node --test test/unit/dsl/types.test.ts`
- `npm run test:unit`

### Invariants that must remain true
- `turn.noLegalActions` is optional; existing definitions without it remain valid.
- Policy values are limited to `terminate`, `pass`, or `error`.
- `defaultOutcome` is required when `policy="terminate"` and disallowed for `pass`/`error`.
- Schema rejects unknown fields in `turn.noLegalActions`.

## Outcome
- Added `turn.noLegalActions` to the schema/types with terminate/pass/error policies plus conditional defaultOutcome validation.
- Added semantic validation for defaultOutcome presence/absence; meta refs were already implemented and did not require changes.
- Extended DSL schema/semantic/types tests to cover the new block and validation rules.
