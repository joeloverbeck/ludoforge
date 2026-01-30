# ADAOPEWEIISS-06: Fix health metrics naming and formulas

## What

Replace the misleading `repairFailureRate` metric in `health-metrics.js` with three truthful metrics that use the new telemetry counters from ADAOPEWEIISS-01:

- `operatorInefficiencyRate = (attempts - validEvaluated) / attempts` — fraction of attempts that did not produce a valid evaluated mutation
- `repairFailureRate = repairFailed / attempts` — now truthful (only counts actual repair failures)
- `noOpRate = noOp / attempts` — fraction of attempts where the operator made no change

Add graceful fallback: when new counters (`validEvaluated`, `repairFailed`, `noOp`) are absent (e.g., loading old stats files), fall back to the existing formula so old data doesn't cause crashes.

## Files to touch

- `src/evolution-runner/health-metrics.js` — replace/add metric formulas
- `test/unit/evolution-runner/health-metrics-formulas.test.mjs` (new or extend existing) — test new formulas and fallback behavior

## Out of scope

- Telemetry structure changes (handled in ADAOPEWEIISS-01)
- Fitness/rejection calculations
- Runner callers
- operator-selector changes (handled in ADAOPEWEIISS-05)

## Acceptance criteria

- Test: `operatorInefficiencyRate` computes correctly: `(100 - 60) / 100 = 0.4` for `attempts=100`, `validEvaluated=60`
- Test: `repairFailureRate` computes correctly: `15 / 100 = 0.15` for `repairFailed=15`, `attempts=100`
- Test: `noOpRate` computes correctly: `25 / 100 = 0.25` for `noOp=25`, `attempts=100`
- Test: When `validEvaluated` is absent, falls back to existing formula without error
- Test: When `attempts=0`, all rates are `0` (no division by zero)
- Invariant: Old metric consumers don't crash on new metric shape
- Invariant: `npm run test:unit` passes
- Invariant: `tsc -p tsconfig.json` passes with no new errors

## Dependencies

- ADAOPEWEIISS-01 (telemetry counters include `noOp`, `repairFailed`, `validEvaluated`)
