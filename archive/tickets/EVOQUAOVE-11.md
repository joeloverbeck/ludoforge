# EVOQUAOVE-11: Semantic validation enforcement with severity levels

**Spec ref:** EQ-13
**Phase:** 3 — Structural robustness
**Depends on:** None
**Status:** Completed (2026-01-30)

## Problem (reassessed)

- `collectSemanticIssues()` does **not** attach severity; it only returns `{ path, message, rule }`.
- `validateSemanticDefinition()` currently returns `{ valid: false }` whenever **any** issue exists, even if the issue is advisory.
- A game with zero reachable actions already triggers `no-meaningful-actions`, so it **does not** pass semantic validation today.
- The semantic layer does **not** attempt deep “no-op” detection (e.g., `set var = var.initial`); only high-level heuristics exist.

## Fix (updated scope)

Introduce severity levels: `error`, `warning`, `info`. Update `validateSemanticDefinition()` to return `{ valid: false }` only when any `error`-level issue exists.

Escalate these to `error` severity:
- No meaningful actions available (covers “all actions unsatisfiable” and “no actions”)
- Zero termination conditions
- Termination conditions referencing non-existent refs (via `ref-unknown` under `/termination/conditions/*`)

Keep as `warning`:
- Unused variables, zones, token types
- Single-action unsatisfiable preconditions (as long as other actions remain reachable)

Keep as `info`:
- Advisory action heuristics (e.g., dominant-action, free-lunch)

Out of scope for this ticket:
- Deep no-op effect detection (e.g., “set var = var.initial”); follow-up if needed.

## Files to touch

- `src/dsl/semantic.js` — add severity levels, update `validateSemanticDefinition()` to check for errors
- `src/dsl/semantic/issue-collector.js` — attach severity to issues
- `src/dsl/semantic.d.ts` — add severity typing
- `test/unit/dsl/semantic.test.mjs` — new/updated tests
- `test/unit/evolutionary-engine/serialization.test.mjs` — update expectations for warning-only semantics

## Out of scope

- Do NOT change JSON Schema validation (`schemas/dsl/`)
- Do NOT change `grammar-generator.js` (seed semantic checks are in EVOQUAOVE-12)
- Do NOT change the repair pipeline
- Do NOT change the evaluation pipeline

## Acceptance criteria

### Tests that must pass

1. **New/updated unit tests** in `test/unit/dsl/` (create if needed):
   - Definition with all-unsatisfiable preconditions → `{ valid: false }`, issue with severity `"error"`
   - Definition with zero termination conditions → `{ valid: false }`, issue with severity `"error"`
   - Definition with termination referencing non-existent ref → `{ valid: false }`, issue with severity `"error"`
   - Definition with unused variable only → `{ valid: true }`, issue with severity `"warning"`
   - Valid definition → `{ valid: true }`, no error-level issues

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- `collectSemanticIssues()` now returns issues with a `severity` field (`"error"`, `"warning"`, `"info"`)
- `validateSemanticDefinition()` returns `{ valid: false }` if and only if at least one issue has severity `"error"`
- Backward compatibility: existing callers that only read `.issues` array still work

## Outcome

- Added severity classification to semantic issues and made validation depend on error-level issues only.
- Kept structural/ref/bounds violations as errors; downgraded unused refs and single-action unsatisfiable preconditions to warnings, advisory action heuristics to info.
- Deferred deep no-op effect detection; only existing heuristics were used.
