# SKIEXPISS-003: Implement real skill expression metric (config-gated)

## Summary
Add a new, optional, compute-expensive skill expression metric that measures agent-tier separation while canceling seat bias, following the spec in `specs/skill-expression-issue.md`. This repo already renamed the old win-rate spread metric to `seat_imbalance` and updated the default feature order, so this ticket only adds the true metric and its config gate.

## File list (expected to touch)
- src/evaluation-analytics/metrics/skill-expression.js (new)
- src/evaluation-analytics/metrics/skill-expression.d.ts (new)
- src/evaluation-analytics/metrics/extended.js
- src/evaluation-analytics/metrics/extended.d.ts
- src/evaluation-analytics/types.ts
- src/evaluation-analytics/index.ts
- test/unit/evaluation-analytics/skill-expression.test.mjs (new)

## Out of scope
- No changes to the `seat_imbalance` metric or its naming (already renamed from the old `skill_expression` proxy).
- No changes to default feature vector ordering (already updated to `seat_imbalance`).
- No changes to MAP-Elites descriptors or fitness blending.
- No performance tuning beyond the spec’s config gating.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/unit/evaluation-analytics/skill-expression.test.mjs`

### Invariants that must remain true
- Metric is config-gated and does not execute unless explicitly enabled.
- Metric output range is clamped to `[0, 1]` with `0` representing no measurable separation.
- If only one tier is configured or tiers are behaviorally identical, metric returns `0`.
- Swapping seat labels in the same tier scheduling does not change the metric value.

## Notes on current code
- `seat_imbalance` is already emitted by `computeCoreMetrics`, and `DEFAULT_FEATURE_ORDER` already includes it.
- Core metric tests already assert that `skill_expression` is not emitted by default.

## Status
Completed.

## Outcome
- Added the config-gated true `skill_expression` metric via a new module, and wired it into extended metrics when enabled.
- Updated metrics options/types and exports instead of adding a separate metrics config module.
- Added unit coverage for tier separation, identical tiers, seat-bias cancellation, and the config gate; core `seat_imbalance` code and feature ordering remained unchanged.
