# ADAOPEWEIISS-07: Accounting invariant integration test

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

## Files to touch

- `test/integration/telemetry-accounting.test.mjs` (new)

## Out of scope

- No source code changes
- No schema changes
- No config changes

## Acceptance criteria

- Test: `attempts === noOp + repairFailed + rejectedTotal + validEvaluated` holds for each operator
- Test: `evaluated === rejectedTotal + validEvaluated` holds for each operator
- Test: `validEvaluated <= evaluated <= attempts` holds for each operator
- Test: Fallback genomes are not counted as `validEvaluated`
- Test: always-succeeds operator has `validEvaluated > 0`
- Test: always-no-ops operator has `noOp === attempts`, `validEvaluated === 0`
- Test: always-repair-fails operator has `repairFailed === attempts`, `validEvaluated === 0`
- Invariant: `npm run test:integration` passes
- Invariant: Test is deterministic (seeded RNG)

## Dependencies

- ADAOPEWEIISS-01 through ADAOPEWEIISS-06 (all source changes must be in place)
