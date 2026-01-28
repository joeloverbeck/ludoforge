# NOLEGACT-006: Update E2E fixtures and state-transition expectations

## Goal
Update E2E coverage so no-legal-actions behavior matches the new policy handling and no longer assumes implicit stalemate draws or human-loop errors.

## Reassessed assumptions
- Core no-legal-actions behavior (policies, meta refs, and termination ordering) is already implemented in the simulation engine and validated by unit tests.
- DSL schema/semantic validation already accepts `turn.noLegalActions` and meta refs.
- E2E tests and fixtures have not been updated to exercise the new policies and still expect a human-loop error when legal actions are empty.

## Scope
- Update `state-transition` E2E test expectations for v1 stalemate draw and new policy fixtures.
- Add fixtures for no-legal-actions policies (`terminate`, `pass`, `error`) plus a v1 stalemate baseline.
- Ensure human-loop helpers skip prompting when legal actions are empty for termination/pass paths.

## File list
- `test/e2e/state-transition.e2e.test.mjs`
- `test/e2e/helpers/run-human-loop.js`
- `test/e2e/fixtures/` (specific fixture files to add/update)
- `test/e2e/fixtures.e2e.test.mjs`

## Out of scope
- Core simulation loop logic (already updated in NOLEGACT-004).
- DSL schema/type changes (already updated in NOLEGACT-001..003).
- Analytics/degeneracy logic (handled in NOLEGACT-005).

## Acceptance criteria
### Specific tests that must pass
- `node --test test/e2e/state-transition.e2e.test.mjs`
- `node --test test/e2e/human-loop.e2e.test.mjs`
- `node --test test/e2e/fixtures.e2e.test.mjs`

### Invariants that must remain true
- Existing determinism checks in the E2E suite remain stable for the same seeds.
- V1 fixtures without `turn.noLegalActions` still terminate as stalemate draws without prompting.
- Error-policy fixtures are the only cases that raise a no-legal-actions error.

## Outcome
- Added E2E fixtures covering v1 stalemate plus terminate/pass/error policies, and updated fixture coverage checks.
- Updated state-transition E2E expectations to use the new fixtures and simulation engine results.
- Updated the human-loop helper to skip prompting when no legal actions exist for pass/terminate paths and added E2E coverage for the pass helper behavior.
- Core simulation/DSL behavior already matched the spec, so no engine or schema changes were required.

## Status
Completed on 2026-01-28.
