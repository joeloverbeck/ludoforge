# ADAOPEWEIISS-03: Update evolution-applicator to handle structured outcomes

**Status: COMPLETED**

## What

Update `applyEvolution()` in `evolution-applicator.js` to consume the structured outcome object returned by `mutateAndRepairGenome()` (from ADAOPEWEIISS-02). Switch on `mutated.outcome` to call the appropriate telemetry recording functions (from ADAOPEWEIISS-01):

- **All outcomes** — call `recordAttempt()` first (every invocation counts as an attempt per spec invariant `attempts = noOp + repairFailed + rejectedTotal + validEvaluated`)
- `"ok"` — proceed to evaluation (genome is the mutated result)
- `"noOp"` — additionally call `recordNoOp()`, keep the pre-mutation child (do not evaluate null)
- `"repairFailed"` — additionally call `recordRepairFailed()`, keep the pre-mutation child (do not evaluate null)

When outcome is `noOp` or `repairFailed`, the applicator keeps the pre-mutation child genome in the offspring array (not `null`). This ensures downstream code always has a valid genome, even though the operator was unproductive.

## Assumptions corrected during reassessment

- **`recordAttempt` scope**: The original ticket implied `recordAttempt()` is only called for `"ok"` outcomes. Per the spec's accounting invariant (`attempts = noOp + repairFailed + rejectedTotal + validEvaluated`), `recordAttempt()` must be called for ALL outcomes — it counts every invocation. The outcome-specific recording functions (`recordNoOp`, `recordRepairFailed`) are additional.
- **Existing applicator structure**: The current code already has a two-path branch: selector path (`mutated && typeof mutated === "object"`) vs plain path. The structured outcome handling only applies to the selector path, since the non-selector path returns plain genomes without `outcome` fields per ADAOPEWEIISS-02.
- **`operatorName` extraction**: The existing code extracts `operatorName` from `mutated.operatorName`. This remains correct — `operatorName` is always present in the structured outcome per ADAOPEWEIISS-02's invariant.

## Files touched

- `src/evolution-runner/evolution-applicator.js` — added imports for `recordNoOp` and `recordRepairFailed`, switched on `mutated.outcome` to dispatch telemetry calls and control child genome assignment
- `test/unit/evolution-runner/evolution-applicator-outcomes.test.mjs` (new) — 12 tests covering each outcome branch

## Out of scope

- Runner retry loop — handled in ADAOPEWEIISS-04
- `runner.js` generation loop changes
- Fitness evaluation changes
- MAP-Elites placement logic

## Acceptance criteria

- [x] Test: When outcome is `"ok"`, `recordAttempt()` is called and genome proceeds to evaluation
- [x] Test: When outcome is `"noOp"`, `recordAttempt()` AND `recordNoOp()` are called and pre-mutation child is kept
- [x] Test: When outcome is `"repairFailed"`, `recordAttempt()` AND `recordRepairFailed()` are called and pre-mutation child is kept
- [x] Test: No `null` genomes appear in the offspring array
- [x] Invariant: `recordAttempt` is called exactly once per mutation attempt regardless of outcome
- [x] Invariant: `npm run test:unit` passes (1226/1226)
- [x] Invariant: `tsc -p tsconfig.json` passes with no new errors

## Dependencies

- ADAOPEWEIISS-01 (telemetry recording functions exist)
- ADAOPEWEIISS-02 (structured outcome return from mutateAndRepairGenome)

## Outcome

**What changed vs originally planned:**

The implementation matched the ticket's intent with one corrected assumption: `recordAttempt()` is called for ALL outcomes (not just `"ok"`) to satisfy the spec's accounting invariant `attempts = noOp + repairFailed + rejectedTotal + validEvaluated`. The outcome-specific telemetry functions (`recordNoOp`, `recordRepairFailed`) are called additionally.

**Changes made:**
- `src/evolution-runner/evolution-applicator.js`: Added imports for `recordNoOp` and `recordRepairFailed`. Restructured the selector-path mutation block to: (1) always call `recordAttempt` first, (2) switch on `mutated.outcome` to dispatch `recordNoOp` or `recordRepairFailed` for unproductive outcomes, and (3) only assign `mutated.genome` to `child` for `"ok"` outcomes. For `noOp` and `repairFailed`, the pre-mutation `child` clone is preserved.
- `test/unit/evolution-runner/evolution-applicator-outcomes.test.mjs` (new): 12 tests using `mock.module()` to control `mutateAndRepairGenome` return values, covering all three outcome branches, telemetry counter correctness, null-genome prevention, and the per-attempt invariant.

**Verification:** 1226/1226 unit tests pass. `tsc` clean.
