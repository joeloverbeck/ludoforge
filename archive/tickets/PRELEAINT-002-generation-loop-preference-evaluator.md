# PRELEAINT-002: Preference-aware evaluator for generation loop
Status: Completed

## Context
The generation loop expects an evaluator, but there is no reusable helper that builds a preference-aware evaluator from evaluation analytics output and preference model state. Note: the current `EvaluationAnalyticsOutput` type does **not** include descriptors, so the helper must accept analytics that extend the analytics output with descriptors rather than assuming descriptors live in the base analytics type.

## Scope
- Add a small helper in the evolutionary engine that:
  - Accepts a function to compute evaluation analytics (feature vector + composite score + degeneracy report) for a genome, plus descriptors.
  - Accepts preference model state and fitness blend options.
  - Uses `computePreferenceAwareFitness` to blend composite, preference, and diversity into a final score.
  - Returns an evaluator compatible with `evaluateGenome` / `runGenerationLoop`.
  - Ensures degeneracy rejection (via `applyDegeneracyFilters` default behavior unless overridden) results in `allowPreference: false` for blending.
  - Passes through descriptors from the analytics output unchanged.
- Add types and export for the helper.
- Add tests covering:
  - Preference scoring included when allowed.
  - Preference scoring gated off when degeneracy rejects.
  - Descriptor passthrough.

## File list
- src/evolutionary-engine/preference-evaluator.js (new)
- src/evolutionary-engine/preference-evaluator.d.ts (new)
- src/evolutionary-engine/index.ts
- src/evolutionary-engine/types.ts
- test/evolutionary-engine/preference-evaluator.test.mjs

## Out of scope
- No changes to `evaluateGenome` or `runGenerationLoop` signatures.
- No changes to map-elites placement logic.
- No changes to preference model update logic.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/evolutionary-engine/preference-evaluator.test.mjs`
- `npm test`

### Invariants that must remain true
- Evaluator does not mutate analytics output or preference model state.
- Descriptors returned by the evaluator match analytics output exactly.
- If degeneracy filters reject, preference contribution is zero.

## Outcome
- Added a preference-aware evaluator helper with diagnostics and exports for the evolutionary engine.
- Introduced evaluator tests for preference gating and descriptor passthrough; no changes to generation loop or evaluation adapter signatures.
- Clarified analytics expectations to include descriptors alongside evaluation analytics output.
