# AGEENS-11: Adaptive human sampling budget

**Status**: COMPLETED

**Goal**: Auto-adjust `maxSamplesPerGen` based on ensemble uncertainty per generation.

**Description**: Create `computeAdaptiveBudget({ preferenceModelState, baseMaxSamples, metricIds, previousMetricIds, candidates, lowUncertaintyThreshold, highUncertaintyThreshold, enabled })` returning adjusted budget. Uncertainty is computed from the current generation's evaluated candidates by averaging `computePreferenceScore(preferenceModelState, featureVector).uncertainty`. Logic: low uncertainty -> `floor(base * 0.5)` (min 1); high uncertainty or new metric IDs -> `ceil(base * 1.5)`; otherwise base. Integrate into the human feedback provider per generation (where `maxSamplesPerGen` is currently applied). Add config schema entries for thresholds. Defaults to disabled.

**Files to touch**:
- `src/evolution-runner/adaptive-budget.js` (new)
- `src/human-interface/create-feedback-provider.js` (apply adaptive budget per generation)
- `src/human-interface/create-feedback-provider.d.ts` (config typing update)
- `configs/evolution-runner.json` (add `humanFeedback.adaptiveBudget` section)
- `schemas/evolution-runner/runner-config.schema.json` (add adaptive budget properties)
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

## Outcome
- Added adaptive budget calculation based on mean preference-model uncertainty and new metric IDs, applied in the human feedback provider per generation.
- Added adaptive budget config defaults and schema validation, plus unit coverage for the new budget logic and schema acceptance.
