# E2EEVOPIP-003: Add deterministic simulation helper

## Goal
Provide a deterministic mock simulation helper or stub for future evolution pipeline tests so terminal outcomes and safety cutoffs are predictable.

## Current assumptions (reassessed)
- There is no existing `test/e2e/helpers/mock-simulation.js`.
- There is no `test/e2e/evolution-pipeline.e2e.test.mjs` yet.
- Existing E2E tests do not exercise the simulation engine directly.

## File list
- test/e2e/helpers/mock-simulation.js
- test/e2e/mock-simulation.e2e.test.mjs

## Out of scope
- Changes to simulation engine behavior in src/.
- Performance improvements or worker-thread usage.
- Changes to existing E2E tests unrelated to the evolution pipeline.

## Acceptance criteria
### Specific tests that must pass
- node --test test/e2e/mock-simulation.e2e.test.mjs

### Invariants that must remain true
- A terminating scenario reaches a terminal outcome within a low turn cap.
- A non-terminating scenario triggers a safety cutoff with a clear reason.
- Deterministic RNG inputs produce identical outcomes across runs.

## Status
- Completed on 2026-01-27.

## Outcome
- Added a deterministic mock simulation helper and dedicated E2E coverage for terminal and cutoff scenarios.
- No production simulation engine behavior was changed (helper is test-only).
