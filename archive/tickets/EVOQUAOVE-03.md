# EVOQUAOVE-03: Reject non-finite fitness scores in evaluator

**Spec ref:** EQ-16
**Phase:** 1 — Stop the bleeding
**Depends on:** None

## Problem

The evaluator returns whatever `fitnessResult.score` produces. The current scoring pipeline generally coerces non-finite inputs to `0` via `safeNumber`, so `NaN`/`Infinity` are unlikely in normal runs. However, the evaluator still has no explicit guard against non-finite fitness, and custom `fitnessOptions` (or future changes to scoring) could still yield a non-finite `fitnessResult.score`. The engine's check (`result.fitness == null`) does not catch `NaN` because `NaN == null` is `false` in JavaScript, so a non-finite fitness value could slip into MAP-Elites if it ever appears.

## Fix

Add an explicit guard in the evaluator's return path: if `!Number.isFinite(score)`, return `{ fitness: null, descriptors: null, diagnostics: { ..., nonFiniteFitness: true } }`. Keep the rest of the evaluation pipeline intact so diagnostics still report the computed metrics and fitness payload.

## Files to touch

- `src/evaluation-analytics/create-evaluator.js` — add non-finite guard before returning fitness
- `test/unit/evaluation-analytics/create-evaluator-nonfinite.test.mjs` — mock fitness output to force non-finite scores

## Out of scope

- Do NOT change the fitness scoring formula (`scoring.js`)
- Do NOT change the degeneracy penalty logic
- Do NOT change the engine's rejection logic
- Do NOT change simulation or metrics computation

## Acceptance criteria

### Tests that must pass

1. **New unit test** in `test/unit/evaluation-analytics/create-evaluator-nonfinite.test.mjs` (use `mock.module()` so it must be its own file):
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

## Completion

- Status: Completed
- Completed: 2026-01-30

## Outcome

Added an explicit non-finite fitness guard in the evaluator and a mocked unit test file that forces NaN/Infinity scores to validate the rejection behavior. The scoring pipeline already clamps non-finite inputs to 0, so the ticket scope shifted to adding the guard and tests rather than changing scoring logic.
