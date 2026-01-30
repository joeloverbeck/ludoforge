# EVOQUAOVE-07: Multiplicative degeneracy penalty

**Spec ref:** EQ-02
**Phase:** 2 — Strengthen selection pressure
**Depends on:** None

## Problem

The degeneracy penalty is subtracted from the base score:
```
score = base + diversityContribution + preferenceContribution - degeneracyPenalty
```
A game with `base: 0.6` and `degeneracyPenalty: 0.3` still scores `0.3`. Degenerate games retain enough fitness to survive selection.

## Fix

Apply the degeneracy penalty as a multiplicative discount instead of an additive subtraction:
```
score = (base + diversityContribution + preferenceContribution) * (1 - clamp(degeneracyPenalty, 0, 1))
```
A penalty of `0.3` reduces a `0.6` base to `0.42`. A penalty of `1.0` forces fitness to zero.

## Files to touch

- `src/evaluation-analytics/scoring.js` — change `combineFitnessScores()` (lines ~148-168) to apply multiplicative penalty

## Out of scope

- Do NOT change `computeDegeneracyPenalty()` in `degeneracy-penalty.js` (the penalty value itself is fine)
- Do NOT change penalty weights in `configs/degeneracy.json`
- Do NOT change the composite scoring formula (`computeCompositeScore`)
- Do NOT change `feature-vector.js`

## Acceptance criteria

### Tests that must pass

1. **Updated unit tests** in `test/unit/evaluation-analytics/`:
   - `combineFitnessScores({ base: 0.6 }, { degeneracyPenalty: 0.3 })` → score ≈ `0.6 * 0.7 = 0.42` (not `0.3`)
   - `combineFitnessScores({ base: 0.6 }, { degeneracyPenalty: 1.0 })` → score = `0`
   - `combineFitnessScores({ base: 0.6 }, { degeneracyPenalty: 0 })` → score = `0.6` (unchanged)
   - Penalty values > 1 are clamped to 1

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- Score is always ≥ 0 (multiplicative discount with clamped penalty cannot produce negative values)
- When degeneracyPenalty is 0, the formula produces the same result as before
- The `components` return object from `combineFitnessScores` still includes `degeneracyPenalty` for diagnostics
