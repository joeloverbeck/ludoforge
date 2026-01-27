# SIMENG-005: Batch simulation runner and metric hooks

## Summary
Provide a batch runner that executes many simulations and collects metrics with optional on-the-fly aggregation.

## Assumptions (reassessed 2026-01-27)
- A `runBatch(count)` helper already exists on `createSimulationEngine` and must remain backward compatible.
- No existing `batch.js` module or batch-specific tests exist yet.
- Core loop lives in `src/simulation-engine/loop.js` and should remain the single source of truth for per-simulation behavior.

## File list expected to touch
- src/simulation-engine/batch.js (new)
- src/simulation-engine/index.js
- src/simulation-engine/index.d.ts
- src/simulation-engine/types.d.ts
- test/simulation-engine/batch.test.mjs (new)

## Work plan
1. Implement a batch runner module that accepts a list of simulation inputs and returns results (plus optional aggregated metrics).
2. Add optional metric hooks: `onStep`, `onTerminal`, and `reduceMetrics` for incremental aggregation (including legal-action counts and termination reasons).
3. Ensure the batch runner respects per-simulation seeds and returns a stable ordering of results.
4. Add tests to validate aggregation behavior and ordering.
5. Preserve `createSimulationEngine().runBatch(count)` behavior (no breaking changes).

## Out of scope
- Worker-thread parallelism.
- Persisting trajectories to disk.
- Non-deterministic scheduling or time-based seeds.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/simulation-engine/batch.test.mjs`
- `node --test test/simulation-engine/core-loop.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Batch execution preserves the input order in its output.
- Metric hooks do not mutate simulation state or trajectories.
- Batch runner treats each simulation independently (no shared mutable state).

## Status
Completed on 2026-01-27.

## Outcome
- Added a dedicated batch runner (`runBatchSimulations`) that returns results plus optional aggregated metrics.
- Preserved the existing `createSimulationEngine().runBatch(count)` behavior.
- Introduced batch-specific tests to cover ordering and aggregation hooks.
