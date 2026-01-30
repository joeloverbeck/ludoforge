# EVOQUAOVE-03: Reject non-finite fitness scores in evaluator

**Spec ref:** EQ-16
**Phase:** 1 — Stop the bleeding
**Depends on:** None

## Problem

The evaluator returns whatever `fitnessResult.score` produces. If the composite score is `NaN` (e.g., all metrics are `NaN` and weights sum to zero), the evaluator passes `NaN` as fitness. The engine's check (`result.fitness == null`) does not catch `NaN` because `NaN == null` is `false` in JavaScript. This allows `NaN`-fitness genomes into MAP-Elites.

## Fix

Add an explicit guard in the evaluator's return path: if `!Number.isFinite(score)`, return `{ fitness: null, descriptors: null, diagnostics: { ..., nonFiniteFitness: true } }`.

## Files to touch

- `src/evaluation-analytics/create-evaluator.js` — add non-finite guard before returning fitness

## Out of scope

- Do NOT change the fitness scoring formula (`scoring.js`)
- Do NOT change the degeneracy penalty logic
- Do NOT change the engine's rejection logic
- Do NOT change simulation or metrics computation

## Acceptance criteria

### Tests that must pass

1. **New/updated unit test** in `test/unit/evaluation-analytics/create-evaluator.test.mjs`:
   - When fitness score is `NaN`, evaluator returns `{ fitness: null, ... }`
   - When fitness score is `Infinity`, evaluator returns `{ fitness: null, ... }`
   - When fitness score is `-Infinity`, evaluator returns `{ fitness: null, ... }`
   - When fitness score is a valid finite number, behavior is unchanged

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- The evaluator NEVER returns a non-finite fitness value
- `fitness` is always either `null` or a finite number
- Diagnostics include `nonFiniteFitness: true` flag when the guard fires
