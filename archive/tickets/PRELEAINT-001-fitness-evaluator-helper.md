# PRELEAINT-001: Preference-aware fitness helper
Status: Completed

## Context
We have low-level scoring utilities (`computeCompositeScore`, `computePreferenceScore`, `combineFitnessScores`), but no single helper that wires them into a preference-aware fitness output with diagnostics and safe defaults.

## Scope
- Add a preference-aware fitness helper in evaluation analytics that:
  - Accepts a feature vector, optional composite score, optional preference model state, and diversity pressure.
  - Computes a composite score when one is not provided.
  - Computes preference score + confidence when a model is provided.
  - Defaults preference bootstrap sample count to `preferenceModelState.sampleCount` when available.
  - Blends composite, preference, and diversity using `combineFitnessScores`.
  - Supports explicit `allowPreference: false` gating (to be used after degeneracy filters reject a candidate).
  - Returns a small diagnostics object (preference score, confidence, blend components).
- Add type definitions and exports for the helper.
- Add tests covering bootstrap cap behavior, preference gating, and diagnostics shape.

## File list
- src/evaluation-analytics/fitness.js (new)
- src/evaluation-analytics/fitness.d.ts (new)
- src/evaluation-analytics/index.ts
- test/evaluation-analytics/fitness.test.mjs

## Out of scope
- No changes to evolutionary engine or map-elites logic.
- No persistence changes.
- No changes to preference model training/update logic.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/evaluation-analytics/fitness.test.mjs`
- `npm test`

### Invariants that must remain true
- Helper does not mutate input feature vectors or model state.
- When `allowPreference` is false or no model is provided, preference contribution is zero.
- Preference contribution is clamped by configured caps.

## Outcome
- Added `computePreferenceAwareFitness` helper with diagnostics and sample-count-aware preference capping.
- Introduced `src/evaluation-analytics/fitness.d.ts` types and `index.ts` exports; no change to `types.ts` needed.
- Added `test/evaluation-analytics/fitness.test.mjs` to cover bootstrap caps, gating, and diagnostics shape.
