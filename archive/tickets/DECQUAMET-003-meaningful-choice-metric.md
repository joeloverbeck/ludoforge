# [DECQUAMET] DECQUAMET-003: Implement meaningful choice metric
Status: Completed (2026-01-27)

## Goal
Add `choice_value_spread` as an opt-in extended metric using decision-point sampling and rollouts.

## File list (expected to touch)
- src/evaluation-analytics/metrics/extended.js
- src/evaluation-analytics/metrics/extended.d.ts
- src/evaluation-analytics/types.ts
- test/unit/evaluation-analytics/meaningful-choice.test.mjs

## Scope
- Add a `computeMeaningfulChoice` helper that:
  - Samples up to `decisionSamplesPerRun` decision points per simulation **from simulation
    trajectories**, not from summaries.
  - Derives decision points by advancing the post-action step state to the next turn phase.
    (The initial pre-action state is not recorded in trajectories, so the very first decision
    point is unavailable.)
  - For each sampled point, runs `rolloutsPerAction` rollouts per legal action using a fixed
    rollout agent, subject to a per-run rollout budget.
  - Uses `choice_value_spread = max(actionValues) - min(actionValues)` and averages across samples.
- Support config defaults and guardrails:
  - Disabled by default unless explicitly enabled via options.
  - Cap total rollouts per run to prevent blowups.
  - Honor `rolloutMaxSteps`, `rolloutAgent`, and deterministic seed strategy.
- Expose config types in `types.ts` (e.g., `DecisionQualitySamplingConfig`) and allow
  `computeExtendedMetrics` to accept optional sampling configuration + simulations.

## Out of scope
- No changes to core metrics or degeneracy filters.
- No changes to log adapter schemas or persistence formats.
- No new agent implementations; reuse existing random/greedy descriptors.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/evaluation-analytics/meaningful-choice.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Extended metrics remain opt-in; default analytics output is unchanged when options are omitted.
- Metric computation is deterministic given fixed seeds and inputs.
- Sampling skips runs with no valid decision points without throwing.

## Notes
- Use the `computeScoresAtState` helper from `game-kernel/termination.js` when a scoring
  expression exists; otherwise fall back to outcome win/lose/draw scores.
- Keep the helper isolated so `computeExtendedMetrics` can remain a cheap, summary-only path.

## Outcome
- Implemented `choice_value_spread` as an opt-in extended metric that samples decision points
  derived from post-action trajectory states (advanced to the next turn), requiring simulations
  to be passed into `computeExtendedMetrics` options.
- Added rollout budgeting and deterministic seeding with configurable defaults, plus unit tests
  covering action spread and the no-decision-point edge case.
