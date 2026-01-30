# EVOQUAOVE-13: Categorized rejection tracking in engine

**Status:** ✅ Completed
**Spec ref:** EQ-14
**Phase:** 4 — Observability and adaptive control
**Depends on:** None

## Problem

Rejected genomes in `engine.js` are collected but their rejection reasons are not categorized. The runner cannot distinguish between repair failures, validation failures, safety gate failures, and evaluation errors.

## Fix

When a genome is rejected in `runGenerationLoop()`, categorize the reason:
```js
const diag = result.diagnostics;
const reason = diag?.repair?.failed
  ? "repair-failure"
  : diag?.validation && !diag.validation.valid
    ? "validation-failure"
    : Array.isArray(diag?.safety) && diag.safety.length > 0
      ? "safety-failure"
      : diag?.evaluation?.error
        ? "evaluation-error"
        : "evaluation-null";
rejected.push({ genome: candidate, reason, diagnostics: diag });
```

### Assumptions corrected from original ticket

- The original ticket referenced `result.diagnostics?.simulationError` — this field does not exist in the evaluation adapter. The actual field for evaluator failures is `diagnostics.evaluation.error` (set to `"invalid-evaluator-output"` by the adapter). The category was renamed from `"simulation-crash"` to `"evaluation-error"` to match the actual diagnostic shape.
- The categorization checks `diag?.validation && !diag.validation.valid` (guarded access) rather than `!result.diagnostics?.validation?.valid`, to avoid false-matching when the `validation` field is absent.
- Repair operators use a `repair()` method, not `apply()`.

## Files touched

- `src/evolutionary-engine/engine.js` — modified rejection collection in `runGenerationLoop()` to include `reason` field

## Out of scope

- Do NOT change the evaluation pipeline or evaluator
- Do NOT change the repair pipeline
- Do NOT add early stopping logic (that's EVOQUAOVE-14)
- Do NOT change MAP-Elites or shortlist selection

## Acceptance criteria

### Tests that must pass

1. **New unit tests** in `test/unit/evolutionary-engine/engine.test.mjs`:
   - `"assigns 'evaluation-null' when evaluator returns null fitness with valid descriptors"`
   - `"assigns 'validation-failure' for invalid genome definitions"`
   - `"assigns 'safety-failure' when safety gates reject"`
   - `"assigns 'evaluation-error' when evaluator returns invalid output"`
   - `"assigns 'repair-failure' when repair fails"`
   - `"every rejected item has reason and diagnostics fields"`
   - `"reason is one of the allowed categories"`

2. All existing tests:
   - `npm run test:unit` passes (885/885)

### Invariants

- Every item in the `rejected` array has a `reason` string field
- The `reason` field is one of: `"repair-failure"`, `"validation-failure"`, `"safety-failure"`, `"evaluation-error"`, `"evaluation-null"`
- Existing consumers of `rejected` array still work (the `genome` field is unchanged)

## Outcome

**What changed vs originally planned:**
- The code change was exactly as planned: a single categorization block added to `engine.js:147-158`.
- The reason category `"simulation-crash"` was renamed to `"evaluation-error"` because the diagnostics object uses `evaluation.error`, not `simulationError`. The actual evaluation adapter (`evaluation-adapter.js`) sets `evaluation: { error: "invalid-evaluator-output" }` when the evaluator returns invalid output — there is no separate `simulationError` field.
- Seven new tests were added covering all five rejection categories plus structural invariants (reason is string, diagnostics exists, reason is from allowed set).
