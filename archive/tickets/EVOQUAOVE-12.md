# EVOQUAOVE-12: Semantic validation for generated seeds

**Spec ref:** EQ-12
**Phase:** 3 — Structural robustness
**Depends on:** EVOQUAOVE-11 (EQ-13 — semantic enforcement)
**Status:** completed

## Problem

After EVOQUAOVE-11, `createGenomeId()` already runs semantic validation via `validateGenomeDefinition()`. Seeds with error-level semantic issues were already rejected — but under the generic `"invalid-definition"` bucket (which also captures JSON Schema failures). This made it impossible to distinguish schema failures from semantic failures in the rejection report.

## Fix

Split the existing `"invalid-definition"` rejection into two explicit categories:
- `"invalid-definition"` — JSON Schema validation failures
- `"semantic-invalid"` — error-level semantic issues (warnings tolerated)

Run `validateGameDefinition()` and `validateSemanticDefinition()` explicitly before `createGenomeId()`, which is kept as a safety net.

## Files touched

- `src/seed-generation/generate-seed-population.js` — added imports for `validateGameDefinition` and `validateSemanticDefinition`, restructured validation flow to separate schema from semantic rejection tracking
- `test/unit/seed-generation/generate-seed-population-semantic.test.mjs` — new mock-based tests for semantic rejection

## Acceptance criteria

### Tests that must pass

1. **New unit tests** in `test/unit/seed-generation/generate-seed-population-semantic.test.mjs`:
   - ✅ A genome that fails semantic validation (error-level) is rejected as `"semantic-invalid"`
   - ✅ A genome with only warnings passes semantic check and is accepted
   - ✅ Valid genomes produce no `"semantic-invalid"` rejections

2. All existing tests:
   - ✅ `npm run test:unit` passes (851/851)
   - ✅ `tsc -p tsconfig.json` passes

### Invariants

- No seed genome in the output has error-level semantic issues
- `rejectedByReason` includes `"semantic-invalid"` key when applicable
- Seeds with only warning-level issues are still accepted
- The total seed population may be smaller — this is intended; `maxAttempts` controls retry budget

## Outcome

Separated schema and semantic validation tracking in the seed generation pipeline. The `rejectedByReason` report now distinguishes `"invalid-definition"` (schema) from `"semantic-invalid"` (semantic errors), enabling better diagnostics.
