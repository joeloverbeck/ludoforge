# VALSAF-001: Structural termination requirements

## Status
Completed - 2026-01-27

## Goal
Add structural validation that enforces finite termination: at least one end condition and a max-turns fallback are required in every DSL program.

## Assumptions check (current code/test reality)
- The JSON Schema already requires `termination` and a `conditions` array, but it does not require `conditions` to be non-empty or `maxTurns` to be present.
- `src/dsl/validate.js` currently runs schema validation only; structural termination checks do not exist there.
- `src/dsl/semantic.js` currently allows either `conditions` or `maxTurns`, which conflicts with the invariant in `specs/validation-safety.md`.
- Existing semantic tests explicitly allow `maxTurns` without any termination conditions.

## File list (expected touches)
- src/dsl/validate.js
- src/dsl/validate.d.ts
- src/dsl/semantic.js
- test/dsl/validate.test.mjs
- test/dsl/semantic.test.mjs
- test/dsl/fixtures.mjs
- test/fixtures/dsl/invalid/missing-termination-conditions.json
- test/fixtures/dsl/invalid/missing-max-turns.json

## Out of scope
- Runtime kernel behavior (scheduler, triggers, effects, termination runtime logic).
- Any simulation-based validation or dominance/non-triviality checks.
- Schema changes beyond what is required to surface clear validation errors.

## Tasks
- Add structural checks in DSL validation for required termination sections (non-empty end conditions and required max-turns fallback).
- Ensure error messages include enough context (location or field path) to be actionable.
- Add fixtures/tests for missing end condition and missing max-turns fallback.
- Align semantic validation and tests with the structural termination requirements.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/dsl/validate.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Finite termination: every DSL program must define at least one end condition and a max-turns fallback.
- Validation errors must not be downgraded to warnings for termination omissions.

## Outcome
- Added structural termination checks in `validateGameDefinition`, aligned semantic validation, and updated fixtures/tests to enforce non-empty conditions plus required `maxTurns`.
- Also updated the minimal example definition to include a `maxTurns` fallback so it remains valid under the stricter invariant.
