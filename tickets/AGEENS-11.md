# AGEENS-11: Adaptive human sampling budget

**Status**: TODO

**Goal**: Auto-adjust `maxSamplesPerGen` based on ensemble uncertainty.

**Description**: Create `computeAdaptiveBudget({ preferenceModelState, baseMaxSamples, metricIds, previousMetricIds })` returning adjusted budget. Logic: low uncertainty -> `floor(base * 0.5)` (min 1); high uncertainty or new metric IDs -> `ceil(base * 1.5)`; otherwise base. Integrate into runner per generation. Add config schema entry for thresholds. Defaults to disabled.

**Files to touch**:
- `src/evolution-runner/adaptive-budget.js` (new)
- `src/evolution-runner/runner.js` (integrate per-generation budget adjustment)
- `configs/evolution-runner.json` (add `humanFeedback.adaptiveBudget` section)
- `schemas/config/evolution-runner.schema.json` (add adaptive budget properties)
- `test/unit/evolution-runner/adaptive-budget.test.mjs` (new)

**Out of scope**:
- No changes to active learning pair selection algorithm
- No preference model changes
- No new metrics
- No CLI changes

**Acceptance criteria**:
- [ ] Tests: `node --test test/unit/evolution-runner/adaptive-budget.test.mjs` passes
- [ ] Low uncertainty -> budget < base
- [ ] High uncertainty or new metric IDs -> budget > base
- [ ] Budget never below 1
- [ ] Disabled by default (feature flag off -> base budget unchanged)
- [ ] Invariant: all existing tests pass; diversity quota behavior preserved

**Dependencies**: None
