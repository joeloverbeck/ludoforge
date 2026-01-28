# DSLSEMREF-003: Extract ID/index construction

## Status
Completed (2026-01-28)

## Summary
Extract ID and attribute index construction from `src/dsl/semantic.js` into a new helper module, returning explicit maps/sets used by semantic validation.

## Current state assumptions (verified)
- `src/dsl/semantic.js` currently defines ID/index helpers inline (`collectIds`, `collectTokenAttributeIds`, `collectTokenAttributeDefs`) and builds `variableById`.
- `src/dsl/semantic/id-index.js` does not exist yet and must be added.

## File list (expected to touch)
- src/dsl/semantic/id-index.js (new)
- src/dsl/semantic.js

## Out of scope
- No changes to validation rules or issue generation.
- No changes to reference validation behavior.
- No changes to bounds or expression evaluation logic.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/integration/dsl-semantic.test.mjs`

### Invariants that must remain true
- Index contents (IDs, attributes, zones) are identical to pre-refactor logic.
- Any derived attribute lookup behavior is unchanged.
- Public API and issue ordering remain unchanged.

## Notes
- The helper should expose token attribute ID/definition lookup functions or derived maps as needed.
- Include `variableById` in the extracted index output (currently built inline in `src/dsl/semantic.js`).

## Outcome
- Added `src/dsl/semantic/id-index.js` with ID/index builders and `variableById` extraction.
- Updated `src/dsl/semantic.js` to consume the new helper without changing behavior.
