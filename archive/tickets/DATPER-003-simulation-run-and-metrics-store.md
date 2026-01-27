# DATPER-003: Simulation Run + Metrics JSONL Store

## Goal
Persist simulation run summaries and metrics per candidate in JSONL with reproducibility metadata.

## Scope / Tasks
- Add JSONL writer/reader for `SimulationRunRecord` including seed, agents, and trajectory summaries.
- Persist per-run `MetricsRecord` entries (feature vector + metric results) as a linked record.
- Enforce stable IDs by requiring `gameId` on runs and `gameId` + `runId` on per-run metrics.

## File list it expects to touch
- `src/data-persistence/simulation-run-store.js` (new)
- `src/data-persistence/jsonl.js` (reuse helpers only)
- `test/data-persistence/simulation-run-store.test.mjs` (new)

## Out of scope
- Storing full trajectory event logs (handled separately).
- Aggregated batch metrics beyond per-run summaries.
- Any changes to evaluation-analytics metric computation.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/data-persistence/simulation-run-store.test.mjs`

### Invariants that must remain true
- Trajectory summaries produced by evaluation-analytics stay unchanged.
- Simulation-engine batch hooks continue to compute metrics as before.

## Assumptions (reassessed)
- `src/data-persistence/jsonl.js` already provides stable JSONL serialization helpers.
- `src/data-persistence/types.ts` already defines `SimulationRunRecord` and `MetricsRecord`.
- There is no existing simulation run or metrics store implementation or tests yet.

## Status
Completed on 2026-01-27.

## Outcome
- Added a new simulation run + metrics JSONL store implementation and tests.
- Reused existing JSONL helpers without changing `src/data-persistence/jsonl.js`.
- Enforced required linking fields (`gameId`, `runId`) for per-run metrics rather than embedding metrics in run records.
