# DSLSEMREF-006: Extract domain inference helpers

## Summary
Move `domainForType` and `domainForRef` logic into `src/dsl/semantic/domain.js` as pure functions.

## File list (expected to touch)
- src/dsl/semantic/domain.js
- src/dsl/semantic.js

## Assumptions (checked 2026-01-28)
- `domainForType` and `domainForRef` are currently defined inline in `src/dsl/semantic.js`.
- `test/integration/dsl-semantic.test.mjs` exists and exercises the semantic API end-to-end.

## Out of scope
- No changes to expression evaluation rules.
- No changes to ref validation or usage tracking.
- No changes to selector/effect validation or action analysis.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/integration/dsl-semantic.test.mjs`

### Invariants that must remain true
- Domain calculations are identical for all existing test cases.
- No new side effects; helpers are pure.
- Issue ordering remains unchanged.

## Status
Completed.

## Outcome
Extracted domain inference helpers into `src/dsl/semantic/domain.js` and wired `src/dsl/semantic.js` to use the new pure helper without changing behavior or issue ordering.
