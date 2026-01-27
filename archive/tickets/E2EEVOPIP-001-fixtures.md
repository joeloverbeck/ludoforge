# E2EEVOPIP-001: Add evolution pipeline fixtures
Status: Completed

## Goal
Create small, deterministic JSON fixtures for evolution pipeline scenarios and validate
them with the existing E2E fixtures check.

## Reassessed assumptions
- There is no dedicated evolution pipeline E2E suite yet; fixture validation currently
  happens via test/e2e/fixtures.e2e.test.mjs.
- Fixtures must satisfy both schema and semantic validation to stay in sync with the
  DSL validators used in E2E tests.

## File list
- test/e2e/fixtures/evo-seed-1.json
- test/e2e/fixtures/evo-seed-2.json
- test/e2e/fixtures/evo-terminates.json
- test/e2e/fixtures/evo-non-terminating.json
- test/e2e/fixtures.e2e.test.mjs (add new fixtures to validation list)

## Out of scope
- Changes to core simulation, evolution, or validation logic in src/.
- Updates to existing fixtures or existing E2E tests outside of registering the new
  fixtures for validation.
- Any performance tuning or worker-thread orchestration.

## Acceptance criteria
### Specific tests that must pass
- node --test test/e2e/fixtures.e2e.test.mjs
- node --test test/e2e/game-definition.e2e.test.mjs

### Invariants that must remain true
- Fixtures are valid against current schema and semantic checks used in E2E tests.
- Fixtures are deterministic and minimal (no randomized or time-based fields).
- Existing fixtures in test/e2e/fixtures/ remain unchanged.
- evo-non-terminating.json uses an unsatisfiable termination condition but still defines
  a maxTurns fallback so the schema/semantic checks pass.

## Outcome
- Added four evolution-focused fixtures and registered them for E2E fixture validation.
- No changes needed to core evolution or simulation code.
