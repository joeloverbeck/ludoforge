# DSLSEMREF-004: Extract bounds validation

## Status
Completed (2026-01-28)

## Summary
Move integer bounds and initial value validation (including initial type checks) into
`src/dsl/semantic/bounds-validator.js` with explicit inputs/outputs.

## File list (expected to touch)
- src/dsl/semantic/bounds-validator.js
- src/dsl/semantic.js

## Out of scope
- No changes to issue messages, paths, or rule codes.
- No changes to reference validation or expression evaluation.
- No changes to action analysis or traversal order.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/integration/dsl-semantic.test.mjs`

### Invariants that must remain true
- `int-bounds` and `int-initial-bounds` behavior is identical to pre-refactor outputs.
- `int-initial-type` behavior remains unchanged (paths, messages, and rule code).
- Issue ordering stays unchanged.
- No new side effects beyond returned issues.

## Notes
- The helper should accept `{ variable, path, initialPath }` and return issue objects in the same
  order as the current inline logic.

## Outcome
- Added `src/dsl/semantic/bounds-validator.js` and routed `src/dsl/semantic.js` through it.
- Kept `int-bounds`, `int-initial-bounds`, and `int-initial-type` behavior unchanged.
- Added a unit test to lock in the `int-initial-type` rule behavior.
