# DSL-004: Implement semantic validation rules

## Goal
Add semantic validation that enforces cross-reference integrity and DSL constraints not captured by JSON Schema.

## File list (expected to touch)
- src/dsl/semantic.js
- src/dsl/semantic.d.ts
- src/dsl/index.ts
- test/dsl/semantic.test.mjs

## Updated assumptions
- The repo currently only ships a JSON Schema validator (`src/dsl/validate.js`).
- There is no existing semantic validator or semantic test file.
- Runtime tests in this repo use `node --test` with `.mjs` files.

## Out of scope
- JSON Schema changes
- Deterministic serialization
- Game execution or kernel logic

## Acceptance criteria
### Specific tests that must pass
- `node --test test/dsl/semantic.test.mjs`

### Invariants that must remain true
- All references resolve to declared IDs and correct types (vars, token types, zones).
- Player refs are not validated yet because the DSL does not declare player identifiers.
- At least one termination condition exists (maxTurns alone is not sufficient).
- Int values are clamped to declared bounds only at runtime; semantic validator must only verify bounds are declared and sane (min <= max).
- Every variable/token type declared is referenced by at least one rule or condition.

## Notes
- Implement as pure functions returning a list of issues.
- Keep rules aligned with specs/dsl.md constraints.

## Status
Completed on 2026-01-27.

## Outcome
- Added a new semantic validator module and exports, plus runtime tests for semantic rules.
- Adjusted scope to match existing JS runtime patterns (ESM `.js` + `.d.ts`) instead of TS-only files.
- Enforced bounds, reference resolution, termination conditions, and unused variable/token checks per spec.
