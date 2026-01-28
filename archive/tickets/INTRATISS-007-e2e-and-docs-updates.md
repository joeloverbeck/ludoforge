# INTRATISS-007: E2E coverage + architecture docs for new interaction metrics

## Context
Interaction metrics were already updated in code (core metrics, feature vector ordering, and step snapshots) but the E2E coverage and architecture docs still reflect the old naming. This ticket focuses on proving the new metrics end-to-end and correcting documentation to match the current implementation.

## Assumptions (validated against repo)
- `turn_taking_rate` and `interaction_rate` already exist in `src/evaluation-analytics/metrics/core.js`.
- Feature vector ordering already includes both metrics in `src/evaluation-analytics/feature-vector.js`.
- Step snapshots already include `affectedPlayerIds` and `affectedGlobal` in simulation results.
- Docs in `docs/architecture/` still describe the old interaction-rate definition and omit the new ordering/step snapshot fields.

## Work
- Update E2E tests (`test/e2e/preference-model-update.e2e.test.mjs`) to assert:
  - Feature vectors include `turn_taking_rate` and `interaction_rate`.
  - Fixture data yields stable, expected values for the two metrics.
  - Same seeds produce identical metric values across runs.
- Update architecture docs to reflect the current implementation:
  - `docs/architecture/metrics-and-fitness.md` to define `turn_taking_rate` and the new `interaction_rate`, plus updated feature ordering.
  - `docs/architecture/simulation-engine.md` to include `affectedPlayerIds`/`affectedGlobal` in the step snapshot contract.
  - `docs/architecture/e2e-coverage.md` to record the new E2E proof.

## File list it expects to touch
- `test/e2e/preference-model-update.e2e.test.mjs`
- `docs/architecture/metrics-and-fitness.md`
- `docs/architecture/simulation-engine.md`
- `docs/architecture/e2e-coverage.md`

## Out of scope
- Core metric computation logic (already implemented).
- Simulation-engine instrumentation implementation (already implemented).
- Schema/type updates.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/e2e/preference-model-update.e2e.test.mjs`
- `node --test test/e2e/evolution-pipeline.e2e.test.mjs` (if it consumes the updated feature vector)

### Invariants that must remain true
- E2E results are deterministic for identical seeds (including new metrics).
- Docs remain consistent with the simulation result contract and metric definitions.

## Status
Completed (January 28, 2026).

## Outcome
- Added E2E assertions for `turn_taking_rate`/`interaction_rate` plus deterministic metric checks.
- Updated architecture docs for metric definitions, feature ordering, and step snapshot fields.
