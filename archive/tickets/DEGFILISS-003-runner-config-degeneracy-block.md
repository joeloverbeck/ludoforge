# DEGFILISS-003: Add `evaluation.degeneracy` to runner-config schema

**Status:** Completed
**Depends on:** DEGFILISS-001
**Blocks:** None (DEGFILISS-004 does not depend on this)

## Summary

Extend the runner-config schema to accept a first-class `evaluation.degeneracy` block, so degeneracy policy can be configured per-experiment at the runner level.

## Files Changed

- `schemas/evolution-runner/runner-config.v1.json` — added `DegeneracyBlock` and `DegeneracyPolicy` `$defs`; added optional `degeneracy` property to `EvaluationConfig`
- `test/unit/evolution-runner/schema.test.mjs` — added 6 new tests for degeneracy schema validation

## Out of Scope

- Runtime wiring of runner config into evaluator pipeline
- Fitness penalty computation (DEGFILISS-004)
- Detection logic (DEGFILISS-002)

## Requirements

### Schema (`runner-config.v1.json`)

1. Add optional property `evaluation.degeneracy`.
2. If present, requires `policyByFlag` — object mapping flag names to `"reject" | "penalize" | "ignore"`.
3. If present, requires `penalties` — object with per-flag weight params.
4. Invalid policy values (e.g. `"foo"`) must be rejected by schema validation.
5. Existing runner configs without `evaluation.degeneracy` must continue to validate.

### Tests

1. A runner config including `evaluation.degeneracy` with valid `policyByFlag` and `penalties` validates.
2. A runner config with `evaluation.degeneracy` missing `policyByFlag` fails validation.
3. A runner config with `evaluation.degeneracy` containing invalid policy value fails validation.
4. A runner config without `evaluation.degeneracy` still validates (backward compat).
5. A runner config with `evaluation.degeneracy` missing `penalties` fails validation.
6. A runner config with `evaluation.degeneracy` containing unknown properties fails validation.

## Acceptance Criteria

- [x] Runner config schema accepts optional `evaluation.degeneracy` property
- [x] If present, requires `policyByFlag` and `penalties`
- [x] Invalid policy values rejected by schema
- [x] Existing runner configs without `evaluation.degeneracy` still validate
- [x] All runner-config schema and config tests pass

## Outcome

**What was actually changed vs originally planned:**

The implementation matched the ticket scope exactly. The schema change added three new `$defs` entries to `runner-config.v1.json`:

- `DegeneracyPolicy`: enum of `"reject" | "penalize" | "ignore"` (reuses the same pattern as the standalone `degeneracy.schema.json`)
- `DegeneracyBlock`: object requiring `policyByFlag` (object with `DegeneracyPolicy` values) and `penalties` (object of per-flag param objects), with `additionalProperties: false`
- `EvaluationConfig` gained an optional `degeneracy` property referencing `DegeneracyBlock`

No assumptions in the ticket needed correction. The `policyByFlag` property uses `additionalProperties` with a `$ref` to `DegeneracyPolicy` (rather than enumerating each flag as an explicit property), which keeps the runner-config schema flexible while still enforcing valid policy values. The standalone degeneracy config schema (`schemas/config/degeneracy.schema.json`) enumerates flags explicitly because it owns the canonical flag list; the runner-config overlay intentionally does not duplicate that constraint.

Six tests were added (2 beyond the ticket's original 4) to cover missing `penalties` and unknown property rejection.
