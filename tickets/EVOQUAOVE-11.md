# EVOQUAOVE-11: Semantic validation enforcement with severity levels

**Spec ref:** EQ-13
**Phase:** 3 — Structural robustness
**Depends on:** None

## Problem

Semantic checks in `src/dsl/semantic.js` only push issues of varying severity but never cause validation to fail. A game with zero reachable actions passes semantic validation. `validateSemanticDefinition()` returns `{ valid: true }` regardless of issue severity.

## Fix

Introduce severity levels: `error`, `warning`, `info`. Update `validateSemanticDefinition()` to return `{ valid: false }` when any `error`-level issue exists.

Escalate these to `error` severity:
- Unsatisfiable preconditions on ALL actions (no legal move exists)
- Zero termination conditions
- Termination conditions that reference non-existent variables
- All effects are no-ops (e.g., every action's effects are empty or vacuous)

Keep as `warning`:
- Unused variables, zones, token types
- Single-action unsatisfiable preconditions (as long as other actions remain reachable)

Keep as `info`:
- Style suggestions, minor observations

## Files to touch

- `src/dsl/semantic.js` — add severity levels to issues, update `validateSemanticDefinition()` to check for errors

## Out of scope

- Do NOT change JSON Schema validation (`schemas/dsl/`)
- Do NOT change `grammar-generator.js` (seed semantic checks are in EVOQUAOVE-12)
- Do NOT change the repair pipeline
- Do NOT change the evaluation pipeline

## Acceptance criteria

### Tests that must pass

1. **New/updated unit tests** in `test/unit/dsl/` (create if needed):
   - Definition with all-unsatisfiable preconditions → `{ valid: false }`, issue with severity `"error"`
   - Definition with zero termination conditions → `{ valid: false }`
   - Definition with termination referencing non-existent variable → `{ valid: false }`
   - Definition with unused variable only → `{ valid: true }`, issue with severity `"warning"`
   - Valid definition → `{ valid: true }`, no error-level issues

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- `collectSemanticIssues()` now returns issues with a `severity` field (`"error"`, `"warning"`, `"info"`)
- `validateSemanticDefinition()` returns `{ valid: false }` if and only if at least one issue has severity `"error"`
- Backward compatibility: existing callers that only read `.issues` array still work
