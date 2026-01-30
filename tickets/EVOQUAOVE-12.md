# EVOQUAOVE-12: Semantic validation for generated seeds

**Spec ref:** EQ-12
**Phase:** 3 — Structural robustness
**Depends on:** EVOQUAOVE-11 (EQ-13 — semantic enforcement)

## Problem

`generateGameDefinition()` produces games validated only by JSON Schema. It does not run semantic validation (`collectSemanticIssues`). Generated games can have unsatisfiable preconditions, unreachable termination conditions, or all-no-op effects.

## Fix

After generation in the seed population pipeline, run `validateSemanticDefinition()` on each genome's definition. Reject seeds that have `error`-level semantic issues. Count rejections as `"semantic-invalid"` in `rejectedByReason`. Warnings are tolerated.

## Files to touch

- `src/seed-generation/generate-seed-population.js` — add semantic validation after genome generation, before acceptance

## Out of scope

- Do NOT change `grammar-generator.js` (it generates; validation is separate)
- Do NOT change `semantic.js` (severity levels are in EVOQUAOVE-11)
- Do NOT change the evaluator or fitness scoring
- Do NOT change the MAP-Elites grid

## Acceptance criteria

### Tests that must pass

1. **Updated unit tests** in `test/unit/seed-generation/generate-seed-population.test.mjs`:
   - A genome that fails semantic validation (error-level) is rejected
   - `rejectedByReason["semantic-invalid"]` is incremented
   - A genome with only warnings passes semantic check and is accepted
   - Valid genomes are accepted as before

2. All existing tests:
   - `npm run test:unit` passes

### Invariants

- No seed genome in the output has error-level semantic issues
- `rejectedByReason` includes `"semantic-invalid"` key when applicable
- Seeds with only warning-level issues are still accepted
- The total seed population may be smaller — this is intended; `maxAttempts` controls retry budget
