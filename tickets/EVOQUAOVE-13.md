# EVOQUAOVE-13: Categorized rejection tracking in engine

**Spec ref:** EQ-14
**Phase:** 4 — Observability and adaptive control
**Depends on:** None

## Problem

Rejected genomes in `engine.js` are collected but their rejection reasons are not categorized. The runner cannot distinguish between repair failures, validation failures, safety gate failures, and simulation crashes.

## Fix

When a genome is rejected in `runGenerationLoop()`, categorize the reason:
```js
rejected.push({
  genome: candidate,
  reason: result.diagnostics?.repair?.failed ? "repair-failure"
    : !result.diagnostics?.validation?.valid ? "validation-failure"
    : result.diagnostics?.safety?.length > 0 ? "safety-failure"
    : result.diagnostics?.simulationError ? "simulation-crash"
    : "evaluation-null",
  diagnostics: result.diagnostics,
});
```

The exact categorization logic may need adjustment based on the diagnostics shape — inspect the actual diagnostics object to determine the correct field paths.

## Files to touch

- `src/evolutionary-engine/engine.js` — modify rejection collection in `runGenerationLoop()` to include `reason` field

## Out of scope

- Do NOT change the evaluation pipeline or evaluator
- Do NOT change the repair pipeline
- Do NOT add early stopping logic (that's EVOQUAOVE-14)
- Do NOT change MAP-Elites or shortlist selection

## Acceptance criteria

### Tests that must pass

1. **New/updated unit tests** in `test/unit/evolutionary-engine/engine.test.mjs` (or existing map-elites tests):
   - Rejected genome with `fitness: null` gets `reason: "evaluation-null"` (or appropriate category)
   - Each rejection reason category is tested with appropriate diagnostics
   - The `rejected` array items now include `reason` and `diagnostics` fields

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- Every item in the `rejected` array has a `reason` string field
- The `reason` field is one of: `"repair-failure"`, `"validation-failure"`, `"safety-failure"`, `"simulation-crash"`, `"evaluation-null"`
- Existing consumers of `rejected` array still work (the `genome` field is unchanged)
