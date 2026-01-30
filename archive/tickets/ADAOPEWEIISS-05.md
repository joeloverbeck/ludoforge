# ADAOPEWEIISS-05: Update WeightedSelector.observe to use productiveOffspring

**Status: COMPLETED**

## What

Change the adaptive weighting formula in `WeightedSelector.observe()` from the current `(attempts - validOffspring) / attempts` to use `validEvaluated` as the success metric. This fixes the core bug: fallback/no-op genomes were inflating the "success" count.

New formula:
```
inefficiencyRate = (attempts - (validEvaluated ?? validOffspring ?? 0)) / attempts
```

The fallback chain (`validEvaluated ?? validOffspring ?? 0`) provides backward compatibility with old stats files that don't have the `validEvaluated` counter yet.

Keep existing threshold logic:
- Penalize if `inefficiencyRate > 0.30`
- Restore if `inefficiencyRate < 0.10`
- Otherwise unchanged
- Keep clamp floor `MIN_WEIGHT`

## Files to touch

- `src/evolutionary-engine/operator-selector.js` — update `observe()` formula
- `test/unit/evolutionary-engine/operator-selector.test.mjs` — add/update tests for new formula

## Out of scope

- `pick()` method changes
- Threshold constant changes
- Telemetry structure changes (handled in ADAOPEWEIISS-01)
- Health metrics (handled in ADAOPEWEIISS-06)

## Acceptance criteria

- Test: When `validEvaluated=0` and `attempts=100`, inefficiency rate is `1.0` and weight is penalized
- Test: When `validEvaluated=95` and `attempts=100`, inefficiency rate is `0.05` and weight is restored
- Test: When `validEvaluated` is absent but `validOffspring=80` and `attempts=100`, fallback formula uses `validOffspring`
- Test: Old bug regression — simulate `attempts=100`, `validOffspring=100`, `validEvaluated=0`; assert new logic penalizes (old logic would have restored)
- Invariant: `pick()` behavior unchanged
- Invariant: `npm run test:unit` passes
- Invariant: `tsc -p tsconfig.json` passes with no new errors

## Dependencies

- ADAOPEWEIISS-01 (telemetry counters include `validEvaluated`)

## Outcome

### What was changed

**Source** (`src/evolutionary-engine/operator-selector.js`):
- Single-line change in `observe()`: the fallback chain in the failure rate computation was updated from `(stats.validOffspring ?? 0)` to `(stats.validEvaluated ?? stats.validOffspring ?? 0)`.

**Tests** (`test/unit/evolutionary-engine/operator-selector.test.mjs`):
- Updated 6 existing tests to use `validEvaluated` instead of `validOffspring` in their telemetry objects (tests still exercise the same threshold/floor/cap/neutral-zone logic).
- Added 4 new tests matching the acceptance criteria:
  1. Penalizes when `validEvaluated=0, attempts=100` (inefficiency 1.0)
  2. Restores when `validEvaluated=95, attempts=100` (inefficiency 0.05)
  3. Falls back to `validOffspring` when `validEvaluated` is absent
  4. Regression: `attempts=100, validOffspring=100, validEvaluated=0` penalizes under new logic (old logic would have restored)

### Versus originally planned

No deviations. The ticket was accurate in its assumptions about the code structure, formula location, and test file. All acceptance criteria met. Full unit suite (1261 tests) passes, tsc clean.
