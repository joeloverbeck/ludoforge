# EVOQUAOVE-14: Runner halts on high rejection rates

**Spec ref:** EQ-15
**Phase:** 4 — Observability and adaptive control
**Depends on:** EVOQUAOVE-13 (EQ-14 — categorized rejection tracking)

## Problem

The runner does not monitor rejection rates. If 90% of the population is rejected in a generation, the run continues with a tiny surviving population that has no diversity, wasting compute on a doomed population.

## Fix

After each generation in `runEvolutionRunner()`, compute:
```
rejectionRate = rejected.length / (evaluated.length + rejected.length)
```

Track consecutive high-rejection generations. If `rejectionRate > 0.8` for 3 consecutive generations, halt the run with a diagnostic message identifying the dominant rejection reason (from EVOQUAOVE-13 categorization).

The threshold (`0.8`) and consecutive count (`3`) should be configurable via the runner config, with sensible defaults.

## Files to touch

- `src/evolution-runner/runner.js` — add rejection rate monitoring and early stopping logic in the generation loop

## Out of scope

- Do NOT change `engine.js` (rejection categorization is EVOQUAOVE-13)
- Do NOT change the evaluator
- Do NOT change the evolution operators or repair pipeline
- Do NOT add health metrics persistence (that's EVOQUAOVE-15)

## Acceptance criteria

### Tests that must pass

1. **New unit tests** in `test/unit/evolution-runner/runner.test.mjs`:
   - Runner halts when rejection rate > 0.8 for 3 consecutive generations
   - Runner continues if rejection rate drops below threshold within the window
   - Runner continues normally when rejection rate is below threshold
   - Halt message includes the dominant rejection reason

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- The runner always completes the current generation before checking the halt condition
- The halt produces a clear diagnostic log entry with: rejection rate, dominant reason, generation number
- Normal runs (low rejection) are completely unaffected
- The halt is a graceful stop (writes final artifacts before exiting)
