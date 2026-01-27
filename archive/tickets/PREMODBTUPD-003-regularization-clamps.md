# [PREMODBTUPD] PREMODBTUPD-003: Add weight decay and clamps
Status: Completed

## Goal
Apply per-update weight/bias decay and clamp weights/bias to bounded ranges to prevent drift.

## Reassessment (2026-01-27)
- `src/evaluation-analytics/preference-model.js` already applies weight/bias decay and clamps.
- Unit tests already cover decay/clamp behavior in `test/unit/evaluation-analytics/preference-model.test.mjs`.
- Scope adjusted to verification + documentation alignment.

## File list (expected to touch)
- src/evaluation-analytics/preference-model.js
- test/unit/evaluation-analytics/preference-model.test.mjs

## Scope
- Verify existing weight decay on each update: `weights[key] -= learningRate * weightDecay * weights[key]`.
- Verify bias decay (using the same `weightDecay`).
- Verify clamp of weights/bias after update using `maxWeightAbs` and `maxBiasAbs`.
- Add/adjust tests only if verification shows gaps.
- Update docs in `docs/architecture/` to match actual update ordering (decay then clamp).

## Out of scope
- No changes to update math for comparisons/ratings beyond adding decay/clamps.
- No new configuration fields beyond those introduced in PREMODBTUPD-001.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/unit/evaluation-analytics/preference-model.test.mjs`

### Invariants that must remain true
- Clamp behavior never produces NaN or Infinity in weights/bias.
- Prior model state objects remain immutable.
- Weights remain keyed by feature id in snapshots and state.

## Outcome
- No code changes were required; decay/clamp logic and tests already existed.
- Documentation clarified the update ordering (apply deltas, then decay, then clamp).
