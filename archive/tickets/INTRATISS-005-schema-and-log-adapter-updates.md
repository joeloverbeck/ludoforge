# INTRATISS-005: Update trajectory step contract (schema + log adapter)

## Context
`affectedPlayerIds` and `affectedGlobal` are required parts of step snapshots so schema validation and analytics summaries must treat them as mandatory.

## Reassessed assumptions
- The simulation result schema already requires `affectedPlayerIds` and `affectedGlobal`.
- Player ids are modeled as integers in the simulation engine and existing schemas/tests, so `affectedPlayerIds` should be integer arrays (not strings).
- `TrajectoryStep` already includes the new fields in `src/simulation-engine/types.d.ts`.
- The log adapter already maps `affectedPlayerIds`/`affectedGlobal` into `keySteps`.

## Work
- Add explicit schema test coverage to ensure `affectedPlayerIds`/`affectedGlobal` are required.
- Confirm log adapter and analytics types already carry these fields (no code changes unless a gap is found).

## File list it expects to touch
- `schemas/simulation-engine/simulation-result.schema.json`
- `test/unit/simulation-engine/simulation-result-schema.test.mjs`

## Out of scope
- Engine instrumentation logic for producing affected player data.
- Metric computation changes.
- Feature vector ordering or scoring defaults.
- E2E tests.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/simulation-engine/simulation-result-schema.test.mjs`
- `node --test test/unit/simulation-engine/simulation-result-contract.test.mjs`
- `node --test test/unit/evaluation-analytics/log-adapter.test.mjs`

### Invariants that must remain true
- `trajectory.steps` still include `legalActionCount` for analytics.
- Schema validation fails for results missing `affectedPlayerIds` or `affectedGlobal`.
- Log adapter continues to reject malformed simulation results.

## Status
Completed (2026-01-28)

## Outcome
Added schema-level tests to enforce required `affectedPlayerIds`/`affectedGlobal`. The schema, simulation types, and log adapter already met the required contract, so no production code changes were needed beyond updating the ticket assumptions.
