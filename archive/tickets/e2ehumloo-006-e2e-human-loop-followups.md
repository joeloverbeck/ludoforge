# E2EHUMLOO-006: Extend E2E human-loop coverage for edge cases

## Summary
Add the missing E2E coverage for mixed human + AI participants in the human-loop flow, aligned with `specs/e2e-human-loop.md`.

## Scope
- Add one E2E test that exercises mixed participants routing via `routeTurn`.
- Reuse existing fixtures under `test/e2e/fixtures/` (no new fixtures).
- Keep output assertions resilient (key lines only).

## Assumptions (reassessed)
- Invalid input retry coverage already exists in `test/e2e/human-loop.e2e.test.mjs`.
- No legal actions error coverage already exists in `test/e2e/state-transition.e2e.test.mjs`.
- Mixed human + AI participant routing is not yet covered in E2E tests.

## File list (expected to touch)
- test/e2e/human-loop.e2e.test.mjs

## Out of scope
- Changes to production code in `src/`.
- New fixtures or fixture edits.
- Introducing new dependencies.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `npm run test:e2e`

### Coverage requirements
- Mixed participants (human + AI) route to the correct selector when used in E2E flow.
- Output assertions remain key-line checks (no full-output snapshots).

## Status
Completed on 2026-01-27.

## Outcome
- Added an E2E mixed-participant routing test in `test/e2e/human-loop.e2e.test.mjs`.
- Did not modify helpers or fixtures because invalid-input and no-legal-actions coverage already existed.
