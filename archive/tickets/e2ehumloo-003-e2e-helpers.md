# E2EHUMLOO-003: Implement E2E human-loop helpers

## Summary
Add test-only helper utilities to simulate human IO, run a single human loop, and assert against rendered output with resilient matching.

## Updated assumptions (2026-01-27)
- E2E tests currently live in `test/e2e/` and only include `fixtures.e2e.test.mjs` and `smoke.e2e.test.mjs`.
- `test/e2e/helpers/` does not exist yet and will be created by this ticket.
- The human-loop flow is already covered at the unit level (`test/unit/human-interface/*.test.mjs`), so E2E coverage should be minimal and use existing fixtures.

## File list (expected to touch)
- test/e2e/helpers/mock-human-io.js
- test/e2e/helpers/run-human-loop.js
- test/e2e/helpers/expect-output.js
- test/e2e/human-loop.e2e.test.mjs

## Out of scope
- Refactoring production human-loop code in `src/`.
- Adding new fixtures or editing existing fixture JSON.
- Introducing third-party dependencies.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `npm run test:e2e`

### Invariants that must remain true
- Helpers are pure test utilities and are not imported by production code.
- Mocked IO captures output deterministically and allows scripted inputs.
- Output expectations match key lines only (avoid full-output snapshots).

## Status
Completed (2026-01-27)

## Outcome
- Added test-only helpers for mock IO, output matching, and running a single human loop against current kernel APIs.
- Added an E2E test that exercises the helper loop against the `choice-game` fixture.
