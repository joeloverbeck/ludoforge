# MUTOPEISS-06: Wire telemetry into runner loop + persist + resume

**Status**: Completed
**Priority**: High
**Depends on**: MUTOPEISS-03, MUTOPEISS-04, MUTOPEISS-05
**Blocks**: MUTOPEISS-07

## Summary

The runner tracks which operator produced each child, correlates outcomes after evaluation and MAP-Elites placement, accumulates telemetry, persists `operator-stats.json` per generation, and loads previous stats on resume.

## Files to Touch

- `src/evolution-runner/runner.js` — create telemetry at run start, record attempts in `applyEvolution`, correlate outcomes after `runGenerationLoop` in next generation, pass stats to artifact writer
- `src/evolution-runner/runner.js` — on resume (`startGeneration` > 0), load latest `operator-stats.json` from the run directory to continue counters
- `src/evolution-runner/artifact-writer.js` — add `operatorStats` to `writeGenerationArtifacts`, write `operator-stats.json`
- `src/evolution-runner/artifact-writer.d.ts` — update artifact inputs/paths

## Out of Scope

- Bandit reward functions
- Adaptive selection
- Architecture docs

## Acceptance Criteria

- New test: `test/e2e/operator-telemetry.e2e.test.mjs`
  - Run 1 generation → `operator-stats.json` exists in `runs/<runId>/generation-0/`
  - Counters add up: sum of all operator attempts = number of mutated children
  - Resume same run → counters continue (cumulative, not reset)
- Existing E2E tests remain green
- **Invariant**: Telemetry does NOT leak across runs (new runId = fresh counters)
- **Invariant**: Determinism preserved — same seed produces same telemetry

## Outcome

- Runner now accumulates operator telemetry, records attempts/outcomes, and writes `operator-stats.json` each generation.
- Resume loads the latest operator stats to continue cumulative counters.
- Added E2E coverage for operator stats persistence and resume accumulation.
