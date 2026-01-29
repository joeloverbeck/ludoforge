# DEGFILISS-004: Add `computeDegeneracyPenalty()` and wire into fitness blend

**Status:** Open
**Depends on:** DEGFILISS-001, DEGFILISS-002
**Blocks:** DEGFILISS-005

## Summary

Implement the deterministic penalty term for degeneracy flags with `"penalize"` policy and wire it into the fitness computation pipeline.

## Files to Change

- `src/evaluation-analytics/degeneracy.js` — add + export `computeDegeneracyPenalty`
- `src/evaluation-analytics/degeneracy.d.ts`
- `src/evaluation-analytics/scoring.js` — add `degeneracyPenalty` to `combineFitnessScores` components
- `src/evaluation-analytics/scoring.d.ts`
- `src/evaluation-analytics/fitness.js` — accept + subtract `degeneracyPenalty`
- `src/evaluation-analytics/fitness.d.ts`
- `src/evolutionary-engine/preference-evaluator.js` — pass penalty config, call penalty fn
- `src/evolutionary-engine/preference-evaluator.d.ts`
- `test/unit/evaluation-analytics/degeneracy.test.mjs` — penalty math tests
- `test/unit/evaluation-analytics/fitness.test.mjs` — blend subtraction test
- `test/unit/evolutionary-engine/preference-evaluator.test.mjs` — integration test

## Out of Scope

- E2E test updates (DEGFILISS-005)
- Documentation updates (DEGFILISS-006)

## Requirements

### Penalty Function (`degeneracy.js`)

`computeDegeneracyPenalty(report, analytics, penaltyConfig)` returns a non-negative number.

Penalty formulas:
- **forcedMove**: `max(0, forcedMoveRatio - freeRatio) * weight`
- **noChoices**: `noChoices ? weight : 0`
- **Other flags** (dominantAction, trivialWin, stalemate): `flagPresent ? weight : 0`
- Penalty is `0` when no flags have `"penalize"` policy.

### Fitness Blend (`scoring.js`, `fitness.js`)

- `combineFitnessScores` output includes `degeneracyPenalty` in components.
- Final fitness formula: `base + diversity + preference - degeneracyPenalty`.

### Evaluator Wiring (`preference-evaluator.js`)

- Pass penalty config from degeneracy config into `computeDegeneracyPenalty`.
- Subtract result from fitness blend.

### Policy Semantics (invariant 3)

- **reject**: candidate rejected before scoring/placement.
- **penalize**: candidate not rejected; fitness decreased by configured penalty.
- **ignore**: flag has no effect on gating or fitness (may be logged/emitted as feature).

### Tests

1. Penalty math: given `forcedMoveRatio`, `freeRatio`, `weight` → assert exact penalty output.
2. Penalty math: given `noChoices=true` → assert penalty equals configured weight.
3. Penalty is 0 when no flags have `"penalize"` policy.
4. `combineFitnessScores` includes `degeneracyPenalty` component.
5. Final fitness = `base + diversity + preference - degeneracyPenalty`.
6. Preference evaluator passes config and calls penalty fn.
7. Determinism invariant holds.

## Acceptance Criteria

- [ ] `computeDegeneracyPenalty(report, analytics, penaltyConfig)` returns non-negative number
- [ ] Penalty is 0 when no flags have `"penalize"` policy
- [ ] forcedMove penalty: `max(0, forcedMoveRatio - freeRatio) * weight` (exact)
- [ ] noChoices penalty: `noChoices ? weight : 0` (exact)
- [ ] Other flags: `flagPresent ? weight : 0`
- [ ] `combineFitnessScores` output includes `degeneracyPenalty` in components
- [ ] Final fitness = `base + diversity + preference - degeneracyPenalty`
- [ ] Policy semantics: reject = rejected before scoring; penalize = fitness decreased; ignore = no effect
- [ ] Determinism invariant holds
- [ ] `npm run test:unit` passes
