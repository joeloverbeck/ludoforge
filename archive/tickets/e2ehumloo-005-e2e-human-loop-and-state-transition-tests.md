# E2EHUMLOO-005: Add E2E tests for human loop and state transitions

## Summary
Extend the existing E2E coverage to include human-loop invalid input handling and explicit state-transition validation using existing fixtures.

## File list (expected to touch)
- test/e2e/human-loop.e2e.test.mjs (already exists)
- test/e2e/state-transition.e2e.test.mjs (new)
- test/e2e/helpers/mock-human-io.js (only if needed)
- test/e2e/helpers/run-human-loop.js (only if needed)

## Out of scope
- Implementing AI participants or new routing logic in `src/`.
- Adding new fixtures outside `test/e2e/fixtures/`.
- Performance or batching tests.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `npm run test:e2e`
- `node --test test/e2e/human-loop.e2e.test.mjs`
- `node --test test/e2e/state-transition.e2e.test.mjs`

### Invariants that must remain true
- Invalid human input is re-prompted until valid (non-number, out-of-range).
- No legal actions produces a clear error outcome.
- State transitions are deterministic with fixed fixtures (no RNG usage required for these tests).

## Status
Completed (2026-01-27).

## Outcome
- Added a new state-transition E2E test covering distinct action outcomes and the no-legal-actions error path.
- Expanded the existing human-loop E2E test to assert invalid input re-prompts.
- No helper or fixture changes were required beyond the new test file.
