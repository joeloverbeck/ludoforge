# EVOQUAOVE-17: Adaptive operator weighting based on telemetry

**Spec ref:** EQ-10
**Phase:** 4 — Observability and adaptive control
**Depends on:** EVOQUAOVE-05 (EQ-08 — static weight rebalancing)

## Problem

Static weights cannot respond to emergent population dynamics. If repair failure rate climbs for a specific operator, the system should automatically reduce that operator's weight.

## Fix

After each generation, compute repair-failure rate per operator from telemetry data. If an operator's failure rate exceeds a threshold (e.g., 30%), halve its weight for the next generation. If the failure rate is below a recovery threshold (e.g., 10%), gradually restore toward the base weight.

Use the existing `operator-telemetry.js` for data and `operator-selector.js` `WeightedSelector` for weight updates. The `observe()` method on `WeightedSelector` (currently empty) is the intended extension point.

## Files to touch

- `src/evolutionary-engine/operator-selector.js` — implement `observe()` method to adjust weights based on telemetry
- `src/evolution-runner/runner.js` — call `observe()` after each generation with telemetry data

## Out of scope

- Do NOT change telemetry collection (`operator-telemetry.js`)
- Do NOT change static weight config (`evolution-operators.json`)
- Do NOT change individual operator implementations
- Do NOT change the mutation orchestrator

## Acceptance criteria

### Tests that must pass

1. **New/updated unit tests** in `test/unit/evolutionary-engine/operator-selector.test.mjs`:
   - `observe()` halves weight when operator failure rate > 30%
   - `observe()` restores weight when failure rate < 10%
   - Weights never drop below a minimum floor (e.g., 0.1)
   - Weights never exceed the original base weight
   - No adjustment when failure rate is between thresholds

2. **New unit test** in `test/unit/evolution-runner/runner.test.mjs`:
   - Runner passes telemetry to selector's `observe()` after each generation

3. All existing tests:
   - `npm run test:unit` passes

### Invariants

- Adaptive weighting is a feedback loop: high failure → lower weight → fewer attempts → lower failure
- Base weights from `evolution-operators.json` serve as the starting point and maximum
- All weights remain positive (> 0)
- The system converges to stable weights when population dynamics stabilize

## Outcome

Implemented adaptive operator weighting. `WeightedSelector.observe(telemetry)` adjusts weights per operator based on failure rate: >30% halves the weight (floor 0.1), <10% restores halfway toward base weight, 10-30% no change. Runner calls `observe()` after telemetry recording each generation. 8 unit tests pass, full suite (915 tests) green, type check clean.
