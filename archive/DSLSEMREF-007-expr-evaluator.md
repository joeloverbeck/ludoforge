# DSLSEMREF-007: Extract expression evaluation helpers

## Summary
Move `evaluateExpr` and `evaluateCmp` into `src/dsl/semantic/expr-evaluator.js` and make them pure with injected context.

## File list (expected to touch)
- src/dsl/semantic/expr-evaluator.js
- src/dsl/semantic.js

## Out of scope
- No changes to domain inference logic.
- No changes to ref validation or usage tracking.
- No changes to selector/effect validation wiring.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/integration/dsl-semantic.test.mjs`

### Invariants that must remain true
- Satisfiable/tautology detection stays identical for existing fixtures.
- `action-precondition-unsatisfiable` emits the same rule, path, and message.
- Issue ordering remains unchanged.

## Status
Completed (2026-01-28).

## Outcome
- Moved `evaluateExpr` and `evaluateCmp` into `src/dsl/semantic/expr-evaluator.js` and updated `src/dsl/semantic.js` to inject context.
- Behavior and invariants preserved; no test expectations changed.
