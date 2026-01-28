# DSLSEMREF-002: Extract issue collector helper

## Summary
Move issue accumulation helpers into `src/dsl/semantic/issue-collector.js` and keep `src/dsl/semantic.js` as the orchestrator, without changing behavior.

## Assumptions (updated)
- `src/dsl/semantic.js` currently defines `pushIssue`, `joinPath`, and `normalizeArray` inline.
- `src/dsl/semantic/` does not yet exist, so this ticket will introduce that directory.
- `test/integration/dsl-semantic.test.mjs` already exists and covers the exported API; no new integration file is required.

## File list (expected to touch)
- src/dsl/semantic/issue-collector.js (new)
- src/dsl/semantic.js

## Out of scope
- No changes to validation rules, issue messages, or issue paths.
- No changes to ID indexing, reference validation, or bounds logic.
- No export surface changes beyond internal file layout.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/integration/dsl-semantic.test.mjs`

### Invariants that must remain true
- Issue objects (`path`, `message`, `rule`) are byte-for-byte identical to the pre-refactor output.
- Issue ordering is unchanged for all existing tests.
- Public API of `src/dsl/semantic.js` remains unchanged.

## Notes
- `issue-collector.js` should expose `createIssueCollector()` plus any path helpers used today.

## Status
Completed (2026-01-28)

## Outcome
- Added `src/dsl/semantic/issue-collector.js` with `createIssueCollector`, `joinPath`, and `normalizeArray`.
- Updated `src/dsl/semantic.js` to use the new collector and adjusted `recordIntBounds` to accept `pushIssue`.
- Behavior and public API unchanged; no new tests were required beyond existing coverage.
