# ADAOPEWEIISS-03: Update evolution-applicator to handle structured outcomes

## What

Update `applyEvolution()` in `evolution-applicator.js` to consume the structured outcome object returned by `mutateAndRepairGenome()` (from ADAOPEWEIISS-02). Switch on `mutated.outcome` to call the appropriate telemetry recording functions (from ADAOPEWEIISS-01):

- `"ok"` — call `recordAttempt()` as before, proceed to evaluation
- `"noOp"` — call `recordNoOp()`, keep the pre-mutation child (do not evaluate null)
- `"repairFailed"` — call `recordRepairFailed()`, keep the pre-mutation child (do not evaluate null)

When outcome is `noOp` or `repairFailed`, the applicator keeps the pre-mutation child genome in the offspring array (not `null`). This ensures downstream code always has a valid genome, even though the operator was unproductive.

## Files to touch

- `src/evolution-runner/evolution-applicator.js` — switch on `mutated.outcome`, call new telemetry functions
- `test/unit/evolution-runner/evolution-applicator-outcomes.test.mjs` (new) — test each outcome branch

## Out of scope

- Runner retry loop — handled in ADAOPEWEIISS-04
- `runner.js` generation loop changes
- Fitness evaluation changes
- MAP-Elites placement logic

## Acceptance criteria

- Test: When outcome is `"ok"`, `recordAttempt()` is called and genome proceeds to evaluation
- Test: When outcome is `"noOp"`, `recordNoOp()` is called and pre-mutation child is kept
- Test: When outcome is `"repairFailed"`, `recordRepairFailed()` is called and pre-mutation child is kept
- Test: No `null` genomes appear in the offspring array
- Invariant: Telemetry counters are incremented exactly once per mutation attempt
- Invariant: `npm run test:unit` passes
- Invariant: `tsc -p tsconfig.json` passes with no new errors

## Dependencies

- ADAOPEWEIISS-01 (telemetry recording functions exist)
- ADAOPEWEIISS-02 (structured outcome return from mutateAndRepairGenome)
