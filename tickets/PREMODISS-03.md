# PREMODISS-03 — Active Learning: Max-Information Acquisition

**Status**: Open
**Depends on**: PREMODISS-01, PREMODISS-02
**Blocks**: PREMODISS-06

## Summary

Change pair selection from "closest to 0.5" to "max ensemble uncertainty / BALD".

## Files to touch

- `src/evaluation-analytics/active-learning.js` — change scoring/ranking logic

## Out of scope

- Ensemble state (PREMODISS-01)
- Scoring internals (PREMODISS-02, used as a dependency)
- Fitness blending (PREMODISS-04)
- Persistence (PREMODISS-05)
- `diversityQuota` behavior (must remain exactly as-is)
- `cadence` behavior (unchanged)
- Any file not listed above

## Acceptance criteria

- Pairs ranked by BALD (primary) or pVar (fallback) descending, not by `|winProbability - 0.5|` ascending
- `uncertaintyThreshold` semantics change: filter pairs with acquisition score >= threshold (minimum information gain), not <= threshold
- `diversityQuota` still reserves slots for underrepresented `nicheId`s — exact same logic
- Selection is deterministic given same shortlist + model state + seed
- Return shape unchanged: `[{ candidateA, candidateB, winProbability, uncertainty }]`
  - `uncertainty` field now contains BALD/pVar value (higher = more informative)

## Tests that must pass

- `test/unit/evaluation-analytics/active-learning.test.mjs` (updated assertions for new ranking)
- New test: `test/unit/evaluation-analytics/active-learning-acquisition.test.mjs`
  - Feed fixed candidate set with known ensemble predictions
  - Assert ranking is by BALD/variance descending
  - Assert deterministic
  - Assert diversityQuota still works
