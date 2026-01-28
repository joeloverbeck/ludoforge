# DSLSEMREF-008: Extract selector/effect/expr validators

## Summary
Move `validateSelector`, `validateEffect`, and `validateExpr` wiring into `src/dsl/semantic/semantic-validators.js` with explicit dependencies.

## Assumptions (updated)
- The selector/effect/expr validators are currently defined inline in `src/dsl/semantic.js`.
- `src/dsl/semantic/semantic-validators.js` does not exist yet and must be created.
- `test/integration/dsl-semantic.test.mjs` already exists and should continue to pass.

## File list (expected to touch)
- src/dsl/semantic/semantic-validators.js
- src/dsl/semantic.js

## Out of scope
- No changes to ref validation, domain inference, or expr evaluation logic.
- No changes to action analysis.
- No changes to traversal order beyond relocation.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/integration/dsl-semantic.test.mjs`

### Invariants that must remain true
- Selector/effect validation emits identical rule/path/message outputs.
- No new side effects; dependencies are injected.
- Issue ordering remains unchanged.

## Status
Completed.

## Outcome
Created `src/dsl/semantic/semantic-validators.js` and wired `src/dsl/semantic.js` to use it; behavior and issue ordering remain unchanged relative to the previous inline validators.
