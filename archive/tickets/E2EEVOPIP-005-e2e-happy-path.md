# E2EEVOPIP-005: Evolution pipeline E2E happy path

## Goal
Add a full end-to-end test that exercises seed -> simulate -> mocked human eval -> fitness -> evolve -> re-simulate on a small deterministic population.

## File list
- test/e2e/evolution-pipeline.e2e.test.mjs
- test/e2e/fixtures/evo-seed-1.json
- test/e2e/fixtures/evo-seed-2.json
- test/e2e/fixtures/evo-terminates.json

## Out of scope
- Performance benchmarks or worker-thread orchestration.
- End-user CLI/UX changes beyond test helpers.
- Modifying archived specs or unrelated test files.

## Assumptions (updated)
- `test/e2e/helpers/mock-human-eval.js`, `mock-simulation.js`, and `mock-fitness.js` already exist and are reused; no new helper files are required.
- There is no production “evolution pipeline” orchestrator; the E2E test composes existing helpers with `runGenerationLoop` to model the pipeline.
- The E2E suite lives under `test/e2e/` and uses Node’s test runner (`node --test`).
- The test configures descriptors to avoid MAP-Elites niche collisions so the next generation size can match the configured population size.

## Acceptance criteria
### Specific tests that must pass
- node --test test/e2e/evolution-pipeline.e2e.test.mjs

### Invariants that must remain true
- Pipeline step order is enforced: seed -> simulate -> mock eval -> fitness -> evolve -> re-simulate.
- Stable candidate IDs persist across evaluation, fitness, and evolution steps.
- Next generation size matches the configured population size.
- Fitness is computed for all non-rejected candidates.

## Status
Completed (2026-01-27).

## Outcome
- Added the `test/e2e/evolution-pipeline.e2e.test.mjs` happy-path E2E test using existing mock helpers.
- Reused existing fixtures and helpers; no production code changes were required.
- Enforced deterministic step ordering, stable IDs, and population sizing via descriptor configuration.
