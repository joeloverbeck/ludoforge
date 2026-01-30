# ADAOPEWEIISS-07: Accounting invariant integration test

**Status: COMPLETED**

## What

Create an integration test that verifies the accounting invariant across the full mutation-evaluation pipeline using mock operators with deterministic behavior. This test validates that telemetry counters are consistent end-to-end, not just within individual units.

Set up three mock operators:
1. **always-succeeds** — always produces a valid mutated genome
2. **always-no-ops** — always returns the genome unchanged
3. **always-repair-fails** — always produces a mutation that repair rejects

Run one generation through the pipeline and assert the accounting invariants from spec §2:

For each operator:
- `attempts === noOp + repairFailed + rejectedTotal + validEvaluated`
- `evaluated === rejectedTotal + validEvaluated`
- `validEvaluated <= evaluated <= attempts`

Additionally assert:
- Fallback genomes (kept when noOp/repairFailed) are NOT counted as `validEvaluated`
- The always-succeeds operator has `validEvaluated > 0`
- The always-no-ops operator has `noOp === attempts` and `validEvaluated === 0`
- The always-repair-fails operator has `repairFailed === attempts` and `validEvaluated === 0`

## Assumptions reassessed

The ticket's original assumptions were accurate:
- All counters (`attempts`, `noOp`, `repairFailed`, `rejected.*`, `evaluated`, `validEvaluated`) exist in the telemetry system from ADAOPEWEIISS-01 through ADAOPEWEIISS-06.
- `applyEvolution` records `attempts`, `noOp`, and `repairFailed` in telemetry.
- Evaluation-level counters (`evaluated`, `validEvaluated`) are recorded at the runner level, not the applicator level. The test simulates this by recording evaluation outcomes for "ok" slots after `applyEvolution` returns — this accurately models the runner's behavior without requiring the full runner infrastructure.
- `rejectedTotal` is a derived value (sum of the four rejection reasons), not a stored counter.
- No source code changes were needed.

## Files touched

- `test/integration/telemetry-accounting.test.mjs` (new)

## Out of scope

- No source code changes
- No schema changes
- No config changes

## Acceptance criteria

- [x] Test: `attempts === noOp + repairFailed + rejectedTotal + validEvaluated` holds for each operator
- [x] Test: `evaluated === rejectedTotal + validEvaluated` holds for each operator
- [x] Test: `validEvaluated <= evaluated <= attempts` holds for each operator
- [x] Test: Fallback genomes are not counted as `validEvaluated`
- [x] Test: always-succeeds operator has `validEvaluated > 0`
- [x] Test: always-no-ops operator has `noOp === attempts`, `validEvaluated === 0`
- [x] Test: always-repair-fails operator has `repairFailed === attempts`, `validEvaluated === 0`
- [x] Invariant: `npm run test:integration` passes (174/174 tests pass)
- [x] Invariant: Test is deterministic (seeded RNG, verified by determinism test)

## Dependencies

- ADAOPEWEIISS-01 through ADAOPEWEIISS-06 (all source changes must be in place)

## Outcome

### What was actually changed vs originally planned

**Planned**: A single integration test file with three mock operators testing accounting invariants.

**Actual**: Created `test/integration/telemetry-accounting.test.mjs` with 7 tests across 5 test suites:

1. **always-succeeds**: Verifies `validEvaluated > 0`, all counters correct, all three accounting invariants hold.
2. **always-no-ops**: Verifies `noOp === attempts`, `validEvaluated === 0`, retry behavior (`attempts = populationSize * (maxRetries + 1)`), all invariants hold.
3. **always-no-ops (fallback)**: Explicitly verifies fallback genomes are NOT counted as `validEvaluated` or `evaluated`.
4. **always-repair-fails**: Verifies `repairFailed === attempts`, `validEvaluated === 0`, retry behavior, all invariants hold.
5. **always-repair-fails (fallback)**: Explicitly verifies fallback genomes from repair failures are NOT counted.
6. **Mixed operators**: Runs each operator independently with different repair behavior, verifies all invariants hold per-operator.
7. **Determinism**: Two runs with the same seed produce identical telemetry.

**No source code changes** were required — the test exercises existing code paths through mock operators and a simulated evaluation recording step. No deviations from the ticket scope.
