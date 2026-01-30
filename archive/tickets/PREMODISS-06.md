# PREMODISS-06 — E2E Test Updates

**Status**: Completed
**Depends on**: PREMODISS-01, PREMODISS-02, PREMODISS-03, PREMODISS-04, PREMODISS-05
**Blocks**: PREMODISS-07

## Summary

Update existing E2E tests for new ensemble semantics and ensure they align with the current preference-model implementation (ensemble + uncertainty).

## Files to touch

- `test/e2e/active-learning.e2e.test.mjs` — assert max-information selection, not closest-to-0.5
- `test/e2e/preference-model-update.e2e.test.mjs` — assert ensemble updates are deterministic, uncertainty decreases with repeated samples
- `test/e2e/mock-fitness.e2e.test.mjs` — assert preference damped when uncertainty high, degeneracy/safety gating unchanged
- `test/e2e/helpers/mock-fitness.js` — update for new preference model state shape if needed

## Out of scope

- Non-test feature work unrelated to preference-model/active-learning behavior
- Any non-test file (unless strictly required to satisfy E2E expectations)

## Acceptance criteria

- `test/e2e/active-learning.e2e.test.mjs`:
  - Prioritizes pairs with max ensemble uncertainty / information gain
  - Still enforces `diversityQuota`
- `test/e2e/preference-model-update.e2e.test.mjs`:
  - Ensemble updates are deterministic (same seed → same state)
  - Mean prediction moves in correct direction after consistent comparisons
  - Uncertainty decreases as repeated similar samples accumulate
- `test/e2e/mock-fitness.e2e.test.mjs`:
  - Preference contribution is damped when uncertainty is high
  - Degeneracy/safety gating behavior is unchanged

## Updated assumptions

- Ensemble-aware preference scoring, uncertainty, and active-learning acquisition are already implemented in `src/`.
- Unit tests for uncertainty and acquisition have already landed under `test/unit/evaluation-analytics/`.
- Remaining work is confined to E2E expectations and fixtures to match the new preference model state shape.

## Tests that must pass

- `npm run test:e2e` passes
- `npm run test:unit` passes

## Invariants that must remain true

- Determinism: identical seeds + identical feedback → identical results
- Diversity protection: `diversityQuota` still reserves slots for underrepresented niches
- Preference contribution bounded and does not override degeneracy/safety gating
- Tie handling still supported (`preferred = "tie"` → target 0.5)

## Outcome

- Updated E2E assertions to cover acquisition ranking, deterministic updates, and uncertainty-damped fitness.
- Confirmed ensemble-aware unit tests were already present; no additional unit tests needed.
- No source code changes required beyond test adjustments.
