# ADAOPEWEIISS-02: Change mutateAndRepairGenome to return structured outcome

**Status: COMPLETED**

## What

Replace the current fallback-to-original-genome behavior in `mutateAndRepairGenome()` with a structured outcome return value. Currently, when repair returns `null`, the function silently returns the original genome — this pollutes operator stats because the unchanged genome gets evaluated and counted as a "valid offspring."

Change the return type to:
```js
{ genome: <mutated | null>, operatorName: string, outcome: "ok" | "noOp" | "repairFailed" }
```

- `"ok"` — mutation succeeded and repair (if needed) produced a valid genome
- `"noOp"` — operator was invoked but returned the genome unchanged
- `"repairFailed"` — operator produced a mutated genome but repair returned `null`; `genome` is `null` (not the original)

The non-selector/applicator path (any code that calls `mutateAndRepairGenome` and expects a plain genome) must remain backward-compatible during transition — callers that don't destructure the outcome object should still work. This will be resolved when the applicator is updated in ADAOPEWEIISS-03.

## Assumptions corrected during implementation

- **Test file path**: Ticket originally specified `test/unit/evolutionary-engine/mutation/orchestrator-outcome.test.mjs` but the test directory is flat — corrected to `test/unit/evolutionary-engine/orchestrator-outcome.test.mjs`.
- **No-op detection**: Uses `JSON.stringify` comparison since mutation operators always return new objects via spread/structuredClone even when no structural change occurs.

## Files touched

- `src/evolutionary-engine/mutation/orchestrator.js` — modified `mutateAndRepairGenome()` selector path to return structured outcome with `outcome` field
- `src/evolutionary-engine/mutation.d.ts` — added `MutationOutcome` type and `outcome?` field to `MutationResult`
- `test/unit/evolutionary-engine/orchestrator.test.mjs` — updated existing tests for new repair-failure behavior (null genome, preserved operatorName, outcome field)
- `test/unit/evolutionary-engine/orchestrator-outcome.test.mjs` (new) — 9 tests covering ok, noOp, repairFailed, operatorName invariant, and backward compatibility

## Out of scope

- `evolution-applicator.js` — handled in ADAOPEWEIISS-03
- `runner.js` — handled in ADAOPEWEIISS-04
- Telemetry counter increments — callers handle that

## Acceptance criteria

- [x] Test: When mutation succeeds and repair passes, outcome is `"ok"` with non-null `genome`
- [x] Test: When operator returns genome unchanged (no-op), outcome is `"noOp"` with the unchanged genome
- [x] Test: When repair returns `null`, outcome is `"repairFailed"` with `genome: null`
- [x] Invariant: `operatorName` is always present in the returned object
- [x] Invariant: Existing tests that call `mutateAndRepairGenome` still pass (backward compat)
- [x] Invariant: `npm run test:unit` passes (1214/1214)
- [x] Invariant: `tsc -p tsconfig.json` passes with no new errors

## Dependencies

- ADAOPEWEIISS-01 (telemetry counters exist for callers to use)

## Outcome

**What changed vs originally planned:**

The implementation matched the ticket's intent exactly. The selector path of `mutateAndRepairGenome` now returns a structured `{ genome, operatorName, outcome }` object where:

- `outcome: "ok"` — mutation + repair succeeded
- `outcome: "noOp"` — operator returned genome unchanged (detected via `JSON.stringify` comparison)
- `outcome: "repairFailed"` — repair returned `null`; `genome` is now `null` instead of the original genome fallback

**Behavioral changes from prior code:**
1. Repair failure (selector path): previously returned `{ genome: originalGenome, operatorName: null }` — now returns `{ genome: null, operatorName: <preserved>, outcome: "repairFailed" }`.
2. No-op detection is new — previously there was no distinction between a successful mutation and a no-op.

**Backward compatibility preserved:** The non-selector path still returns plain genomes with no `outcome` field, exactly as before. The `evolution-applicator.js` caller checks `mutated.genome` truthiness, which correctly handles the new `null` value on repair failure (it falls back to `child`).

**Additional file not in original ticket:** `src/evolutionary-engine/mutation.d.ts` was updated to add the `MutationOutcome` type — necessary for type safety.
