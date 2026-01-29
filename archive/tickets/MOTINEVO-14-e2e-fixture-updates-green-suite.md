# MOTINEVO-14: E2E fixture updates + green suite

**Status: COMPLETED**

## Description
Update the E2E mock simulation helper (`mock-simulation.js`) to emit the trace fields (`stateHash`, `bindings`, `appliedEffects`) that the real simulation engine already produces. Add E2E assertions validating these trace fields are present and correctly shaped in mock simulation output.

## Assumptions (reassessed against codebase)
- The simulation-result schema (`schemas/simulation-engine/simulation-result.schema.json`) already defines `stateHash`, `bindings`, and `appliedEffects` as optional properties on `TrajectoryStep`, plus `ResolvedRef`, `BindingValue`, and `AppliedEffect` in `$defs`. No schema changes needed.
- The real simulation engine (`src/simulation-engine/step-execution.js`) already emits these fields conditionally when trace data is provided. No engine changes needed.
- The mock simulation helper (`test/e2e/helpers/mock-simulation.js`) does NOT emit these fields — this is the primary gap.
- No existing E2E tests assert on `stateHash`, `bindings`, or `appliedEffects`.
- The E2E fixture JSON files are game definitions, not simulation results — they don't need trace field updates.
- The E2E suite has 34 tests across 13 test files (not 8 as originally estimated). All pass before this change.
- `runner-config.v1.json` already includes `MotifMiningConfig`. No config schema changes needed.

## Files to Touch
- `test/e2e/helpers/mock-simulation.js` (add trace fields to mock output)
- `test/e2e/mock-simulation.e2e.test.mjs` (add assertions for trace field presence and shape)

## Out of Scope
- Schema changes (already done in prior MOTINEVO tickets)
- Simulation engine changes (already done)
- E2E fixture JSON updates (fixtures are game definitions, not simulation results)
- New E2E tests for motif mining pipeline
- Unit test changes — those are covered in MOTINEVO-08

## Acceptance Criteria

### Tests That Must Pass
- `npm run test:e2e` passes all existing tests (all 34)
- No tests are skipped or disabled
- Mock simulation output includes `stateHash`, `bindings`, and `appliedEffects` in every step
- E2E assertions validate presence and basic shape of trace fields

### Invariants That Must Remain True
- E2E tests still cover the same user flows and scenarios as before
- Mock simulation behavior is consistent with real simulation output format
- Test isolation is maintained (no cross-test state leakage)
- Mock step structure matches the real `TrajectoryStep` shape (including trace fields)

## Dependencies
- Depends on: MOTINEVO-06, MOTINEVO-07
- Blocks: none

## Outcome

### What was actually changed vs originally planned

**Originally planned:**
- Update E2E fixture JSON files with trace fields
- Update `mock-simulation.js` with trace fields
- Update assertions across multiple `*.test.mjs` files

**What actually happened:**
- The E2E fixture JSON files are game definitions (not simulation results), so they needed no trace field updates — the ticket's assumption was incorrect.
- Only `mock-simulation.js` needed updating: imported `defaultStateHasher` from the real engine and added `stateHash`, `bindings: {}`, and `appliedEffects: []` to every mock step.
- Only `mock-simulation.e2e.test.mjs` needed new assertions — existing tests already passed via the determinism `deepEqual` check covering the new fields implicitly.
- No other E2E test files required changes.

**Files modified:**
1. `test/e2e/helpers/mock-simulation.js` — Added `defaultStateHasher` import; added `stateHash`, `bindings`, `appliedEffects` to each step in `buildSteps()`.
2. `test/e2e/mock-simulation.e2e.test.mjs` — Added 3 new tests in a `trace fields` describe block.

**Test results:** 37 E2E tests pass (34 original + 3 new), 522 unit tests pass. Zero failures, zero skipped.
