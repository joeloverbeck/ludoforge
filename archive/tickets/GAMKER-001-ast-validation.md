# GAMKER-001: AST Validation for Required Sections

## Goal
Confirm the DSL semantic validator enforces required sections and basic reference resolution for the game-kernel AST inputs.

## Scope
- Validate the presence of at least one termination condition or an explicit `termination.maxTurns` value.
- Validate that referenced entities (variables, zones, token types, token attributes) resolve to declared entries.
- Produce structured validation issues that the kernel can surface.

## File list it expects to touch
- `src/dsl/semantic.js`
- `src/dsl/semantic.d.ts` (if exports change)
- `test/dsl/semantic.test.mjs`

## Out of scope
- Executing game logic or applying actions
- Bounds checks, trigger loop detection, or scheduler logic
- Any UI or logging hooks

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/dsl/semantic.test.mjs`

### Invariants that must remain true
- Existing DSL schema tests under `test/dsl/` remain passing.
- AST validation must not mutate the input AST.
- Validation errors are deterministic for the same input.

## Status
Completed

## Outcome
- Implemented validation in the existing DSL semantic validator, not a new game-kernel module.
- Updated termination checks to allow `maxTurns` without termination conditions and added coverage for that case.
