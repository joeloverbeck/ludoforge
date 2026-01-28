# DSLSEMREF-009: Extract action analysis logic

## Summary
Move action analysis (free-lunch, dominant-action, no-meaningful-actions) into `src/dsl/semantic/action-analysis.js` and call it from the orchestrator while preserving current issue ordering.

## File list (expected to touch)
- src/dsl/semantic/action-analysis.js
- src/dsl/semantic.js

## Assumptions (reassessed)
- Action analysis is currently implemented inline inside `src/dsl/semantic.js`.
- Free-lunch issues are emitted during the action traversal, so the extracted helper must allow per-action emission to keep ordering stable.
- Integration coverage for action analysis already exists in `test/integration/dsl-semantic.test.mjs`.

## Out of scope
- No changes to selector/effect/expr validation.
- No changes to reference validation or domain inference.
- No changes to trigger/step/termination traversal order.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/integration/dsl-semantic.test.mjs`

### Invariants that must remain true
- `free-lunch`, `dominant-action`, and `no-meaningful-actions` rules emit the same paths/messages as before.
- Issue ordering remains unchanged.
- No change to public API or exported types.

## Status
Completed.

## Outcome
Moved action analysis into `src/dsl/semantic/action-analysis.js` and wired `src/dsl/semantic.js` to use per-action and aggregate helpers while keeping issue ordering and messages unchanged.
