# PREMODISS-03 — Active Learning: Max-Information Acquisition

**Status**: Completed
**Depends on**: PREMODISS-01, PREMODISS-02
**Blocks**: PREMODISS-06

## Summary

Change pair selection from "closest to 0.5" margin to max-information acquisition (BALD, or pVar fallback) using the ensemble model state.

## Current assumptions (verified)

- `PreferenceModelState` is now an ensemble (`models[]`) and uncertainty/BALD exists in `preference-scoring`.
- `active-learning.js` still ranks by margin-to-0.5 and treats `uncertaintyThreshold` as a maximum.
- Active learning should remain deterministic and preserve `diversityQuota` behavior.

## Files to touch

- `src/evaluation-analytics/active-learning.js` — change acquisition scoring/ranking logic
- `test/unit/evaluation-analytics/active-learning.test.mjs` — update assertions for new ranking/threshold semantics
- `test/unit/evaluation-analytics/active-learning-acquisition.test.mjs` — new unit coverage for BALD/pVar ranking + determinism + diversity
- `test/e2e/active-learning.e2e.test.mjs` — align selection expectations with new acquisition scoring

## Out of scope

- Ensemble state (PREMODISS-01)
- Scoring internals (PREMODISS-02, used as a dependency)
- Fitness blending (PREMODISS-04)
- Persistence (PREMODISS-05)
- `diversityQuota` behavior (must remain exactly as-is)
- `cadence` behavior (unchanged)
- Any file not listed above

## Acceptance criteria

- Pairs ranked by BALD (primary; when ensemble size > 1) or pVar (fallback) descending, not by `|winProbability - 0.5|` ascending.
- `uncertaintyThreshold` semantics change: filter pairs with acquisition score >= threshold (minimum information gain), not <= threshold.
- `diversityQuota` still reserves slots for underrepresented `nicheId`s — exact same logic.
- Selection is deterministic given same shortlist + model state + seed.
- Return shape unchanged: `[{ candidateA, candidateB, winProbability, uncertainty }]`
  - `uncertainty` field now contains BALD/pVar value (higher = more informative).

## Tests that must pass

- `test/unit/evaluation-analytics/active-learning.test.mjs` (updated assertions for new ranking/threshold semantics)
- `test/unit/evaluation-analytics/active-learning-acquisition.test.mjs`
  - Feed fixed candidate set with known ensemble predictions
  - Assert ranking is by BALD/pVar descending
  - Assert deterministic
  - Assert diversityQuota still works
- `test/e2e/active-learning.e2e.test.mjs` (selection expectations align with acquisition scoring)

## Outcome

- Active learning now scores pairs with BALD (fallback to pVar) from ensemble comparisons and applies `uncertaintyThreshold` as a minimum acquisition filter.
- Diversity/cadence behavior and return shape preserved.
- Unit tests updated, new acquisition unit test added, and the active-learning e2e test aligned with the new threshold semantics.
