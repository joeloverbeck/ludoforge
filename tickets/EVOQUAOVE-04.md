# EVOQUAOVE-04: Zero-weight degeneracy metrics in fitness composite

**Spec ref:** EQ-03
**Phase:** 1 — Stop the bleeding
**Depends on:** None

## Problem

In `configs/fitness.json`, degeneracy flags (`degeneracy.loop`, `degeneracy.stalemate`, etc.) are included in the fitness weight map with weight `1`. They enter the feature vector as binary `0/1` values. A degenerate game gets `degeneracy.*: 1` for fired flags, which **increases** the weighted sum. The separate penalty subtracts some amount, but the composite inclusion partially offsets it.

## Fix

Set all `degeneracy.*` weights to `0` in `configs/fitness.json`. Degeneracy should only affect fitness through the penalty mechanism, never through the composite score.

Affected keys:
- `degeneracy.loop`
- `degeneracy.stalemate`
- `degeneracy.forced-move`
- `degeneracy.non-terminating`
- `degeneracy.no-choices`
- `degeneracy.dominant-action`
- `degeneracy.trivial-win`

## Files to touch

- `configs/fitness.json` — set all `degeneracy.*` weights to `0`

## Out of scope

- Do NOT change non-degeneracy weights
- Do NOT change `feature-vector.js` (it still computes the flags; they just get zero weight)
- Do NOT change `scoring.js` or `degeneracy-penalty.js`
- Do NOT change JSON Schema files

## Acceptance criteria

### Tests that must pass

1. **Updated unit test** verifying that degeneracy flags with weight 0 do not contribute to composite score
2. Any existing test in `test/unit/evaluation-analytics/` that checks fitness computation must still pass

3. All existing tests:
   - `npm run test:unit` passes

### Invariants

- The composite fitness score is unchanged for non-degenerate games (all degeneracy flags are 0 anyway)
- For degenerate games, the composite score no longer gets a positive contribution from fired degeneracy flags
- `fitness.json` remains valid against its JSON Schema (`schemas/config/fitness.schema.json` if it exists)
