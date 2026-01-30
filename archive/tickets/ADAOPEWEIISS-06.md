# ADAOPEWEIISS-06: Fix health metrics naming and formulas

**Status: COMPLETED**

## What

Replaced the misleading `repairFailureRate` metric formula in `health-metrics.js` with three truthful metrics that use the telemetry counters from ADAOPEWEIISS-01:

- `operatorInefficiencyRate = (attempts - validEvaluated) / attempts` — fraction of attempts that did not produce a valid evaluated mutation
- `repairFailureRate = repairFailed / attempts` — now truthful (only counts actual repair failures)
- `noOpRate = noOp / attempts` — fraction of attempts where the operator made no change

No backwards-compatibility fallback: the old `validOffspring`-based formula is removed entirely since the new telemetry counters (from ADAOPEWEIISS-01) are the sole source of truth.

## Files touched

- `src/evolution-runner/health-metrics.js` — replaced `computeRepairFailureRate` with `computeOperatorRates`; return shape now includes `operatorInefficiencyRate`, `repairFailureRate` (new formula), `noOpRate`
- `test/unit/evolution-runner/health-metrics.test.mjs` — rewrote operator rate tests; added 10 new tests for the three metrics
- `test/unit/evolution-runner/artifact-writer.test.mjs` — updated health fixture shape to include new fields
- `test/unit/evolution-runner/runner.test.mjs` — updated health shape assertions to include new fields

## Acceptance criteria

- ✅ `operatorInefficiencyRate` computes correctly: `(100 - 60) / 100 = 0.4`
- ✅ `repairFailureRate` computes correctly: `15 / 100 = 0.15`
- ✅ `noOpRate` computes correctly: `25 / 100 = 0.25`
- ✅ When `attempts=0`, all rates are `0` (no division by zero)
- ✅ When telemetry is null/missing operators, all rates are `0`
- ✅ `npm run test:unit` passes (1279/1279)
- ✅ `tsc -p tsconfig.json` passes with no errors

## Dependencies

- ADAOPEWEIISS-01 (telemetry counters include `noOp`, `repairFailed`, `validEvaluated`) — already landed

## Outcome

**What changed vs. originally planned:**

The ticket originally required a backwards-compatibility fallback (when `validEvaluated` is absent, fall back to the old `(attempts - validOffspring) / attempts` formula). This was removed because:
1. ADAOPEWEIISS-01 has already landed, so all telemetry objects include the new counters.
2. The project explicitly does not want backwards compatibility — clean architecture is preferred.

The old `computeRepairFailureRate` function was replaced with `computeOperatorRates` that computes all three metrics in a single pass. The return shape of `computeHealthMetrics` is a breaking change (adds `operatorInefficiencyRate` and `noOpRate` fields), and all downstream consumers (artifact-writer tests, runner tests) were updated accordingly.
