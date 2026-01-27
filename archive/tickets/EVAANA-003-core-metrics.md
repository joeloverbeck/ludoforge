# [EVAANA] EVAANA-003: Implement initial core metrics
Status: Completed (2026-01-27)

## Goal
Compute the initial proxy "fun" metrics from trajectory summaries.

## File list (expected to touch)
- src/evaluation-analytics/metrics/core.js
- src/evaluation-analytics/metrics/core.d.ts
- src/evaluation-analytics/index.ts
- src/evaluation-analytics/types.ts
- src/evaluation-analytics/log-adapter.js
- test/evaluation-analytics/core-metrics.test.mjs

## Scope
- Implement metrics: agency, strategic depth (branching factor over time), skill expression (win-rate gap), variety (trajectory entropy), pacing/tension (turn pacing proxy), interaction rate.
- Ensure each metric is a small pure function with explicit inputs/outputs from `src/evaluation-analytics/types.ts` and runtime JS + companion type definitions.
- Extend trajectory summaries to retain per-step `legalActionCount` so branching factor can be computed without reaching back into raw trajectories.
- Add focused fixtures that cover baseline and edge-case behaviors (empty timelines, single-action games, etc.).

## Out of scope
- No degeneracy filtering logic.
- No composite scoring or weighting.
- No preference model updates.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`
- `node --test test/evaluation-analytics/core-metrics.test.mjs`

### Invariants that must remain true
- Metric computations are pure (no mutation of inputs, no IO).
- Metrics return stable results for deterministic inputs.
- Existing DSL and simulation-engine tests remain green.

## Notes
- Keep per-metric functions isolated so they can be unit-tested with minimal fixtures.
- Win-probability timelines are not available in trajectory summaries yet, so pacing/tension uses a turn-based proxy until win-prob data is added.

## Outcome
- Added core metrics module with proxy implementations for agency, strategic depth, skill expression, variety, pacing/tension, and interaction rate.
- Extended trajectory summaries to retain legal action counts for branching-factor metrics.
- Added core metrics tests covering empty inputs and edge cases.
