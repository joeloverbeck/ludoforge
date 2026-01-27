# VALSAF-002: Bounded state constraints

## Status
Completed - 2026-01-27

## Goal
Enforce bounded-state constraints for integer types in schema/semantic validation: required min/max bounds and initial values that fall within those bounds. Token caps and zone capacity rules are deferred until the DSL schema/types define those fields.

## Assumptions check (current code/test reality)
- `src/dsl/semantic.js` already requires `min` and `max` for `int` types and validates `min <= max`, but it does not validate initial values against those bounds.
- The JSON Schema allows `int` types without `min`/`max` and does not constrain `initial` based on the declared type.
- The DSL schema/types do not define token caps or zone capacity fields, so validation for those constraints is not possible yet.

## File list (expected touches)
- src/dsl/semantic.js
- test/dsl/semantic.test.mjs

## Out of scope
- Runtime clamping behavior in the game-kernel (this ticket only validates inputs).
- Dynamic/simulation-based checks (dominance, non-triviality).
- Structural termination requirements (handled in VALSAF-001).

## Tasks
- Validate integer initial values against their declared min/max bounds (variables and token attributes).
- Add tests for out-of-bounds integer initial values.
- Document the deferral of token caps and zone capacity validation until schema/types support them.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/dsl/schema.test.mjs`
- `node --test test/dsl/semantic.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Bounded state: integers declare min/max and initial values fall within those bounds.
- Violations are surfaced as validation errors (not warnings).

## Outcome
- Enforced integer initial values within declared bounds during semantic validation and added coverage for that rule.
- Token caps and zone capacity validation were deferred because the schema/types do not define those fields yet.
