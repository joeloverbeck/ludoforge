# [DECQUAMET] DECQUAMET-004: Implement comeback potential metric
Status: Completed (2026-01-28)

## Goal
Add `comeback_potential` as an opt-in extended metric using early-score snapshots and
correlation with final outcomes.

## File list (expected to touch)
- src/evaluation-analytics/metrics/extended.js
- src/evaluation-analytics/metrics/extended.d.ts
- src/evaluation-analytics/index.ts
- src/evaluation-analytics/types.ts
- test/unit/evaluation-analytics/comeback-potential.test.mjs

## Assumptions (revalidated)
- Comeback potential must use full simulation trajectories because trajectory summaries do not store
  state snapshots; it should read `options.simulations` when enabled.
- `computeScoresAtState` exists in `game-kernel/termination.js` and returns `undefined` when scoring
  expressions are absent.
- Deterministic leader selection is required (tie-break on lowest player id).

## Scope
- Add a `computeComebackPotential` helper that:
  - Selects an early step (e.g., `ceil(stepCount * earlyStepPercent)`, clamped to at least 1) from
    each simulation trajectory.
  - Computes per-player scores at that state and identifies the early leader.
  - Calculates early advantage = leader score - runner-up score.
  - Computes Pearson correlation between early advantage and final outcome (leader win=1, loss=0,
    draw=0.5), then returns `1 - clamp(correlation, 0, 1)`.
- Require `options.simulations` when enabled; return 0 if trajectories or scoring expressions are
  unavailable.
- Return 0 when correlation cannot be computed (insufficient valid samples).
- Expose `earlyStepPercent` in the decision-quality config type if not already present.

## Out of scope
- No changes to termination scoring rules.
- No changes to simulation engine data structures.
- No changes to the feature-vector ordering beyond adding the new metric id.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/evaluation-analytics/comeback-potential.test.mjs`
- `npm run test:unit`

### Invariants that must remain true
- Metric returns 0 when scoring expressions are missing or early samples are invalid.
- Correlation is clamped to [0, 1] before inversion.
- Default analytics outputs are unchanged when the metric is not enabled.

## Notes
- Use the `computeScoresAtState` helper from `game-kernel/termination.js` for early-state scoring
  when available.
- Ensure leader selection is deterministic for ties (e.g., lowest player id).

## Outcome
- Implemented `comeback_potential` as an opt-in extended metric driven by simulation trajectories,
  with Pearson correlation clamped before inversion.
- Added early-step sampling via `earlyStepPercent` in decision-quality config and extended options.
- Added unit coverage for perfect-prediction correlation and missing scoring expressions.
